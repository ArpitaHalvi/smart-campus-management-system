import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import Button from "../ui/Button";
import LinkSelect from "../students/LinkSelect";
import { parseApiError } from "../../services/errors";

/**
 * Manage faculty-subject allocations for a specific subject.
 * Shows list of allocated faculty and allows adding/removing allocations.
 */
function SubjectAllocationPanel({ subject, onDone, onCancel }) {
  const [allocations, setAllocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // For adding new allocations
  const [facultyOptions, setFacultyOptions] = useState([]);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");

  // Load existing allocations and available faculty
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/subjects/allocations/", { params: { subject: subject.id } }),
      api.get("/faculty/", { params: { page_size: 200 } }),
    ])
      .then(([allocRes, facRes]) => {
        if (cancelled) return;
        const allocs = Array.isArray(allocRes.data) ? allocRes.data : (allocRes.data.results || allocRes.data);
        const facs = Array.isArray(facRes.data) ? facRes.data : (facRes.data.results || facRes.data);
        setAllocations(Array.isArray(allocs) ? allocs : []);
        setFacultyOptions(Array.isArray(facs) ? facs : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError("Couldn't load allocations");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [subject.id]);

  // Add a new allocation
  const addAllocation = async () => {
    setAddError("");
    if (!selectedFaculty) {
      setAddError("Select a faculty member");
      return;
    }

    setAdding(true);
    try {
      const { data } = await api.post("/subjects/allocations/", {
        subject: subject.id,
        faculty: Number(selectedFaculty),
      });
      setAllocations((prev) => [...prev, data]);
      setSelectedFaculty("");
      toast.success("Faculty allocated to subject");
    } catch (err) {
      const { message } = parseApiError(err);
      setAddError(message || "Couldn't add allocation");
    } finally {
      setAdding(false);
    }
  };

  // Remove an allocation
  const removeAllocation = async (allocationId) => {
    if (!window.confirm("Remove this faculty assignment?")) return;

    try {
      await api.delete(`/subjects/allocations/${allocationId}/`);
      setAllocations((prev) => prev.filter((a) => a.id !== allocationId));
      toast.success("Faculty allocation removed");
    } catch (err) {
      toast.error("Couldn't remove allocation");
    }
  };

  // Faculty already allocated to this subject
  const allocatedFacultyIds = new Set(allocations.map((a) => a.faculty));

  // Available faculty (excluding already allocated)
  const availableFaculty = facultyOptions.filter((f) => !allocatedFacultyIds.has(f.id));

  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6">
        <div className="flex items-center gap-2 text-ink-secondary">
          <Loader2 size={16} className="animate-spin" /> Loading allocations…
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-line bg-surface p-6">
        <h2 className="mb-4 text-lg font-semibold">Allocate Faculty to {subject.name}</h2>

        {error && (
          <div role="alert" className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </div>
        )}

        {/* Add new allocation */}
        <div className="mb-6 space-y-3 rounded-lg border border-line-strong bg-background p-4">
          <h3 className="text-sm font-medium">Add Faculty Member</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[16rem]">
              <LinkSelect
                label="Faculty"
                value={selectedFaculty}
                onChange={setSelectedFaculty}
                placeholder="Select faculty"
                options={availableFaculty.map((f) => ({
                  value: String(f.id),
                  label: `${f.user_details?.first_name} ${f.user_details?.last_name} (${f.employee_id})`,
                }))}
                error={addError}
                emptyHint={availableFaculty.length === 0 ? "No more faculty available to allocate" : undefined}
                optional={false}
              />
            </div>
            <Button onClick={addAllocation} disabled={adding || !selectedFaculty}>
              {adding ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Adding
                </>
              ) : (
                <>
                  <Plus size={16} aria-hidden="true" /> Add
                </>
              )}
            </Button>
          </div>
        </div>

        {/* List of allocated faculty */}
        {allocations.length === 0 ? (
          <div className="rounded-lg bg-background px-4 py-6 text-center text-sm text-ink-secondary">
            No faculty allocated yet. Add one above.
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Allocated Faculty ({allocations.length})</h3>
            {allocations.map((alloc) => (
              <div
                key={alloc.id}
                className="flex items-center justify-between rounded-lg border border-line bg-background px-4 py-3"
              >
                <div>
                  <p className="font-medium">
                    {`${alloc.faculty_details?.user_details?.first_name || ""} ${alloc.faculty_details?.user_details?.last_name || ""}`.trim() || "Unknown Faculty"}
                  </p>
                  <p className="text-sm text-ink-secondary">
                    {alloc.faculty_details?.employee_id || "—"} • {alloc.faculty_details?.user_details?.email || "—"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeAllocation(alloc.id)}
                  aria-label={`Remove ${alloc.faculty_details?.user_details?.first_name || "faculty"}`}
                  className="rounded-md p-2 text-danger hover:bg-danger/10"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <Button onClick={onDone}>Done</Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

export default SubjectAllocationPanel;
