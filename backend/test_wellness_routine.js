'use strict';

const assert = require('node:assert/strict');
const { buildRoutinePlan, normalizeWellnessRoutine } = require('./wellness_routine');

assert.deepEqual(normalizeWellnessRoutine().preferences.preferredDays, [1, 2, 3, 4, 5]);
assert.throws(() => normalizeWellnessRoutine({ preferences: { availableMinutes: 5 } }), /Daily availability/);
assert.throws(() => normalizeWellnessRoutine({ preferences: { startTime: '25:00' } }), /24-hour/);
assert.throws(() => normalizeWellnessRoutine({ preferences: { preferredDays: [] } }), /at least one/);
assert.throws(() => normalizeWellnessRoutine({ manualTasks: [{ id: 'bad', title: 'x', date: '2026-02-30' }] }), /valid YYYY-MM-DD/);

const roadmap = {
  status: 'ready', target: 'QA Automation Engineer',
  skillGapAnalysis: { readinessScore: 42, recommendedSkills: ['Docker', 'Python'] },
  roadmapItems: [
    { id: 'job-docker', skill: 'Docker', canonicalSkill: 'docker', stage: 1, sources: ['job'], priority: 'critical', priorityScore: 10, importance: 'high', currentStatus: 'missing', reason: 'Required in job', learning: { status: 'not_started', guidance: 'Study Docker' }, practice: { status: 'not_started', task: 'Build an image' }, verification: { status: 'not_started', task: 'Run a health check' } },
    { id: 'duplicate-docker', skill: 'Docker', canonicalSkill: 'Docker', stage: 2, sources: ['career'], priority: 'medium', priorityScore: 4, importance: 'medium', currentStatus: 'missing', learning: { status: 'not_started' }, practice: { status: 'not_started' }, verification: { status: 'not_started' } },
    { id: 'job-python', skill: 'Python', canonicalSkill: 'python', stage: 1, sources: ['job'], priority: 'high', priorityScore: 7, importance: 'high', currentStatus: 'developing', reason: 'Proficiency gap', learning: { status: 'completed', guidance: 'Review advanced Python' }, practice: { status: 'not_started', task: 'Implement a script' }, verification: { status: 'not_started', task: 'Pass checks' } }
  ]
};
const manualTask = { id: 'manual:review', title: 'Review notes', date: '2026-10-12', startTime: '18:00', durationMinutes: 10, status: 'upcoming' };
const plan = buildRoutinePlan(roadmap, {
  preferences: { availableMinutes: 60, startTime: '18:00', preferredDays: [1], sessionMinutes: 25, breakMinutes: 10, includeManualTasks: true },
  manualTasks: [manualTask], sessionStates: {}
}, { mode: 'job', asOfDate: '2026-10-12' });

assert.equal(plan.target, 'QA Automation Engineer');
assert.equal(plan.readinessScore, 42);
assert.deepEqual(plan.todayTasks.map(task => task.canonicalSkill), ['docker']);
assert.equal(plan.todayTasks[0].source, 'job-gap');
assert.equal(plan.todayTasks[0].date, '2026-10-12');
assert.equal(plan.todayTasks[0].time, '18:10');
assert.equal(plan.todayTasks[0].durationIsEstimate, true);
assert.equal(plan.todayTasks[0].activity, 'learning');
assert.equal(plan.upcomingTasks[0].canonicalSkill, 'python');
assert.equal(plan.upcomingTasks[0].activity, 'practice');
assert.equal(new Set([...plan.todayTasks, ...plan.upcomingTasks].map(task => task.id)).size, plan.taskCount);
assert.ok(Object.keys(plan.sessionStates).length >= plan.taskCount);

const completed = buildRoutinePlan(roadmap, {
  preferences: { availableMinutes: 90, preferredDays: [1, 2, 3, 4, 5] },
  manualTasks: [manualTask],
  sessionStates: { [plan.todayTasks[0].id]: { status: 'completed', title: plan.todayTasks[0].title, completedAt: '2026-10-12T18:30:00.000Z' } }
}, { mode: 'job', asOfDate: '2026-10-12' });
assert.ok(completed.sessionHistory.some(task => task.id === plan.todayTasks[0].id && task.status === 'completed'));
assert.ok(!completed.todayTasks.some(task => task.id === plan.todayTasks[0].id));

const noTarget = buildRoutinePlan({ status: 'needs_goal', roadmapItems: [] }, {}, { mode: 'none', asOfDate: '2026-10-12' });
assert.equal(noTarget.taskCount, 0);
assert.equal(noTarget.nextTask, null);

process.stdout.write(JSON.stringify({ validation: true, jobGapsScheduled: true, canonicalDeduplication: true, availabilityRespected: true, progressPreserved: true, manualTasksPreserved: true }) + '\n');
