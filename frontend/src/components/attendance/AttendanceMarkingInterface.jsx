import { useEffect, useState } from "react";
import { Loader2, Save, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../services/api";
import Button from "../ui/Button";
import LinkSelect from "../students/LinkSelect";
import { useAttendanceBase } from "./useAttendanceBase";

const STATUS_COLORS = {
  PRESENT: "bg-success/10 border-success text-success",
  ABSENT: "bg-danger/10 border-danger text-danger",
  LATE: "bg-warning/10 border-warning text-warning",
};

/**
 * Main interface for marking attendance in bulk.
 * Faculty selects subject/section/date, students are auto-loaded,
 * then faculty marks each student as PRESENT/ABSENT/LATE and saves.
 */
function AttendanceMarkingInterface() {
  const base = useAttendanceBase();
  const navigate = useNavigate();
  const [params] = useSearchParams();

  // Selection state
  const [subject, setSubject] = useState(params.get("subject") ?? "");
  const [section, setSection] = useState(params.get("section") ?? "");
  const [attendanceDate, setAttendanceDate] = useState(params.get("date") ?? new Date().toISOString().split("T")[0]);
  const [sessionNumber, setSessionNumber] = useState(params.get("session") ?? "1");

  // Options for dropdowns
  const [options, setOptions] = useState({ subjects: [], sections: [] });
  const [loadingOptions, setLoadingOptions] = useState(true);

  // Students and attendance data
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({}); // {studentId: "PRESENT"|"ABSENT"|"LATE"}
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [saving, setSaving] = useState(false);

  // Wait for faculty ID to load before enabling marking
  if (base.loading || (base.basePath.includes("faculty") && !base.facultyId)) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
        <p>Loading your faculty profile...</p>
      </div>
    );
  }

  // Load available subjects and sections
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/subjects/", { params: { page_size: 200 } }),
      api.get("/academics/sections/", { params: { page_size: 200 } }),
    ])
      .then(([subRes, secRes]) => {
        if (cancelled) return;
        const subs = Array.isArray(subRes.data) ? subRes.data : (subRes.data.results || subRes.data);
        const secs = Array.isArray(secRes.data) ? secRes.data : (secRes.data.results || secRes.data);
        setOptions({
          subjects: Array.isArray(subs) ? subs : [],
          sections: Array.isArray(secs) ? secs : [],
        });
        setLoadingOptions(false);
      })
      .catch(() => setLoadingOptions(false));
    return () => {
      cancelled = true;
    };
  }, []);

  // Load students when subject/section is selected
  useEffect(() => {
    if (!subject || !section) {
      setStudents([]);
      setAttendanceRecords({});
      return;
    }

    setLoadingStudents(true);
    api
      .get("/attendance/sessions/", {
        params: {
          subject,
          section,
          date: attendanceDate,
        },
      })
      .then((res) => {
        // Check if session already exists
        const sessions = res.data.results || res.data;
        if (sessions.length > 0) {
          // Session exists, load its students
          const sessionId = sessions[0].id;
          return api.get(`/attendance/sessions/${sessionId}/students/`);
        } else {
          // Create a temporary session to load students
          return api.post("/attendance/sessions/", {
            subject: Number(subject),
            section: Number(section),
            faculty: base.facultyId,
            attendance_date: attendanceDate,
            session_number: Number(sessionNumber),
          }).then((res) => {
            const sessionId = res.data.id;
            return api.get(`/attendance/sessions/${sessionId}/students/`);
          });
        }
      })
      .then((res) => {
        const studentList = res.data;
        setStudents(studentList);
        // Initialize attendance records (null = not marked)
        const records = {};
        studentList.forEach((s) => {
          records[s.id] = s.status || null;
        });
        setAttendanceRecords(records);
        setLoadingStudents(false);
      })
      .catch((err) => {
        toast.error("Couldn't load students for this class");
        setLoadingStudents(false);
      });
  }, [subject, section, attendanceDate, sessionNumber]);

  // Toggle attendance status for a student
  const toggleStatus = (studentId, status) => {
    setAttendanceRecords((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === status ? null : status,
    }));
  };

  // Save attendance
  const saveAttendance = async () => {
    if (students.length === 0) {
      toast.error("No students to mark attendance for");
      return;
    }

    const markedStudents = Object.values(attendanceRecords).filter((s) => s !== null).length;
    if (markedStudents === 0) {
      toast.error("Mark attendance for at least one student");
      return;
    }

    if (!window.confirm(`Save attendance for ${markedStudents} students?`)) return;

    setSaving(true);

    try {
      // Get or create session
      let sessionId;
      const sessionRes = await api.get("/attendance/sessions/", {
        params: {
          subject,
          section,
          date: attendanceDate,
        },
      });

      const sessions = sessionRes.data.results || sessionRes.data;
      if (sessions.length > 0) {
        sessionId = sessions[0].id;
      } else {
        const createRes = await api.post("/attendance/sessions/", {
          subject: Number(subject),
          section: Number(section),
          faculty: base.facultyId,
          attendance_date: attendanceDate,
          session_number: Number(sessionNumber),
        });
        sessionId = createRes.data.id;
      }

      // Bulk create records
      const records = students
        .filter((s) => attendanceRecords[s.id])
        .map((s) => ({
          student: s.id,
          status: attendanceRecords[s.id],
        }));

      const bulkRes = await api.post("/attendance/records/bulk/", {
        session: sessionId,
        records,
      });

      toast.success(`Attendance saved for ${records.length} students`);
      setAttendanceRecords({});
      setStudents([]);
      setSubject("");
      setSection("");
      navigate(base.basePath);
    } catch (err) {
      const message = err.response?.data?.detail || err.response?.data?.non_field_errors?.[0] || "Couldn't save attendance";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  // Calculate summary
  const present = Object.values(attendanceRecords).filter((s) => s === "PRESENT").length;
  const absent = Object.values(attendanceRecords).filter((s) => s === "ABSENT").length;
  const late = Object.values(attendanceRecords).filter((s) => s === "LATE").length;

  if (loadingOptions) {
    return (
      <div className="rounded-xl border border-line bg-surface p-6 text-center">
        <Loader2 size={24} className="animate-spin mx-auto mb-2" />
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Selection Panel */}
      <section className="rounded-xl border border-line bg-surface p-6 space-y-4">
        <h2 className="text-lg font-semibold">Mark Attendance</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <LinkSelect
            label="Subject"
            value={subject}
            onChange={setSubject}
            placeholder="Select subject"
            options={options.subjects.map((s) => ({
              value: String(s.id),
              label: `${s.name} (${s.code})`,
            }))}
            optional={false}
          />
          <LinkSelect
            label="Section"
            value={section}
            onChange={setSection}
            placeholder="Select section"
            options={options.sections
              .filter((s) => !subject || options.subjects.find((subj) => String(subj.id) === subject)?.section === s.id)
              .map((s) => ({
                value: String(s.id),
                label: `Section ${s.name}`,
              }))}
            optional={false}
          />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Date</label>
            <input
              type="date"
              value={attendanceDate}
              onChange={(e) => setAttendanceDate(e.target.value)}
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Session</label>
            <select
              value={sessionNumber}
              onChange={(e) => setSessionNumber(e.target.value)}
              className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3.5 text-[0.9375rem] cursor-pointer hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
            >
              <option value="1">Morning (1)</option>
              <option value="2">Afternoon (2)</option>
            </select>
          </div>
        </div>
      </section>

      {/* Students Table */}
      {loadingStudents ? (
        <section className="rounded-xl border border-line bg-surface p-6 text-center">
          <Loader2 size={24} className="animate-spin mx-auto mb-2" />
          <p>Loading students...</p>
        </section>
      ) : students.length === 0 ? (
        <section className="rounded-xl border border-line bg-surface p-6 text-center text-ink-secondary">
          {subject && section ? "No students in this class. Select a different class." : "Select a subject and section to view students."}
        </section>
      ) : (
        <>
          {/* Summary */}
          <section className="rounded-lg border border-line-strong bg-background px-4 py-3 flex flex-wrap gap-4 text-sm">
            <div>
              <span className="font-medium">Present:</span> <span className="text-success">{present}</span>
            </div>
            <div>
              <span className="font-medium">Absent:</span> <span className="text-danger">{absent}</span>
            </div>
            <div>
              <span className="font-medium">Late:</span> <span className="text-warning">{late}</span>
            </div>
            <div className="ml-auto">
              <span className="font-medium">Total:</span> {students.length}
            </div>
          </section>

          {/* Students List */}
          <section className="rounded-xl border border-line bg-surface overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line bg-background text-sm text-ink-secondary">
                    <th className="px-4 py-3 font-medium w-2/5">Student</th>
                    <th className="hidden px-3 py-3 font-medium sm:table-cell">ID</th>
                    <th className="px-3 py-3 font-medium text-center">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => (
                    <tr key={student.id} className="border-b border-line last:border-b-0 hover:bg-background">
                      <td className="max-w-0 px-4 py-3">
                        <p className="truncate font-medium text-[0.9375rem]">{student.name}</p>
                        <p className="truncate text-sm text-ink-secondary">{student.enrollment_number}</p>
                      </td>
                      <td className="hidden px-3 py-3 text-[0.9375rem] sm:table-cell">{student.enrollment_number}</td>
                      <td className="px-3 py-3 text-center">
                        <div className="flex justify-center gap-1.5">
                          {["PRESENT", "ABSENT", "LATE"].map((status) => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => toggleStatus(student.id, status)}
                              className={`px-2.5 py-1 rounded text-xs font-medium border cursor-pointer transition-colors ${
                                attendanceRecords[student.id] === status
                                  ? STATUS_COLORS[status]
                                  : "border-line-strong text-ink-muted hover:border-ink-muted"
                              }`}
                            >
                              {status[0]}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button onClick={saveAttendance} disabled={saving || Object.values(attendanceRecords).every((s) => s === null)}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Saving
                </>
              ) : (
                <>
                  <Save size={16} aria-hidden="true" /> Save Attendance
                </>
              )}
            </Button>
            <Button variant="ghost" onClick={() => navigate(base.basePath)} disabled={saving}>
              <X size={16} aria-hidden="true" /> Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

export default AttendanceMarkingInterface;
