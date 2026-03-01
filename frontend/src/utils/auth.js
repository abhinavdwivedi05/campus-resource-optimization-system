export const getUserRole = () => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("role");
};

