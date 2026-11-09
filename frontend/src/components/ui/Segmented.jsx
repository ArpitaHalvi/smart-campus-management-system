/**
 * Small single-choice control (role filter, status filter, Faculty/Student).
 * Selection is shown by weight and a filled surface, not by the action colour.
 */
function Segmented({ label, options, value, onChange }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg bg-surface-secondary p-0.5"
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`h-8 cursor-pointer rounded-md px-3 text-sm transition-colors duration-150 ${
              selected
                ? "bg-surface font-medium text-ink shadow-[0_1px_2px_rgb(0_0_0/0.08)]"
                : "text-ink-secondary hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default Segmented;
