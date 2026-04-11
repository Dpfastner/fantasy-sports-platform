'use client'

/**
 * Decorative Masters Trophy silhouette for the pool page header.
 * Original illustration — clubhouse shape on pedestal with engraved band.
 * Gold/silver palette. NOT a photo of the real trophy (IP risk).
 */
export function MastersTrophy({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 80 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* ── Pedestal base ── */}
      <rect x="15" y="108" width="50" height="6" rx="1.5" fill="#A8862A" />
      <rect x="15" y="108" width="50" height="2" rx="1" fill="#C9A84C" opacity="0.6" />
      <rect x="20" y="102" width="40" height="7" rx="1.5" fill="#A8862A" />
      <rect x="20" y="102" width="40" height="2" rx="1" fill="#E8C96A" opacity="0.4" />

      {/* ── Pedestal column ── */}
      <rect x="30" y="88" width="20" height="15" rx="1" fill="#C9A84C" />
      <rect x="30" y="88" width="20" height="3" rx="1" fill="#E8C96A" opacity="0.5" />

      {/* ── Engraved band ── */}
      <rect x="24" y="82" width="32" height="8" rx="2" fill="#A8862A" />
      <rect x="26" y="84" width="28" height="4" rx="1" fill="#C9A84C" />
      {/* Tiny engraving lines */}
      <line x1="30" y1="85" x2="30" y2="87" stroke="#A8862A" strokeWidth="0.5" />
      <line x1="34" y1="85" x2="34" y2="87" stroke="#A8862A" strokeWidth="0.5" />
      <line x1="38" y1="85" x2="38" y2="87" stroke="#A8862A" strokeWidth="0.5" />
      <line x1="42" y1="85" x2="42" y2="87" stroke="#A8862A" strokeWidth="0.5" />
      <line x1="46" y1="85" x2="46" y2="87" stroke="#A8862A" strokeWidth="0.5" />
      <line x1="50" y1="85" x2="50" y2="87" stroke="#A8862A" strokeWidth="0.5" />

      {/* ── Clubhouse body (the trophy IS a miniature clubhouse) ── */}
      <rect x="18" y="42" width="44" height="40" rx="2" fill="#C9A84C" />
      {/* Front face highlight */}
      <rect x="18" y="42" width="44" height="6" rx="2" fill="#E8C96A" opacity="0.4" />

      {/* ── Clubhouse windows (2 rows) ── */}
      {/* Top row */}
      <rect x="24" y="48" width="6" height="6" rx="0.8" fill="#A8862A" />
      <rect x="33" y="48" width="6" height="6" rx="0.8" fill="#A8862A" />
      <rect x="42" y="48" width="6" height="6" rx="0.8" fill="#A8862A" />
      <rect x="51" y="48" width="6" height="6" rx="0.8" fill="#A8862A" />
      {/* Bottom row */}
      <rect x="24" y="58" width="6" height="6" rx="0.8" fill="#A8862A" />
      <rect x="33" y="58" width="6" height="6" rx="0.8" fill="#A8862A" />
      <rect x="42" y="58" width="6" height="6" rx="0.8" fill="#A8862A" />
      <rect x="51" y="58" width="6" height="6" rx="0.8" fill="#A8862A" />

      {/* ── Clubhouse door ── */}
      <rect x="35" y="68" width="10" height="14" rx="1" fill="#A8862A" />
      <rect x="35" y="68" width="10" height="3" rx="1" fill="#8B6914" />
      <circle cx="43" cy="75" r="1" fill="#E8C96A" /> {/* Doorknob */}

      {/* ── Columns on front ── */}
      <rect x="20" y="42" width="3" height="40" fill="#E8C96A" opacity="0.3" />
      <rect x="57" y="42" width="3" height="40" fill="#E8C96A" opacity="0.3" />

      {/* ── Clubhouse roof ── */}
      <path d="M14 42 L40 20 L66 42Z" fill="#C9A84C" />
      <path d="M14 42 L40 20 L40 42Z" fill="#E8C96A" opacity="0.3" />
      {/* Roof ridge */}
      <line x1="14" y1="42" x2="66" y2="42" stroke="#A8862A" strokeWidth="1.5" />

      {/* ── Cupola on roof ── */}
      <rect x="34" y="22" width="12" height="12" rx="1" fill="#E8C96A" />
      {/* Cupola window */}
      <rect x="36" y="24" width="8" height="8" rx="0.5" fill="#A8862A" />
      {/* Cupola roof */}
      <path d="M32 22 L40 14 L48 22Z" fill="#C9A84C" />
      <line x1="32" y1="22" x2="48" y2="22" stroke="#A8862A" strokeWidth="0.8" />

      {/* ── Flagpole + flag ── */}
      <line x1="40" y1="4" x2="40" y2="14" stroke="#A8862A" strokeWidth="1" />
      <path d="M40 4 L50 7 L40 10Z" fill="#1a5c38" />
      {/* Flag pole ball */}
      <circle cx="40" cy="3.5" r="1.5" fill="#E8C96A" />

      {/* ── Subtle shine/reflection ── */}
      <rect x="22" y="44" width="2" height="35" rx="1" fill="#fff" opacity="0.08" />
    </svg>
  )
}
