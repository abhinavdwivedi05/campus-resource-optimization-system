import React, { useEffect, useState } from "react";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";
import { getTimetable, getConflicts } from "../services/campusService";

function TimetableConflicts() {
  const [timetable, setTimetable] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [loadingTable, setLoadingTable] = useState(true);
  const [loadingConflicts, setLoadingConflicts] = useState(false);

  useEffect(() => {
    getTimetable()
      .then((res) => setTimetable(res.data || []))
      .finally(() => setLoadingTable(false));
  }, []);

  const handleDetectConflicts = async () => {
    setLoadingConflicts(true);
    try {
      const res = await getConflicts();
      setConflicts(res.data || []);
    } finally {
      setLoadingConflicts(false);
    }
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "960px" }}>
        <header style={{ marginBottom: "16px" }}>
          <h2 style={titleStyle}>Timetable Conflicts</h2>
          <p style={subtitleStyle}>
            Review current timetable assignments and automatically detect
            faculty, room, and capacity conflicts.
          </p>
        </header>

        {/* Top controls */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            Showing {timetable.length} timetable entries.
          </p>
          <button
            onClick={handleDetectConflicts}
            disabled={loadingConflicts}
            className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-md hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingConflicts ? "Checking..." : "Detect Conflicts"}
          </button>
        </div>

        {/* Timetable table */}
        <div className="overflow-x-auto rounded-xl border border-slate-700/60 bg-slate-900/40">
          <table className="min-w-full text-sm text-slate-100">
            <thead className="bg-slate-900/70">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                  Course
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                  Faculty
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                  Room
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                  Timeslot
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                  Students
                </th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">
                  Capacity
                </th>
              </tr>
            </thead>
            <tbody>
              {loadingTable ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs text-slate-400"
                  >
                    Loading timetable...
                  </td>
                </tr>
              ) : timetable.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-xs text-slate-400"
                  >
                    No timetable data available.
                  </td>
                </tr>
              ) : (
                timetable.map((row) => (
                  <tr
                    key={row._id}
                    className="border-t border-slate-800/70 hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-2">{row.course}</td>
                    <td className="px-4 py-2">{row.faculty}</td>
                    <td className="px-4 py-2">{row.room}</td>
                    <td className="px-4 py-2">{row.timeslot}</td>
                    <td className="px-4 py-2">{row.students}</td>
                    <td className="px-4 py-2">{row.capacity}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Conflict cards */}
        <div className="mt-6 space-y-3">
          {conflicts.length === 0 && !loadingConflicts ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/60 bg-emerald-900/40 px-4 py-3 text-xs text-emerald-100">
              <span className="text-lg leading-none">✓</span>
              <div>
                <p className="font-semibold">No conflicts detected</p>
                <p className="mt-0.5 text-[11px] text-emerald-200/80">
                  Run &quot;Detect Conflicts&quot; after updating the timetable
                  to ensure resources are optimized.
                </p>
              </div>
            </div>
          ) : null}

          {conflicts.map((conflict, index) => (
            <div
              key={index}
              className="flex items-start gap-3 rounded-xl border border-amber-500/70 bg-amber-900/40 px-4 py-3 text-xs text-amber-100"
            >
              <span className="text-lg leading-none">!</span>
              <div>
                <p className="font-semibold">{conflict.type}</p>
                <p className="mt-0.5 text-[11px] text-amber-100/90">
                  {(conflict.course || "Unknown course") +
                    " · " +
                    (conflict.faculty || "Unknown faculty")}
                </p>
                <p className="mt-0.5 text-[11px] text-amber-100/90">
                  Room {conflict.room || "-"} at {conflict.timeslot || "-"}
                </p>
                <p className="mt-0.5 text-[11px] text-amber-100/80">
                  Students: {conflict.students ?? 0} /{" "}
                  {conflict.capacity ?? 0}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default TimetableConflicts;

