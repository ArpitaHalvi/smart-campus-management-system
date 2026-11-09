import { Fragment, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Search } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSearchInput } from "../../hooks/useSearchInput";
import PageHeader, { AddButtons } from "../../components/admin/PageHeader";
import Button from "../../components/ui/Button";
import Segmented from "../../components/ui/Segmented";
import { ROLE_LABEL, STATUS_LABEL, fullName } from "../../components/admin/labels";

const PAGE_SIZE = 10;

const ROLES = [
  { value: "", label: "Everyone" },
  { value: "FACULTY", label: "Faculty" },
  { value: "STUDENT", label: "Students" },
  { value: "ADMIN", label: "Admins" },
];

const STATUSES = [
  { value: "", label: "Any status" },
  { value: "never", label: "Not signed in" },
  { value: "suspended", label: "Suspended" },
  { value: "inactive", label: "Deactivated" },
];

const STATUS_CHOICES = [
  { value: "ACTIVE", label: "Active" },
  { value: "SUSPENDED", label: "Suspended" },
  { value: "INACTIVE", label: "Deactivated" },
];

const STATUS_HELP = {
  ACTIVE: "Can sign in normally.",
  SUSPENDED: "Blocked for now. Use this for a temporary hold you plan to lift.",
  INACTIVE: "Switched off. Use this when the person has left.",
};

