import { useEffect, useState } from "react";
import api from "../../services/api";
import PageHeader from "../admin/PageHeader";
import { fullName } from "../admin/labels";
import StudentDetails from "./StudentDetails";

/** A signed-in student's own record. Read-only. */
function MyRecord() {
  const [student, setStudent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .get("/students/me/")
      .then((res) => !cancelled && setStudent(res.data))
      .catch((err) => {
        if (cancelled) return;
        setError(
          err.response?.status === 404
            ? "Your student record hasn't been set up yet. Please contact your administrator."
            : "Couldn't load your record. Check that the backend is running.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        title={student ? fullName(student) : "My record"}
        description={
          student
            ? `Student ID ${student.enrollment_number}. To change anything here, ask your administrator.`
            : "Your academic and personal details."
        }
      />
      {error && (
        <p role="alert" className="mt-5 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      {!student && !error && (
        <div className="mt-5 grid gap-4 lg:grid-cols-2" aria-busy="true">
          <div className="skeleton h-48 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      )}
      {student && (
        <div className="mt-5">
          <StudentDetails student={student} showAccount={false} />
        </div>
      )}
    </>
  );
}

export default MyRecord;
