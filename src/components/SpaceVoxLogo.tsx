interface SpaceVoxLogoProps {
  className?: string;
  size?: number;
}

export function SpaceVoxLogo({ className = "", size = 32 }: SpaceVoxLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Outer circle - space/orbit */}
      <circle
        cx="50"
        cy="50"
        r="45"
        stroke="currentColor"
        strokeWidth="2"
        fill="none"
        opacity="0.3"
      />
      
      {/* Inner star/voice waves */}
      <path
        d="M50 20 L55 40 L75 40 L60 52 L65 72 L50 60 L35 72 L40 52 L25 40 L45 40 Z"
        fill="currentColor"
        opacity="0.8"
      />
      
      {/* Voice/sound wave lines */}
      <path
        d="M20 50 Q25 45, 30 50 T40 50"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M60 50 Q65 45, 70 50 T80 50"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      
      {/* Small dots representing network/queue */}
      <circle cx="50" cy="85" r="3" fill="currentColor" opacity="0.6" />
      <circle cx="40" cy="85" r="2" fill="currentColor" opacity="0.4" />
      <circle cx="60" cy="85" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// Variant with background
export function SpaceVoxLogoWithBg({ className = "", size = 32 }: SpaceVoxLogoProps) {
  return (
    <div className={`rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 p-2 ${className}`}>
      <SpaceVoxLogo size={size - 16} className="text-white" />
    </div>
  );
}
