import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Pencil, ToggleLeft, ToggleRight } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import FacultyForm from "./FacultyForm";
import { useFacultyBase } from "./useFacultyBase";

/** Admin only: toggle faculty active/inactive status. */
function StatusToggle({ faculty, onToggled }) {
  const [saving, setSaving] = useState(false);

  const toggleStatus = async () => {
    setSaving(true);
    try {
      const { data } = await api.patch(`/faculty/${faculty.id}/`, {
        is_active: !faculty.is_active,
      });
      onToggled(data);
      toast.success(data.is_active ? "Faculty activated" : "Faculty deactivated");
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
      ) : faculty.is_active ? (
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

function FacultyProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const base = useFacultyBase();
  const isAdmin = user.role === "ADMIN";

  const [faculty, setFaculty] = useState(null);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("view"); // view | edit

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/faculty/${id}/`)
      .then((res) => {
        if (!cancelled) {
          setFaculty(res.data);
          setError("");
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.status === 404 ? "Faculty not found" : "Couldn't load faculty details");
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

  if (faculty === null) {
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
          to={`${base}/${faculty.id}`}
          className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
          onClick={() => setMode("view")}
        >
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <FacultyForm
          faculty={faculty}
          onSaved={(updated) => {
            setFaculty(updated);
            setMode("view");
            toast.success("Faculty updated");
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
              {faculty.user_details?.first_name} {faculty.user_details?.last_name}
              {!faculty.is_active && <span className="ml-2 text-lg font-normal text-warning">Inactive</span>}
            </h1>
            <p className="mt-1 text-ink-secondary">{faculty.user_details?.email}</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => setMode("edit")} variant="secondary">
                <Pencil size={16} aria-hidden="true" /> Edit
              </Button>
              <StatusToggle faculty={faculty} onToggled={setFaculty} />
            </div>
          )}
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Employment</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-ink-secondary">Employee ID</dt>
                <dd className="text-ink">{faculty.employee_id}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Department</dt>
                <dd className="text-ink">{faculty.department_details?.name || "—"}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Designation</dt>
                <dd className="text-ink">{faculty.designation || "—"}</dd>
              </div>
              {faculty.joining_date && (
                <div>
                  <dt className="font-medium text-ink-secondary">Joining Date</dt>
                  <dd className="text-ink">{format(new Date(faculty.joining_date), "d MMM yyyy")}</dd>
                </div>
              )}
            </dl>
          </section>

          {(faculty.qualification || faculty.specialization) && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Qualifications</h2>
              <dl className="space-y-2 text-sm">
                {faculty.qualification && (
                  <div>
                    <dt className="font-medium text-ink-secondary">Qualification</dt>
                    <dd className="text-ink">{faculty.qualification}</dd>
                  </div>
                )}
                {faculty.specialization && (
                  <div>
                    <dt className="font-medium text-ink-secondary">Specialization</dt>
                    <dd className="text-ink">{faculty.specialization}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}

          {faculty.phone && (
            <section>
              <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Contact</h2>
              <dl className="space-y-2 text-sm">
                <div>
                  <dt className="font-medium text-ink-secondary">Phone</dt>
                  <dd className="text-ink">{faculty.phone}</dd>
                </div>
              </dl>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-semibold text-ink-secondary">Record</h2>
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="font-medium text-ink-secondary">Added</dt>
                <dd className="text-ink">{format(new Date(faculty.created_at), "d MMM yyyy")}</dd>
              </div>
              <div>
                <dt className="font-medium text-ink-secondary">Last Updated</dt>
                <dd className="text-ink">{format(new Date(faculty.updated_at), "d MMM yyyy")}</dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}

export default FacultyProfile;
