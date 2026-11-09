import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StudentForm from "./StudentForm";
import Handover from "../Handover";
import Button from "../ui/Button";
import { useStudentsBase } from "./useStudentsBase";

function RegisterStudent() {
  const base = useStudentsBase();
  const [created, setCreated] = useState(null); // { student, password }
  // Remounts the form so "Add another" starts clean
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <Link
        to={base}
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Students
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">Register a student</h1>
        <p className="mt-1 text-ink-secondary">
          Creates their record and their sign-in account together.
        </p>
      </header>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-xl border border-line bg-surface p-5">
          <StudentForm
            key={formKey}
            onSaved={(student, password) => setCreated({ student, password })}
          />
        </section>

        <aside
          aria-label="Login details"
          className="rounded-xl border border-line bg-surface p-5 lg:sticky lg:top-6"
        >
          {created ? (
            <Handover
              account={{ ...created.student, password: created.password, role: "STUDENT" }}
              onAnother={() => {
                setCreated(null);
                setFormKey((k) => k + 1);
              }}
            >
              <Button variant="secondary" to={`${base}/${created.student.id}`}>
                View profile
              </Button>
            </Handover>
          ) : (
            <>
              <h2 className="font-semibold">After you register</h2>
              <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-relaxed text-ink-secondary">
                <li>The student's sign-in details appear here, ready to hand over.</li>
                <li>A unique student ID is assigned unless you enter one.</li>
                <li>Everything except the name and email is optional, and can be filled in later.</li>
              </ul>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

export default RegisterStudent;
