import { useState } from "react";
import toast from "react-hot-toast";
import Field from "../Field";
import Select from "../ui/Select";
import { DataPanel, EditButton, FormCard, TabHeader, TH } from "./shared";
import { useCollection, useIsAdmin, useSaver } from "./hooks";

const FIELDS = ["name", "code", "department", "duration_years", "description"];
const EMPTY = { name: "", code: "", department: "", duration_years: "", description: "" };

function CoursesTab() {
  const isAdmin = useIsAdmin();
  const departments = useCollection("/academics/departments/");
  const [deptFilter, setDeptFilter] = useState("");
  const { rows, failed, reload } = useCollection("/academics/courses/", deptFilter ? { department: deptFilter } : {});

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const open = (row) => {
    setEditing(row ?? "new");
    setForm(
      row
        ? { name: row.name, code: row.code, department: row.department ? String(row.department) : "", duration_years: row.duration_years ?? "", description: row.description }
        : EMPTY,
    );
    saver.setErrors({});
  };
  const close = () => setEditing(null);

  const saver = useSaver({
    path: "/academics/courses/",
    editingId: editing && editing !== "new" ? editing.id : null,
    fields: FIELDS,
    onSaved: () => {
      toast.success(editing === "new" ? "Course added" : "Course updated");
      close();
      reload();
    },
  });

  const change = (key, value) => {
    setForm((f) => ({ ...f, [key]: value }));
    saver.clearError(key);
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return saver.setErrors({ name: "Enter a course name." });
    saver.save({
      ...form,
      department: form.department ? Number(form.department) : null,
      duration_years: form.duration_years === "" ? null : Number(form.duration_years),
    });
  };

  const deptOptions = (departments.rows ?? []).map((d) => ({ value: String(d.id), label: d.name }));

  return (
    <>
      <TabHeader
        title="Courses"
        description="The academic programs students enrol in. A student's program must be one of these."
        addLabel="Add course"
        canAdd={isAdmin && !editing}
        onAdd={() => open(null)}
      />

      {editing && (
        <FormCard
          title={editing === "new" ? "Add a course" : `Edit ${editing.name}`}
          banner={saver.banner}
          onSubmit={submit}
          saving={saver.saving}
          submitLabel={editing === "new" ? "Add course" : "Save changes"}
          onCancel={close}
        >
          <Field className="lg:col-span-2" label="Name" value={form.name} onChange={(e) => change("name", e.target.value)} error={saver.errors.name} placeholder="e.g. B.Tech Computer Science" autoComplete="off" autoFocus />
          <Field label="Code" value={form.code} onChange={(e) => change("code", e.target.value)} error={saver.errors.code} placeholder="e.g. BTCS" maxLength={10} optional autoComplete="off" />
          <Field label="Duration (years)" type="number" min={1} max={8} value={form.duration_years} onChange={(e) => change("duration_years", e.target.value)} error={saver.errors.duration_years} optional />
          <div className="lg:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">Department <span className="font-normal text-ink-muted">(optional)</span></span>
            <Select label="Department" value={form.department} onChange={(v) => change("department", v)} placeholder="Not linked to a department" options={deptOptions} />
            {saver.errors.department && <p role="alert" className="mt-1.5 text-sm text-danger">{saver.errors.department}</p>}
          </div>
          <Field className="sm:col-span-2" label="Description" multiline value={form.description} onChange={(e) => change("description", e.target.value)} error={saver.errors.description} optional />
        </FormCard>
      )}

      <div className="mt-3">
        <Select label="Filter by department" value={deptFilter} onChange={setDeptFilter} placeholder="All departments" options={deptOptions} className="w-56" />
      </div>

      <DataPanel
        rows={rows}
        failed={failed}
        empty={{ title: deptFilter ? "No courses in that department" : "No courses yet", hint: isAdmin ? "Add a course so students can be enrolled in it." : "An administrator hasn't added any yet." }}
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-sm text-ink-secondary">
              <TH>Course</TH>
              <TH>Department</TH>
              <TH>Duration</TH>
              <TH className="text-right">Students</TH>
              {isAdmin && <TH><span className="sr-only">Edit</span></TH>}
            </tr>
          </thead>
          <tbody>
            {rows?.map((c) => (
              <tr key={c.id} className="border-b border-line align-top last:border-b-0 hover:bg-background">
                <td className="px-4 py-3">
                  <p className="text-[0.9375rem] font-medium">
                    {c.name}
                    {c.code && <span className="ml-2 text-sm font-normal text-ink-muted">{c.code}</span>}
                  </p>
                  {c.description && <p className="mt-0.5 line-clamp-1 max-w-md text-sm text-ink-secondary">{c.description}</p>}
                </td>
                <td className="px-4 py-3 text-[0.9375rem] whitespace-nowrap">{c.department_name ?? <span className="text-ink-muted">—</span>}</td>
                <td className="px-4 py-3 text-[0.9375rem] whitespace-nowrap">
                  {c.duration_years ? `${c.duration_years} year${c.duration_years === 1 ? "" : "s"}` : <span className="text-ink-muted">—</span>}
                </td>
                <td className="tnum px-4 py-3 text-right text-[0.9375rem]">{c.student_count}</td>
                {isAdmin && <td className="px-4 py-2.5 text-right"><EditButton onClick={() => open(c)} label={`Edit ${c.name}`} /></td>}
              </tr>
            ))}
          </tbody>
        </table>
      </DataPanel>
    </>
  );
}

export default CoursesTab;
