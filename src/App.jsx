import { useState, useEffect, useCallback } from "react";

const PROGRAM = {
  "Day 1 — Push (Strength)": [
    { id: "d1e1", name: "Barbell Bench Press", sets: 4, reps: "5-6", rest: "3 min", note: "Heavy — work up to top set", increment: 5 },
    { id: "d1e2", name: "Incline Dumbbell Press", sets: 4, reps: "6-8", rest: "2 min", note: "30° incline, upper chest focus", increment: 5 },
    { id: "d1e3", name: "Weighted Dips", sets: 3, reps: "6-8", rest: "2 min", note: "Lean forward for chest bias", increment: 5 },
    { id: "d1e4", name: "Overhead Press", sets: 4, reps: "6-8", rest: "2 min", note: "Standing, strict form", increment: 5 },
    { id: "d1e5", name: "Lateral Raises", sets: 4, reps: "12-15", rest: "60s", note: "Slow eccentric, slight lean", increment: 2.5 },
    { id: "d1e6", name: "Tricep Pushdowns", sets: 3, reps: "10-12", rest: "60s", note: "Rope attachment", increment: 5 },
  ],
  "Day 2 — Pull (Strength)": [
    { id: "d2e1", name: "Barbell Rows", sets: 4, reps: "5-6", rest: "3 min", note: "Overhand grip, chest to bar", increment: 5 },
    { id: "d2e2", name: "Weighted Pull-Ups", sets: 4, reps: "6-8", rest: "2 min", note: "Wide grip for lat width", increment: 2.5 },
    { id: "d2e3", name: "Chest-Supported T-Bar Row", sets: 3, reps: "8-10", rest: "90s", note: "Squeeze at top", increment: 5 },
    { id: "d2e4", name: "Straight-Arm Pulldowns", sets: 3, reps: "12-15", rest: "60s", note: "Lat stretch & squeeze", increment: 5 },
    { id: "d2e5", name: "Face Pulls", sets: 4, reps: "15-20", rest: "60s", note: "Rear delt & posture", increment: 2.5 },
    { id: "d2e6", name: "Barbell Curls", sets: 3, reps: "8-10", rest: "60s", note: "Strict, no swing", increment: 2.5 },
  ],
  "Day 3 — Legs (Strength)": [
    { id: "d3e1", name: "Barbell Back Squat", sets: 4, reps: "5-6", rest: "3 min", note: "Below parallel", increment: 5 },
    { id: "d3e2", name: "Romanian Deadlift", sets: 4, reps: "6-8", rest: "2 min", note: "Hamstring stretch at bottom", increment: 5 },
    { id: "d3e3", name: "Leg Press", sets: 3, reps: "8-10", rest: "2 min", note: "High & wide foot placement", increment: 10 },
    { id: "d3e4", name: "Walking Lunges", sets: 3, reps: "10-10", rest: "90s", note: "Dumbbells at sides, 10/leg", increment: 5 },
    { id: "d3e5", name: "Leg Curls", sets: 3, reps: "10-12", rest: "60s", note: "Controlled tempo", increment: 5 },
    { id: "d3e6", name: "Standing Calf Raises", sets: 4, reps: "12-15", rest: "60s", note: "Full stretch at bottom", increment: 5 },
  ],
  "Day 4 — Push (Hypertrophy)": [
    { id: "d4e1", name: "Incline Barbell Bench", sets: 4, reps: "8-10", rest: "2 min", note: "Upper chest priority", increment: 5 },
    { id: "d4e2", name: "Flat Dumbbell Press", sets: 3, reps: "10-12", rest: "90s", note: "Deep stretch at bottom", increment: 5 },
    { id: "d4e3", name: "Cable Flyes (Low-to-High)", sets: 3, reps: "12-15", rest: "60s", note: "Upper chest squeeze", increment: 2.5 },
    { id: "d4e4", name: "Dumbbell Lateral Raises", sets: 5, reps: "15-20", rest: "45s", note: "High volume — build width", increment: 2.5 },
    { id: "d4e5", name: "Machine Shoulder Press", sets: 3, reps: "10-12", rest: "90s", note: "Controlled reps", increment: 5 },
    { id: "d4e6", name: "Overhead Tricep Extension", sets: 3, reps: "12-15", rest: "60s", note: "Cable or dumbbell", increment: 5 },
    { id: "d4e7", name: "Pec Deck / Machine Flye", sets: 3, reps: "12-15", rest: "60s", note: "Chest finisher — squeeze hard", increment: 5 },
  ],
  "Day 5 — Pull (Hypertrophy)": [
    { id: "d5e1", name: "Lat Pulldowns (Wide)", sets: 4, reps: "10-12", rest: "90s", note: "Lean back slightly, full stretch", increment: 5 },
    { id: "d5e2", name: "Seated Cable Row (Close Grip)", sets: 4, reps: "10-12", rest: "90s", note: "Drive elbows back", increment: 5 },
    { id: "d5e3", name: "Dumbbell Rows", sets: 3, reps: "10-12", rest: "60s", note: "Stretch at bottom, per arm", increment: 5 },
    { id: "d5e4", name: "Lat-Focused Pullover", sets: 3, reps: "12-15", rest: "60s", note: "Cable or dumbbell", increment: 5 },
    { id: "d5e5", name: "Rear Delt Flyes", sets: 4, reps: "15-20", rest: "45s", note: "Machine or cable", increment: 2.5 },
    { id: "d5e6", name: "Incline Dumbbell Curls", sets: 3, reps: "10-12", rest: "60s", note: "Long head stretch", increment: 2.5 },
    { id: "d5e7", name: "Hammer Curls", sets: 3, reps: "10-12", rest: "60s", note: "Brachialis for arm width", increment: 2.5 },
  ],
  "Day 6 — Legs (Hypertrophy)": [
    { id: "d6e1", name: "Front Squats", sets: 4, reps: "8-10", rest: "2 min", note: "Upright torso, quad focus", increment: 5 },
    { id: "d6e2", name: "Bulgarian Split Squats", sets: 3, reps: "10-12", rest: "90s", note: "Dumbbells, deep stretch, per leg", increment: 5 },
    { id: "d6e3", name: "Leg Extensions", sets: 3, reps: "12-15", rest: "60s", note: "Squeeze at top", increment: 5 },
    { id: "d6e4", name: "Stiff-Leg Deadlift", sets: 3, reps: "10-12", rest: "90s", note: "Dumbbells, slow negative", increment: 5 },
    { id: "d6e5", name: "Seated Leg Curls", sets: 3, reps: "12-15", rest: "60s", note: "Hold squeeze 1s", increment: 5 },
    { id: "d6e6", name: "Seated Calf Raises", sets: 4, reps: "15-20", rest: "45s", note: "Soleus focus", increment: 5 },
  ],
};

