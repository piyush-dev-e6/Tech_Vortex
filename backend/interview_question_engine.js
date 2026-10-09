'use strict';

// Curated, deterministic question ontology. Add niches/topics here without
// changing the API or presentation layer. No external model is called.
const QUESTION_ONTOLOGY = [
  { niche: 'AI/ML Engineer', aliases: ['aiml', 'ai/ml', 'machine learning engineer', 'ai/ml solutions engineer'], topic: 'Machine Learning', category: 'Fundamentals', difficulty: 'Beginner', type: 'Technical', skills: ['machine learning', 'python'], question: 'What is the difference between supervised and unsupervised learning?', expectedConcepts: ['labeled data', 'unlabeled data', 'prediction', 'structure or clusters'], tradeoffs: [], idealAnswer: 'Supervised learning uses labeled examples to learn a mapping for prediction. Unsupervised learning uses unlabeled data to find structure such as clusters.' },
  { niche: 'AI/ML Engineer', aliases: ['aiml', 'ai/ml', 'machine learning engineer'], topic: 'Machine Learning', category: 'Conceptual', difficulty: 'Intermediate', type: 'Technical', skills: ['machine learning', 'model evaluation'], question: 'Why can a model have high training accuracy but much lower validation accuracy, and what would you investigate?', expectedConcepts: ['overfitting', 'generalization', 'training validation gap', 'regularization or more data'], tradeoffs: ['bias', 'variance'], idealAnswer: 'The gap suggests overfitting: the model fits training examples but generalizes poorly. Check leakage and split quality, then consider regularization, simpler models, more representative data, or augmentation.' },
  { niche: 'AI/ML Engineer', aliases: ['aiml', 'ai/ml', 'machine learning engineer'], topic: 'Deep Learning', category: 'Applied', difficulty: 'Advanced', type: 'Scenario Based', skills: ['deep learning', 'model evaluation'], question: 'A fraud detector misses costly fraud cases. How would you choose metrics and adjust the decision threshold?', expectedConcepts: ['recall', 'precision', 'false negatives', 'threshold', 'cost-sensitive evaluation'], tradeoffs: ['false positives', 'review capacity'], idealAnswer: 'Measure recall and precision alongside a cost-sensitive metric and confusion matrix. Lowering the threshold can catch more fraud (higher recall) but creates more false positives; select it against investigation capacity and business costs.' },
  { niche: 'AI/ML Engineer', aliases: ['aiml', 'ai/ml', 'machine learning engineer'], topic: 'Deep Learning', category: 'Conceptual', difficulty: 'Intermediate', type: 'Technical', skills: ['deep learning', 'pytorch'], question: 'What happens during backpropagation when a neural network learns?', expectedConcepts: ['loss function', 'chain rule', 'gradients', 'weights updated by optimizer'], tradeoffs: ['vanishing gradients', 'computational cost'], idealAnswer: 'The loss measures prediction error. Backpropagation applies the chain rule to compute gradients of that loss with respect to parameters; an optimizer uses those gradients to update weights.' },
  { niche: 'AI/ML Engineer', aliases: ['aiml', 'ai/ml', 'machine learning engineer'], topic: 'Model Deployment', category: 'System Design', difficulty: 'Advanced', type: 'Technical', skills: ['deployment', 'docker', 'api'], question: 'How would you serve a trained model behind an API while keeping predictions reproducible?', expectedConcepts: ['versioned model artifact', 'preprocessing consistency', 'input validation', 'monitoring', 'rollback'], tradeoffs: ['latency', 'throughput', 'model size'], idealAnswer: 'Version the model and preprocessing together, validate inputs, expose a bounded inference API, record model version and monitor latency and quality signals. Support rollback to a known artifact.' },
  { niche: 'Data Scientist', aliases: ['data', 'data analyst', 'data scientist', 'data intelligence specialist'], topic: 'Statistics', category: 'Fundamentals', difficulty: 'Beginner', type: 'Technical', skills: ['statistics', 'probability'], question: 'What does a confidence interval communicate, and what does it not mean?', expectedConcepts: ['interval procedure', 'repeated samples', 'coverage', 'not probability parameter lies in fixed interval'], tradeoffs: [], idealAnswer: 'A 95% confidence procedure produces intervals that cover the fixed parameter in about 95% of repeated samples under its assumptions. It is not a 95% probability statement about this already computed interval.' },
  { niche: 'Data Scientist', aliases: ['data', 'data analyst', 'data scientist'], topic: 'SQL', category: 'Problem Solving', difficulty: 'Intermediate', type: 'Technical', skills: ['sql', 'data analysis'], question: 'How would you find the latest order for each customer in SQL?', expectedConcepts: ['partition by customer', 'order by timestamp descending', 'row_number or rank', 'filter rank one'], tradeoffs: ['ties', 'indexing'], idealAnswer: 'Use ROW_NUMBER over a partition by customer ordered by order timestamp descending, then filter to row number one. Use RANK if tied latest orders should all be retained.' },
  { niche: 'Data Scientist', aliases: ['data', 'data analyst', 'data scientist'], topic: 'Experimentation', category: 'Applied', difficulty: 'Advanced', type: 'Scenario Based', skills: ['statistics', 'experimentation'], question: 'An A/B test shows a small lift. What checks do you make before recommending a rollout?', expectedConcepts: ['randomization', 'sample size or uncertainty', 'predefined metric', 'guardrail metrics', 'multiple testing or peeking'], tradeoffs: ['power', 'duration'], idealAnswer: 'Check assignment integrity, sample size and uncertainty, pre-specified primary and guardrail metrics, and whether repeated peeking or multiple comparisons affected inference. Weigh practical effect against rollout risk.' },
  { niche: 'Full Stack Developer', aliases: ['fullstack', 'full stack', 'full-stack architect', 'software engineer'], topic: 'React', category: 'Conceptual', difficulty: 'Intermediate', type: 'Technical', skills: ['react', 'javascript'], question: 'How does React decide what to update after state changes, and why should state updates be immutable?', expectedConcepts: ['render', 'reconciliation', 'element tree', 'identity or reference comparison', 'immutable update'], tradeoffs: ['render cost', 'memoization'], idealAnswer: 'A state update causes rendering and reconciliation of the element tree to determine necessary DOM changes. Immutable updates create new references so change detection and memoization can behave predictably.' },
  { niche: 'Full Stack Developer', aliases: ['fullstack', 'full stack', 'full-stack architect'], topic: 'APIs', category: 'Fundamentals', difficulty: 'Beginner', type: 'Technical', skills: ['rest api', 'http'], question: 'What makes an HTTP operation idempotent, and why is that useful for API clients?', expectedConcepts: ['same intended effect on repeated request', 'PUT or DELETE example', 'safe retries'], tradeoffs: ['side effects', 'request identity'], idealAnswer: 'An idempotent operation has the same intended server state after one or repeated identical requests. PUT is commonly idempotent, which allows clients to retry after a network failure more safely.' },
  { niche: 'Full Stack Developer', aliases: ['fullstack', 'full stack', 'full-stack architect'], topic: 'Backend', category: 'Debugging', difficulty: 'Advanced', type: 'Scenario Based', skills: ['node.js', 'api', 'database'], question: 'An API becomes slow only under concurrent load. How would you isolate whether the bottleneck is Node.js, the database, or an external dependency?', expectedConcepts: ['measure latency by stage', 'event loop or CPU', 'database query and pool metrics', 'tracing or correlation ids', 'load reproduction'], tradeoffs: ['instrumentation overhead', 'queueing'], idealAnswer: 'Reproduce with controlled load and correlate request traces with stage timings. Inspect event-loop delay and CPU, database query/pool wait, and dependency latency; change one bottleneck at a time and validate under load.' },
  { niche: 'Full Stack Developer', aliases: ['fullstack', 'full stack', 'full-stack architect'], topic: 'Databases', category: 'Trade-offs', difficulty: 'Intermediate', type: 'Technical', skills: ['sql', 'database'], question: 'When would you choose a relational database over a document database for an application?', expectedConcepts: ['relationships', 'constraints or transactions', 'query patterns', 'schema flexibility'], tradeoffs: ['consistency', 'flexibility', 'scale'], idealAnswer: 'Choose based on access patterns: relational systems suit related entities, constraints, joins, and transactions; document databases can suit aggregate-shaped data and flexible records. Validate operational and consistency requirements.' },
  { niche: 'DevOps / Cloud', aliases: ['devops', 'cloud', 'cloud & devops reliability engineer'], topic: 'Containers', category: 'Fundamentals', difficulty: 'Beginner', type: 'Technical', skills: ['docker', 'linux'], question: 'What problem does a container solve, and how is it different from a virtual machine?', expectedConcepts: ['package application and dependencies', 'shared host kernel', 'isolated processes', 'VM includes guest OS'], tradeoffs: ['isolation', 'resource overhead'], idealAnswer: 'A container packages an application and dependencies with process isolation while sharing the host kernel. A virtual machine includes a guest operating system and virtualized hardware, usually with more overhead and a stronger boundary.' },
  { niche: 'DevOps / Cloud', aliases: ['devops', 'cloud'], topic: 'Kubernetes', category: 'Applied', difficulty: 'Intermediate', type: 'Scenario Based', skills: ['kubernetes', 'containers'], question: 'A Kubernetes deployment is ready but users still see errors during rollout. What would you inspect?', expectedConcepts: ['readiness probe', 'service endpoints', 'old and new replicas', 'logs or events', 'rollback'], tradeoffs: ['availability', 'rollout speed'], idealAnswer: 'Check readiness probes and service endpoints, compare old/new replica health, inspect events and logs, and confirm rollout strategy. Pause or roll back if impact grows; readiness must reflect serving capability.' },
  { niche: 'DevOps / Cloud', aliases: ['devops', 'cloud'], topic: 'CI/CD', category: 'System Design', difficulty: 'Advanced', type: 'Technical', skills: ['ci/cd', 'cloud'], question: 'Design a safe deployment pipeline for a service that must be quickly reversible.', expectedConcepts: ['automated tests', 'immutable artifact', 'staged rollout', 'health checks', 'rollback strategy'], tradeoffs: ['deployment speed', 'blast radius'], idealAnswer: 'Build and test an immutable artifact once, deploy through staged environments or a canary, gate promotion on health signals, and retain the previous artifact for rollback. Limit rollout blast radius.' },
  { niche: 'Cybersecurity Analyst', aliases: ['cybersecurity', 'cyber defense', 'security'], topic: 'Network Security', category: 'Scenario Based', difficulty: 'Intermediate', type: 'Applied', skills: ['networking', 'security'], question: 'You observe repeated failed logins followed by one successful login from an unfamiliar location. How would you investigate and respond?', expectedConcepts: ['preserve logs and timeline', 'validate identity/session', 'contain account or revoke sessions', 'MFA or credential reset', 'scope related activity'], tradeoffs: ['containment impact', 'evidence preservation'], idealAnswer: 'Preserve authentication logs and build a timeline, verify the user through a trusted channel, revoke suspicious sessions and reset credentials, enforce MFA, and scope related access before closing the incident.' },
  { niche: 'Cybersecurity Analyst', aliases: ['cybersecurity', 'cyber defense', 'security'], topic: 'Web Security', category: 'Fundamentals', difficulty: 'Beginner', type: 'Technical', skills: ['web security', 'authentication'], question: 'What is the difference between authentication and authorization?', expectedConcepts: ['authentication verifies identity', 'authorization checks permissions', 'least privilege'], tradeoffs: [], idealAnswer: 'Authentication establishes who the user is; authorization decides what that identity may access. Authorization should follow least privilege and be checked on protected operations.' },
  { niche: 'General Software Engineering', aliases: ['viva', 'college project viva'], topic: 'Project Explanation', category: 'Project Based', difficulty: 'Beginner', type: 'Project', skills: [], question: 'Walk through the architecture of a project you have actually listed: {project}. What does each component do?', expectedConcepts: ['project components', 'data flow', 'design rationale', 'limitation or trade-off'], tradeoffs: ['complexity', 'maintainability'], idealAnswer: 'Explain only the components and technologies present in the listed project, describe how data flows between them, and identify a real design trade-off or limitation.' }
];

