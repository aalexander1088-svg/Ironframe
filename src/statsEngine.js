import { PROGRAM, MUSCLE_MAP, ALL_EXERCISES } from "./constants";

export function getExerciseHistory(logData, exerciseId) {
  const sessions = {};
  Object.keys(logData).forEach((key) => {
    const [date, eid, sn] = key.split("::");
    if (eid === exerciseId) {
      if (!sessions[date]) sessions[date] = [];
      sessions[date].push({ set: Number(sn), ...logData[key] });
    }
  });
  return Object.entries(sessions)
    .map(([date, sets]) => {
      sets.sort((a, b) => a.set - b.set);
      const topWeight = Math.max(...sets.map((s) => s.weight));
      const totalVolume = sets.reduce((sum, s) => sum + s.weight * s.reps, 0);
      const bestSet = sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0]);
      return {
        date,
        sets,
        topWeight,
        totalVolume,
        estimated1RM: getEstimated1RM(bestSet.weight, bestSet.reps),
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getEstimated1RM(weight, reps) {
  if (reps <= 0 || weight <= 0) return 0;
  if (reps === 1) return weight;
  return Math.round(weight * (1 + reps / 30));
}

export function getSessionVolumes(logData) {
  const sessions = {};
  Object.keys(logData).forEach((key) => {
    const [date, eid] = key.split("::");
    const d = logData[key];
    if (!sessions[date]) sessions[date] = { volume: 0, exercises: new Set() };
    sessions[date].volume += d.weight * d.reps;
    sessions[date].exercises.add(eid);
  });

  return Object.entries(sessions)
    .map(([date, data]) => {
      const eids = [...data.exercises];
      let dayType = "Mixed";
      if (eids.some((id) => id.startsWith("d1") || id.startsWith("d4"))) dayType = "Push";
      else if (eids.some((id) => id.startsWith("d2") || id.startsWith("d5"))) dayType = "Pull";
      else if (eids.some((id) => id.startsWith("d3") || id.startsWith("d6"))) dayType = "Legs";
      return { date, volume: data.volume, dayType };
    })
    .sort((a, b) => a.date.localeCompare(b.date));
}

export function getPRTimeline(logData) {
  const entries = [];
  Object.keys(logData).forEach((key) => {
    const [date, eid, sn] = key.split("::");
    const d = logData[key];
    entries.push({ date, eid, weight: d.weight, reps: d.reps, volume: d.weight * d.reps });
  });
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.eid.localeCompare(b.eid));

  const maxWeight = {};
  const maxVolume = {};
  const prs = [];

  const exMap = {};
  ALL_EXERCISES.forEach((ex) => { exMap[ex.id] = ex.name; });

  entries.forEach(({ date, eid, weight, volume }) => {
    if (!maxWeight[eid]) { maxWeight[eid] = 0; maxVolume[eid] = 0; }
    if (weight > maxWeight[eid] && maxWeight[eid] > 0) {
      prs.push({ date, exerciseId: eid, exerciseName: exMap[eid] || eid, type: "weight", value: weight, previousValue: maxWeight[eid] });
    }
    if (volume > maxVolume[eid] && maxVolume[eid] > 0) {
      prs.push({ date, exerciseId: eid, exerciseName: exMap[eid] || eid, type: "volume", value: volume, previousValue: maxVolume[eid] });
    }
    maxWeight[eid] = Math.max(maxWeight[eid], weight);
    maxVolume[eid] = Math.max(maxVolume[eid], volume);
  });

  return prs.sort((a, b) => b.date.localeCompare(a.date));
}

export function getStreakData(logData) {
  const dates = new Set();
  Object.keys(logData).forEach((key) => {
    dates.add(key.split("::")[0]);
  });
  const sorted = [...dates].sort();
  if (sorted.length === 0) return { currentStreak: 0, longestStreak: 0, totalDays: 0, thisWeekSessions: 0 };

  const today = new Date().toISOString().slice(0, 10);

  // Current streak (counting back from today or most recent day)
  let currentStreak = 0;
  let checkDate = new Date(today + "T12:00:00");
  while (true) {
    const ds = checkDate.toISOString().slice(0, 10);
    if (dates.has(ds)) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else if (currentStreak === 0) {
      // Allow one rest day gap if today has no data
      checkDate.setDate(checkDate.getDate() - 1);
      const ds2 = checkDate.toISOString().slice(0, 10);
      if (dates.has(ds2)) {
        currentStreak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else break;
    } else break;
  }

  // Longest streak
  let longestStreak = 0;
  let streak = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + "T12:00:00");
    const curr = new Date(sorted[i] + "T12:00:00");
    const diff = (curr - prev) / (1000 * 60 * 60 * 24);
    if (diff === 1) streak++;
    else { longestStreak = Math.max(longestStreak, streak); streak = 1; }
  }
  longestStreak = Math.max(longestStreak, streak);

  // This week sessions (Mon-Sun)
  const now = new Date(today + "T12:00:00");
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(now);
  monday.setDate(monday.getDate() - mondayOffset);
  const mondayStr = monday.toISOString().slice(0, 10);
  const thisWeekSessions = sorted.filter((d) => d >= mondayStr && d <= today).length;

  return { currentStreak, longestStreak, totalDays: sorted.length, thisWeekSessions };
}

