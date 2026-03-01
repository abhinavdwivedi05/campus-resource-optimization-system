import React from "react";

function TimetableTable({ data }) {
  return (
    <table border="1">
      <thead>
        <tr>
          <th>Course</th>
          <th>Faculty</th>
          <th>Room</th>
          <th>Timeslot</th>
        </tr>
      </thead>

      <tbody>
        {data.map((row, index) => (
          <tr key={index}>
            <td>{row.course}</td>
            <td>{row.faculty}</td>
            <td>{row.room}</td>
            <td>{row.timeslot}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default TimetableTable;