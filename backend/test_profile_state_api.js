'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { app } = require('./server');
const databaseFile = path.join(__dirname, 'database.json');
let database = { users: [], careersDatabase: [], exampleJobs: [] };
let temporaryWrite = null;
const original = {
  existsSync: fs.existsSync.bind(fs), readFileSync: fs.readFileSync.bind(fs),
  writeFileSync: fs.writeFileSync.bind(fs), renameSync: fs.renameSync.bind(fs), unlinkSync: fs.unlinkSync.bind(fs)
};
fs.existsSync = file => path.resolve(String(file)) === databaseFile ? true : original.existsSync(file);
fs.readFileSync = (file, ...args) => path.resolve(String(file)) === databaseFile ? JSON.stringify(database) : original.readFileSync(file, ...args);
fs.writeFileSync = (file, data, options) => {
  if (String(file).startsWith(databaseFile + '.')) { temporaryWrite = String(data); return; }
  return original.writeFileSync(file, data, options);
};
fs.renameSync = (from, to) => {
  if (path.resolve(String(to)) === databaseFile) { database = JSON.parse(temporaryWrite); temporaryWrite = null; return; }
  return original.renameSync(from, to);
};
fs.unlinkSync = file => String(file).startsWith(databaseFile + '.') ? undefined : original.unlinkSync(file);
const route = app._router.stack.find(item => item.route?.path === '/api/user/profile' && item.route.methods.post);
assert.ok(route);
const handler = route.route.stack.find(item => item.method === 'post').handle;
const readRoute = app._router.stack.find(item => item.route?.path === '/api/user/profile/:identifier' && item.route.methods.get);
assert.ok(readRoute);
const readHandler = readRoute.route.stack.find(item => item.method === 'get').handle;
function save(body) {
  const res = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
  handler({ body }, res);
  return res;
}

const first = save({ id: 'goal-profile-test', email: '', personal: { name: 'Test Candidate' }, education: { cgpa: 8.5, graduationYear: 2028 }, careerGoal: { role: 'ai-ml-engineer' }, skills: [
  { name: 'Python programming', level: 'intermediate', source: 'manual', confidence: 1 },
  { name: 'py', level: 'advanced', source: 'manual', confidence: 1 }
], skillGoals: [{ canonical: 'python', currentLevel: 'beginner', targetLevel: 'advanced', priority: 'high' }], roadmapProgress: {
  'roadmap:ai-ml-engineer:python': { learningStatus: 'completed', practiceStatus: 'completed', verificationStatus: 'not_started' }
}, wellnessRoutine: {
  preferences: { availableMinutes: 60, startTime: '19:00', preferredDays: [2, 4], sessionMinutes: 30, breakMinutes: 5, sourceMode: 'job' },
  manualTasks: [{ id: 'manual:persisted', title: 'Study notes', category: 'Study', date: '2026-10-12', durationMinutes: 30, status: 'upcoming' }],
  sessionStates: { 'wellness:job:ml-intern:pytorch:learning': { status: 'completed', title: 'Learn PyTorch', roadmapItemId: 'roadmap:job:pytorch', skill: 'PyTorch', canonicalSkill: 'pytorch', activity: 'learning', source: 'job-gap', date: '2026-10-08', time: '18:00', completedAt: '2026-10-08T18:30:00.000Z' } }
}, latestJobMatch: {
  summary: { title: 'ML Intern', company: 'ExampleCo', coverageScore: 60, requirementCount: 5, matchedCount: 3, developingCount: 0, notFoundCount: 2 },
  requirements: [{ canonical: 'python', display: 'Python', importance: 'high', status: 'matched', evidence: 'Required Python' }, { canonical: 'docker', display: 'Docker', importance: 'low', status: 'missing', evidence: 'Docker is preferred.', reason: 'No confirmed evidence', priority: 'medium', source: 'job' }],
  priorityGaps: [{ canonical: 'docker' }], readinessSimulations: [{ canonical: 'docker', currentScore: 60, simulatedScore: 70, improvement: 10 }], warnings: ['One unsupported skill was skipped.'], methodology: 'Explicit canonical skill phrases.'
} });
assert.equal(first.statusCode, 200);
assert.equal(database.users[0].name, 'Test Candidate');
assert.equal(database.users[0].cgpa, 8.5);
assert.equal(database.users[0].targetCareer, 'ai-ml-engineer');
assert.equal(database.users[0].skills.length, 1);
assert.equal(database.users[0].skills[0].canonical, 'python');
assert.equal(database.users[0].skills[0].canonicalName, 'Python');
assert.equal(database.users[0].skills[0].level, 'advanced');
assert.equal(database.users[0].skillGoals[0].canonical, 'python');
assert.equal(database.users[0].wellnessRoutine.preferences.availableMinutes, 60);
assert.deepEqual(database.users[0].wellnessRoutine.preferences.preferredDays, [2, 4]);
assert.equal(database.users[0].wellnessRoutine.manualTasks[0].id, 'manual:persisted');
assert.equal(database.users[0].wellnessRoutine.sessionStates['wellness:job:ml-intern:pytorch:learning'].status, 'completed');
assert.equal(database.users[0].roadmapProgress['roadmap:ai-ml-engineer:python'].practiceStatus, 'completed');
assert.equal(database.users[0].latestJobMatch.requirements[0].status, 'matched');
assert.equal(database.users[0].latestJobMatch.summary.coverageScore, 60);
assert.equal(database.users[0].latestJobMatch.job.company, 'ExampleCo');
assert.equal(database.users[0].latestJobMatch.requirements[1].evidence, 'Docker is preferred.');
assert.equal(database.users[0].latestJobMatch.priorityGaps[0].canonical, 'docker');
assert.equal(database.users[0].latestJobMatch.readinessSimulations[0].improvement, 10);

