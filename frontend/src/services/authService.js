import API from "./api";

export const register = (payload) => {
  return API.post("/register", payload);
};

export const login = (payload) => {
  return API.post("/login", payload);
};