const clean = value => String(value || '').trim();
const normalize = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
function asArray(value) { return Array.isArray(value) ? value : value ? [value] : []; }
function candidateNiche(profile = {}, requested) {
  const target = normalize(requested || profile.targetCareer || profile.career || profile.targetRole || '');
  for (const item of QUESTION_ONTOLOGY) {
    if (normalize(item.niche) === target || item.aliases.some(alias => normalize(alias) === target || target.includes(normalize(alias)))) return item.niche;
  }
  const text = [...asArray(profile.skills), ...asArray(profile.interests)].map(normalize).join(' ');
  if (/kubernetes|docker|devops|aws|terraform|linux/.test(text)) return 'DevOps / Cloud';
  if (/react|javascript|node js|postgres|full stack/.test(text)) return 'Full Stack Developer';
  if (/statistics|tableau|sql|data analysis|data scientist/.test(text)) return 'Data Scientist';
  if (/security|cryptography|wireshark|networking/.test(text)) return 'Cybersecurity Analyst';
  if (/machine learning|pytorch|tensorflow|numpy|python/.test(text)) return 'AI/ML Engineer';
  return 'General Software Engineering';
}
function projectNames(profile) {
  const projects = asArray(profile.projects);
  return projects.map(p => typeof p === 'string' ? clean(p) : clean(p && (p.name || p.title || p.projectName || p.description))).filter(Boolean);
}
function gapSkills(profile = {}) {
  const gap = profile.skillGapAnalysis || profile.skillGap || {};
  const explicit = [...asArray(profile.criticalMissingSkills), ...asArray(profile.missingSkills), ...asArray(gap.criticalMissingSkills), ...asArray(gap.missingSkills)]
    .map(item => typeof item === 'string' ? item : item && (item.skill || item.name)).filter(Boolean);
  const possessed = new Set(asArray(profile.skills).map(item => normalize(typeof item === 'string' ? item : item && (item.canonical || item.name || item.skill))));
  const inferred = QUESTION_ONTOLOGY.flatMap(item => item.skills).filter(skill => !possessed.has(normalize(skill)));
  return [...new Set([...explicit, ...inferred])];
}
function formatQuestion(item, profile, idSuffix = '') {
  const projects = projectNames(profile);
  const project = projects[0];
  const question = item.question.includes('{project}') ? (project ? item.question.replace('{project}', `“${project}”`) : 'Describe a project you have actually built. What does each component do?') : item.question;
  const gap = profile.skillGapAnalysis || profile.skillGap || {};
  const gaps = [...asArray(profile.criticalMissingSkills), ...asArray(profile.missingSkills), ...asArray(gap.criticalMissingSkills), ...asArray(gap.missingSkills)].map(value => normalize(typeof value === 'string' ? value : value && (value.skill || value.name)));
  const matchedGap = item.skills.find(skill => gaps.includes(normalize(skill)));
  const possessed = new Set(asArray(profile.skills).map(value => normalize(typeof value === 'string' ? value : value && (value.canonical || value.name || value.skill))));
  const matchedSkill = item.skills.find(skill => possessed.has(normalize(skill)));
  const reason = item.type === 'Project' ? (project ? 'Selected because your profile includes this project.' : 'Builds project explanation and ownership skills.')
    : matchedGap ? `Targets the identified ${item.niche} skill gap: ${matchedGap}.`
      : matchedSkill ? `Checks the profile-listed skill ${matchedSkill} in a ${item.topic} context.`
        : `Checks ${item.topic} competency for the selected ${item.niche} niche.`;
  return { id: `${item.id || `${normalize(item.niche).replace(/\s/g, '-')}-${normalize(item.topic).replace(/\s/g, '-')}-${normalize(item.difficulty).replace(/\s/g, '-')}`}${idSuffix}`,
    niche: item.niche, topic: item.topic, category: item.category, difficulty: item.difficulty, type: item.type,
    question, expectedConcepts: [...item.expectedConcepts], tradeoffs: [...(item.tradeoffs || [])], idealAnswer: item.idealAnswer, skills: [...item.skills],
    reason, personalization: item.question.includes('{project}') && project ? `Uses profile-listed project: ${project}` : null };
}
function questionBank({ niche, topic, difficulty, type } = {}) {
  const target = normalize(niche || '');
  const nicheItem = QUESTION_ONTOLOGY.find(item => !target || normalize(item.niche) === target || item.aliases.some(a => normalize(a) === target));
  const items = QUESTION_ONTOLOGY.filter(item => !target || normalize(item.niche) === target || item.aliases.some(a => normalize(a) === target));
  if (nicheItem && (!type || type === 'All' || normalize(type) === 'behavioral') && (!topic || topic === 'Mixed' || normalize(topic) === 'behavioral')) {
    items.push({ id: `${normalize(nicheItem.niche).replace(/\s/g, '-')}-behavioral`, niche: nicheItem.niche, topic: 'Behavioral', category: 'Behavioral', difficulty: 'Beginner', type: 'Behavioral', skills: [],
      question: `Describe a real technical challenge you encountered in a project or coursework related to ${nicheItem.niche}. What was your role, what did you try, and what did you learn?`,
      expectedConcepts: ['specific situation or challenge', 'personal role or action', 'result or outcome', 'reflection or learning'], tradeoffs: ['alternatives', 'constraint'],
      idealAnswer: 'Use a real example. Set the context, explain your own actions and reasoning, state the outcome without inventing metrics, and mention what you learned.' });
  }
  return items.filter(item => (!target || normalize(item.niche) === target || item.aliases && item.aliases.some(a => normalize(a) === target))
    && (!topic || topic === 'Mixed' || normalize(item.topic) === normalize(topic))
    && (!difficulty || normalize(item.difficulty) === normalize(difficulty))
    && (!type || type === 'All' || normalize(item.type) === normalize(type)))
    .map(item => formatQuestion(item, {}));
}
function generateQuestions({ profile = {}, career, topic = 'Mixed', difficulty = 'Intermediate', count = 5, mode = 'viva', type } = {}) {
  const niche = candidateNiche(profile, career);
  const projects = projectNames(profile);
  const gaps = gapSkills(profile).map(normalize);
  let pool = QUESTION_ONTOLOGY.filter(item => item.niche === niche && (topic === 'Mixed' || normalize(item.topic) === normalize(topic)));
  if (mode === 'interview' && (topic === 'Mixed' || normalize(topic) === 'behavioral')) {
    pool.push({ id: `${normalize(niche).replace(/\s/g, '-')}-behavioral`, niche, topic: 'Behavioral', category: 'Behavioral', difficulty: 'Beginner', type: 'Behavioral', skills: [],
      question: `Describe a real technical challenge you encountered in a project or coursework related to ${niche}. What was your role, what did you try, and what did you learn?`,
      expectedConcepts: ['specific situation or challenge', 'personal role or action', 'result or outcome', 'reflection or learning'], tradeoffs: ['alternatives', 'constraint'],
      idealAnswer: 'Use a real example. Set the context, explain your own actions and reasoning, state the outcome without inventing metrics, and mention what you learned.' });
  }
  const education = clean(profile.degree || profile.education);
  if (education && mode === 'viva' && (topic === 'Mixed' || normalize(topic) === 'career context')) {
    pool.push({ id: `${normalize(niche).replace(/\s/g, '-')}-education-context`, niche, topic: 'Career Context', category: 'Applied', difficulty: 'Beginner', type: 'Technical', skills: [],
      question: `Your profile lists ${education}. Connect a concept from that coursework to ${niche} and explain one practical application.`,
      expectedConcepts: ['relevant coursework concept', 'connection to target role', 'practical application', 'reasoned explanation'], tradeoffs: [],
      idealAnswer: 'Choose a concept actually covered in your coursework, explain how it relates to the target role, and give a practical example without overstating experience.' });
  }
  if (projects.length && (topic === 'Mixed' || normalize(topic) === 'project explanation')) {
    const projectTemplate = QUESTION_ONTOLOGY.find(item => item.type === 'Project');
    if (projectTemplate) {
      const stem = `${normalize(niche).replace(/\s/g, '-')}-profile-project`;
      pool.push({ ...projectTemplate, niche, id: stem });
      pool.push({ ...projectTemplate, niche, id: `${stem}-validation`, category: 'Project Based', difficulty: 'Intermediate',
        question: 'How did you validate the result of the profile-listed project {project}, and what evidence would convince someone the result is reliable?',
        expectedConcepts: ['validation method', 'evidence or metric', 'limitations', 'reproducibility'] });
      pool.push({ ...projectTemplate, niche, id: `${stem}-tradeoff`, category: 'Trade-offs', difficulty: 'Advanced',
        question: 'For the profile-listed project {project}, describe one design decision, an alternative you considered, and the constraint that influenced your choice.',
        expectedConcepts: ['specific design decision', 'alternative', 'constraint', 'reasoned trade-off'], tradeoffs: ['alternative', 'constraint', 'trade-off'] });
      pool.push({ ...projectTemplate, niche, id: `${stem}-improvement`, category: 'Problem Solving', difficulty: 'Intermediate',
        question: 'What is one limitation of the profile-listed project {project}, and how would you test a proposed improvement?',
        expectedConcepts: ['specific limitation', 'proposed change', 'test or measurement', 'possible regression'] });
    }
  }
  if (mode === 'interview') pool = pool.filter(item => ['Technical', 'Scenario Based', 'Project'].includes(item.type) || ['Project Based', 'Problem Solving', 'System Design', 'Behavioral'].includes(item.category));
  if (type && type !== 'All') pool = pool.filter(item => normalize(item.type) === normalize(type));
  if (pool.length === 0 && topic !== 'Mixed') pool = QUESTION_ONTOLOGY.filter(item => item.niche === niche);
  // Prioritize gaps and actual project prompts, then rotate through deterministic variety.
  pool.sort((a, b) => {
    const score = item => (item.skills.some(s => gaps.includes(normalize(s))) ? 2 : 0) + (projects.length && item.type === 'Project' ? 1 : 0);
    return score(b) - score(a);
  });
  const experience = clean(profile.experienceLevel || profile.experience).toLowerCase();
  const profileDifficulty = /beginner|student|fresher|entry/.test(experience) ? 'Beginner' : /senior|advanced|experienced/.test(experience) ? 'Advanced' : 'Intermediate';
  const desired = ['Beginner', 'Intermediate', 'Advanced'].includes(difficulty) ? difficulty : profileDifficulty;
  const compatible = pool.filter(item => item.difficulty === desired);
  const rest = pool.filter(item => item.difficulty !== desired);
  pool = [...compatible, ...rest];
  pool.sort((a, b) => {
    const priority = item => (item.skills.some(s => gaps.includes(normalize(s))) ? 2 : 0) + (projects.length && item.type === 'Project' ? 3 : 0);
    return priority(b) - priority(a);
  });
  const max = Math.max(1, Math.min(15, Number(count) || 5));
  const selected = [];
  for (let i = 0; selected.length < max && i < max * 3; i++) {
    const item = pool[i % pool.length];
    if (!item) break;
    const variant = item.type === 'Project' && !projects.length ? null : item;
    if (variant) {
      const repeat = Math.floor(i / pool.length);
      const angles = ['Apply the idea in practice', 'Consider an edge case', 'Compare the trade-offs'];
      const variation = repeat > 0 ? { ...item, question: `${angles[(repeat - 1) % angles.length]}: ${item.question}` } : item;
      selected.push(formatQuestion(variation, profile, `-${selected.length + 1}`));
    }
  }
  if (selected.length === 0) selected.push(...pool.slice(0, 1).map(item => formatQuestion(item, profile)));
  if (mode === 'interview' && max >= 3 && !selected.some(item => item.type === 'Behavioral')) {
    const behavioral = pool.find(item => item.type === 'Behavioral');
    if (behavioral) selected[selected.length - 1] = formatQuestion(behavioral, profile, `-${selected.length}`);
  }
  return { niche, mode, questions: selected, method: 'Curated deterministic question ontology; questions are selected by career, topic, difficulty, profile-listed skill gaps, and available project details.' };
}
function generateFollowup({ question, evaluation = {}, profile = {}, career, difficulty = 'Intermediate', mode = 'interview' } = {}) {
  const weak = evaluation.evaluationStatus === 'uncertain' || Number(evaluation.score) < 65;
  const missing = asArray(evaluation.missingConcepts)[0];
  const niche = candidateNiche(profile, career || (question && question.niche));
  const nextDifficulty = weak ? (difficulty === 'Advanced' ? 'Intermediate' : 'Beginner') : (difficulty === 'Beginner' ? 'Intermediate' : 'Advanced');
  const topic = question && question.topic;
  const pool = QUESTION_ONTOLOGY.filter(item => item.niche === niche && (!topic || item.topic === topic) && item.difficulty === nextDifficulty && item.question !== (question && question.question));
  let item = pool[0] || QUESTION_ONTOLOGY.find(q => q.niche === niche && q.question !== (question && question.question)) || QUESTION_ONTOLOGY[0];
  if (weak && missing) {
    const follow = { ...item, category: 'Follow-up', question: `You did not cover ${missing} in your previous answer. In practical terms, how would you explain or apply it to ${topic || 'this topic'}?`, expectedConcepts: [missing, ...item.expectedConcepts.slice(0, 3)] };
    return { adaptive: true, reason: 'Previous response was weak or uncertain; the follow-up targets an uncovered rubric concept.', nextDifficulty, question: formatQuestion(follow, profile, '-followup') };
  }
  if (weak) item = { ...item, category: 'Follow-up', question: `Start with the core idea: ${item.question}` };
  return { adaptive: true, reason: weak ? 'Previous response was weak or uncertain; the next question revisits foundations.' : 'Previous response met the deterministic rubric threshold; the next question increases difficulty.', nextDifficulty, question: formatQuestion(item, profile, '-followup') };
}

module.exports = { QUESTION_ONTOLOGY, candidateNiche, generateQuestions, generateFollowup, questionBank };
