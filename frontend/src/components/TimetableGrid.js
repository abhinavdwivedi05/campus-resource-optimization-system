import React, { useMemo } from "react";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];
const TIMESLOTS = [
  "9AM",
  "10AM",
  "11AM",
  "12PM",
  "1PM",
  "2PM",
  "3PM",
  "4PM",
  "5PM",
  "6PM",
];

const DEBUG_GRID = true;

function s(v) {
  return (v ?? "").toString().trim();
}

function capitalize(str) {
  const x = s(str);
  return x ? x.charAt(0).toUpperCase() + x.slice(1) : "";
}

function normalizeDay(day) {
  return s(day).toLowerCase();
}

function normalizeTime(time) {
  const raw = s(time);
  if (!raw) return "";

  // User-required baseline normalization
  let t = raw.replace(/\s/g, "").toUpperCase();

  // Common formats -> 9AM
  // - 09:00 / 09:00AM / 9:00 / 9:00AM
  const m = t.match(/^(\d{1,2})(?::(\d{2}))?(AM|PM)?$/);
  if (m) {
    let hh = parseInt(m[1], 10);
    const meridiem = m[3];
    if (!Number.isFinite(hh) || hh <= 0) return t;

    // If AM/PM missing and hour is 13-23, convert from 24h to PM/AM
    if (!meridiem && hh >= 13 && hh <= 23) {
      const hour12 = hh % 12 || 12;
      return `${hour12}PM`;
    }
    if (!meridiem && hh === 24) return "12AM";

    // Preserve hour for already-12h strings, but strip leading zero.
    if (meridiem) {
      hh = hh % 12 || 12;
      return `${hh}${meridiem}`;
    }
  }

  // 0900 / 1300 -> try map to hour
  const m2 = t.match(/^(\d{2})(\d{2})$/);
  if (m2) {
    const hh24 = parseInt(m2[1], 10);
    const mm = parseInt(m2[2], 10);
    if (Number.isFinite(hh24) && Number.isFinite(mm) && mm === 0) {
      if (hh24 === 0) return "12AM";
      if (hh24 === 12) return "12PM";
      if (hh24 > 12) return `${hh24 - 12}PM`;
      return `${hh24}AM`;
    }
  }

  // Final fallback: already like 9AM / 10AM etc.
  return t;
}

function toInt(v) {
  const n = parseInt(v ?? 0, 10);
  return Number.isFinite(n) ? n : 0;
}

function buildGrid(entries) {
  const grid = {};
  const conflicts = {};

  DAYS.forEach((d) => {
    grid[d] = {};
    conflicts[d] = {};
    TIMESLOTS.forEach((t) => {
      grid[d][t] = [];
      conflicts[d][t] = false;
    });
  });

  const ignored = [];

  (Array.isArray(entries) ? entries : []).forEach((e) => {
    const day = normalizeDay(e.day) || "monday";
    const ts = normalizeTime(e.timeslot);
    if (!grid[day] || !grid[day][ts]) {
      ignored.push({
        originalDay: e?.day,
        normalizedDay: day,
        originalTimeslot: e?.timeslot,
        normalizedTimeslot: ts,
        course: e?.course,
        room: e?.room,
        faculty: e?.faculty,
      });
      return;
    }
    grid[day][ts].push(e);
  });

  if (DEBUG_GRID && ignored.length) {
    // eslint-disable-next-line no-console
    console.groupCollapsed(
      `[TimetableGrid] Ignored ${ignored.length} entries (unmatched day/time)`
    );
    // eslint-disable-next-line no-console
    console.table(ignored.slice(0, 50));
    // eslint-disable-next-line no-console
    console.groupEnd();
  }

  DAYS.forEach((day) => {
    TIMESLOTS.forEach((ts) => {
      const cell = grid[day][ts];
      if (!cell || cell.length === 0) return;

      // Portal grid: anything overlapping the same (day+timeslot) is a conflict.
      let conflict = cell.length > 1;

      const facultySeen = new Set();
      const roomSeen = new Set();
      for (const e of cell) {
        const faculty = s(e.faculty);
        const room = s(e.room);
        const students = toInt(e.students);
        const capacity = toInt(e.capacity);

        if (capacity > 0 && students > capacity) conflict = true;
        if (faculty && facultySeen.has(faculty)) conflict = true;
        if (room && roomSeen.has(room)) conflict = true;

        if (faculty) facultySeen.add(faculty);
        if (room) roomSeen.add(room);
      }

      conflicts[day][ts] = conflict;
    });
  });

  return { grid, conflicts };
}

function tooltip(cell) {
  if (!cell || cell.length === 0) return "";
  return cell
    .map((e) => {
      const course = s(e.course) || "—";
      const faculty = s(e.faculty) || "—";
      const room = s(e.room) || "—";
      const students = toInt(e.students);
      const capacity = toInt(e.capacity);
      return `${course} | ${faculty} | ${room} | ${students}/${capacity}`;
    })
    .join("\n");
}

export default function TimetableGrid({ entries = [] }) {
  const { grid, conflicts } = useMemo(() => buildGrid(entries), [entries]);

  return (
    <div>
      <div className="overflow-auto rounded-xl border border-slate-700/60 bg-slate-900/40">
        <table className="min-w-[980px] table-fixed border-collapse text-xs text-slate-100">
          <thead>
            <tr>
              <th className="sticky left-0 top-0 z-30 w-32 border border-slate-700/60 bg-slate-950 px-3 py-2 text-left font-semibold text-slate-200">
                Day
              </th>
              {TIMESLOTS.map((t) => (
                <th
                  key={t}
                  className="sticky top-0 z-20 border border-slate-700/60 bg-slate-900 px-3 py-2 text-center font-semibold text-slate-200"
                >
                  {t}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {DAYS.map((day) => (
              <tr key={day} className="hover:bg-white/5">
                <td className="sticky left-0 z-10 border border-slate-800/70 bg-slate-950 px-3 py-2 text-left font-semibold text-slate-200">
                  {capitalize(day)}
                </td>
                {TIMESLOTS.map((t) => {
                  const cell = grid?.[day]?.[t] || [];
                  const conflict = !!conflicts?.[day]?.[t];
                  const bg =
                    cell.length === 0
                      ? "bg-transparent"
                      : conflict
                      ? "bg-red-500/20"
                      : "bg-emerald-500/15";

                  return (
                    <td
                      key={`${day}-${t}`}
                      title={tooltip(cell)}
                      className={`border border-slate-800/70 px-2 py-2 text-center align-top transition-colors hover:bg-white/5 ${bg}`}
                    >
                      {cell.length === 0 ? (
                        <span className="text-slate-500">—</span>
                      ) : (
                        <div className="space-y-1">
                          {conflict ? (
                            <div className="mx-auto inline-flex rounded-full bg-red-500/25 px-2 py-0.5 text-[11px] font-semibold text-red-100">
                              Conflict
                            </div>
                          ) : null}
                          <div className="font-semibold">{s(cell[0]?.course) || "—"}</div>
                          <div className="text-[11px] text-slate-200/80">
                            {s(cell[0]?.faculty) || "—"}
                          </div>
                          <div className="text-[11px] text-slate-200/70">
                            {s(cell[0]?.room) || "—"}
                          </div>
                          {cell.length > 1 ? (
                            <div className="text-[11px] text-red-100/90">
                              +{cell.length - 1} more
                            </div>
                          ) : null}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

