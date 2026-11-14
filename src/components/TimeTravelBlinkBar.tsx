import { useEffect, useState } from 'react';
import { Pause, Play, SkipBack, SkipForward } from 'lucide-react';
import type {
  EpochData,
  EpochIndex,
  LiveTickerAlert,
  TargetCatalogEntry,
  ViewMode,
} from '../types/spherex';

interface TimeTravelBlinkBarProps {
  epochs: EpochData[];
  epoch: EpochIndex;
  blinkFrame: 1 | 2;
  mode: ViewMode;
  isPlaying: boolean;
  showLiveTicker: boolean;
  alerts: LiveTickerAlert[];
  targets: TargetCatalogEntry[];
  onEpochChange: (epoch: EpochIndex) => void;
  onTogglePlay: () => void;
  onToggleBlink: () => void;
  onToggleDiff: () => void;
  onToggleSum: () => void;
  onStepBlink: () => void;
  onJumpAlert: (alert: LiveTickerAlert) => void;
  onSelectTarget: (target: TargetCatalogEntry) => void;
}

export function TimeTravelBlinkBar({
  epochs,
  epoch,
  blinkFrame,
  mode,
  isPlaying,
  showLiveTicker,
  alerts,
  targets,
  onEpochChange,
  onTogglePlay,
  onToggleBlink,
  onToggleDiff,
  onToggleSum,
  onStepBlink,
  onJumpAlert,
  onSelectTarget,
}: TimeTravelBlinkBarProps) {
  const [tickerIdx, setTickerIdx] = useState(0);
  const [inlineQuery, setInlineQuery] = useState('');

  useEffect(() => {
    if (alerts.length <= 1) return;
    const t = window.setInterval(() => {
      setTickerIdx((prev) => (prev + 1) % alerts.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [alerts.length]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || document.querySelector('[role="dialog"]')) {
        return;
      }
      e.preventDefault();
      onStepBlink();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onStepBlink]);

  const activeAlert = alerts[tickerIdx] ?? alerts[0];
  const displayEpoch = mode === 'blink' ? blinkFrame : epoch;

  const handleInlineSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = inlineQuery.trim().toLowerCase();
    if (!q) return;
    const match = targets.find(
      (t) => t.name.toLowerCase().includes(q) || t.designation.toLowerCase().includes(q),
    );
    if (match) {
      onSelectTarget(match);
      setInlineQuery('');
    }
  };

  return (
    <div className="w-full flex flex-col gap-1.5 pointer-events-none">
      {/* Optional [Live Ticker] Bar */}
      {showLiveTicker && (
        <div className="hud-card rounded-xl px-3.5 py-2 flex items-center justify-between gap-3 pointer-events-auto shadow-xl font-mono">
          <div className="flex items-center gap-2 text-xs min-w-0">
            <span className="text-[#52B79A] shrink-0 font-medium">[Live Ticker]</span>
            {activeAlert && (
              <button
                type="button"
                onClick={() => onJumpAlert(activeAlert)}
                className="text-slate-200 hover:text-white truncate transition-colors text-left"
              >
                &gt; {activeAlert.label}
              </button>
            )}
          </div>
          <form onSubmit={handleInlineSearchSubmit} className="flex items-center shrink-0">
            <input
              type="text"
              value={inlineQuery}
              onChange={(e) => setInlineQuery(e.target.value)}
              placeholder="[Search] Type object name..."
              className="w-40 bg-black/30 border border-white/10 rounded px-2 py-0.5 text-[10px] text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-white/20"
            />
          </form>
        </div>
      )}

      {/* Main Time-Travel Blink Bar */}
      <div className="hud-card rounded-xl px-3.5 py-2.5 flex flex-col gap-1.5 shadow-xl pointer-events-auto">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-100">Time-Travel Blink</span>
            <span className="text-[10px] font-mono text-slate-400">
              {epochs.find((e) => e.epoch === displayEpoch)?.dateLabel} (T{displayEpoch})
            </span>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-xs">
            <button
              type="button"
              onClick={onToggleBlink}
              title="Alternar ultrarrápido entre épocas (Atajo: Barra Espaciadora)"
              className={`px-2.5 py-0.5 rounded-lg border transition-colors flex items-center gap-1.5 ${
                mode === 'blink'
                  ? 'bg-white/20 border-white/40 text-white shadow-sm'
                  : 'bg-[#181A20] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <span>Blink</span>
              <kbd className="px-1 py-0.2 rounded bg-black/40 text-[9px] text-slate-400">Space</kbd>
            </button>
            <button
              type="button"
              onClick={onToggleDiff}
              title="Resta de imágenes tomadas en diferentes momentos (T₂ − T₁) para aislar objetos en movimiento"
              className={`px-2.5 py-0.5 rounded-lg border transition-colors ${
                mode === 'diff'
                  ? 'bg-rose-500/20 border-rose-400/50 text-white shadow-sm'
                  : 'bg-[#181A20] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              Resta (T₂ − T₁)
            </button>
            <button
              type="button"
              onClick={onToggleSum}
              title="Suma de imágenes tomadas en diferentes momentos (T₁ + T₂) para mejorar la señal-ruido (SNR)"
              className={`px-2.5 py-0.5 rounded-lg border transition-colors ${
                mode === 'sum'
                  ? 'bg-[#5C7CFA]/25 border-[#5C7CFA]/55 text-white shadow-sm'
                  : 'bg-[#181A20] border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              Suma (T₁ + T₂)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 pt-0.5">
          {/* Play, Pause & Frame-by-Frame Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                const prev = (displayEpoch > 1 ? displayEpoch - 1 : 4) as EpochIndex;
                onEpochChange(prev);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center border bg-white/5 border-white/10 text-[#C8CDD6] hover:text-white transition-colors"
              title="Frame anterior (Frame x Frame)"
            >
              <SkipBack className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isPlaying) onTogglePlay();
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                isPlaying
                  ? 'bg-[#52B79A]/25 border-[#52B79A]/50 text-white'
                  : 'bg-white/5 border-white/10 text-[#C8CDD6] hover:text-white'
              }`}
              title="Reproducir timelapse semestral"
            >
              <Play className="w-3 h-3 ml-0.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (isPlaying) onTogglePlay();
              }}
              className={`w-6 h-6 rounded-full flex items-center justify-center border transition-colors ${
                !isPlaying
                  ? 'bg-white/15 border-white/25 text-white'
                  : 'bg-white/5 border-white/10 text-[#8E94A0] hover:text-white'
              }`}
              title="Pausar timelapse"
            >
              <Pause className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => {
                const next = ((displayEpoch % 4) + 1) as EpochIndex;
                onEpochChange(next);
              }}
              className="w-6 h-6 rounded-full flex items-center justify-center border bg-white/5 border-white/10 text-[#C8CDD6] hover:text-white transition-colors"
              title="Siguiente frame (Frame x Frame)"
            >
              <SkipForward className="w-3 h-3" />
            </button>
          </div>

          {/* Progress Scrubber */}
          <div className="flex-1 flex flex-col gap-0.5">
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={displayEpoch}
              onChange={(e) => onEpochChange(Number(e.target.value) as EpochIndex)}
              aria-label="Time-Travel Blink Scrubber"
              className="w-full h-1 rounded-lg appearance-none cursor-pointer accent-white bg-slate-800"
            />
            <div className="flex items-center justify-between text-[9px] font-mono text-slate-500 px-0.5">
              <span>May 2025</span>
              <span>Aug 2025</span>
              <span>Nov 2025</span>
              <span>Dec 2025</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
