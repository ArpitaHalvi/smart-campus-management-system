import { Link } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import Panel, { Empty } from "./Panel";
import { useInView } from "./hooks";

const fullName = (s) => `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim() || s.username;

/** A stable pale tint per person, so initials read as identity, not data. */
const tint = (name) => {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return `hsl(${h} 38% 90%)`;
};

const initials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join("");

function Row({ label, children }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2">
      <dt className="shrink-0 text-sm text-ink-secondary">{label}</dt>
      <dd className="min-w-0 truncate text-right text-[0.9375rem] font-medium">
        {children || <span className="font-normal text-ink-muted">Not assigned</span>}
      </dd>
    </div>
  );
}

/** Who the student is, from their own record. */
export function ProfileSummary({ student, index, className = "" }) {
  if (!student) {
    return (
      <Panel title="Profile" index={index} className={className}>
        <Empty title="No record yet" hint="Your student record hasn't been set up. Ask your administrator." />
      </Panel>
    );
  }
  const name = fullName(student);
  const classOf = [student.year_of_study && `Year ${student.year_of_study}`, student.semester_name].filter(Boolean).join(" · ");

  return (
    <Panel title="Profile" index={index} className={className}>
      <div className="mt-4 flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-semibold text-ink-secondary"
          style={{ background: tint(name) }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{name}</p>
          <p className="tnum text-sm text-ink-secondary">{student.enrollment_number}</p>
        </div>
      </div>

      <dl className="mt-4 divide-y divide-line">
        <Row label="Course">{student.course_name}</Row>
        <Row label="Department">{student.department_name}</Row>
        <Row label="Class">{classOf}</Row>
        <Row label="Section">{student.section_name}</Row>
        <Row label="Email">{student.email}</Row>
        <Row label="Account">{student.account_status === "ACTIVE" ? "Active" : student.account_status}</Row>
      </dl>

      <Link
        to="/student/record"
        className="mt-3 inline-block rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        View full record
      </Link>
    </Panel>
  );
}

/** Where the student is in the semester and in the course, from real dates. */
export function AcademicOverview({ student, index, className = "" }) {
  const [ref, seen] = useInView(0.3);
  const today = new Date();

  const hasSemester = student?.semester_start && student?.semester_end;
  let elapsed = 0;
  let status = "";
  if (hasSemester) {
    const start = new Date(student.semester_start + "T00:00:00");
    const end = new Date(student.semester_end + "T00:00:00");
    const total = differenceInCalendarDays(end, start) + 1;
    const done = differenceInCalendarDays(today, start) + 1;
    elapsed = Math.min(Math.max(done / total, 0), 1);
    if (done < 1) status = `Starts in ${1 - done} day${1 - done === 1 ? "" : "s"}`;
    else if (done > total) status = "Semester ended";
    else status = `Day ${done} of ${total}, ${total - done} day${total - done === 1 ? "" : "s"} left`;
  }

  const years = student?.course_duration_years;
  const year = student?.year_of_study;

  return (
    <Panel title="Academic overview" index={index} className={className}>
      {!student || (!hasSemester && !year && !student.course_name) ? (
        <Empty title="Not placed yet" hint="Your course and semester will show here once an administrator assigns them." />
      ) : (
        <div ref={ref}>
          <p className="mt-3 text-[0.9375rem]">
            {student.semester_name ? (
              <>
                <span className="font-medium">{student.semester_name}</span>
                <span className="text-ink-secondary"> · {student.academic_year_name}</span>
              </>
            ) : (
              <span className="text-ink-secondary">No semester assigned yet</span>
            )}
          </p>

          {hasSemester && (
            <div className="mt-3">
              <div className="relative h-2 rounded-full bg-surface-secondary">
                <div
                  className="bar-fill absolute inset-y-0 left-0 rounded-full bg-primary"
                  style={{ width: seen ? `${elapsed * 100}%` : "0%" }}
                />
              </div>
              <div className="tnum mt-1.5 flex justify-between text-xs text-ink-muted">
                <span>{format(new Date(student.semester_start + "T00:00:00"), "d MMM")}</span>
                <span>{format(new Date(student.semester_end + "T00:00:00"), "d MMM yyyy")}</span>
              </div>
              <p className="mt-2 text-sm text-ink-secondary">{status}</p>
            </div>
          )}

          {years && year && (
            <div className="mt-5">
              <p className="text-sm text-ink-secondary">
                Year <span className="tnum font-medium text-ink">{year}</span> of{" "}
                <span className="tnum">{years}</span>
              </p>
              <div className="mt-2 flex gap-1" role="img" aria-label={`Year ${year} of ${years}`}>
                {Array.from({ length: years }, (_, i) => (
                  <span
                    key={i}
                    className="bar-fill h-2 flex-1 rounded-full"
                    style={{
                      background: i < year ? "var(--color-primary)" : "var(--color-surface-secondary)",
                      transform: seen ? "scaleX(1)" : "scaleX(0)",
                      transformOrigin: "left",
                      transitionDelay: `${i * 90}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}

          <dl className="mt-4 divide-y divide-line">
            <Row label="Course">{student.course_name}</Row>
            <Row label="Department">{student.department_name}</Row>
            <Row label="Admitted">
              {student.admission_date && format(new Date(student.admission_date + "T00:00:00"), "d MMM yyyy")}
            </Row>
          </dl>
        </div>
      )}
    </Panel>
  );
}
