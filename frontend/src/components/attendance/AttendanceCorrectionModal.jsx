import { useState } from "react";
import { Loader2, X } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import Button from "../ui/Button";
import Field from "../Field";

const STATUS_OPTIONS = [
  { value: "PRESENT", label: "Present" },
  { value: "ABSENT", label: "Absent" },
  { value: "LATE", label: "Late" },
];

/**
 * Modal for correcting a single attendance record.
 * Requires a reason for the correction (audit trail).
 */
function AttendanceCorrectionModal({ record, onSaved, onCancel }) {
  const [newStatus, setNewStatus] = useState(record.status);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setError("");

    if (newStatus === record.status) {
      setError("Select a different status");
      return;
    }

    if (!reason.trim()) {
      setError("Enter a reason for the correction");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.patch(`/attendance/records/${record.id}/`, {
        status: newStatus,
        correction_reason: reason.trim(),
      });
      toast.success("Attendance corrected");
      onSaved(data);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.correction_reason?.[0] || "Couldn't update attendance";
      setError(message);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="rounded-xl border border-line bg-surface p-6 max-w-md w-full space-y-4">
        <div className="flex items-start justify-between">
          <h2 className="text-lg font-semibold">Correct Attendance</h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-md p-1 text-ink-secondary hover:bg-surface-secondary disabled:opacity-50"
          >
            <X size={20} />
          </button>
        </div>

        <div className="text-sm text-ink-secondary">
          <p>
            <strong>{record.student_details?.user_details?.first_name} {record.student_details?.user_details?.last_name}</strong>
          </p>
          <p>{record.student_details?.enrollment_number}</p>
        </div>

        {error && <div className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}

        <div>
          <label className="mb-1.5 block text-sm font-medium">Current Status</label>
          <div className="rounded-lg bg-background px-3.5 py-2.5 text-sm font-medium">
            {record.status}
          </div>
        </div>

        <div>
          <label htmlFor="new-status" className="mb-1.5 block text-sm font-medium">
            New Status
          </label>
          <select
            id="new-status"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] cursor-pointer hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <Field
          label="Reason for Correction"
          multiline
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="e.g. Student was present but marked absent by mistake"
        />

        <div className="flex gap-2 pt-2">
          <Button onClick={submit} disabled={saving}>
            {saving ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Saving
              </>
            ) : (
              "Correct"
            )}
          </Button>
          <Button variant="ghost" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceCorrectionModal;
