import { useState, useEffect, useCallback } from "react";
import { PROGRAM, DAYS, WARMUPS, DAY_WARMUP_MAP, STORAGE_KEY, getToday, parseRepRange } from "./constants";
import ProgressDashboard from "./ProgressDashboard";

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

      <div style={S.pageSelector}>
        <button onClick={() => setPage("tracker")} style={{ ...S.pageBtn, ...(page === "tracker" ? S.pageBtnActive : {}) }}>TRACKER</button>
        <button onClick={() => setPage("progress")} style={{ ...S.pageBtn, ...(page === "progress" ? S.pageBtnActive : {}) }}>PROGRESS</button>
      </div>

      {page === "progress" && <ProgressDashboard logData={logData} />}

      {page === "tracker" && <>
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
          <div style={S.complete}>
            <div style={S.completeTitle}>SESSION COMPLETE</div>
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
  loading: { display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "#08080a", color: "#c45c3e", fontFamily: "monospace", fontSize: 14, letterSpacing: 2 },
  header: { padding: "24px 20px 14px", borderBottom: "1px solid #1a1a1f", background: "linear-gradient(180deg, #0e0c0a 0%, #08080a 100%)" },
  headerTop: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  title: { margin: 0, fontSize: 24, fontWeight: 900, letterSpacing: 4, color: "#f0eeea" },
  accent: { color: "#c45c3e", textShadow: "0 0 12px #c45c3e66, 0 0 24px #c45c3e22" },
  dateTag: { fontSize: 11, color: "#888", background: "#111114", padding: "4px 10px", borderRadius: 4, border: "1px solid #1a1a1f" },
  subtitle: { fontSize: 10, color: "#4a4a50", marginTop: 5, letterSpacing: 1.5, textTransform: "uppercase" },
  pageSelector: { display: "flex", gap: 4, padding: "12px 14px 0" },
  pageBtn: { flex: 1, background: "#0d0d10", border: "1px solid #222228", borderRadius: 8, color: "#666", padding: "11px 2px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: 1.5, textAlign: "center", transition: "all 0.2s" },
  pageBtnActive: { background: "linear-gradient(180deg, #1f1710 0%, #161210 100%)", border: "1px solid #c45c3e", color: "#c45c3e", boxShadow: "0 0 12px #c45c3e22, inset 0 1px 0 #c45c3e22" },
  daySelector: { display: "flex", gap: 4, padding: "12px 14px" },
  dayBtn: { flex: 1, background: "#0d0d10", border: "1px solid #222228", borderRadius: 8, color: "#666", padding: "11px 2px", fontSize: 12, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, transition: "all 0.2s" },
  dayBtnActive: { background: "linear-gradient(180deg, #1f1710 0%, #161210 100%)", border: "1px solid #c45c3e", color: "#c45c3e", boxShadow: "0 0 12px #c45c3e22" },
  dayHeader: { padding: "6px 20px 14px" },
  dayTitle: { margin: "0 0 8px", fontSize: 15, fontWeight: 800, color: "#e8e6e1", letterSpacing: 0.5 },
  progressBar: { height: 5, background: "#151518", borderRadius: 3, overflow: "hidden" },
  progressFill: { height: "100%", background: "linear-gradient(90deg,#c45c3e,#d4784a,#e89050)", borderRadius: 3, transition: "width 0.4s", boxShadow: "0 0 8px #c45c3e44" },
  statsRow: { display: "flex", justifyContent: "space-between", marginTop: 8 },
  statLeft: { fontSize: 10, color: "#777" },
  statRight: { fontSize: 10, color: "#999", fontVariantNumeric: "tabular-nums" },
  volTarget: { margin: "0 14px 10px", padding: "12px 14px", borderRadius: 8, border: "1px solid", overflow: "hidden" },
  volTargetLabel: { fontSize: 8, fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 },
  volTargetBar: { height: 6, background: "#151518", borderRadius: 3, overflow: "hidden", marginBottom: 4 },
  volTargetFill: { height: "100%", borderRadius: 3, transition: "width 0.3s" },
  volTargetStats: { display: "flex", justifyContent: "space-between", fontSize: 10 },
  restBanner: { display: "flex", alignItems: "center", justifyContent: "center", gap: 16, background: "linear-gradient(180deg, #1f1510 0%, #151010 100%)", border: "2px solid #c45c3e44", margin: "0 14px 10px", borderRadius: 10, padding: "14px 20px", boxShadow: "0 0 20px #c45c3e11" },
  restLabel: { fontSize: 12, color: "#c45c3e", fontWeight: 800, letterSpacing: 3, textShadow: "0 0 8px #c45c3e44" },
  restTime: { fontSize: 30, fontWeight: 900, color: "#f0eeea", fontVariantNumeric: "tabular-nums", textShadow: "0 0 10px #c45c3e33" },
  skipBtn: { background: "none", border: "1px solid #444", color: "#999", padding: "5px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 10, letterSpacing: 1, fontWeight: 600 },
  exList: { padding: "0 14px", display: "flex", flexDirection: "column", gap: 6 },
  exCard: { background: "#0d0d10", border: "1px solid #222228", borderRadius: 10, overflow: "hidden", transition: "border-color 0.3s" },
  warmupCard: { background: "#0d0d10", border: "1px solid #c45c3e33", borderRadius: 10, overflow: "hidden" },
  warmupDone: { borderColor: "#3a6630", background: "#0b0e0a" },
  warmupHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "14px 16px", background: "none", border: "none", color: "#e8e6e1", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  warmupTitle: { fontSize: 13, fontWeight: 800, color: "#d4784a", letterSpacing: 0.5 },
  warmupBody: { padding: "0 16px 12px", borderTop: "1px solid #1a1510" },
  warmupMove: { display: "flex", alignItems: "flex-start", gap: 10, padding: "9px 4px", width: "100%", background: "none", border: "none", borderBottom: "1px solid #151518", cursor: "pointer", fontFamily: "inherit", textAlign: "left", transition: "opacity 0.2s" },
  warmupCheck: { width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0, marginTop: 1 },
  warmupMoveName: { fontSize: 12, fontWeight: 600, color: "#ddd" },
  warmupMoveDetail: { fontSize: 10, color: "#777", marginTop: 1 },
  exCardDone: { borderColor: "#3a6630", background: "#0a0d09", boxShadow: "0 0 8px #3a663011" },
  exHead: { display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", padding: "14px 16px", background: "none", border: "none", color: "#e8e6e1", cursor: "pointer", fontFamily: "inherit", textAlign: "left" },
  exLeft: { display: "flex", alignItems: "center", gap: 12 },
  check: { width: 36, height: 36, borderRadius: "50%", border: "2px solid #333340", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color: "#666", flexShrink: 0, transition: "all 0.3s" },
  checkDone: { borderColor: "#4a8033", color: "#6abf47", background: "#1a2a14", fontSize: 15, boxShadow: "0 0 8px #4a803322" },
  exName: { fontSize: 14, fontWeight: 700, color: "#f0eeea" },
  exMeta: { fontSize: 10, color: "#777", marginTop: 2 },
  exBody: { padding: "0 16px 16px", borderTop: "1px solid #1a1a1f" },
  exNote: { fontSize: 10, color: "#8a7a60", fontStyle: "italic", padding: "10px 0 8px", borderBottom: "1px dashed #222228", marginBottom: 6 },
  olBanner: { display: "flex", flexDirection: "column", gap: 3, padding: "8px 12px", margin: "6px 0 4px", borderRadius: 6, border: "1px solid" },
  setRow: { display: "flex", alignItems: "center", gap: 8, padding: "8px 0", borderBottom: "1px solid #151518" },
  setRowIn: { display: "flex", gap: 8, padding: "8px 0", borderBottom: "1px solid #151518" },
  sn: { fontSize: 10, color: "#666", width: 26, flexShrink: 0, fontWeight: 600 },
  logged: { flex: 1, display: "flex", alignItems: "center", gap: 6 },
  lw: { fontSize: 15, fontWeight: 800, color: "#f0eeea" },
  lx: { fontSize: 10, color: "#555" },
  lr: { fontSize: 15, fontWeight: 800, color: "#c45c3e" },
  prW: { fontSize: 9, color: "#f0c040", marginLeft: 6, fontWeight: 800, background: "#2a2210", padding: "2px 6px", borderRadius: 3, letterSpacing: 0.5 },
  prV: { fontSize: 9, color: "#d4784a", marginLeft: 6, fontWeight: 800, background: "#1f1510", padding: "2px 6px", borderRadius: 3, letterSpacing: 0.5 },
  editBtn: { background: "none", border: "1px solid #2a2a30", color: "#777", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 12 },
  clrBtn: { background: "none", border: "1px solid #2a1a1a", color: "#994444", borderRadius: 5, padding: "4px 8px", cursor: "pointer", fontFamily: "inherit", fontSize: 11 },
  sugRow: { display: "flex", alignItems: "center", gap: 6, marginBottom: 4 },
  sugTag: { fontSize: 9, fontWeight: 800, letterSpacing: 1 },
  sugDetail: { fontSize: 9, color: "#666" },
  inputs: { display: "flex", alignItems: "center", gap: 6 },
  inp: { width: 56, background: "#08080a", border: "1px solid #2a2a30", borderRadius: 6, color: "#f0eeea", padding: "8px 5px", fontSize: 14, fontFamily: "inherit", textAlign: "center", outline: "none", fontWeight: 600 },
  logBtn: { background: "linear-gradient(180deg, #d4603e 0%, #b84830 100%)", border: "none", color: "#fff", padding: "8px 14px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit", fontSize: 10, fontWeight: 800, letterSpacing: 1.5, boxShadow: "0 0 12px #c45c3e33", textShadow: "0 1px 2px #00000044" },
  hist: { marginTop: 10, padding: "8px 0 0", borderTop: "1px dashed #222228" },
  histLabel: { fontSize: 8, color: "#555", letterSpacing: 1.5, marginBottom: 4, fontWeight: 700 },
  histRow: { display: "flex", gap: 8, fontSize: 10, color: "#666", padding: "3px 0" },
  complete: { margin: "14px", padding: "20px", borderRadius: 10, background: "linear-gradient(180deg, #0f140e 0%, #0a0d09 100%)", border: "1px solid #3a6630", boxShadow: "0 0 20px #3a663015" },
  completeTitle: { fontSize: 18, fontWeight: 900, color: "#6abf47", letterSpacing: 3, textShadow: "0 0 12px #6abf4744", textAlign: "center" },
  completeVol: { color: "#999", fontSize: 12, marginTop: 6, textAlign: "center" },
  recapSection: { marginTop: 14, paddingTop: 12, borderTop: "1px solid #1a2a14" },
  recapLabel: { fontSize: 8, color: "#555", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 },
  recapRow: { display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 11 },
  recapNext: { marginTop: 14, padding: "10px 12px", background: "#0d0d10", borderRadius: 6, border: "1px solid #222228", textAlign: "center" },
  footer: { textAlign: "center", padding: "24px 20px", fontSize: 10, color: "#2a2a30", letterSpacing: 1, textTransform: "uppercase" },
};
