import React, { useState } from "react";
import { createComplaint } from "../services/complaintService";
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
  textareaStyle,
  footerStyle,
  actionsRowStyle,
  buttonStyle,
  buttonDisabledStyle,
  secondaryTextStyle,
  statusSuccessStyle,
  statusErrorStyle,
} from "../theme";

function CreateComplaint() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [imageFile, setImageFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleImageChange = (e) => {
    const file = e.target.files?.[0] || null;
    if (!file) {
      setImageFile(null);
      return;
    }

    if (!file.type || !file.type.startsWith("image/")) {
      setImageFile(null);
      setErrorMessage("Only image files are allowed.");
      return;
    }

    setImageFile(file);
  };

  const handleSubmit = async () => {
    if (
      !title.trim() ||
      !description.trim() ||
      !location.trim() ||
      !priority ||
      isSubmitting
    )
      return;

    setIsSubmitting(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("description", description.trim());
      formData.append("location", location.trim());
      formData.append("priority", priority);
      if (imageFile) {
        formData.append("image", imageFile);
      }

      await createComplaint(formData);
      setSuccessMessage("Your complaint has been submitted successfully.");
      setTitle("");
      setDescription("");
      setLocation("");
      setPriority("Medium");
      setImageFile(null);
    } catch (error) {
      setErrorMessage("Something went wrong while submitting. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isSubmitDisabled =
    isSubmitting ||
    !title.trim() ||
    !description.trim() ||
    !location.trim() ||
    !priority;

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <header style={headerStyle}>
          <h2 style={titleStyle}>Create Complaint</h2>
          <p style={subtitleStyle}>
            Share the details of your concern so we can review and take action.
          </p>
        </header>

        <div style={formStyle}>
          <div style={fieldStyle}>
            <div style={labelRowStyle}>
              <label style={labelStyle} htmlFor="complaint-title">
                Title
              </label>
              <span style={hintStyle}>A short summary of the issue</span>
            </div>
            <input
              id="complaint-title"
              style={inputBaseStyle}
              type="text"
              placeholder="e.g. Noise disturbance in the building"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelRowStyle}>
              <label style={labelStyle} htmlFor="complaint-location">
                Location
              </label>
              <span style={hintStyle}>Where is this issue happening?</span>
            </div>
            <input
              id="complaint-location"
              style={inputBaseStyle}
              type="text"
              placeholder="e.g. Classroom A101, Library, Hostel Block B"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelRowStyle}>
              <label style={labelStyle} htmlFor="complaint-priority">
                Priority
              </label>
              <span style={hintStyle}>How urgent is this issue?</span>
            </div>
            <select
              id="complaint-priority"
              style={inputBaseStyle}
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          <div style={fieldStyle}>
            <div style={labelRowStyle}>
              <label style={labelStyle} htmlFor="complaint-description">
                Description
              </label>
              <span style={hintStyle}>Include as many relevant details as possible</span>
            </div>
            <textarea
              id="complaint-description"
              style={textareaStyle}
              placeholder="Describe what happened, when it occurred, and any people involved..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={fieldStyle}>
            <div style={labelRowStyle}>
              <label style={labelStyle} htmlFor="complaint-image">
                Image (optional)
              </label>
              <span style={hintStyle}>Upload an image to support your complaint</span>
            </div>
            <input
              id="complaint-image"
              style={inputBaseStyle}
              type="file"
              accept="image/*"
              onChange={handleImageChange}
            />
          </div>
        </div>

        <footer style={footerStyle}>
          <div style={actionsRowStyle}>
            <button
              onClick={handleSubmit}
              style={{
                ...buttonStyle,
                ...(isSubmitDisabled ? buttonDisabledStyle : {}),
              }}
              disabled={isSubmitDisabled}
            >
              {isSubmitting ? "Submitting..." : "Submit complaint"}
            </button>

            <span style={secondaryTextStyle}>
              We’ll review your complaint and get back to you.
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

export default CreateComplaint;