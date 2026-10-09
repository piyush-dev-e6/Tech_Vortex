'use strict';

const DEFAULT_WELLNESS_ROUTINE = Object.freeze({
  preferences: Object.freeze({
    availableMinutes: 90,
    startTime: '18:00',
    preferredDays: Object.freeze([1, 2, 3, 4, 5]),
    sessionMinutes: 25,
    breakMinutes: 10,
    includeManualTasks: true,
    sourceMode: 'auto',
    selectedSkill: ''
  }),
  manualTasks: Object.freeze([]),
  sessionStates: Object.freeze({})
});

const TASK_STATUSES = new Set(['upcoming', 'in_progress', 'completed', 'skipped']);
const CATEGORIES = new Set(['Study', 'Personal', 'Project', 'Other']);
const PRIORITIES = new Set(['low', 'medium', 'high']);
const ACTIVITIES = new Set(['learning', 'practice', 'verification']);

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function boundedInteger(value, fallback, min, max, label) {
  if (value === undefined || value === null || value === '') return fallback;
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new TypeError(`${label} must be a whole number from ${min} to ${max}.`);
  }
  return number;
}

function validTime(value, optional = false) {
  if (optional && (value === undefined || value === null || value === '')) return '';
  const time = String(value || '');
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new TypeError('Time must use the 24-hour HH:MM format.');
  return time;
}

function validDate(value) {
  const date = String(value || '');
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(date) ? new Date(`${date}T00:00:00.000Z`) : null;
  if (!parsed || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    throw new TypeError('Task date must be a valid YYYY-MM-DD date.');
  }
  return date;
}

function normalizeWellnessRoutine(input) {
  if (input === undefined || input === null) input = {};
  if (!isRecord(input)) throw new TypeError('Wellness routine must be an object.');
  const rawPreferences = input.preferences === undefined ? {} : input.preferences;
  if (!isRecord(rawPreferences)) throw new TypeError('Wellness routine preferences must be an object.');
  const defaults = DEFAULT_WELLNESS_ROUTINE.preferences;
  const rawDays = rawPreferences.preferredDays === undefined ? defaults.preferredDays : rawPreferences.preferredDays;
  if (!Array.isArray(rawDays) || rawDays.length < 1 || rawDays.length > 7 || rawDays.some(day => !Number.isInteger(day) || day < 0 || day > 6)) {
    throw new TypeError('Choose at least one preferred day of the week.');
  }
  const preferredDays = [...new Set(rawDays)].sort((a, b) => a - b);
  const preferences = {
    availableMinutes: boundedInteger(rawPreferences.availableMinutes, defaults.availableMinutes, 15, 360, 'Daily availability'),
    startTime: validTime(rawPreferences.startTime === undefined ? defaults.startTime : rawPreferences.startTime),
    preferredDays,
    sessionMinutes: boundedInteger(rawPreferences.sessionMinutes, defaults.sessionMinutes, 10, 90, 'Session length'),
    breakMinutes: boundedInteger(rawPreferences.breakMinutes, defaults.breakMinutes, 0, 30, 'Break length'),
    includeManualTasks: rawPreferences.includeManualTasks === undefined ? defaults.includeManualTasks : Boolean(rawPreferences.includeManualTasks),
    sourceMode: ['auto', 'job', 'career', 'skill', 'none'].includes(rawPreferences.sourceMode) ? rawPreferences.sourceMode : defaults.sourceMode,
    selectedSkill: String(rawPreferences.selectedSkill || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100)
  };

  const rawTasks = input.manualTasks === undefined ? [] : input.manualTasks;
  if (!Array.isArray(rawTasks) || rawTasks.length > 300) throw new TypeError('Manual tasks must be an array of at most 300 items.');
  const ids = new Set();
  const manualTasks = rawTasks.map((task, index) => {
    if (!isRecord(task)) throw new TypeError(`Manual task ${index + 1} must be an object.`);
    const id = String(task.id || '').trim().slice(0, 160);
    if (!id) throw new TypeError(`Manual task ${index + 1} needs a stable ID.`);
    if (ids.has(id)) throw new TypeError('Manual task IDs must be unique.');
    ids.add(id);
    const title = String(task.title || '').trim();
    if (!title || title.length > 120) throw new TypeError('Manual task titles must be between 1 and 120 characters.');
    const category = CATEGORIES.has(task.category) ? task.category : 'Other';
    const status = TASK_STATUSES.has(task.status) ? task.status : 'upcoming';
    const priority = PRIORITIES.has(task.priority) ? task.priority : 'medium';
    return {
      id,
      title,
      description: String(task.description || '').trim().slice(0, 1000),
      category,
      date: validDate(task.date),
      startTime: validTime(task.startTime, true),
      durationMinutes: boundedInteger(task.durationMinutes, 30, 5, 480, 'Task duration'),
      priority,
      notes: String(task.notes || '').trim().slice(0, 2000),
      status,
      createdAt: String(task.createdAt || new Date(0).toISOString()).slice(0, 40),
      updatedAt: String(task.updatedAt || new Date(0).toISOString()).slice(0, 40),
      completedAt: task.completedAt ? String(task.completedAt).slice(0, 40) : null
    };
  });

  const rawStates = input.sessionStates === undefined ? {} : input.sessionStates;
  if (!isRecord(rawStates) || Object.keys(rawStates).length > 600) throw new TypeError('Learning session history must be an object of at most 600 items.');
  const sessionStates = {};
  for (const [rawId, rawState] of Object.entries(rawStates)) {
    const id = String(rawId).trim().slice(0, 220);
    if (!id || !isRecord(rawState) || !TASK_STATUSES.has(rawState.status)) continue;
    const state = {
      status: rawState.status,
      title: String(rawState.title || '').slice(0, 160),
      roadmapItemId: String(rawState.roadmapItemId || '').slice(0, 220),
      skill: String(rawState.skill || '').slice(0, 100),
      canonicalSkill: String(rawState.canonicalSkill || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 100),
      activity: ACTIVITIES.has(rawState.activity) ? rawState.activity : null,
      source: String(rawState.source || '').slice(0, 40),
      target: String(rawState.target || '').slice(0, 120),
      date: /^\d{4}-\d{2}-\d{2}$/.test(String(rawState.date || '')) ? String(rawState.date) : null,
      time: /^([01]\d|2[0-3]):[0-5]\d$/.test(String(rawState.time || '')) ? String(rawState.time) : null,
      updatedAt: String(rawState.updatedAt || '').slice(0, 40),
      completedAt: rawState.completedAt ? String(rawState.completedAt).slice(0, 40) : null
    };
    sessionStates[id] = state;
  }
  return { preferences, manualTasks, sessionStates };
}

