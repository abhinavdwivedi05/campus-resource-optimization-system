import { useEffect, useState } from "react";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";
import { getAnalytics } from "../services/analyticsService";
import { getTimetable } from "../services/campusService";
import TimetableGrid from "../components/TimetableGrid";

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
  gap: "16px",
  marginTop: "18px",
};

const metricCardStyle = {
  background:
    "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%), rgba(15,23,42,0.9)",
  borderRadius: "14px",
  padding: "14px 14px 12px",
  border: "1px solid rgba(148,163,184,0.35)",
  boxShadow: "0 14px 40px rgba(15,23,42,0.8)",
};

const metricLabelStyle = {
  fontSize: "12px",
  color: "#9ca3af",
  marginBottom: "6px",
};

const metricValueStyle = {
  fontSize: "26px",
  fontWeight: 600,
  color: "#e5e7eb",
};

const metricAccentStyle = (color) => ({
  ...metricValueStyle,
  color,
});

function Dashboard() {
  const [stats, setStats] = useState({
    totalComplaints: 0,
    pending: 0,
    inProgress: 0,
    resolved: 0,
    totalTimetableEntries: 0,
    conflictsCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [timetableLoading, setTimetableLoading] = useState(true);
  const [timetableEntries, setTimetableEntries] = useState([]);

  useEffect(() => {
    getAnalytics()
      .then((res) => setStats(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    getTimetable()
      .then((res) => setTimetableEntries(res.data || []))
      .catch(() => setTimetableEntries([]))
      .finally(() => setTimetableLoading(false));
  }, []);

  if (loading) {
    return (
      <div style={pageStyle}>
        <div style={{ ...cardStyle, maxWidth: "720px" }}>
          <p style={subtitleStyle}>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "1040px" }}>
        <header style={{ marginBottom: "10px" }}>
          <h2 style={titleStyle}>Admin Dashboard</h2>
          <p style={subtitleStyle}>
            View complaints, resolve them, upload timetable, and view analytics.
          </p>
        </header>

        <div style={gridStyle}>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Total Complaints</div>
            <div style={metricValueStyle}>{stats.totalComplaints}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Pending</div>
            <div style={metricAccentStyle("#fb923c")}>{stats.pending}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>In Progress</div>
            <div style={metricAccentStyle("#3b82f6")}>{stats.inProgress}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Resolved</div>
            <div style={metricAccentStyle("#22c55e")}>{stats.resolved}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Timetable Entries</div>
            <div style={metricValueStyle}>{stats.totalTimetableEntries}</div>
          </div>
          <div style={metricCardStyle}>
            <div style={metricLabelStyle}>Conflicts</div>
            <div style={metricAccentStyle(stats.conflictsCount ? "#f97316" : "#22c55e")}>
              {stats.conflictsCount}
            </div>
          </div>
        </div>

        <section className="mt-8">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-slate-100">
                Weekly timetable
              </h3>
              <p className="mt-1 text-xs text-slate-400">
                College-portal weekly grid. Conflicts are highlighted in red.
              </p>
            </div>
            <p className="text-[11px] text-slate-500">
              {timetableEntries.length} entries
            </p>
          </div>

          {timetableLoading ? (
            <p className="text-xs text-slate-400">Loading timetable...</p>
          ) : (
            <TimetableGrid entries={timetableEntries} />
          )}
        </section>
      </div>
    </div>
  );
}

export default Dashboard;