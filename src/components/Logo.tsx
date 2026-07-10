// EnrolEasy brand mark — "Ascending Path": a graduation-cap silhouette whose
// tassel curves into a checkmark, on a rounded indigo badge. Used in place of
// the old generic lucide-react GraduationCap icon everywhere the wordmark
// appears (header, footer, dashboard nav, auth pages), and as the source for
// the generated favicon/apple-icon (see src/app/icon.svg, apple-icon.png).
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} role="img" aria-label="EnrolEasy">
      <rect width="40" height="40" rx="10" fill="#4f46e5" />
      <path d="M10 16.5 L20 11 L30 16.5 L20 22 Z" fill="#ffffff" />
      <path
        d="M14 19 L14 25 Q20 29 26 25 L26 19"
        stroke="#ffffff"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M30 16.5 V23" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
