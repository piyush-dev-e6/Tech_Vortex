'use strict';

const assert = require('node:assert/strict');
process.env.PYTHON = process.env.PYTHON || 'python3';
const { app } = require('./server');
const catalogueLayer = app._router.stack.find(item => item.route?.path === '/api/roadmap/catalogue' && item.route.methods.get);
assert.ok(catalogueLayer, 'GET /api/roadmap/catalogue is registered');
const catalogueResponse = { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
catalogueLayer.route.stack.find(item => item.method === 'get').handle({}, catalogueResponse);
assert.equal(catalogueResponse.statusCode, 200);
assert.equal(catalogueResponse.body.tracks.length, 8);
assert.ok(catalogueResponse.body.skills.includes('python'));
assert.ok(catalogueResponse.body.skills.includes('docker'));
const layer = app._router.stack.find(item => item.route?.path === '/api/roadmap/skills' && item.route.methods.post);
assert.ok(layer, 'POST /api/roadmap/skills is registered');
const handler = layer.route.stack.find(item => item.method === 'post').handle;
function response() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(value) { this.body = value; return this; } };
}

(async () => {
  const careerOnly = response();
  await handler({ body: { profile: { targetCareer: 'ai-ml-engineer', skills: [] } } }, careerOnly);
  assert.equal(careerOnly.statusCode, 200);
  assert.equal(careerOnly.body.status, 'ready');
  assert.ok(careerOnly.body.learningRoadmap.phases.length);

  const jobOnly = response();
  await handler({ body: { profile: { skills: [], latestJobMatch: { summary: { title: 'CUDA Intern' }, requirements: [
    { canonical: 'cuda', display: 'CUDA', importance: 'high', status: 'not_found', evidence: 'CUDA kernel experience required' }
  ] } } } }, jobOnly);
  assert.equal(jobOnly.statusCode, 200);
  assert.equal(jobOnly.body.target, 'CUDA Intern');
  assert.ok(jobOnly.body.jobRequirements.some(item => item.canonicalName === 'cuda'));

  const empty = response();
  await handler({ body: { profile: { skills: [] } } }, empty);
  assert.equal(empty.statusCode, 200);
  assert.equal(empty.body.status, 'needs_goal');
  assert.ok(Array.isArray(empty.body.phases));

  process.stdout.write(JSON.stringify({ endpoint: '/api/roadmap/skills', careerOnly: careerOnly.body.status,
    jobOnly: jobOnly.body.status, emptyProfile: empty.body.status,
    stages: careerOnly.body.stages.length, itemFields: ['learning', 'practice', 'verification'].every(key => key in careerOnly.body.roadmapItems[0]) }) + '\n');
})().catch(error => { process.stderr.write(error.stack + '\n'); process.exitCode = 1; });
