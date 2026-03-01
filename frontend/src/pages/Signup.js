import React, { useState } from "react";
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
  hintStyle,
} from "../theme";
import { register as registerRequest } from "../services/authService";

function Signup() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [department, setDepartment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !password.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await registerRequest({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        department: department.trim(),
      });
      setSuccessMessage("Account created. You can now log in.");

      setTimeout(() => {
        navigate("/");
      }, 800);
    } catch (error) {
      const msg =
        error?.response?.data?.detail || "Failed to register. Please try again.";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isDisabled =
    isSubmitting || !name.trim() || !email.trim() || !password.trim();

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "480px" }}>
        <header style={{ marginBottom: "18px", textAlign: "left" }}>
          <h2 style={titleStyle}>Create an account</h2>
          <p style={subtitleStyle}>
            Sign up as a student, faculty member, or guard to access the Campus
            Resource Optimization System.
          </p>
        </header>

        <div style={{ ...formStyle, marginTop: "4px" }}>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="signup-name">
              Name
            </label>
            <input
              id="signup-name"
              type="text"
              placeholder="John Doe"
              style={inputBaseStyle}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="signup-email">
              Email
            </label>
            <input
              id="signup-email"
              type="email"
              placeholder="you@example.edu"
              style={inputBaseStyle}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="signup-password">
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              placeholder="Create a password"
              style={inputBaseStyle}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="signup-role">
              Role
            </label>
            <select
              id="signup-role"
              style={inputBaseStyle}
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="student">Student</option>
              <option value="faculty">Faculty</option>
              <option value="guard">Guard</option>
            </select>
            <span style={hintStyle}>
              Admin accounts are provisioned manually by the system owner.
            </span>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="signup-department">
              Department
            </label>
            <input
              id="signup-department"
              type="text"
              placeholder="e.g. CSE, ECE, Mechanical"
              style={inputBaseStyle}
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
            />
          </div>

          <button
            onClick={handleSubmit}
            style={{
              ...buttonStyle,
              width: "100%",
              justifyContent: "center",
              ...(isDisabled ? buttonDisabledStyle : {}),
            }}
            disabled={isDisabled}
          >
            {isSubmitting ? "Creating account..." : "Sign up"}
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

          {successMessage && (
            <div
              style={{
                marginTop: "6px",
                fontSize: "12px",
                color: "#22c55e",
                textAlign: "center",
              }}
            >
              {successMessage}
            </div>
          )}

          <p style={{ marginTop: "14px", fontSize: "12px", color: "#9ca3af", textAlign: "center" }}>
            Already have an account?{" "}
            <Link to="/" style={{ color: "#38bdf8", textDecoration: "none" }}>
              Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default Signup;

