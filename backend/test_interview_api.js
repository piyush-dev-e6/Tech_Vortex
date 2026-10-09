'use strict';

const assert = require('node:assert/strict');
const { app } = require('./server');

function invoke(method, routePath, req) {
  const layer = app._router.stack.find(entry => entry.route && entry.route.path === routePath && entry.route.methods[method.toLowerCase()]);
  assert.ok(layer, `${method} ${routePath} is registered`);
  const handler = layer.route.stack.find(entry => entry.method === method.toLowerCase()).handle;
  let status = 200;
  let body;
  const res = { status(value) { status = value; return this; }, json(value) { body = value; return this; } };
  handler({ body: {}, query: {}, ...req }, res);
  return { status, body };
}

const profile = { skills: ['Python', 'PyTorch', 'Machine Learning'], projects: [{ title: 'Plant Disease Detection using CNN' }] };
const generated = invoke('POST', '/api/interview/generate', { body: { profile, career: 'AI/ML Engineer', count: 5 } });
assert.equal(generated.status, 200);
assert.ok(generated.body.questions.some(item => item.niche === 'AI/ML Engineer'));
assert.ok(generated.body.questions.some(item => item.question.includes('Plant Disease Detection using CNN')));

const evaluationQuestion = generated.body.questions.find(item => item.type !== 'Project');
const evalResponse = invoke('POST', '/api/interview/evaluate', { body: { question: evaluationQuestion.question, answer: evaluationQuestion.expectedConcepts.join('. '), expectedConcepts: evaluationQuestion.expectedConcepts } });
assert.equal(evalResponse.status, 200);
assert.ok(Object.hasOwn(evalResponse.body, 'scoreOutOf10'));
assert.equal(evalResponse.body.evaluationStatus, 'evaluated');

const followup = invoke('POST', '/api/interview/followup', { body: { question: generated.body.questions[0], evaluation: { evaluationStatus: 'uncertain', missingConcepts: [] }, profile } });
assert.equal(followup.status, 200);
assert.ok(followup.body.adaptive && followup.body.question.question);

const bank = invoke('GET', '/api/interview/question-bank', { query: { niche: 'Full Stack Developer', topic: 'React', difficulty: 'Intermediate' } });
assert.equal(bank.status, 200);
assert.ok(bank.body.questions.length > 0 && bank.body.questions.every(item => item.topic === 'React'));
console.log(JSON.stringify({ generatedNiche: generated.body.niche, generatedCount: generated.body.questions.length, evaluationStatus: evalResponse.body.evaluationStatus, followupCategory: followup.body.question.category, bankQuestions: bank.body.total }, null, 2));
