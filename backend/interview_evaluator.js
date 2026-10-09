'use strict';

// Transparent deterministic rubric. Alias groups represent evidence for a concept,
// not semantic understanding; this evaluator never calls an LLM.
const RUBRICS = {
  'transformer-attention': { contradictions: [/softmax (?:is applied )?to (?:the )?value vectors?/, /lstms? (?:process|run|operate) (?:all )?tokens in parallel/, /transformers? (?:process|run) tokens sequentially/], concepts: [
    ['Q/K/V projections', ['query key value', 'q k v', 'queries keys values']],
    ['Scaled dot-product attention', ['softmax', 'dot product', 'attention weights']],
    ['Value aggregation/context', ['weighted sum', 'value vectors', 'context representation']],
    ['Parallel token processing', ['parallel', 'in parallel', 'concurrent']],
    ['Sequence-length cost', ['o(n^2)', 'quadratic', 'n squared']],
    ['Recurrent limitation comparison', ['lstm', 'recurrent', 'vanishing gradient', 'sequential']],
    ['Scaling or positional limitation', ['long context', 'positional encoding', 'memory cost']]
  ], tradeoffs: ['quadratic', 'o(n^2)', 'memory cost', 'vanishing gradient', 'sequential'] },
  'rag-hallucinations': { concepts: [
    ['Retrieval grounds generation', ['retrieve', 'retrieval', 'ground']], ['Document chunking', ['chunk', 'chunking']],
    ['Embedding/vector search', ['embedding', 'vector search', 'vector database']], ['Re-ranking/relevance', ['rerank', 're-ranking', 'cross-encoder']],
    ['Hybrid lexical and dense retrieval', ['bm25', 'hybrid search', 'keyword search']], ['Grounding/abstention checks', ['cite', 'citation', 'abstain', 'grounding', 'hallucination']]
  ], tradeoffs: ['latency', 'precision', 'recall', 'chunk size', 'stale', 'cost'] },
  'inference-latency': { concepts: [
    ['Quantization', ['quantization', 'int8', 'int4', 'fp16']], ['Optimized runtime', ['onnx', 'tensorrt', 'runtime']],
    ['Batching', ['batching', 'batch']], ['Caching/KV cache', ['kv cache', 'caching', 'cache']],
    ['Pruning or distillation', ['pruning', 'distillation']], ['Hardware/profiling awareness', ['gpu', 'profil', 'latency measurement']]
  ], tradeoffs: ['accuracy', 'quality', 'memory', 'throughput', 'latency', 'batching'] },
  'react-concurrent-rsc': { concepts: [
    ['Interruptible/prioritized rendering', ['interruptible', 'priority', 'prioritize', 'concurrent rendering']],
    ['Scheduling/Fiber', ['fiber', 'scheduler', 'scheduling']], ['Suspense/transitions', ['suspense', 'transition']],
    ['Server component execution boundary', ['server component', 'server-side component']],
    ['Client bundle/hydration effect', ['bundle', 'hydration', 'javascript sent to the client']],
    ['State and client interaction constraints', ['state', 'event handler', 'client component']]
  ], tradeoffs: ['hydration', 'bundle', 'state', 'serialization', 'server component'] },
  'node-event-loop': { concepts: [
    ['Single-threaded JavaScript execution', ['single thread', 'single-threaded', 'main thread']], ['libuv/event loop', ['libuv', 'event loop']],
    ['Loop phases or timers/poll/check', ['timers', 'poll phase', 'check phase', 'setimmediate']],
    ['Microtask queue distinction', ['microtask', 'promise callback', 'nexttick']],
    ['Blocking CPU work mitigation', ['worker thread', 'worker threads', 'offload', 'non-blocking']]
  ], tradeoffs: ['starvation', 'blocking', 'worker thread', 'thread pool', 'microtask'] },
  'database-throughput': { concepts: [
    ['Connection pooling', ['connection pool', 'pooling', 'pgbouncer']], ['Index/query design', ['index', 'indexing', 'query plan']],
    ['ACID/transactions/isolation', ['acid', 'transaction', 'isolation']], ['Read scaling', ['read replica', 'replica']],
    ['Write contention/locking', ['locking', 'row lock', 'contention']], ['Capacity/backpressure', ['backpressure', 'connection limit', 'queue']]
  ], tradeoffs: ['consistency', 'isolation', 'locking', 'replica lag', 'pool size', 'write'] },
  'project-architecture': { concepts: [
    ['Frontend responsibility', ['react', 'frontend', 'user interface']], ['API/backend responsibility', ['node', 'express', 'rest api', 'backend']],
    ['Python/ML responsibility', ['python', 'machine learning', 'ml']], ['Clear service boundary/data flow', ['separation', 'decoupl', 'api boundary', 'data flow']],
    ['Concrete project-specific reason', ['because', 'so that', 'allow', 'trade-off', 'tradeoff']]
  ], tradeoffs: ['complexity', 'latency', 'deployment', 'operational', 'trade-off', 'tradeoff'] },
  'concurrent-students': { concepts: [
    ['Load balancing/horizontal scaling', ['load balancer', 'horizontal scaling', 'scale out']], ['Caching', ['cache', 'redis']],
    ['Admission control/rate limiting', ['rate limit', 'throttl', 'backpressure']], ['Async queue', ['queue', 'asynchronous', 'message broker']],
    ['Failure handling', ['circuit breaker', 'retry', 'graceful degradation', 'timeout']], ['Database capacity', ['connection pool', 'database', 'replica']]
  ], tradeoffs: ['cost', 'bottleneck', 'cache invalidation', 'queue', 'consistency', 'failure'] },
  'model-limitations': { concepts: [
    ['Cold start/sparse profile', ['cold start', 'sparse', 'no skills', 'limited data']], ['Bias/coverage limitation', ['bias', 'mainstream', 'underrepresented']],
    ['Taxonomy/data drift', ['taxonomy', 'drift', 'emerging role', 'outdated data']], ['Concrete edge case', ['edge case', 'duplicate', 'missing', 'unknown']],
    ['Mitigation/fallback', ['fallback', 'mitigat', 'manual review', 'validation']]
  ], tradeoffs: ['coverage', 'bias', 'fallback', 'precision', 'recall', 'data'] },
  'sql-window-functions': { concepts: [
    ['ROW_NUMBER uniqueness', ['row_number', 'row number']], ['RANK tie gaps', ['rank', 'gaps']], ['DENSE_RANK no gaps', ['dense_rank', 'dense rank', 'no gaps']],
    ['OVER/PARTITION ordering', ['over', 'partition by', 'order by']], ['Plan inspection', ['explain analyze', 'execution plan']],
    ['Indexes/partitioning', ['index', 'partitioning', 'partition table']]
  ], tradeoffs: ['sort', 'index', 'partition', 'scan', 'memory'] },
  'kubernetes-rollout': { concepts: [
    ['Scheduler/resource requests', ['scheduler', 'resource request', 'kube-scheduler']], ['ReplicaSet replacement', ['replicaset', 'replica set']],
    ['Readiness before traffic', ['readiness probe', 'readiness', 'ready before']], ['Rolling update surge/unavailable', ['maxsurge', 'maxunavailable', 'rolling update']],
    ['Graceful termination/traffic routing', ['graceful', 'termination', 'service routes', 'traffic']]
  ], tradeoffs: ['availability', 'capacity', 'surge', 'rollback', 'resource'] }
};

