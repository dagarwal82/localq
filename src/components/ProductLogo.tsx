interface ProductLogoProps {
  className?: string;
  size?: number;
}

export function ProductLogo({ className = "", size = 32 }: ProductLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer rounded square - box/package */}
      <rect
        x="10"
        y="10"
        width="80"
        height="80"
        rx="12"
        stroke="currentColor"
        strokeWidth="2.5"
        fill="none"
        opacity="0.3"
      />
      
      {/* Package/box center shape */}
      <path
        d="M30 35 L50 25 L70 35 L70 65 L50 75 L30 65 Z"
        fill="currentColor"
        opacity="0.2"
      />
      
      {/* Box fold lines */}
      <path
        d="M50 25 L50 75"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M30 35 L50 45 L70 35"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      
      {/* Tag icon in center */}
      <path
        d="M45 50 L50 45 L60 45 L65 50 L60 60 L50 60 Z"
        fill="currentColor"
        opacity="0.7"
      />
      
      {/* Price tag hole */}
      <circle cx="58" cy="50" r="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      
      {/* Queue dots at bottom */}
      <circle cx="35" cy="85" r="2.5" fill="currentColor" opacity="0.5" />
      <circle cx="50" cy="85" r="3" fill="currentColor" opacity="0.7" />
      <circle cx="65" cy="85" r="2.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// Variant with gradient background
export function ProductLogoWithBg({ className = "", size = 32 }: ProductLogoProps) {
  return (
    <div className={`rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-2 ${className}`}>
      <ProductLogo size={size - 16} className="text-white" />
    </div>
  );
}
