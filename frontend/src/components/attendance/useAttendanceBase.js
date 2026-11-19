import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../services/api";
import toast from "react-hot-toast";

/**
 * Returns the appropriate base URL for attendance routes based on user role,
 * and fetches the faculty ID for FACULTY users.
 * Admin: /admin/attendance
 * Faculty: /faculty/attendance
 */
export function useAttendanceBase() {
  const { user } = useAuth();
  const [facultyId, setFacultyId] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.role === "FACULTY" && !facultyId && !loading) {
      setLoading(true);
      api
        .get("/faculty/", { params: { page_size: 200 } })
        .then((res) => {
          const faculty = Array.isArray(res.data) ? res.data : (res.data.results || []);
          const currentFaculty = faculty.find((f) => f.user === user.id);
          if (currentFaculty) {
            setFacultyId(currentFaculty.id);
          } else {
            toast.error("Faculty profile not found");
          }
          setLoading(false);
        })
        .catch(() => {
          toast.error("Couldn't load faculty profile");
          setLoading(false);
        });
    }
  }, [user, facultyId, loading]);

  const basePath = user?.role === "ADMIN" ? "/admin/attendance" : "/faculty/attendance";

  return {
    basePath,
    facultyId,
    loading: user?.role === "FACULTY" && loading,
  };
}
