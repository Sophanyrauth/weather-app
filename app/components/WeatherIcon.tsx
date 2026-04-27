"use client";

interface WeatherIconProps {
  condition: string;
  size?: number;
  className?: string;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const round6 = (value: number) => Number(value.toFixed(6));

export default function WeatherIcon({ condition, size = 64, className = "" }: WeatherIconProps) {
  const c = condition.toLowerCase();

  if (c.includes("sunny") || c.includes("clear")) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="32" cy="32" r="14" fill="#FFD700" opacity="0.9" />
        <circle cx="32" cy="32" r="10" fill="#FFE566" />
        {[0,45,90,135,180,225,270,315].map((deg, i) => {
          const cos = round6(Math.cos(toRad(deg)));
          const sin = round6(Math.sin(toRad(deg)));

          return (
            <line
              key={i}
              x1="32" y1="32"
              x2={round6(32 + 20 * cos)}
              y2={round6(32 + 20 * sin)}
              stroke="#FFD700"
              strokeWidth="2.5"
              strokeLinecap="round"
              opacity="0.8"
              transform={`translate(${round6(-8 * cos)}, ${round6(-8 * sin)})`}
            />
          );
        })}
      </svg>
    );
  }

  if (c.includes("rain") || c.includes("drizzle")) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <ellipse cx="24" cy="22" rx="14" ry="10" fill="#94a3b8" opacity="0.8" />
        <ellipse cx="38" cy="20" rx="16" ry="11" fill="#cbd5e1" opacity="0.9" />
        <ellipse cx="28" cy="26" rx="18" ry="10" fill="#e2e8f0" opacity="0.95" />
        {[[20,38,24,46],[28,40,22,50],[36,38,30,48],[44,36,38,46],[30,44,26,54]].map(([x1,y1,x2,y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#60b8ff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
        ))}
      </svg>
    );
  }

  if (c.includes("cloudy") && c.includes("partly")) {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
        <circle cx="20" cy="26" r="10" fill="#FFD700" opacity="0.7" />
        {[0, 60, 120, 180, 240, 300].map((deg, i) => {
          const cos = round6(Math.cos(toRad(deg)));
          const sin = round6(Math.sin(toRad(deg)));

          return (
            <line key={i} x1="20" y1="26"
              x2={round6(20 + 15 * cos)}
              y2={round6(26 + 15 * sin)}
              stroke="#FFD700" strokeWidth="2" strokeLinecap="round" opacity="0.6"
              transform={`translate(${round6(-5 * cos)}, ${round6(-5 * sin)})`}
            />
          );
        })}
        <ellipse cx="36" cy="32" rx="14" ry="9" fill="#94a3b8" opacity="0.8" />
        <ellipse cx="46" cy="30" rx="12" ry="8" fill="#cbd5e1" opacity="0.9" />
        <ellipse cx="40" cy="35" rx="16" ry="9" fill="#e2e8f0" opacity="0.95" />
      </svg>
    );
  }

  // Cloudy / overcast
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className}>
      <ellipse cx="22" cy="26" rx="14" ry="10" fill="#64748b" opacity="0.7" />
      <ellipse cx="36" cy="22" rx="16" ry="11" fill="#94a3b8" opacity="0.85" />
      <ellipse cx="44" cy="28" rx="12" ry="9" fill="#94a3b8" opacity="0.8" />
      <ellipse cx="30" cy="32" rx="22" ry="11" fill="#cbd5e1" opacity="0.9" />
    </svg>
  );
}
