import API from "./api";

export const getTimetable = () => {
  return API.get("/timetable");
};

export const getConflicts = () => {
  return API.get("/timetable/conflicts");
};

export const getHeatmap = () => {
  return API.get("/campus/heatmap");
};

export default {
  getTimetable,
  getConflicts,
  getHeatmap,
};

