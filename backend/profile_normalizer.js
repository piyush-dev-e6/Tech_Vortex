'use strict';

const { aliases, displayNames } = require('./skill_ontology.json');
const { normalizeWellnessRoutine } = require('./wellness_routine');

const SKILL_LEVELS = new Set(['beginner', 'familiar', 'intermediate', 'advanced']);
const LEVEL_ALIASES = {
  basic: 'beginner', learning: 'beginner', 'in progress': 'beginner',
  comfortable: 'familiar', working: 'intermediate', mid: 'intermediate',
  strong: 'intermediate', 'knows basics': 'beginner', 'pretty good': 'intermediate',
  'expert-ish': 'advanced', expert: 'advanced', mastered: 'advanced'
};
const PROFILE_FIELDS = [
  'id', 'name', 'email', 'phone', 'address', 'college', 'degree', 'gradYear', 'cgpa',
  'resume', 'interests', 'projects', 'experience', 'certifications', 'experienceLevel',
  'targetCareer', 'targetRole', 'workMode', 'salaryTarget', 'github', 'linkedin', 'bio',
  'skillGoals', 'latestJobMatch', 'roadmapProgress', 'wellnessRoutine'
];

function normalizeKey(value) {
  return String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
}

function normalizeSkillName(value) {
  const normalized = normalizeKey(value);
  if (!normalized) return '';
  return aliases[normalized] || normalized;
}

function displaySkillName(value) {
  const canonical = normalizeSkillName(value);
  if (!canonical) return '';
  return displayNames[canonical] || canonical.replace(/\b\w/g, letter => letter.toUpperCase());
}

function normalizeLevel(value, fallback = 'familiar') {
  const normalized = normalizeKey(value);
  const level = LEVEL_ALIASES[normalized] || normalized;
  if (!level) return fallback;
  return SKILL_LEVELS.has(level) ? level : null;
}

function valuesAsEvidence(value) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return [...new Set(values.map(item => String(item ?? '').trim().slice(0, 500)).filter(Boolean))].slice(0, 20);
}

function normalizeEvidenceItems(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).filter(item => item && typeof item === 'object' && !Array.isArray(item)).map(item => ({
    section: String(item.section || 'unknown').slice(0, 40),
    text: String(item.text || '').trim().slice(0, 500),
    location: item.location && typeof item.location === 'object' ? {
      line: Number.isInteger(Number(item.location.line)) && Number(item.location.line) > 0 ? Number(item.location.line) : null,
      sectionLine: Number.isInteger(Number(item.location.sectionLine)) && Number(item.location.sectionLine) > 0 ? Number(item.location.sectionLine) : null
    } : null
  })).filter(item => item.text);
}

