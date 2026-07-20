/** Tiny inline CapTab mark — matches public/icon.svg. */
export function CapTabMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      role="img"
      aria-label="CapTab"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#2C2218" />
      <ellipse cx="20" cy="17.5" rx="7.4" ry="8.8" fill="#C4A574" stroke="#5C4030" strokeWidth="2" />
      <ellipse cx="44" cy="17.5" rx="7.4" ry="8.8" fill="#C4A574" stroke="#5C4030" strokeWidth="2" />
      <ellipse cx="20" cy="18.2" rx="3.2" ry="4" fill="#E8C49A" />
      <ellipse cx="44" cy="18.2" rx="3.2" ry="4" fill="#E8C49A" />
      <path
        fill="#F5F0E8"
        stroke="#5C4030"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M14 29c0-2.6 2.1-4.7 4.7-4.7h9.5c0.9 0 1.7-0.35 2.3-0.95l1.35-1.35c0.6-0.6 1.4-0.95 2.3-0.95H45.3c2.6 0 4.7 2.1 4.7 4.7V45.3c0 2.6-2.1 4.7-4.7 4.7H18.7c-2.6 0-4.7-2.1-4.7-4.7Z"
      />
      <circle cx="19.5" cy="26.2" r="1.55" fill="#5C4030" />
      <circle cx="24" cy="26.2" r="1.55" fill="#5C4030" />
      <circle cx="28.5" cy="26.2" r="1.55" fill="#5C4030" />
      <ellipse cx="22.5" cy="38.5" rx="3.2" ry="1.8" fill="#E8A0A8" opacity="0.7" />
      <ellipse cx="41.5" cy="38.5" rx="3.2" ry="1.8" fill="#E8A0A8" opacity="0.7" />
      <ellipse cx="32" cy="40.2" rx="6.5" ry="4.2" fill="#D4A574" opacity="0.55" />
      <circle cx="27" cy="36.2" r="2.35" fill="#1A1410" />
      <circle cx="37" cy="36.2" r="2.35" fill="#1A1410" />
      <path
        d="M27.5 42.2q2.2 3.2 4.5 0q2.2 3.2 4.5 0"
        fill="none"
        stroke="#1A1410"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
