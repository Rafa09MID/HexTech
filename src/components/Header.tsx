import { Info, Search } from 'lucide-react';
import type { CanvasMode, TargetData } from '../types';

interface HeaderProps {
  targets: TargetData[];
  selectedTarget: TargetData;
  canvasMode: CanvasMode;
  onSelectTarget: (target: TargetData) => void;
  onToggleCanvasMode: () => void;
  onOpenCommandPalette: () => void;
}

export function Header({
  targets,
  selectedTarget,
  canvasMode,
  onSelectTarget,
  onToggleCanvasMode,
  onOpenCommandPalette,
}: HeaderProps) {
  return (
    <header className="h-12 w-full bg-[#080A0F]/90 border-b border-white/[0.08] backdrop-blur-xl px-4 flex items-center justify-between gap-4 z-40 select-none shrink-0">
      {/* Left: HexTech Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          type="button"
          onClick={onToggleCanvasMode}
          title="Alternar entre Vista Dividida y Vista Panorámica"
          className="flex items-center gap-2.5 text-left group"
        >
          {/* Hexagonal Tech Logo */}
          <div className="w-6 h-6 rounded-md bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center p-0.5 shadow-[0_0_12px_rgba(34,211,238,0.35)] group-hover:scale-105 transition-transform">
            <svg
              viewBox="0 0 24 24"
              className="w-4 h-4 text-black fill-current"
            >
              <polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" />
            </svg>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold tracking-tight text-white font-sans">
              HexTech
            </span>
            <span className="text-xs text-neutral-400 font-normal">
              SPHEREx Explorer
            </span>
          </div>
        </button>
      </div>

      {/* Center: Target Switcher Capsule or Command Search Bar */}
      <div className="flex items-center justify-center flex-1 max-w-2xl">
        {canvasMode === 'sky' ? (
          /* Search Bar Mode (Image 2 style) */
          <button
            type="button"
            onClick={onOpenCommandPalette}
            className="w-full max-w-md h-8 px-3 rounded-full bg-[#121622]/80 hover:bg-[#181E2E] border border-white/[0.1] hover:border-cyan-400/40 flex items-center justify-between gap-3 text-xs text-neutral-300 transition-all shadow-inner"
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-mono uppercase text-neutral-400">
                Command Palette
              </span>
              <Search className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-1" />
              <span className="text-white font-mono truncate">
                {selectedTarget.name}...
              </span>
            </div>
            <kbd className="px-2 py-0.5 rounded bg-black/40 border border-white/10 text-[10px] font-mono text-neutral-400">
              Cmd + K
            </kbd>
          </button>
        ) : (
          /* Target Pills Mode (Image 1 style) */
          <nav className="flex items-center gap-1 p-1 bg-[#10141E]/90 border border-white/[0.08] rounded-full backdrop-blur-md shadow-lg overflow-x-auto max-w-full">
            {/* SPHEREx All-Sky Switch Button */}
            <button
              type="button"
              onClick={onToggleCanvasMode}
              className="px-2.5 py-1 text-[11px] font-mono uppercase text-neutral-400 hover:text-white rounded-full transition-colors"
              title="Ir al mapa completo del cielo"
            >
              SPHEREx
            </button>

            {targets.map((t) => {
              const isSelected = t.id === selectedTarget.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTarget(t)}
                  className={`px-3 py-1 text-xs rounded-full transition-all duration-200 whitespace-nowrap ${
                    isSelected
                      ? 'bg-white text-black font-semibold shadow-sm'
                      : 'text-neutral-300 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  {t.shortName}
                </button>
              );
            })}
          </nav>
        )}
      </div>

      {/* Right: Telemetry Coordinates, Signal Status Dots, Info & Avatar */}
      <div className="flex items-center gap-3 shrink-0 font-mono text-xs text-neutral-300">
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="hidden md:flex items-center gap-1.5 hover:text-cyan-300 transition-colors"
          title="Ver o editar coordenadas (Cmd+K)"
        >
          <span className="text-[11px] text-neutral-300 font-mono">
            {selectedTarget.raFormatted}, {selectedTarget.decFormatted}
          </span>
        </button>

        {/* Status Signal Telemetry Dots (Green, Orange, Red) */}
        <div className="flex items-center gap-1 pl-1">
          <span
            className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)] animate-pulse"
            title="Telemetry: Nominal"
          />
          <span
            className="w-2 h-2 rounded-full bg-amber-400/80"
            title="LVF Channels: 102 Active"
          />
          <span
            className="w-2 h-2 rounded-full bg-red-400/60"
            title="Anomaly Detector: Ready"
          />
        </div>

        {/* Information Icon */}
        <button
          type="button"
          onClick={onOpenCommandPalette}
          className="p-1 text-neutral-400 hover:text-white transition-colors"
          aria-label="Abrir información"
        >
          <Info className="w-3.5 h-3.5" />
        </button>

        {/* User Profile Avatar */}
        <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 border border-white/20 flex items-center justify-center text-[10px] font-sans font-medium text-white shadow-sm overflow-hidden">
          <span>SP</span>
        </div>
      </div>
    </header>
  );
}
