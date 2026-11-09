import { useState } from "react";
import { Loader2 } from "lucide-react";
import api from "../../services/api";
import { parseApiError } from "../../services/errors";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { semesterLabel, sectionLabel, useAcademicOptions } from "./useAcademicOptions";

const YEARS = Array.from({ length: 6 }, (_, i) => ({ value: String(i + 1), label: `Year ${i + 1}` }));

function Choice({ label, children }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
    </div>
  );
}

/**
 * Assign the selected students to a department, course, year, semester and/or
 * section. Anything left blank stays as it is. Every choice is a record from
 * Academics, saved by its id.
 *
 * `scope` is either { student_ids: [...] } or { filters: {...} } (everyone
 * matching the current list filters).
 */
function EnrollPanel({ count, scope, onApplied, onCancel }) {
  const options = useAcademicOptions();
  const [form, setForm] = useState({ department: "", course: "", year: "", semester: "", section: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (key) => (value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // A section belongs to a course (and maybe a semester); keep them in step
      if (key === "section" && value) {
        const sec = options.sections.find((x) => String(x.id) === value);
        if (sec) {
          if (!next.course) next.course = String(sec.course);
          if (!next.semester && sec.semester) next.semester = String(sec.semester);
        }
      }
      if ((key === "course" || key === "semester") && next.section) {
        const sec = options.sections.find((x) => String(x.id) === next.section);
        const fits =
          !sec ||
          ((!next.course || String(sec.course) === next.course) &&
            (!next.semester || !sec.semester || String(sec.semester) === next.semester));
        if (!fits) next.section = "";
      }
      return next;
    });
    setError("");
  };

  const nameOf = (list, id, label = (x) => x.name) => {
    const found = list.find((x) => String(x.id) === id);
    return found ? label(found) : "";
  };
  const changes = [
    form.department && `department ${nameOf(options.departments, form.department)}`,
    form.course && `course ${nameOf(options.courses, form.course)}`,
    form.year && `year ${form.year}`,
    form.semester && `${nameOf(options.semesters, form.semester, semesterLabel)}`,
    form.section && `${nameOf(options.sections, form.section, (x) => `section ${x.name}`)}`,
  ].filter(Boolean);

  const apply = async (e) => {
    e.preventDefault();
    if (changes.length === 0) {
      setError("Choose at least one of department, course, year, semester or section.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post("/students/enroll/", {
        ...scope,
        ...(form.department && { department: Number(form.department) }),
        ...(form.course && { course: Number(form.course) }),
        ...(form.year && { year_of_study: Number(form.year) }),
        ...(form.semester && { semester: Number(form.semester) }),
        ...(form.section && { section: Number(form.section) }),
      });
      onApplied(data);
    } catch (err) {
      const { fields, message } = parseApiError(err);
      setError(Object.values(fields).filter(Boolean).join(" ") || message || "Couldn't update the students.");
      setSaving(false);
    }
  };

  const sectionOptions = options.sections
    .filter(
      (x) =>
        (!form.course || String(x.course) === form.course) &&
        (!form.semester || !x.semester || String(x.semester) === form.semester),
    )
    .map((x) => ({ value: String(x.id), label: sectionLabel(x, !form.course) }));

  return (
    <form onSubmit={apply} className="rounded-xl border border-line bg-surface p-4" aria-label="Enroll selected students">
      <p className="text-sm text-ink-secondary">
        Set where these {count} student{count === 1 ? "" : "s"} belong. Anything you leave blank stays as it is.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <Choice label="Department">
          <Select label="Department" value={form.department} onChange={set("department")} placeholder="Keep as is" className="w-52"
            options={options.departments.map((d) => ({ value: String(d.id), label: d.name }))} />
        </Choice>
        <Choice label="Course">
          <Select label="Course" value={form.course} onChange={set("course")} placeholder="Keep as is" className="w-56"
            options={options.courses.map((c) => ({ value: String(c.id), label: c.name }))} />
        </Choice>
        <Choice label="Year">
          <Select label="Year" value={form.year} onChange={set("year")} placeholder="Keep as is" options={YEARS} className="w-36" />
        </Choice>
        <Choice label="Semester">
          <Select label="Semester" value={form.semester} onChange={set("semester")} placeholder="Keep as is" className="w-56"
            options={options.semesters.map((x) => ({ value: String(x.id), label: semesterLabel(x) }))} />
        </Choice>
        <Choice label="Section">
          <Select label="Section" value={form.section} onChange={set("section")} placeholder="Keep as is" className="w-64" options={sectionOptions} />
        </Choice>
      </div>

      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? (
            <><Loader2 size={16} className="animate-spin" /> Assigning</>
          ) : (
            `Assign ${count} student${count === 1 ? "" : "s"}`
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
        {changes.length > 0 && <p className="text-sm text-ink-secondary">Will set {changes.join(", ")}.</p>}
      </div>
    </form>
  );
}

export default EnrollPanel;
