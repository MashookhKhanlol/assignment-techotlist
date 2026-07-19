"use client";

import MatchRing from "./MatchRing";
import SkillTag from "./SkillTag";
import VerdictPanel from "./VerdictPanel";

export interface AnalyzeResult {
  resume_skills: string[];
  jd_skills: string[];
  matched_skills: string[];
  missing_skills: string[];
  bonus_skills: string[];
  match_percent: number;
}

interface ResultsPanelProps {
  result: AnalyzeResult;
}

interface SkillGroupProps {
  title: string;
  skills: string[];
  variant: "matched" | "missing" | "bonus" | "neutral";
  accentColor: string;
  borderColor: string;
  emptyText: string;
}

function SkillGroup({ title, skills, variant, accentColor, borderColor, emptyText }: SkillGroupProps) {
  return (
    <div
      className="glass-card"
      style={{
        padding: "20px 24px",
        borderLeft: `3px solid ${borderColor}`,
      }}
    >
      <div className="skill-group-header">
        <h3 className="skill-group-title">{title}</h3>
        <span
          className="skill-count-badge"
          style={{
            background: `${accentColor}20`,
            color: accentColor,
            border: `1px solid ${accentColor}40`,
          }}
        >
          {skills.length}
        </span>
      </div>
      <div className="skill-group-tags">
        {skills.length > 0 ? (
          skills.map((skill, i) => (
            <SkillTag
              key={skill}
              label={skill}
              variant={variant}
              animationDelay={i * 35}
            />
          ))
        ) : (
          <p className="empty-skills">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

export default function ResultsPanel({ result }: ResultsPanelProps) {
  const { matched_skills, missing_skills, bonus_skills, match_percent } = result;

  return (
    <div className="results-enter" style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── Match Ring ── */}
      <div
        className="glass-card"
        style={{
          padding: "32px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <MatchRing percent={match_percent} size={168} />
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 8,
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <Stat label="JD Skills" value={result.jd_skills.length} color="var(--blue)" />
          <Stat label="Resume Skills" value={result.resume_skills.length} color="var(--accent)" />
          <Stat label="Matched" value={matched_skills.length} color="var(--green)" />
          <Stat label="Missing" value={missing_skills.length} color="var(--red)" />
        </div>
      </div>

      {/* ── Matched ── */}
      <SkillGroup
        title="✓ Matched Skills"
        skills={matched_skills}
        variant="matched"
        accentColor="var(--green)"
        borderColor="var(--green)"
        emptyText="No matching skills found."
      />

      {/* ── Missing ── */}
      <SkillGroup
        title="✕ Missing Skills"
        skills={missing_skills}
        variant="missing"
        accentColor="var(--red)"
        borderColor="var(--red)"
        emptyText="You cover all required skills — great!"
      />

      {/* ── Bonus ── */}
      <SkillGroup
        title="★ Bonus Skills"
        skills={bonus_skills}
        variant="bonus"
        accentColor="var(--amber)"
        borderColor="var(--amber)"
        emptyText="No bonus skills beyond JD requirements."
      />

      {/* ── AI Fit Verdict ── */}
      <VerdictPanel analysisResult={result} />
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ textAlign: "center" }}>
      <p style={{ fontSize: 22, fontWeight: 800, color }}>{value}</p>
      <p style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 500, marginTop: 2 }}>
        {label}
      </p>
    </div>
  );
}
