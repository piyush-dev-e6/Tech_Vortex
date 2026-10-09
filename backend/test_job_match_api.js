'use strict';

const assert = require('node:assert/strict');
process.env.PYTHON = process.env.PYTHON || 'python3';
const { app } = require('./server');

function findHandler(method, route) {
  const layer = app._router.stack.find(item => item.route && item.route.path === route && item.route.methods[method]);
  assert.ok(layer, `${method.toUpperCase()} ${route} is registered`);
  return layer.route.stack.find(item => item.method === method).handle;
}
function response() {
  return {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; }
  };
}

(async () => {
  const result = response();
  await findHandler('post', '/api/job-match/analyze')({ body: {
    profile: { skills: [{ canonical: 'python', level: 'advanced', confirmed: true }, { canonical: 'pytorch', confirmed: false }], skillGoals: [{ canonical: 'docker', currentLevel: 'beginner' }] },
    jobDescription: 'Machine Learning Intern\nRequired: Python and PyTorch. Docker preferred.', jobTitle: 'ML Engineer', company: 'ExampleCo'
  } }, result);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.requirementCount, 4);
  assert.deepEqual(result.body.job, { title: 'ML Engineer', company: 'ExampleCo' });
  assert.equal(result.body.skillsYouHave[0].canonical, 'python');
  assert.equal(result.body.notFoundSkills.some(item => item.canonical === 'pytorch'), true);
  assert.equal(result.body.notFoundSkills.some(item => item.canonical === 'docker'), true);

  const invalid = response();
  await findHandler('post', '/api/job-match/analyze')({ body: { profile: {}, jobDescription: 'too short' } }, invalid);
  assert.equal(invalid.statusCode, 400);
  const roadmap = response();
  await findHandler('post', '/api/roadmap/skills')({ body: { profile: { skillGoals: [{ canonical: 'pytorch', currentLevel: 'beginner', targetLevel: 'intermediate' }] } } }, roadmap);
  assert.equal(roadmap.statusCode, 200);
  const ordered = roadmap.body.phases.flatMap(phase => phase.skills.map(skill => skill.skill));
  assert.ok(ordered.indexOf('Python') < ordered.indexOf('PyTorch'));
  process.stdout.write(JSON.stringify({ endpoint: '/api/job-match/analyze', status: result.statusCode, requirements: result.body.requirementCount, confirmedProfileSkillsUsed: result.body.matchedCount, validationStatus: invalid.statusCode, skillGoalRoadmap: ordered }) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
