import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const api = axios.create({ baseURL: API_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("reachinbox_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("reachinbox_token");
      localStorage.removeItem("reachinbox_user");
      window.location.href = "/";
    }
    return Promise.reject(err);
  }
);
