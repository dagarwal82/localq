interface GarageSaleLogoProps {
  className?: string;
  size?: number;
}

// Concept: A simple community garage sale
// Elements: stylized garage/house outline, box inside (item), small calendar tab (pickup scheduling),
// three dots underneath (people/community queue), minimal lines for friendliness.
export function GarageSaleLogo({ className = "", size = 40 }: GarageSaleLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="Garage sale community logo"
    >
      {/* House/Garage outline */}
      <path
        d="M15 45 L50 18 L85 45 V82 C85 84 83.5 86 81 86 H19 C16.5 86 15 84 15 82 V45 Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Door opening (negative space) */}
      <rect x="32" y="55" width="36" height="26" rx="4" stroke="currentColor" strokeWidth="3" fill="none" />
      {/* Box inside garage */}
      <path
        d="M38 60 L50 54 L62 60 V72 L50 78 L38 72 Z"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M50 54 V66" stroke="currentColor" strokeWidth="2" />
      <path d="M38 60 L50 66 L62 60" stroke="currentColor" strokeWidth="2" />

      {/* Calendar pickup badge (top right) */}
      <rect x="66" y="47" width="16" height="16" rx="3" fill="currentColor" opacity="0.15" />
      <path d="M70 51 V57" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M78 51 V57" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <rect x="69" y="59" width="10" height="6" rx="1" fill="currentColor" opacity="0.5" />

      {/* Community / queue dots */}
      <circle cx="40" cy="88" r="3" fill="currentColor" />
      <circle cx="50" cy="88" r="3" fill="currentColor" />
      <circle cx="60" cy="88" r="3" fill="currentColor" />
    </svg>
  );
}

export function GarageSaleLogoWithBg({ className = "", size = 56 }: GarageSaleLogoProps) {
  return (
    <div className={`inline-flex items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-2 shadow-sm ${className}`}>
      <GarageSaleLogo size={size - 16} className="text-white" />
    </div>
  );
}
