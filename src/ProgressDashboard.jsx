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
            <div style={PS.streakNum}>{streaks.thisWeekSessions}<span style={{ fontSize: 10, color: "#7a6a55" }}>/6</span></div>
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
                <span style={{ ...PS.prBadge, background: pr.type === "weight" ? "linear-gradient(180deg, #4a3812 0%, #2a1f08 100%)" : "linear-gradient(180deg, #3a1e10 0%, #1a0e08 100%)", border: pr.type === "weight" ? "1px solid #6a5018" : "1px solid #6a3220", color: pr.type === "weight" ? "#ffd060" : "#ffaa78" }}>
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
                <span style={{ width: 50, color: "#a89880", fontWeight: 600 }}>{w.weekLabel}</span>
                <span style={{ width: 30, textAlign: "center", fontWeight: 700, color: w.sessions >= 5 ? "#9bd070" : w.sessions >= 3 ? "#ffaa78" : "#7a6a55" }}>
                  {w.sessions}
                </span>
                <span style={{ flex: 1, textAlign: "right", color: "#e8e1d3", fontWeight: 600 }}>
                  {w.totalVolume > 0 ? `${(w.totalVolume / 1000).toFixed(1)}k` : "—"}
                </span>
                <span style={{ width: 50, textAlign: "right", color: "#a89880", fontWeight: 600 }}>
                  {w.avgVolume > 0 ? `${(w.avgVolume / 1000).toFixed(1)}k` : "—"}
                </span>
                <span style={{ width: 30, textAlign: "right", fontWeight: 700, color: w.prs > 0 ? "#ffd060" : "#5a4838" }}>
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
  rangeBar: { display: "flex", gap: 5, marginBottom: 12 },
  rangeBtn: { flex: 1, background: "linear-gradient(180deg, #1f1a14 0%, #14100c 50%, #0c0805 100%)", border: "1px solid #3a2c20", borderRadius: 6, color: "#c8b89a", padding: "10px 2px", fontSize: 11, cursor: "pointer", fontFamily: "inherit", fontWeight: 800, letterSpacing: 1.2, transition: "all 0.2s", boxShadow: "inset 0 1px 0 #4a3a2a, 0 2px 4px #00000099, 0 1px 0 #00000066" },
  rangeBtnActive: { background: "linear-gradient(180deg, #4a2412 0%, #2e1610 50%, #1a0c08 100%)", border: "1px solid #c45c3e", color: "#ffc89c", boxShadow: "inset 0 1px 0 #d4784a88, 0 0 16px #c45c3e55, 0 2px 6px #00000099, inset 0 -1px 0 #00000088", textShadow: "0 0 10px #c45c3e88, 0 1px 0 #00000099" },
  card: { background: "linear-gradient(180deg, #1a140e 0%, #0e0a07 100%)", border: "1px solid #2c241c", borderRadius: 10, padding: "18px", marginBottom: 12, boxShadow: "inset 0 1px 0 #3a2c20, 0 2px 8px #00000099, 0 1px 0 #00000066" },
  cardTitle: { fontSize: 10, color: "#e87b4d", letterSpacing: 2, marginBottom: 14, fontWeight: 800, textShadow: "0 1px 0 #00000099, 0 0 8px #c45c3e44" },
  streakRow: { display: "flex", alignItems: "center", justifyContent: "space-around" },
  streakItem: { textAlign: "center" },
  streakNum: { fontSize: 28, fontWeight: 900, color: "#f5ede0", textShadow: "0 1px 0 #00000099, 0 0 12px #c45c3e22" },
  streakLabel: { fontSize: 9, color: "#a89880", marginTop: 4, letterSpacing: 1, fontWeight: 600, textTransform: "uppercase" },
  streakDivider: { width: 1, height: 36, background: "linear-gradient(180deg, transparent, #3a2c20, transparent)" },
  select: { width: "100%", background: "linear-gradient(180deg, #050302 0%, #0a0805 100%)", border: "1px solid #4a3a2a", borderRadius: 5, color: "#f5ede0", padding: "10px 10px", fontSize: 12, fontFamily: "inherit", marginBottom: 14, outline: "none", fontWeight: 700, boxShadow: "inset 0 2px 4px #00000099, inset 0 -1px 0 #2a201a" },
  chartLabel: { fontSize: 10, color: "#c8b89a", marginBottom: 6, letterSpacing: 1, fontWeight: 600 },
  legendRow: { display: "flex", gap: 16, marginBottom: 10 },
  legendDot: (color) => ({ fontSize: 10, color, fontWeight: 700, display: "flex", alignItems: "center", gap: 4, textShadow: `0 0 8px ${color}55, 0 1px 0 #00000099` }),
  empty: { color: "#7a6a55", fontSize: 11, textAlign: "center", padding: "22px 0", fontStyle: "italic" },
  prList: { maxHeight: 260, overflowY: "auto" },
  prRow: { display: "flex", alignItems: "center", gap: 8, padding: "7px 0", borderBottom: "1px solid #1a1612", fontSize: 11 },
  prDate: { color: "#a89880", width: 42, flexShrink: 0, fontWeight: 700 },
  prName: { flex: 1, color: "#e8e1d3", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10, fontWeight: 600 },
  prBadge: { padding: "3px 8px", borderRadius: 4, fontSize: 9, fontWeight: 800, flexShrink: 0, letterSpacing: 0.5, boxShadow: "inset 0 1px 0 #ffffff15, 0 1px 2px #00000088" },
  weekTable: { fontSize: 10 },
  weekHeader: { display: "flex", gap: 6, padding: "0 0 8px", borderBottom: "1px solid #2c241c", color: "#a89880", fontSize: 8, letterSpacing: 1.2, fontWeight: 800 },
  weekRow: { display: "flex", gap: 6, padding: "7px 0", borderBottom: "1px solid #1a1612" },
};
