export function MiniLineChart({ data, width = 280, height = 120, color = "#c45c3e", label = "" }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 10 }}>
        {data?.length === 1 ? "Need more sessions" : "No data yet"}
      </div>
    );
  }

  const pad = { top: 20, right: 10, bottom: 24, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const values = data.map((d) => d.y);
  const minY = Math.min(...values);
  const maxY = Math.max(...values);
  const rangeY = maxY - minY || 1;

  const scaleX = (i) => pad.left + (i / (data.length - 1)) * w;
  const scaleY = (v) => pad.top + h - ((v - minY) / rangeY) * h;

  const linePath = data.map((d, i) => `${i === 0 ? "M" : "L"}${scaleX(i).toFixed(1)},${scaleY(d.y).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${scaleX(data.length - 1).toFixed(1)},${(pad.top + h).toFixed(1)} L${pad.left},${(pad.top + h).toFixed(1)} Z`;

  const gradId = `grad-${label.replace(/\s/g, "")}`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {label && <text x={pad.left} y={12} fill="#444" fontSize="8" fontFamily="inherit" letterSpacing="1.5">{label}</text>}

      <text x={pad.left - 4} y={pad.top + 4} fill="#555" fontSize="9" fontFamily="inherit" textAnchor="end">{maxY}</text>
      <text x={pad.left - 4} y={pad.top + h} fill="#555" fontSize="9" fontFamily="inherit" textAnchor="end">{minY}</text>

      <line x1={pad.left} y1={pad.top} x2={pad.left + w} y2={pad.top} stroke="#1a1a1f" strokeWidth="0.5" />
      <line x1={pad.left} y1={pad.top + h} x2={pad.left + w} y2={pad.top + h} stroke="#1a1a1f" strokeWidth="0.5" />

      <path d={areaPath} fill={`url(#${gradId})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />

      {data.map((d, i) => (
        <circle key={i} cx={scaleX(i)} cy={scaleY(d.y)} r={data.length > 20 ? 1.5 : 2.5} fill={color} />
      ))}

      {data.filter((_, i) => i === 0 || i === data.length - 1 || data.length <= 8).map((d, i) => (
        <text key={`l-${i}`} x={scaleX(data.indexOf(d))} y={pad.top + h + 14} fill="#444" fontSize="7" fontFamily="inherit" textAnchor="middle">
          {d.x.slice(5)}
        </text>
      ))}
    </svg>
  );
}

export function MiniBarChart({ data, width = 280, height = 120, color = "#c45c3e", label = "" }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ width, height, display: "flex", alignItems: "center", justifyContent: "center", color: "#333", fontSize: 10 }}>
        No data yet
      </div>
    );
  }

  const pad = { top: 20, right: 10, bottom: 24, left: 40 };
  const w = width - pad.left - pad.right;
  const h = height - pad.top - pad.bottom;

  const values = data.map((d) => d.y);
  const maxY = Math.max(...values) || 1;

  const barW = Math.max(2, (w - data.length * 2) / data.length);
  const gap = 2;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block" }}>
      {label && <text x={pad.left} y={12} fill="#444" fontSize="8" fontFamily="inherit" letterSpacing="1.5">{label}</text>}

      <text x={pad.left - 4} y={pad.top + 4} fill="#555" fontSize="9" fontFamily="inherit" textAnchor="end">{(maxY / 1000).toFixed(0)}k</text>
      <line x1={pad.left} y1={pad.top + h} x2={pad.left + w} y2={pad.top + h} stroke="#1a1a1f" strokeWidth="0.5" />

      {data.map((d, i) => {
        const barH = (d.y / maxY) * h;
        const x = pad.left + i * (barW + gap);
        const y = pad.top + h - barH;
        const dayColor = d.dayType === "Push" ? "#c45c3e" : d.dayType === "Pull" ? "#4a9fd4" : d.dayType === "Legs" ? "#6abf47" : color;
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={barH} fill={dayColor} rx={1} opacity={0.8} />
            {(i === 0 || i === data.length - 1 || data.length <= 12) && (
              <text x={x + barW / 2} y={pad.top + h + 14} fill="#444" fontSize="7" fontFamily="inherit" textAnchor="middle">
                {d.x.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function HeatmapGrid({ data }) {
  if (!data || data.length === 0) return null;

  const cellW = 100;
  const cellH = 44;
  const cols = 3;
  const gap = 4;
  const rows = Math.ceil(data.length / cols);
  const width = cols * (cellW + gap) - gap;
  const height = rows * (cellH + gap) - gap;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: "block", margin: "0 auto" }}>
      {data.map((d, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = col * (cellW + gap);
        const y = row * (cellH + gap);
        const intensity = Math.max(0.08, d.intensity);

        const r = Math.round(26 + (196 - 26) * intensity);
        const g = Math.round(26 + (92 - 26) * intensity);
        const b = Math.round(31 + (62 - 31) * intensity);

        return (
          <g key={d.group}>
            <rect x={x} y={y} width={cellW} height={cellH} rx={6} fill={`rgb(${r},${g},${b})`} opacity={0.9} />
            <text x={x + cellW / 2} y={y + 18} fill="#e8e6e1" fontSize="10" fontFamily="inherit" fontWeight="700" textAnchor="middle">
              {d.group}
            </text>
            <text x={x + cellW / 2} y={y + 33} fill="#aaa" fontSize="9" fontFamily="inherit" textAnchor="middle">
              {d.totalVolume > 0 ? `${(d.totalVolume / 1000).toFixed(1)}k` : "---"}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
