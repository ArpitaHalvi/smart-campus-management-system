/**
 * Turns an axios error from the Django API into
 *  - fields:  { username: "…", email: "…" }  for inline field errors
 *  - message: one general sentence for a banner
 */
export function parseApiError(err) {
  if (!err.response) {
    return {
      fields: {},
      message: "Can't reach the server. Check that the backend is running.",
    };
  }

  const { status, data } = err.response;

  if (status === 401) {
    return {
      fields: {},
      message: data?.detail || "Incorrect username or password.",
    };
  }
  if (status === 403) {
    return { fields: {}, message: "You don't have permission to do that." };
  }

  if (status === 400 && data && typeof data === "object") {
    const fields = {};
    for (const [key, value] of Object.entries(data)) {
      fields[key] = Array.isArray(value) ? value.join(" ") : String(value);
    }
    return { fields, message: fields.detail || fields.non_field_errors || "" };
  }

  return { fields: {}, message: "Something went wrong. Please try again." };
}
