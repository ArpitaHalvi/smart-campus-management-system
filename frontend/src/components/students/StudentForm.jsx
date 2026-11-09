import { useState } from "react";
import { Dices, Eye, EyeOff, Loader2 } from "lucide-react";
import Field from "../Field";
import Button from "../ui/Button";
import Segmented from "../ui/Segmented";
import LinkSelect from "./LinkSelect";
import { semesterLabel, sectionLabel, useAcademicOptions } from "./useAcademicOptions";
import api from "../../services/api";
import { parseApiError } from "../../services/errors";

const GENDERS = [
  { value: "", label: "Not stated" },
  { value: "FEMALE", label: "Female" },
  { value: "MALE", label: "Male" },
  { value: "OTHER", label: "Other" },
];

const EMPTY = {
  username: "",
  password: "",
  email: "",
  first_name: "",
  last_name: "",
  date_of_birth: "",
  gender: "",
  phone: "",
  address: "",
  guardian_name: "",
  guardian_phone: "",
  enrollment_number: "",
  department: "",
  course: "",
  year_of_study: "",
  semester: "",
  section: "",
  admission_date: "",
};

// No 0/O/1/l/I so it can be read out or typed from a printed slip
const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const generatePassword = (length = 12) =>
  Array.from(crypto.getRandomValues(new Uint32Array(length)), (b) => CHARS[b % CHARS.length]).join("");

const fromStudent = (s) =>
  Object.fromEntries(
    Object.keys(EMPTY).map((k) => [k, s[k] === null || s[k] === undefined ? "" : String(s[k])]),
  );

