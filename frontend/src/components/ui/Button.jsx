import { Link } from "react-router-dom";

const BASE =
  "inline-flex h-10 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-45";

const VARIANTS = {
  primary: "bg-primary text-white hover:bg-primary-dark",
  secondary:
    "border border-line-strong bg-surface text-ink hover:bg-surface-secondary",
  ghost: "text-ink-secondary hover:bg-surface-secondary hover:text-ink",
};

/**
 * One button vocabulary for the whole app.
 * Pass `to` to render a router link that looks like a button.
 */
function Button({
  variant = "primary",
  to,
  className = "",
  size,
  children,
  ...props
}) {
  const cls = `${BASE} ${VARIANTS[variant]} ${size === "lg" ? "h-11 px-5" : ""} ${className}`;
  if (to) {
    return (
      <Link to={to} className={cls} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} {...props}>
      {children}
    </button>
  );
}

export default Button;
