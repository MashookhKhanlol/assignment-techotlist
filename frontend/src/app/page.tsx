"use client";

import { useState } from "react";
import ResultsPanel, { type AnalyzeResult } from "@/components/ResultsPanel";
import UploadSection from "@/components/UploadSection";

type JdMode = "paste" | "file";
type AppState = "idle" | "loading" | "done" | "error";

export default function HomePage() {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [jdMode, setJdMode] = useState<JdMode>("paste");
  const [jdText, setJdText] = useState("");
  const [jdFile, setJdFile] = useState<File | null>(null);
  const [appState, setAppState] = useState<AppState>("idle");
  const [result, setResult] = useState<AnalyzeResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit =
    resumeFile !== null &&
    (jdMode === "paste" ? jdText.trim().length > 20 : jdFile !== null);

  const handleAnalyze = async () => {
    if (!canSubmit) return;
    setAppState("loading");
    setErrorMsg("");
    setResult(null);

    const formData = new FormData();
    formData.append("resume_file", resumeFile!);
    if (jdMode === "paste") {
      formData.append("jd_text", jdText);
    } else {
      formData.append("jd_file", jdFile!);
    }

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({ detail: "Unknown error" }));
        throw new Error(body.detail ?? `Server error ${res.status}`);
      }

      const data: AnalyzeResult = await res.json();
      setResult(data);
      setAppState("done");

      // Smooth scroll to results on mobile
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setAppState("error");
    }
  };

  const handleReset = () => {
    setAppState("idle");
    setResult(null);
    setErrorMsg("");
    setResumeFile(null);
    setJdText("");
    setJdFile(null);
  };

  return (
    <main style={{ position: "relative", zIndex: 1 }}>
      {/* ── Header ── */}
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "18px 0",
          background: "rgba(8,12,20,0.85)",
          backdropFilter: "blur(20px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          className="container"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}
            >
              ⚡
            </div>
            <div>
              <h1
                style={{
                  fontSize: 17,
                  fontWeight: 800,
                  background: "linear-gradient(90deg, #f1f5f9, #94a3b8)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  lineHeight: 1,
                }}
              >
                Skill Gap Analyzer
              </h1>
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                Powered by Claude AI
              </p>
            </div>
          </div>

          {appState === "done" && (
            <button
              id="reset-btn"
              className="btn-ghost"
              onClick={handleReset}
              type="button"
            >
              ↺ New Analysis
            </button>
          )}
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: "64px 0 48px" }}>
        <div className="container" style={{ textAlign: "center", maxWidth: 680, margin: "0 auto" }}>
          <div
            style={{
              display: "inline-block",
              padding: "5px 16px",
              background: "var(--accent-light)",
              border: "1px solid var(--border-focus)",
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              color: "var(--accent)",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 20,
            }}
          >
            AI-Powered · Instant Results
          </div>
          <h2
            style={{
              fontSize: "clamp(28px, 5vw, 46px)",
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: 16,
              background: "linear-gradient(135deg, #f1f5f9 0%, #94a3b8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            See exactly which skills
            <br />
            you&apos;re missing for the job
          </h2>
          <p
            style={{
              fontSize: 16,
              color: "var(--text-secondary)",
              maxWidth: 520,
              margin: "0 auto",
              lineHeight: 1.7,
            }}
          >
            Upload your resume, paste the job description, and get an instant
            AI-extracted skill gap analysis — matched, missing, and bonus skills at a glance.
          </p>
        </div>
      </section>

      {/* ── Main content grid ── */}
      <section style={{ paddingBottom: 80 }}>
        <div
          className="container"
          style={{
            display: "grid",
            gridTemplateColumns: appState === "done" ? "1fr 1fr" : "minmax(0, 680px)",
            justifyContent: "center",
            gap: 28,
            alignItems: "start",
          }}
        >
          {/* ── Left: Input card ── */}
          <div className="glass-card" style={{ padding: "28px 28px 24px" }}>
            <h2
              style={{
                fontSize: 16,
                fontWeight: 700,
                color: "var(--text-primary)",
                marginBottom: 24,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <span style={{ fontSize: 18 }}>📋</span> Input Documents
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Resume upload */}
              <UploadSection
                id="resume-upload"
                label="Your Resume"
                onFileChange={setResumeFile}
                currentFile={resumeFile}
              />

              {/* JD section */}
              <div>
                <p className="section-label" style={{ marginBottom: 10 }}>
                  Job Description
                </p>

                {/* Toggle */}
                <div className="tab-row" style={{ marginBottom: 14 }}>
                  <button
                    id="jd-paste-tab"
                    className={`tab-btn ${jdMode === "paste" ? "active" : ""}`}
                    onClick={() => setJdMode("paste")}
                    type="button"
                  >
                    ✏️ Paste text
                  </button>
                  <button
                    id="jd-file-tab"
                    className={`tab-btn ${jdMode === "file" ? "active" : ""}`}
                    onClick={() => setJdMode("file")}
                    type="button"
                  >
                    📁 Upload file
                  </button>
                </div>

                {jdMode === "paste" ? (
                  <textarea
                    id="jd-textarea"
                    className="textarea-field"
                    placeholder="Paste the full job description here…"
                    value={jdText}
                    onChange={(e) => setJdText(e.target.value)}
                    aria-label="Job description text"
                  />
                ) : (
                  <UploadSection
                    id="jd-upload"
                    label="Job Description File"
                    onFileChange={setJdFile}
                    currentFile={jdFile}
                  />
                )}
              </div>

              {/* Error */}
              {appState === "error" && (
                <div className="error-banner" role="alert" id="error-banner">
                  <span>⚠️</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              {/* Submit */}
              <button
                id="analyze-btn"
                className="btn-primary"
                onClick={handleAnalyze}
                disabled={!canSubmit || appState === "loading"}
                type="button"
                style={{ width: "100%", justifyContent: "center", marginTop: 4 }}
              >
                {appState === "loading" ? (
                  <>
                    <span className="spinner" />
                    Analyzing with AI…
                  </>
                ) : (
                  <>⚡ Analyze Skill Gap</>
                )}
              </button>

              {!canSubmit && appState !== "loading" && (
                <p
                  style={{
                    textAlign: "center",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginTop: -12,
                  }}
                >
                  {!resumeFile
                    ? "Upload your resume to get started"
                    : "Add a job description to continue"}
                </p>
              )}
            </div>
          </div>

          {/* ── Right: Results ── */}
          {appState === "done" && result && (
            <div id="results-section">
              <h2
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: 20,
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 18 }}>🎯</span> Analysis Results
              </h2>
              <ResultsPanel result={result} />
            </div>
          )}
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: "1px solid var(--border)",
          padding: "20px 0",
          textAlign: "center",
        }}
      >
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Skill Gap Analyzer · Resume text is processed server-side and never stored
        </p>
      </footer>
    </main>
  );
}
