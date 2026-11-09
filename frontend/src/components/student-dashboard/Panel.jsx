/**
 * The frame every dashboard block sits in: a flat panel with a title and an
 * optional note on the right. `index` staggers the entrance a little.
 * `sample` marks panels that show sample data until their module exists.
 */
function Panel({ title, note, sample = false, index = 0, className = "", children, ...rest }) {
  return (
    <section
      {...rest}
      className={`panel-in min-w-0 rounded-xl border border-line bg-surface p-5 ${className}`}
      style={{ "--i": index }}
    >
      <header className="flex items-baseline justify-between gap-3">
        <h2 className="text-[0.9375rem] font-semibold">{title}</h2>
        {(note || sample) && (
          <p className="shrink-0 text-xs text-ink-muted">
            {note}
            {note && sample ? " · " : ""}
            {sample ? "Sample data" : ""}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

export default Panel;

/** A friendly empty state that keeps the panel's frame. */
export function Empty({ title, hint }) {
  return (
    <div className="mt-5 rounded-lg bg-background px-4 py-6 text-center">
      <p className="text-[0.9375rem] font-medium">{title}</p>
      {hint && <p className="mt-1 text-sm text-ink-secondary">{hint}</p>}
    </div>
  );
}
