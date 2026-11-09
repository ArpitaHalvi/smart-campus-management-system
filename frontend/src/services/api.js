import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

// Public endpoints where a 401 just means "wrong credentials", not "session over"
const PUBLIC_PATHS = ["/auth/login/", "/auth/password/"];

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url ?? "";
    const isPublic = PUBLIC_PATHS.some((p) => url.startsWith(p));

    // Expired or invalid session: clear it and send the user to sign in
    if (error.response?.status === 401 && !isPublic) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("user");
      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  },
);

export default api;
