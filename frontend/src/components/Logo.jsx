/**
 * Wordmark: a mortarboard drawn as two flat shapes, plus the name.
 * `light` is for dark backgrounds.
 */
function Logo({ light = false, size = 28, markOnlyOnMobile = false }) {
  const mark = light ? "#ffffff" : "var(--color-primary)";
  const cut = light ? "var(--color-night)" : "var(--color-surface)";
  return (
    <span className="inline-flex items-center gap-2.5">
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M16 4 30 11.5 16 19 2 11.5z" fill={mark} />
        <path d="M8 16.2v5.6c0 1.9 3.6 3.7 8 3.7s8-1.8 8-3.7v-5.6L16 21z" fill={mark} />
        <path d="M16 11.5 25 16v7" stroke={cut} strokeWidth="1.6" fill="none" />
      </svg>
      <span
        className={`text-[1.0625rem] font-semibold tracking-[-0.01em] ${
          light ? "text-white" : "text-ink"
        } ${markOnlyOnMobile ? "hidden sm:inline" : ""}`}
      >
        Smart Campus
      </span>
    </span>
  );
}

export default Logo;