const initialResume = save({ id: 'goal-profile-test', email: '', resume: { status: 'parsed', fileName: 'old.txt' }, skills: [
  { canonical: 'cuda', level: 'beginner', source: 'manual', confirmed: true },
  { canonical: 'pytorch', level: 'familiar', source: 'resume', confirmed: true },
  { canonical: 'python', level: 'intermediate', source: 'manual', sources: ['manual', 'resume'], confirmed: true }
] });
assert.equal(initialResume.statusCode, 200);
const replacedResume = save({ id: 'goal-profile-test', email: '', resume: { status: 'parsed', fileName: 'new.txt' }, skills: [
  { canonical: 'python', level: 'familiar', source: 'resume', confirmed: true, evidence: 'New resume' },
  { canonical: 'docker', level: 'familiar', source: 'resume', confirmed: true }
] });
assert.equal(replacedResume.statusCode, 200);
assert.deepEqual(database.users[0].skills.map(skill => skill.canonical).sort(), ['cuda', 'docker', 'python', 'pytorch']);
assert.deepEqual(database.users[0].skills.find(skill => skill.canonical === 'python').sources.sort(), ['manual', 'resume']);
const resumeHash = 'a'.repeat(64);
const reviewedResume = save({ id: 'goal-profile-test', email: '', resume: {
  status: 'parsed', fileName: 'new.txt', contentHash: resumeHash,
  sections: { projects: { text: 'Built a tool using Python.' } },
  candidateDecisions: [{ canonical: 'quantization', status: 'confirmed', confidence: 0.9 }, { canonical: 'tensorflow', status: 'rejected', confidence: 0.6 }]
}, skills: [...database.users[0].skills, { canonical: 'quantization', level: 'familiar', source: 'resume', confirmed: true, evidenceItems: [{ section: 'projects', text: 'Applied quantization to a model.' }] }] });
assert.equal(reviewedResume.statusCode, 200);
assert.deepEqual(database.users[0].resume.candidateDecisions.map(item => item.status), ['confirmed', 'rejected']);
assert.equal(database.users[0].resume.contentHash, resumeHash);
assert.match(database.users[0].resume.sections.projects, /Python/);
assert.ok(database.users[0].skills.some(skill => skill.canonical === 'quantization' && skill.confirmed));
assert.ok(!database.users[0].skills.some(skill => skill.canonical === 'tensorflow'));
const reviewRead = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
readHandler({ params: { identifier: 'goal-profile-test' } }, reviewRead);
assert.deepEqual(reviewRead.body.resume.candidateDecisions.map(item => item.status), ['confirmed', 'rejected']);
assert.ok(reviewRead.body.skills.some(skill => skill.canonical === 'quantization'));
const changedResume = save({ id: 'goal-profile-test', email: '', resume: { status: 'parsed', fileName: 'replacement.txt', contentHash: 'b'.repeat(64) }, skills: database.users[0].skills });
assert.equal(changedResume.statusCode, 200);
assert.deepEqual(database.users[0].resume.candidateDecisions, []);
const resumeRemoved = save({ id: 'goal-profile-test', email: '', resume: null });
assert.equal(resumeRemoved.statusCode, 200);
assert.deepEqual(database.users[0].skills.map(skill => skill.canonical).sort(), ['cuda', 'docker', 'python', 'pytorch', 'quantization']);

const badProfile = save({ id: 'goal-profile-test', email: '', cgpa: 11 });
assert.equal(badProfile.statusCode, 400);
assert.equal(database.users[0].cgpa, 8.5);

const readResponse = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
readHandler({ params: { identifier: 'goal-profile-test' } }, readResponse);
assert.equal(readResponse.statusCode, 200);
assert.deepEqual(readResponse.body.skills.map(skill => skill.canonicalName).sort(), ['CUDA', 'Docker', 'PyTorch', 'Python', 'Quantization']);
assert.equal(readResponse.body.skillGoals[0].canonicalSkill, 'Python');
assert.equal(readResponse.body.roadmapProgress['roadmap:ai-ml-engineer:python'].verificationStatus, 'not_started');

save({ id: 'goal-profile-test', email: '', resume: { status: 'parsed', fileName: 'new.txt' }, skills: [
  { canonical: 'cuda', level: 'beginner', source: 'manual', confirmed: true },
  { canonical: 'python', level: 'familiar', source: 'resume', confirmed: true }
] });
const explicitlyRemovedManual = save({ id: 'goal-profile-test', email: '', resume: { status: 'parsed', fileName: 'new.txt' }, removedSkills: ['cuda'], skills: [
  { canonical: 'python', level: 'familiar', source: 'resume', confirmed: true }
] });
assert.equal(explicitlyRemovedManual.statusCode, 200);
assert.deepEqual(database.users[0].skills.map(skill => skill.canonical).sort(), ['docker', 'python', 'pytorch', 'quantization']);

const second = save({ id: 'goal-profile-test', email: '', skillGoals: [], latestJobMatch: null });
assert.equal(second.statusCode, 200);
assert.deepEqual(database.users[0].skillGoals, []);
assert.equal(database.users[0].latestJobMatch, null);
process.stdout.write(JSON.stringify({ profilePersistence: true, roadmapProgressPersistence: true, getReturnsCanonical: true, canonicalSkillMerge: true, resumeReplacementPreservesManual: true, resumeRemoval: true, validation: true, goalRemoval: true, jobAnalysisRemoval: true }) + '\n');
