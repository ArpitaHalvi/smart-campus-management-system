import { format, formatDistanceToNow } from "date-fns";
import { STATUS_LABEL } from "../admin/labels";

const GENDER = { MALE: "Male", FEMALE: "Female", OTHER: "Other" };
const date = (v) => (v ? format(new Date(v), "d MMM yyyy") : null);

function Item({ label, children, empty = "Not provided" }) {
  return (
    <div>
      <dt className="text-sm text-ink-secondary">{label}</dt>
      <dd className="mt-0.5 text-[0.9375rem] font-medium break-words">
        {children || <span className="font-normal text-ink-muted">{empty}</span>}
      </dd>
    </div>
  );
}

function Group({ title, children }) {
  return (
    <section className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">{title}</h2>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

/** A student's complete profile, read-only. Used by staff and by the student. */
function StudentDetails({ student: s, showAccount = true }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Group title="Academic">
        <Item label="Student ID">{s.enrollment_number}</Item>
        <Item label="Department">{s.department_name}</Item>
        <Item label="Course">{s.course_name}</Item>
        <Item label="Year of study">{s.year_of_study}</Item>
        <Item label="Semester">{s.semester_name && `${s.semester_name} · ${s.academic_year_name}`}</Item>
        <Item label="Section">{s.section_name}</Item>
        <Item label="Admitted">{date(s.admission_date)}</Item>
      </Group>

      <Group title="Personal">
        <Item label="Date of birth">{date(s.date_of_birth)}</Item>
        <Item label="Gender">{GENDER[s.gender]}</Item>
        <Item label="Phone">{s.phone}</Item>
        <div className="col-span-2 sm:col-span-3">
          <Item label="Address">{s.address}</Item>
        </div>
        <Item label="Guardian">{s.guardian_name}</Item>
        <Item label="Guardian phone">{s.guardian_phone}</Item>
      </Group>

      {showAccount && (
        <Group title="Account">
          <Item label="Username">{s.username}</Item>
          <Item label="Email">{s.email}</Item>
          <Item label="Sign-in">
            <span className={s.account_status === "ACTIVE" ? "" : "text-warning"}>
              {STATUS_LABEL[s.account_status]}
            </span>
          </Item>
          <Item label="Last signed in" empty="Never">
            {s.last_login ? formatDistanceToNow(new Date(s.last_login), { addSuffix: true }) : null}
          </Item>
        </Group>
      )}

      <Group title="Record">
        <Item label="Registered">{date(s.created_at)}</Item>
        <Item label="Last updated">{date(s.updated_at)}</Item>
      </Group>
    </div>
  );
}

export default StudentDetails;
