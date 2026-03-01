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

function Timetable() {
  const [entries, setEntries] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [timeslots, setTimeslots] = useState([]);
  const [roomSummaries, setRoomSummaries] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const applyConflictFlags = (items) => {
    const facultySlots = {};
    const roomSlots = {};

    items.forEach((e) => {
      const facultyKey = `${e.faculty || ""}__${e.timeslot || ""}`;
      const roomKey = `${e.room || ""}__${e.timeslot || ""}`;

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
            <span className="h-3 w-3 rounded-full bg-green-100" />
            <span>Normal class / available</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-yellow-200" />
            <span>Faculty clash</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-red-200" />
            <span>Room clash</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-orange-200" />
            <span>Capacity overflow</span>
          </span>
        </section>

        {/* Timetable grid */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/40">
          <table className="min-w-full text-xs text-slate-100">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-3 py-2 text-left font-semibold text-slate-400">
                  Room / Time
                </th>
                {timeslots.map((slot) => (
                  <th
                    key={slot}
                    className="px-3 py-2 text-center font-semibold text-slate-400"
                  >
                    {slot}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={1 + timeslots.length}
                    className="px-4 py-6 text-center text-xs text-slate-400"
                  >
                    Loading timetable...
                  </td>
                </tr>
              ) : rooms.length === 0 || timeslots.length === 0 ? (
                <tr>
                  <td
                    colSpan={1 + timeslots.length}
                    className="px-4 py-6 text-center text-xs text-slate-400"
                  >
                    No timetable data available.
                  </td>
                </tr>
              ) : (
                rooms.map((roomLabel) => (
                  <tr
                    key={roomLabel}
                    className="border-t border-slate-800/70 hover:bg-slate-900/40"
                  >
                    <td className="px-3 py-2 text-sm font-medium text-slate-200">
                      {roomLabel}
                    </td>
                    {timeslots.map((slot) => {
                      const cellEntries = getCellEntries(roomLabel, slot);
                      const bgClass = getCellColorClass(cellEntries);
                      return (
                        <td
                          key={slot}
                          className={`px-2 py-2 align-top`}
                        >
                          <div
                            className={`min-h-[52px] rounded-md px-2 py-1.5 text-[11px] leading-snug ${bgClass}`}
                          >
                            {cellEntries.length === 0 ? (
                              <span className="opacity-50">—</span>
                            ) : (
                              cellEntries.map((e, idx) => (
                                <div
                                  key={`${e._id || idx}`}
                                  className={
                                    idx > 0
                                      ? "mt-1 border-t border-black/10 pt-1"
                                      : ""
                                  }
                                >
                                  <p className="font-semibold">
                                    {e.course || "Unknown course"}
                                  </p>
                                  <p className="opacity-80">
                                    {e.faculty || "Unknown faculty"}
                                  </p>
                                  <p className="opacity-80">
                                    Students: {e.students || 0} /{" "}
                                    {e.capacity || 0}
                                  </p>
                                </div>
                              ))
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Timetable;