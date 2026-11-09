import Select from "../ui/Select";

/**
 * A labelled dropdown for a link to another record (department, course ...).
 * `options` are { value: id, label }.
 */
function LinkSelect({ label, value, onChange, options, placeholder, error, emptyHint, optional = true }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </span>
      <Select label={label} value={value} onChange={onChange} placeholder={placeholder} options={options} />
      {error ? (
        <p role="alert" className="mt-1.5 text-sm text-danger">{error}</p>
      ) : options.length === 0 && emptyHint ? (
        <p className="mt-1.5 text-sm text-ink-secondary">{emptyHint}</p>
      ) : null}
    </div>
  );
}

export default LinkSelect;
