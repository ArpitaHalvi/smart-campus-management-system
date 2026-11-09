import { format } from "date-fns";
import Panel, { Empty } from "./Panel";
import { useNow } from "./hooks";

const clock = (hhmm) => {
  const [h, m] = hhmm.split(":").map(Number);
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, "0")}` : ""} ${suffix}`;
};

const span = (mins) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h ? `${h} h${m ? ` ${m} min` : ""}` : `${m} min`;
};

/** Today's classes, with a live marker on the one in progress and how long until the next. */
function TodaysTimetable({ classes, index, className = "" }) {
  const now = useNow();
  const minutes = now.getHours() * 60 + now.getMinutes();

  const rows = classes.map((c) => {
    if (minutes >= c.endMin) return { ...c, state: "done" };
    if (minutes >= c.startMin) {
      return { ...c, state: "now", left: c.endMin - minutes, elapsed: (minutes - c.startMin) / (c.endMin - c.startMin) };
    }
    return { ...c, state: "later", wait: c.startMin - minutes };
  });
  const nextIndex = rows.findIndex((r) => r.state === "later");
  if (nextIndex >= 0) rows[nextIndex].state = "next";

  const remaining = rows.filter((r) => r.state !== "done").length;
  const finished = classes.length > 0 && remaining === 0;

  return (
    <Panel title="Today's classes" note={format(now, "EEEE d MMM")} sample index={index} className={className}>
      {classes.length === 0 ? (
        <Empty title="No classes today" hint="Nothing on the timetable. Use the time to catch up." />
      ) : (
        <>
          <p className="mt-3 text-[0.9375rem] text-ink-secondary">
            {finished ? (
              "All done for today."
            ) : (
              <>
                <span className="tnum font-medium text-ink">{remaining}</span> of {classes.length} still to go, finishing at{" "}
                <span className="tnum">{clock(classes[classes.length - 1].end)}</span>.
              </>
            )}
          </p>

          <ol className="mt-3">
            {rows.map((c) => (
              <li
                key={c.start + c.subject}
                className={`relative grid grid-cols-[4.75rem_minmax(0,1fr)] gap-x-3 border-t border-line py-3 first:border-t-0 ${
                  c.state === "now" ? "-mx-2 rounded-lg bg-primary/6 px-2" : ""
                }`}
              >
                <div className={`tnum text-sm whitespace-nowrap ${c.state === "done" ? "text-ink-muted" : "text-ink"}`}>
                  <p className="font-medium">{clock(c.start)}</p>
                  <p className="text-xs text-ink-muted">{span(c.endMin - c.startMin)}</p>
                </div>
                <div className="min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className={`truncate text-[0.9375rem] font-medium ${c.state === "done" ? "text-ink-muted" : ""}`}>
                      {c.subject}
                    </p>
                    {c.state === "done" && <span className="shrink-0 text-xs text-ink-muted">Done</span>}
                    {c.state === "now" && (
                      <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-medium text-primary">
                        <span className="live-dot relative inline-block h-1.5 w-1.5 rounded-full bg-primary" aria-hidden="true" />
                        Now
                      </span>
                    )}
                  </div>
                  <p className={`truncate text-sm ${c.state === "done" ? "text-ink-muted" : "text-ink-secondary"}`}>
                    {c.kind} · {c.room} · {c.faculty}
                  </p>
                  {c.state === "now" && (
                    <div className="mt-2">
                      <div className="h-0.5 rounded-full bg-primary/20">
                        <div className="h-full rounded-full bg-primary transition-[width] duration-1000" style={{ width: `${c.elapsed * 100}%` }} />
                      </div>
                      <p className="tnum mt-1 text-xs text-primary">{span(c.left)} left</p>
                    </div>
                  )}
                  {c.state === "next" && <p className="tnum mt-1 text-xs font-medium text-ink-secondary">Next, in {span(c.wait)}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </Panel>
  );
}

export default TodaysTimetable;
