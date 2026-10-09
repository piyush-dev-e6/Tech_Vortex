'use strict';

const assert = require('node:assert/strict');
const { evaluateAnswer, RUBRICS, WEIGHTS } = require('./interview_evaluator');

const questionId = 'transformer-attention';
const excellent = 'First, self-attention projects each token into query, key, and value vectors. It computes scaled dot products, applies softmax to get attention weights, then forms a weighted sum of values as context. Unlike sequential LSTMs, tokens are processed in parallel, though attention has O(n^2) cost and memory growth for long contexts.';
const mediocre = 'Self-attention makes query, key, and value vectors, then uses a dot product and softmax to get weights for the values. It builds context and can process tokens in parallel. Long inputs use more compute, though I am not sure of the exact complexity.';
const incorrect = 'Self-attention first applies softmax to the value vectors, then uses keys as the output without queries. LSTMs process all tokens in parallel, while Transformers must process tokens sequentially.';
const irrelevant = 'My favorite weekend activity is gardening. I plant tomatoes, water flowers, and enjoy spending time outside with friends.';

const a = evaluateAnswer({ questionId, answer: excellent });
const b = evaluateAnswer({ questionId, answer: mediocre });
const c = evaluateAnswer({ questionId, answer: incorrect });
const d = evaluateAnswer({ questionId, answer: 'Attention uses vectors.' });
const e = evaluateAnswer({ questionId, answer: irrelevant });

for (const field of ['scoreOutOf10', 'score', 'technicalCorrectness', 'conceptualDepth', 'relevance', 'clarity', 'structure', 'tradeoffs', 'strengths', 'missingConcepts', 'improvement', 'verdict']) {
  assert.ok(Object.hasOwn(a, field), `response must include ${field}`);
}
assert.equal(Object.keys(RUBRICS).length, 11, 'every bank question must have a rubric');
assert.equal(Object.values(WEIGHTS).reduce((x, y) => x + y, 0), 1, 'dimension weights must sum to 1');
assert.equal(a.evaluationStatus, 'evaluated');
assert.equal(a.scoreOutOf10, Number((a.score / 10).toFixed(1)));
assert.ok(a.score > b.score, `excellent (${a.score}) should exceed mediocre (${b.score})`);
assert.ok(a.tradeoffs > b.tradeoffs, 'trade-off awareness should be detected');
assert.equal(c.evaluationStatus, 'evaluated', 'a related but incorrect answer should be scoreable');
assert.ok(c.score < a.score, `incorrect (${c.score}) should score below excellent (${a.score})`);
assert.ok(c.score < b.score, `incorrect (${c.score}) should score below mediocre (${b.score})`);
assert.ok(c.technicalCorrectness < b.technicalCorrectness, 'explicitly wrong claims should lower technical correctness');
assert.equal(d.evaluationStatus, 'uncertain', 'extremely short answers must not receive a precise score');
assert.equal(d.score, null);
assert.equal(e.evaluationStatus, 'uncertain', 'irrelevant answers should be reported as uncertain');
assert.equal(e.scoreOutOf10, null);
assert.equal(e.matchedKeywords.length, 0);

const totalFromDimensions = Math.round(a.technicalCorrectness * .30 + a.conceptualDepth * .20 + a.relevance * .15 + a.clarity * .15 + a.structure * .10 + a.tradeoffs * .10);
assert.equal(a.score, totalFromDimensions, 'overall score must use the declared weighted dimensions');
console.log(JSON.stringify({ excellent: a.scoreOutOf10, mediocre: b.scoreOutOf10, incorrect: c.scoreOutOf10, short: d.evaluationStatus, irrelevant: e.evaluationStatus }, null, 2));
