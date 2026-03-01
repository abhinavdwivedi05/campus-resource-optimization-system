export const getStoredUser = () => {
  if (typeof window === "undefined") return null;
  const role = localStorage.getItem("role");
  const name = localStorage.getItem("name");
  if (!role && !name) return null;
  return { role, name };
};

export const clearStoredUser = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem("role");
  localStorage.removeItem("name");
};

