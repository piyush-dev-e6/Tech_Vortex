'use strict';

const assert = require('node:assert/strict');
const {
  normalizeProfile,
  normalizeSkillName,
  normalizeSkills,
  preserveManualSkillsDuringResumeChange,
  removeResumeDerivedSkills
} = require('./profile_normalizer');

for (const source of ['Python', 'python', 'Python 3', 'Python programming', 'py']) {
  assert.equal(normalizeSkillName(source), 'python');
}
assert.equal(normalizeSkillName('Torch'), 'pytorch');

const duplicates = normalizeSkills([
  { name: 'Python', source: 'manual', level: 'intermediate', confidence: 1 },
  { name: 'python3', source: 'resume', level: 'familiar', confidence: 0.94, evidence: 'Used Python 3' },
  { name: 'Python programming', source: 'manual', level: 'strong' }
]);
assert.equal(duplicates.length, 1);
assert.equal(duplicates[0].canonical, 'python');
assert.equal(duplicates[0].canonicalName, 'Python');
assert.deepEqual(duplicates[0].sources.sort(), ['manual', 'resume']);
assert.equal(duplicates[0].level, 'intermediate');
assert.match(duplicates[0].evidence, /Used Python 3/);
const evidenceSkill = normalizeSkills([{ name: 'PyTorch', source: 'resume', confirmed: true, evidenceItems: [{ section: 'projects', text: 'Built a model in PyTorch', location: { line: 4, sectionLine: 1 } }] }])[0];
assert.deepEqual(evidenceSkill.evidenceItems[0], { section: 'projects', text: 'Built a model in PyTorch', location: { line: 4, sectionLine: 1 } });
assert.deepEqual(normalizeSkills([{ name: 'Unreviewed Candidate', source: 'resume', confirmed: false }]), []);

const current = [
  { canonical: 'cuda', source: 'manual', level: 'beginner', confirmed: true },
  { canonical: 'pytorch', source: 'resume', level: 'familiar', confirmed: true },
  { canonical: 'python', source: 'manual', sources: ['manual', 'resume'], level: 'intermediate', evidence: 'Old resume evidence', confirmed: true }
];
const replaced = preserveManualSkillsDuringResumeChange(current, [
  { canonical: 'python', source: 'resume', level: 'familiar', evidence: 'New resume evidence', confirmed: true },
  { canonical: 'docker', source: 'resume', level: 'familiar', confirmed: true }
]);
assert.deepEqual(replaced.map(skill => skill.canonical).sort(), ['cuda', 'docker', 'python', 'pytorch']);
assert.deepEqual(replaced.find(skill => skill.canonical === 'python').sources.sort(), ['manual', 'resume']);
assert.equal(replaced.find(skill => skill.canonical === 'cuda').source, 'manual');
assert.deepEqual(removeResumeDerivedSkills(replaced).map(skill => skill.canonical).sort(), ['cuda', 'docker', 'python', 'pytorch']);
assert.deepEqual(preserveManualSkillsDuringResumeChange(current, [{ canonical: 'docker', source: 'resume' }], ['cuda']).map(skill => skill.canonical).sort(), ['docker', 'python', 'pytorch']);

const profile = normalizeProfile({
  id: 'profile-test', personal: { name: 'Candidate' },
  education: { degree: 'BSc Computer Science', cgpa: '8.2', graduationYear: 2028 },
  careerGoal: { role: 'ai-ml-engineer' },
  skills: [{ name: 'React.js', level: 'expert-ish', source: 'manual' }],
  skillGoals: [{ skill: 'K8s', currentLevel: 'basic', desiredLevel: 'intermediate' }],
  roadmapProgress: { 'roadmap:test:cuda': { learningStatus: 'completed', practiceStatus: 'completed', verificationStatus: 'completed' } }
});
assert.equal(profile.name, 'Candidate');
assert.equal(profile.cgpa, 8.2);
assert.equal(profile.gradYear, '2028');
assert.equal(profile.targetCareer, 'ai-ml-engineer');
assert.equal(profile.skills[0].canonical, 'react');
assert.equal(profile.skillGoals[0].canonical, 'kubernetes');
assert.equal(profile.roadmapProgress['roadmap:test:cuda'].verificationStatus, 'completed');
assert.deepEqual(profile.wellnessRoutine.preferences.preferredDays, [1, 2, 3, 4, 5]);
assert.throws(() => normalizeProfile({ wellnessRoutine: { preferences: { availableMinutes: 5 } } }), /Daily availability/);
assert.throws(() => normalizeProfile({ wellnessRoutine: { manualTasks: [{ id: 'bad', title: 'Bad date', date: '2026-02-30' }] } }), /valid YYYY-MM-DD/);
const normalizedRoutine = normalizeProfile({ wellnessRoutine: { preferences: { sourceMode: 'skill', selectedSkill: 'PY', availableMinutes: 60 }, manualTasks: [{ id: 'manual:test', title: 'Study', date: '2026-10-12', durationMinutes: 30 }] } }).wellnessRoutine;
assert.equal(normalizedRoutine.preferences.selectedSkill, 'py');
assert.equal(normalizedRoutine.manualTasks[0].status, 'upcoming');
const orderedProgress = normalizeProfile({ roadmapProgress: { item: { learningStatus: 'not_started', practiceStatus: 'completed', verificationStatus: 'completed' } } }).roadmapProgress.item;
assert.equal(orderedProgress.practiceStatus, 'not_started');
assert.equal(orderedProgress.verificationStatus, 'not_started');
assert.throws(() => normalizeProfile({ roadmapProgress: [] }), /Roadmap progress must be an object/);
assert.throws(() => normalizeProfile({ id: 'bad', cgpa: 10.1 }), /CGPA/);
assert.throws(() => normalizeProfile({ id: 'bad', email: 'not-an-email' }), /email/);
assert.throws(() => normalizeProfile({ id: 'bad', skills: [{ name: 'Python', level: 'guru' }] }), /proficiency/);

process.stdout.write(JSON.stringify({ aliases: true, mergeAndDeduplicate: true, resumeReplacePreservesManual: true, validation: true }) + '\n');
