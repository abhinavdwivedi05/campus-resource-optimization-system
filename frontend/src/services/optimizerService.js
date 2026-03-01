import API from "./api";

export const getOptimizationSuggestions = () => {
  return API.get("/timetable/optimize");
};

export const applyOptimizationSuggestion = (payload) => {
  return API.put("/timetable/update", payload);
};

export default {
  getOptimizationSuggestions,
  applyOptimizationSuggestion,
};

