import { Camera, FastForward, Pause, Play, Rewind, Settings } from 'lucide-react';

interface TimelineBarProps {
  isPlaying: boolean;
  isBlinkActive: boolean;
  isDiffMode: boolean;
  timelineValue: number; // 0 to 100
  onTogglePlay: () => void;
  onRewind: () => void;
  onFastForward: () => void;
  onToggleBlink: () => void;
  onToggleDiffMode: () => void;
  onTimelineChange: (val: number) => void;
}

export function TimelineBar({
  isPlaying,
  isBlinkActive,
  isDiffMode,
  timelineValue,
  onTogglePlay,
  onRewind,
  onFastForward,
  onToggleBlink,
  onToggleDiffMode,
  onTimelineChange,
}: TimelineBarProps) {
  return (
    <footer className="h-20 w-full bg-[#080A0F]/95 border-t border-white/[0.08] backdrop-blur-2xl px-4 md:px-6 flex items-center justify-between gap-4 z-40 select-none shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.7)]">
      {/* Left: Leftmost tiny dock + Telemetry Timeline Title + Time-Travel Blink Player */}
      <div className="flex items-center gap-4 shrink-0">
        {/* Left dock icons (Camera & Settings) */}
        <div className="flex flex-col gap-1 pr-3 border-r border-white/10 text-neutral-400">
          <button
            type="button"
            className="p-1 hover:text-white transition-colors"
            title="Capturar pantalla"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            className="p-1 hover:text-white transition-colors"
            title="Ajustes de visualización"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
              Telemetry Timeline
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-300 font-medium">
              Time-Travel Blink
            </span>

            {/* Playback Controls (Rewind, Play/Pause, FastForward) */}
            <div className="flex items-center gap-1 bg-[#141824] p-1 rounded-lg border border-white/10 shadow-inner">
              <button
                type="button"
                onClick={onRewind}
                className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                title="Paso anterior"
              >
                <Rewind className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={onTogglePlay}
                className={`p-1.5 rounded transition-all duration-200 ${
                  isPlaying
                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(34,211,238,0.5)]'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
                title={isPlaying ? 'Pausar' : 'Reproducir'}
              >
                {isPlaying ? (
                  <Pause className="w-3.5 h-3.5" />
                ) : (
                  <Play className="w-3.5 h-3.5 ml-0.5" />
                )}
              </button>

              <button
                type="button"
                onClick={onFastForward}
                className="p-1.5 text-neutral-400 hover:text-white rounded hover:bg-white/5 transition-colors"
                title="Paso siguiente"
              >
                <FastForward className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Center: Slider Scrubber + Semestral description & Date markers */}
      <div className="flex-1 max-w-2xl px-4 flex flex-col justify-center gap-1.5">
        <div className="text-[11px] text-neutral-400 text-center font-normal truncate">
          Timeline and Blink functions are derived from SPHEREx semestral data.
        </div>

        {/* Custom Apple-like Scrubber Slider */}
        <div className="relative w-full flex items-center group">
          <input
            type="range"
            min={0}
            max={100}
            value={timelineValue}
            onChange={(e) => onTimelineChange(Number(e.target.value))}
            aria-label="Línea de tiempo semestral SPHEREx"
            className="w-full h-1.5 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            style={{
              background: `linear-gradient(to right, #22D3EE ${timelineValue}%, #1F2430 ${timelineValue}%)`,
            }}
          />
        </div>

        {/* Semestral Date Milestones */}
        <div className="flex justify-between items-center text-[10px] font-mono text-neutral-400 pt-0.5">
          <span>May 2025</span>
          <span className="text-cyan-300 font-semibold">May 2025</span>
          <span>Dec 2025</span>
        </div>
      </div>

      {/* Right: Blink Switch & Difference Mode T2-T1 Switch */}
      <div className="flex items-center gap-5 shrink-0 pl-2">
        {/* Blink Toggle */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-neutral-300 font-medium">Blink</span>
          <button
            type="button"
            onClick={onToggleBlink}
            role="switch"
            aria-checked={isBlinkActive}
            aria-label="Activar modo Blink"
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
              isBlinkActive ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'bg-[#1E2332]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${
                isBlinkActive ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Difference Mode T2-T1 Toggle */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs text-neutral-300 font-medium whitespace-nowrap">
            Difference Mode T2-T1
          </span>
          <button
            type="button"
            onClick={onToggleDiffMode}
            role="switch"
            aria-checked={isDiffMode}
            aria-label="Activar modo de diferencia T2-T1"
            className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
              isDiffMode ? 'bg-cyan-500 shadow-[0_0_8px_rgba(34,211,238,0.4)]' : 'bg-[#1E2332]'
            }`}
          >
            <span
              className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-200 ease-out ${
                isDiffMode ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>
    </footer>
  );
}
