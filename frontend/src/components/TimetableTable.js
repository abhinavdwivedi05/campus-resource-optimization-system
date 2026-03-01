import React from "react";

function TimetableTable({ data }) {
  return (
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
        {data.length === 0 ? (
          <tr>
            <td
              colSpan={6}
              className="px-4 py-6 text-center text-xs text-slate-400"
            >
              No timetable data available.
            </td>
          </tr>
        ) : (
          data.map((row) => (
            <tr
              key={row._id || `${row.course}-${row.room}-${row.timeslot}`}
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
  );
}

export default TimetableTable;