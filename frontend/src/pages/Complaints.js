import React, { useEffect, useState } from "react";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";
import {
  getComplaints,
  updateComplaintStatus,
} from "../services/complaintService";
import { getUserRole } from "../utils/auth";

const tableWrapperStyle = {
  marginTop: "18px",
  overflowX: "auto",
};

const tableStyle = {
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: 0,
  fontSize: "13px",
  color: "#e5e7eb",
  minWidth: "480px",
};

const thStyle = {
  textAlign: "left",
  padding: "10px 12px",
  backgroundColor: "rgba(15,23,42,0.95)",
  borderBottom: "1px solid rgba(148,163,184,0.5)",
  fontWeight: 500,
  fontSize: "12px",
  color: "#9ca3af",
};

const tdStyle = {
  padding: "10px 12px",
  borderBottom: "1px solid rgba(30,64,175,0.4)",
  backgroundColor: "rgba(15,23,42,0.7)",
  verticalAlign: "middle",
};

const statusPillStyle = (status) => {
  let bg = "rgba(148,163,184,0.16)";
  let color = "#e5e7eb";

  if (status?.toLowerCase() === "resolved") {
    bg = "rgba(34,197,94,0.16)";
    color = "#4ade80"; // green
  } else if (status?.toLowerCase() === "pending") {
    bg = "rgba(250,204,21,0.18)";
    color = "#facc15"; // yellow
  } else if (status?.toLowerCase() === "in progress") {
    bg = "rgba(59,130,246,0.18)";
    color = "#3b82f6"; // blue
  }

  return {
    display: "inline-flex",
    alignItems: "center",
    padding: "4px 10px",
    borderRadius: "999px",
    fontSize: "11px",
    textTransform: "capitalize",
    backgroundColor: bg,
    color,
  };
};

function Complaints() {
  const [complaints, setComplaints] = useState([]);
  const [updatingId, setUpdatingId] = useState(null);
  const role = getUserRole();
  const canResolve = role === "admin" || role === "guard";

  useEffect(() => {
    getComplaints().then((res) => setComplaints(res.data));
  }, []);

  const handleResolve = async (id) => {
    if (!id || updatingId) return;

    setUpdatingId(id);
    try {
      await updateComplaintStatus(id, "Resolved");
      setComplaints((prev) =>
        prev.map((c) =>
          c._id === id
            ? {
                ...c,
                status: "Resolved",
              }
            : c
        )
      );
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "880px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Complaints</h2>
          <p style={subtitleStyle}>
            Review the list of submitted complaints and their current status.
          </p>
        </header>

        <div style={tableWrapperStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>Title</th>
                <th style={thStyle}>Description</th>
                <th style={thStyle}>Location</th>
                <th style={thStyle}>Priority</th>
                <th style={thStyle}>Status</th>
                {canResolve && <th style={thStyle}></th>}
              </tr>
            </thead>
            <tbody>
              {complaints.map((c, i) => (
                <tr key={i}>
                  <td style={tdStyle}>{c.title}</td>
                  <td style={tdStyle}>{c.description}</td>
                  <td style={tdStyle}>{c.location}</td>
                  <td style={tdStyle}>{c.priority}</td>
                  <td style={tdStyle}>
                    <span style={statusPillStyle(c.status)}>{c.status}</span>
                  </td>
                  {canResolve && (
                    <td style={tdStyle}>
                      <button
                        className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500 hover:bg-emerald-400 text-slate-950 disabled:opacity-60 disabled:cursor-not-allowed"
                        disabled={c.status === "Resolved" || updatingId === c._id}
                        onClick={() => handleResolve(c._id)}
                      >
                        {c.status === "Resolved"
                          ? "Resolved"
                          : updatingId === c._id
                          ? "Updating..."
                          : "Resolve"}
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Complaints;