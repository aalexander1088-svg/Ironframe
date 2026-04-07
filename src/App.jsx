import { useState, useEffect, useCallback, useRef } from "react";
import { PROGRAM, DAYS, WARMUPS, DAY_WARMUP_MAP, STORAGE_KEY, getToday, getWeekStart, addDaysISO, parseRepRange } from "./constants";

function findSessionDateForDay(logData, exercises, weekStart) {
  const exIds = new Set(exercises.map((e) => e.id));
  const weekEnd = addDaysISO(weekStart, 7);
  const dates = new Set();
  Object.keys(logData).forEach((key) => {
    const [date, eid] = key.split("::");
    if (exIds.has(eid) && date >= weekStart && date < weekEnd) dates.add(date);
  });
  const sorted = [...dates].sort().reverse();
  return sorted[0] || null;
}

function isDayCompleteThisWeek(logData, exercises, weekStart) {
  const sessionDate = findSessionDateForDay(logData, exercises, weekStart);
  if (!sessionDate) return false;
  return exercises.every((ex) => {
    for (let i = 1; i <= ex.sets; i++) {
      if (!logData[`${sessionDate}::${ex.id}::${i}`]) return false;
    }
    return true;
  });
}
import ProgressDashboard from "./ProgressDashboard";
import { supabaseEnabled, onAuthChange, signInWithEmail, signOut, fetchAllSets, syncDiff, mergeLogData } from "./supabase";

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
  const [page, setPage] = useState("tracker");
  const [currentDay, setCurrentDay] = useState(0);
  const [logData, setLogData] = useState({});
  const [activeExercise, setActiveExercise] = useState(null);
  const [warmupOpen, setWarmupOpen] = useState(false);
  const [warmupChecked, setWarmupChecked] = useState({});
  const [restRemaining, setRestRemaining] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [saveStatus, setSaveStatus] = useState("idle"); // idle | saving | saved | error
  const [celebrating, setCelebrating] = useState(false);
  const wasComplete = useRef(null);
  const [authUser, setAuthUser] = useState(null);
  const [syncStatus, setSyncStatus] = useState("idle"); // idle | syncing | synced | error
  const [authPanelOpen, setAuthPanelOpen] = useState(false);
  const [authEmail, setAuthEmail] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const lastSynced = useRef(null);

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
    // Write-through to Supabase if signed in
    if (supabaseEnabled && authUser) {
      const prev = lastSynced.current || {};
      setSyncStatus("syncing");
      syncDiff(prev, data, authUser.id).then((ok) => {
        if (ok !== false) {
          lastSynced.current = data;
          setSyncStatus("synced");
          setTimeout(() => setSyncStatus("idle"), 1500);
        } else {
          setSyncStatus("error");
        }
      });
    }
  }, [authUser]);

  // Auth listener
  useEffect(() => {
    if (!supabaseEnabled) return;
    const unsub = onAuthChange((user) => {
      setAuthUser(user);
    });
    return unsub;
  }, []);

  // Restore from cloud on sign-in — bidirectional merge
  useEffect(() => {
    if (!supabaseEnabled || !authUser || !loaded) return;
    let cancelled = false;
    setSyncStatus("syncing");
    fetchAllSets(authUser.id).then(async (cloud) => {
      if (cancelled || !cloud) { setSyncStatus("error"); return; }
      const merged = mergeLogData(logData, cloud);
      // Persist merged state locally if it differs
      if (JSON.stringify(merged) !== JSON.stringify(logData)) {
        setLogData(merged);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch {}
      }
      // Push any local-only (or newer-local) sets up to the cloud
      // by diffing cloud -> merged (anything cloud lacks gets upserted)
      const ok = await syncDiff(cloud, merged, authUser.id);
      if (cancelled) return;
      lastSynced.current = merged;
      setSyncStatus(ok === false ? "error" : "synced");
      setTimeout(() => setSyncStatus("idle"), 1500);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser, loaded]);

  useEffect(() => {
    if (restRemaining <= 0) return;
    const iv = setInterval(() => {
      setRestRemaining((p) => { if (p <= 1) { clearInterval(iv); return 0; } return p - 1; });
    }, 1000);
    return () => clearInterval(iv);
  }, [restRemaining]);

  const todayKey = getToday();
  const weekStart = getWeekStart();
  const dayName = DAYS[currentDay];
  const exercises = PROGRAM[dayName];
  const sessionDate = findSessionDateForDay(logData, exercises, weekStart) || todayKey;

  const gk = (date, eid, sn) => `${date}::${eid}::${sn}`;
  const getSetData = (eid, sn) => logData[gk(sessionDate, eid, sn)] || null;

  const logSet = (eid, sn, w, r) => {
    const updated = { ...logData, [gk(sessionDate, eid, sn)]: { weight: Number(w), reps: Number(r), ts: Date.now() } };
    setLogData(updated);
    saveData(updated);
  };

  const clearSet = (eid, sn) => {
    const updated = { ...logData };
    delete updated[gk(sessionDate, eid, sn)];
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
    exercises.forEach((ex) => { const s = getLastSession(logData, ex.id, ex.sets, sessionDate); if (s) s.sets.forEach((d) => (v += d.weight * d.reps)); });
    return v;
  };

  const totalEx = exercises.length;
  const doneEx = exercises.filter((e) => countDone(e.id, e.sets) === e.sets).length;

  useEffect(() => {
    const isComplete = totalEx > 0 && doneEx === totalEx;
    if (wasComplete.current === false && isComplete) {
      setCelebrating(true);
      const t = setTimeout(() => setCelebrating(false), 4500);
      wasComplete.current = isComplete;
      return () => clearTimeout(t);
    }
    wasComplete.current = isComplete;
  }, [doneEx, totalEx, currentDay]);
  const todayVol = getTodayVolume();
  const prevVol = getPrevVolume();
  const delta = prevVol > 0 ? ((todayVol - prevVol) / prevVol * 100).toFixed(1) : null;

  if (!loaded) return <div style={S.loading}>Loading...</div>;

  return (
    <div style={S.container}>
      <style>{`
@keyframes ironforge-ember {
  0%, 100% { box-shadow: inset 0 1px 0 #6abf4799, 0 0 14px #6abf4755, 0 2px 4px #00000099; }
  50% { box-shadow: inset 0 1px 0 #6abf47cc, 0 0 22px #6abf4799, 0 2px 4px #00000099; }
}
@keyframes ironforge-ignite {
  0% { box-shadow: 0 0 0 #6abf4700, inset 0 1px 0 #6abf4733, 0 4px 16px #00000099; transform: scale(0.96); }
  20% { box-shadow: 0 0 60px #ffd060cc, 0 0 120px #e87b4d88, inset 0 1px 0 #ffe8a0aa, 0 4px 24px #00000099; transform: scale(1.02); border-color: #ffd060; }
  45% { box-shadow: 0 0 80px #f5a060aa, 0 0 140px #c45c3e66, inset 0 1px 0 #ffd060cc, 0 4px 20px #00000099; border-color: #f5a060; }
  100% { box-shadow: 0 0 36px #6abf4744, inset 0 1px 0 #6abf4799, 0 4px 16px #00000099; transform: scale(1); border-color: #6abf47; }
}
@keyframes ironforge-shine {
  0% { background-position: -200% center; }
  100% { background-position: 200% center; }
}
@keyframes ironforge-spark {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  10% { opacity: 1; }
  100% { transform: translateY(-80px) scale(0.3); opacity: 0; }
}
.ironforge-celebrate {
  animation: ironforge-ignite 1.6s cubic-bezier(0.2, 0.8, 0.2, 1) 1;
}
.ironforge-celebrate-text {
  background: linear-gradient(90deg, #6abf47 0%, #ffd060 25%, #f5a060 50%, #ffd060 75%, #6abf47 100%);
  background-size: 200% auto;
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: ironforge-shine 2.4s linear 1;
}
.ironforge-spark {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: radial-gradient(circle, #ffd060 0%, #e87b4d 60%, transparent 100%);
  box-shadow: 0 0 8px #ffd060, 0 0 16px #e87b4d;
  pointer-events: none;
}
.ironforge-spark.s1 { left: 12%; bottom: 10px; animation: ironforge-spark 1.6s ease-out 0.1s 1 forwards; }
.ironforge-spark.s2 { left: 28%; bottom: 14px; animation: ironforge-spark 2.0s ease-out 0.0s 1 forwards; }
.ironforge-spark.s3 { left: 46%; bottom: 6px;  animation: ironforge-spark 1.8s ease-out 0.3s 1 forwards; }
.ironforge-spark.s4 { left: 62%; bottom: 12px; animation: ironforge-spark 2.2s ease-out 0.15s 1 forwards; }
.ironforge-spark.s5 { left: 78%; bottom: 8px;  animation: ironforge-spark 1.9s ease-out 0.4s 1 forwards; }
.ironforge-spark.s6 { left: 88%; bottom: 14px; animation: ironforge-spark 2.1s ease-out 0.25s 1 forwards; }
@keyframes ironforge-logbtn-sweep {
  0% { transform: translateX(-120%) skewX(-20deg); }
  100% { transform: translateX(220%) skewX(-20deg); }
}
.ironforge-logbtn::after {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 40%;
  height: 100%;
  background: linear-gradient(90deg, transparent, #ffffff44, transparent);
  animation: ironforge-logbtn-sweep 2.8s ease-in-out infinite;
  pointer-events: none;
}
      `}</style>
      <div style={S.header}>
        <div style={S.headerTop}>
          <h1 style={S.title}>IRON<span style={S.accent}>FRAME</span></h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {saveStatus === "saving" && <span style={{ fontSize: 9, color: "#c45c3e" }}>saving...</span>}
            {saveStatus === "saved" && <span style={{ fontSize: 9, color: "#6abf47" }}>✓ saved</span>}
            {saveStatus === "error" && <span style={{ fontSize: 9, color: "#ff4444" }}>⚠ save failed</span>}
            {supabaseEnabled && (
              <button
                onClick={() => setAuthPanelOpen((o) => !o)}
                title={authUser ? `Signed in as ${authUser.email}` : "Back up to cloud"}
                style={{
                  background: authUser
                    ? "linear-gradient(180deg, #1f2c14 0%, #0d150a 100%)"
                    : "linear-gradient(180deg, #1f1a14 0%, #0c0805 100%)",
                  border: `1px solid ${authUser ? "#5a9038" : "#3a2c20"}`,
                  color: authUser ? "#9bd070" : "#c8b89a",
                  fontFamily: "inherit",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 1,
                  padding: "5px 9px",
                  borderRadius: 4,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 #ffffff15, 0 1px 3px #00000088",
                }}
              >
                {syncStatus === "syncing" ? "⟳ SYNC" : authUser ? "☁ ON" : "☁ OFF"}
              </button>
            )}
            <div style={S.dateTag}>{sessionDate}</div>
          </div>
        </div>
        <div style={S.subtitle}>Push / Pull / Legs — Width & Mass</div>
      </div>

      {supabaseEnabled && authPanelOpen && (
        <div style={{
          margin: "12px 14px 0",
          padding: "14px 16px",
          borderRadius: 8,
          background: "linear-gradient(180deg, #1a140e 0%, #0e0a07 100%)",
          border: "1px solid #3a2c20",
          boxShadow: "inset 0 1px 0 #4a3a2a, 0 2px 8px #00000099",
        }}>
          {authUser ? (
            <div>
              <div style={{ fontSize: 9, color: "#a89880", letterSpacing: 1.5, fontWeight: 800, marginBottom: 6 }}>CLOUD BACKUP</div>
              <div style={{ fontSize: 12, color: "#e8e1d3", fontWeight: 600, marginBottom: 10 }}>{authUser.email}</div>
              <button
                onClick={async () => { await signOut(); setAuthPanelOpen(false); setAuthMsg(""); }}
                style={{
                  background: "linear-gradient(180deg, #2a1414 0%, #1a0808 100%)",
                  border: "1px solid #6a2828",
                  color: "#e07878",
                  fontFamily: "inherit",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 1,
                  padding: "7px 14px",
                  borderRadius: 5,
                  cursor: "pointer",
                  boxShadow: "inset 0 1px 0 #6a3030, 0 1px 3px #00000088",
                }}
              >SIGN OUT</button>
            </div>
          ) : (
            <div>
              <div style={{ fontSize: 9, color: "#a89880", letterSpacing: 1.5, fontWeight: 800, marginBottom: 6 }}>BACK UP TO CLOUD</div>
              <div style={{ fontSize: 10, color: "#9a8c75", marginBottom: 10, lineHeight: 1.5 }}>
                Enter your email — we'll send you a magic link. Tap it to sign in.
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  style={{
                    flex: 1,
                    background: "linear-gradient(180deg, #050302 0%, #0a0805 100%)",
                    border: "1px solid #4a3a2a",
                    borderRadius: 5,
                    color: "#f5ede0",
                    padding: "9px 10px",
                    fontSize: 12,
                    fontFamily: "inherit",
                    fontWeight: 600,
                    outline: "none",
                    boxShadow: "inset 0 2px 4px #00000099",
                  }}
                />
                <button
                  onClick={async () => {
                    if (!authEmail) return;
                    setAuthMsg("Sending...");
                    const { error } = await signInWithEmail(authEmail);
                    setAuthMsg(error ? `Error: ${error.message || error}` : "✓ Check your email for the link");
                  }}
                  style={{
                    background: "linear-gradient(180deg, #f08858 0%, #c45c3e 50%, #8a3018 100%)",
                    border: "1px solid #6a2810",
                    color: "#fff",
                    fontFamily: "inherit",
                    fontSize: 10,
                    fontWeight: 900,
                    letterSpacing: 1.5,
                    padding: "9px 14px",
                    borderRadius: 5,
                    cursor: "pointer",
                    boxShadow: "inset 0 1px 0 #ffaa7799, 0 0 12px #c45c3e44, 0 2px 4px #00000099",
                    textShadow: "0 1px 2px #00000088",
                  }}
                >SEND</button>
              </div>
              {authMsg && <div style={{ fontSize: 10, color: authMsg.startsWith("✓") ? "#9bd070" : "#e87b4d", marginTop: 8, fontWeight: 600 }}>{authMsg}</div>}
            </div>
          )}
        </div>
      )}

      <div style={S.pageSelector}>
        <button onClick={() => setPage("tracker")} style={{ ...S.pageBtn, ...(page === "tracker" ? S.pageBtnActive : {}) }}>TRACKER</button>
        <button onClick={() => setPage("progress")} style={{ ...S.pageBtn, ...(page === "progress" ? S.pageBtnActive : {}) }}>PROGRESS</button>
      </div>

      {page === "progress" && <ProgressDashboard logData={logData} />}

      {page === "tracker" && <>
      <div style={S.daySelector}>
        {DAYS.map((d, i) => {
          const dayComplete = isDayCompleteThisWeek(logData, PROGRAM[d], weekStart);
          const isActive = i === currentDay;
          return (
            <button key={i} onClick={() => { setCurrentDay(i); setActiveExercise(null); setWarmupOpen(false); setWarmupChecked({}); }}
              style={{ ...S.dayBtn, ...(dayComplete ? S.dayBtnDone : {}), ...(isActive ? (dayComplete ? S.dayBtnDoneActive : S.dayBtnActive) : {}) }}>
              {d.split("—")[0].trim().replace("Day ", "D")}{dayComplete ? " ✓" : ""}
            </button>
          );
        })}
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

      {prevVol > 0 && todayVol >= 0 && (() => {
        const pct = Math.min((todayVol / prevVol) * 100, 150);
        const beat = todayVol >= prevVol;
        const barColor = beat ? "linear-gradient(90deg,#4a8033,#6abf47)" : "linear-gradient(90deg,#c45c3e,#d4784a)";
        const borderColor = beat ? "#3a6630" : "#c45c3e33";
        const labelColor = beat ? "#6abf47" : "#c45c3e";
        return (
          <div style={{ ...S.volTarget, borderColor }}>
            <div style={{ ...S.volTargetLabel, color: labelColor }}>
              {beat ? "NEW RECORD" : "BEAT YOUR BEST"}
            </div>
            <div style={S.volTargetBar}>
              <div style={{ ...S.volTargetFill, width: `${Math.min(pct, 100)}%`, background: barColor, boxShadow: beat ? "0 0 8px #6abf4744" : "0 0 8px #c45c3e33" }} />
            </div>
            <div style={S.volTargetStats}>
              <span style={{ color: "#999" }}>{todayVol.toLocaleString()} / {prevVol.toLocaleString()}</span>
              <span style={{ color: labelColor, fontWeight: 700 }}>{pct.toFixed(0)}%</span>
            </div>
          </div>
        );
      })()}

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
          const last = getLastSession(logData, ex.id, ex.sets, sessionDate);

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
                    const pr = data ? isPR(logData, ex.id, data.weight, data.reps, sessionDate) : null;

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

                  <History eid={ex.id} logData={logData} today={sessionDate} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {doneEx === totalEx && (() => {
        // Count PRs this session
        let weightPRs = 0, volPRs = 0;
        const topLifts = [];
        exercises.forEach((ex) => {
          let heaviest = null;
          for (let i = 1; i <= ex.sets; i++) {
            const d = getSetData(ex.id, i);
            if (d) {
              const pr = isPR(logData, ex.id, d.weight, d.reps, todayKey);
              if (pr.weightPR) weightPRs++;
              if (pr.volumePR) volPRs++;
              if (!heaviest || d.weight > heaviest.weight) heaviest = d;
            }
          }
          if (heaviest) topLifts.push({ name: ex.name, weight: heaviest.weight, reps: heaviest.reps });
        });
        const nextDayIdx = (currentDay + 1) % DAYS.length;
        const nextDayName = DAYS[nextDayIdx];

        return (
          <div style={S.complete} className={celebrating ? "ironforge-celebrate" : ""}>
            {celebrating && (
              <>
                <span className="ironforge-spark s1" />
                <span className="ironforge-spark s2" />
                <span className="ironforge-spark s3" />
                <span className="ironforge-spark s4" />
                <span className="ironforge-spark s5" />
                <span className="ironforge-spark s6" />
              </>
            )}
            <div style={S.completeTitle} className={celebrating ? "ironforge-celebrate-text" : ""}>SESSION FORGED</div>
            <div style={S.completeVol}>
              Total Volume: {todayVol.toLocaleString()} lbs
              {delta !== null && <span style={{ color: Number(delta) >= 0 ? "#6abf47" : "#c45c3e", marginLeft: 6, fontWeight: 700 }}>({Number(delta) >= 0 ? "+" : ""}{delta}%)</span>}
            </div>

            {(weightPRs > 0 || volPRs > 0) && (
              <div style={S.recapSection}>
                <div style={S.recapLabel}>PRs THIS SESSION</div>
                {weightPRs > 0 && <div style={S.recapRow}><span style={{ color: "#f0c040" }}>Weight PRs</span><span style={{ color: "#f0c040", fontWeight: 700 }}>{weightPRs}</span></div>}
                {volPRs > 0 && <div style={S.recapRow}><span style={{ color: "#d4784a" }}>Volume PRs</span><span style={{ color: "#d4784a", fontWeight: 700 }}>{volPRs}</span></div>}
              </div>
            )}

            <div style={S.recapSection}>
              <div style={S.recapLabel}>TOP LIFTS</div>
              {topLifts.map((l) => (
                <div key={l.name} style={S.recapRow}>
                  <span style={{ color: "#999", flex: 1 }}>{l.name}</span>
                  <span style={{ color: "#f0eeea", fontWeight: 700 }}>{l.weight}<span style={{ color: "#666", fontWeight: 400 }}> x{l.reps}</span></span>
                </div>
              ))}
            </div>

            <div style={S.recapNext}>
              <div style={{ fontSize: 8, color: "#555", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>NEXT UP</div>
              <div style={{ fontSize: 12, color: "#c45c3e", fontWeight: 700 }}>{nextDayName}</div>
            </div>
          </div>
        );
      })()}

      <div style={S.footer}>Day 7 — Rest & Recover</div>
      </>}
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
          <button onClick={() => { if (w && r) onLog(w, r); }} className="ironforge-logbtn" style={{ ...S.logBtn, opacity: w && r ? 1 : 0.3 }}>LOG</button>
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
  container: { fontFamily: "'JetBrains Mono','SF Mono','Fira Code',monospace", background: "radial-gradient(ellipse 80% 60% at 50% 0%, #1a120c 0%, #0c0805 50%, #060403 100%)", color: "#e8e1d3", minHeight: "100vh", maxWidth: 520, margin: "0 auto", paddingBottom: 40 },
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#060403", color: "#e87b4d", fontFamily: "monospace", fontSize: 14, letterSpacing: 2 },
  header: { padding: "26px 20px 16px", borderBottom: "1px solid #2a201a", background: "linear-gradient(180deg, #1c140e 0%, #0e0a07 100%)", boxShadow: "inset 0 1px 0 #3a2c20, inset 0 -1px 0 #2a201a, 0 4px 14px #00000099" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 26, fontWeight: 900, letterSpacing: 5, color: "#f5ede0", textShadow: "0 1px 0 #00000099, 0 0 18px #c45c3e22" },
  accent: { color: "#e87b4d", textShadow: "0 0 14px #c45c3e88, 0 0 28px #c45c3e44, 0 1px 0 #00000099" },
  dateTag: { fontSize: 11, color: "#c8b89a", background: "linear-gradient(180deg, #1a1612 0%, #0e0a07 100%)", padding: "5px 12px", borderRadius: 4, border: "1px solid #2c241c", boxShadow: "inset 0 1px 0 #3a2c20, 0 1px 2px #00000099", fontWeight: 600, letterSpacing: 0.5 },
  subtitle: { fontSize: 10, color: "#8a7a60", marginTop: 6, letterSpacing: 2, textTransform: "uppercase", fontWeight: 600 },
  pageSelector: { display: "flex", gap: 6, padding: "14px 14px 0" },
  pageBtn: { flex: 1, background: "linear-gradient(180deg, #1f1a14 0%, #14100c 50%, #0c0805 100%)", border: "1px solid #3a2c20", borderRadius: 6, color: "#c8b89a", padding: "13px 2px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, letterSpacing: 1.8, textAlign: "center", transition: "all 0.2s", boxShadow: "inset 0 1px 0 #4a3a2a, 0 2px 4px #00000099, 0 1px 0 #00000066" },
  pageBtnActive: { background: "linear-gradient(180deg, #4a2412 0%, #2e1610 50%, #1a0c08 100%)", border: "1px solid #c45c3e", color: "#ffc89c", boxShadow: "inset 0 1px 0 #d4784a88, 0 0 18px #c45c3e55, 0 2px 6px #00000099, inset 0 -1px 0 #00000088", textShadow: "0 0 10px #c45c3e88, 0 1px 0 #00000099" },
  daySelector: { display: "flex", gap: 5, padding: "14px 14px" },
  dayBtn: { flex: 1, background: "linear-gradient(180deg, #1f1a14 0%, #14100c 50%, #0c0805 100%)", border: "1px solid #3a2c20", borderRadius: 6, color: "#c8b89a", padding: "13px 2px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, letterSpacing: 1, transition: "all 0.2s", boxShadow: "inset 0 1px 0 #4a3a2a, 0 2px 4px #00000099, 0 1px 0 #00000066" },
  dayBtnActive: { background: "linear-gradient(180deg, #4a2412 0%, #2e1610 50%, #1a0c08 100%)", border: "1px solid #c45c3e", color: "#ffc89c", boxShadow: "inset 0 1px 0 #d4784a88, 0 0 18px #c45c3e55, 0 2px 6px #00000099, inset 0 -1px 0 #00000088", textShadow: "0 0 10px #c45c3e88, 0 1px 0 #00000099" },
  dayBtnDone: { background: "linear-gradient(180deg, #1f2c14 0%, #14200d 50%, #0a140a 100%)", border: "1px solid #5a9038", color: "#9bd070", boxShadow: "inset 0 1px 0 #6abf4766, 0 0 14px #6abf4733, 0 2px 4px #00000099, inset 0 -1px 0 #00000088", textShadow: "0 0 8px #6abf4766, 0 1px 0 #00000099" },
  dayBtnDoneActive: { background: "linear-gradient(180deg, #2e3e1a 0%, #1f2c14 50%, #15200d 100%)", border: "1px solid #6abf47", color: "#bfee98", boxShadow: "inset 0 1px 0 #6abf47aa, 0 0 22px #6abf4766, 0 2px 6px #00000099, inset 0 -1px 0 #00000088", textShadow: "0 0 12px #6abf4799, 0 1px 0 #00000099" },
  dayHeader: { padding: "10px 20px 14px" },
  dayTitle: { margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#f0e8d8", letterSpacing: 1, textShadow: "0 1px 0 #00000099" },
  progressBar: { height: 6, background: "linear-gradient(180deg, #050302 0%, #0a0805 100%)", borderRadius: 3, overflow: "hidden", boxShadow: "inset 0 2px 3px #000000cc, inset 0 -1px 0 #2a201a", border: "1px solid #1a140e" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#c45c3e,#e87b4d,#f5a060)", borderRadius: 2, transition: "width 0.4s", boxShadow: "0 0 14px #c45c3e88, inset 0 1px 0 #ffffff44" },
  statsRow: { display: "flex", justifyContent: "space-between", marginTop: 10 },
  statLeft: { fontSize: 10, color: "#a89880", fontWeight: 600 },
  statRight: { fontSize: 10, color: "#c8b89a", fontVariantNumeric: "tabular-nums", fontWeight: 600 },
  volTarget: { margin: "0 14px 10px", padding: "12px 14px", borderRadius: 8, border: "1px solid", overflow: "hidden", boxShadow: "inset 0 1px 0 #ffffff0c, 0 2px 6px #00000088" },
  volTargetLabel: { fontSize: 9, fontWeight: 800, letterSpacing: 1.5, marginBottom: 6 },
  volTargetBar: { height: 6, background: "#050302", borderRadius: 3, overflow: "hidden", marginBottom: 4, boxShadow: "inset 0 2px 3px #000000cc" },
  volTargetFill: { height: "100%", borderRadius: 3, transition: "width 0.3s" },
  volTargetStats: { display: "flex", justifyContent: "space-between", fontSize: 10 },
  restBanner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 18, background: "linear-gradient(180deg, #2e1812 0%, #1a0e0a 100%)", border: "1px solid #c45c3e88", margin: "0 14px 10px", borderRadius: 10, padding: "16px 22px", boxShadow: "0 0 28px #c45c3e33, inset 0 1px 0 #d4784a55, inset 0 -1px 0 #00000088, 0 4px 12px #00000099" },
  restLabel: { fontSize: 12, color: "#ffaa78", fontWeight: 800, letterSpacing: 3, textShadow: "0 0 12px #c45c3e88, 0 1px 0 #00000099" },
  restTime: { fontSize: 32, fontWeight: 900, color: "#f5ede0", fontVariantNumeric: "tabular-nums", textShadow: "0 0 14px #c45c3e88, 0 1px 0 #00000099" },
  skipBtn: { background: "linear-gradient(180deg, #1c1814 0%, #0e0a07 100%)", border: "1px solid #5a4838", color: "#c8b89a", padding: "6px 16px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontSize: 10, letterSpacing: 1.5, fontWeight: 700, boxShadow: "inset 0 1px 0 #4a3a2a, 0 2px 4px #00000088" },
  exList: { padding: "0 14px", display: "flex", flexDirection: "column", gap: 8 },
  exCard: { background: "linear-gradient(180deg, #1a140e 0%, #0e0a07 100%)", border: "1px solid #2c241c", borderRadius: 8, overflow: "hidden", transition: "border-color 0.3s, box-shadow 0.3s", boxShadow: "inset 0 1px 0 #3a2c20, 0 2px 8px #00000099, 0 1px 0 #00000066" },
  warmupCard: { background: "linear-gradient(180deg, #1c140e 0%, #0e0a07 100%)", border: "1px solid #c45c3e55", borderRadius: 8, overflow: "hidden", boxShadow: "inset 0 1px 0 #c45c3e22, 0 2px 8px #00000099" },
  warmupDone: { borderColor: "#5a9038", background: "linear-gradient(180deg, #1a2614 0%, #0a140a 100%)", boxShadow: "inset 0 1px 0 #6abf4744, 0 2px 8px #00000099" },
  warmupHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "16px 18px", background: "none", border: "none", color: "#e8e1d3", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  warmupTitle: { fontSize: 13, fontWeight: 800, color: "#ffaa78", letterSpacing: 1, textShadow: "0 1px 0 #00000099, 0 0 8px #c45c3e44" },
  warmupBody: { padding: "0 18px 14px", borderTop: "1px solid #2a1f18" },
  warmupMove: { display: "flex", alignItems: "flex-start", gap: 10, padding: "10px 4px", width: "100%", background: "none", border: "none", borderBottom: "1px solid #1a1612", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "opacity 0.2s" },
  warmupCheck: { width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 1 },
  warmupMoveName: { fontSize: 12, fontWeight: 600, color: "#e8e1d3" },
  warmupMoveDetail: { fontSize: 10, color: "#9a8c75", marginTop: 2 },
  exCardDone: { borderColor: "#5a9038", background: "linear-gradient(180deg, #1a2614 0%, #0a140a 100%)", boxShadow: "inset 0 1px 0 #6abf4744, 0 0 18px #6abf4722, 0 2px 8px #00000099" },
  exHead: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "16px 18px", background: "none", border: "none", color: "#e8e1d3", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  exLeft: { display: "flex", alignItems: "center", gap: 14 },
  check: { width: 38, height: 38, borderRadius: "50%", border: "2px solid #5a4838", background: "linear-gradient(180deg, #1c1814 0%, #0e0a07 100%)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#a89880", flexShrink: 0, transition: "all 0.3s", fontWeight: 700, boxShadow: "inset 0 1px 0 #3a2c20, 0 2px 4px #00000099" },
  checkDone: { borderColor: "#6abf47", color: "#bfee98", background: "linear-gradient(180deg, #2e3e1a 0%, #14200d 100%)", fontSize: 16, boxShadow: "inset 0 1px 0 #6abf4799, 0 0 14px #6abf4755, 0 2px 4px #00000099", textShadow: "0 0 10px #6abf4799", animation: "ironforge-ember 2.4s ease-in-out infinite" },
  exName: { fontSize: 14, fontWeight: 700, color: "#f0e8d8", letterSpacing: 0.3 },
  exMeta: { fontSize: 10, color: "#a89880", marginTop: 3, fontWeight: 500 },
  exBody: { padding: "0 18px 16px", borderTop: "1px solid #2a1f18" },
  exNote: { fontSize: 10, color: "#c8a878", fontStyle: "italic", padding: "10px 0 8px", borderBottom: "1px dashed #2c241c", marginBottom: 6 },
  olBanner: { display: "flex", flexDirection: "column", gap: 3, padding: "9px 13px", margin: "8px 0 4px", borderRadius: 6, border: "1px solid", boxShadow: "inset 0 1px 0 #ffffff0c, 0 1px 3px #00000088" },
  setRow: { display: "flex", alignItems: "center", gap: 8, padding: "10px 0", borderBottom: "1px solid #1a1612" },
  setRowIn: { display: "flex", gap: 8, padding: "10px 0", borderBottom: "1px solid #1a1612" },
  sn: { fontSize: 10, color: "#a89880", width: 26, flexShrink: 0, fontWeight: 700, letterSpacing: 0.5 },
  logged: { flex: 1, display: "flex", alignItems: "center", gap: 6 },
  lw: { fontSize: 16, fontWeight: 800, color: "#f5ede0", textShadow: "0 1px 0 #00000099" },
  lx: { fontSize: 11, color: "#7a6a55" },
  lr: { fontSize: 16, fontWeight: 800, color: "#e87b4d", textShadow: "0 0 10px #c45c3e55, 0 1px 0 #00000099" },
  prW: { fontSize: 9, color: "#ffd060", marginLeft: 6, fontWeight: 800, background: "linear-gradient(180deg, #4a3812 0%, #2a1f08 100%)", padding: "3px 7px", borderRadius: 3, letterSpacing: 0.5, border: "1px solid #6a5018", boxShadow: "inset 0 1px 0 #ffd06044, 0 1px 2px #00000088" },
  prV: { fontSize: 9, color: "#ffaa78", marginLeft: 6, fontWeight: 800, background: "linear-gradient(180deg, #3a1e10 0%, #1a0e08 100%)", padding: "3px 7px", borderRadius: 3, letterSpacing: 0.5, border: "1px solid #6a3220", boxShadow: "inset 0 1px 0 #c45c3e44, 0 1px 2px #00000088" },
  editBtn: { background: "linear-gradient(180deg, #1c1814 0%, #0e0a07 100%)", border: "1px solid #5a4838", color: "#c8b89a", borderRadius: 5, padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", fontSize: 12, boxShadow: "inset 0 1px 0 #4a3a2a, 0 1px 3px #00000088" },
  clrBtn: { background: "linear-gradient(180deg, #2a1414 0%, #1a0808 100%)", border: "1px solid #6a2828", color: "#e07878", borderRadius: 5, padding: "5px 9px", cursor: "pointer", fontFamily: "inherit", fontSize: 11, boxShadow: "inset 0 1px 0 #6a3030, 0 1px 3px #00000088" },
  sugRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 5 },
  sugTag: { fontSize: 9, fontWeight: 800, letterSpacing: 1, textShadow: "0 1px 0 #00000099" },
  sugDetail: { fontSize: 9, color: "#9a8c75" },
  inputs: { display: "flex", alignItems: "center", gap: 6 },
  inp: { width: 60, background: "linear-gradient(180deg, #050302 0%, #0a0805 100%)", border: "1px solid #4a3a2a", borderRadius: 5, color: "#f5ede0", padding: "9px 5px", fontSize: 14, fontFamily: "inherit", textAlign: "center", outline: "none", fontWeight: 700, boxShadow: "inset 0 2px 4px #00000099, inset 0 -1px 0 #2a201a" },
  logBtn: { position: "relative", overflow: "hidden", background: "linear-gradient(180deg, #f08858 0%, #c45c3e 50%, #8a3018 100%)", border: "1px solid #6a2810", color: "#fff", padding: "9px 18px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 900, letterSpacing: 1.8, boxShadow: "inset 0 1px 0 #ffaa7799, 0 0 16px #c45c3e66, 0 2px 6px #00000099, inset 0 -1px 0 #00000088", textShadow: "0 1px 2px #00000088" },
  hist: { marginTop: 12, padding: "10px 0 0", borderTop: "1px dashed #2c241c" },
  histLabel: { fontSize: 9, color: "#a89880", letterSpacing: 1.5, marginBottom: 5, fontWeight: 800 },
  histRow: { display: "flex", gap: 8, fontSize: 10, color: "#9a8c75", padding: "3px 0", fontWeight: 500 },
  complete: { position: "relative", overflow: "hidden", margin: "16px 14px", padding: "26px 22px", borderRadius: 12, background: "linear-gradient(180deg, #1f2c14 0%, #0f1a0c 100%)", border: "1px solid #6abf47", boxShadow: "0 0 36px #6abf4733, inset 0 1px 0 #6abf4766, 0 4px 16px #00000099, inset 0 -1px 0 #00000088" },
  completeTitle: { fontSize: 20, fontWeight: 900, color: "#bfee98", letterSpacing: 4, textShadow: "0 0 16px #6abf47aa, 0 0 28px #6abf4755, 0 1px 0 #00000099", textAlign: "center" },
  completeVol: { color: "#c8b89a", fontSize: 12, marginTop: 8, textAlign: "center", fontWeight: 600 },
  recapSection: { marginTop: 16, paddingTop: 14, borderTop: "1px solid #2a3a1c" },
  recapLabel: { fontSize: 9, color: "#8a9a78", letterSpacing: 1.5, fontWeight: 800, marginBottom: 6 },
  recapRow: { display: "flex", justifyContent: "space-between", padding: "5px 0", fontSize: 11, color: "#c8b89a" },
  recapNext: { marginTop: 14, padding: "12px 14px", background: "linear-gradient(180deg, #14100c 0%, #0a0805 100%)", borderRadius: 6, border: "1px solid #3a2c20", textAlign: "center", boxShadow: "inset 0 1px 0 #4a3a2a, 0 1px 3px #00000088" },
  footer: { textAlign: "center", padding: "26px 20px", fontSize: 10, color: "#5a4838", letterSpacing: 2, textTransform: "uppercase", fontWeight: 700 },
};
