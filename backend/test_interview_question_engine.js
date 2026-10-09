'use strict';

const assert = require('node:assert/strict');
const { generateQuestions, generateFollowup, questionBank, candidateNiche } = require('./interview_question_engine');
const { evaluateAnswer } = require('./interview_evaluator');

const profiles = [
  { name: 'ML profile', skills: ['Python', 'NumPy', 'PyTorch', 'Machine Learning', 'CNN'] },
  { name: 'Full stack profile', skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'REST APIs'] },
  { name: 'DevOps profile', skills: ['Linux', 'Docker', 'AWS', 'CI/CD', 'Kubernetes'] }
];
const ai = generateQuestions({ profile: profiles[0], career: 'AI/ML Engineer', count: 5 });
const web = generateQuestions({ profile: profiles[1], career: 'Full Stack Developer', count: 5 });
const cloud = generateQuestions({ profile: profiles[2], career: 'DevOps / Cloud', count: 5 });
assert.equal(candidateNiche(profiles[0]), 'AI/ML Engineer');
assert.equal(candidateNiche(profiles[1]), 'Full Stack Developer');
assert.equal(candidateNiche(profiles[2]), 'DevOps / Cloud');
assert.ok(ai.questions.every(q => q.niche === 'AI/ML Engineer'));
assert.ok(web.questions.every(q => q.niche === 'Full Stack Developer'));
assert.ok(cloud.questions.every(q => q.niche === 'DevOps / Cloud'));
assert.ok(ai.questions.some(q => /model|learning|neural|fraud/i.test(q.question)));
assert.ok(web.questions.some(q => /React|HTTP|API|database|Node/i.test(q.question)));
assert.ok(cloud.questions.some(q => /Kubernetes|container|deployment|pipeline/i.test(q.question)));

const projectProfile = { skills: ['Python', 'PyTorch'], projects: [{ title: 'Plant Disease Detection using CNN' }] };
const projectSet = generateQuestions({ profile: projectProfile, career: 'AI/ML Engineer', count: 5 });
assert.ok(projectSet.questions.some(q => q.type === 'Project' && q.question.includes('Plant Disease Detection using CNN')));

const gapProfile = { skills: ['Python'], criticalMissingSkills: ['Docker'] };
const gapSet = generateQuestions({ profile: gapProfile, career: 'AI/ML Engineer', count: 5 });
assert.ok(gapSet.questions.length > 0, 'questions should still be generated from a sparse profile');
assert.ok(gapSet.questions.some(q => q.skills.includes('docker')), 'explicitly missing skills should prioritize related questions');
const interviewSet = generateQuestions({ profile: profiles[0], career: 'AI/ML Engineer', mode: 'interview', count: 5 });
assert.ok(interviewSet.questions.some(q => q.category === 'Behavioral'));
const strongAnswer = 'Supervised learning uses labeled data to learn a mapping for prediction, while unsupervised learning uses unlabeled data to find structure or clusters. The choice depends on labels and the task.';
const generatedQuestion = ai.questions.find(q => q.topic === 'Machine Learning' && q.difficulty === 'Beginner');
const strongEvaluation = evaluateAnswer({ question: generatedQuestion.question, expectedConcepts: generatedQuestion.expectedConcepts, tradeoffs: generatedQuestion.tradeoffs, answer: strongAnswer });
const weakEvaluation = evaluateAnswer({ question: generatedQuestion.question, expectedConcepts: generatedQuestion.expectedConcepts, tradeoffs: generatedQuestion.tradeoffs, answer: 'I am not sure.' });
const strongFollowup = generateFollowup({ question: generatedQuestion, evaluation: strongEvaluation, profile: profiles[0], career: 'AI/ML Engineer', difficulty: 'Beginner' });
const weakFollowup = generateFollowup({ question: generatedQuestion, evaluation: weakEvaluation, profile: profiles[0], career: 'AI/ML Engineer', difficulty: 'Beginner' });
assert.equal(strongFollowup.nextDifficulty, 'Intermediate');
assert.equal(weakFollowup.nextDifficulty, 'Beginner');
assert.ok(weakFollowup.question.category === 'Follow-up');
assert.ok(questionBank({ niche: 'AI/ML Engineer', topic: 'Deep Learning', difficulty: 'Intermediate' }).length > 0);
assert.ok(gapSet.method.includes('deterministic'));
console.log(JSON.stringify({ niches: [ai.niche, web.niche, cloud.niche], personalizedProject: projectSet.questions.find(q => q.type === 'Project').question, strongNextDifficulty: strongFollowup.nextDifficulty, weakNextDifficulty: weakFollowup.nextDifficulty }, null, 2));
