import { useNavigate } from "react-router-dom";
import { getStoredUser, clearStoredUser } from "../services/userService";

const navStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "14px 20px",
  borderBottom: "1px solid rgba(148,163,184,0.35)",
  background:
    "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%), rgba(15,23,42,0.95)",
  backdropFilter: "blur(18px)",
  position: "sticky",
  top: 0,
  zIndex: 20,
};

const titleStyle = {
  fontSize: "18px",
  fontWeight: 600,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  color: "#e5e7eb",
};

const userLabelStyle = {
  fontSize: "12px",
  color: "#9ca3af",
};

const rolePillStyle = {
  borderRadius: "999px",
  padding: "6px 14px",
  border: "1px solid rgba(148,163,184,0.5)",
  background:
    "radial-gradient(circle at 0% 0%, rgba(34,197,94,0.18), transparent 55%), rgba(15,23,42,1)",
  color: "#e5e7eb",
  fontSize: "12px",
  fontWeight: 500,
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
};

const logoutBtnStyle = {
  ...rolePillStyle,
  cursor: "pointer",
  marginLeft: "8px",
  borderColor: "rgba(248,113,113,0.5)",
  background:
    "radial-gradient(circle at 0% 0%, rgba(248,113,113,0.18), transparent 55%), rgba(15,23,42,1)",
};

function Navbar() {
  const navigate = useNavigate();
  const user = getStoredUser();
  const name = user?.name || "User";
  const role = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : "";

  const handleLogout = () => {
    clearStoredUser();
    navigate("/");
  };

  return (
    <div style={navStyle}>
      <h1 style={titleStyle}>Campus Resource Optimization</h1>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={userLabelStyle}>
          {name}
        </span>
        <span style={rolePillStyle}>
          <span
            style={{
              width: "7px",
              height: "7px",
              borderRadius: "999px",
              backgroundColor: "#22c55e",
            }}
          />
          {role}
        </span>
        <button
          type="button"
          style={logoutBtnStyle}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>
    </div>
  );
}

export default Navbar;