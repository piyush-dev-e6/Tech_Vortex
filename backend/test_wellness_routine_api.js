'use strict';

const assert = require('node:assert/strict');
process.env.PYTHON = process.env.PYTHON || 'python3';
const { app } = require('./server');
const layer = app._router.stack.find(item => item.route?.path === '/api/wellness/routine/plan' && item.route.methods.post);
assert.ok(layer, 'POST /api/wellness/routine/plan is registered');
const plannerIndex = app._router.stack.indexOf(layer);
const notFoundIndex = app._router.stack.findIndex(item => !item.route && String(item.handle).includes('API endpoint not found.'));
assert.ok(notFoundIndex > plannerIndex, 'Wellness planner is registered before the API 404 middleware');
const handler = layer.route.stack.find(item => item.method === 'post').handle;
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } });

(async () => {
  const routine = { preferences: { availableMinutes: 60, preferredDays: [1, 2, 3, 4, 5, 6, 0], sourceMode: 'job' }, manualTasks: [], sessionStates: {} };
  const job = response();
  await handler({ body: { mode: 'job', asOfDate: '2026-10-12', profile: {
    skills: [{ canonical: 'python', level: 'intermediate', confirmed: true }],
    latestJobMatch: { summary: { title: 'ML Engineer' }, requirements: [
      { canonical: 'python', display: 'Python', status: 'matched', importance: 'high' },
      { canonical: 'pytorch', display: 'PyTorch', status: 'missing', importance: 'critical', priority: 'critical' }
    ] }, wellnessRoutine: routine
  } } }, job);
  assert.equal(job.statusCode, 200);
  assert.equal(job.body.mode, 'job');
  const jobTasks = [...job.body.todayTasks, ...job.body.upcomingTasks];
  assert.ok(jobTasks.some(task => task.canonicalSkill === 'pytorch' && task.source === 'job-gap'));
  assert.ok(!jobTasks.some(task => task.canonicalSkill === 'python'));

  const skill = response();
  await handler({ body: { mode: 'skill', selectedSkill: 'python', asOfDate: '2026-10-12', profile: {
    skills: [], skillGoals: [{ canonical: 'python', currentLevel: 'beginner', targetLevel: 'intermediate', priority: 'high' }], wellnessRoutine: routine
  } } }, skill);
  assert.equal(skill.statusCode, 200);
  assert.equal(skill.body.mode, 'skill');
  const skillTasks = [...skill.body.todayTasks, ...skill.body.upcomingTasks];
  assert.ok(skillTasks.length > 0);
  assert.ok(skillTasks.every(task => task.source === 'skill-goal' || task.source === 'prerequisite'));

  const manualOnly = response();
  await handler({ body: { mode: 'none', asOfDate: '2026-10-12', profile: { skills: [], wellnessRoutine: {
    ...routine, manualTasks: [{ id: 'manual:solo', title: 'Personal study', category: 'Study', date: '2026-10-12', durationMinutes: 30, status: 'upcoming' }]
  } } } }, manualOnly);
  assert.equal(manualOnly.statusCode, 200);
  assert.equal(manualOnly.body.status, 'needs_goal');
  assert.equal(manualOnly.body.manualTasks[0].id, 'manual:solo');

  const invalid = response();
  await handler({ body: { mode: 'other', profile: { skills: [] } } }, invalid);
  assert.equal(invalid.statusCode, 400);

  process.stdout.write(JSON.stringify({ endpoint: '/api/wellness/routine/plan', jobGap: true, independentSkillGoal: true, manualOnly: true, validation: true }) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
