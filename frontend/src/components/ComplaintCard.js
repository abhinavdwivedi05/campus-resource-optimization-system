import React from "react";

function ComplaintCard({ complaint }) {
  return (
    <div style={{ border: "1px solid gray", margin: "10px", padding: "10px" }}>
      <h3>{complaint.title}</h3>
      <p>{complaint.description}</p>
      <p>Status: {complaint.status}</p>
    </div>
  );
}

export default ComplaintCard;