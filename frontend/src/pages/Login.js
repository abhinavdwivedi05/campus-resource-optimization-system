import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  pageStyle,
  cardStyle,
  titleStyle,
  subtitleStyle,
  formStyle,
  fieldStyle,
  labelStyle,
  inputBaseStyle,
  buttonStyle,
  buttonDisabledStyle,
} from "../theme";
import { login as loginRequest } from "../services/authService";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const handleLogin = async () => {
    if (!email.trim() || !password.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await loginRequest({
        email: email.trim(),
        password,
      });

      const role = response.data?.role;
      const name = response.data?.name;
      if (!role) {
        throw new Error("No role returned");
      }

      // Persist user for RBAC
      localStorage.setItem("role", role);
      if (name) {
        localStorage.setItem("name", name);
      }

      // Redirect based on role
      if (role === "admin") {
        navigate("/admin-dashboard");
      } else if (role === "student") {
        navigate("/student-dashboard");
      } else if (role === "faculty") {
        navigate("/faculty-dashboard");
      } else if (role === "guard") {
        navigate("/guard-dashboard");
      } else {
        navigate("/admin-dashboard");
      }
    } catch (err) {
      setErrorMessage("Invalid login. Please check your details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled = isSubmitting || !email.trim() || !password.trim();

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "420px" }}>
        <header style={{ marginBottom: "20px", textAlign: "left" }}>
          <h2 style={titleStyle}>Campus System Login</h2>
          <p style={subtitleStyle}>
            Sign in with your campus account to access your dashboard.
          </p>
        </header>

        <div style={{ ...formStyle, marginTop: "4px" }}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="login-email">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.edu"
              style={inputBaseStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="login-password">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              placeholder="Enter your password"
              style={inputBaseStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            onClick={handleLogin}
            style={{
              ...buttonStyle,
              width: "100%",
              justifyContent: "center",
              ...(isDisabled ? buttonDisabledStyle : {}),
            }}
            disabled={isDisabled}
          >
            {isSubmitting ? "Signing in..." : "Login"}
          </button>

          {errorMessage && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "#f97373",
                textAlign: "center",
              }}
            >
              {errorMessage}
            </div>
          )}

          <p style={{ marginTop: "14px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
            Don&apos;t have an account?{" "}
            <Link to="/signup" style={{ color: "#38bdf8", textDecoration: "none" }}>
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;