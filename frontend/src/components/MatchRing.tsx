"use client";

import { useEffect, useRef } from "react";

interface MatchRingProps {
  percent: number;   // 0–100
  size?: number;     // SVG diameter in px
}

const STROKE = 10;

export default function MatchRing({ percent, size = 160 }: MatchRingProps) {
  const clampedPercent = Math.min(100, Math.max(0, percent));
  const radius = (size - STROKE * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const cx = size / 2;
  const cy = size / 2;

  // Colour transitions: red → amber → green
  const hue = Math.round((clampedPercent / 100) * 120); // 0 = red, 120 = green
  const ringColor = `hsl(${hue}, 80%, 55%)`;
  const glowColor  = `hsl(${hue}, 80%, 55%)`;

  // Animate strokeDashoffset on mount
  const circleRef = useRef<SVGCircleElement>(null);
  useEffect(() => {
    const el = circleRef.current;
    if (!el) return;
    // Start at full offset (empty ring) then animate to target
    const targetOffset = circumference - (clampedPercent / 100) * circumference;
    el.style.transition = "none";
    el.style.strokeDashoffset = String(circumference);
    // Trigger reflow, then animate
    void el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 1.1s cubic-bezier(0.34, 1.56, 0.64, 1)";
    el.style.strokeDashoffset = String(targetOffset);
  }, [clampedPercent, circumference]);

  const label =
    clampedPercent >= 75 ? "Strong match" :
    clampedPercent >= 50 ? "Good match" :
    clampedPercent >= 25 ? "Partial match" :
    "Low match";

  return (
    <div className="match-ring-wrap">
      <svg
        width={size}
        height={size}
        aria-label={`Match percentage: ${clampedPercent}%`}
        role="img"
        style={{ filter: `drop-shadow(0 0 12px ${glowColor}44)` }}
      >
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={ringColor} stopOpacity="0.7" />
            <stop offset="100%" stopColor={ringColor} />
          </linearGradient>
        </defs>

        {/* Track */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={STROKE}
        />

        {/* Progress arc */}
        <circle
          ref={circleRef}
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="url(#ringGrad)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference}
          transform={`rotate(-90 ${cx} ${cy})`}
        />

        {/* Percentage text */}
        <text
          x={cx}
          y={cy - 10}
          textAnchor="middle"
          dominantBaseline="middle"
          fill={ringColor}
          fontSize={size * 0.22}
          fontWeight="800"
          fontFamily="Inter, sans-serif"
        >
          {clampedPercent}%
        </text>

        {/* Sub-label */}
        <text
          x={cx}
          y={cy + size * 0.18}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="rgba(255,255,255,0.4)"
          fontSize={size * 0.085}
          fontWeight="500"
          fontFamily="Inter, sans-serif"
        >
          {label}
        </text>
      </svg>
    </div>
  );
}
