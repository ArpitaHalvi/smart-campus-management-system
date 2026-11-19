import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import Field from "../Field";
import Button from "../ui/Button";
import LinkSelect from "../students/LinkSelect";
import api from "../../services/api";
import { parseApiError } from "../../services/errors";

const EMPTY = {
  user: "",
  employee_id: "",
  department: "",
  designation: "",
  qualification: "",
  specialization: "",
  phone: "",
  joining_date: "",
};

const fromFaculty = (f) =>
  Object.fromEntries(
    Object.keys(EMPTY).map((k) => [k, f[k] === null || f[k] === undefined ? "" : String(k === "user" ? f.user : f[k])]),
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
 * Create a new faculty member (no `faculty` prop) or edit one (`faculty` given).
 * Creating also requires selecting an existing FACULTY user account.
 */
function FacultyForm({ faculty, onSaved, onCancel }) {
  const editing = Boolean(faculty);
  const [form, setForm] = useState(editing ? fromFaculty(faculty) : EMPTY);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [saving, setSaving] = useState(false);

  // Available departments and faculty users for dropdown
  const [options, setOptions] = useState({ departments: [], facultyUsers: [] });
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/academics/departments/", { params: { page_size: 200 } }),
      !editing && api.get("/auth/users/", { params: { role: "FACULTY", page_size: 200 } }),
    ])
      .then(([deptRes, usersRes]) => {
        if (cancelled) return;
        const depts = Array.isArray(deptRes.data) ? deptRes.data : (deptRes.data.results || deptRes.data);
        const users = !usersRes ? [] : (Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data.results || usersRes.data || []));
        setOptions({
          departments: Array.isArray(depts) ? depts : [],
          facultyUsers: Array.isArray(users) ? users : [],
        });
      })
      .catch(() => {}); // dropdowns stay empty on failure
    return () => {
      cancelled = true;
    };
  }, [editing]);

  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (errors[key]) setErrors((er) => ({ ...er, [key]: undefined }));
  };

  const set = (key) => (e) => change(key, e.target.value);

  const submit = async (e) => {
    e.preventDefault();
    setBanner("");

    const local = {};
    if (!editing && !form.user) local.user = "Select a faculty account.";
    if (!form.employee_id.trim()) local.employee_id = "Enter an employee ID.";
    if (!form.designation.trim()) local.designation = "Enter a designation.";
    if (!form.department) local.department = "Select a department.";

    if (Object.keys(local).length) {
      setErrors(local);
      return;
    }

    const payload = {
      user: form.user ? Number(form.user) : undefined,
      employee_id: form.employee_id.trim(),
      department: Number(form.department),
      designation: form.designation.trim(),
      qualification: form.qualification.trim() || "",
      specialization: form.specialization.trim() || "",
      phone: form.phone.trim() || "",
      joining_date: form.joining_date || null,
    };

    if (editing) {
      delete payload.user; // user cannot be changed after creation
    }

    setSaving(true);
    try {
      const { data } = editing
        ? await api.patch(`/faculty/${faculty.id}/`, payload)
        : await api.post("/faculty/", payload);
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

      <Section title="Faculty Account" hint={editing ? "Account details cannot be changed." : "Select an existing faculty user account."}>
        {editing ? (
          <div className="sm:col-span-2">
            <p className="text-sm font-medium text-ink-secondary">
              {faculty.user_details?.first_name} {faculty.user_details?.last_name}
            </p>
            <p className="text-sm text-ink-secondary">{faculty.user_details?.email}</p>
          </div>
        ) : (
          <LinkSelect
            label="Faculty Account"
            value={form.user}
            onChange={(v) => change("user", v)}
            placeholder="Choose an account"
            options={options.facultyUsers.map((u) => ({
              value: String(u.id),
              label: `${u.first_name} ${u.last_name} (${u.email})`,
            }))}
            error={errors.user}
            emptyHint={options.facultyUsers.length === 0 ? "No faculty accounts available. Create one under Users first." : undefined}
            optional={false}
          />
        )}
      </Section>

      <Section title="Employment Details">
        <Field
          label="Employee ID"
          value={form.employee_id}
          onChange={set("employee_id")}
          error={errors.employee_id}
          hint="Unique identifier for this faculty member"
          autoComplete="off"
        />
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
        <Field
          label="Designation"
          value={form.designation}
          onChange={set("designation")}
          error={errors.designation}
          hint="e.g. Assistant Professor, Associate Professor"
          autoComplete="off"
        />
        <Field label="Joining Date" type="date" value={form.joining_date} onChange={set("joining_date")} error={errors.joining_date} optional />
      </Section>

      <Section title="Qualifications">
        <Field
          className="sm:col-span-2"
          label="Qualification"
          value={form.qualification}
          onChange={set("qualification")}
          error={errors.qualification}
          hint="e.g. M.Tech, Ph.D"
          optional
          autoComplete="off"
        />
        <Field
          className="sm:col-span-2"
          label="Specialization"
          value={form.specialization}
          onChange={set("specialization")}
          error={errors.specialization}
          hint="e.g. Database Systems, Machine Learning"
          optional
          autoComplete="off"
        />
      </Section>

      <Section title="Contact">
        <Field label="Phone" type="tel" value={form.phone} onChange={set("phone")} error={errors.phone} optional autoComplete="tel" />
      </Section>

      <div className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <Button type="submit" size="lg" disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={18} className="animate-spin" /> {editing ? "Saving" : "Adding"}
            </>
          ) : editing ? (
            "Save changes"
          ) : (
            "Add faculty"
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

export default FacultyForm;
