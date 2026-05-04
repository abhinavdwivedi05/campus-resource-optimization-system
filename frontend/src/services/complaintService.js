import API from "./api";

export const createComplaint = (payload) => {
  return API.post("/complaint", payload, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

export const getComplaints = () => {
  return API.get("/complaints");
};

export const updateComplaintStatus = (id, status) => {
  return API.put(`/complaint/${id}`, { status });
};

