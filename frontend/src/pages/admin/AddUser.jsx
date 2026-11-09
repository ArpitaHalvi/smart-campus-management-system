import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import CreateUserForm from "../../components/CreateUserForm";
import Handover from "../../components/Handover";

/** Admin adds a faculty member. Students are registered from the Students page. */
function AddUser() {
  const [created, setCreated] = useState(null);
  // Remounts the form so "Add another" starts clean
  const [formKey, setFormKey] = useState(0);

  return (
    <>
      <Link
        to="/admin/users"
        className="inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-ink-secondary hover:text-ink"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Users
      </Link>

      <header className="mt-3">
        <h1 className="text-2xl font-semibold tracking-[-0.02em]">
          Add a faculty member
        </h1>
        <p className="mt-1 text-ink-secondary">
          They can sign in, view students, and register new ones.
        </p>
      </header>

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <section className="rounded-xl border border-line bg-surface p-5">
          <CreateUserForm
            key={formKey}
            role="FACULTY"
            onCreated={setCreated}
          />
        </section>

        <aside
          aria-label="Login details"
          className="rounded-xl border border-line bg-surface p-5"
        >
          {created ? (
            <Handover
              account={created}
              onAnother={() => {
                setCreated(null);
                setFormKey((k) => k + 1);
              }}
            />
          ) : (
            <>
              <h2 className="font-semibold">After you create the account</h2>
              <ul className="mt-3 space-y-2.5 text-[0.9375rem] leading-relaxed text-ink-secondary">
                <li>The login details appear here, ready to hand over.</li>
                <li>
                  They sign in with their username and password at the normal
                  sign-in page.
                </li>
                <li>
                  If they forget the password, Forgot password emails them a
                  reset link.
                </li>
              </ul>
            </>
          )}
        </aside>
      </div>
    </>
  );
}

export default AddUser;
