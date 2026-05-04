import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  pageStyle,
  cardStyle,
  headerStyle,
  titleStyle,
  subtitleStyle,
  formStyle,
  fieldStyle,
  labelRowStyle,
  labelStyle,
  hintStyle,
  inputBaseStyle,
  footerStyle,
  actionsRowStyle,
  buttonStyle,
  buttonDisabledStyle,
  statusSuccessStyle,
  statusErrorStyle,
} from "../theme";
import { uploadTimetable } from "../services/timetableService";

function UploadTimetable() {
  const [file, setFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const handleFileChange = (event) => {
    setSuccessMessage("");
    setErrorMessage("");
    const selected = event.target.files && event.target.files[0];
    setFile(selected || null);
  };

  const handleUpload = async () => {
    if (!file || isUploading) return;

    setIsUploading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await uploadTimetable(file);
      const rowsInserted = response.data?.rowsInserted ?? 0;
      setSuccessMessage(
        rowsInserted > 0
          ? `Timetable uploaded successfully (${rowsInserted} rows inserted).`
          : "Timetable uploaded successfully (no rows inserted)."
      );

      // Optional: redirect to timetable page after short delay
      setTimeout(() => {
        navigate("/timetable");
      }, 1200);
    } catch (error) {
      const backendMessage =
        error?.response?.data?.detail || "Failed to upload timetable CSV. Please check the file and try again.";
      setErrorMessage(backendMessage);
    } finally {
      setIsUploading(false);
    }
  };

  const isUploadDisabled = isUploading || !file;

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "560px" }}>
        <header style={headerStyle}>
          <h2 style={titleStyle}>Upload Timetable CSV</h2>
          <p style={subtitleStyle}>
            Choose a CSV file with course, faculty, room, day, timeslot, students, and capacity columns. Only admins
            and faculty can upload bulk timetable data.
          </p>
        </header>

        <div style={formStyle}>
          <div style={fieldStyle}>
            <div style={labelRowStyle}>
              <label style={labelStyle} htmlFor="timetable-file">
                Timetable CSV file
              </label>
              <span style={hintStyle}>Accepted format: .csv</span>
            </div>
            <input
              id="timetable-file"
              type="file"
              accept=".csv,text/csv"
              style={inputBaseStyle}
              onChange={handleFileChange}
            />
            {file && (
              <span style={{ ...hintStyle, marginTop: "2px" }}>
                Selected file: <strong>{file.name}</strong>
              </span>
            )}
          </div>

          <div className="rounded-xl border border-slate-700/60 bg-slate-900/40 p-3 text-xs text-slate-300">
            <p className="font-semibold mb-1">Expected CSV format</p>
            <p className="mb-1 text-[11px] text-slate-400">
              Header row with the following columns:
            </p>
            <p className="text-[11px] font-mono text-slate-200">
              course, faculty, room, day, timeslot, students, capacity
            </p>
            <p className="mt-2 text-[11px] text-slate-400">
              Optional extra columns (if you use them): department, semester.
            </p>
          </div>
        </div>

        <footer style={footerStyle}>
          <div style={actionsRowStyle}>
            <button
              onClick={handleUpload}
              style={{
                ...buttonStyle,
                ...(isUploadDisabled ? buttonDisabledStyle : {}),
              }}
              disabled={isUploadDisabled}
            >
              {isUploading ? "Uploading..." : "Upload CSV"}
            </button>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              The uploaded rows will be added to the existing timetable.
            </span>
          </div>

          {successMessage && (
            <div style={statusSuccessStyle}>{successMessage}</div>
          )}
          {errorMessage && (
            <div style={statusErrorStyle}>{errorMessage}</div>
          )}
        </footer>
      </div>
    </div>
  );
}

export default UploadTimetable;

