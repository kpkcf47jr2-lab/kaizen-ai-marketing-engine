'use client';

import { useId } from 'react';

interface KairosLogoProps {
  size?: number;
  className?: string;
}

/**
 * KairosCoin (KRC) — BEP20 on BSC
 * Logo: stylised "K" inside a golden coin with blockchain motif.
 * Uses useId() for unique gradient IDs so multiple instances render correctly.
 */
export default function KairosLogo({ size = 40, className = '' }: KairosLogoProps) {
  const uid = useId().replace(/:/g, '');
  const bgId     = `krc-bg-${uid}`;
  const ringId   = `krc-ring-${uid}`;
  const glowId   = `krc-glow-${uid}`;
  const letterId = `krc-letter-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="KairosCoin logo"
    >
      {/* Outer glow ring */}
      <circle cx="60" cy="60" r="58" stroke={`url(#${glowId})`} strokeWidth="2" opacity="0.5" />

      {/* Coin background */}
      <circle cx="60" cy="60" r="54" fill={`url(#${bgId})`} />

      {/* Inner rings */}
      <circle cx="60" cy="60" r="48" stroke={`url(#${ringId})`} strokeWidth="1.5" fill="none" />
      <circle cx="60" cy="60" r="44" stroke={`url(#${ringId})`} strokeWidth="0.5" fill="none" opacity="0.5" />

      {/* Blockchain diamond accents */}
      <g opacity="0.3">
        <rect x="57" y="10" width="6" height="6" rx="1" fill="#FFD700" transform="rotate(45 60 13)" />
        <rect x="57" y="104" width="6" height="6" rx="1" fill="#FFD700" transform="rotate(45 60 107)" />
        <rect x="10" y="57" width="6" height="6" rx="1" fill="#FFD700" transform="rotate(45 13 60)" />
        <rect x="104" y="57" width="6" height="6" rx="1" fill="#FFD700" transform="rotate(45 107 60)" />
      </g>

      {/* Letter K — SVG path (no font dependency) */}
      <g fill={`url(#${letterId})`}>
        <path d="M44 38h10v18l16-18h12L65 57l19 25H72L58 62v20H48V38h-4z" />
      </g>

      {/* "KRC" label */}
      <g fill="#FFD700" opacity="0.85">
        {/* K */}
        <path d="M41 85h2.5v4.5l4-4.5h3l-4.2 4.6L50.5 95H47.4l-3.4-4.3V95H41V85z" />
        {/* R */}
        <path d="M52 85h4.5c2.2 0 3.3 1.1 3.3 2.7 0 1.3-.8 2.2-2 2.5l2.4 4.8h-2.8l-2.1-4.4H54.5V95H52V85zm2.5 2v2.6h1.8c.9 0 1.3-.5 1.3-1.3s-.4-1.3-1.3-1.3h-1.8z" />
        {/* C */}
        <path d="M63 90c0-3 2-5.2 5-5.2 2 0 3.5 1 4 2.6l-2.4.6c-.3-.8-1-1.2-1.7-1.2-1.5 0-2.4 1.2-2.4 3.2s.9 3.2 2.4 3.2c.8 0 1.4-.4 1.7-1.2l2.4.6c-.5 1.6-2 2.6-4 2.6-3 0-5-2.2-5-5.2z" />
      </g>

      {/* Gradients */}
      <defs>
        <linearGradient id={bgId} x1="6" y1="6" x2="114" y2="114">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="50%" stopColor="#16213e" />
          <stop offset="100%" stopColor="#0f3460" />
        </linearGradient>
        <linearGradient id={ringId} x1="6" y1="6" x2="114" y2="114">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFA500" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
        <linearGradient id={glowId} x1="0" y1="0" x2="120" y2="120">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#FFA500" />
        </linearGradient>
        <linearGradient id={letterId} x1="40" y1="30" x2="80" y2="90">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFD700" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Smaller inline badge version of the KRC coin.
 */
export function KairosLogoBadge({ size = 20, className = '' }: KairosLogoProps) {
  const uid = useId().replace(/:/g, '');
  const bgId = `krc-bdg-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`inline-block ${className}`}
      role="img"
      aria-label="KRC"
    >
      <circle cx="60" cy="60" r="54" fill={`url(#${bgId})`} />
      <circle cx="60" cy="60" r="48" stroke="#FFD700" strokeWidth="2" fill="none" opacity="0.6" />
      {/* K path instead of text */}
      <g fill="#FFD700">
        <path d="M40 35h14v22l20-22h16L68 58l24 30H76L58 62v26H44V35h-4z" />
      </g>
      <defs>
        <linearGradient id={bgId} x1="6" y1="6" x2="114" y2="114">
          <stop offset="0%" stopColor="#1a1a2e" />
          <stop offset="100%" stopColor="#0f3460" />
        </linearGradient>
      </defs>
    </svg>
  );
}
