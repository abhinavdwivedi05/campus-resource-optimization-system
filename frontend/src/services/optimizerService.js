import API from "./api";

export const getOptimizationSuggestions = () => {
  return API.get("/timetable/optimize");
};

export const applyOptimizationSuggestion = (payload) => {
  // For backend-driven auto-rescheduling (multi-class conflicts)
  if (payload?.mode === "auto_reschedule" && payload?.entryId) {
    return API.post("/optimize/apply", { entryId: payload.entryId });
  }
  // Fallback: direct update
  return API.put("/timetable/update", payload);
};

export default {
  getOptimizationSuggestions,
  applyOptimizationSuggestion,
};

