/**
 * Logo bulat: beberapa lingkaran tipis yang sedikit bergeser satu sama lain,
 * seperti goresan pensil yang diulang. Bentuknya senada dengan garis
 * lingkaran di beranda.
 */
export default function RingLogo({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" aria-hidden className={className} fill="none" stroke="currentColor">
      <ellipse cx="20" cy="20" rx="15" ry="16.2" strokeWidth="0.9" />
      <ellipse cx="21.3" cy="19.6" rx="14.2" ry="15.8" strokeWidth="0.6" strokeOpacity="0.85" transform="rotate(-10 20 20)" />
      <ellipse cx="18.8" cy="20.5" rx="15.8" ry="15" strokeWidth="0.55" strokeOpacity="0.7" transform="rotate(14 20 20)" />
      <ellipse cx="20.4" cy="21" rx="14.6" ry="16.8" strokeWidth="0.45" strokeOpacity="0.6" transform="rotate(5 20 20)" />
      <ellipse cx="19.6" cy="19.2" rx="16.2" ry="16" strokeWidth="0.35" strokeOpacity="0.5" transform="rotate(-22 20 20)" />
    </svg>
  );
}
