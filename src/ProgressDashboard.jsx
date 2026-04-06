import { useState, useMemo } from "react";
import { ALL_EXERCISES, PROGRAM } from "./constants";
import { getExerciseHistory, getSessionVolumes, getPRTimeline, getStreakData, getMuscleGroupVolume, getWeeklySummaries, filterByTimeRange } from "./statsEngine";
import { MiniLineChart, MiniBarChart, HeatmapGrid } from "./charts";

export default function ProgressDashboard({ logData }) {
  const [timeRange, setTimeRange] = useState("8w");
  const [selectedExercise, setSelectedExercise] = useState("d1e1");

  const filtered = useMemo(() => filterByTimeRange(logData, timeRange), [logData, timeRange]);

  const streaks = useMemo(() => getStreakData(logData), [logData]);
  const exHistory = useMemo(() => getExerciseHistory(filtered, selectedExercise), [filtered, selectedExercise]);
  const sessionVols = useMemo(() => getSessionVolumes(filtered), [filtered]);
  const prTimeline = useMemo(() => getPRTimeline(filtered), [filtered]);
  const muscleVols = useMemo(() => {
    const weeks = { "4w": 4, "8w": 8, "12w": 12, all: 52 * 5 }[timeRange] || 8;
    return getMuscleGroupVolume(logData, weeks);
  }, [logData, timeRange]);
  const weeklySummaries = useMemo(() => {
    const weeks = { "4w": 4, "8w": 8, "12w": 12, all: 16 }[timeRange] || 8;
    return getWeeklySummaries(logData, weeks);
  }, [logData, timeRange]);

  const weightData = exHistory.map((s) => ({ x: s.date, y: s.topWeight }));
  const e1rmData = exHistory.map((s) => ({ x: s.date, y: s.estimated1RM }));
  const volData = sessionVols.map((s) => ({ x: s.date, y: s.volume, dayType: s.dayType }));

  const selectedName = ALL_EXERCISES.find((e) => e.id === selectedExercise)?.name || selectedExercise;

  return (
    <div style={PS.container}>
      {/* Time Range */}
      <div style={PS.rangeBar}>
        {["4w", "8w", "12w", "all"].map((r) => (
          <button key={r} onClick={() => setTimeRange(r)} style={{ ...PS.rangeBtn, ...(r === timeRange ? PS.rangeBtnActive : {}) }}>
            {r.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Streak Card */}
      <div style={PS.card}>
        <div style={PS.cardTitle}>STREAK</div>
        <div style={PS.streakRow}>
          <div style={PS.streakItem}>
            <div style={PS.streakNum}>{streaks.currentStreak}</div>
            <div style={PS.streakLabel}>current</div>
          </div>
          <div style={PS.streakDivider} />
          <div style={PS.streakItem}>
            <div style={PS.streakNum}>{streaks.longestStreak}</div>
            <div style={PS.streakLabel}>longest</div>
          </div>
          <div style={PS.streakDivider} />
          <div style={PS.streakItem}>
            <div style={PS.streakNum}>{streaks.thisWeekSessions}<span style={{ fontSize: 10, color: "#555" }}>/6</span></div>
            <div style={PS.streakLabel}>this week</div>
          </div>
          <div style={PS.streakDivider} />
          <div style={PS.streakItem}>
            <div style={PS.streakNum}>{streaks.totalDays}</div>
            <div style={PS.streakLabel}>total days</div>
          </div>
        </div>
      </div>

      {/* Strength Progression */}
      <div style={PS.card}>
        <div style={PS.cardTitle}>STRENGTH PROGRESSION</div>
        <select value={selectedExercise} onChange={(e) => setSelectedExercise(e.target.value)} style={PS.select}>
          {Object.entries(PROGRAM).map(([day, exercises]) => (
            <optgroup key={day} label={day}>
              {exercises.map((ex) => (
                <option key={ex.id} value={ex.id}>{ex.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div style={PS.chartLabel}>{selectedName} — Top Weight (lbs)</div>
        <MiniLineChart data={weightData} width={288} height={130} color="#c45c3e" label="" />
        <div style={{ ...PS.chartLabel, marginTop: 12 }}>Estimated 1RM (lbs)</div>
        <MiniLineChart data={e1rmData} width={288} height={130} color="#d4784a" label="" />
      </div>

      {/* Volume Trends */}
      <div style={PS.card}>
        <div style={PS.cardTitle}>VOLUME TRENDS</div>
        <div style={PS.legendRow}>
          <span style={PS.legendDot("#c45c3e")}>Push</span>
          <span style={PS.legendDot("#4a9fd4")}>Pull</span>
          <span style={PS.legendDot("#6abf47")}>Legs</span>
        </div>
        <MiniBarChart data={volData} width={288} height={140} label="" />
      </div>

      {/* PR Timeline */}
      <div style={PS.card}>
        <div style={PS.cardTitle}>PR TIMELINE</div>
        {prTimeline.length === 0 ? (
          <div style={PS.empty}>No PRs yet — keep pushing</div>
        ) : (
          <div style={PS.prList}>
            {prTimeline.slice(0, 20).map((pr, i) => (
              <div key={i} style={PS.prRow}>
                <span style={PS.prDate}>{pr.date.slice(5)}</span>
                <span style={PS.prName}>{pr.exerciseName}</span>
                <span style={{ ...PS.prBadge, background: pr.type === "weight" ? "#2a1a10" : "#1a1a10", color: pr.type === "weight" ? "#f0c040" : "#d4784a" }}>
                  {pr.type === "weight" ? `${pr.value} lbs` : `${pr.value} vol`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Muscle Group Heatmap */}
      <div style={PS.card}>
        <div style={PS.cardTitle}>MUSCLE VOLUME</div>
        <div style={PS.chartLabel}>Relative volume by muscle group</div>
        <div style={{ padding: "8px 0" }}>
          <HeatmapGrid data={muscleVols} />
        </div>
      </div>

      {/* Weekly Summaries */}
      <div style={PS.card}>
        <div style={PS.cardTitle}>WEEKLY SUMMARY</div>
        {weeklySummaries.length === 0 ? (
          <div style={PS.empty}>No data yet</div>
        ) : (
          <div style={PS.weekTable}>
            <div style={PS.weekHeader}>
              <span style={{ width: 50 }}>WEEK</span>
              <span style={{ width: 30, textAlign: "center" }}>DAYS</span>
              <span style={{ flex: 1, textAlign: "right" }}>VOLUME</span>
              <span style={{ width: 50, textAlign: "right" }}>AVG</span>
              <span style={{ width: 30, textAlign: "right" }}>PRs</span>
            </div>
            {weeklySummaries.map((w, i) => (
              <div key={i} style={PS.weekRow}>
                <span style={{ width: 50, color: "#666" }}>{w.weekLabel}</span>
                <span style={{ width: 30, textAlign: "center", color: w.sessions >= 5 ? "#6abf47" : w.sessions >= 3 ? "#d4784a" : "#555" }}>
                  {w.sessions}
                </span>
                <span style={{ flex: 1, textAlign: "right", color: "#888" }}>
                  {w.totalVolume > 0 ? `${(w.totalVolume / 1000).toFixed(1)}k` : "—"}
                </span>
                <span style={{ width: 50, textAlign: "right", color: "#666" }}>
                  {w.avgVolume > 0 ? `${(w.avgVolume / 1000).toFixed(1)}k` : "—"}
                </span>
                <span style={{ width: 30, textAlign: "right", color: w.prs > 0 ? "#f0c040" : "#333" }}>
                  {w.prs > 0 ? w.prs : "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const PS = {
  container: { padding: "0 14px 40px" },
  rangeBar: { display: "flex", gap: 3, marginBottom: 10 },
  rangeBtn: { flex: 1, background: "#0d0d10", border: "1px solid #1a1a1f", borderRadius: 6, color: "#555", padding: "8px 2px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: 1 },
  rangeBtnActive: { background: "#1a1510", border: "1px solid #c45c3e", color: "#c45c3e" },
  card: { background: "#0d0d10", border: "1px solid #1a1a1f", borderRadius: 8, padding: "14px", marginBottom: 8 },
  cardTitle: { fontSize: 8, color: "#444", letterSpacing: 1.5, marginBottom: 10, fontWeight: 700 },
  streakRow: { display: "flex", alignItems: "center", justifyContent: "space-around" },
  streakItem: { textAlign: "center" },
  streakNum: { fontSize: 22, fontWeight: 800, color: "#e8e6e1" },
  streakLabel: { fontSize: 9, color: "#555", marginTop: 2, letterSpacing: 0.5 },
  streakDivider: { width: 1, height: 30, background: "#1a1a1f" },
  select: { width: "100%", background: "#08080a", border: "1px solid #222", borderRadius: 4, color: "#e8e6e1", padding: "8px 6px", fontSize: 12, fontFamily: "inherit", marginBottom: 10, outline: "none" },
  chartLabel: { fontSize: 9, color: "#555", marginBottom: 4, letterSpacing: 0.5 },
  legendRow: { display: "flex", gap: 12, marginBottom: 8 },
  legendDot: (color) => ({ fontSize: 9, color, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }),
  empty: { color: "#333", fontSize: 11, textAlign: "center", padding: "16px 0" },
  prList: { maxHeight: 240, overflowY: "auto" },
  prRow: { display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid #111114", fontSize: 11 },
  prDate: { color: "#555", width: 42, flexShrink: 0 },
  prName: { flex: 1, color: "#999", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10 },
  prBadge: { padding: "2px 6px", borderRadius: 3, fontSize: 9, fontWeight: 700, flexShrink: 0 },
  weekTable: { fontSize: 10 },
  weekHeader: { display: "flex", gap: 6, padding: "0 0 6px", borderBottom: "1px solid #1a1a1f", color: "#333", fontSize: 8, letterSpacing: 1, fontWeight: 700 },
  weekRow: { display: "flex", gap: 6, padding: "5px 0", borderBottom: "1px solid #0f0f12" },
};
