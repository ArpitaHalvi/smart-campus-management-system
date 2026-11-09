import { Loader2, Plus } from "lucide-react";
import Button from "../ui/Button";

/** The little "title, blurb, Add button" row at the top of each tab. */
export function TabHeader({ title, description, addLabel, onAdd, canAdd }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-lg font-semibold tracking-[-0.01em]">{title}</h2>
        <p className="mt-0.5 text-sm text-ink-secondary">{description}</p>
      </div>
      {canAdd && (
        <Button onClick={onAdd}>
          <Plus size={16} aria-hidden="true" /> {addLabel}
        </Button>
      )}
    </div>
  );
}

/** Loading, failed and empty states around a table. */
export function DataPanel({ rows, failed, empty, children }) {
  return (
    <section className="mt-3 overflow-hidden rounded-xl border border-line bg-surface">
      {failed ? (
        <p role="alert" className="p-5 text-danger">Couldn't load this. Check that the backend is running.</p>
      ) : rows === null ? (
        <div className="space-y-px p-3" aria-busy="true">
          {[0, 1, 2].map((i) => <div key={i} className="skeleton h-14 rounded-md" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <p className="font-medium">{empty.title}</p>
          <p className="mt-1 text-ink-secondary">{empty.hint}</p>
        </div>
      ) : (
        <div className="relative overflow-x-auto">{children}</div>
      )}
    </section>
  );
}

/** The inline add/edit card that opens above a table. */
export function FormCard({ title, banner, onSubmit, saving, submitLabel, onCancel, children }) {
  return (
    <form onSubmit={onSubmit} noValidate className="mt-3 rounded-xl border border-primary/40 bg-surface p-5">
      <h3 className="font-semibold">{title}</h3>
      {banner && (
        <div role="alert" className="mt-3 rounded-lg bg-danger/10 px-4 py-3 text-sm font-medium text-danger">{banner}</div>
      )}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? <><Loader2 size={16} className="animate-spin" /> Saving</> : submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel} disabled={saving}>Cancel</Button>
      </div>
    </form>
  );
}

export const EditButton = ({ onClick, label }) => (
  <button
    type="button"
    onClick={onClick}
    aria-label={label}
    className="inline-flex h-8 cursor-pointer items-center rounded-md border border-line-strong px-3 text-sm font-medium text-ink-secondary hover:bg-surface-secondary hover:text-ink"
  >
    Edit
  </button>
);

export const TH = ({ children, className = "" }) => (
  <th scope="col" className={`h-10 px-4 text-left font-medium ${className}`}>{children}</th>
);
