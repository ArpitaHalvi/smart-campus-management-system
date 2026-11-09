import { useState } from "react";
import { Check } from "lucide-react";
import toast from "react-hot-toast";
import Field from "../Field";
import { DataPanel, EditButton, FormCard, TabHeader, TH } from "./shared";
import { fmtDate, useCollection, useIsAdmin, useSaver } from "./hooks";

const FIELDS = ["name", "start_date", "end_date", "is_current"];
const EMPTY = { name: "", start_date: "", end_date: "", is_current: false };

function YearsTab() {
  const isAdmin = useIsAdmin();
  const { rows, failed, reload } = useCollection("/academics/years/");
  const [editing, setEditing] = useState(null); // null | "new" | row
  const [form, setForm] = useState(EMPTY);

  const open = (row) => {
    setEditing(row ?? "new");
    setForm(row ? { name: row.name, start_date: row.start_date, end_date: row.end_date, is_current: row.is_current } : EMPTY);
    saver.setErrors({});
  };
  const close = () => setEditing(null);

  const saver = useSaver({
    path: "/academics/years/",
    editingId: editing && editing !== "new" ? editing.id : null,
    fields: FIELDS,
    onSaved: () => {
      toast.success(editing === "new" ? "Academic year added" : "Academic year updated");
      close();
      reload();
    },
  });

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    saver.clearError(key);
  };

  const submit = (e) => {
    e.preventDefault();
    const local = {};
    if (!form.name.trim()) local.name = "Enter a name, e.g. 2026-27.";
    if (!form.start_date) local.start_date = "Choose a start date.";
    if (!form.end_date) local.end_date = "Choose an end date.";
    if (Object.keys(local).length) return saver.setErrors(local);
    saver.save(form);
  };

  return (
    <>
      <TabHeader
        title="Academic years"
        description="Each teaching year and its dates. One year is marked as the current year."
        addLabel="Add academic year"
        canAdd={isAdmin && !editing}
        onAdd={() => open(null)}
      />

      {editing && (
        <FormCard
          title={editing === "new" ? "Add an academic year" : `Edit ${editing.name}`}
          banner={saver.banner}
          onSubmit={submit}
          saving={saver.saving}
          submitLabel={editing === "new" ? "Add academic year" : "Save changes"}
          onCancel={close}
        >
          <Field label="Name" value={form.name} onChange={set("name")} error={saver.errors.name} placeholder="e.g. 2026-27" maxLength={20} autoComplete="off" autoFocus />
          <Field label="Starts" type="date" value={form.start_date} onChange={set("start_date")} error={saver.errors.start_date} />
          <Field label="Ends" type="date" value={form.end_date} onChange={set("end_date")} error={saver.errors.end_date} />
          <label className="flex cursor-pointer items-center gap-2.5 self-end pb-3 text-[0.9375rem]">
            <input
              type="checkbox"
              checked={form.is_current}
              onChange={(e) => setForm((f) => ({ ...f, is_current: e.target.checked }))}
              className="h-4 w-4 cursor-pointer"
            />
            This is the current year
          </label>
        </FormCard>
      )}

      <DataPanel
        rows={rows}
        failed={failed}
        empty={{ title: "No academic years yet", hint: isAdmin ? "Add the first one to start building your calendar." : "An administrator hasn't added any yet." }}
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-sm text-ink-secondary">
              <TH>Academic year</TH>
              <TH>Dates</TH>
              <TH className="text-right">Semesters</TH>
              {isAdmin && <TH><span className="sr-only">Edit</span></TH>}
            </tr>
          </thead>
          <tbody>
            {rows?.map((y) => (
              <tr key={y.id} className="border-b border-line last:border-b-0 hover:bg-background">
                <td className="px-4 py-3 text-[0.9375rem] font-medium whitespace-nowrap">
                  {y.name}
                  {y.is_current && (
                    <span className="ml-2 inline-flex items-center gap-1 text-sm font-medium text-primary">
                      <Check size={14} aria-hidden="true" /> Current
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-[0.9375rem] whitespace-nowrap">{fmtDate(y.start_date)} – {fmtDate(y.end_date)}</td>
                <td className="tnum px-4 py-3 text-right text-[0.9375rem]">{y.semester_count}</td>
                {isAdmin && (
                  <td className="px-4 py-2.5 text-right"><EditButton onClick={() => open(y)} label={`Edit ${y.name}`} /></td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </DataPanel>
    </>
  );
}

export default YearsTab;
