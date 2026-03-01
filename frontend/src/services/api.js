import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000",
});

// Send role to backend for RBAC - backend expects X-User-Role header
API.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const role = localStorage.getItem("role");
    if (role && typeof role === "string" && role.trim()) {
      config.headers["X-User-Role"] = role.trim();
    }
  }
  return config;
});

export default API;