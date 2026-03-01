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
};
const actionTitleStyle = { fontSize: "14px", fontWeight: 600, marginBottom: "6px" };
const actionDescStyle = { fontSize: "12px", color: "#9ca3af" };

function FacultyDashboard() {
  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "720px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Faculty Dashboard</h2>
          <p style={subtitleStyle}>
            Upload timetable entries and view conflict detection results.
          </p>
        </header>

        <div style={gridStyle}>
          <Link to="/timetable" style={actionCardStyle}>
            <div style={actionTitleStyle}>Upload Timetable</div>
            <div style={actionDescStyle}>Add or view timetable entries (course, room, timeslot).</div>
          </Link>
          <Link to="/timetable-conflicts" style={actionCardStyle}>
            <div style={actionTitleStyle}>View Conflicts</div>
            <div style={actionDescStyle}>See faculty clashes, room clashes, and capacity issues.</div>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default FacultyDashboard;

