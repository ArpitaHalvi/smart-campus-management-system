import { ChevronDown } from "lucide-react";

/**
 * A dropdown that matches the other controls. `placeholder` is the label of
 * the "no filter" option (value ""). The chosen value shows in bold so an
 * active filter is easy to spot.
 */
function Select({ label, value, onChange, options, placeholder, className = "" }) {
  return (
    <div className={`relative ${className}`}>
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`h-10 w-full cursor-pointer appearance-none rounded-lg border bg-surface pr-9 pl-3 text-sm hover:border-ink-muted focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-none ${
          value ? "border-primary font-medium text-ink" : "border-line-strong text-ink-secondary"
        }`}
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-ink-muted"
      />
    </div>
  );
}

export default Select;
