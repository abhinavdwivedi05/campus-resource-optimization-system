import API from "./api";

export const getTimetable = () => {
  return API.get("/timetable");
};

export const addTimetableEntry = (payload) => {
  return API.post("/timetable", payload);
};

export const detectTimetableConflicts = () => {
  return API.get("/timetable/conflicts");
};

