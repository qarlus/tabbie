/** Tiny inline Tabbie mark — matches public/icon.svg. */
export function TabbieMark({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Tabbie"
      className={className}
    >
      <rect width="64" height="64" rx="14" fill="#5F8F8C" />
      <ellipse cx="20" cy="18.5" rx="7.2" ry="8.5" fill="#C5D9C3" stroke="#2F3F45" strokeWidth="2" />
      <ellipse cx="44" cy="18.5" rx="7.2" ry="8.5" fill="#C5D9C3" stroke="#2F3F45" strokeWidth="2" />
      <path
        fill="#F7F4ED"
        stroke="#2F3F45"
        strokeWidth="2"
        strokeLinejoin="round"
        d="M14 29c0-2.6 2.1-4.7 4.7-4.7h9.5c0.9 0 1.7-0.35 2.3-0.95l1.35-1.35c0.6-0.6 1.4-0.95 2.3-0.95H45.3c2.6 0 4.7 2.1 4.7 4.7V45.3c0 2.6-2.1 4.7-4.7 4.7H18.7c-2.6 0-4.7-2.1-4.7-4.7Z"
      />
      <circle cx="19.5" cy="26.2" r="1.55" fill="#2F3F45" />
      <circle cx="24" cy="26.2" r="1.55" fill="#2F3F45" />
      <circle cx="28.5" cy="26.2" r="1.55" fill="#2F3F45" />
      <circle cx="27" cy="36.5" r="2.35" fill="#2F3F45" />
      <circle cx="37" cy="36.5" r="2.35" fill="#2F3F45" />
      <path
        d="M28 42.2c1.6 1.8 6.4 1.8 8 0"
        fill="none"
        stroke="#2F3F45"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