function dateAdd(date, days) {
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function startOfDayMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function timeFromMinutes(minutes) {
  const clamped = Math.max(0, Math.min(1439, minutes));
  return `${String(Math.floor(clamped / 60)).padStart(2, '0')}:${String(clamped % 60).padStart(2, '0')}`;
}

function sourceFor(item) {
  if (item.sources?.includes('job')) return 'job-gap';
  if (item.isGoal || item.sources?.includes('manual')) return 'skill-goal';
  if (item.sources?.includes('career')) return 'career-roadmap';
  return 'prerequisite';
}

function sourceRank(item, mode) {
  if (item.sources?.includes('job')) return item.priority === 'critical' && item.currentStatus === 'missing' ? 0 : item.currentStatus === 'missing' ? 1 : 4;
  if (item.isGoal || item.sources?.includes('manual')) return 2;
  if (item.sources?.includes('career')) return item.currentStatus === 'developing' ? 4 : 3;
  return mode === 'job' ? 5 : 4;
}

function buildRoutinePlan(roadmap, routineInput, options = {}) {
  const routine = normalizeWellnessRoutine(routineInput);
  const { preferences, sessionStates } = routine;
  const mode = ['job', 'career', 'skill'].includes(options.mode) ? options.mode : 'none';
  const asOfDate = validDate(options.asOfDate || new Date().toISOString().slice(0, 10));
  const target = String(roadmap?.target || '').slice(0, 120);
  const roadmapItems = Array.isArray(roadmap?.roadmapItems) ? roadmap.roadmapItems : [];
  const bestBySkill = new Map();
  for (const item of roadmapItems) {
    const canonical = String(item.canonicalSkill || item.skill || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!canonical) continue;
    const previous = bestBySkill.get(canonical);
    const comparator = value => [sourceRank(value, mode), ({ critical: 0, high: 1, medium: 2, low: 3 }[value.priority] ?? 2), -(Number(value.priorityScore) || 0), Number(value.stage) || 0];
    const ranksBefore = (left, right) => { const a = comparator(left); const b = comparator(right); for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return a[index] < b[index]; return false; };
    if (!previous) bestBySkill.set(canonical, item);
    else {
      const chosen = ranksBefore(item, previous) ? item : previous;
      bestBySkill.set(canonical, { ...chosen, sources: [...new Set([...(previous.sources || []), ...(item.sources || [])])] });
    }
  }
  const orderedItems = [...bestBySkill.values()].sort((a, b) =>
    (Number(a.stage) || 0) - (Number(b.stage) || 0)
    || sourceRank(a, mode) - sourceRank(b, mode)
    || ({ critical: 0, high: 1, medium: 2, low: 3 }[a.priority] ?? 2) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.priority] ?? 2)
    || (Number(b.priorityScore) || 0) - (Number(a.priorityScore) || 0)
    || String(a.skill || '').localeCompare(String(b.skill || ''))
  );
  const candidates = [];
  for (const item of orderedItems) {
    const canonicalSkill = String(item.canonicalSkill || item.skill || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
    if (!canonicalSkill) continue;
    const source = sourceFor(item);
    for (const activity of ['learning', 'practice', 'verification']) {
      if (item[activity]?.status === 'completed') continue;
      const scope = String(target || 'learning').normalize('NFKC').trim().toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '-').slice(0, 50);
      const id = `wellness:${mode}:${scope}:${canonicalSkill}:${activity}`.slice(0, 220);
      const saved = sessionStates[id];
      if (saved?.status === 'completed' || saved?.status === 'skipped') continue;
      candidates.push({
        id, roadmapItemId: item.id, title: item[activity]?.title || `${activity === 'learning' ? 'Learn' : activity === 'practice' ? 'Practice' : 'Verify'} ${item.skill}`,
        skill: String(item.skill || canonicalSkill), canonicalSkill, activity, source,
        importance: item.importance || 'medium', currentStatus: item.currentStatus || 'missing',
        priority: item.priority || 'medium', priorityScore: Number(item.priorityScore) || 0,
        reason: String(item.reason || ''), durationMinutes: Math.min(preferences.sessionMinutes, preferences.availableMinutes),
        durationIsEstimate: true, status: saved?.status === 'in_progress' || item[activity]?.status === 'in_progress' ? 'in_progress' : 'upcoming',
        learning: item.learning || null, practice: item.practice || null, verification: item.verification || null,
        officialDocumentationUrl: item.officialDocumentationUrl || null,
        officialDocumentationUrls: Array.isArray(item.officialDocumentationUrls) ? item.officialDocumentationUrls : [],
        youtube: Array.isArray(item.youtube) ? item.youtube : [], youtubeSearchUrl: item.youtubeSearchUrl || null,
        target, stage: Number(item.stage) || 0, sources: Array.isArray(item.sources) ? item.sources : []
      });
      break;
    }
  }

  const activeIds = new Set(candidates.map(item => item.id));
  const statesToPersist = {};
  for (const [id, state] of Object.entries(sessionStates)) {
    if (['completed', 'skipped', 'in_progress'].includes(state.status) && (!activeIds.has(id) || state.status !== 'upcoming')) statesToPersist[id] = state;
  }
  const manualByDay = new Map();
  if (preferences.includeManualTasks) {
    for (const task of routine.manualTasks) {
      const list = manualByDay.get(task.date) || [];
      list.push(task);
      manualByDay.set(task.date, list);
    }
  }

  let scheduleDate = asOfDate;
  let usedMinutes = 0;
  let dayAutoCount = 0;
  let cursor = startOfDayMinutes(preferences.startTime);
  const scheduledTasks = [];
  const unscheduledTasks = [];
  let guard = 0;
  for (const task of candidates) {
    if (task.durationMinutes > preferences.availableMinutes) {
      unscheduledTasks.push({ ...task, unscheduledReason: 'The estimated session is longer than your daily availability.' });
      continue;
    }
    let foundSlot = false;
    while (guard++ < 5000) {
      const weekday = new Date(`${scheduleDate}T12:00:00.000Z`).getUTCDay();
      if (!preferences.preferredDays.includes(weekday)) {
        if (usedMinutes > 0) { scheduleDate = dateAdd(scheduleDate, 1); usedMinutes = 0; dayAutoCount = 0; cursor = startOfDayMinutes(preferences.startTime); }
        else { scheduleDate = dateAdd(scheduleDate, 1); cursor = startOfDayMinutes(preferences.startTime); }
        continue;
      }
      const manualTasks = manualByDay.get(scheduleDate) || [];
      const manualMinutes = manualTasks.reduce((sum, manual) => sum + (manual.status === 'skipped' ? 0 : manual.durationMinutes), 0);
      const breakBefore = dayAutoCount ? preferences.breakMinutes : 0;
      const effectiveDuration = task.durationMinutes;
      if (usedMinutes + manualMinutes + breakBefore + effectiveDuration > preferences.availableMinutes || cursor + breakBefore + effectiveDuration > 1439) {
        scheduleDate = dateAdd(scheduleDate, 1); usedMinutes = 0; dayAutoCount = 0; cursor = startOfDayMinutes(preferences.startTime); continue;
      }
      let startAt = cursor + breakBefore;
      let moved;
      do {
        moved = false;
        const endAt = startAt + effectiveDuration;
        for (const manual of manualTasks) {
          if (!manual.startTime || manual.status === 'skipped') continue;
          const manualStart = startOfDayMinutes(manual.startTime);
          const manualEnd = manualStart + manual.durationMinutes;
          if (startAt < manualEnd && endAt > manualStart) {
            startAt = manualEnd;
            moved = true;
            break;
          }
        }
      } while (moved && startAt + effectiveDuration <= 1439);
      if (startAt + effectiveDuration > 1439) {
        scheduleDate = dateAdd(scheduleDate, 1); usedMinutes = 0; dayAutoCount = 0; cursor = startOfDayMinutes(preferences.startTime); continue;
      }
      task.date = scheduleDate;
      task.time = timeFromMinutes(startAt);
      task.durationLabel = `Estimated · ${task.durationMinutes} min`;
      scheduledTasks.push(task);
      const priorState = sessionStates[task.id];
      statesToPersist[task.id] = {
        status: task.status, title: task.title, roadmapItemId: task.roadmapItemId, skill: task.skill, canonicalSkill: task.canonicalSkill,
        activity: task.activity, source: task.source, target, date: task.date, time: task.time,
        updatedAt: priorState?.updatedAt || new Date().toISOString(), completedAt: priorState?.completedAt || null
      };
      usedMinutes += breakBefore + effectiveDuration;
      dayAutoCount += 1;
      cursor = startAt + effectiveDuration;
      foundSlot = true;
      break;
    }
    if (!foundSlot && !unscheduledTasks.some(item => item.id === task.id)) unscheduledTasks.push({ ...task, unscheduledReason: 'No available study slot was found in the next 180 days.' });
  }

  const todayTasks = scheduledTasks.filter(item => item.date === asOfDate);
  const nextTask = scheduledTasks.find(item => item.status !== 'completed') || null;
  return {
    mode, target, status: roadmap?.status || 'needs_goal',
    taskCount: scheduledTasks.length, today: asOfDate, todayTasks,
    upcomingTasks: scheduledTasks.filter(item => item.date > asOfDate),
    unscheduledTasks, nextTask, manualTasks: routine.manualTasks,
    sessionHistory: Object.entries(statesToPersist).filter(([, state]) => ['completed', 'skipped'].includes(state.status)).map(([id, state]) => ({ id, ...state })),
    sessionStates: statesToPersist,
    preferences,
    readinessScore: roadmap?.skillGapAnalysis?.readinessScore ?? null,
    gapCount: Array.isArray(roadmap?.skillGapAnalysis?.recommendedSkills) ? roadmap.skillGapAnalysis.recommendedSkills.length : 0,
    resourcePolicy: roadmap?.resourcePolicy || null,
    warnings: Array.isArray(roadmap?.warnings) ? roadmap.warnings : []
  };
}

module.exports = { DEFAULT_WELLNESS_ROUTINE, normalizeWellnessRoutine, buildRoutinePlan };
