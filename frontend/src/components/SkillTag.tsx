export interface SkillTagProps {
  label: string;
  variant: "matched" | "missing" | "bonus" | "neutral";
  animationDelay?: number;
}

const variantIcon: Record<SkillTagProps["variant"], string> = {
  matched: "✓",
  missing: "✕",
  bonus:   "★",
  neutral: "◈",
};

export default function SkillTag({ label, variant, animationDelay = 0 }: SkillTagProps) {
  return (
    <span
      className={`skill-tag ${variant}`}
      style={{ animationDelay: `${animationDelay}ms` }}
      title={
        variant === "matched"
          ? "Present in both resume and JD"
          : variant === "missing"
          ? "Required by JD but not on your resume"
          : variant === "bonus"
          ? "On your resume but not required by JD"
          : label
      }
    >
      <span aria-hidden="true" style={{ fontSize: "10px" }}>
        {variantIcon[variant]}
      </span>
      {label}
    </span>
  );
}
