import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import api from "../../services/api";
import { parseApiError } from "../../services/errors";
import { useAuth } from "../../context/AuthContext";

export const fmtDate = (v) => (v ? format(new Date(v + "T00:00:00"), "d MMM yyyy") : "");

/** Only admins can add or edit; faculty can read. */
export function useIsAdmin() {
  return useAuth().user.role === "ADMIN";
}

/**
 * Loads every row of a collection (these lists are small, so one big page).
 * Pass `params` to filter. Call `reload()` after saving.
 */
export function useCollection(path, params = {}) {
  const key = JSON.stringify(params);
  const [state, setState] = useState({ rows: null, failed: false });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .get(path, { params: { page_size: 200, ...JSON.parse(key) } })
      .then((res) => !cancelled && setState({ rows: res.data.results, failed: false }))
      .catch(() => !cancelled && setState((s) => ({ ...s, failed: true })));
    return () => {
      cancelled = true;
    };
  }, [path, key, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { ...state, reload };
}

/**
 * Saves a form: POST for a new row, PATCH for an existing one. Maps the
 * server's field errors back onto the form.
 */
export function useSaver({ path, editingId, fields, onSaved }) {
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");

  const clearError = (key) => errors[key] && setErrors((er) => ({ ...er, [key]: undefined }));

  const save = async (payload) => {
    setSaving(true);
    setBanner("");
    try {
      if (editingId) await api.patch(`${path}${editingId}/`, payload);
      else await api.post(path, payload);
      setErrors({});
      onSaved();
    } catch (err) {
      const { fields: fe, message } = parseApiError(err);
      setErrors(fe);
      setBanner(Object.keys(fe).some((k) => fields.includes(k)) ? "" : message);
    } finally {
      setSaving(false);
    }
  };

  return { saving, errors, setErrors, banner, save, clearError };
}
