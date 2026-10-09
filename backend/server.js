/**
 * Tech Vortex - AI Driven Career Intelligence and Employment Management Platform
 * Backend Server: Express.js REST API with Python ML Bridge
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { randomUUID } = require('crypto');
const { spawn } = require('child_process');
const { evaluateAnswer } = require('./interview_evaluator');
const { generateQuestions, generateFollowup, questionBank } = require('./interview_question_engine');
const { normalizeProfile, normalizeSkillName, preserveManualSkillsDuringResumeChange, removeResumeDerivedSkills } = require('./profile_normalizer');
const { buildRoutinePlan } = require('./wellness_routine');

const app = express();
const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'database.json');
const PYTHON_TIMEOUT_MS = Number(process.env.PYTHON_TIMEOUT_MS) > 0 ? Number(process.env.PYTHON_TIMEOUT_MS) : 30000;
const MAX_PYTHON_OUTPUT_BYTES = 4 * 1024 * 1024;

// Middleware
app.use(cors());
app.use(express.json());

// Serve only the application entry point and its explicit catalogue asset; a
// broad project-root static mount would expose backend source and local data.
app.get('/dsa_question_catalogue.js', (req, res) => res.sendFile(path.join(__dirname, '..', 'dsa_question_catalogue.js')));
app.get(['/', '/index.html'], (req, res) => res.sendFile(path.join(__dirname, '..', 'index.html')));

function createTempPath(prefix, extension) {
  return path.join(os.tmpdir(), `${prefix}_${randomUUID()}${extension}`);
}

function runPython(scriptPath, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.env.PYTHON || (process.platform === 'win32' ? 'python' : 'python3'), [scriptPath, ...args]);
    let stdout = '';
    let stderr = '';
    let outputBytes = 0;
    let timedOut = false;
    let outputExceeded = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, PYTHON_TIMEOUT_MS);
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(result);
    };

    child.stdout.on('data', chunk => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_PYTHON_OUTPUT_BYTES) {
        outputExceeded = true;
        child.kill('SIGKILL');
        return;
      }
      stdout += chunk.toString();
    });
    child.stderr.on('data', chunk => {
      if (stderr.length < 32 * 1024) stderr += chunk.toString();
    });
    child.on('error', error => finish(error));
    child.on('close', code => {
      if (timedOut) return finish(Object.assign(new Error('Python process timed out.'), { code: 'ETIMEDOUT' }));
      if (outputExceeded) return finish(Object.assign(new Error('Python process output exceeded the response limit.'), { code: 'EOUTPUTLIMIT' }));
      finish(null, { code, stdout, stderr });
    });
  });
}

function removeTempFile(filePath) {
  try { fs.unlinkSync(filePath); } catch (error) { if (error.code !== 'ENOENT') console.error('Could not remove temporary file:', error); }
}

function parseResumeUpload(req) {
  const contentType = req.get('content-type') || '';
  if (contentType.toLowerCase().startsWith('multipart/form-data')) {
    const boundaryMatch = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i);
    if (!boundaryMatch) throw Object.assign(new Error('Multipart boundary is missing.'), { status: 400 });
    const boundary = Buffer.from(`--${boundaryMatch[1] || boundaryMatch[2]}`);
    const body = req.body;
    const parts = [];
    let cursor = body.indexOf(boundary);
    if (cursor < 0) throw Object.assign(new Error('Malformed multipart upload.'), { status: 400 });
    while (cursor >= 0) {
      cursor += boundary.length;
      if (body.subarray(cursor, cursor + 2).toString() === '--') break;
      if (body.subarray(cursor, cursor + 2).toString() !== '\r\n') throw Object.assign(new Error('Malformed multipart upload.'), { status: 400 });
      const headersStart = cursor + 2;
      const headersEnd = body.indexOf(Buffer.from('\r\n\r\n'), headersStart);
      if (headersEnd < 0) throw Object.assign(new Error('Malformed multipart upload headers.'), { status: 400 });
      const nextBoundary = body.indexOf(Buffer.concat([Buffer.from('\r\n'), boundary]), headersEnd + 4);
      if (nextBoundary < 0) throw Object.assign(new Error('Multipart closing boundary is missing.'), { status: 400 });
      const headers = body.subarray(headersStart, headersEnd).toString('latin1');
      const disposition = headers.match(/content-disposition:\s*form-data;([^\r\n]+)/i)?.[1] || '';
      const fieldName = disposition.match(/(?:^|;)\s*name="([^"]*)"/i)?.[1];
      const filename = disposition.match(/(?:^|;)\s*filename="([^"]*)"/i)?.[1];
      if (fieldName === 'resume' && filename !== undefined) {
        const type = headers.match(/(?:^|\r\n)content-type:\s*([^\r\n]+)/i)?.[1]?.trim() || 'application/octet-stream';
        parts.push({ filename, contentType: type.toLowerCase(), buffer: body.subarray(headersEnd + 4, nextBoundary) });
      }
      cursor = nextBoundary + 2;
    }
    if (parts.length !== 1) throw Object.assign(new Error('Upload exactly one resume in the "resume" field.'), { status: 400 });
    return parts[0];
  }

  // Retain support for older clients that send the file bytes directly.
  let filename;
  try { filename = decodeURIComponent(req.get('x-filename') || ''); }
  catch (error) { throw Object.assign(new Error('Invalid resume filename.'), { status: 400 }); }
  return { filename, contentType: contentType.split(';')[0].toLowerCase(), buffer: req.body };
}

// Resume upload: accepts browser multipart/form-data and legacy raw bytes.
app.post('/api/resume/parse', express.raw({ type: () => true, limit: 5 * 1024 * 1024 + 64 * 1024 }), async (req, res) => {
  let upload;
  let filename;
  try {
    upload = parseResumeUpload(req);
    filename = path.basename(upload.filename);
  } catch (error) {
    return res.status(error.status || 400).json({ error: error.message || 'Invalid resume upload.' });
  }
  const extension = path.extname(filename).toLowerCase();
  const supportedTypes = {
    '.pdf': ['application/pdf', 'application/octet-stream'],
    '.docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'],
    '.txt': ['text/plain', 'application/octet-stream']
  };

  if (!supportedTypes[extension]) {
    return res.status(415).json({ error: 'Unsupported file type. Upload a PDF, DOCX, or TXT file.' });
  }
  if (!supportedTypes[extension].includes(upload.contentType.split(';')[0].toLowerCase())) {
    return res.status(415).json({ error: 'The filename extension and content type do not match.' });
  }
  if (!Buffer.isBuffer(upload.buffer)) {
    return res.status(400).json({ error: 'Resume file contents are required.' });
  }
  if (upload.buffer.length > 5 * 1024 * 1024) return res.status(413).json({ error: 'Resume exceeds the 5 MB upload limit.' });

  const tempFilePath = createTempPath('elite_vortex_resume', extension);
  try {
    fs.writeFileSync(tempFilePath, upload.buffer, { flag: 'wx', mode: 0o600 });
  } catch (error) {
    console.error('Could not prepare resume file:', error);
    return res.status(500).json({ error: 'Could not prepare the resume for parsing.' });
  }

  try {
    const { code, stdout, stderr } = await runPython(path.join(__dirname, 'resume_parser.py'), ['--file', tempFilePath, '--filename', filename]);
    if (code !== 0) {
      console.error(`Resume parser failed (exit ${code}): ${stderr}`);
      return res.status(503).json({ error: 'Resume parsing failed safely.' });
    }
    const result = JSON.parse(stdout);
    if (!result.success) return res.status(422).json(result);
    return res.json(result);
  } catch (error) {
    if (error.code === 'ETIMEDOUT') return res.status(504).json({ error: 'Resume parsing timed out. Try a smaller or simpler document.' });
    console.error('Resume parser process failed:', error.message);
    return res.status(503).json({ error: 'Resume parsing is unavailable. Check the Python parser dependencies.' });
  } finally {
    removeTempFile(tempFilePath);
  }
});

// Helper: Read DB
function readDatabase() {
  if (!fs.existsSync(DB_FILE)) return { users: [], careersDatabase: [], exampleJobs: [] };
  const data = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Database file must contain a JSON object.');
  return { ...data, users: Array.isArray(data.users) ? data.users : [], careersDatabase: Array.isArray(data.careersDatabase) ? data.careersDatabase : [], exampleJobs: Array.isArray(data.exampleJobs) ? data.exampleJobs : [] };
}

// Helper: Write DB
function writeDatabase(data) {
  const tempPath = `${DB_FILE}.${randomUUID()}.tmp`;
  try {
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), { encoding: 'utf-8', flag: 'wx', mode: 0o600 });
    fs.renameSync(tempPath, DB_FILE);
    return true;
  } catch (err) {
    console.error('Error writing database file:', err);
    removeTempFile(tempPath);
    return false;
  }
}

// 1. Health & Status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    platform: 'Tech Vortex AI Intelligence Engine',
    version: '2.5.0',
    timestamp: new Date().toISOString(),
    supportedFeatures: [
      'Dashboard & 5-Stage AI/ML Recommendation Pipeline',
      'Shared candidate profile with personal, education, resume metadata, and confirmed skills',
      'Skill Intelligence: resume parsing, confirmed skill gaps, and personalized roadmap',
      'Profile-writing walkthrough, headline and summary templates, local checklist',
      'Career-aware technical interview practice with deterministic rubric evaluation',
      'Market Analytics & Demon Slayer Curators',
      'Focus & Stress Studio with Refreshment & Patience Games'
    ]
  });
});

// 2. Student Profile: Save / Store User Data
app.post('/api/user/profile', (req, res) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'A candidate profile object is required.' });
  }
  const input = req.body;
  const id = String(input.id || '').trim();
  const email = String(input.email || input.personal?.email || '').trim();
  if (!id && !email) return res.status(400).json({ error: 'A profile ID or email address is required to save candidate data.' });

  let db;
  try { db = readDatabase(); } catch (error) { return res.status(503).json({ error: 'Candidate database is unreadable; no data was changed.' }); }
  if (input.skills !== undefined && !Array.isArray(input.skills)) return res.status(400).json({ error: 'Candidate skills must be an array.' });
  if (input.removedSkills !== undefined && !Array.isArray(input.removedSkills)) return res.status(400).json({ error: 'Removed skills must be an array.' });
  if (input.resume !== undefined && input.resume !== null && (typeof input.resume !== 'object' || Array.isArray(input.resume))) return res.status(400).json({ error: 'Resume metadata must be an object or null.' });
  const existingIndex = db.users.findIndex(user => (id && user.id === id) || (email && user.email === email));
  const existing = existingIndex >= 0 ? db.users[existingIndex] : {};
  let profileInput = input;
  if (input.resume === null && existing.resume) {
    profileInput = { ...input, skills: removeResumeDerivedSkills(input.skills ?? existing.skills) };
  } else if (input.resume && input.resume.status === 'parsed') {
    profileInput = { ...input, skills: preserveManualSkillsDuringResumeChange(existing.skills, input.skills ?? existing.skills, input.removedSkills) };
  }
  let body;
  try {
    body = normalizeProfile(profileInput, existing);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' });
  }
  const sanitizeJobMatch = value => {
    if (value === null) return null;
    if (!value || typeof value !== 'object' || !value.summary || !Array.isArray(value.requirements)) return existing.latestJobMatch || null;
    const statusValues = ['matched', 'developing', 'missing', 'not_found'];
    const requirements = value.requirements.slice(0, 100).filter(item => item && typeof item === 'object').map(item => ({
      canonical: String(item.canonical || '').slice(0, 100),
      display: String(item.display || item.canonical || '').slice(0, 100),
      importance: ['high', 'medium', 'low'].includes(item.importance) ? item.importance : 'medium',
      status: statusValues.includes(item.status) ? item.status : 'not_found',
      weight: Number.isFinite(Number(item.weight)) ? Number(item.weight) : 1,
      evidence: String(item.evidence || '').slice(0, 400),
      profileEvidence: item.profileEvidence ? String(item.profileEvidence).slice(0, 400) : null,
      reason: String(item.reason || '').slice(0, 500),
      priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : null,
      priorityScore: Number.isFinite(Number(item.priorityScore)) ? Number(item.priorityScore) : null,
      priorityMethod: String(item.priorityMethod || '').slice(0, 500),
      relatedSkills: Array.isArray(item.relatedSkills) ? item.relatedSkills.slice(0, 20).map(skill => String(skill).slice(0, 100)) : [],
      prerequisites: Array.isArray(item.prerequisites) ? item.prerequisites.slice(0, 20).map(skill => String(skill).slice(0, 100)) : [],
      source: String(item.source || 'job').slice(0, 20),
      sources: Array.isArray(item.sources) ? item.sources.slice(0, 5).map(source => String(source).slice(0, 20)) : ['job']
    }));
    const summary = {
        title: String(value.summary.title || value.job?.title || 'Job description').slice(0, 120),
        ...(String(value.summary.company || value.job?.company || '').trim() ? { company: String(value.summary.company || value.job.company).trim().slice(0, 120) } : {}),
        coverageScore: value.summary.coverageScore !== null && value.summary.coverageScore !== undefined && Number.isFinite(Number(value.summary.coverageScore)) ? Math.max(0, Math.min(100, Number(value.summary.coverageScore))) : null,
        requirementCount: Math.max(0, Math.min(100, Number(value.summary.requirementCount) || 0)),
        matchedCount: Math.max(0, Math.min(100, Number(value.summary.matchedCount) || 0)),
        developingCount: Math.max(0, Math.min(100, Number(value.summary.developingCount) || 0)),
        notFoundCount: Math.max(0, Math.min(100, Number(value.summary.notFoundCount) || 0))
      };
    const byCanonical = new Map(requirements.map(item => [item.canonical, item]));
    const requestedGapOrder = Array.isArray(value.priorityGaps) ? value.priorityGaps.map(item => byCanonical.get(String(item?.canonical || ''))).filter(item => item && item.status !== 'matched') : [];
    const gaps = requestedGapOrder.length ? requestedGapOrder : requirements.filter(item => item.status !== 'matched');
    const readinessSimulations = Array.isArray(value.readinessSimulations) ? value.readinessSimulations.slice(0, 10).filter(item => item && typeof item === 'object').map(item => ({
      canonical: String(item.canonical || '').slice(0, 100), display: String(item.display || item.canonical || '').slice(0, 100),
      currentScore: Number.isFinite(Number(item.currentScore)) ? Number(item.currentScore) : null,
      simulatedScore: Number.isFinite(Number(item.simulatedScore)) ? Number(item.simulatedScore) : null,
      improvement: Number.isFinite(Number(item.improvement)) ? Number(item.improvement) : 0,
      status: statusValues.includes(item.status) ? item.status : 'missing', priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium'
    })) : [];
    return {
      summary,
      job: { title: summary.title, ...(summary.company ? { company: summary.company } : {}) },
      coverageScore: summary.coverageScore,
      scoreLabel: 'weighted coverage of extracted requirements',
      requirementCount: summary.requirementCount,
      matchedCount: summary.matchedCount,
      developingCount: summary.developingCount,
      notFoundCount: summary.notFoundCount,
      requirements,
      skillsYouHave: requirements.filter(item => item.status === 'matched'),
      developingSkills: requirements.filter(item => item.status === 'developing'),
      notFoundSkills: requirements.filter(item => ['missing', 'not_found'].includes(item.status)),
      priorityGaps: gaps,
      readinessSimulations,
      warnings: Array.isArray(value.warnings) ? value.warnings.slice(0, 10).map(item => String(item).slice(0, 300)) : [],
      scoreFormula: String(value.scoreFormula || '').slice(0, 500),
      methodology: String(value.methodology || '').slice(0, 1000)
    };
  };
  let resume = body.resume === undefined ? (existing.resume || null) : body.resume;
  if (resume) {
    const validHash = /^[a-f0-9]{64}$/i.test(String(resume.contentHash || '')) ? String(resume.contentHash).toLowerCase() : null;
    const candidateDecisions = Array.isArray(resume.candidateDecisions) ? resume.candidateDecisions.slice(0, 200).filter(item => item && typeof item === 'object').map(item => ({
      canonical: String(item.canonical || '').trim().toLowerCase().slice(0, 100),
      status: ['confirmed', 'rejected'].includes(item.status) ? item.status : null,
      confidence: Number.isFinite(Number(item.confidence)) ? Math.max(0, Math.min(1, Number(item.confidence))) : null
    })).filter(item => item.canonical && item.status) : (validHash && validHash === existing.resume?.contentHash ? existing.resume.candidateDecisions || [] : []);
    const sections = resume.sections && typeof resume.sections === 'object' && !Array.isArray(resume.sections)
      ? Object.fromEntries(Object.entries(resume.sections).slice(0, 20).map(([key, value]) => [String(key).slice(0, 40), String(typeof value === 'object' ? value?.text || '' : value || '').slice(0, 2000)]))
      : {};
    resume = {
      fileName: String(resume.fileName || '').slice(0, 255),
      uploadedAt: resume.uploadedAt || null,
      status: resume.status === 'parsed' ? 'parsed' : 'none',
      extractedText: String(resume.extractedText || '').slice(0, 3000),
      extractedSkillCount: Number.isFinite(Number(resume.extractedSkillCount)) ? Math.max(0, Number(resume.extractedSkillCount)) : 0,
      contentHash: validHash,
      sections,
      candidateDecisions
    };
  }
  const candidateProfile = {
    ...existing,
    id: id || existing.id || `vortex-user-${Date.now()}`,
    name: String(body.name ?? existing.name ?? '').slice(0, 160),
    email: String(body.email ?? existing.email ?? '').trim(),
    phone: String(body.phone ?? existing.phone ?? '').slice(0, 80),
    college: String(body.college ?? existing.college ?? '').slice(0, 200),
    degree: String(body.degree ?? existing.degree ?? '').slice(0, 200),
    gradYear: body.gradYear ?? existing.gradYear ?? '',
    cgpa: body.cgpa ?? existing.cgpa ?? '',
    skills: body.skills,
    skillGoals: body.skillGoals,
    roadmapProgress: body.roadmapProgress,
    wellnessRoutine: body.wellnessRoutine,
    latestJobMatch: body.latestJobMatch === undefined ? (existing.latestJobMatch || null) : sanitizeJobMatch(body.latestJobMatch),
    resume,
    interests: Array.isArray(body.interests) ? body.interests.filter(value => typeof value === 'string').slice(0, 50) : (existing.interests || []),
    projects: body.projects ?? existing.projects ?? [],
    experience: body.experience ?? existing.experience ?? [],
    certifications: body.certifications ?? existing.certifications ?? [],
    experienceLevel: String(body.experienceLevel ?? existing.experienceLevel ?? '').slice(0, 80),
    targetCareer: String(body.targetCareer ?? existing.targetCareer ?? '').slice(0, 120),
    updatedAt: new Date().toISOString()
  };

  if (existingIndex >= 0) {
    db.users[existingIndex] = { ...db.users[existingIndex], ...candidateProfile };
  } else {
    db.users.push(candidateProfile);
  }

  if (!writeDatabase(db)) return res.status(500).json({ error: 'Candidate profile could not be saved to the database.' });
  res.json({
    success: true,
    message: 'Student profile successfully stored in Tech Vortex Data Vault.',
    profile: candidateProfile
  });
});

// 3. Student Profile: Fetch by Email or ID
app.get('/api/user/profile/:identifier', (req, res) => {
  let db;
  try { db = readDatabase(); } catch (error) { return res.status(503).json({ error: 'Candidate database is unreadable.' }); }
  const user = db.users.find(u => u.id === req.params.identifier || u.email === req.params.identifier);
  if (!user) {
    return res.status(404).json({ error: 'Candidate profile not found.' });
  }
  try { return res.json(normalizeProfile(user, user)); }
  catch (error) {
    console.error('Stored candidate profile could not be normalized:', error.message);
    return res.status(503).json({ error: 'The saved profile needs review before it can be loaded.' });
  }
});

// 4. AI/ML Career Intelligence Pipeline (5 Stages)
app.post('/api/ai/analyze', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return res.status(400).json({ error: 'A candidate profile object is required.' });
  }
  const requestProfile = body.profile ?? body;
  if (!requestProfile || typeof requestProfile !== 'object' || Array.isArray(requestProfile)) {
    return res.status(400).json({ error: 'A candidate profile object is required.' });
  }
  if (requestProfile.skills !== undefined && !Array.isArray(requestProfile.skills)) {
    return res.status(400).json({ error: 'Candidate skills must be an array.' });
  }
  if (requestProfile.interests !== undefined && !Array.isArray(requestProfile.interests)) {
    return res.status(400).json({ error: 'Candidate interests must be an array.' });
  }
  if (requestProfile.projects !== undefined && !Array.isArray(requestProfile.projects) && typeof requestProfile.projects !== 'string') {
    return res.status(400).json({ error: 'Candidate projects must be an array or text.' });
  }
  const resumeProfile = body.resumeProfile || requestProfile.resumeProfile;
  if (resumeProfile && (typeof resumeProfile !== 'object' || Array.isArray(resumeProfile))) {
    return res.status(400).json({ error: 'Resume profile must be an object.' });
  }
  const rawProfile = resumeProfile
    ? { ...resumeProfile, ...requestProfile, skills: requestProfile.skills || resumeProfile.skills, projects: requestProfile.projects || resumeProfile.projects }
    : requestProfile;
  let profile;
  try { profile = normalizeProfile(rawProfile); }
  catch (error) { return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' }); }
  const hasSkills = Array.isArray(profile.skills) && profile.skills.some(skill => typeof skill === 'string' ? skill.trim() : skill && typeof skill === 'object' && Boolean(skill.canonical || skill.name || skill.skill || skill.title));
  const hasProjects = Array.isArray(profile.projects) ? profile.projects.some(project => typeof project === 'string' ? project.trim() : project && typeof project === 'object' && Object.values(project).some(value => String(value || '').trim())) : typeof profile.projects === 'string' && profile.projects.trim().length > 0;
  const hasInterests = Array.isArray(profile.interests) && profile.interests.some(interest => String(interest || '').trim());
  const hasEducation = Boolean(profile.degree || profile.cgpa || profile.education || profile.college);
  if (!hasSkills && !hasProjects && !hasInterests && !hasEducation) {
    return res.status(400).json({ error: 'Add skills, project details, interests, or education before requesting career analysis.' });
  }

  // Python is the canonical implementation. Do not return fabricated Node scores
  // if the ML process is unavailable or returns invalid output.
  const tempProfilePath = createTempPath('elite_vortex_profile', '.json');
  try {
    fs.writeFileSync(tempProfilePath, JSON.stringify(profile), { mode: 0o600, flag: 'wx' });
  } catch (error) {
    console.error('Could not prepare ML profile:', error);
    return res.status(500).json({ error: 'Could not prepare the profile for analysis.' });
  }

  try {
    const { code, stdout, stderr } = await runPython(path.join(__dirname, 'ml_engine.py'), ['--profile', tempProfilePath]);
    if (code !== 0 || !stdout.trim()) {
      console.error(`Python ML engine failed (exit ${code}): ${stderr}`);
      return res.status(503).json({ error: 'Career analysis is temporarily unavailable.', details: 'Python ML engine did not return a valid result.' });
    }
    return res.json(JSON.parse(stdout));
  } catch (error) {
    if (error.code === 'ETIMEDOUT') return res.status(504).json({ error: 'Career analysis timed out. Try again with a smaller profile.' });
    console.error('Python ML engine failed:', error.message);
    return res.status(503).json({ error: 'Career analysis is temporarily unavailable.', details: 'Python ML engine did not return a valid result.' });
  } finally {
    removeTempFile(tempProfilePath);
  }
});

// Deterministic job-description skill extraction and profile coverage analysis.
app.post('/api/job-match/analyze', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body)) return res.status(400).json({ error: 'A job analysis request is required.' });
  const jobDescription = body.jobDescription;
  const rawProfile = body.profile;
  if (typeof jobDescription !== 'string' || jobDescription.trim().length < 20) return res.status(400).json({ error: 'Paste a job description with at least 20 characters.' });
  if (jobDescription.length > 30000) return res.status(413).json({ error: 'Job description must be 30,000 characters or fewer.' });
  if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) return res.status(400).json({ error: 'A candidate profile object is required.' });
  let profile;
  try { profile = normalizeProfile(rawProfile); }
  catch (error) { return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' }); }

  const tempPath = createTempPath('elite_vortex_job_match', '.json');
  try {
    const jobTitle = typeof body.jobTitle === 'string' ? body.jobTitle.trim().slice(0, 120) : '';
    const company = typeof body.company === 'string' ? body.company.trim().slice(0, 120) : '';
    fs.writeFileSync(tempPath, JSON.stringify({ profile, jobDescription, jobTitle, company }), { mode: 0o600, flag: 'wx' });
    const { code, stdout, stderr } = await runPython(path.join(__dirname, 'job_matcher.py'), ['--input', tempPath]);
    if (code !== 0 || !stdout.trim()) {
      console.error(`Job matcher failed (exit ${code}): ${stderr}`);
      return res.status(503).json({ error: 'Job analysis is temporarily unavailable.' });
    }
    const result = JSON.parse(stdout);
    if (result.error) return res.status(400).json({ error: result.error });
    return res.json(result);
  } catch (error) {
    console.error('Job analysis failed:', error.message);
    return res.status(503).json({ error: 'Job analysis is temporarily unavailable.' });
  } finally {
    removeTempFile(tempPath);
  }
});

// Track metadata is read from the catalogue so the existing target selector stays data-driven.
app.get('/api/roadmap/catalogue', (req, res) => {
  const cataloguePath = path.join(__dirname, '..', 'tech_vortex_roadmap_catalogue', 'roadmap_catalogue.json');
  try {
    const catalogue = JSON.parse(fs.readFileSync(cataloguePath, 'utf8'));
    if (!catalogue.tracks || typeof catalogue.tracks !== 'object' || Array.isArray(catalogue.tracks)) throw new Error('Catalogue tracks are missing.');
    const tracks = Object.entries(catalogue.tracks).map(([id, track]) => ({
      id, name: String(track.name || id), description: String(track.description || ''),
      skillCount: Array.isArray(track.skills) ? track.skills.length : 0
    }));
    const ontology = JSON.parse(fs.readFileSync(path.join(__dirname, 'skill_ontology.json'), 'utf8'));
    const aliases = ontology.aliases || {};
    const ontologySkills = Array.isArray(ontology.skills) ? ontology.skills : Object.keys(ontology.skills || {});
    const skillNames = new Set(ontologySkills.map(value => aliases[String(value).trim().toLowerCase()] || String(value).trim().toLowerCase()));
    for (const value of Object.keys(catalogue.resourcesBySkill || {})) {
      const key = String(value).trim().toLowerCase();
      skillNames.add(aliases[key] || key);
    }
    for (const track of Object.values(catalogue.tracks)) {
      for (const item of Array.isArray(track.skills) ? track.skills : []) {
        if (typeof item?.skill === 'string' && item.skill.trim()) {
          const key = item.skill.trim().toLowerCase();
          skillNames.add(aliases[key] || key);
        }
      }
    }
    const skills = [...skillNames].sort((a, b) => a.localeCompare(b));
    return res.json({ catalogueVersion: catalogue.catalogueVersion || null, tracks, skills });
  } catch (error) {
    console.error('Roadmap catalogue could not be served:', error.message);
    return res.status(503).json({ error: 'The roadmap catalogue is temporarily unavailable.' });
  }
});

// A resume and career target are optional for student-selected skill goals.
app.post('/api/roadmap/skills', async (req, res) => {
  const rawProfile = req.body?.profile;
  if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) return res.status(400).json({ error: 'A candidate profile object is required.' });
  let profile;
  try { profile = normalizeProfile(rawProfile); }
  catch (error) { return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' }); }
  if (!Array.isArray(profile.skillGoals)) profile.skillGoals = [];
  const tempPath = createTempPath('elite_vortex_skill_goals', '.json');
  try {
    fs.writeFileSync(tempPath, JSON.stringify(profile), { mode: 0o600, flag: 'wx' });
    const { code, stdout, stderr } = await runPython(path.join(__dirname, 'skill_goal_roadmap.py'), ['--input', tempPath]);
    if (code !== 0 || !stdout.trim()) {
      console.error(`Skill goal roadmap failed (exit ${code}): ${stderr}`);
      return res.status(503).json({ error: 'The learning roadmap is temporarily unavailable.' });
    }
    const result = JSON.parse(stdout);
    if (result.error) return res.status(400).json({ error: result.error });
    return res.json({ ...result, learningRoadmap: result });
  } catch (error) {
    console.error('Skill goal roadmap failed:', error.message);
    return res.status(503).json({ error: 'The learning roadmap is temporarily unavailable.' });
  } finally { removeTempFile(tempPath); }
});

// Build the daily routine from the same personalized roadmap and skill-gap engine.
app.post('/api/wellness/routine/plan', async (req, res) => {
  const rawProfile = req.body?.profile;
  if (!rawProfile || typeof rawProfile !== 'object' || Array.isArray(rawProfile)) return res.status(400).json({ error: 'A candidate profile object is required.' });
  const mode = String(req.body?.mode || 'none');
  if (!['none', 'job', 'career', 'skill'].includes(mode)) return res.status(400).json({ error: 'Choose a supported learning context.' });
  let profile;
  try { profile = normalizeProfile(rawProfile); }
  catch (error) { return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' }); }

  let roadmapProfile = { ...profile };
  if (mode === 'job') {
    roadmapProfile = { ...profile, targetCareer: '', skillGoals: [] };
  } else if (mode === 'skill') {
    const requested = normalizeSkillName(req.body?.selectedSkill || '');
    const selectedGoal = profile.skillGoals.find(goal => normalizeSkillName(goal.canonical) === requested) || profile.skillGoals[0];
    roadmapProfile = { ...profile, targetCareer: '', latestJobMatch: null, skillGoals: selectedGoal ? [selectedGoal] : [] };
  } else if (mode === 'none') {
    roadmapProfile = { ...profile, targetCareer: '', latestJobMatch: null, skillGoals: [] };
  }

  const tempPath = createTempPath('elite_vortex_wellness_roadmap', '.json');
  try {
    fs.writeFileSync(tempPath, JSON.stringify(roadmapProfile), { mode: 0o600, flag: 'wx' });
    const { code, stdout, stderr } = await runPython(path.join(__dirname, 'roadmap_engine.py'), ['--input', tempPath]);
    if (code !== 0 || !stdout.trim()) {
      console.error(`Wellness roadmap failed (exit ${code}): ${stderr}`);
      return res.status(503).json({ error: 'The learning plan is temporarily unavailable. Your saved routine was not changed.' });
    }
    const roadmap = JSON.parse(stdout);
    if (roadmap.error) return res.status(400).json({ error: roadmap.error });
    return res.json(buildRoutinePlan(roadmap, profile.wellnessRoutine, { mode, asOfDate: req.body?.asOfDate }));
  } catch (error) {
    console.error('Wellness routine could not be generated:', error.message);
    return res.status(error instanceof TypeError ? 400 : 503).json({ error: error.message || 'The learning plan is temporarily unavailable.' });
  } finally { removeTempFile(tempPath); }
});

// 5. Example Opportunities (static demo dataset; no external job source)
app.get('/api/jobs', (req, res) => {
  const db = readDatabase();
  const jobs = Array.isArray(db.exampleJobs) ? db.exampleJobs : (Array.isArray(db.liveJobs) ? db.liveJobs : []);
  res.json({
    totalJobs: jobs.length,
    jobs,
    dataLabel: 'Example Opportunities',
    methodology: 'Static examples stored in the local project database. No external jobs API is queried and listing details are not verified.'
  });
});

// 6. Market Analytics
app.get('/api/market/analytics', (req, res) => {
  res.json({
    dataLabel: 'Sample Market Data',
    methodology: 'Fixed illustrative values bundled with the demo. No external market data source is queried or verified.',
    marketPulse: 'Strong Tech Hiring Momentum in AI, Full Stack & Cloud',
    fresherDemandIndex: 88,
    topInDemandSkills: [
      { skill: 'Python & Generative AI', demandPercent: 94, growth: '+42%' },
      { skill: 'React & Next.js', demandPercent: 91, growth: '+31%' },
      { skill: 'Cloud & Docker / Kubernetes', demandPercent: 86, growth: '+36%' },
      { skill: 'Node.js & Microservices', demandPercent: 83, growth: '+25%' },
      { skill: 'Advanced SQL & Data Analytics', demandPercent: 79, growth: '+22%' }
    ],
    averageFresherCTC: '₹8.2 - 14.5 LPA',
    remoteWorkShare: '42%'
  });
});

// 7. Deterministic interview question selection and practice bank.
app.post('/api/interview/generate', (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  let profile = {};
  try { if (body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile)) profile = normalizeProfile(body.profile); }
  catch (error) { return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' }); }
  const result = generateQuestions({ profile, career: body.career || body.niche, topic: body.topic, difficulty: body.difficulty, count: body.count, mode: body.mode, type: body.type });
  return res.json(result);
});

app.get('/api/interview/question-bank', (req, res) => {
  const questions = questionBank({ niche: req.query.niche, topic: req.query.topic, difficulty: req.query.difficulty, type: req.query.type });
  return res.json({ total: questions.length, questions });
});

app.post('/api/interview/followup', (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  if (!body.question || typeof body.question !== 'object' || Array.isArray(body.question)) return res.status(400).json({ error: 'A previous question object is required.' });
  let profile = {};
  try { if (body.profile && typeof body.profile === 'object' && !Array.isArray(body.profile)) profile = normalizeProfile(body.profile); }
  catch (error) { return res.status(400).json({ error: error.message || 'Candidate profile is invalid.' }); }
  return res.json(generateFollowup({ question: body.question, evaluation: body.evaluation, profile, career: body.career, difficulty: body.difficulty, mode: body.mode }));
});

// 8. Deterministic technical rubric evaluator (keeps the existing endpoint contract).
app.post('/api/interview/evaluate', (req, res) => {
  const { question, questionId, answer, expectedConcepts, tradeoffs } = req.body || {};
  res.json(evaluateAnswer({ question, questionId, answer, expectedConcepts, tradeoffs }));
});

// 9. LinkedIn Optimizer
app.post('/api/linkedin/optimize', (req, res) => {
  const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
  const { targetRole, skills, college, degree, interests } = body;
  const role = targetRole || 'your target role';
  const skillList = (Array.isArray(skills) ? skills : []).slice(0, 4).filter(Boolean).join(' | ') || 'add profile-listed skills';
  const interestList = (Array.isArray(interests) ? interests : []).filter(Boolean).join(', ') || 'your target areas';
  const keywordSuggestions = [...new Set([
    ...((Array.isArray(skills) ? skills : []).filter(skill => typeof skill === 'string').map(skill => skill.trim()).filter(Boolean)),
    ...(targetRole ? [String(targetRole)] : [])
  ])];

  res.json({
    generatedHeadlines: [
      `${role} candidate | Profile-listed skills: ${skillList}`,
      `Aspiring ${role}${college ? ` @ ${college}` : ''} | ${skillList} | Open to opportunities`,
      `${role} candidate | Interested in ${interestList} | Add substantiated project evidence`
    ],
    seoKeywords: keywordSuggestions,
    aboutSummaryTemplate: `I am interested in ${role} opportunities.\n\nProfile-listed skills: ${skillList}.${degree ? `\nEducation: ${degree}.` : ''}\n\nMy areas of interest include ${interestList}. Add a specific, verifiable project example and links before publishing this summary.`
  });
});

app.use('/api', (req, res) => res.status(404).json({ error: 'API endpoint not found.' }));

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body exceeds the allowed size.' });
  }
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Malformed JSON request body.' });
  }
  const status = Number(err?.status) >= 400 && Number(err?.status) < 500 ? Number(err.status) : 500;
  if (status >= 500) console.error('Unhandled API error:', err);
  return res.status(status).json({ error: status < 500 ? (err.message || 'Invalid request.') : 'Internal server error.' });
});

function startServer(port = PORT, host) {
  const server = app.listen(port, host, () => {
    console.log(`=======================================================`);
    console.log(`⚡ TECH VORTEX AI CAREER INTELLIGENCE PLATFORM ONLINE ⚡`);
    console.log(`🚀 REST API Server running at: http://localhost:${port}`);
    console.log(`📡 Serving API Endpoints and Static Web App Frontend`);
    console.log(`=======================================================`);
  });
  return server;
}

if (require.main === module) startServer();

module.exports = { app, startServer };
