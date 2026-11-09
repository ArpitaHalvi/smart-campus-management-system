import { useState } from "react";
import { format } from "date-fns";
import { useElementWidth, useInView } from "./hooks";

const PAD = { left: 34, right: 44, top: 14, bottom: 26 };

/**
 * One line over time, drawn to a few plain rules: straight segments, faint
 * horizontal gridlines, a dashed reference line labelled at its end, the last
 * value labelled, no legend (the panel title names the series).
 *
 * The line draws itself in the first time the chart scrolls into view.
 * Move over the chart to read any week.
 */
function LineChart({ data, yMin, yMax, yTicks, reference, height = 200, unit = "%", label }) {
  const [wrapRef, width] = useElementWidth();
  const [viewRef, seen] = useInView(0.3);
  const [hover, setHover] = useState(null);

  const innerW = Math.max(width - PAD.left - PAD.right, 1);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (i) => PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const y = (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;

  const path = data.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(d.value).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];

  // Five evenly spaced x labels, the first and last kept inside the plot
  const labelAt = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * (data.length - 1)));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const i = Math.round(((e.clientX - rect.left - PAD.left) / innerW) * (data.length - 1));
    setHover(Math.min(Math.max(i, 0), data.length - 1));
  };

  const hovered = hover === null ? null : data[hover];

  return (
    <div ref={viewRef}>
      <div ref={wrapRef} className="relative" style={{ height }}>
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            className="block overflow-visible"
            onPointerMove={onMove}
            onPointerLeave={() => setHover(null)}
          >
            {/* faint horizontal gridlines with round, even ticks */}
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} stroke="var(--color-line)" strokeWidth="1" />
                <text x={PAD.left - 8} y={y(t)} textAnchor="end" dominantBaseline="middle" className="fill-ink-muted tnum" fontSize="11.5">
                  {t}
                </text>
              </g>
            ))}

            {/* the minimum, dashed, labelled at its end */}
            {reference && (
              <g className="chart-fade" style={{ opacity: seen ? 1 : 0 }}>
                <line x1={PAD.left} x2={width - PAD.right} y1={y(reference.value)} y2={y(reference.value)} stroke="var(--color-ink-secondary)" strokeWidth="1" strokeDasharray="4 4" />
                <text x={width - PAD.right + 6} y={y(reference.value)} dominantBaseline="middle" className="fill-ink-secondary" fontSize="11.5">
                  {reference.label}
                </text>
              </g>
            )}

            {/* x labels */}
            {labelAt.map((i, k) => (
              <text
                key={i}
                x={x(i)}
                y={height - 6}
                textAnchor={k === 0 ? "start" : k === labelAt.length - 1 ? "end" : "middle"}
                className="fill-ink-muted"
                fontSize="11.5"
              >
                {format(data[i].date, "d MMM")}
              </text>
            ))}

            {/* the series: one hue, one 2px line, drawn in on first view */}
            <path
              d={path}
              pathLength="1"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
              className="chart-draw"
              style={{ strokeDasharray: 1, strokeDashoffset: seen ? 0 : 1 }}
            />

            {/* the latest value */}
            <g className="chart-fade chart-fade-late" style={{ opacity: seen && hover === null ? 1 : 0 }}>
              <circle cx={x(data.length - 1)} cy={y(last.value)} r="3.5" fill="var(--color-primary)" />
              <text x={x(data.length - 1) + 9} y={y(last.value)} dominantBaseline="middle" className="fill-ink tnum" fontSize="12.5" fontWeight="600">
                {last.value}
                {unit}
              </text>
            </g>

            {/* reading a week */}
            {hovered && (
              <g>
                <line x1={x(hover)} x2={x(hover)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--color-ink-muted)" strokeWidth="1" />
                <circle cx={x(hover)} cy={y(hovered.value)} r="4" fill="var(--color-primary)" stroke="var(--color-surface)" strokeWidth="2" />
                <text
                  x={Math.min(Math.max(x(hover), PAD.left + 50), width - PAD.right - 50)}
                  y={PAD.top - 2}
                  textAnchor="middle"
                  className="fill-ink tnum"
                  fontSize="12.5"
                  fontWeight="600"
                >
                  {hovered.value}
                  {unit}
                  <tspan className="fill-ink-secondary" fontWeight="400">
                    {"  "}week of {format(hovered.date, "d MMM")}
                  </tspan>
                </text>
              </g>
            )}
          </svg>
        )}
      </div>
    </div>
  );
}

export default LineChart;
