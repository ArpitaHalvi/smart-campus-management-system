import { useAuth } from "../../context/AuthContext";

/**
 * Returns the appropriate base URL for timetable routes based on user role.
 * Admin: /admin/timetable
 * Faculty: /faculty/timetable
 * Student: /student/timetable
 */
export function useTimetableBase() {
  const { user } = useAuth();
  
  if (user?.role === "ADMIN") return "/admin/timetable";
  if (user?.role === "FACULTY") return "/faculty/timetable";
  if (user?.role === "STUDENT") return "/student/timetable";
  
  return "/timetable";
}
