"use client";

import { useState } from "react";
import type { AnalyzeResult } from "./ResultsPanel";

interface VerdictPanelProps {
  analysisResult: AnalyzeResult;
}

interface VerdictData {
  verdict: "Qualified" | "Almost There" | "Not Yet";
  reasons: string[];
}

const VERDICT_CONFIG = {
  Qualified: {
    emoji: "✅",
    color: "var(--green)",
    bg: "var(--green-light)",
    border: "var(--green-border)",
    tagline: "Strong candidate for this role",
  },
  "Almost There": {
    emoji: "🟡",
    color: "var(--amber)",
    bg: "var(--amber-light)",
    border: "var(--amber-border)",
    tagline: "Close match — some gaps to address",
  },
  "Not Yet": {
    emoji: "❌",
    color: "var(--red)",
    bg: "var(--red-light)",
    border: "var(--red-border)",
    tagline: "Significant skill gaps for this role",
  },
} as const;

export default function VerdictPanel({ analysisResult }: VerdictPanelProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [verdict, setVerdict] = useState<VerdictData | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGetVerdict = async () => {
    setState("loading");
    setErrorMsg("");

    try {
      const res = await fetch("/api/verdict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matched_skills: analysisResult.matched_skills,
          missing_skills: analysisResult.missing_skills,
          bonus_skills: analysisResult.bonus_skills,
          jd_skills: analysisResult.jd_skills,
          match_percent: analysisResult.match_percent,
        }),
      });

      if (!res.ok) {
        let detail: string;
        try {
          const body = await res.json();
          detail = body.detail ?? `Server error ${res.status}`;
        } catch {
          const raw = await res.text().catch(() => "");
          detail = `HTTP ${res.status} — ${raw.slice(0, 150) || "no response body"}`;
        }
        throw new Error(detail);
      }

      const data: VerdictData = await res.json();
      setVerdict(data);
      setState("done");
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong.");
      setState("error");
    }
  };

  const cfg = verdict ? VERDICT_CONFIG[verdict.verdict] : null;

  return (
    <div style={{ marginTop: 8 }}>
      {/* ── Trigger button ── */}
      {state === "idle" && (
        <button
          id="verdict-btn"
          onClick={handleGetVerdict}
          type="button"
          style={{
            width: "100%",
            padding: "14px 24px",
            background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
            border: "1px solid var(--border-focus)",
            borderRadius: "var(--radius-md)",
            color: "var(--text-primary)",
            fontFamily: "Inter, sans-serif",
            fontSize: 15,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            transition: "transform 0.15s, box-shadow 0.15s",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-2px)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow =
              "0 8px 32px rgba(99,102,241,0.3)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)";
            (e.currentTarget as HTMLButtonElement).style.boxShadow = "none";
          }}
        >
          <span>🎯</span>
          Get AI Fit Verdict
        </button>
      )}

      {/* ── Loading ── */}
      {state === "loading" && (
        <div
          className="glass-card"
          style={{
            padding: "24px",
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span className="spinner" />
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            AI is evaluating candidate fit…
          </p>
        </div>
      )}

      {/* ── Error ── */}
      {state === "error" && (
        <div className="error-banner" role="alert">
          <span>⚠️</span>
          <div>
            <p style={{ marginBottom: 8 }}>{errorMsg}</p>
            <button
              className="btn-ghost"
              onClick={() => setState("idle")}
              type="button"
            >
              Try again
            </button>
          </div>
        </div>
      )}

      {/* ── Result ── */}
      {state === "done" && verdict && cfg && (
        <div
          className="glass-card results-enter"
          style={{
            padding: "28px",
            borderLeft: `3px solid ${cfg.color}`,
          }}
        >
          {/* Verdict badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 20,
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--text-muted)",
                  marginBottom: 6,
                }}
              >
                AI Fit Verdict
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 28 }}>{cfg.emoji}</span>
                <span
                  style={{
                    fontSize: 26,
                    fontWeight: 800,
                    color: cfg.color,
                  }}
                >
                  {verdict.verdict}
                </span>
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  marginTop: 4,
                }}
              >
                {cfg.tagline}
              </p>
            </div>

            {/* Re-run button */}
            <button
              className="btn-ghost"
              onClick={() => setState("idle")}
              type="button"
              style={{ alignSelf: "flex-start" }}
            >
              ↺ Re-evaluate
            </button>
          </div>

          {/* Reasons */}
          <div
            style={{
              background: cfg.bg,
              border: `1px solid ${cfg.border}`,
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            {verdict.reasons.map((reason, i) => (
              <div
                key={i}
                style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                className="results-enter"
                // stagger each reason
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: cfg.color,
                    color: "#000",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    flexShrink: 0,
                    marginTop: 1,
                  }}
                >
                  {i + 1}
                </span>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--text-primary)",
                    lineHeight: 1.6,
                  }}
                >
                  {reason}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