/** Inline editor shown under a row. Not a modal, so the list stays in view. */
function StatusEditor({ user, onSaved, onCancel }) {
  const [status, setStatus] = useState(user.status);
  const [reason, setReason] = useState(user.status_reason ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const changed = status !== user.status || (status !== "ACTIVE" && reason !== (user.status_reason ?? ""));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const { data } = await api.patch(`/auth/users/${user.id}/`, {
        status,
        status_reason: status === "ACTIVE" ? "" : reason.trim(),
      });
      onSaved(data);
    } catch (err) {
      const d = err.response?.data;
      setError(
        d?.status?.[0] ?? d?.status_reason?.[0] ?? d?.detail ?? "Couldn't update the account.",
      );
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
      <div>
        <p className="mb-1.5 text-sm font-medium">Account status</p>
        <Segmented label="Account status" options={STATUS_CHOICES} value={status} onChange={setStatus} />
        <p className="mt-1.5 max-w-xs text-sm text-ink-secondary">{STATUS_HELP[status]}</p>
      </div>

      {status !== "ACTIVE" && (
        <div className="min-w-[14rem] flex-1">
          <label htmlFor={`reason-${user.id}`} className="mb-1.5 block text-sm font-medium">
            Reason <span className="font-normal text-ink-muted">(shown to them when they try to sign in)</span>
          </label>
          <input
            id={`reason-${user.id}`}
            value={reason}
            maxLength={255}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Fees pending"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-sm placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
      )}

      <div className="flex items-center gap-2 self-end">
        <Button onClick={save} disabled={!changed || saving}>
          {saving ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Saving
            </>
          ) : (
            "Save"
          )}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
      </div>

      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function Users() {
  const { user: me } = useAuth();
  // Role and status live in the URL so the Overview can link straight here
  const [params, setParams] = useSearchParams();
  const role = params.get("role") ?? "";
  const status = params.get("status") ?? "";

  const setFilter = (key) => (value) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  // Searches only once typing has paused (or on Enter), not on every keystroke
  const search = useSearchInput();

  // The page belongs to the filters it was chosen under; new filters mean page 1
  const filterKey = `${search.query}|${role}|${status}`;
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const goTo = (n) => setPageState({ key: filterKey, page: n });

  const [data, setData] = useState(null); // { count, results }
  const [failed, setFailed] = useState(false);
  const [managing, setManaging] = useState(null); // id of the row being edited

  // Which request the rows on screen belong to. When it differs from the
  // request we want now, a fetch is in flight and the rows are out of date.
  const requestKey = `${page}|${filterKey}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading =
    !failed && data !== null && loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    api
      .get("/auth/users/", {
        params: {
          page,
          search: search.query || undefined,
          role: role || undefined,
          status: status || undefined,
        },
      })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setLoadedKey(requestKey);
        setFailed(false);
        setManaging(null);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404 && page > 1)
          setPageState({ key: filterKey, page: 1 });
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search.query, role, status, filterKey, requestKey]);

  const statusSaved = (u, saved) => {
    setData((d) => ({
      ...d,
      results: d.results.map((r) => (r.id === u.id ? { ...r, ...saved } : r)),
    }));
    setManaging(null);
    toast(`${fullName(u)} is now ${STATUS_LABEL[saved.status].toLowerCase()}`);
  };

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const from = data?.count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.count) : 0;
  const filtered = Boolean(search.query || role || status);

  return (
    <>
      <PageHeader
        title="Users"
        description="Everyone with an account. Activate, suspend or deactivate accounts from here."
        actions={<AddButtons />}
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[14rem] flex-1 sm:max-w-xs">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted"
          />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.update(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search.flush()}
            placeholder="Search name, username or email"
            aria-label="Search users"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        <Segmented label="Role" options={ROLES} value={role} onChange={setFilter("role")} />
        <Segmented label="Status" options={STATUSES} value={status} onChange={setFilter("status")} />
        {loading && (
          <span role="status" className="delayed-in inline-flex items-center gap-2 text-sm text-ink-secondary">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" />
            Loading…
          </span>
        )}
        {!loading && search.pending && (
          <span className="text-sm text-ink-muted">Searches when you stop typing, or press Enter</span>
        )}
      </div>

      <section
        aria-busy={loading}
        className="relative mt-3 overflow-hidden rounded-xl border border-line bg-surface"
      >
        {loading && (
          <div aria-hidden="true" className="delayed-in absolute inset-0 z-10 flex items-start justify-center pt-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.08)]">
              <Loader2 size={16} className="animate-spin" /> Loading
            </span>
          </div>
        )}
        <div
          className={`transition-opacity duration-200 ${
            loading ? "pointer-events-none opacity-40 delay-150 select-none" : ""
          }`}
        >
          {failed ? (
            <p role="alert" className="p-5 text-danger">
              Couldn't load users. Check that the backend is running.
            </p>
          ) : data === null ? (
            <div className="space-y-px p-3" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-14 rounded-md" />
              ))}
            </div>
          ) : data.results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">{filtered ? "No one matches that" : "No accounts yet"}</p>
              <p className="mt-1 text-ink-secondary">
                {filtered
                  ? "Try a different search or clear a filter."
                  : "Add your first faculty member or student to get started."}
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-secondary">
                    <th scope="col" className="h-10 w-2/5 px-4 font-medium">Name</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium sm:table-cell">Role</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium md:table-cell">Status</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium lg:table-cell">Last sign-in</th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">
                      <span className="sr-only">Manage</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((u) => {
                    const isMe = u.id === me.id;
                    const open = managing === u.id;
                    const dim = u.status !== "ACTIVE";
                    return (
                      <Fragment key={u.id}>
                        <tr className={`border-b border-line hover:bg-background ${open ? "bg-background" : ""}`}>
                          <td className="max-w-0 px-4 py-2.5">
                            <p className={`truncate text-[0.9375rem] font-medium ${dim ? "text-ink-muted" : ""}`}>
                              {fullName(u)}
                              {isMe && <span className="ml-2 font-normal text-ink-muted">you</span>}
                            </p>
                            <p className="truncate text-sm text-ink-secondary">
                              <span className="sm:hidden">{ROLE_LABEL[u.role]} · </span>
                              {dim && <span className="text-warning md:hidden">{STATUS_LABEL[u.status]} · </span>}
                              {u.email}
                            </p>
                          </td>
                          <td className="hidden px-3 text-[0.9375rem] sm:table-cell">{ROLE_LABEL[u.role]}</td>
                          <td className="hidden px-3 text-[0.9375rem] md:table-cell">
                            <span className={dim ? "text-warning" : ""}>{STATUS_LABEL[u.status]}</span>
                            {u.status_reason && (
                              <span className="block max-w-[16rem] truncate text-sm text-ink-secondary" title={u.status_reason}>
                                {u.status_reason}
                              </span>
                            )}
                          </td>
                          <td className="hidden px-3 text-[0.9375rem] lg:table-cell">
                            {u.last_login ? (
                              formatDistanceToNow(new Date(u.last_login), { addSuffix: true })
                            ) : (
                              <span className="text-ink-muted">Never</span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => setManaging(open ? null : u.id)}
                              disabled={isMe}
                              aria-expanded={open}
                              aria-label={`Manage ${u.username}`}
                              className="h-8 cursor-pointer rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-line bg-background">
                            <td colSpan={5} className="px-4 pt-1 pb-4">
                              <StatusEditor
                                user={u}
                                onSaved={(saved) => statusSaved(u, saved)}
                                onCancel={() => setManaging(null)}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>

              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="tnum text-sm text-ink-secondary">
                  {from}–{to} of {data.count}
                </p>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => goTo(page - 1)}
                    disabled={page <= 1}
                    aria-label="Previous page"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goTo(page + 1)}
                    disabled={page >= totalPages}
                    aria-label="Next page"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}

export default Users;