function normalizeSkills(rawSkills, { allowUnconfirmed = false } = {}) {
  if (rawSkills === undefined || rawSkills === null) return [];
  if (!Array.isArray(rawSkills)) throw new TypeError('Candidate skills must be an array.');
  const merged = new Map();
  for (const item of rawSkills.slice(0, 300)) {
    const input = typeof item === 'string' ? { name: item, source: 'manual' } : item;
    if (!input || typeof input !== 'object' || Array.isArray(input)) continue;
    const nameValue = input.canonicalName || input.canonical || input.name || input.display || input.skill || input.title;
    const canonical = normalizeSkillName(nameValue);
    if (!canonical || (input.confirmed === false && !allowUnconfirmed)) continue;
    const declaredLevel = input.level || input.proficiency || input.status;
    // Legacy entries had no proficiency field. Use the neutral level so loading
    // old data does not silently upgrade it to advanced proficiency.
    const level = normalizeLevel(declaredLevel, 'familiar');
    if (!level) throw new TypeError(`Unsupported proficiency level for ${displaySkillName(canonical)}.`);

    const sourceValues = Array.isArray(input.sources) ? input.sources : [input.source];
    const sources = [...new Set(sourceValues.filter(source => source === 'resume' || source === 'manual'))];
    if (!sources.length) sources.push('manual');
    const key = canonical;
    const previous = merged.get(key);
    const evidenceItems = [...(previous?.evidenceItems || []), ...normalizeEvidenceItems(input.evidenceItems || input.evidence)];
    const evidence = valuesAsEvidence([...(previous?.evidenceList || []), ...valuesAsEvidence(input.evidence)]);
    const previousSources = previous?.sources || [];
    const combinedSources = [...new Set([...previousSources, ...sources])];
    const inputConfidence = input.confidence === null || input.confidence === undefined || input.confidence === '' ? NaN : Number(input.confidence);
    const confidenceValues = [previous?.confidence, inputConfidence].filter(value => Number.isFinite(value) && value >= 0 && value <= 1);
    const confidence = confidenceValues.length ? Math.max(...confidenceValues) : null;
    const levelRank = { beginner: 0, familiar: 1, intermediate: 2, advanced: 3 };
    const strongestLevel = previous && levelRank[previous.level] > levelRank[level] ? previous.level : level;
    merged.set(key, {
      canonical,
      canonicalName: displaySkillName(canonical),
      name: displaySkillName(canonical),
      display: displaySkillName(canonical),
      level: strongestLevel,
      source: combinedSources.includes('manual') ? 'manual' : 'resume',
      sources: combinedSources,
      confidence,
      confirmed: input.confirmed !== false,
      evidence: evidence.join(' · '),
      evidenceList: evidence,
      evidenceItems
    });
  }
  return [...merged.values()].map(({ evidenceList, ...skill }) => skill);
}

function normalizeSkillGoals(rawGoals) {
  if (rawGoals === undefined || rawGoals === null) return [];
  if (!Array.isArray(rawGoals)) throw new TypeError('Skill goals must be an array.');
  const goals = new Map();
  for (const goal of rawGoals.slice(0, 100)) {
    if (!goal || typeof goal !== 'object' || Array.isArray(goal)) continue;
    const canonical = normalizeSkillName(goal.canonicalSkill || goal.canonical || goal.skill || goal.name || goal.display);
    if (!canonical) continue;
    const currentLevel = normalizeLevel(goal.currentLevel, 'beginner');
    const targetLevel = normalizeLevel(goal.desiredLevel || goal.targetLevel, 'intermediate');
    if (!currentLevel || !targetLevel) throw new TypeError(`Unsupported proficiency level for ${displaySkillName(canonical)} goal.`);
    goals.set(canonical, {
      canonical,
      canonicalSkill: displaySkillName(canonical),
      skill: displaySkillName(canonical),
      name: displaySkillName(canonical),
      display: displaySkillName(canonical),
      currentLevel,
      targetLevel,
      desiredLevel: targetLevel,
      priority: ['high', 'medium', 'low'].includes(normalizeKey(goal.priority)) ? normalizeKey(goal.priority) : 'medium',
      source: goal.source === 'user' ? 'user' : 'user'
    });
  }
  return [...goals.values()];
}

