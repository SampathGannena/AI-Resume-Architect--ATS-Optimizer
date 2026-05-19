import React from "react";

export default function CareerForgeBrandIcon() {
  return (
    <svg
      className="cf-brand-icon"
      viewBox="0 0 64 64"
      role="img"
      aria-label="CareerForge brand icon"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="cf-brand-shine-glow" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="0" stdDeviation="1.1" floodColor="#ffdd84" floodOpacity="0.95" />
          <feDropShadow dx="0" dy="0" stdDeviation="2.6" floodColor="#bb8f2e" floodOpacity="0.78" />
        </filter>
        <filter id="cf-brand-spark-glow" x="-80%" y="-80%" width="260%" height="260%" colorInterpolationFilters="sRGB">
          <feDropShadow dx="0" dy="0" stdDeviation="1.6" floodColor="#fbe78b" floodOpacity="0.95" />
        </filter>
      </defs>

      <path d="M32 3.5L55.5 17V47L32 60.5L8.5 47V17L32 3.5Z" fill="#040404" />
      <path
        d="M32 3.5L55.5 17V47L32 60.5L8.5 47V17L32 3.5Z"
        fill="none"
        stroke="#d5b75a"
        strokeWidth="2.3"
        strokeLinejoin="round"
      />
      <path
        d="M32 3.5L55.5 17V47L32 60.5L8.5 47V17L32 3.5Z"
        fill="none"
        stroke="#ffe9a3"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="22 140"
        filter="url(#cf-brand-shine-glow)"
      >
        <animate attributeName="stroke-dashoffset" values="0;-162" dur="2.8s" repeatCount="indefinite" />
      </path>
      <path
        d="M32 8.6L51.1 19.7V44.3L32 55.4L12.9 44.3V19.7L32 8.6Z"
        fill="none"
        stroke="#5d4c1d"
        strokeWidth="1.15"
        strokeLinejoin="round"
      />

      <path
        d="M39.4 20.2H27.5C23.7 20.2 20.8 23.1 20.8 26.9V37.1C20.8 40.9 23.7 43.8 27.5 43.8H39.4"
        fill="none"
        stroke="#d7ff3f"
        strokeWidth="4.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M31.6 20.2V43.8" fill="none" stroke="#d7ff3f" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31.6 20.2H40.2" fill="none" stroke="#d7ff3f" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M31.6 32H39" fill="none" stroke="#d7ff3f" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" />

      <path
        d="M46.7 13.6L48 16.3L50.7 17.6L48 18.9L46.7 21.6L45.4 18.9L42.7 17.6L45.4 16.3Z"
        fill="#e6ff6e"
        filter="url(#cf-brand-spark-glow)"
      />
    </svg>
  );
}

