import { useState } from "react";
import toast from "react-hot-toast";
import Field from "../Field";
import Select from "../ui/Select";
import { DataPanel, EditButton, FormCard, TabHeader, TH } from "./shared";
import { fmtDate, useCollection, useIsAdmin, useSaver } from "./hooks";

const FIELDS = ["academic_year", "number", "start_date", "end_date"];
const NUMBERS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: `Semester ${i + 1}` }));

/** Upcoming, ongoing or ended, from the dates alone. */
function status(s) {
  const today = new Date().toISOString().slice(0, 10);
  if (today < s.start_date) return { label: "Upcoming", tone: "text-ink-secondary" };
  if (today > s.end_date) return { label: "Ended", tone: "text-ink-muted" };
  return { label: "Ongoing", tone: "font-medium text-primary" };
}

function SemestersTab() {
  const isAdmin = useIsAdmin();
  const years = useCollection("/academics/years/");
  const [yearFilter, setYearFilter] = useState("");
  const { rows, failed, reload } = useCollection("/academics/semesters/", yearFilter ? { year: yearFilter } : {});

  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ academic_year: "", number: "", start_date: "", end_date: "" });

  const current = years.rows?.find((y) => y.is_current);
  const open = (row) => {
    setEditing(row ?? "new");
    setForm(
      row
        ? { academic_year: String(row.academic_year), number: String(row.number), start_date: row.start_date, end_date: row.end_date }
        : { academic_year: current ? String(current.id) : "", number: "", start_date: current?.start_date ?? "", end_date: "" },
    );
    saver.setErrors({});
  };
  const close = () => setEditing(null);

  const saver = useSaver({
    path: "/academics/semesters/",
    editingId: editing && editing !== "new" ? editing.id : null,
    fields: FIELDS,
    onSaved: () => {
      toast.success(editing === "new" ? "Semester added" : "Semester updated");
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
    if (!form.academic_year) local.academic_year = "Choose an academic year.";
    if (!form.number) local.number = "Choose a semester.";
    if (!form.start_date) local.start_date = "Choose a start date.";
    if (!form.end_date) local.end_date = "Choose an end date.";
    if (Object.keys(local).length) return saver.setErrors(local);
    saver.save({ ...form, academic_year: Number(form.academic_year), number: Number(form.number) });
  };

  const yearOptions = (years.rows ?? []).map((y) => ({ value: String(y.id), label: y.name }));
  const err = (k) => saver.errors[k] && <p role="alert" className="mt-1.5 text-sm text-danger">{saver.errors[k]}</p>;

  return (
    <>
      <TabHeader
        title="Semesters"
        description="Semester records within an academic year. Odd semesters can run side by side, so their dates may overlap."
        addLabel="Add semester"
        canAdd={isAdmin && !editing}
        onAdd={() => open(null)}
      />

      {editing && (
        <FormCard
          title={editing === "new" ? "Add a semester" : `Edit ${editing.name}, ${editing.academic_year_name}`}
          banner={saver.banner}
          onSubmit={submit}
          saving={saver.saving}
          submitLabel={editing === "new" ? "Add semester" : "Save changes"}
          onCancel={close}
        >
          <div>
            <span className="mb-1.5 block text-sm font-medium">Academic year</span>
            <Select label="Academic year" value={form.academic_year} onChange={(v) => change("academic_year", v)} placeholder="Choose…" options={yearOptions} />
            {err("academic_year")}
            {years.rows?.length === 0 && <p className="mt-1.5 text-sm text-ink-secondary">Add an academic year first.</p>}
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-medium">Semester</span>
            <Select label="Semester" value={form.number} onChange={(v) => change("number", v)} placeholder="Choose…" options={NUMBERS} />
            {err("number")}
          </div>
          <Field label="Starts" type="date" value={form.start_date} onChange={(e) => change("start_date", e.target.value)} error={saver.errors.start_date} />
          <Field label="Ends" type="date" value={form.end_date} onChange={(e) => change("end_date", e.target.value)} error={saver.errors.end_date} />
        </FormCard>
      )}

      <div className="mt-3">
        <Select
          label="Filter by academic year"
          value={yearFilter}
          onChange={setYearFilter}
          placeholder="All academic years"
          options={yearOptions}
          className="w-56"
        />
      </div>

      <DataPanel
        rows={rows}
        failed={failed}
        empty={{ title: yearFilter ? "No semesters in that year" : "No semesters yet", hint: isAdmin ? "Add a semester to put dates on your teaching terms." : "An administrator hasn't added any yet." }}
      >
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-line text-sm text-ink-secondary">
              <TH>Semester</TH>
              <TH>Academic year</TH>
              <TH>Dates</TH>
              <TH>Status</TH>
              <TH className="text-right">Sections</TH>
              {isAdmin && <TH><span className="sr-only">Edit</span></TH>}
            </tr>
          </thead>
          <tbody>
            {rows?.map((s) => {
              const st = status(s);
              return (
                <tr key={s.id} className="border-b border-line last:border-b-0 hover:bg-background">
                  <td className="px-4 py-3 text-[0.9375rem] font-medium whitespace-nowrap">{s.name}</td>
                  <td className="px-4 py-3 text-[0.9375rem] whitespace-nowrap">{s.academic_year_name}</td>
                  <td className="px-4 py-3 text-[0.9375rem] whitespace-nowrap">{fmtDate(s.start_date)} – {fmtDate(s.end_date)}</td>
                  <td className={`px-4 py-3 text-[0.9375rem] ${st.tone}`}>{st.label}</td>
                  <td className="tnum px-4 py-3 text-right text-[0.9375rem]">{s.section_count}</td>
                  {isAdmin && <td className="px-4 py-2.5 text-right"><EditButton onClick={() => open(s)} label={`Edit ${s.name} ${s.academic_year_name}`} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </DataPanel>
    </>
  );
}

export default SemestersTab;
