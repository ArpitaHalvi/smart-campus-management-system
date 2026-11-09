import { format } from "date-fns";
import Panel from "./Panel";
import LineChart from "./LineChart";
import { useCountUp, useInView } from "./hooks";
import { ATTENDANCE_MINIMUM } from "./sampleData";

const classes = (n) => `${n} ${n === 1 ? "class" : "classes"}`;

/** A horizontal bar whose fill is the true ratio, with a tick at the minimum. */
function Bar({ percent, seen, tone = "primary", height = "h-2", delay = 0 }) {
  return (
    <div className={`relative ${height} rounded-full bg-surface-secondary`}>
      <div
        className={`bar-fill absolute inset-y-0 left-0 rounded-full ${tone === "primary" ? "bg-primary" : "bg-warning"}`}
        style={{ width: seen ? `${Math.min(percent, 100)}%` : "0%", transitionDelay: `${delay}ms` }}
      />
      <span
        aria-hidden="true"
        className="absolute -top-0.5 -bottom-0.5 w-px bg-ink"
        style={{ left: `${ATTENDANCE_MINIMUM}%` }}
      />
    </div>
  );
}

/**
 * Attendance, answered first: where am I against the minimum, and how many
 * classes can I still miss (or must I attend) in each subject.
 */
export function AttendanceSummary({ attendance, index, className = "" }) {
  const [ref, seen] = useInView(0.2);
  const { overall, subjects, attended, held } = attendance;
  const shown = useCountUp(overall.percent, seen, 1200, 1);

  return (
    <Panel title="Attendance" sample index={index} className={className}>
      <div ref={ref}>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="tnum text-4xl leading-none font-semibold tracking-[-0.03em]">{shown.toFixed(1)}</span>
          <span className="text-lg font-medium text-ink-secondary">%</span>
        </div>
        <p className="mt-2 text-[0.9375rem] text-ink-secondary">
          {overall.safe ? (
            <>
              Above the {ATTENDANCE_MINIMUM}% minimum. You can miss{" "}
              <span className="font-medium text-ink">{classes(overall.count)}</span> and stay above it.
            </>
          ) : (
            <span className="font-medium text-danger">
              Below the {ATTENDANCE_MINIMUM}% minimum. Attend the next {classes(overall.count)} to recover.
            </span>
          )}
        </p>

        <div className="mt-4">
          <Bar percent={overall.percent} seen={seen} tone={overall.safe ? "primary" : "warning"} height="h-2.5" />
          <div className="relative mt-1.5 h-4 text-xs text-ink-muted">
            <span className="absolute left-0">0%</span>
            <span className="absolute -translate-x-1/2" style={{ left: `${ATTENDANCE_MINIMUM}%` }}>
              {ATTENDANCE_MINIMUM}% minimum
            </span>
            <span className="absolute right-0">100%</span>
          </div>
        </div>

        <p className="tnum mt-1 text-sm text-ink-secondary">
          {attended} of {held} classes attended this semester
        </p>

        <h3 className="mt-6 text-sm font-semibold">By subject</h3>
        <ul className="mt-2 divide-y divide-line">
          {subjects.map((s, i) => (
            <li key={s.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 py-3">
              <div className="flex min-w-0 items-baseline justify-between gap-3">
                <p className="truncate text-[0.9375rem] font-medium">{s.name}</p>
                <p className={`tnum shrink-0 text-[0.9375rem] font-semibold ${s.safe ? "" : "text-warning"}`}>
                  {Math.round(s.percent)}%
                </p>
              </div>
              <p
                className={`tnum min-w-24 text-right text-sm ${s.safe ? "text-ink-secondary" : "font-medium text-warning"}`}
              >
                {s.safe ? `Safe to miss ${s.count}` : `Attend next ${s.count}`}
              </p>
              <div className="col-span-1">
                <Bar percent={s.percent} seen={seen} tone={s.safe ? "primary" : "warning"} delay={150 + i * 80} />
              </div>
              <p className="tnum text-right text-xs text-ink-muted">
                {s.attended}/{s.held}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Panel>
  );
}

/** Attendance by week, against the minimum. */
export function AttendanceTrend({ attendance, index, className = "" }) {
  const { weekly } = attendance;
  const now = weekly[weekly.length - 1].value;
  const before = weekly[weekly.length - 2].value;
  const change = now - before;
  // Only a real move gets a colour; a point either way is noise
  const average = Math.round(weekly.reduce((n, w) => n + w.value, 0) / weekly.length);
  const lowest = weekly.reduce((lo, w) => (w.value < lo.value ? w : lo), weekly[0]);
  const under = weekly.filter((w) => w.value < ATTENDANCE_MINIMUM).length;
  const tone = Math.abs(change) < 2 ? "text-ink-secondary" : change > 0 ? "text-success" : "text-danger";

  return (
    <Panel title="Attendance by week" note="Last 12 weeks" sample index={index} className={className}>
      <p className="mt-3 text-[0.9375rem] text-ink-secondary">
        <span className="tnum font-medium text-ink">{now}%</span> this week,{" "}
        {change === 0 ? (
          "the same as last week."
        ) : (
          <span className={tone}>
            {change > 0 ? "up" : "down"} {Math.abs(change)} point{Math.abs(change) === 1 ? "" : "s"} on last week.
          </span>
        )}
      </p>
      <div className="mt-3">
        <LineChart
          data={weekly}
          yMin={60}
          yMax={100}
          yTicks={[60, 70, 80, 90, 100]}
          reference={{ value: ATTENDANCE_MINIMUM, label: `${ATTENDANCE_MINIMUM}%` }}
          height={240}
          label={`Weekly attendance over the last ${weekly.length} weeks, from ${weekly[0].value}% to ${now}%, against a ${ATTENDANCE_MINIMUM}% minimum`}
        />
      </div>

      <dl className="mt-4 grid grid-cols-3 divide-x divide-line border-t border-line pt-4">
        {[
          ["Average", `${average}%`],
          ["Lowest week", `${lowest.value}%`, `week of ${format(lowest.date, "d MMM")}`],
          ["Weeks under minimum", `${under} of ${weekly.length}`],
        ].map(([label, value, hint], i) => (
          <div key={label} className={i ? "pl-4" : "pr-4"}>
            <dt className="text-sm text-ink-secondary">{label}</dt>
            <dd className="tnum mt-0.5 text-lg font-semibold">{value}</dd>
            {hint && <p className="text-xs text-ink-muted">{hint}</p>}
          </div>
        ))}
      </dl>
    </Panel>
  );
}

