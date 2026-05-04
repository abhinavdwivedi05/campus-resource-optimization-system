import React from "react";

function ComplaintCard({ complaint }) {
  const rawImageUrl = complaint?.image_url;
  const normalizedPath =
    typeof rawImageUrl === "string" && rawImageUrl.trim()
      ? rawImageUrl.trim().replace(/^\/+/, "")
      : "";
  const imageUrl = normalizedPath ? `http://localhost:8000/${normalizedPath}` : null;

  return (
    <div style={{ border: "1px solid gray", margin: "10px", padding: "10px" }}>
      <h3>{complaint.title}</h3>
      {imageUrl && (
        <img
          src={imageUrl}
          alt="complaint"
          style={{ width: "100%", height: "auto", borderRadius: "8px" }}
        />
      )}
      <p>{complaint.description}</p>
      <p>Status: {complaint.status}</p>
    </div>
  );
}

export default ComplaintCard;