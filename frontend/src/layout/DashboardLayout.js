import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

function DashboardLayout({ children }) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background:
          "radial-gradient(circle at 0% 0%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(circle at 100% 100%, rgba(34,197,94,0.18), transparent 55%), #020617",
      }}
    >
      <Sidebar />

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
        }}
      >
        <Navbar />

        <div
          style={{
            flex: 1,
            padding: "18px 18px 24px",
            boxSizing: "border-box",
            overflow: "auto",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}

export default DashboardLayout;