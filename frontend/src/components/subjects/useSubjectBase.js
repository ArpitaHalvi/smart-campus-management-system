import { useAuth } from "../../context/AuthContext";

/**
 * Returns the appropriate base URL for subject routes based on user role.
 * Admin: /admin/subjects
 * Faculty: /faculty/subjects (to view assigned subjects)
 */
export function useSubjectBase() {
  const { user } = useAuth();
  return user.role === "ADMIN" ? "/admin/subjects" : "/faculty/subjects";
}
