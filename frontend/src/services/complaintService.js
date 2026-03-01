import API from "./api";

export const createComplaint = (payload) => {
  return API.post("/complaint", payload);
};

export const getComplaints = () => {
  return API.get("/complaints");
};

export const updateComplaintStatus = (id, status) => {
  return API.put(`/complaint/${id}`, { status });
};

