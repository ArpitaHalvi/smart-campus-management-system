import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowLeft, Loader2, Pencil } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import { fullName } from "../admin/labels";
import StudentDetails from "./StudentDetails";
import StudentForm from "./StudentForm";
import { useStudentsBase } from "./useStudentsBase";

/** Admin only: archive a student with an optional reason. */
function ArchivePanel({ student, onDone, onCancel }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const archive = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.post(`/students/${student.id}/archive/`, { reason: reason.trim() });
      onDone(data);
    } catch (err) {
      setError(err.response?.data?.detail ?? err.response?.data?.reason?.[0] ?? "Couldn't archive this student.");
      setSaving(false);
    }
  };

  return (
    <section aria-label="Archive student" className="rounded-xl border border-line bg-surface p-5">
      <h2 className="font-semibold">Archive {fullName(student)}?</h2>
      <p className="mt-1 max-w-2xl text-sm text-ink-secondary">
        Their record is hidden from the student list and their account stops
        signing in. Nothing is deleted, and you can restore them at any time.
      </p>
      <div className="mt-4 max-w-xl">
        <label htmlFor="archive-reason" className="mb-1.5 block text-sm font-medium">
          Reason <span className="font-normal text-ink-muted">(optional, shown to them when they try to sign in)</span>
        </label>
        <input
          id="archive-reason"
          value={reason}
          maxLength={255}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Left the programme"
          className="h-11 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
        />
      </div>
      {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
      <div className="mt-4 flex gap-2">
        <Button onClick={archive} disabled={saving}>
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Archiving
            </>
          ) : (
            "Archive student"
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>
    </section>
  );
}

function StudentProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = useStudentsBase();
  const isAdmin = user.role === "ADMIN";

  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("view"); // view | edit | archive
  const [restoring, setRestoring] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/students/${id}/`)
      .then((res) => !cancelled && setStudent(res.data))
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? "That student doesn't exist."
            : "Couldn't load this student. Check that the backend is running.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const restore = async () => {
    setRestoring(true);
    try {
      const { data } = await api.post(`/students/${id}/restore/`);
      setStudent(data);
      toast.success(`${fullName(data)} restored`);
    } catch {
      toast.error("Couldn't restore this student.");
    } finally {
      setRestoring(false);
    }
  };

  const archived = student?.record_status === "ARCHIVED";

  return (
    <>
      <Link
        to={base}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Students
      </Link>

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}

      {!student && !error && (
        <div className="mt-4 space-y-4" aria-busy="true">
          <div className="skeleton h-10 w-72 rounded-lg" />
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="skeleton h-48 rounded-xl" />
            <div className="skeleton h-48 rounded-xl" />
          </div>
        </div>
      )}

      {student && (
        <>
          <header className="mt-3 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-[-0.02em]">{fullName(student)}</h1>
              <p className="mt-1 text-ink-secondary">
                <span className="tnum">{student.enrollment_number}</span>
                {student.course_name && ` · ${student.course_name}`}
                {student.year_of_study && ` · Year ${student.year_of_study}`}
                {student.semester_name && ` · ${student.semester_name}`}
                {student.section_name && ` · Section ${student.section_name}`}
              </p>
            </div>
            {mode === "view" && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => setMode("edit")}>
                  <Pencil size={16} aria-hidden="true" /> Edit
                </Button>
                {isAdmin && !archived && (
                  <Button variant="secondary" onClick={() => setMode("archive")}>
                    <Archive size={16} aria-hidden="true" /> Archive
                  </Button>
                )}
              </div>
            )}
          </header>

          {archived && (
            <div role="status" className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/40 bg-warning/10 px-5 py-4">
              <div>
                <p className="font-semibold">Archived</p>
                <p className="text-sm text-ink-secondary">
                  {student.archived_at && `Since ${format(new Date(student.archived_at), "d MMM yyyy")}. `}
                  {student.archive_reason
                    ? `Reason: ${student.archive_reason.replace(/[.\s]+$/, "")}. `
                    : "No reason recorded. "}
                  Their account can't sign in.
                </p>
              </div>
              {isAdmin && (
                <Button variant="secondary" onClick={restore} disabled={restoring}>
                  {restoring ? <Loader2 size={16} className="animate-spin" /> : <ArchiveRestore size={16} aria-hidden="true" />}
                  Restore
                </Button>
              )}
            </div>
          )}

          <div className="mt-4 space-y-4">
            {mode === "archive" && (
              <ArchivePanel
                student={student}
                onDone={(data) => {
                  setStudent(data);
                  setMode("view");
                  toast(`${fullName(data)} archived`);
                }}
                onCancel={() => setMode("view")}
              />
            )}

            {mode === "edit" ? (
              <section className="rounded-xl border border-line bg-surface p-5">
                <StudentForm
                  student={student}
                  onSaved={(data) => {
                    setStudent(data);
                    setMode("view");
                    toast.success("Student updated");
                  }}
                  onCancel={() => setMode("view")}
                />
              </section>
            ) : (
              <StudentDetails student={student} />
            )}
          </div>
        </>
      )}
    </>
  );
}

export default StudentProfile;
