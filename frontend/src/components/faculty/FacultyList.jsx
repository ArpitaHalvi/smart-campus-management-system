import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Loader2, Search, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../services/api";
import { useSearchInput } from "../../hooks/useSearchInput";
import PageHeader from "../admin/PageHeader";
import Button from "../ui/Button";
import Select from "../ui/Select";
import { useFacultyBase } from "./useFacultyBase";

const PAGE_SIZE = 10;

function FacultyList() {
  const base = useFacultyBase();
  const [params, setParams] = useSearchParams();
  const department = params.get("department") ?? "";

  const setFilter = (key, fallback = "") => (value) =>
    setParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (value && value !== fallback) next.set(key, value);
        else next.delete(key);
        return next;
      },
      { replace: true },
    );

  // Available departments for filtering
  const [options, setOptions] = useState({ departments: [] });
  useEffect(() => {
    let cancelled = false;
    api
      .get("/academics/departments/")
      .then((res) => !cancelled && setOptions({ departments: res.data.results || res.data }))
      .catch(() => {}); // dropdowns stay empty on failure
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced search
  const search = useSearchInput();

  // Page belongs to current filters; new filters reset to page 1
  const filterKey = [search.query, department].join("|");
  const [pageState, setPageState] = useState({ key: "", page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;
  const goTo = (n) => setPageState({ key: filterKey, page: n });

  // Fetch faculty list
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const requestKey = `${page}|${filterKey}`;
  const [loadedKey, setLoadedKey] = useState(null);
  const loading = !failed && data !== null && loadedKey !== requestKey;

  useEffect(() => {
    let cancelled = false;
    api
      .get("/faculty/", {
        params: {
          page,
          search: search.query || undefined,
          department: department || undefined,
        },
      })
      .then((res) => {
        if (cancelled) return;
        setData(res.data);
        setLoadedKey(requestKey);
        setFailed(false);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404 && page > 1) {
          setPageState({ key: filterKey, page: 1 });
        } else {
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [page, search.query, department, filterKey, requestKey]);

  const totalPages = data ? Math.max(1, Math.ceil(data.count / PAGE_SIZE)) : 1;
  const from = data?.count ? (page - 1) * PAGE_SIZE + 1 : 0;
  const to = data ? Math.min(page * PAGE_SIZE, data.count) : 0;
  const activeFilters = [department].filter(Boolean).length;
  const filtered = Boolean(search.query || activeFilters);

  return (
    <>
      <PageHeader
        title="Faculty"
        description="All faculty members in your institution."
        actions={
          <Button to={`${base}/new`}>
            <UserPlus size={16} aria-hidden="true" /> Add faculty
          </Button>
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
            placeholder="Search name, ID or email"
            aria-label="Search faculty"
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

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Select
          label="Department"
          value={department}
          onChange={setFilter("department")}
          placeholder="All departments"
          options={options.departments.map((d) => ({ value: String(d.id), label: d.name }))}
          className="w-52"
        />
      </div>

      <section aria-busy={loading} className="relative mt-3 overflow-hidden rounded-xl border border-line bg-surface">
        {loading && (
          <div aria-hidden="true" className="delayed-in absolute inset-0 z-10 flex items-start justify-center pt-1">
            <span className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-4 py-2 text-sm font-medium shadow-[0_2px_8px_rgb(0_0_0/0.08)]">
              <Loader2 size={16} className="animate-spin" /> Loading
            </span>
          </div>
        )}
        <div className={`transition-opacity duration-200 ${loading ? "pointer-events-none opacity-40 delay-150 select-none" : ""}`}>
          {failed ? (
            <p role="alert" className="p-5 text-danger">Couldn't load faculty. Check that the backend is running.</p>
          ) : data === null ? (
            <div className="space-y-px p-3" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-14 rounded-md" />
              ))}
            </div>
          ) : data.results.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <p className="font-medium">{filtered ? "No faculty match that" : "No faculty registered yet"}</p>
              <p className="mt-1 text-ink-secondary">
                {filtered ? "Try a different search or clear filters." : "Add your first faculty member to get started."}
              </p>
            </div>
          ) : (
            <>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-line text-sm text-ink-secondary">
                    <th scope="col" className="h-10 w-2/5 px-4 font-medium">
                      Faculty
                    </th>
                    <th scope="col" className="hidden h-10 px-3 font-medium sm:table-cell">
                      ID
                    </th>
                    <th scope="col" className="hidden h-10 px-3 font-medium md:table-cell">
                      Department
                    </th>
                    <th scope="col" className="hidden h-10 px-3 font-medium lg:table-cell">
                      Designation
                    </th>
                    <th scope="col" className="h-10 px-4 text-right font-medium">
                      <span className="sr-only">Open</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.results.map((faculty) => (
                    <tr key={faculty.id} className="border-b border-line last:border-b-0 hover:bg-background">
                      <td className="max-w-0 px-4 py-2.5">
                        <Link to={`${base}/${faculty.id}`} className="block rounded-sm focus-visible:outline-offset-4">
                          <p className="truncate text-[0.9375rem] font-medium">
                            {faculty.user_details?.first_name} {faculty.user_details?.last_name}
                            {!faculty.is_active && <span className="ml-2 text-sm font-normal text-warning">Inactive</span>}
                          </p>
                          <p className="truncate text-sm text-ink-secondary">{faculty.user_details?.email}</p>
                        </Link>
                      </td>
                      <td className="tnum hidden px-3 text-[0.9375rem] sm:table-cell">{faculty.employee_id}</td>
                      <td className="hidden px-3 text-[0.9375rem] md:table-cell">{faculty.department_details?.name || "—"}</td>
                      <td className="hidden px-3 text-[0.9375rem] lg:table-cell">{faculty.designation || "—"}</td>
                      <td className="px-4 py-2.5 text-right whitespace-nowrap">
                        <Link
                          to={`${base}/${faculty.id}`}
                          aria-label={`View ${faculty.user_details?.first_name} ${faculty.user_details?.last_name}`}
                          className="inline-flex h-8 items-center rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
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

export default FacultyList;
