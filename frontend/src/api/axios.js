import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",
  withCredentials: true,
});

let onSessionExpired = () => {};

export const registerSessionExpiredHandler = (fn) => {
  onSessionExpired = fn;
};

let refreshPromise = null;

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const originalRequest = error.config;
    if (
        error.response?.status === 401 &&
        !originalRequest._retry &&
        !originalRequest.skipAuthRefresh &&
        originalRequest.url !== "/auth/refresh"
    ) {
      originalRequest._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api
            .post("/auth/refresh")
            .finally(() => {
              refreshPromise = null;
            });
        }
        await refreshPromise;
                return api(originalRequest);
      } catch (refreshError) {
        onSessionExpired();

        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export default api;