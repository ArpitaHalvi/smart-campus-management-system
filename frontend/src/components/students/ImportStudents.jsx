import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, ArrowLeft, Check, Download, FileUp, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import Button from "../ui/Button";
import { useStudentsBase } from "./useStudentsBase";

const MAX_ROWS = 100;

const FIELD_LABEL = {
  first_name: "First name", last_name: "Last name", email: "Email", username: "Username",
  password: "Password", student_id: "Student ID", date_of_birth: "Date of birth",
  gender: "Gender", phone: "Phone", address: "Address", guardian_name: "Guardian",
  guardian_phone: "Guardian phone", department: "Department", course: "Course",
  year_of_study: "Year", semester: "Semester", section: "Section", admission_date: "Admission date",
};

/** Spreadsheet programs run text that starts with = + - @ as a formula. */
const safeCell = (v) => {
  const s = String(v ?? "");
  const guarded = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[",\n]/.test(guarded) ? `"${guarded.replace(/"/g, '""')}"` : guarded;
};

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const message = (err, fallback) =>
  err.response?.data?.detail ?? (err.response ? fallback : "Can't reach the server. Check that the backend is running.");

function ImportStudents() {
  const base = useStudentsBase();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [step, setStep] = useState("choose"); // choose | checking | preview | importing | done
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragging, setDragging] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    setStep("choose");
    if (inputRef.current) inputRef.current.value = "";
  };

  const send = (f, dryRun) => {
    const form = new FormData();
    form.append("file", f);
    return api.post(`/students/import/${dryRun ? "?dry_run=true" : ""}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  };

  const choose = async (f) => {
    if (!f) return;
    setError("");
    setFile(f);
    setStep("checking");
    try {
      const { data } = await send(f, true);
      setPreview(data);
      setStep("preview");
    } catch (err) {
      setError(message(err, "Couldn't read that file."));
      setStep("choose");
      setFile(null);
    }
  };

  const runImport = async () => {
    setStep("importing");
    setError("");
    try {
      const { data } = await send(file, false);
      setResult(data);
      setStep("done");
      toast.success(`${data.created.length} student${data.created.length === 1 ? "" : "s"} imported`);
    } catch (err) {
      setError(message(err, "The import failed."));
      setStep("preview");
    }
  };

  const downloadTemplate = async () => {
    try {
      const res = await api.get("/students/import/template/", { responseType: "blob" });
      downloadBlob(res.data, "student-import-template.csv");
    } catch {
      toast.error("Couldn't download the template.");
    }
  };

  const downloadLogins = () => {
    const header = ["Name", "Student ID", "Username", "Password", "Email"];
    const lines = result.created.map((c) =>
      [c.name, c.student_id, c.username, c.password, c.email].map(safeCell).join(","),
    );
    downloadBlob(
      new Blob(["﻿" + [header.join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" }),
      "student-logins.csv",
    );
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    choose(e.dataTransfer.files?.[0]);
  };

  const rows = preview?.rows ?? [];
  const summary = preview?.summary;

  return (
    <>
      <Link
        to={base}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Students
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Import students</h1>
        <p className="mt-1 text-ink-secondary">
          Add up to {MAX_ROWS} students at once from a CSV file. You'll see a preview before anything is created.
        </p>
      </header>

      {error && (
        <p role="alert" className="mt-5 flex items-start gap-2 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          <AlertCircle size={18} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
        </p>
      )}

      {/* 1. Choose a file */}
      {(step === "choose" || step === "checking") && (
        <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <section
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`flex min-h-64 flex-col items-center justify-center rounded-xl border border-dashed bg-surface px-6 py-10 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-line-strong"
            }`}
          >
            {step === "checking" ? (
              <>
                <Loader2 size={28} className="animate-spin text-primary" aria-hidden="true" />
                <p role="status" className="mt-4 font-medium">Checking {file?.name}…</p>
              </>
            ) : (
              <>
                <FileUp size={28} className="text-ink-secondary" aria-hidden="true" />
                <p className="mt-4 font-medium">Drop a CSV file here</p>
                <p className="mt-1 text-sm text-ink-secondary">or</p>
                <input
                  ref={inputRef}
                  id="csv-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="sr-only"
                  onChange={(e) => choose(e.target.files?.[0])}
                />
                <Button variant="secondary" className="mt-3" onClick={() => inputRef.current?.click()}>
                  Choose file
                </Button>
              </>
            )}
          </section>

          <aside className="rounded-xl border border-line bg-surface p-5">
            <h2 className="font-semibold">Before you start</h2>
            <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-relaxed text-ink-secondary">
              <li>
                Only <span className="font-medium text-ink">first_name</span> and{" "}
                <span className="font-medium text-ink">email</span> are required. Everything else can be left blank.
              </li>
              <li>Blank student IDs, usernames and passwords are generated for you.</li>
              <li>Department, course and section must already exist under Departments and Academics. A semester is a number in the current academic year.</li>
              <li>Dates can be YYYY-MM-DD or DD/MM/YYYY.</li>
              <li>Save from Excel as "CSV UTF-8".</li>
            </ul>
            <Button variant="secondary" className="mt-4" onClick={downloadTemplate}>
              <Download size={16} aria-hidden="true" /> Download template
            </Button>
          </aside>
        </div>
      )}

      {/* 2. Preview */}
      {(step === "preview" || step === "importing") && summary && (
        <>
          <section className="mt-5 rounded-xl border border-line bg-surface p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{file?.name}</p>
                <p className="mt-0.5 text-[0.9375rem] text-ink-secondary">
                  {summary.total} row{summary.total === 1 ? "" : "s"}:{" "}
                  <span className="font-medium text-ink">{summary.valid} ready</span>
                  {summary.invalid > 0 && (
                    <>, <span className="font-medium text-danger">{summary.invalid} with problems</span> (they'll be skipped)</>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={reset} disabled={step === "importing"}>
                  Choose another file
                </Button>
                <Button onClick={runImport} disabled={summary.valid === 0 || step === "importing"}>
                  {step === "importing" ? (
                    <><Loader2 size={16} className="animate-spin" /> Importing…</>
                  ) : (
                    `Import ${summary.valid} student${summary.valid === 1 ? "" : "s"}`
                  )}
                </Button>
              </div>
            </div>
            {step === "importing" && (
              <p role="status" className="mt-3 text-sm text-ink-secondary">
                Creating accounts. This can take up to a minute for a full file, so keep this page open.
              </p>
            )}
            {preview.ignored_columns.length > 0 && (
              <p className="mt-3 text-sm text-ink-secondary">
                Ignored columns we don't use: {preview.ignored_columns.join(", ")}.
              </p>
            )}
          </section>

          <section className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[44rem] text-left">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-secondary">
                    <th scope="col" className="h-10 px-4 font-medium">Row</th>
                    <th scope="col" className="h-10 px-3 font-medium">Student</th>
                    <th scope="col" className="h-10 px-3 font-medium">Student ID</th>
                    <th scope="col" className="h-10 px-3 font-medium">Department</th>
                    <th scope="col" className="h-10 px-3 font-medium">Class</th>
                    <th scope="col" className="h-10 px-4 font-medium">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const d = r.display;
                    const klass = [d.year_of_study && `Year ${d.year_of_study}`, d.semester && `Sem ${d.semester}`, d.section && `Sec ${d.section}`]
                      .filter(Boolean).join(" · ");
                    return (
                      <tr key={r.row} className={`border-b border-line align-top last:border-b-0 ${r.ok ? "" : "bg-danger/5"}`}>
                        <td className="tnum px-4 py-2.5 text-sm text-ink-secondary">{r.row}</td>
                        <td className="max-w-[16rem] px-3 py-2.5">
                          <p className="truncate text-[0.9375rem] font-medium">{d.name || <span className="text-ink-muted">—</span>}</p>
                          <p className="truncate text-sm text-ink-secondary">{d.email}</p>
                        </td>
                        <td className="tnum px-3 py-2.5 text-[0.9375rem]">
                          {d.student_id || <span className="text-ink-muted">Auto</span>}
                        </td>
                        <td className="px-3 py-2.5 text-[0.9375rem]">{d.department || <span className="text-ink-muted">—</span>}</td>
                        <td className="px-3 py-2.5 text-[0.9375rem] whitespace-nowrap">{klass || <span className="text-ink-muted">—</span>}</td>
                        <td className="px-4 py-2.5 text-sm">
                          {r.ok ? (
                            <span className="inline-flex items-center gap-1.5 font-medium">
                              <Check size={16} className="text-success" aria-hidden="true" /> Ready
                            </span>
                          ) : (
                            <ul className="space-y-0.5 text-danger">
                              {Object.entries(r.errors).map(([field, msg]) => (
                                <li key={field}>
                                  <span className="font-medium">{FIELD_LABEL[field] ?? field}:</span> {msg}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* 3. Done */}
      {step === "done" && result && (
        <section role="status" className="mt-5 rounded-xl border border-line bg-surface p-5">
          <p className="flex items-center gap-2 text-lg font-semibold">
            <Check size={20} className="text-success" aria-hidden="true" />
            {result.created.length} student{result.created.length === 1 ? "" : "s"} imported
          </p>
          {result.summary.invalid > 0 && (
            <p className="mt-1 text-[0.9375rem] text-ink-secondary">
              {result.summary.invalid} row{result.summary.invalid === 1 ? " was" : "s were"} skipped because of problems. Fix them in the file and import it again. Rows already imported will show as duplicates, which is expected.
            </p>
          )}

          <div className="mt-5 rounded-lg bg-night p-4 text-white">
            <p className="font-medium">Download their login details now</p>
            <p className="mt-1 text-sm text-white/70">
              This file has each student's username and password. The passwords can't be shown again after you leave this page.
            </p>
            <button
              type="button"
              onClick={downloadLogins}
              className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-white px-4 text-sm font-medium text-night hover:bg-white/90 focus-visible:outline-white"
            >
              <Download size={16} aria-hidden="true" /> Download login details (CSV)
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button to={base}>View students</Button>
            <Button variant="ghost" onClick={reset}>Import another file</Button>
          </div>
        </section>
      )}
    </>
  );
}

export default ImportStudents;
