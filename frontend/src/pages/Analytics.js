import React, { useEffect, useState } from "react";
import { PieChart, Pie, Cell, Legend, Tooltip } from "recharts";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";
import { getAnalytics } from "../services/analyticsService";

const COLORS = ["#22c55e", "#3b82f6", "#fb923c"];

const chartWrapperStyle = {
  marginTop: "18px",
  display: "flex",
  justifyContent: "center",
};

function Analytics() {
  const [data, setData] = useState([
    { name: "Resolved", value: 0 },
    { name: "In Progress", value: 0 },
    { name: "Pending", value: 0 },
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAnalytics()
      .then((res) => {
        const { resolved, inProgress, pending } = res.data;
        setData([
          { name: "Resolved", value: resolved },
          { name: "In Progress", value: inProgress },
          { name: "Pending", value: pending },
        ]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "640px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Complaint Analytics</h2>
          <p style={subtitleStyle}>
            Visual breakdown of complaint status (resolved, in progress, pending).
          </p>
        </header>

        {loading ? (
          <p style={subtitleStyle}>Loading...</p>
        ) : total === 0 ? (
          <p style={subtitleStyle}>No complaint data yet.</p>
        ) : (
          <div style={chartWrapperStyle}>
            <PieChart width={360} height={320}>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={110}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "#020617",
                  borderRadius: "10px",
                  border: "1px solid rgba(148,163,184,0.5)",
                  padding: "8px 10px",
                  fontSize: "12px",
                  color: "#e5e7eb",
                }}
              />
              <Legend
                wrapperStyle={{
                  fontSize: "12px",
                  color: "#9ca3af",
                }}
              />
            </PieChart>
          </div>
        )}
      </div>
    </div>
  );
}

export default Analytics;