const DAYS = Object.keys(PROGRAM);

const WARMUPS = {
  push: {
    label: "PUSH WARM-UP",
    time: "5-7 min",
    moves: [
      { name: "Arm Circles", detail: "20 forward, 20 backward — small to big", icon: "🔄" },
      { name: "Band Pull-Aparts", detail: "2 × 15 — chest height, squeeze shoulder blades", icon: "🟡" },
      { name: "Band Dislocates", detail: "2 × 10 — slow, wide grip, full range overhead", icon: "🟡" },
      { name: "Scapular Push-Ups", detail: "2 × 10 — protract/retract only, arms locked", icon: "💪" },
      { name: "Incline Push-Ups", detail: "1 × 12 — bench height, controlled tempo", icon: "💪" },
      { name: "Band Shoulder External Rotation", detail: "2 × 12/arm — elbow pinned at 90°", icon: "🟡" },
      { name: "Cat-Cow", detail: "8 reps — open up thoracic spine", icon: "🐱" },
    ],
  },
  pull: {
    label: "PULL WARM-UP",
    time: "5-7 min",
    moves: [
      { name: "Band Pull-Aparts", detail: "2 × 15 — activate rear delts & rhomboids", icon: "🟡" },
      { name: "Band Face Pulls", detail: "2 × 15 — high pull, external rotate at top", icon: "🟡" },
      { name: "Scapular Pull-Ups (Dead Hang)", detail: "2 × 8 — depress & retract scaps only", icon: "💪" },
      { name: "Band Straight-Arm Pulldowns", detail: "2 × 12 — light band, feel the lats engage", icon: "🟡" },
      { name: "Arm Circles", detail: "15 forward, 15 backward — loosen shoulders", icon: "🔄" },
      { name: "Thoracic Rotations", detail: "8/side — on all fours, hand behind head", icon: "🔄" },
      { name: "Light Bicep Band Curls", detail: "1 × 15 — get blood into elbows", icon: "🟡" },
    ],
  },
  legs: {
    label: "LEGS WARM-UP",
    time: "6-8 min",
    moves: [
      { name: "Bodyweight Squats", detail: "2 × 12 — full depth, controlled", icon: "💪" },
      { name: "Walking Knee Hugs", detail: "10/leg — pull knee to chest, stand tall", icon: "🚶" },
      { name: "Leg Swings (Front-Back)", detail: "12/leg — hold wall, loosen hip flexors", icon: "🦵" },
      { name: "Leg Swings (Lateral)", detail: "12/leg — open up adductors & abductors", icon: "🦵" },
      { name: "Glute Bridges", detail: "2 × 12 — squeeze hard at top, 1s hold", icon: "💪" },
      { name: "Band Lateral Walks", detail: "12/direction — mini band above knees", icon: "🟡" },
      { name: "Ankle Circles & Calf Pumps", detail: "10/foot — prep for squats & calf work", icon: "🔄" },
      { name: "Hip 90/90 Stretch", detail: "30s/side — internal & external rotation", icon: "🧘" },
    ],
  },
};

