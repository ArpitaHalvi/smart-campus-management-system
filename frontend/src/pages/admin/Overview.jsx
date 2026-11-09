import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import api from "../../services/api";
import PageHeader, { AddButtons } from "../../components/admin/PageHeader";
import { ROLE_LABEL, fullName } from "../../components/admin/labels";

const ROLE_ROWS = { FACULTY: "Faculty", STUDENT: "Students", ADMIN: "Admins" };

/** A count that drills into the matching filtered list; zero stays plain. */
function Count({ value, role, status }) {
  if (!value) return <span className="text-ink-muted">0</span>;
  const q = new URLSearchParams();
  if (role) q.set("role", role);
  if (status) q.set("status", status);
  return (
    <Link
      to={`/admin/users?${q}`}
      className="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline"
    >
      {value}
    </Link>
  );
}

function Overview() {
  const [stats, setStats] = useState(null);
  const [waiting, setWaiting] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get("/auth/users/stats/"),
      api.get("/auth/users/", { params: { status: "never" } }),
    ])
      .then(([s, w]) => {
        if (cancelled) return;
        setStats(s.data);
        setWaiting(w.data.results.slice(0, 6));
      })
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Who has an account, and who still hasn't used it."
        actions={<AddButtons />}
      />

      {failed && (
        <p
          role="alert"
          className="mt-5 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger"
        >
          Couldn't load the dashboard. Check that the backend is running.
        </p>
      )}

      <div className="mt-5 grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Register: role by account state */}
        <section
          aria-labelledby="register-h"
          className="overflow-hidden rounded-xl border border-line bg-surface"
        >
          <h2 id="register-h" className="px-4 pt-4 pb-3 font-semibold">
            Register
          </h2>
          <table className="w-full text-left text-[0.9375rem]">
            <thead>
              <tr className="border-y border-line text-sm text-ink-secondary">
                <th scope="col" className="h-10 px-4 font-medium">Role</th>
                <th scope="col" className="h-10 px-3 text-right font-medium">People</th>
                <th scope="col" className="h-10 px-3 text-right font-medium">Suspended</th>
                <th scope="col" className="h-10 px-3 text-right font-medium">Deactivated</th>
                <th scope="col" className="h-10 px-4 text-right font-medium">Not signed in</th>
              </tr>
            </thead>
            <tbody>
              {stats
                ? stats.by_role.map((r) => (
                    <tr key={r.role} className="border-b border-line">
                      <th scope="row" className="h-11 px-4 font-normal">
                        {ROLE_ROWS[r.role]}
                      </th>
                      <td className="px-3 text-right">
                        <Count value={r.total} role={r.role} />
                      </td>
                      <td className="px-3 text-right">
                        <Count value={r.suspended} role={r.role} status="suspended" />
                      </td>
                      <td className="px-3 text-right">
                        <Count value={r.inactive} role={r.role} status="inactive" />
                      </td>
                      <td className="px-4 text-right">
                        <Count value={r.never_signed_in} role={r.role} status="never" />
                      </td>
                    </tr>
                  ))
                : [0, 1, 2].map((i) => (
                    <tr key={i} className="border-b border-line">
                      <td colSpan={5} className="px-4 py-2">
                        <div className="skeleton h-8 rounded-md" />
                      </td>
                    </tr>
                  ))}
            </tbody>
            {stats && (
              <tfoot>
                <tr className="bg-background font-medium">
                  <th scope="row" className="h-11 px-4 text-left font-medium">
                    Everyone
                  </th>
                  <td className="px-3 text-right">{stats.total}</td>
                  <td className="px-3 text-right">{stats.suspended}</td>
                  <td className="px-3 text-right">{stats.inactive}</td>
                  <td className="px-4 text-right">{stats.never_signed_in}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </section>

        {/* Accounts handed out but not used yet */}
        <section
          aria-labelledby="waiting-h"
          className="rounded-xl border border-line bg-surface p-4"
        >
          <h2 id="waiting-h" className="font-semibold">
            Waiting to sign in
          </h2>
          <p className="mt-1 text-sm text-ink-secondary">
            Accounts created but never used. Worth a nudge.
          </p>

          {waiting === null ? (
            <div className="mt-4 space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton h-11 rounded-md" />
              ))}
            </div>
          ) : waiting.length === 0 ? (
            <p className="mt-5 text-ink-secondary">
              Everyone with an account has signed in at least once.
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-line">
                {waiting.map((u) => (
                  <li
                    key={u.id}
                    className="flex items-baseline justify-between gap-4 py-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-[0.9375rem] font-medium">
                        {fullName(u)}
                      </p>
                      <p className="truncate text-sm text-ink-secondary">
                        {ROLE_LABEL[u.role]}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm text-ink-muted">
                      {formatDistanceToNow(new Date(u.date_joined), {
                        addSuffix: true,
                      })}
                    </p>
                  </li>
                ))}
              </ul>
              <Link
                to="/admin/users?status=never"
                className="mt-3 inline-block rounded-sm text-sm font-medium text-primary underline-offset-4 hover:underline"
              >
                See all {stats?.never_signed_in ?? ""}
              </Link>
            </>
          )}
        </section>
      </div>
    </>
  );
}

export default Overview;
