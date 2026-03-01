import API from "./api";

export const getAnalytics = () => {
  return API.get("/analytics");
};
