import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import SubjectForm from "./SubjectForm";
import SubjectAllocationPanel from "./SubjectAllocationPanel";
import { useSubjectBase } from "./useSubjectBase";

/** Admin only: toggle subject active/inactive status. */
function StatusToggle({ subject, onToggled }) {
  const [saving, setSaving] = useState(false);

  const toggleStatus = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/subjects/${subject.id}/`, {
        is_active: !subject.is_active,
      });
      onToggled(data);
      toast.success(data.is_active ? "Subject activated" : "Subject deactivated");
    } catch (err) {
      toast.error(err.response?.data?.detail ?? "Couldn't update status");
      setSaving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={toggleStatus}
      disabled={saving}
      className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-line-strong px-3 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {saving ? (
        <>
          <Loader2 size={16} className="animate-spin" /> Updating
        </>
      ) : subject.is_active ? (
        <>
          <ToggleRight size={16} /> Deactivate
        </>
      ) : (
        <>
          <ToggleLeft size={16} /> Activate
        </>
      )}
    </button>
  );
}

function SubjectProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = useSubjectBase();
  const isAdmin = user.role === "ADMIN";

  const [subject, setSubject] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("view"); // view | edit | allocate

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/subjects/${id}/`)
      .then((res) => {
        if (!cancelled) {
          setSubject(res.data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.status === 404 ? "Subject not found" : "Couldn't load subject details");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div>
        <Link
          to={base}
          className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-danger">
          {error}
        </div>
      </div>
    );
  }

  if (subject === null) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (mode === "edit") {
    return (
      <div>
        <Link
          to={`${base}/${subject.id}`}
          className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setMode("view")}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <SubjectForm
          subject={subject}
          onSaved={(updated) => {
            setSubject(updated);
            setMode("view");
            toast.success("Subject updated");
          }}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  if (mode === "allocate") {
    return (
      <div>
        <Link
          to={`${base}/${subject.id}`}
          className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setMode("view")}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <SubjectAllocationPanel
          subject={subject}
          onDone={() => {
            setMode("view");
            toast.success("Faculty allocations updated");
          }}
          onCancel={() => setMode("view")}
        />
      </div>
    );
  }

  return (
    <div>
      <Link
        to={base}
        className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </Link>

      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">
              {subject.name}
              {!subject.is_active && <span className="ml-2 text-lg font-normal text-warning">Inactive</span>}
            </h1>
            <p className="mt-1 text-ink-secondary">{subject.code}</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMode("edit")} variant="secondary">
                <Pencil size={16} aria-hidden="true" /> Edit
              </Button>
              <Button onClick={() => setMode("allocate")} variant="secondary">
                Manage Faculty
              </Button>
              <StatusToggle subject={subject} onToggled={setSubject} />
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Academic Details</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-ink-secondary">Code</dt>
                <dd className="text-ink">{subject.code}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Department</dt>
                <dd className="text-ink">{subject.department_details?.name || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Semester</dt>
                <dd className="text-ink">
                  {subject.semester_details ? `Semester ${subject.semester_details.number}` : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Section</dt>
                <dd className="text-ink">{subject.section_details?.name || "—"}</dd>
              </div>
            </dl>
          </section>

          {subject.description && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Description</h2>
              <p className="text-sm text-ink whitespace-pre-wrap">{subject.description}</p>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Record</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-ink-secondary">Created</dt>
                <dd className="text-ink">{format(new Date(subject.created_at), "d MMM yyyy")}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Last Updated</dt>
                <dd className="text-ink">{format(new Date(subject.updated_at), "d MMM yyyy")}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

export default SubjectProfile;