const QUESTION_ALIASES = {
  'Explain how Self-Attention in Transformer models works mathematically, and why it outperforms recurrent LSTM architectures.': 'transformer-attention',
  'What is Retrieval-Augmented Generation (RAG)? How do you prevent hallucinations in vector search?': 'rag-hallucinations',
  'What techniques do you use to optimize large neural network inference latency for production APIs?': 'inference-latency',
  'Explain how React 18/19 Concurrent Rendering and Server Components (RSC) alter browser performance and state lifecycles.': 'react-concurrent-rsc',
  'How does the Node.js Event Loop manage microtasks vs macrotasks, and how do you prevent blocking the main thread?': 'node-event-loop',
  'How do you design a high-throughput relational database schema with ACID guarantees and zero connection exhaustion under 50,000 requests/minute?': 'database-throughput',
  'Why did you choose React + Node.js + Python for your college project instead of a simple monolithic framework like Django or PHP?': 'project-architecture',
  'If 100,000 concurrent students access your career recommendation engine at the same second, what happens to your system and how do you safeguard it?': 'concurrent-students',
  'What are the core technical limitations and edge cases of your current machine learning model or database schema?': 'model-limitations',
  'Explain SQL Window Functions (ROW_NUMBER vs RANK vs DENSE_RANK) and how you optimize slow analytical queries on 10 million rows.': 'sql-window-functions',
  'Explain Kubernetes Pod scheduling, ReplicaSets, and how to execute a zero-downtime rolling update deployment in production.': 'kubernetes-rollout'
};

const WEIGHTS = { technicalCorrectness: 0.30, conceptualDepth: 0.20, relevance: 0.15, clarity: 0.15, structure: 0.10, tradeoffs: 0.10 };
const has = (text, term) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i').test(text);
const hasAny = (text, phrases) => phrases.some(p => p.split(' ').length > 1 ? text.includes(p) : has(text, p));

function uncertain(message, missing = []) {
  return { scoreOutOf10: null, score: null, technicalCorrectness: null, conceptualDepth: null, relevance: null, clarity: null, structure: null, tradeoffs: null,
    strengths: [], missingConcepts: missing, improvement: missing.map(x => `Address ${x}.`), verdict: 'Unable to evaluate confidently', evaluationStatus: 'uncertain', confidenceMessage: message,
    feedback: message, whatMoreInAnswer: missing.map(x => `Address ${x}.`), whatMoreToLearn: [], matchedKeywords: [], clarityLabel: 'Insufficient evidence' };
}

