import { useCallback, useEffect, useState } from "react";

/** How long to wait after the last keystroke before searching. */
export const SEARCH_DELAY_MS = 2000;

/**
 * State for a search box that doesn't hit the API on every keystroke.
 *
 *  - `value`   what is typed in the box (update this as the user types)
 *  - `query`   what to actually search for. Changes only when the user has
 *              stopped typing for SEARCH_DELAY_MS, or presses Enter (`flush`).
 *              Clearing the box applies straight away, since there is
 *              nothing left to wait for.
 *  - `pending` true while the typed text hasn't been searched yet
 */
export function useSearchInput(delay = SEARCH_DELAY_MS) {
  const [value, setValue] = useState("");
  const [query, setQuery] = useState("");

  const update = useCallback((next) => {
    setValue(next);
    if (!next.trim()) setQuery("");
  }, []);

  const flush = useCallback(() => setQuery(value.trim()), [value]);

  useEffect(() => {
    const typed = value.trim();
    if (!typed || typed === query) return;
    const id = setTimeout(() => setQuery(typed), delay);
    return () => clearTimeout(id); // every new keystroke restarts the wait
  }, [value, query, delay]);

  return { value, query, update, flush, pending: value.trim() !== query };
}
