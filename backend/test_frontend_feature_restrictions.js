'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const catalogue = JSON.parse(fs.readFileSync(path.join(root, 'tech_vortex_roadmap_catalogue', 'roadmap_catalogue.json'), 'utf8'));
const { normalizeSkillGoals } = require('./profile_normalizer');

assert.doesNotMatch(html, /\/api\/interview|mock interviewer|mock interview|solution generator|automated code evaluation|coding editor|interview chatbot/i, 'the DSA catalogue must not add interview APIs or interactive interview tools');
assert.match(html, /label: 'Dashboard'/);
assert.match(html, /label: 'Skill Intelligence'/);
assert.match(html, /label: 'Job Intelligence'/);
assert.match(html, /label: 'Roadmap'/);
assert.match(html, /aria-label="Skill Intelligence modes"[^>]*>[\s\S]*?Build Skills[\s\S]*?My Skill Goals/);
assert.doesNotMatch(html, /\{ id: 'job', label: 'Job Match' \}/, 'Job Match is no longer a Skill Intelligence mode');
assert.match(html, /activeTab === 'job-intelligence'[\s\S]*?<JobIntelligencePage/);
assert.match(html, /preferredRoadmapSkill[\s\S]*?canonicalSkill === preferredRoadmapSkill/);
assert.match(html, /preferredRoadmapItem \|\| roadmapJourneyNodes\.find\(item => item\.id === selectedRoadmapItemId\)/);
assert.match(html, /id: 'interview-prep', label: 'Interview Preparation'/);
assert.match(html, /id: 'interview-prep', label: 'Interview', icon: 'interview'/);
assert.match(html, /activeTab === 'interview-prep' && <InterviewPreparationLibraryPage \/>/);
assert.match(html, /'interview-prep': 'Interview Preparation'/);
assert.match(html, /grid-cols-6[^\"]*lg:hidden/);
const embeddedCatalogueMatch = html.match(/<script>window\.DSA_QUESTION_CATALOGUE = (\[[\s\S]*?\]);<\/script>/);
assert.ok(embeddedCatalogueMatch, 'the full catalogue must load with the root page without requiring a backend asset route');
const embeddedCatalogue = JSON.parse(embeddedCatalogueMatch[1]);
assert.equal(embeddedCatalogue.length, 271);
assert.deepEqual(embeddedCatalogue.map(question => question.id), JSON.parse(JSON.stringify([])));
assert.match(fs.readFileSync(path.join(root, 'backend', 'server.js'), 'utf8'), /app\.get\('\/dsa_question_catalogue\.js'/);

const dsaCatalogueContext = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'dsa_question_catalogue.js'), 'utf8'), dsaCatalogueContext);
const dsaCatalogue = dsaCatalogueContext.window.DSA_QUESTION_CATALOGUE;
const expectedTopics = [
  'Arrays', 'Strings', 'Hashing', 'Two Pointers', 'Sliding Window', 'Binary Search', 'Sorting',
  'Linked Lists', 'Stacks', 'Queues and Deques', 'Recursion and Backtracking',
  'Trees and Binary Search Trees', 'Heaps and Priority Queues', 'Graphs', 'Greedy Algorithms',
  'Dynamic Programming', 'Tries', 'Bit Manipulation', 'Intervals', 'Math and Number Theory'
];
assert.equal(dsaCatalogue.length, 271);
const allQuestions = Array.from(dsaCatalogue);
assert.equal(new Set(allQuestions.map(question => question.id)).size, allQuestions.length, 'question IDs should be unique');
assert.equal(new Set(allQuestions.map(question => question.problemUrl)).size, allQuestions.length, 'each problem should appear once');
assert.ok(allQuestions.length >= 250, 'the catalogue should contain at least 250 unique questions');
assert.ok(new Set(allQuestions.map(question => `${question.topic}::${question.subtopic}`)).size >= 100, 'the catalogue should include the requested topic subtopics');
const previousStart = html.indexOf('const DSA_QUESTION_CATALOGUE = ');
const previousEnd = html.indexOf('\n\n    function InterviewPreparationPage()', previousStart);
const previousCatalogue = vm.runInNewContext(html.slice(previousStart, previousEnd)
  .replace('const DSA_QUESTION_CATALOGUE = ', '').trim().replace(/;$/, ''));
