import React, { useEffect, useState } from "react";
import {
  pageStyle,
  cardStyle,
  titleStyle,
  subtitleStyle,
  formStyle,
  fieldStyle,
  labelStyle,
  inputBaseStyle,
  buttonStyle,
  buttonDisabledStyle,
} from "../theme";
import { getTimetable as getTimetableApi } from "../services/campusService";
import { addTimetableEntry } from "../services/timetableService";
import { getUserRole } from "../utils/auth";
import TimetableGrid from "../components/TimetableGrid";

function Timetable() {
  const [entries, setEntries] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [roomSummaries, setRoomSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

  const [course, setCourse] = useState("");
  const [faculty, setFaculty] = useState("");
  const [room, setRoom] = useState("");
  const [day, setDay] = useState("");
  const [timeslot, setTimeslot] = useState("");
  const [students, setStudents] = useState("");
  const [capacity, setCapacity] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  const role = getUserRole();
  const canUpload = role === "admin" || role === "faculty";

  const applyConflictFlags = (items) => {
    const facultySlots = {};
    const roomSlots = {};

    items.forEach((e) => {
      const facultyKey = `${e.faculty || ""}__${e.day || ""}__${e.timeslot || ""}`;
      const roomKey = `${e.room || ""}__${e.day || ""}__${e.timeslot || ""}`;

      if (!facultySlots[facultyKey]) facultySlots[facultyKey] = [];
      if (!roomSlots[roomKey]) roomSlots[roomKey] = [];

      facultySlots[facultyKey].push(e);
      roomSlots[roomKey].push(e);
    });

    Object.values(facultySlots).forEach((list) => {
      if (list.length > 1) {
        list.forEach((e) => {
          e._facultyClash = true;
        });
      }
    });

    Object.values(roomSlots).forEach((list) => {
      if (list.length > 1) {
        list.forEach((e) => {
          e._roomClash = true;
        });
      }
    });

    items.forEach((e) => {
      const s = parseInt(e.students || 0, 10) || 0;
      const c = parseInt(e.capacity || 0, 10) || 0;
      if (c && s > c) {
        e._capacityOverflow = true;
      }
    });

    return items;
  };

  const buildRoomSummaries = (items) => {
    const summary = {};

    items.forEach((e) => {
      const roomKey = (e.room || "").trim();
      if (!roomKey) return;

      const s = parseInt(e.students || 0, 10) || 0;
      const c = parseInt(e.capacity || 0, 10) || 0;

      if (!summary[roomKey]) {
        summary[roomKey] = {
          room: roomKey,
          students: 0,
          capacity: 0,
        };
      }

      summary[roomKey].students += s;
      summary[roomKey].capacity = Math.max(summary[roomKey].capacity, c);
    });

    return Object.values(summary).sort((a, b) => a.room.localeCompare(b.room));
  };

  const load = () =>
    getTimetableApi()
      .then((res) => {
        const items = applyConflictFlags([...(res.data || [])]);

        const roomSet = new Set();
        const timeslotSet = new Set();
        items.forEach((e) => {
          if (e.room) roomSet.add(e.room);
          if (e.timeslot) timeslotSet.add(e.timeslot);
        });

        const roomList = Array.from(roomSet).sort((a, b) =>
          a.localeCompare(b)
        );
        const timeslotList = Array.from(timeslotSet);

        setEntries(items);
        setRooms(roomList);
        setTimeslots(timeslotList);
        setRoomSummaries(buildRoomSummaries(items));
      })
      .finally(() => setLoading(false));

  useEffect(() => {
    load();
  }, []);

  const handleAdd = async (e) => {
    e?.preventDefault();
    if (
      !course.trim() ||
      !faculty.trim() ||
      !room.trim() ||
      !day.trim() ||
      !timeslot.trim() ||
      submitting
    )
      return;
    setSubmitting(true);
    setMessage({ type: "", text: "" });
    try {
      await addTimetableEntry({
        course: course.trim(),
        faculty: faculty.trim(),
        room: room.trim(),
        day: day.trim(),
        timeslot: timeslot.trim(),
        students: parseInt(students, 10) || 0,
        capacity: parseInt(capacity, 10) || 0,
      });
      setMessage({ type: "success", text: "Entry added." });
      setCourse("");
      setFaculty("");
      setRoom("");
      setDay("");
      setTimeslot("");
      setStudents("");
      setCapacity("");
      setLoading(true);
      load();
    } catch (err) {
      setMessage({
        type: "error",
        text: err?.response?.data?.detail || "Failed to add entry.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getCellEntries = (roomLabel, timeslotLabel) =>
    entries.filter(
      (e) => e.room === roomLabel && e.timeslot === timeslotLabel
    );

  const getCellColorClass = (cellEntries) => {
    if (!cellEntries || cellEntries.length === 0) {
      return "bg-slate-900/40";
    }

    const hasRoomClash = cellEntries.some((e) => e._roomClash);
    const hasFacultyClash = cellEntries.some((e) => e._facultyClash);
    const hasCapacityOverflow = cellEntries.some((e) => e._capacityOverflow);

    if (hasRoomClash) return "bg-red-200 text-slate-900";
    if (hasFacultyClash) return "bg-yellow-200 text-slate-900";
    if (hasCapacityOverflow) return "bg-orange-200 text-slate-900";
    return "bg-green-100 text-slate-900";
  };

  const getRoomCardClasses = (utilization) => {
    if (utilization > 1) return "bg-red-200 text-red-900";
    if (utilization >= 0.7) return "bg-yellow-200 text-yellow-900";
    return "bg-green-100 text-green-900";
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "1040px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Timetable</h2>
          <p style={subtitleStyle}>
            Visualize room usage and conflicts across the campus timetable.
          </p>
        </header>

        {canUpload && (
          <form
            style={{
              ...formStyle,
              marginBottom: "20px",
              padding: "16px",
              border: "1px solid rgba(148,163,184,0.35)",
              borderRadius: "12px",
              background: "rgba(15,23,42,0.6)",
            }}
            onSubmit={handleAdd}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: "12px",
              }}
            >
              <div style={fieldStyle}>
                <label style={labelStyle}>Course</label>
                <input
                  style={inputBaseStyle}
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  placeholder="e.g. CS101"
                  required
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Faculty</label>
                <input
                  style={inputBaseStyle}
                  value={faculty}
                  onChange={(e) => setFaculty(e.target.value)}
                  placeholder="e.g. Dr. Sharma"
                  required
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Room</label>
                <input
                  style={inputBaseStyle}
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  placeholder="e.g. A101"
                  required
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Day</label>
                <input
                  style={inputBaseStyle}
                  value={day}
                  onChange={(e) => setDay(e.target.value)}
                  placeholder="e.g. Monday"
                  required
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Timeslot</label>
                <input
                  style={inputBaseStyle}
                  value={timeslot}
                  onChange={(e) => setTimeslot(e.target.value)}
                  placeholder="e.g. 9AM"
                  required
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Students</label>
                <input
                  style={inputBaseStyle}
                  type="number"
                  value={students}
                  onChange={(e) => setStudents(e.target.value)}
                  placeholder="0"
                />
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Capacity</label>
                <input
                  style={inputBaseStyle}
                  type="number"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="0"
                />
              </div>
            </div>
            <div
              style={{
                marginTop: "12px",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <button
                type="submit"
                style={{
                  ...buttonStyle,
                  ...(submitting ? buttonDisabledStyle : {}),
                }}
                disabled={submitting}
              >
                {submitting ? "Adding..." : "Add entry"}
              </button>
              {message.text && (
                <span
                  style={{
                    fontSize: "12px",
                    color:
                      message.type === "success" ? "#22c55e" : "#f97373",
                  }}
                >
                  {message.text}
                </span>
              )}
            </div>
          </form>
        )}

        {/* Room utilization cards */}
        <section className="mb-6">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Room utilization
            </h3>
            <p className="text-[11px] text-slate-400">
              Based on all scheduled classes across the timetable.
            </p>
          </div>
          {loading ? (
            <p className="text-xs text-slate-400">Loading timetable...</p>
          ) : roomSummaries.length === 0 ? (
            <p className="text-xs text-slate-400">
              No timetable data available.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
              {roomSummaries.map((r) => {
                const utilization =
                  r.capacity > 0 ? r.students / r.capacity : 0;
                const utilPercent = Math.round(utilization * 100);
                const cardClasses = getRoomCardClasses(utilization);
                return (
                  <div
                    key={r.room}
                    className={`rounded-xl border border-slate-800/60 px-3 py-3 text-xs shadow-sm ${cardClasses}`}
                  >
                    <div className="flex items-baseline justify-between">
                      <p className="text-sm font-semibold">{r.room}</p>
                      <span className="text-[11px] font-medium">
                        {utilPercent}%
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] opacity-80">
                      Students: {r.students} / Capacity: {r.capacity || 0}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Legend */}
        <section className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="font-semibold uppercase tracking-wide mr-2">
            Legend
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-emerald-900/40 ring-1 ring-emerald-500/25" />
            <span>Normal class / available</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span>Faculty clash</span>
            <span className="h-3 w-3 rounded-full bg-orange-900/40 ring-1 ring-orange-500/25" />
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-red-900/40 ring-1 ring-red-500/25" />
            <span>Room clash</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span>Capacity overflow</span>
            <span className="h-3 w-3 rounded-full bg-yellow-900/40 ring-1 ring-yellow-500/25" />
          </span>
        </section>

        {/* Weekly grid (college portal-style) */}
        {loading ? (
          <p className="text-xs text-slate-400">Loading timetable...</p>
        ) : entries.length === 0 ? (
          <p className="text-xs text-slate-400">No timetable data available.</p>
        ) : (
          <TimetableGrid entries={entries} />
        )}
      </div>
    </div>
  );
}

export default Timetable;