function Section({ title, hint, children }) {
  return (
    <fieldset className="border-t border-line pt-5 first:border-t-0 first:pt-0">
      <legend className="float-left mb-4 w-full">
        <span className="text-base font-semibold">{title}</span>
        {hint && <span className="mt-0.5 block text-sm font-normal text-ink-secondary">{hint}</span>}
      </legend>
      <div className="clear-both grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

/**
 * Registers a student (no `student` prop) or edits one (`student` given).
 * Registering also creates the sign-in account, so it asks for a username
 * and password; editing leaves those alone.
 */
function StudentForm({ student, onSaved, onCancel }) {
  const editing = Boolean(student);
  const [form, setForm] = useState(editing ? fromStudent(student) : EMPTY);
  const [usernameEdited, setUsernameEdited] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);
  const [generatingId, setGeneratingId] = useState(false);

  // The academic records to choose from (each saves as an id)
  const options = useAcademicOptions();

  // Fills the box with the next free ID. A preview: the server still checks
  // it is unique when the student is registered.
  const generateId = async () => {
    setGeneratingId(true);
    try {
      const { data } = await api.get("/students/next-id/");
      change("enrollment_number", data.enrollment_number);
    } catch {
      setErrors((er) => ({ ...er, enrollment_number: "Couldn't generate an ID. Try again." }));
    } finally {
      setGeneratingId(false);
    }
  };

  const change = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // A section belongs to a course (and maybe a semester): keep them in step
      if (key === "section" && value) {
        const sec = options.sections.find((x) => String(x.id) === value);
        if (sec) {
          if (!next.course) next.course = String(sec.course);
          if (!next.semester && sec.semester) next.semester = String(sec.semester);
        }
      }
      if (key === "course" || key === "semester") {
        const sec = options.sections.find((x) => String(x.id) === next.section);
        const stillFits =
          !sec ||
          ((!next.course || String(sec.course) === next.course) &&
            (!next.semester || !sec.semester || String(sec.semester) === next.semester));
        if (!stillFits) next.section = "";
      }
      // Suggest a username from the email until the admin types their own
      if (!editing && key === "email" && !usernameEdited) {
        next.username = value.split("@")[0].toLowerCase();
      }
      return next;
    });
    if (key === "username") setUsernameEdited(true);
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };
  const set = (key) => (e) => change(key, e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");

    const local = {};
    if (!form.first_name.trim()) local.first_name = "Enter a first name.";
    if (!form.email.trim()) local.email = "Enter an email address.";
    if (!editing) {
      if (!form.username.trim()) local.username = "Enter a username.";
      if (!form.password) local.password = "Enter or generate a password.";
    }
    if (editing && !form.enrollment_number.trim())
      local.enrollment_number = "Enter an enrollment number.";
    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    const payload = {
      ...form,
      email: form.email.trim(),
      // Empty optional dates/numbers must be sent as null, not ""
      date_of_birth: form.date_of_birth || null,
      admission_date: form.admission_date || null,
      year_of_study: form.year_of_study === "" ? null : Number(form.year_of_study),
      // The academic links are saved as ids (department_id, course_id ...)
      department: form.department ? Number(form.department) : null,
      course: form.course ? Number(form.course) : null,
      semester: form.semester ? Number(form.semester) : null,
      section: form.section ? Number(form.section) : null,
    };
    if (editing) {
      delete payload.username;
      delete payload.password;
    }

    setSaving(true);
    try {
      const { data } = editing
        ? await api.patch(`/students/${student.id}/`, payload)
        : await api.post("/students/", { ...payload, username: form.username.trim() });
      onSaved(data, editing ? null : form.password);
      if (!editing) {
        setForm(EMPTY);
        setUsernameEdited(false);
        setShowPassword(false);
      }
      setErrors({});
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setErrors(fields);
      setBanner(Object.keys(fields).some((k) => k in EMPTY) ? "" : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {banner && (
        <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {banner}
        </div>
      )}

      <Section title="Student" hint={editing ? undefined : "Their name and how they'll sign in."}>
        <Field label="First name" value={form.first_name} onChange={set("first_name")} error={errors.first_name} autoComplete="off" />
        <Field label="Last name" value={form.last_name} onChange={set("last_name")} error={errors.last_name} autoComplete="off" />
        <Field
          className="sm:col-span-2"
          label="Email"
          type="email"
          value={form.email}
          onChange={set("email")}
          error={errors.email}
          hint="Password reset links are sent here."
          autoComplete="off"
        />
        {!editing && (
          <>
            <Field
              label="Username"
              value={form.username}
              onChange={set("username")}
              error={errors.username}
              hint="Filled from the email."
              autoComplete="off"
            />
            <div>
              <Field
                label="Password"
                type={showPassword ? "text" : "password"}
                value={form.password}
                onChange={set("password")}
                error={errors.password}
                autoComplete="new-password"
                action={
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-secondary hover:bg-surface-secondary hover:text-ink"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                }
              />
              <button
                type="button"
                onClick={() => {
                  change("password", generatePassword());
                  setShowPassword(true);
                }}
                className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                <Dices size={16} aria-hidden="true" /> Generate one
              </button>
            </div>
          </>
        )}
      </Section>

      <Section title="Academic details">
        <div>
          <Field
            label="Student ID"
            value={form.enrollment_number}
            onChange={set("enrollment_number")}
            error={errors.enrollment_number}
            hint={editing ? undefined : "Leave blank and one is assigned when you register."}
            optional={!editing}
            autoComplete="off"
          />
          {!editing && (
            <button
              type="button"
              onClick={generateId}
              disabled={generatingId}
              className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline disabled:opacity-50"
            >
              {generatingId ? <Loader2 size={16} className="animate-spin" /> : <Dices size={16} aria-hidden="true" />}
              Generate next ID
            </button>
          )}
        </div>
        <Field label="Admission date" type="date" value={form.admission_date} onChange={set("admission_date")} error={errors.admission_date} optional />
        <LinkSelect
          label="Department"
          value={form.department}
          onChange={(v) => change("department", v)}
          placeholder="Not placed yet"
          options={options.departments.map((d) => ({ value: String(d.id), label: d.name }))}
          error={errors.department}
          emptyHint={options.ready ? "No departments yet. An administrator adds them under Departments." : undefined}
        />
        <LinkSelect
          label="Course"
          value={form.course}
          onChange={(v) => change("course", v)}
          placeholder="Not enrolled yet"
          options={options.courses.map((c) => ({ value: String(c.id), label: c.name }))}
          error={errors.course}
          emptyHint={options.ready ? "No courses yet. An administrator adds them under Academics." : undefined}
        />
        <Field label="Year of study" type="number" min={1} max={8} value={form.year_of_study} onChange={set("year_of_study")} error={errors.year_of_study} optional />
        <LinkSelect
          label="Semester"
          value={form.semester}
          onChange={(v) => change("semester", v)}
          placeholder="Not placed yet"
          options={options.semesters.map((x) => ({ value: String(x.id), label: semesterLabel(x) }))}
          error={errors.semester}
          emptyHint={options.ready ? "No semesters yet. An administrator adds them under Academics." : undefined}
        />
        <LinkSelect
          label="Section"
          value={form.section}
          onChange={(v) => change("section", v)}
          placeholder={form.course ? "No section" : "Choose a course or section"}
          options={options.sections
            .filter(
              (x) =>
                (!form.course || String(x.course) === form.course) &&
                (!form.semester || !x.semester || String(x.semester) === form.semester),
            )
            .map((x) => ({ value: String(x.id), label: sectionLabel(x, !form.course) }))}
          error={errors.section}
        />
      </Section>

      <Section title="Personal details">
        <Field label="Date of birth" type="date" value={form.date_of_birth} onChange={set("date_of_birth")} error={errors.date_of_birth} optional />
        <div>
          <span className="mb-1.5 block text-sm font-medium">
            Gender <span className="font-normal text-ink-muted">(optional)</span>
          </span>
          <Segmented label="Gender" options={GENDERS} value={form.gender} onChange={(v) => change("gender", v)} />
          {errors.gender && <p role="alert" className="mt-1.5 text-sm text-danger">{errors.gender}</p>}
        </div>
        <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} optional autoComplete="off" />
        <div />
        <Field className="sm:col-span-2" label="Address" multiline value={form.address} onChange={set("address")} error={errors.address} optional />
        <Field label="Guardian name" value={form.guardian_name} onChange={set("guardian_name")} error={errors.guardian_name} optional autoComplete="off" />
        <Field label="Guardian phone" type="tel" value={form.guardian_phone} onChange={set("guardian_phone")} error={errors.guardian_phone} optional autoComplete="off" />
      </Section>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {editing ? "Saving" : "Registering"}
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Register student"
          )}
        </Button>
        {onCancel && (
          <Button variant="ghost" size="lg" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

export default StudentForm;