const expandedIds = new Set(allQuestions.map(question => question.id));
assert.ok(previousCatalogue.flatMap(topic => topic.questions).every(question => expandedIds.has(`leetcode-${question.slug}`)), 'the expanded library should retain every previous problem');
assert.ok(allQuestions.every(question => question.id && question.title && question.topic && question.subtopic && question.pattern
  && ['Easy', 'Medium', 'Hard'].includes(question.difficulty)
  && question.problemUrl === `https://leetcode.com/problems/${question.id.replace(/^leetcode-/, '')}/`
  && question.solutionUrl === `${question.problemUrl}solutions/`));
assert.deepEqual(Array.from(new Set(allQuestions.map(question => question.topic))), expectedTopics);
assert.match(html, /Search titles or topics/);
assert.match(html, /value="difficulty"/);
assert.match(html, /value="topic"/);
assert.match(html, /value="title"/);
assert.match(html, /setSelectedSubtopic\('All'\)/);
assert.match(html, /question\.title\.toLocaleLowerCase\(\)\.includes\(normalizedQuery\)/);
assert.match(html, /question\.difficulty === difficulty/);
assert.match(html, /question\.subtopic === subtopicName/);
assert.match(html, /Clear all filters/);
assert.match(html, /question\.problemUrl/);
assert.match(html, /question\.solutionUrl/);
assert.match(html, /View Solution/);
assert.match(html, /target="_blank" rel="noopener noreferrer"/);

const optionsMatch = html.match(/const SKILL_GOAL_OPTIONS = (\[[\s\S]*?\]);/);
assert.ok(optionsMatch, 'the fixed Skill Goal choices should be present');
const options = vm.runInNewContext(optionsMatch[1]);
assert.deepEqual(Array.from(options), [
  'Python', 'JavaScript', 'C++', 'Java', 'DSA', 'SQL', 'System Design', 'React',
  'Node.js', 'Machine Learning', 'Deep Learning', 'NumPy', 'Pandas', 'Docker', 'PyTorch', 'Git'
]);
assert.match(html, /const MAX_SKILL_GOALS = 5;/);
assert.match(html, /skillGoals\.length >= MAX_SKILL_GOALS/);
assert.match(html, /disabled=\{skillGoalLimitReached\}/);
assert.match(html, /Maximum skill goals reached\. Remove an existing skill goal/);
assert.match(html, /selectedSkill \? canonicalSkillName\(selectedSkill\) : ''/);
assert.match(html, /alreadySelected \|\| skillGoals\.length >= MAX_SKILL_GOALS/);
assert.match(html, /saveSharedProfile\(\{ \.\.\.profile, skillGoals:/);
assert.deepEqual(normalizeSkillGoals([{ canonical: 'dsa', display: 'DSA' }]).map(goal => goal.display), ['DSA']);
assert.doesNotMatch(html, /datalist id="skill-goal-options"|placeholder="Search or enter a skill"/);

const allowedTrackIds = [
  'machine-learning-ai', 'data-science', 'full-stack', 'backend',
  'cloud-devops', 'iot-embedded', 'dsa-problem-solving'
];
const selectableTrackIds = Object.keys(catalogue.tracks).filter(id => id !== 'software-engineering');
assert.deepEqual(selectableTrackIds, allowedTrackIds);
assert.match(html, /catalogueTracks\.filter\(career => career\.id !== 'software-engineering'\)/);
assert.match(html, /data\.tracks\.filter\(career => career\.id !== 'software-engineering'\)/);
assert.match(html, /EXCLUDED_TARGET_CAREER_IDS/);

console.log('Frontend verified: static DSA preparation catalogue (20 topics, 271 unique problems), combined search/filters/sorting, problem and solution links, unified Job Intelligence navigation, 16 ordered goals, 5-goal cap, and 7 catalogue target roles.');
