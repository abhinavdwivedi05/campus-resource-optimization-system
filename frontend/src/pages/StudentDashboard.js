import React from "react";
import { Link } from "react-router-dom";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
  gap: "16px",
  marginTop: "20px",
};

const actionCardStyle = {
  background:
    "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%), rgba(15,23,42,0.9)",
  borderRadius: "14px",
  padding: "18px",
  border: "1px solid rgba(148,163,184,0.35)",
  textDecoration: "none",
  color: "#e5e7eb",
  display: "block",
  transition: "border-color 0.2s, box-shadow 0.2s",
};
const actionTitleStyle = { fontSize: "14px", fontWeight: 600, marginBottom: "6px" };
const actionDescStyle = { fontSize: "12px", color: "#9ca3af" };

function StudentDashboard() {
  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "720px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Student Dashboard</h2>
          <p style={subtitleStyle}>
            View your timetable, create complaints, and track their status.
          </p>
        </header>

        <div style={gridStyle}>
          <Link to="/timetable" style={actionCardStyle}>
            <div style={actionTitleStyle}>My Timetable</div>
            <div style={actionDescStyle}>View your scheduled classes and events.</div>
          </Link>
          <Link to="/create-complaint" style={actionCardStyle}>
            <div style={actionTitleStyle}>Create Complaint</div>
            <div style={actionDescStyle}>Report an issue with campus resources.</div>
          </Link>
          <Link to="/complaints" style={actionCardStyle}>
            <div style={actionTitleStyle}>My Complaints</div>
            <div style={actionDescStyle}>Track status of your submitted complaints.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default StudentDashboard;