const DAY_WARMUP_MAP = {
  0: "push", 1: "pull", 2: "legs", 3: "push", 4: "pull", 5: "legs",
};

const STORAGE_KEY = "workout-log-v3";

function getToday() {
  return new Date().toISOString().slice(0, 10);
}

function parseRepRange(reps) {
  const clean = reps.replace(/\/leg|\/arm/g, "");
  const parts = clean.split("-").map(Number);
  if (parts.length === 2) return { min: parts[0], max: parts[1] };
  return { min: parts[0], max: parts[0] };
}

function getLastSession(logData, exerciseId, totalSets, excludeDate) {
  const sessions = {};
  Object.keys(logData).forEach((key) => {
    const [date, eid, sn] = key.split("::");
    if (eid === exerciseId && date !== excludeDate) {
      if (!sessions[date]) sessions[date] = [];
      sessions[date].push({ set: Number(sn), ...logData[key] });
    }
  });
  const dates = Object.keys(sessions).sort((a, b) => b.localeCompare(a));
  for (const date of dates) {
    const sets = sessions[date].sort((a, b) => a.set - b.set);
    if (sets.length >= totalSets) return { date, sets };
  }
  if (dates.length > 0) return { date: dates[0], sets: sessions[dates[0]].sort((a, b) => a.set - b.set) };
  return null;
}

function getOverloadSuggestion(lastSession, repRange, increment, setNum) {
  if (!lastSession) return null;
  const setData = lastSession.sets.find((s) => s.set === setNum);
  if (!setData) return null;
  const { min, max } = repRange;
  const allHitMax = lastSession.sets.every((s) => s.reps >= max);
  if (allHitMax) {
    return { weight: setData.weight + increment, reps: min, reason: "LEVEL UP", detail: `Hit ${max} all sets → +${increment} lbs` };
  }
  const target = Math.min(setData.reps + 1, max);
  return {
    weight: setData.weight, reps: target,
    reason: target > setData.reps ? "+1 REP" : "HOLD",
    detail: `Last: ${setData.weight}×${setData.reps}`,
  };
}

function isPR(logData, exerciseId, weight, reps, todayKey) {
  let maxVol = 0, maxW = 0;
  Object.keys(logData).forEach((key) => {
    const [date, eid] = key.split("::");
    if (eid === exerciseId && date !== todayKey) {
      const d = logData[key];
      maxVol = Math.max(maxVol, d.weight * d.reps);
      maxW = Math.max(maxW, d.weight);
    }
  });
  return { volumePR: weight * reps > maxVol && maxVol > 0, weightPR: weight > maxW && maxW > 0 };
}

