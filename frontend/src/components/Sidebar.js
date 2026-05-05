import { NavLink } from "react-router-dom";
import { getUserRole } from "../utils/auth";

const sidebarStyle = {
  width: "240px",
  background:
    "radial-gradient(circle at 0% 0%, rgba(59,130,246,0.35), transparent 60%), #020617",
  color: "#e5e7eb",
  padding: "20px 18px",
  boxSizing: "border-box",
  borderRight: "1px solid rgba(30,64,175,0.5)",
  display: "flex",
  flexDirection: "column",
};

const brandStyle = {
  fontSize: "18px",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  marginBottom: "22px",
  color: "#e5e7eb",
};

const navStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
  marginTop: "6px",
};

const linkBaseStyle = {
  display: "flex",
  alignItems: "center",
  padding: "8px 10px",
  borderRadius: "10px",
  fontSize: "13px",
  textDecoration: "none",
  color: "#9ca3af",
  cursor: "pointer",
};

const activeLinkExtraStyle = {
  background:
    "radial-gradient(circle at 0% 0%, rgba(34,197,94,0.25), transparent 55%), rgba(15,23,42,0.9)",
  color: "#e5e7eb",
  border: "1px solid rgba(34,197,94,0.6)",
};

const inactiveLinkExtraStyle = {
  backgroundColor: "transparent",
  border: "1px solid transparent",
};

function Sidebar() {
  const role = getUserRole();

  const renderLinksForRole = () => {
    switch (role) {
      case "admin":
        return (
          <>
            <NavLink
              to="/admin-dashboard"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/complaints"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              All Complaints
            </NavLink>
            <NavLink
              to="/upload-timetable"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Upload Timetable
            </NavLink>
            <NavLink
              to="/timetable"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Timetable
            </NavLink>
            <NavLink
              to="/timetable-conflicts"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              View Conflicts
            </NavLink>
            <NavLink
              to="/timetable-optimizer"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Timetable Optimizer
            </NavLink>
            <NavLink
              to="/campus-heatmap"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Campus Heatmap
            </NavLink>
            <NavLink
              to="/analytics"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Analytics
            </NavLink>
          </>
        );
      case "student":
        return (
          <>
            <NavLink
              to="/student-dashboard"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              My Dashboard
            </NavLink>
            <NavLink
              to="/timetable"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              My Timetable
            </NavLink>
            <NavLink
              to="/create-complaint"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Create Complaint
            </NavLink>
            <NavLink
              to="/complaints"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              All Complaints
            </NavLink>
          </>
        );
      case "faculty":
        return (
          <>
            <NavLink
              to="/faculty-dashboard"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/upload-timetable"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Upload Timetable
            </NavLink>
            <NavLink
              to="/timetable"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Timetable
            </NavLink>
            <NavLink
              to="/timetable-conflicts"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              View Conflicts
            </NavLink>
            <NavLink
              to="/timetable-optimizer"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Timetable Optimizer
            </NavLink>
            <NavLink
              to="/campus-heatmap"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Campus Heatmap
            </NavLink>
          </>
        );
      case "guard":
        return (
          <>
            <NavLink
              to="/guard-dashboard"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/complaints"
              style={({ isActive }) => ({
                ...linkBaseStyle,
                ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
              })}
            >
              All Complaints
            </NavLink>
          </>
        );
      default:
        // Fallback menu when role is unknown (e.g. before login)
        return (
          <NavLink
            to="/admin-dashboard"
            style={({ isActive }) => ({
              ...linkBaseStyle,
              ...(isActive ? activeLinkExtraStyle : inactiveLinkExtraStyle),
            })}
          >
            Dashboard
          </NavLink>
        );
    }
  };

  return (
    <div style={sidebarStyle}>
      <h2 style={brandStyle}>Campus System</h2>

      <nav style={navStyle}>{renderLinksForRole()}</nav>
    </div>
  );
}

export default Sidebar;