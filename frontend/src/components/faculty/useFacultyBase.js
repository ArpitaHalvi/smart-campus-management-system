import { useAuth } from "../../context/AuthContext";

/**
 * Returns the appropriate base URL for faculty routes based on user role.
 * Admin: /admin/faculty
 * Faculty: /faculty/faculty (to view colleagues)
 */
export function useFacultyBase() {
  const { user } = useAuth();
  return user.role === "ADMIN" ? "/admin/faculty" : "/faculty/faculty";
}
