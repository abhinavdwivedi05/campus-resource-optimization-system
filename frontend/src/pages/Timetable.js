import React, { useEffect, useState } from "react";
import TimetableTable from "../components/TimetableTable";
import { pageStyle, cardStyle, titleStyle, subtitleStyle, formStyle, fieldStyle, labelStyle, inputBaseStyle, buttonStyle, buttonDisabledStyle } from "../theme";
import { getTimetable, addTimetableEntry } from "../services/timetableService";
import { getUserRole } from "../utils/auth";

function Timetable() {
  const [data, setData] = useState([]);
  const [course, setCourse] = useState("");
  const [faculty, setFaculty] = useState("");
  const [room, setRoom] = useState("");
  const [timeslot, setTimeslot] = useState("");
  const [students, setStudents] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const role = getUserRole();
  const canUpload = role === "admin" || role === "faculty";

  const load = () => getTimetable().then((res) => setData(res.data || []));

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (!course.trim() || !faculty.trim() || !room.trim() || !timeslot.trim() || submitting) return;
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      await addTimetableEntry({
        course: course.trim(),
        faculty: faculty.trim(),
        room: room.trim(),
        timeslot: timeslot.trim(),
        students: parseInt(students, 10) || 0,
        capacity: parseInt(capacity, 10) || 0,
      });
      setMessage({ type: "success", text: "Entry added." });
      setCourse("");
      setFaculty("");
      setRoom("");
      setTimeslot("");
      setStudents("");
      setCapacity("");
      load();
    } catch (err) {
      setMessage({ type: "error", text: err?.response?.data?.detail || "Failed to add entry." });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "880px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Timetable</h2>
          <p style={subtitleStyle}>
            {canUpload ? "View and add timetable entries." : "View your scheduled classes and events."}
          </p>
        </header>

        {canUpload && (
          <form style={{ ...formStyle, marginBottom: "20px", padding: "16px", border: "1px solid rgba(148,163,184,0.35)", borderRadius: "12px", background: "rgba(15,23,42,0.6)" }} onSubmit={handleAdd}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px" }}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Course</label>
                <input style={inputBaseStyle} value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g. CS101" required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Faculty</label>
                <input style={inputBaseStyle} value={faculty} onChange={(e) => setFaculty(e.target.value)} placeholder="e.g. Dr. Sharma" required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Room</label>
                <input style={inputBaseStyle} value={room} onChange={(e) => setRoom(e.target.value)} placeholder="e.g. A101" required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Timeslot</label>
                <input style={inputBaseStyle} value={timeslot} onChange={(e) => setTimeslot(e.target.value)} placeholder="e.g. 9AM" required />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Students</label>
                <input style={inputBaseStyle} type="number" value={students} onChange={(e) => setStudents(e.target.value)} placeholder="0" />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Capacity</label>
                <input style={inputBaseStyle} type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="0" />
              </div>
            </div>
            <div style={{ marginTop: "12px", display: "flex", alignItems: "center", gap: "12px" }}>
              <button type="submit" style={{ ...buttonStyle, ...(submitting ? buttonDisabledStyle : {}) }} disabled={submitting}>
                {submitting ? "Adding..." : "Add entry"}
              </button>
              {message.text && <span style={{ fontSize: "12px", color: message.type === "success" ? "#22c55e" : "#f97373" }}>{message.text}</span>}
            </div>
          </form>
        )}

        <TimetableTable data={data} />
      </div>
    </div>
  );
}

export default Timetable;