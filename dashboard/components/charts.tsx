import { fmtDate, money } from "@/lib/format";

type Series = { name: string; color: string; values: number[]; dashed?: boolean };

/** Month-by-month line chart with a zero line, direct labels, and a hover readout per month. */
export function LineChart({ months, series, label }: { months: string[]; series: Series[]; label: string }) {
  const W = 760, H = 280, L = 58, R = 128, T = 34, B = 30;
  const all = series.flatMap((s) => s.values);
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all);
  // Round the axis to a "nice" step so tick labels are clean numbers.
  const rough = (hi - lo || 1) / 4, mag = 10 ** Math.floor(Math.log10(rough));
  const unit = [1, 2, 2.5, 5, 10].find((m) => m * mag >= rough)! * mag;
  const y0 = Math.floor(lo / unit) * unit, y1 = Math.ceil(hi / unit) * unit || unit;
  const x = (i: number) => L + (i * (W - L - R)) / Math.max(1, months.length - 1);
  const y = (v: number) => T + ((y1 - v) * (H - T - B)) / (y1 - y0);
  const step = (W - L - R) / Math.max(1, months.length - 1);
  const ticks = Array.from({ length: Math.round((y1 - y0) / unit) + 1 }, (_, i) => y0 + i * unit);
  // Keep the two end labels from sitting on top of each other.
  const ends = series.map((s) => y(s.values[s.values.length - 1]));
  if (ends.length === 2 && Math.abs(ends[0] - ends[1]) < 14) { const mid = (ends[0] + ends[1]) / 2, up = ends[0] <= ends[1] ? 0 : 1; ends[up] = mid - 7; ends[1 - up] = mid + 7; }
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((v, i) => (
        <g key={i}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="currentColor" strokeOpacity={0.1} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">{money(v, { compact: true })}</text>
        </g>
      ))}
      {lo < 0 ? <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="#b3261e" strokeDasharray="3 3" /> : null}
      {months.map((m, i) => (i % 2 === 0 ? <text key={m} x={x(i)} y={H - 8} textAnchor="middle">{fmtDate(m, "short").split(" ")[0]}{m.endsWith("-01") || i === 0 ? ` ’${m.slice(2, 4)}` : ""}</text> : null))}
      {series.map((s, si) => (
        <g key={s.name}>
          <polyline fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" strokeDasharray={s.dashed ? "6 4" : undefined}
            points={s.values.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />
          <circle cx={x(s.values.length - 1)} cy={y(s.values[s.values.length - 1])} r={4} fill={s.color} stroke="#fff" strokeWidth={2} />
          <text x={W - R + 10} y={ends[si] + 4} style={{ fontWeight: 600, fill: "var(--ink)" }}>{s.name}</text>
        </g>
      ))}
      {months.map((m, i) => (
        <g key={m} className="pt" tabIndex={0} aria-label={`${fmtDate(m, "month")}: ${series.map((s) => `${s.name} ${money(s.values[i])}`).join(", ")}`}>
          <rect className="hit" x={x(i) - step / 2} y={T} width={step} height={H - T - B} />
          <g className="hover">
            <line x1={x(i)} x2={x(i)} y1={T} y2={H - B} stroke="currentColor" strokeOpacity={0.35} />
            {series.map((s) => <circle key={s.name} cx={x(i)} cy={y(s.values[i])} r={4.5} fill={s.color} stroke="#fff" strokeWidth={2} />)}
            <text x={L} y={16} style={{ fontSize: 12, fill: "var(--ink)" }}>
              <tspan style={{ fontWeight: 600 }}>{fmtDate(m, "month")}</tspan>
              {series.map((s) => <tspan key={s.name} dx={14}><tspan fill={s.color}>● </tspan>{s.name}: {money(s.values[i])}</tspan>)}
            </text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/** Tiny trend line for a metric card. */
export function Spark({ values, color = "var(--teal)" }: { values: number[]; color?: string }) {
  if (values.length < 2) return <div className="spark" />;
  const lo = Math.min(...values), hi = Math.max(...values), span = hi - lo || 1;
  const pts = values.map((v, i) => `${(i * 100) / (values.length - 1)},${30 - ((v - lo) * 26) / span}`).join(" ");
  return (
    <svg className="spark" viewBox="0 0 100 34" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={pts} fill="none" stroke={color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
    </svg>
  );
}
