import { useState } from "react";
import toast from "react-hot-toast";
import Field from "../Field";
import Select from "../ui/Select";
import { DataPanel, EditButton, FormCard, TabHeader, TH } from "./shared";
import { useCollection, useIsAdmin, useSaver } from "./hooks";

const FIELDS = ["course", "semester", "name", "capacity"];
const EMPTY = { course: "", semester: "", name: "", capacity: "" };

function SectionsTab() {
  const isAdmin = useIsAdmin();
  const courses = useCollection("/academics/courses/");
  const semesters = useCollection("/academics/semesters/");
  const [courseFilter, setCourseFilter] = useState("");
  const { rows, failed, reload } = useCollection("/academics/sections/", courseFilter ? { course: courseFilter } : {});

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);

  const open = (row) => {
    setEditing(row ?? "new");
    setForm(
      row
        ? { course: String(row.course), semester: row.semester ? String(row.semester) : "", name: row.name, capacity: row.capacity ?? "" }
        : { ...EMPTY, course: courseFilter },
    );
    saver.setErrors({});
  };
  const close = () => setEditing(null);

  const saver = useSaver({
    path: "/academics/sections/",
    editingId: editing && editing !== "new" ? editing.id : null,
    fields: FIELDS,
    onSaved: () => {
      toast.success(editing === "new" ? "Section added" : "Section updated");
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
    const local = {};
    if (!form.course) local.course = "Choose a course.";
    if (!form.name.trim()) local.name = "Enter a section name, e.g. A.";
    if (Object.keys(local).length) return saver.setErrors(local);
    saver.save({
      course: Number(form.course),
      semester: form.semester ? Number(form.semester) : null,
      name: form.name,
      capacity: form.capacity === "" ? null : Number(form.capacity),
    });
  };

  const courseOptions = (courses.rows ?? []).map((c) => ({ value: String(c.id), label: c.name }));
  const semesterOptions = (semesters.rows ?? []).map((s) => ({ value: String(s.id), label: `${s.name} · ${s.academic_year_name}` }));
  const err = (k) => saver.errors[k] && <p role="alert" className="mt-1.5 text-sm text-danger">{saver.errors[k]}</p>;

  return (
    <>
      <TabHeader
        title="Sections"
        description="Class groups within a course, optionally for one semester. The student count matches students whose program, section and semester agree."
        addLabel="Add section"
        canAdd={isAdmin && !editing}
        onAdd={() => open(null)}
      />

      {editing && (
        <FormCard
          title={editing === "new" ? "Add a section" : `Edit section ${editing.name}, ${editing.course_name}`}
          banner={saver.banner}
          onSubmit={submit}
          saving={saver.saving}
          submitLabel={editing === "new" ? "Add section" : "Save changes"}
          onCancel={close}
        >
          <div className="lg:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">Course</span>
            <Select label="Course" value={form.course} onChange={(v) => change("course", v)} placeholder="Choose…" options={courseOptions} />
            {err("course")}
            {courses.rows?.length === 0 && <p className="mt-1.5 text-sm text-ink-secondary">Add a course first.</p>}
          </div>
          <div className="lg:col-span-2">
            <span className="mb-1.5 block text-sm font-medium">Semester <span className="font-normal text-ink-muted">(optional)</span></span>
            <Select label="Semester" value={form.semester} onChange={(v) => change("semester", v)} placeholder="All semesters" options={semesterOptions} />
            {err("semester")}
          </div>
          <Field label="Section" value={form.name} onChange={(e) => change("name", e.target.value)} error={saver.errors.name} placeholder="e.g. A" maxLength={10} autoComplete="off" />
          <Field label="Capacity" type="number" min={1} value={form.capacity} onChange={(e) => change("capacity", e.target.value)} error={saver.errors.capacity} optional />
        </FormCard>
      )}

      <div className="mt-3">
        <Select label="Filter by course" value={courseFilter} onChange={setCourseFilter} placeholder="All courses" options={courseOptions} className="w-64" />
      </div>

      <DataPanel
        rows={rows}
        failed={failed}
        empty={{ title: courseFilter ? "No sections in that course" : "No sections yet", hint: isAdmin ? "Add a section to split a course into class groups." : "An administrator hasn't added any yet." }}
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-sm text-ink-secondary">
              <TH>Section</TH>
              <TH>Course</TH>
              <TH>Semester</TH>
              <TH className="text-right">Students</TH>
              {isAdmin && <TH><span className="sr-only">Edit</span></TH>}
            </tr>
          </thead>
          <tbody>
            {rows?.map((s) => {
              const full = s.capacity && s.student_count >= s.capacity;
              return (
                <tr key={s.id} className="border-b border-line last:border-b-0 hover:bg-background">
                  <td className="px-4 py-3 text-[0.9375rem] font-medium whitespace-nowrap">Section {s.name}</td>
                  <td className="px-4 py-3 text-[0.9375rem]">{s.course_name}</td>
                  <td className="px-4 py-3 text-[0.9375rem] whitespace-nowrap">{s.semester_label ?? <span className="text-ink-muted">All semesters</span>}</td>
                  <td className="tnum px-4 py-3 text-right text-[0.9375rem] whitespace-nowrap">
                    <span className={full ? "font-medium text-warning" : ""}>{s.student_count}</span>
                    {s.capacity ? <span className="text-ink-muted"> / {s.capacity}</span> : null}
                  </td>
                  {isAdmin && <td className="px-4 py-2.5 text-right"><EditButton onClick={() => open(s)} label={`Edit section ${s.name} of ${s.course_name}`} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataPanel>
    </>
  );
}

export default SectionsTab;