export function getMuscleGroupVolume(logData, weeksBack = 4) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeksBack * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const eidToMuscle = {};
  Object.entries(MUSCLE_MAP).forEach(([group, ids]) => {
    ids.forEach((id) => { eidToMuscle[id] = group; });
  });

  const volumes = {};
  Object.keys(MUSCLE_MAP).forEach((g) => { volumes[g] = 0; });

  Object.keys(logData).forEach((key) => {
    const [date, eid] = key.split("::");
    if (date < cutoffStr) return;
    const d = logData[key];
    const group = eidToMuscle[eid];
    if (group) volumes[group] += d.weight * d.reps;
  });

  const maxVol = Math.max(...Object.values(volumes), 1);
  return Object.entries(volumes).map(([group, totalVolume]) => ({
    group,
    totalVolume,
    intensity: totalVolume / maxVol,
  }));
}

export function getWeeklySummaries(logData, numWeeks = 8) {
  const sessions = getSessionVolumes(logData);
  const prs = getPRTimeline(logData);

  const today = new Date();
  const weeks = [];

  for (let w = 0; w < numWeeks; w++) {
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() - w * 7);
    const dayOfWeek = weekEnd.getDay();
    const sundayOffset = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
    const sunday = new Date(weekEnd);
    sunday.setDate(sunday.getDate() + sundayOffset - 7 * (sundayOffset > 0 ? 0 : 0));

    const monday = new Date(weekEnd);
    const monOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    monday.setDate(weekEnd.getDate() - monOffset);

    const monStr = monday.toISOString().slice(0, 10);
    const endStr = weekEnd.toISOString().slice(0, 10);

    const weekSessions = sessions.filter((s) => s.date >= monStr && s.date <= endStr);
    const weekPRs = prs.filter((p) => p.date >= monStr && p.date <= endStr);
    const totalVolume = weekSessions.reduce((sum, s) => sum + s.volume, 0);

    weeks.push({
      weekLabel: monStr.slice(5),
      totalVolume,
      sessions: weekSessions.length,
      prs: weekPRs.length,
      avgVolume: weekSessions.length > 0 ? Math.round(totalVolume / weekSessions.length) : 0,
    });
  }

  return weeks.reverse();
}

export function filterByTimeRange(logData, range) {
  if (range === "all") return logData;
  const weeks = { "4w": 4, "8w": 8, "12w": 12 }[range] || 4;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - weeks * 7);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const filtered = {};
  Object.keys(logData).forEach((key) => {
    if (key.split("::")[0] >= cutoffStr) filtered[key] = logData[key];
  });
  return filtered;
}
