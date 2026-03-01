import React, { useEffect, useState } from "react";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";
import { getHeatmap } from "../services/campusService";

function CampusHeatmap() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHeatmap()
      .then((res) => setData(res.data || []))
      .finally(() => setLoading(false));
  }, []);

  const groupedByBuilding = data.reduce((acc, item) => {
    const building = item.building || "Unknown Block";
    if (!acc[building]) acc[building] = [];
    acc[building].push(item);
    return acc;
  }, {});

  const getStatusClasses = (status) => {
    if (status === "Overcrowded") return "bg-red-200 text-red-900";
    if (status === "Busy") return "bg-yellow-200 text-yellow-900";
    return "bg-green-100 text-green-900";
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "1040px" }}>
        <header style={{ marginBottom: "16px" }}>
          <h2 style={titleStyle}>Campus Heatmap</h2>
          <p style={subtitleStyle}>
            Visual overview of room utilization across campus buildings.
          </p>
        </header>

        {/* Legend */}
        <section className="mb-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
          <span className="font-semibold uppercase tracking-wide mr-2">
            Legend
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-red-200" />
            <span>Overcrowded (&gt; 100%)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-yellow-200" />
            <span>Busy (70–100%)</span>
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-full bg-green-100" />
            <span>Available (&lt; 70%)</span>
          </span>
        </section>

        {loading ? (
          <p className="text-xs text-slate-400">Loading heatmap...</p>
        ) : data.length === 0 ? (
          <p className="text-xs text-slate-400">
            No timetable data available to build a heatmap.
          </p>
        ) : (
          Object.entries(groupedByBuilding).map(([building, rooms]) => (
            <section key={building} className="mb-6">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-300">
                {building}
              </h3>
              <div className="grid grid-cols-4 gap-4">
                {rooms.map((room) => {
                  const utilPercent = Math.round(
                    (room.utilization || 0) * 100
                  );
                  const statusClasses = getStatusClasses(room.status);
                  return (
                    <div
                      key={room.room}
                      className={`rounded-xl border border-slate-800/60 px-3 py-3 text-xs shadow-sm ${statusClasses}`}
                    >
                      <p className="text-sm font-semibold">{room.room}</p>
                      <p className="mt-0.5 text-[11px] opacity-80">
                        Students: {room.students} / Capacity:{" "}
                        {room.capacity || 0}
                      </p>
                      <p className="mt-0.5 text-[11px] opacity-80">
                        Utilization: {utilPercent}%
                      </p>
                      <p className="mt-0.5 text-[11px] font-medium">
                        {room.status}
                      </p>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
}

export default CampusHeatmap;

