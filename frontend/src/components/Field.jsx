import { useId } from "react";

const BASE =
  "w-full rounded-lg border bg-surface px-3.5 text-[0.9375rem] text-ink transition-colors duration-150 placeholder:text-ink-muted hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none";

/**
 * Labelled input (or textarea, with `multiline`) with an inline error.
 * `action` is an optional node at the right edge (e.g. show/hide password).
 */
function Field({
  label,
  error,
  action,
  hint,
  multiline = false,
  optional = false,
  className = "",
  ...inputProps
}) {
  const id = useId();
  const describedBy = error ? `${id}-err` : hint ? `${id}-hint` : undefined;
  const border = error ? "border-danger" : "border-line-strong";
  const Tag = multiline ? "textarea" : "input";

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
        {optional && <span className="font-normal text-ink-muted"> (optional)</span>}
      </label>
      <div className="relative">
        <Tag
          id={id}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={describedBy}
          rows={multiline ? 3 : undefined}
          {...inputProps}
          className={`${BASE} ${border} ${multiline ? "resize-y py-2.5" : "h-11"} ${
            action ? "pr-12" : ""
          }`}
        />
        {action && (
          <div className="absolute inset-y-0 right-1.5 flex items-center">
            {action}
          </div>
        )}
      </div>
      {error ? (
        <p id={`${id}-err`} role="alert" className="mt-1.5 text-sm text-danger">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-sm text-ink-secondary">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export default Field;