export default function WorkoutTracker() {
  const [currentDay, setCurrentDay] = useState(0);
  const [logData, setLogData] = useState({});
  const [activeExercise, setActiveExercise] = useState(null);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [warmupChecked, setWarmupChecked] = useState({});
  const [restRemaining, setRestRemaining] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error

  useEffect(() => {
    let data = null;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) data = JSON.parse(raw);
    } catch (e) {}
    if (!data) {
      try {
        const raw2 = localStorage.getItem("workout-log-v2");
        if (raw2) {
          data = JSON.parse(raw2);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        }
      } catch (e) {}
    }
    if (data) setLogData(data);
    setLoaded(true);
  }, []);

  const saveData = useCallback((data) => {
    setSaveStatus("saving");
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (e) {
      console.error("Save failed:", e);
      setSaveStatus("error");
    }
  }, []);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const iv = setInterval(() => {
      setRestRemaining((p) => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(iv);
  }, [restRemaining]);

  const todayKey = getToday();
  const dayName = DAYS[currentDay];
  const exercises = PROGRAM[dayName];

  const gk = (date, eid, sn) => `${date}::${eid}::${sn}`;
  const getSetData = (eid, sn) => logData[gk(todayKey, eid, sn)] || null;

  const logSet = (eid, sn, w, r) => {
    const updated = { ...logData, [gk(todayKey, eid, sn)]: { weight: Number(w), reps: Number(r), ts: Date.now() } };
    setLogData(updated);
    saveData(updated);
  };

  const clearSet = (eid, sn) => {
    const updated = { ...logData };
    delete updated[gk(todayKey, eid, sn)];
    setLogData(updated);
    saveData(updated);
  };

  const countDone = (eid, total) => {
    let c = 0; for (let i = 1; i <= total; i++) if (getSetData(eid, i)) c++; return c;
  };

  const startRest = (restStr) => {
    const sec = parseInt(restStr) * (restStr.includes("min") ? 60 : 1);
    setRestRemaining(sec || 60);
  };

  const getTodayVolume = () => {
    let v = 0;
    exercises.forEach((ex) => { for (let i = 1; i <= ex.sets; i++) { const d = getSetData(ex.id, i); if (d) v += d.weight * d.reps; } });
    return v;
  };
  const getPrevVolume = () => {
    let v = 0;
    exercises.forEach((ex) => { const s = getLastSession(logData, ex.id, ex.sets, todayKey); if (s) s.sets.forEach((d) => (v += d.weight * d.reps)); });
    return v;
  };

  const totalEx = exercises.length;
  const doneEx = exercises.filter((e) => countDone(e.id, e.sets) === e.sets).length;
  const todayVol = getTodayVolume();
  const prevVol = getPrevVolume();
  const delta = prevVol > 0 ? ((todayVol - prevVol) / prevVol * 100).toFixed(1) : null;

  if (!loaded) return <div style={S.loading}>Loading...</div>;

  return (
    <div style={S.container}>
      <div style={S.header}>
        <div style={S.headerTop}>
          <h1 style={S.title}>IRON<span style={S.accent}>FRAME</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saveStatus === "saving" && <span style={{ fontSize: 9, color: "#c45c3e" }}>saving...</span>}
            {saveStatus === "saved" && <span style={{ fontSize: 9, color: "#6abf47" }}>✓ saved</span>}
            {saveStatus === "error" && <span style={{ fontSize: 9, color: "#ff4444" }}>⚠ save failed</span>}
            <div style={S.dateTag}>{todayKey}</div>
          </div>
        </div>
        <div style={S.subtitle}>Push / Pull / Legs — Width & Mass</div>
      </div>

      <div style={S.daySelector}>
        {DAYS.map((d, i) => (
          <button key={i} onClick={() => { setCurrentDay(i); setActiveExercise(null); setWarmupOpen(false); setWarmupChecked({}); }}
            style={{ ...S.dayBtn, ...(i === currentDay ? S.dayBtnActive : {}) }}>
            {d.split("—")[0].trim().replace("Day ", "D")}
          </button>
        ))}
      </div>

      <div style={S.dayHeader}>
        <h2 style={S.dayTitle}>{dayName}</h2>
        <div style={S.progressBar}><div style={{ ...S.progressFill, width: `${(doneEx / totalEx) * 100}%` }} /></div>
        <div style={S.statsRow}>
          <span style={S.statLeft}>{doneEx}/{totalEx} exercises</span>
          <span style={S.statRight}>
            Vol: {todayVol.toLocaleString()}
            {delta !== null && todayVol > 0 && (
              <span style={{ color: Number(delta) >= 0 ? "#6abf47" : "#c45c3e", marginLeft: 4 }}>
                {Number(delta) >= 0 ? "▲" : "▼"}{Math.abs(Number(delta))}%
              </span>
            )}
          </span>
        </div>
      </div>

      {restRemaining > 0 && (
        <div style={S.restBanner}>
          <span style={S.restLabel}>REST</span>
          <span style={S.restTime}>{Math.floor(restRemaining / 60)}:{String(restRemaining % 60).padStart(2, "0")}</span>
          <button onClick={() => setRestRemaining(0)} style={S.skipBtn}>SKIP</button>
        </div>
      )}

      <div style={S.exList}>
        {/* Warm-Up Section */}
        {(() => {
          const wu = WARMUPS[DAY_WARMUP_MAP[currentDay]];
          if (!wu) return null;
          const allChecked = wu.moves.every((_, i) => warmupChecked[`${currentDay}-${i}`]);
          return (
            <div style={{ ...S.warmupCard, ...(allChecked ? S.warmupDone : {}) }}>
              <button onClick={() => setWarmupOpen(!warmupOpen)} style={S.warmupHeader}>
                <div style={S.exLeft}>
                  <div style={{ ...S.check, ...(allChecked ? S.checkDone : {}), background: allChecked ? "#1a2a14" : "#18130e", borderColor: allChecked ? "#4a8033" : "#c45c3e55" }}>
                    {allChecked ? "✓" : "W"}
                  </div>
                  <div>
                    <div style={S.warmupTitle}>{wu.label}</div>
                    <div style={S.exMeta}>{wu.moves.length} moves · ~{wu.time}</div>
                  </div>
                </div>
                <span style={{ color: "#333", fontSize: 10 }}>{warmupOpen ? "▲" : "▼"}</span>
              </button>
              {warmupOpen && (
                <div style={S.warmupBody}>
                  {wu.moves.map((move, i) => {
                    const key = `${currentDay}-${i}`;
                    const checked = !!warmupChecked[key];
                    return (
                      <button key={i} onClick={() => setWarmupChecked((prev) => ({ ...prev, [key]: !prev[key] }))}
                        style={{ ...S.warmupMove, opacity: checked ? 0.5 : 1 }}>
                        <div style={S.warmupCheck}>
                          {checked ? <span style={{ color: "#6abf47" }}>✓</span> : <span style={{ color: "#555" }}>{move.icon}</span>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ ...S.warmupMoveName, textDecoration: checked ? "line-through" : "none" }}>{move.name}</div>
                          <div style={S.warmupMoveDetail}>{move.detail}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {exercises.map((ex) => {
          const done = countDone(ex.id, ex.sets);
          const isOpen = activeExercise === ex.id;
          const isDone = done === ex.sets;
          const repRange = parseRepRange(ex.reps);
          const last = getLastSession(logData, ex.id, ex.sets, todayKey);

          return (
            <div key={ex.id} style={{ ...S.exCard, ...(isDone ? S.exCardDone : {}) }}>
              <button onClick={() => setActiveExercise(isOpen ? null : ex.id)} style={S.exHead}>
                <div style={S.exLeft}>
                  <div style={{ ...S.check, ...(isDone ? S.checkDone : {}) }}>
                    {isDone ? "✓" : `${done}/${ex.sets}`}
                  </div>
                  <div>
                    <div style={S.exName}>{ex.name}</div>
                    <div style={S.exMeta}>{ex.sets}×{ex.reps} · {ex.rest}</div>
                  </div>
                </div>
                <span style={{ color: "#333", fontSize: 10 }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {isOpen && (
                <div style={S.exBody}>
                  <div style={S.exNote}>{ex.note}</div>

                  {last && (() => {
                    const up = last.sets.every((s) => s.reps >= repRange.max);
                    return (
                      <div style={{ ...S.olBanner, borderColor: up ? "#4a803322" : "#c45c3e18", background: up ? "#0f120e" : "#12100e" }}>
                        <span style={{ color: up ? "#6abf47" : "#d4784a", fontWeight: 800, fontSize: 10, letterSpacing: 1 }}>
                          {up ? "⬆ LEVEL UP" : "→ BUILD REPS"}
                        </span>
                        <span style={{ color: "#666", fontSize: 10 }}>
                          {up ? `All sets hit ${repRange.max} → add ${ex.increment} lbs, reset to ${repRange.min} reps` : `Push for +1 rep per set at same weight`}
                        </span>
                      </div>
                    );
                  })()}

                  {Array.from({ length: ex.sets }, (_, i) => i + 1).map((sn) => {
                    const data = getSetData(ex.id, sn);
                    const baseSug = getOverloadSuggestion(last, repRange, ex.increment, sn);
                    const pr = data ? isPR(logData, ex.id, data.weight, data.reps, todayKey) : null;

                    // Intra-session autoregulation: check previous sets TODAY
                    let sug = baseSug;
                    if (!data && sn > 1) {
                      const prevSetData = getSetData(ex.id, sn - 1);
                      if (prevSetData) {
                        const prevReps = prevSetData.reps;
                        const prevWeight = prevSetData.weight;
                        if (prevReps < repRange.min - 1) {
                          // Fell 2+ below minimum → drop ~10%
                          const dropWeight = Math.round((prevWeight * 0.9) / 5) * 5;
                          sug = { weight: dropWeight, reps: repRange.min, reason: "↓ DROP", detail: `Only hit ${prevReps} reps → drop to ${dropWeight} lbs` };
                        } else if (prevReps > repRange.max) {
                          // Exceeded top of range → bump up
                          sug = { weight: prevWeight + ex.increment, reps: repRange.min, reason: "↑ BUMP", detail: `Hit ${prevReps} (above ${repRange.max}) → go heavier` };
                        } else if (prevReps < repRange.min) {
                          // 1 rep below minimum → slight drop ~5%
                          const dropWeight = Math.round((prevWeight * 0.95) / 5) * 5;
                          if (dropWeight < prevWeight) {
                            sug = { weight: dropWeight, reps: repRange.min, reason: "↓ EASE", detail: `Missed range by 1 → try ${dropWeight} lbs` };
                          }
                        }
                      }
                    }

                    return (
                      <SetRow key={sn} sn={sn} data={data} sug={sug} pr={pr} repRange={repRange}
                        onLog={(w, r) => { logSet(ex.id, sn, w, r); startRest(ex.rest); }}
                        onClear={() => clearSet(ex.id, sn)} />
                    );
                  })}

                  <History eid={ex.id} logData={logData} today={todayKey} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {doneEx === totalEx && (
        <div style={S.complete}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#6abf47", letterSpacing: 2 }}>SESSION COMPLETE</div>
          <div style={{ color: "#777", fontSize: 11, marginTop: 4 }}>
            Total Volume: {todayVol.toLocaleString()} lbs
            {delta !== null && <span style={{ color: Number(delta) >= 0 ? "#6abf47" : "#c45c3e", marginLeft: 6 }}>({Number(delta) >= 0 ? "+" : ""}{delta}%)</span>}
          </div>
        </div>
      )}

      <div style={S.footer}>Day 7 — Rest & Recover</div>
    </div>
  );
}

function SetRow({ sn, data, sug, pr, repRange, onLog, onClear }) {
  const [w, setW] = useState(data?.weight?.toString() || sug?.weight?.toString() || "");
  const [r, setR] = useState(data?.reps?.toString() || sug?.reps?.toString() || "");
  const [editing, setEditing] = useState(!data);

  useEffect(() => {
    if (data) { setW(data.weight.toString()); setR(data.reps.toString()); setEditing(false); }
  }, [data]);

  if (data && !editing) {
    return (
      <div style={S.setRow}>
        <div style={S.sn}>S{sn}</div>
        <div style={S.logged}>
          <span style={S.lw}>{data.weight}</span>
          <span style={S.lx}>×</span>
          <span style={S.lr}>{data.reps}</span>
          {data.reps < repRange.min && <span style={{ fontSize: 9, color: "#ff6b6b", marginLeft: 4 }}>▼ low</span>}
          {data.reps > repRange.max && <span style={{ fontSize: 9, color: "#6abf47", marginLeft: 4 }}>▲ easy</span>}
          {pr?.weightPR && <span style={S.prW}>🏆 PR</span>}
          {pr?.volumePR && !pr?.weightPR && <span style={S.prV}>⚡ Vol PR</span>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setEditing(true)} style={S.editBtn}>✎</button>
          <button onClick={() => { onClear(); setEditing(true); setR(sug?.reps?.toString() || ""); setW(sug?.weight?.toString() || ""); }} style={S.clrBtn}>✕</button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.setRowIn}>
      <div style={S.sn}>S{sn}</div>
      <div style={{ flex: 1 }}>
        {sug && (
          <div style={S.sugRow}>
            <span style={{ ...S.sugTag, color: 
              sug.reason === "LEVEL UP" ? "#6abf47" : 
              sug.reason === "+1 REP" ? "#d4784a" : 
              sug.reason === "↑ BUMP" ? "#6abf47" :
              sug.reason === "↓ DROP" ? "#ff6b6b" :
              sug.reason === "↓ EASE" ? "#ffaa44" :
              "#888" }}>{sug.reason}</span>
            <span style={S.sugDetail}>{sug.detail}</span>
          </div>
        )}
        <div style={S.inputs}>
          <input type="number" placeholder="lbs" value={w} onChange={(e) => setW(e.target.value)} style={S.inp} />
          <span style={{ color: "#444", fontSize: 11 }}>×</span>
          <input type="number" placeholder="reps" value={r} onChange={(e) => setR(e.target.value)} style={S.inp} />
          <button onClick={() => { if (w && r) onLog(w, r); }} style={{ ...S.logBtn, opacity: w && r ? 1 : 0.3 }}>LOG</button>
        </div>
      </div>
    </div>
  );
}

function History({ eid, logData, today }) {
  const dates = {};
  Object.keys(logData).forEach((k) => {
    const [d, e] = k.split("::");
    if (e === eid && d !== today) { if (!dates[d]) dates[d] = []; dates[d].push(logData[k]); }
  });
  const sorted = Object.keys(dates).sort((a, b) => b.localeCompare(a)).slice(0, 4);
  if (!sorted.length) return null;
  return (
    <div style={S.hist}>
      <div style={S.histLabel}>HISTORY</div>
      {sorted.map((d) => {
        const sets = dates[d];
        const top = Math.max(...sets.map((s) => s.weight));
        const vol = sets.reduce((a, s) => a + s.weight * s.reps, 0);
        return (
          <div key={d} style={S.histRow}>
            <span style={{ color: "#666", width: 44 }}>{d.slice(5)}</span>
            <span style={{ color: "#777", flex: 1 }}>{sets.map((s) => s.reps).join("/")}</span>
            <span style={{ color: "#555" }}>@{top} · {vol.toLocaleString()}</span>
          </div>
        );
      })}
    </div>
  );
}

const S = {
  container: { fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace", background: "#08080a", color: "#e8e6e1", minHeight: "100vh", maxWidth: 520, margin: "0 auto", paddingBottom: 40 },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#08080a", color: "#555", fontFamily: "monospace" },
  header: { padding: "24px 20px 14px", borderBottom: "1px solid #151518" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: 3, color: "#e8e6e1" },
  accent: { color: "#c45c3e" },
  dateTag: { fontSize: 11, color: "#555", background: "#111114", padding: "4px 10px", borderRadius: 4 },
  subtitle: { fontSize: 10, color: "#3a3a3f", marginTop: 5, letterSpacing: 1.5, textTransform: "uppercase" },
  daySelector: { display: "flex", gap: 3, padding: "12px 14px" },
  dayBtn: { flex: 1, background: "#0d0d10", border: "1px solid #1a1a1f", borderRadius: 6, color: "#555", padding: "10px 2px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700 },
  dayBtnActive: { background: "#1a1510", border: "1px solid #c45c3e", color: "#c45c3e" },
  dayHeader: { padding: "6px 20px 14px" },
  dayTitle: { margin: "0 0 8px", fontSize: 14, fontWeight: 700, color: "#aaa" },
  progressBar: { height: 3, background: "#151518", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#c45c3e,#d4784a)", borderRadius: 2, transition: "width 0.4s" },
  statsRow: { display: "flex", justifyContent: "space-between", marginTop: 6 },
  statLeft: { fontSize: 10, color: "#555" },
  statRight: { fontSize: 10, color: "#777", fontVariantNumeric: "tabular-nums" },
  restBanner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 14, background: "#1a1510", border: "1px solid #c45c3e33", margin: "0 14px 10px", borderRadius: 8, padding: "12px 20px" },
  restLabel: { fontSize: 11, color: "#c45c3e", fontWeight: 700, letterSpacing: 2 },
  restTime: { fontSize: 26, fontWeight: 800, color: "#e8e6e1", fontVariantNumeric: "tabular-nums" },
  skipBtn: { background: "none", border: "1px solid #333", color: "#888", padding: "4px 12px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: 10, letterSpacing: 1 },
  exList: { padding: "0 14px", display: "flex", flexDirection: "column", gap: 5 },
  exCard: { background: "#0d0d10", border: "1px solid #1a1a1f", borderRadius: 8, overflow: "hidden" },
  warmupCard: { background: "#0d0d10", border: "1px solid #c45c3e22", borderRadius: 8, overflow: "hidden" },
  warmupDone: { borderColor: "#253320", background: "#0b0e0a" },
  warmupHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 14px", background: "none", border: "none", color: "#e8e6e1", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  warmupTitle: { fontSize: 13, fontWeight: 700, color: "#d4784a", letterSpacing: 0.5 },
  warmupBody: { padding: "0 14px 10px", borderTop: "1px solid #1a1510" },
  warmupMove: { display: "flex", alignItems: "flex-start", gap: 10, padding: "8px 4px", width: "100%", background: "none", border: "none", borderBottom: "1px solid #111114", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "opacity 0.2s" },
  warmupCheck: { width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 1 },
  warmupMoveName: { fontSize: 12, fontWeight: 600, color: "#ccc" },
  warmupMoveDetail: { fontSize: 10, color: "#666", marginTop: 1 },
  exCardDone: { borderColor: "#253320", background: "#0b0e0a" },
  exHead: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "12px 14px", background: "none", border: "none", color: "#e8e6e1", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  exLeft: { display: "flex", alignItems: "center", gap: 10 },
  check: { width: 32, height: 32, borderRadius: "50%", border: "2px solid #282830", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#555", flexShrink: 0 },
  checkDone: { borderColor: "#4a8033", color: "#6abf47", background: "#1a2a14", fontSize: 14 },
  exName: { fontSize: 13, fontWeight: 600 },
  exMeta: { fontSize: 10, color: "#555", marginTop: 1 },
  exBody: { padding: "0 14px 14px", borderTop: "1px solid #151518" },
  exNote: { fontSize: 10, color: "#7a6a50", fontStyle: "italic", padding: "8px 0 6px", borderBottom: "1px dashed #1a1a1f", marginBottom: 4 },
  olBanner: { display: "flex", flexDirection: "column", gap: 2, padding: "7px 10px", margin: "4px 0 2px", borderRadius: 5, border: "1px solid" },
  setRow: { display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderBottom: "1px solid #111114" },
  setRowIn: { display: "flex", gap: 8, padding: "6px 0", borderBottom: "1px solid #111114" },
  sn: { fontSize: 10, color: "#444", width: 26, flexShrink: 0 },
  logged: { flex: 1, display: "flex", alignItems: "center", gap: 5 },
  lw: { fontSize: 14, fontWeight: 700, color: "#e8e6e1" },
  lx: { fontSize: 10, color: "#444" },
  lr: { fontSize: 14, fontWeight: 700, color: "#c45c3e" },
  prW: { fontSize: 9, color: "#f0c040", marginLeft: 4, fontWeight: 700 },
  prV: { fontSize: 9, color: "#d4784a", marginLeft: 4, fontWeight: 700 },
  editBtn: { background: "none", border: "1px solid #222", color: "#666", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
  clrBtn: { background: "none", border: "1px solid #2a1a1a", color: "#884040", borderRadius: 4, padding: "3px 7px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 },
  sugRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 3 },
  sugTag: { fontSize: 9, fontWeight: 800, letterSpacing: 1 },
  sugDetail: { fontSize: 9, color: "#555" },
  inputs: { display: "flex", alignItems: "center", gap: 5 },
  inp: { width: 52, background: "#08080a", border: "1px solid #222", borderRadius: 4, color: "#e8e6e1", padding: "7px 5px", fontSize: 13, fontFamily: "inherit", textAlign: "center", outline: "none" },
  logBtn: { background: "#c45c3e", border: "none", color: "#fff", padding: "7px 11px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 700, letterSpacing: 1 },
  hist: { marginTop: 8, padding: "6px 0 0", borderTop: "1px dashed #1a1a1f" },
  histLabel: { fontSize: 8, color: "#444", letterSpacing: 1.5, marginBottom: 3 },
  histRow: { display: "flex", gap: 8, fontSize: 10, color: "#555", padding: "2px 0" },
  complete: { margin: "14px", padding: "18px", borderRadius: 8, textAlign: "center", background: "#0b0e0a", border: "1px solid #253320" },
  footer: { textAlign: "center", padding: "24px 20px", fontSize: 10, color: "#222", letterSpacing: 1, textTransform: "uppercase" },
};
