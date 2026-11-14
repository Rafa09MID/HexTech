import { BarChart2, Cpu, LayoutList, Share2 } from 'lucide-react';
import type { FloatingModuleVisibility } from '../types/spherex';

export type RadialDirectionKey = 'aiInsights' | 'spectra' | 'metadata' | 'shareUrl' | null;

interface RadialControlMenuProps {
  position: { x: number; y: number } | null;
  activeDirection: RadialDirectionKey;
  mouseOffset: { dx: number; dy: number };
  visibility: FloatingModuleVisibility;
  onSelectDirection: (key: NonNullable<RadialDirectionKey>) => void;
}

export function RadialControlMenu({
  position,
  activeDirection,
  mouseOffset,
  visibility,
  onSelectDirection,
}: RadialControlMenuProps) {
  if (!position) return null;

  const dist = Math.hypot(mouseOffset.dx, mouseOffset.dy);
  const maxShift = 7;
  const orbShiftX = dist > 4 ? (mouseOffset.dx / dist) * Math.min(dist * 0.14, maxShift) : 0;
  const orbShiftY = dist > 4 ? (mouseOffset.dy / dist) * Math.min(dist * 0.14, maxShift) : 0;

  const getTileClass = (key: NonNullable<RadialDirectionKey>) => {
    const isDirectionalActive = activeDirection === key;
    const isModuleEnabled = visibility[key];

    if (isDirectionalActive) {
      return 'bg-white/20 border-white/40 text-white shadow-[0_0_20px_rgba(255,255,255,0.35)] scale-105';
    }
    if (isModuleEnabled) {
      return 'bg-[#1A1C22]/90 border-white/20 text-[#ECEEF2] shadow-md';
    }
    return 'bg-[#14161B]/85 border-white/[0.08] text-[#8E94A0] shadow-sm';
  };

  return (
    <div
      className="fixed z-50 pointer-events-none animate-radial-pop select-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      <div className="relative w-52 h-52 pointer-events-auto flex items-center justify-center">
        {/* Continuous Translucent Track Ring & Directional Glow */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 208 208">
          <defs>
            <radialGradient id="radialWhiteGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.25)" />
              <stop offset="60%" stopColor="rgba(148, 163, 184, 0.08)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
            </radialGradient>
          </defs>

          {/* Ambient glow behind center */}
          <circle cx="104" cy="104" r="70" fill="url(#radialWhiteGlow)" />

          {/* Frosted circular connector band */}
          <circle
            cx="104"
            cy="104"
            r="60"
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="10"
          />
          <circle
            cx="104"
            cy="104"
            r="66"
            fill="none"
            stroke="rgba(255, 255, 255, 0.12)"
            strokeWidth="1"
          />
          <circle
            cx="104"
            cy="104"
            r="54"
            fill="none"
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth="1"
          />

          {/* Directional highlight arc on the ring */}
          {activeDirection === 'aiInsights' && (
            <path
              d="M 62 62 A 60 60 0 0 1 146 62"
              fill="none"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
          {activeDirection === 'spectra' && (
            <path
              d="M 62 146 A 60 60 0 0 1 62 62"
              fill="none"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
          {activeDirection === 'metadata' && (
            <path
              d="M 146 62 A 60 60 0 0 1 146 146"
              fill="none"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
          {activeDirection === 'shareUrl' && (
            <path
              d="M 146 146 A 60 60 0 0 1 62 146"
              fill="none"
              stroke="rgba(255, 255, 255, 0.85)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          )}
        </svg>

        {/* Center Glowing Sphere Housing */}
        <div className="relative z-10 w-12 h-12 rounded-full bg-[#14161B]/88 border border-white/20 flex items-center justify-center shadow-lg backdrop-blur-md">
          <div
            className="w-4 h-4 rounded-full transition-transform duration-75"
            style={{
              transform: `translate(${orbShiftX}px, ${orbShiftY}px)`,
              background: 'radial-gradient(circle, #FFFFFF 20%, #E2E8F0 60%, #94A3B8 100%)',
              boxShadow: '0 0 12px 3px rgba(255, 255, 255, 0.5)',
            }}
          />
        </div>

        {/* TOP TILE: AI */}
        <button
          type="button"
          onClick={() => onSelectDirection('aiInsights')}
          className={`absolute top-1 left-1/2 -translate-x-1/2 w-[58px] h-[48px] rounded-xl border flex flex-col items-center justify-center gap-0.5 backdrop-blur-lg transition-all duration-150 ${getTileClass(
            'aiInsights',
          )}`}
        >
          <Cpu className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[10px] font-medium tracking-tight leading-none">AI</span>
        </button>

        {/* LEFT TILE: Spectra */}
        <button
          type="button"
          onClick={() => onSelectDirection('spectra')}
          className={`absolute left-1 top-1/2 -translate-y-1/2 w-[60px] h-[50px] rounded-xl border flex flex-col items-center justify-center gap-0.5 backdrop-blur-lg transition-all duration-150 ${getTileClass(
            'spectra',
          )}`}
        >
          <BarChart2 className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[10px] font-medium tracking-tight leading-none">Spectra</span>
        </button>

        {/* RIGHT TILE: Metadata */}
        <button
          type="button"
          onClick={() => onSelectDirection('metadata')}
          className={`absolute right-1 top-1/2 -translate-y-1/2 w-[60px] h-[50px] rounded-xl border flex flex-col items-center justify-center gap-0.5 backdrop-blur-lg transition-all duration-150 ${getTileClass(
            'metadata',
          )}`}
        >
          <LayoutList className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[10px] font-medium tracking-tight leading-none">Metadata</span>
        </button>

        {/* BOTTOM TILE: URL */}
        <button
          type="button"
          onClick={() => onSelectDirection('shareUrl')}
          className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-[58px] h-[48px] rounded-xl border flex flex-col items-center justify-center gap-0.5 backdrop-blur-lg transition-all duration-150 ${getTileClass(
            'shareUrl',
          )}`}
        >
          <Share2 className="w-3.5 h-3.5 text-slate-300" />
          <span className="text-[10px] font-medium tracking-tight leading-none">URL</span>
        </button>
      </div>
    </div>
  );
}
