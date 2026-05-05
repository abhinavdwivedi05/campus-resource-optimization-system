import React, { useState } from "react";
import { pageStyle, cardStyle, titleStyle, subtitleStyle } from "../theme";
import {
  getOptimizationSuggestions,
  applyOptimizationSuggestion,
} from "../services/optimizerService";

function TimetableOptimizer() {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [applyingId, setApplyingId] = useState(null);

  const handleRunOptimization = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getOptimizationSuggestions();
      setSuggestions(res.data || []);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Failed to run optimization. Please try again.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleApplySuggestion = async (suggestion) => {
    if (!suggestion?.entryId) return;

    const issue = (suggestion?.issue || "").toLowerCase();
    const isMultiClass = issue.includes("multiple classes in same slot");

    // Prefer backend-driven resolution for multi-class conflicts
    const payload = isMultiClass
      ? { mode: "auto_reschedule", entryId: suggestion.entryId }
      : { id: suggestion.entryId };

    if (!isMultiClass) {
      if (suggestion.suggestedRoom) {
        payload.room = suggestion.suggestedRoom;
      }
      if (suggestion.suggestedDay) {
        payload.day = suggestion.suggestedDay;
      }
      if (suggestion.suggestedTimeslot) {
        payload.timeslot = suggestion.suggestedTimeslot;
      }
      if (!payload.room && !payload.timeslot && !payload.day) return;
    }

    setApplyingId(suggestion.entryId);
    setError("");
    try {
      await applyOptimizationSuggestion(payload);
      // Refresh suggestions to reflect the updated timetable and removed conflicts
      const res = await getOptimizationSuggestions();
      setSuggestions(res.data || []);
    } catch (err) {
      const msg =
        err?.response?.data?.detail ||
        "Failed to apply suggestion. Please try again.";
      setError(msg);
    } finally {
      setApplyingId(null);
    }
  };

  const getCardClasses = (suggestion) => {
    if (suggestion?.applied) {
      return "border-emerald-500/70 bg-emerald-900/40 text-emerald-100";
    }
    const severity = suggestion?.severity || "";
    if (severity === "warning") {
      return "border-amber-500/70 bg-amber-900/40 text-amber-100";
    }
    // Default: major conflict
    return "border-red-500/70 bg-red-900/40 text-red-100";
  };

  const getBadgeLabel = (suggestion) => {
    if (suggestion?.applied) {
      return "Resolved";
    }
    const issue = (suggestion?.issue || "").toLowerCase();
    if (issue.includes("capacity")) return "Capacity Issue";
    if (issue.includes("faculty")) return "Faculty Clash";
    if (issue.includes("room clash")) return "Room Clash";
    if (issue.includes("utilization")) return "Optimization";
    return "Suggestion";
  };

  const getSuggestionType = (suggestion) => {
    const explicit = (suggestion?.type || "").toString().trim().toLowerCase();
    if (explicit) return explicit;
    const issue = (suggestion?.issue || "").toLowerCase();
    if (issue.includes("capacity")) return "capacity_overflow";
    if (issue.includes("faculty")) return "faculty_clash";
    if (issue.includes("room clash")) return "room_clash";
    if (issue.includes("multiple classes in same slot")) return "multi_class_conflict";
    return "";
  };

  return (
    <div style={pageStyle}>
      <div style={{ ...cardStyle, maxWidth: "960px" }}>
        <header style={{ marginBottom: "16px" }}>
          <h2 style={titleStyle}>Timetable Optimization Suggestions</h2>
          <p style={subtitleStyle}>
            Automatically analyze the timetable to resolve clashes, capacity
            issues, and improve room utilization across campus.
          </p>
        </header>

        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">
            {suggestions.length > 0
              ? `Showing ${suggestions.length} suggestion${
                  suggestions.length > 1 ? "s" : ""
                }.`
              : "Run optimization to generate suggestions."}
          </p>
          <button
            onClick={handleRunOptimization}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-full bg-sky-500 px-4 py-1.5 text-xs font-semibold text-slate-950 shadow-md hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Analyzing..." : "Run Optimization"}
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-500/70 bg-red-900/40 px-4 py-2 text-xs text-red-100">
            {error}
          </div>
        )}

        <div className="space-y-3">
          {suggestions.length === 0 && !loading ? (
            <div className="flex items-start gap-3 rounded-xl border border-emerald-500/60 bg-emerald-900/40 px-4 py-3 text-xs text-emerald-100">
              <span className="text-lg leading-none">✓</span>
              <div>
                <p className="font-semibold">
                  No optimization suggestions at the moment
                </p>
                <p className="mt-0.5 text-[11px] text-emerald-200/80">
                  The current timetable does not show significant clashes or
                  capacity issues. Re-run optimization after updating the
                  timetable.
                </p>
              </div>
            </div>
          ) : null}

          {suggestions.map((s, index) => {
            const cardClasses = getCardClasses(s);
            const badgeLabel = getBadgeLabel(s);
            const suggestionType = getSuggestionType(s);
            const hideApply = suggestionType === "capacity_overflow";

            return (
              <div
                key={index}
                className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-xs shadow-sm ${cardClasses}`}
              >
                <div className="flex flex-1 items-start gap-3">
                  <span className="text-lg leading-none">
                    {s.applied ? "✓" : "⚠"}
                  </span>
                  <div>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="rounded-full bg-black/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
                        {badgeLabel}
                      </span>
                      {s.issue && (
                        <span className="text-[11px] font-medium opacity-90">
                          {s.issue}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px]">
                      <span className="font-semibold">Course:</span>{" "}
                      {s.course || "Unknown course"}
                    </p>
                    <p className="text-[11px]">
                      <span className="font-semibold">Faculty:</span>{" "}
                      {s.faculty || "Unknown faculty"}
                    </p>

                    {s.currentRoom && (
                      <p className="mt-0.5 text-[11px]">
                        <span className="font-semibold">Current Room:</span>{" "}
                        {s.currentRoom}
                      </p>
                    )}
                    {s.suggestedRoom && (
                      <p className="mt-0.5 text-[11px]">
                        <span className="font-semibold">Suggested Room:</span>{" "}
                        {s.suggestedRoom}
                      </p>
                    )}

                    {s.currentTimeslot && (
                      <p className="mt-0.5 text-[11px]">
                        <span className="font-semibold">Current Time:</span>{" "}
                        {s.currentTimeslot}
                      </p>
                    )}
                    {s.suggestedTimeslot && (
                      <p className="mt-0.5 text-[11px]">
                        <span className="font-semibold">Suggested Time:</span>{" "}
                        {s.suggestedTimeslot}
                      </p>
                    )}

                    {s.reason && (
                      <p className="mt-1 text-[11px] opacity-90">
                        <span className="font-semibold">Reason:</span>{" "}
                        {s.reason}
                      </p>
                    )}
                  </div>
                </div>

                {hideApply ? (
                  <div className="ml-3 flex items-center">
                    <div style={{ color: "#facc15", fontWeight: "500" }}>
                      Suggestion: Increase room capacity or assign a larger room
                    </div>
                  </div>
                ) : (
                  s.entryId &&
                  (s.suggestedRoom || s.suggestedTimeslot || s.suggestedDay) && (
                    <div className="ml-3 flex items-center">
                      <button
                        onClick={() => handleApplySuggestion(s)}
                        disabled={applyingId === s.entryId || s.applied}
                        className="rounded-full bg-emerald-400 px-3 py-1 text-[11px] font-semibold text-emerald-950 shadow hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {s.applied
                          ? "Applied"
                          : applyingId === s.entryId
                          ? "Applying..."
                          : "Apply Suggestion"}
                      </button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default TimetableOptimizer;

