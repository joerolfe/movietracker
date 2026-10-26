interface StarsProps {
  rating: number; // 0-5, fractional
  size?: number;
  className?: string;
}

const STAR_PATH =
  "M12 2.5l2.94 6.26 6.86.83-5.06 4.72 1.32 6.79L12 17.65 5.94 21.1l1.32-6.79L2.2 9.59l6.86-.83L12 2.5z";

function Star({ fill, size }: { fill: number; size: number }) {
  const pct = Math.round(Math.min(1, Math.max(0, fill)) * 100);
  return (
    <span className="relative inline-block" style={{ width: size, height: size }}>
      <svg viewBox="0 0 24 24" width={size} height={size} className="absolute inset-0 text-[#2c3640]" fill="currentColor">
        <path d={STAR_PATH} />
      </svg>
      <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: `${pct}%` }}>
        <svg viewBox="0 0 24 24" width={size} height={size} className="text-star max-w-none" fill="currentColor">
          <path d={STAR_PATH} />
        </svg>
      </span>
    </span>
  );
}

/** Five stars with fractional fill: 3.7 = 3 full stars + 70% of the 4th. */
export default function Stars({ rating, size = 20, className = "" }: StarsProps) {
  return (
    <span
      className={`inline-flex gap-0.5 ${className}`}
      role="img"
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => (
        <Star key={i} size={size} fill={rating - i} />
      ))}
    </span>
  );
}
