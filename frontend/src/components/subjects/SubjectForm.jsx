import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Field from "../Field";
import Button from "../ui/Button";
import LinkSelect from "../students/LinkSelect";
import api from "../../services/api";
import { parseApiError } from "../../services/errors";

const EMPTY = {
  name: "",
  code: "",
  description: "",
  department: "",
  semester: "",
  section: "",
};

const fromSubject = (s) =>
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
 * Create a new subject (no `subject` prop) or edit one (`subject` given).
 */
function SubjectForm({ subject, onSaved, onCancel }) {
  const editing = Boolean(subject);
  const [form, setForm] = useState(editing ? fromSubject(subject) : EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);

  // Available academic options for dropdowns
  const [options, setOptions] = useState({ departments: [], semesters: [], sections: [] });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/academics/departments/", { params: { page_size: 200 } }),
      api.get("/academics/semesters/", { params: { page_size: 200 } }),
      api.get("/academics/sections/", { params: { page_size: 200 } }),
    ])
      .then(([deptRes, semRes, secRes]) => {
        if (cancelled) return;
        const depts = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data.results || deptRes.data);
        const sems = Array.isArray(semRes.data) ? semRes.data : (semRes.data.results || semRes.data);
        const secs = Array.isArray(secRes.data) ? secRes.data : (secRes.data.results || secRes.data);
        setOptions({
          departments: Array.isArray(depts) ? depts : [],
          semesters: Array.isArray(sems) ? sems : [],
          sections: Array.isArray(secs) ? secs : [],
        });
      })
      .catch(() => {}); // dropdowns stay empty on failure
    return () => {
      cancelled = true;
    };
  }, []);

  const change = (key, value) => {
    setForm((f) => {
      const next = { ...f, [key]: value };
      // When section is selected, auto-populate semester and course if not already set
      if (key === "section" && value) {
        const sec = options.sections.find((x) => String(x.id) === value);
        if (sec) {
          if (!next.semester && sec.semester) next.semester = String(sec.semester);
        }
      }
      // If semester or section changes, validate they're compatible
      if (key === "semester" || key === "section") {
        const sec = options.sections.find((x) => String(x.id) === form.section);
        const stillFits =
          !sec ||
          (!next.semester || !sec.semester || String(sec.semester) === next.semester);
        if (!stillFits) next.section = "";
      }
      return next;
    });
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const set = (key) => (e) => change(key, e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");

    const local = {};
    if (!form.name.trim()) local.name = "Enter a subject name.";
    if (!form.code.trim()) local.code = "Enter a subject code.";
    if (!form.department) local.department = "Select a department.";
    if (!form.semester) local.semester = "Select a semester.";
    if (!form.section) local.section = "Select a section.";

    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim(),
      description: form.description.trim() || "",
      department: Number(form.department),
      semester: Number(form.semester),
      section: Number(form.section),
    };

    setSaving(true);
    try {
      const { data } = editing
        ? await api.patch(`/subjects/${subject.id}/`, payload)
        : await api.post("/subjects/", payload);
      onSaved(data);
      if (!editing) {
        setForm(EMPTY);
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

      <Section title="Subject Details">
        <Field
          label="Subject Name"
          value={form.name}
          onChange={set("name")}
          error={errors.name}
          hint="e.g. Database Management Systems"
          autoComplete="off"
        />
        <Field
          label="Subject Code"
          value={form.code}
          onChange={set("code")}
          error={errors.code}
          hint="Unique identifier, e.g. CS301"
          autoComplete="off"
        />
        <div className="sm:col-span-2">
          <Field
            label="Description"
            multiline
            value={form.description}
            onChange={set("description")}
            error={errors.description}
            hint="Optional details about the subject"
            autoComplete="off"
          />
        </div>
      </Section>

      <Section title="Academic Placement">
        <LinkSelect
          label="Department"
          value={form.department}
          onChange={(v) => change("department", v)}
          placeholder="Select department"
          options={options.departments.map((d) => ({ value: String(d.id), label: d.name }))}
          error={errors.department}
          emptyHint={options.departments.length === 0 ? "No departments exist. Create one under Departments first." : undefined}
          optional={false}
        />
        <LinkSelect
          label="Semester"
          value={form.semester}
          onChange={(v) => change("semester", v)}
          placeholder="Select semester"
          options={options.semesters.map((s) => ({ value: String(s.id), label: `Semester ${s.number}` }))}
          error={errors.semester}
          emptyHint={options.semesters.length === 0 ? "No semesters exist. Create one under Academics first." : undefined}
          optional={false}
        />
        <LinkSelect
          label="Section"
          value={form.section}
          onChange={(v) => change("section", v)}
          placeholder="Select section"
          options={options.sections
            .filter((x) => !form.semester || !x.semester || String(x.semester) === form.semester)
            .map((x) => ({ value: String(x.id), label: `Section ${x.name}` }))}
          error={errors.section}
          optional={false}
        />
      </Section>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {editing ? "Saving" : "Creating"}
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Add subject"
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

export default SubjectForm;
