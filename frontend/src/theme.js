export const pageStyle = {
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "linear-gradient(135deg, #0f172a, #1e293b)",
  padding: "24px",
  boxSizing: "border-box",
};

export const cardStyle = {
  width: "100%",
  maxWidth: "520px",
  backgroundColor: "#0b1120",
  borderRadius: "16px",
  padding: "28px 24px 24px",
  boxShadow: "0 24px 80px rgba(15,23,42,0.85)",
  border: "1px solid rgba(148,163,184,0.35)",
  boxSizing: "border-box",
};

export const headerStyle = {
  marginBottom: "18px",
};

export const titleStyle = {
  margin: 0,
  fontSize: "24px",
  fontWeight: 600,
  color: "#e5e7eb",
  letterSpacing: "0.01em",
};

export const subtitleStyle = {
  marginTop: "6px",
  marginBottom: 0,
  fontSize: "13px",
  color: "#9ca3af",
};

export const formStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "14px",
  marginTop: "8px",
};

export const fieldStyle = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

export const labelRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "baseline",
};

export const labelStyle = {
  fontSize: "13px",
  fontWeight: 500,
  color: "#e5e7eb",
};

export const hintStyle = {
  fontSize: "11px",
  color: "#6b7280",
};

export const inputBaseStyle = {
  width: "100%",
  borderRadius: "10px",
  border: "1px solid rgba(55,65,81,0.85)",
  backgroundColor: "rgba(15,23,42,0.9)",
  color: "#e5e7eb",
  padding: "9px 11px",
  fontSize: "13px",
  outline: "none",
  boxSizing: "border-box",
};

export const textareaStyle = {
  ...inputBaseStyle,
  minHeight: "110px",
  resize: "vertical",
};

export const footerStyle = {
  marginTop: "18px",
  display: "flex",
  flexDirection: "column",
  gap: "10px",
};

export const actionsRowStyle = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: "12px",
  flexWrap: "wrap",
};

export const buttonStyle = {
  border: "none",
  borderRadius: "999px",
  padding: "9px 18px",
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "0.02em",
  cursor: "pointer",
  backgroundImage:
    "radial-gradient(circle at 0% 0%, #22c55e, transparent 55%), radial-gradient(circle at 100% 0%, #0ea5e9, transparent 55%), linear-gradient(135deg, #22c55e, #0ea5e9)",
  color: "#0b1120",
  boxShadow: "0 12px 30px rgba(34,197,94,0.45)",
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  whiteSpace: "nowrap",
};

export const buttonDisabledStyle = {
  opacity: 0.6,
  cursor: "not-allowed",
  boxShadow: "none",
};

export const secondaryTextStyle = {
  fontSize: "11px",
  color: "#6b7280",
};

const statusTextBaseStyle = {
  fontSize: "12px",
};

export const statusSuccessStyle = {
  ...statusTextBaseStyle,
  color: "#22c55e",
};

export const statusErrorStyle = {
  ...statusTextBaseStyle,
  color: "#f97373",
};

