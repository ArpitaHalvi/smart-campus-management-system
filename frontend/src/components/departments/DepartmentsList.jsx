import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Pencil, Plus, Search } from "lucide-react";
import api from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useSearchInput } from "../../hooks/useSearchInput";
import PageHeader from "../admin/PageHeader";
import Button from "../ui/Button";

const PAGE_SIZE = 10;

/** Everyone can read the list; only admins can add or edit. */
function DepartmentsList() {
  const { user } = useAuth();
  const isAdmin = user.role === "ADMIN";
  const base = isAdmin ? "/admin" : "/faculty";

  // Searches only once typing has paused (or on Enter), not on every keystroke
  const search = useSearchInput();

  // The page belongs to the search it was chosen under; a new search means page 1
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const page = pageState.key === search.query ? pageState.page : 1;
  const goTo = (n) => setPageState({ key: search.query, page: n });

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const requestKey = `${page}|${search.query}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = !failed && data !== null && loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    api
      .get("/academics/departments/", { params: { page, search: search.query || undefined } })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setLoadedKey(requestKey);
        setFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404 && page > 1) setPageState({ key: search.query, page: 1 });
        else setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [page, search.query, requestKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const from = data?.count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.count) : 0;

  return (
    <>
      <PageHeader
        title="Departments"
        description={isAdmin ? "The academic departments students belong to." : "The academic departments on campus."}
        actions={
          isAdmin && (
            <Button to="/admin/departments/new">
              <Plus size={16} aria-hidden="true" /> Add department
            </Button>
          )
        }
      />

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[16rem] flex-1 sm:max-w-sm">
          <Search size={16} aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
          <input
            type="search"
            value={search.value}
            onChange={(e) => search.update(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search.flush()}
            placeholder="Search name or code"
            aria-label="Search departments"
            className="h-10 w-full rounded-lg border border-line-strong bg-surface pr-3 pl-9 text-sm placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none"
          />
        </div>
        {loading && (
          <span role="status" className="delayed-in inline-flex items-center gap-2 text-sm text-ink-secondary">
            <Loader2 size={16} className="animate-spin" aria-hidden="true" /> Loading…
          </span>
        )}
        {!loading && search.pending && (
          <span className="text-sm text-ink-muted">Searches when you stop typing, or press Enter</span>
        )}
      </div>

      <section aria-busy={loading} className="relative mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        <div className={`transition-opacity duration-200 ${loading ? "pointer-events-none opacity-40 delay-150" : ""}`}>
          {failed ? (
            <p role="alert" className="p-5 text-danger">Couldn't load departments. Check that the backend is running.</p>
          ) : data === null ? (
            <div className="space-y-px p-3" aria-busy="true">
              {[0, 1, 2, 3].map((i) => <div key={i} className="skeleton h-14 rounded-md" />)}
            </div>
          ) : data.results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">{search.query ? "No departments match that" : "No departments yet"}</p>
              <p className="mt-1 text-ink-secondary">
                {search.query
                  ? "Try a different search."
                  : isAdmin
                    ? "Add your first department to start placing students in it."
                    : "An administrator hasn't added any departments yet."}
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-secondary">
                    <th scope="col" className="h-10 w-2/5 px-4 font-medium">Department</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium sm:table-cell">Head</th>
                    <th scope="col" className="h-10 px-3 text-right font-medium">Students</th>
                    <th scope="col" className="hidden h-10 px-3 font-medium lg:table-cell">About</th>
                    {isAdmin && <th scope="col" className="h-10 px-4"><span className="sr-only">Edit</span></th>}
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((d) => (
                    <tr key={d.id} className="border-b border-line align-top last:border-b-0 hover:bg-background">
                      <td className="max-w-0 px-4 py-3">
                        <p className="text-[0.9375rem] font-medium sm:truncate">
                          {d.name}
                          {d.code && <span className="ml-2 text-sm font-normal text-ink-muted">{d.code}</span>}
                        </p>
                        <p className="truncate text-sm text-ink-secondary sm:hidden">
                          {d.head_name ? `Head: ${d.head_name}` : "No head assigned"}
                        </p>
                      </td>
                      <td className="hidden px-3 py-3 text-[0.9375rem] sm:table-cell">
                        {d.head_name ?? <span className="text-ink-muted">Not assigned</span>}
                      </td>
                      <td className="tnum px-3 py-3 text-right text-[0.9375rem]">
                        {d.student_count > 0 ? (
                          <Link
                            to={`${base}/students?department=${d.id}`}
                            className="rounded-sm font-medium underline-offset-4 hover:text-primary hover:underline"
                            aria-label={`View ${d.student_count} students in ${d.name}`}
                          >
                            {d.student_count}
                          </Link>
                        ) : (
                          <span className="text-ink-muted">0</span>
                        )}
                      </td>
                      <td className="hidden max-w-xs px-3 py-3 text-sm text-ink-secondary lg:table-cell">
                        <p className="line-clamp-2">{d.description || <span className="text-ink-muted">—</span>}</p>
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <Link
                            to={`/admin/departments/${d.id}/edit`}
                            aria-label={`Edit ${d.name}`}
                            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink"
                          >
                            <Pencil size={14} aria-hidden="true" /> Edit
                          </Link>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between px-4 py-2.5">
                <p className="tnum text-sm text-ink-secondary">{from}–{to} of {data.count}</p>
                <div className="flex gap-1">
                  <button type="button" onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" onClick={() => goTo(page + 1)} disabled={page >= totalPages} aria-label="Next page"
                    className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md border border-line-strong hover:bg-surface-secondary disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent">
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

export default DepartmentsList;
