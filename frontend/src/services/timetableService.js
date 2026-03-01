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

export const uploadTimetable = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post("/timetable/upload", formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};