function evaluateAnswer({ question, questionId, answer, expectedConcepts, tradeoffs: expectedTradeoffs }) {
  const text = String(answer || '').trim().toLowerCase();
  if (text.replace(/[^a-z0-9]/g, '').length < 20 || text.split(/\s+/).length < 4)
    return uncertain('The response contains too little technical evidence to score dimensions reliably.');
  const id = questionId && RUBRICS[questionId] ? questionId : QUESTION_ALIASES[question];
  const dynamicConcepts = Array.isArray(expectedConcepts) ? expectedConcepts.filter(value => typeof value === 'string' && value.trim()).slice(0, 12) : null;
  if (!id && (!dynamicConcepts || !dynamicConcepts.length)) return uncertain('This question has no configured rubric, so scoring would be unreliable.');
  const rubric = id ? RUBRICS[id] : { concepts: dynamicConcepts.map(label => [label, [label.toLowerCase()]]), tradeoffs: Array.isArray(expectedTradeoffs) ? expectedTradeoffs.map(String) : [] };
  const matched = rubric.concepts.filter(([, aliases]) => hasAny(text, aliases)).map(([label]) => label);
  const missing = rubric.concepts.filter(([label]) => !matched.includes(label)).map(([label]) => label);
  const relevance = Math.min(100, matched.length / Math.max(3, rubric.concepts.length * 0.55) * 100);
  if (matched.length === 0) return uncertain('No rubric concepts were detected. The answer may be irrelevant or use terminology this deterministic evaluator does not recognize.', rubric.concepts.slice(0, 4).map(([x]) => x));

  const contradictionCount = (rubric.contradictions || []).filter(pattern => pattern.test(text)).length;
  const correctness = Math.max(0, Math.min(100, matched.length / rubric.concepts.length * 100) - contradictionCount * 60);
  const depthSignals = ['because', 'therefore', 'which means', 'for example', 'in practice', 'trade-off', 'tradeoff', 'when', 'so that', 'formula', 'whereas', 'unlike'];
  const depth = Math.min(100, (matched.length / rubric.concepts.length * 70) + Math.min(30, depthSignals.filter(s => text.includes(s)).length * 10));
  const tradeoffHits = rubric.tradeoffs.filter(t => hasAny(text, [t]));
  const tradeoffs = Math.min(100, tradeoffHits.length / Math.max(2, Math.min(4, rubric.tradeoffs.length)) * 100);
  const sentences = text.split(/[.!?;]+/).map(s => s.trim()).filter(Boolean);
  const claritySignals = ['because', 'therefore', 'for example', 'which', 'this means', 'first', 'then'];
  const clarity = Math.min(100, 45 + Math.min(30, claritySignals.filter(s => text.includes(s)).length * 10) + (sentences.length > 1 ? 15 : 0) - (text.length > 0 && sentences.length === 1 && text.split(/\s+/).length > 55 ? 10 : 0));
  const structureSignals = ['first', 'second', 'then', 'finally', 'for example', 'in summary', 'because'];
  const structure = Math.min(100, 35 + Math.min(65, structureSignals.filter(s => text.includes(s)).length * 18));
  const components = { technicalCorrectness: Math.round(correctness), conceptualDepth: Math.round(depth), relevance: Math.round(relevance), clarity: Math.round(clarity), structure: Math.round(structure), tradeoffs: Math.round(tradeoffs) };
  const overall = Math.round(Object.entries(WEIGHTS).reduce((sum, [k, w]) => sum + components[k] * w, 0));
  const strengths = [];
  if (components.technicalCorrectness >= 60) strengths.push(`Covered ${matched.slice(0, 4).join(', ')}.`);
  if (components.clarity >= 65) strengths.push('Connected technical points with explanatory language.');
  if (components.tradeoffs >= 50) strengths.push('Acknowledged relevant engineering constraints or trade-offs.');
  if (!strengths.length) strengths.push('The response contains at least one recognizable concept from the question rubric.');
  const improvement = missing.slice(0, 4).map(x => `Explain ${x} and connect it to the question.`);
  if (components.tradeoffs < 40) improvement.push('Discuss a relevant limitation or trade-off.');
  const verdict = overall >= 82 ? 'Strong technical answer' : overall >= 62 ? 'Partially correct; add depth and precision' : 'Limited technical evidence; review the core concepts';
  return { scoreOutOf10: Number((overall / 10).toFixed(1)), score: overall, ...components, conceptualUnderstanding: components.conceptualDepth, depth: components.conceptualDepth, reasoning: components.tradeoffs, overallScore: overall, weaknesses: missing, strengths, missingConcepts: missing,
    improvement, verdict, evaluationStatus: 'evaluated', confidenceMessage: 'Deterministic rubric match; this is an evidence-based heuristic, not an LLM judgment.',
    feedback: verdict, whatMoreInAnswer: improvement, whatMoreToLearn: missing.slice(0, 4).map(x => `Review ${x}.`), matchedKeywords: matched, clarityLabel: `${components.clarity}/100` };
}

module.exports = { evaluateAnswer, RUBRICS, WEIGHTS };