function normalizeRoadmapProgress(rawProgress) {
  if (rawProgress === undefined || rawProgress === null) return {};
  if (typeof rawProgress !== 'object' || Array.isArray(rawProgress)) throw new TypeError('Roadmap progress must be an object.');
  const states = new Set(['not_started', 'in_progress', 'completed']);
  const result = {};
  for (const [id, raw] of Object.entries(rawProgress).slice(0, 500)) {
    if (!id || id.length > 500 || !raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const state = Object.fromEntries(['learningStatus', 'practiceStatus', 'verificationStatus'].map(key => [
      key, states.has(raw[key]) ? raw[key] : 'not_started'
    ]));
    if (state.learningStatus !== 'completed') {
      state.practiceStatus = 'not_started';
      state.verificationStatus = 'not_started';
    } else if (state.practiceStatus !== 'completed') {
      state.verificationStatus = 'not_started';
    }
    result[id] = state;
  }
  return result;
}

function preserveManualSkillsDuringResumeChange(existingSkills, incomingResumeSkills = [], explicitlyRemoved = []) {
  const removedNames = new Set(normalizeSkills(Array.isArray(explicitlyRemoved) ? explicitlyRemoved : []).map(skill => skill.canonical));
  const existing = normalizeSkills(Array.isArray(existingSkills) ? existingSkills : []).filter(skill => !removedNames.has(skill.canonical));
  const preservedConfirmedSkills = existing.flatMap(skill => {
    const sources = Array.isArray(skill.sources) ? skill.sources : [skill.source];
    // Explicitly confirmed profile skills survive resume replacement. A newly
    // parsed candidate stays unconfirmed until the student takes an action.
    return skill.confirmed !== false ? [{ ...skill, sources }] : [];
  });
  const submittedSkills = normalizeSkills(Array.isArray(incomingResumeSkills) ? incomingResumeSkills : []);
  return normalizeSkills([...preservedConfirmedSkills, ...submittedSkills]);
}

function removeResumeDerivedSkills(existingSkills) {
  // Removing the source document must not revoke a skill the user already
  // confirmed. Resume provenance remains attached for transparency.
  return normalizeSkills(Array.isArray(existingSkills) ? existingSkills : []);
}

function normalizeProfile(input, existing = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new TypeError('A candidate profile object is required.');
  const merged = { ...existing };
  for (const field of PROFILE_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(input, field)) merged[field] = input[field];
  }

  if (input.personal && typeof input.personal === 'object') {
    for (const [source, target] of [['name', 'name'], ['email', 'email'], ['phone', 'phone']]) {
      if (input.personal[source] !== undefined) merged[target] = input.personal[source];
    }
  }
  if (input.education && typeof input.education === 'object') {
    for (const [source, target] of [['degree', 'degree'], ['institution', 'college'], ['graduationYear', 'gradYear'], ['cgpa', 'cgpa']]) {
      if (input.education[source] !== undefined) merged[target] = input.education[source];
    }
  }
  if (input.careerGoal && typeof input.careerGoal === 'object' && input.careerGoal.role !== undefined) {
    merged.targetCareer = input.careerGoal.role;
  }

  const email = String(merged.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new TypeError('Enter a valid email address.');
  if (merged.cgpa !== '' && merged.cgpa !== null && merged.cgpa !== undefined) {
    const cgpa = Number(merged.cgpa);
    if (!Number.isFinite(cgpa) || cgpa < 0 || cgpa > 10) throw new TypeError('CGPA must be a number from 0 to 10.');
    merged.cgpa = cgpa;
  }
  if (merged.gradYear !== '' && merged.gradYear !== null && merged.gradYear !== undefined) {
    const year = Number(merged.gradYear);
    if (!Number.isInteger(year) || year < 1950 || year > 2100) throw new TypeError('Graduation year must be a year from 1950 to 2100.');
    merged.gradYear = String(year);
  }
  const baseSkills = Object.prototype.hasOwnProperty.call(input, 'skills') ? input.skills : existing.skills;
  const baseGoals = Object.prototype.hasOwnProperty.call(input, 'skillGoals') ? input.skillGoals : existing.skillGoals;
  const skills = normalizeSkills(baseSkills);
  const skillGoals = normalizeSkillGoals(baseGoals);
  const roadmapProgress = normalizeRoadmapProgress(merged.roadmapProgress);
  const wellnessRoutine = normalizeWellnessRoutine(merged.wellnessRoutine);
  const id = String(merged.id || '').trim();
  if (id.length > 160) throw new TypeError('Profile ID is too long.');
  return {
    ...merged,
    id,
    name: String(merged.name || '').trim().slice(0, 160),
    email,
    phone: String(merged.phone || '').trim().slice(0, 80),
    college: String(merged.college || '').trim().slice(0, 200),
    degree: String(merged.degree || '').trim().slice(0, 200),
    skills,
    skillGoals,
    roadmapProgress,
    wellnessRoutine
  };
}

module.exports = { SKILL_LEVELS, normalizeSkillName, displaySkillName, normalizeLevel, normalizeSkills, normalizeSkillGoals, normalizeRoadmapProgress, preserveManualSkillsDuringResumeChange, removeResumeDerivedSkills, normalizeProfile };
