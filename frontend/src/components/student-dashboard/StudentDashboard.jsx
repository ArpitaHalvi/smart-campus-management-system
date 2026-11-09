import { useMemo, useState, useEffect } from "react";
import { format } from "date-fns";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { buildSampleDashboard } from "./sampleData";
import { AttendanceSummary, AttendanceTrend } from "./Attendance";
import TodaysTimetable from "./TodaysTimetable";
import { UpcomingAssignments, RecentNotices, UpcomingEvents } from "./Feeds";
import { AcademicOverview, ProfileSummary } from "./RealPanels";

const greeting = (d) => {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
};

/**
 * The student's home screen.
 *
 * Profile and academic overview come from the student's real record.
 * Attendance, classes, assignments, notices and events are sample data until
 * those modules exist (see sampleData.js); each such panel says so.
 */
function StudentDashboard() {
  const { user } = useAuth();
  const [student, setStudent] = useState(undefined); // undefined = loading, null = no record
  const [failed, setFailed] = useState(false);
  const sample = useMemo(() => buildSampleDashboard(new Date()), []);
  const now = new Date();

  useEffect(() => {
    let cancelled = false;
    api
      .get("/students/me/")
      .then((res) => !cancelled && setStudent(res.data))
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) setStudent(null);
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const first = student?.first_name || user.first_name || user.username;

  return (
    <>
      <header>
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          {greeting(now)}, {first}
        </h1>
        <p className="mt-1 text-ink-secondary">
          {format(now, "EEEE d MMMM")}
          {student?.semester_name && ` · ${student.semester_name}, ${student.academic_year_name}`}
        </p>
      </header>

      {failed && (
        <p role="alert" className="mt-5 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          Couldn't load your record. Check that the backend is running.
        </p>
      )}

      {student === undefined && !failed ? (
        <div className="mt-6 grid gap-4 lg:grid-cols-12" aria-busy="true" aria-label="Loading dashboard">
          <div className="skeleton h-72 rounded-xl lg:col-span-3" />
          <div className="skeleton h-72 rounded-xl lg:col-span-4" />
          <div className="skeleton h-72 rounded-xl lg:col-span-5" />
        </div>
      ) : (
        // `contents` lets the three desktop columns dissolve on small screens, where
        // each panel takes its place from `order` (what a student needs first goes first).
        <div className="mt-6 flex flex-col gap-4 lg:grid lg:grid-cols-12 lg:items-stretch">
          <div className="contents lg:col-span-3 lg:flex lg:flex-col lg:gap-4">
            <ProfileSummary student={student} index={0} className="order-1 lg:order-none" />
            <AcademicOverview student={student} index={5} className="order-8 lg:order-none" />
            <RecentNotices notices={sample.notices} index={7} className="order-6 lg:order-none lg:flex-1" />
          </div>

          <div className="contents lg:col-span-4 lg:flex lg:flex-col lg:gap-4">
            <TodaysTimetable classes={sample.timetable} index={1} className="order-2 lg:order-none" />
            <UpcomingAssignments assignments={sample.assignments} index={4} className="order-5 lg:order-none" />
            <UpcomingEvents events={sample.events} index={6} className="order-7 lg:order-none lg:flex-1" />
          </div>

          <div className="contents lg:col-span-5 lg:flex lg:flex-col lg:gap-4">
            <AttendanceSummary attendance={sample.attendance} index={2} className="order-3 lg:order-none" />
            <AttendanceTrend attendance={sample.attendance} index={3} className="order-4 lg:order-none lg:flex-1" />
          </div>
        </div>
      )}
    </>
  );
}

export default StudentDashboard;
