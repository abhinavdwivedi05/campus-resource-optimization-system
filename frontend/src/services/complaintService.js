import API from "./api";

export const createComplaint = (payload) => {
  const isFormData = typeof FormData !== "undefined" && payload instanceof FormData;
  // NOTE: When sending FormData, do NOT manually set Content-Type.
  // Axios will set the correct multipart boundary automatically.
  return API.post("/complaint", payload, {
    headers: isFormData ? undefined : { "Content-Type": "application/json" },
  });
};

export const getComplaints = () => {
  return API.get("/complaints");
};

export const updateComplaintStatus = (id, status) => {
  return API.put(`/complaint/${id}`, { status });
};

