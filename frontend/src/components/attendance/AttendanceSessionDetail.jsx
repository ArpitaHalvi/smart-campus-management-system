import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Loader2, Edit2 } from "lucide-react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import api from "../../services/api";
import Button from "../ui/Button";
import AttendanceCorrectionModal from "./AttendanceCorrectionModal";
import { useAttendanceBase } from "./useAttendanceBase";

/**
 * View a single attendance session with all student records.
 * Admin/Faculty can edit individual records and add corrections.
 */
function AttendanceSessionDetail() {
  const { id } = useParams();
  const base = useAttendanceBase();

  const [session, setSession] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Correction modal state
  const [correctionRecord, setCorrectionRecord] = useState(null);
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);

  // Load session and records
  useEffect(() => {
    let cancelled = false;
    Promise.all([api.get(`/attendance/sessions/${id}/`), api.get("/attendance/records/", { params: { session: id } })])
      .then(([sessionRes, recordsRes]) => {
        if (cancelled) return;
        setSession(sessionRes.data);
        const recs = Array.isArray(recordsRes.data) ? recordsRes.data : (recordsRes.data.results || recordsRes.data);
        setRecords(Array.isArray(recs) ? recs : []);
        setLoading(false);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.response?.status === 404 ? "Session not found" : "Couldn't load session details");
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Open correction modal
  const openCorrection = (record) => {
    setCorrectionRecord(record);
    setShowCorrectionModal(true);
  };

  // Handle correction submission
  const handleCorrectionSaved = (updatedRecord) => {
    setRecords((prev) => prev.map((r) => (r.id === updatedRecord.id ? updatedRecord : r)));
    setShowCorrectionModal(false);
    setCorrectionRecord(null);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <Link to={base.basePath} className="mb-4 inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline">
          <ArrowLeft size={16} aria-hidden="true" /> Back
        </Link>
        <div role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-danger">{error}</div>
      </div>
    );
  }

  // Calculate stats
  const present = records.filter((r) => r.status === "PRESENT").length;
  const absent = records.filter((r) => r.status === "ABSENT").length;
  const late = records.filter((r) => r.status === "LATE").length;
  const total = records.length;
  const attendance = total > 0 ? Math.round(((present + late) / total) * 100) : 0;

  return (
    <div className="space-y-5">
      <Link to={base.basePath} className="inline-flex items-center gap-2 rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline">
        <ArrowLeft size={16} aria-hidden="true" /> Back
      </Link>

      <section className="rounded-xl border border-line bg-surface p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-[-0.02em]">{session?.subject_details?.name}</h1>
            <p className="mt-1 text-ink-secondary">{format(new Date(session?.attendance_date), "EEEE, d MMMM yyyy")}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg bg-background px-4 py-3">
            <p className="text-sm text-ink-secondary">Subject</p>
            <p className="mt-1 font-medium">{session?.subject_details?.code}</p>
          </div>
          <div className="rounded-lg bg-background px-4 py-3">
            <p className="text-sm text-ink-secondary">Section</p>
            <p className="mt-1 font-medium">{session?.section_details?.name}</p>
          </div>
          <div className="rounded-lg bg-background px-4 py-3">
            <p className="text-sm text-ink-secondary">Faculty</p>
            <p className="mt-1 font-medium">
              {session?.faculty_details?.user_details?.first_name} {session?.faculty_details?.user_details?.last_name}
            </p>
          </div>
          <div className="rounded-lg bg-background px-4 py-3">
            <p className="text-sm text-ink-secondary">Session</p>
            <p className="mt-1 font-medium">{session?.session_number === 1 ? "Morning" : "Afternoon"}</p>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="rounded-lg border border-line-strong bg-background px-4 py-3 grid grid-cols-2 gap-4 sm:grid-cols-5 text-sm">
        <div>
          <span className="font-medium">Present:</span> <span className="text-success">{present}</span>
        </div>
        <div>
          <span className="font-medium">Late:</span> <span className="text-warning">{late}</span>
        </div>
        <div>
          <span className="font-medium">Absent:</span> <span className="text-danger">{absent}</span>
        </div>
        <div>
          <span className="font-medium">Total:</span> {total}
        </div>
        <div>
          <span className="font-medium">Attendance:</span> <span className="text-primary">{attendance}%</span>
        </div>
      </section>

      {/* Records Table */}
      <section className="rounded-xl border border-line bg-surface overflow-hidden">
        {records.length === 0 ? (
          <div className="px-6 py-12 text-center text-ink-secondary">
            <p>No attendance records for this session.</p>
          </div>
        ) : (
          <>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-line text-sm text-ink-secondary bg-background">
                  <th scope="col" className="h-10 px-4 font-medium">
                    Student
                  </th>
                  <th scope="col" className="hidden h-10 px-3 font-medium sm:table-cell">
                    ID
                  </th>
                  <th scope="col" className="h-10 px-3 font-medium text-center">
                    Status
                  </th>
                  <th scope="col" className="h-10 px-4 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b border-line last:border-b-0 hover:bg-background">
                    <td className="max-w-0 px-4 py-2.5">
                      <p className="truncate font-medium text-[0.9375rem]">
                        {record.student_details?.user_details?.first_name} {record.student_details?.user_details?.last_name}
                      </p>
                      <p className="truncate text-sm text-ink-secondary">{record.student_details?.enrollment_number}</p>
                    </td>
                    <td className="hidden px-3 text-[0.9375rem] sm:table-cell">{record.student_details?.enrollment_number}</td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={`inline-block px-2.5 py-1 rounded text-xs font-medium ${
                          record.status === "PRESENT"
                            ? "bg-success/10 text-success"
                            : record.status === "LATE"
                              ? "bg-warning/10 text-warning"
                              : "bg-danger/10 text-danger"
                        }`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openCorrection(record)}
                        className="inline-flex h-8 items-center rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink"
                      >
                        <Edit2 size={14} aria-hidden="true" className="mr-1" /> Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {/* Correction Modal */}
      {showCorrectionModal && correctionRecord && (
        <AttendanceCorrectionModal
          record={correctionRecord}
          onSaved={handleCorrectionSaved}
          onCancel={() => setShowCorrectionModal(false)}
        />
      )}
    </div>
  );
}

export default AttendanceSessionDetail;
