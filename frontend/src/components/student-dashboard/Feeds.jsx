import { differenceInCalendarDays, format, formatDistanceToNowStrict } from "date-fns";
import Panel, { Empty } from "./Panel";

/** "Tomorrow", "in 5 days", or the plain date once it is a while off. */
function dueIn(date, now) {
  const days = differenceInCalendarDays(date, now);
  if (days <= 0) return { label: "Today", urgent: true };
  if (days === 1) return { label: "Tomorrow", urgent: true };
  if (days === 2) return { label: "In 2 days", urgent: true };
  return { label: `In ${days} days`, urgent: false };
}

export function UpcomingAssignments({ assignments, index, className = "" }) {
  const now = new Date();
  const inAWeek = assignments.filter((a) => differenceInCalendarDays(a.due, now) <= 7).length;

  return (
    <Panel title="Upcoming assignments" sample index={index} className={className}>
      {assignments.length === 0 ? (
        <Empty title="Nothing due" hint="No pending assignments. Nice." />
      ) : (
        <>
          <p className="mt-3 text-[0.9375rem] text-ink-secondary">
            <span className="tnum font-medium text-ink">{inAWeek}</span> due in the next 7 days,{" "}
            <span className="tnum">{assignments.length}</span> pending in all.
          </p>
          <ul className="mt-3 divide-y divide-line">
            {assignments.map((a) => {
              const due = dueIn(a.due, now);
              return (
                <li key={a.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-[0.9375rem] font-medium">{a.title}</p>
                    <p className="mt-0.5 truncate text-sm text-ink-secondary">
                      {a.course} · {a.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={`text-[0.9375rem] font-medium ${due.urgent ? "text-warning" : ""}`}>{due.label}</p>
                    <p className="tnum text-xs text-ink-muted">{format(a.due, "EEE d MMM")}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Panel>
  );
}

export function RecentNotices({ notices, index, className = "" }) {
  return (
    <Panel title="Recent notices" sample index={index} className={className}>
      {notices.length === 0 ? (
        <Empty title="No notices" hint="Announcements for you will appear here." />
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {notices.map((n) => (
            <li key={n.id} className="py-3">
              <p className="text-[0.9375rem] leading-snug font-medium">{n.title}</p>
              <p className="mt-1 text-sm text-ink-secondary">
                {n.kind} · {n.from} · {formatDistanceToNowStrict(n.when, { addSuffix: true })}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function UpcomingEvents({ events, index, className = "" }) {
  const now = new Date();
  return (
    <Panel title="Upcoming events" sample index={index} className={className}>
      {events.length === 0 ? (
        <Empty title="No events coming up" hint="Campus events will appear here." />
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {events.map((e) => (
            <li key={e.id} className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-3 py-3">
              <div className="tnum text-center leading-none">
                <p className="text-xl font-semibold">{format(e.date, "d")}</p>
                <p className="mt-1 text-xs text-ink-muted">{format(e.date, "MMM")}</p>
              </div>
              <div className="min-w-0">
                <p className="text-[0.9375rem] leading-snug font-medium">{e.title}</p>
                <p className="mt-0.5 text-sm text-ink-secondary">
                  {e.where} · {e.time} · {dueIn(e.date, now).label.toLowerCase()}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
