import { Info, Play, Search, X } from 'lucide-react';
import type { MotionFilterQuery, TargetCatalogEntry } from '../types/spherex';
import { filterTargetsByMotion } from '../utils/urlState';

interface MotionFiltersDeckProps {
  isOpen: boolean;
  filter: MotionFilterQuery;
  allTargets: TargetCatalogEntry[];
  onChangeFilter: (next: MotionFilterQuery) => void;
  onSelectTarget: (target: TargetCatalogEntry) => void;
  onClose: () => void;
}

export function MotionFiltersDeck({
  isOpen,
  filter,
  allTargets,
  onChangeFilter,
  onSelectTarget,
  onClose,
}: MotionFiltersDeckProps) {
  if (!isOpen) return null;

  const matchingTargets = filterTargetsByMotion(
    allTargets,
    filter.minVelocityArcsecYr,
    filter.minBrightnessChangeMag,
  );

  return (
    <div className="flex items-start gap-1.5 animate-panel-enter">
      {/* Mini Icon Strip */}
      <div className="hud-card rounded-xl p-1.5 flex flex-col items-center gap-1.5 text-slate-300 shadow-md">
        <div className="p-1 rounded bg-white/10 text-white">
          <Search className="w-3.5 h-3.5" />
        </div>
        <div className="p-1 text-slate-400">
          <Play className="w-3 h-3" />
        </div>
      </div>

      {/* Main [Deck] Motion Filters Card */}
      <div className="hud-card rounded-xl p-3.5 w-[265px] shadow-xl space-y-2.5">
        <div className="flex items-center justify-between border-b border-white/[0.08] pb-1.5">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono font-medium text-slate-100">
              [Deck] Motion Filters
            </span>
            <div
              className="text-slate-400 hover:text-slate-200 cursor-help"
              title="Aislar objetos que cambiaron de posición o brillo entre semestres"
            >
              <Info className="w-3 h-3" />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-0.5"
            aria-label="Cerrar filtros de movimiento"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <p className="text-[10px] text-slate-400 leading-tight">
          Cribado cinemático para detectar asteroides, enanas marrones y variables.
        </p>

        {/* Velocity Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
            <span>Velocity (arcsec/yr):</span>
            <span className="text-white">[{filter.minVelocityArcsecYr.toFixed(1)} - 10.5]</span>
          </div>
          <input
            type="range"
            min={0.5}
            max={10.5}
            step={0.5}
            value={filter.minVelocityArcsecYr}
            onChange={(e) =>
              onChangeFilter({ ...filter, minVelocityArcsecYr: Number(e.target.value) })
            }
            className="w-full h-1 rounded-lg bg-slate-800 accent-white cursor-pointer"
          />
        </div>

        {/* Brightness Change Slider */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
            <span>Brightness Change (mag):</span>
            <span className="text-white">[{filter.minBrightnessChangeMag.toFixed(1)} - 5.0]</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={5.0}
            step={0.1}
            value={filter.minBrightnessChangeMag}
            onChange={(e) =>
              onChangeFilter({ ...filter, minBrightnessChangeMag: Number(e.target.value) })
            }
            className="w-full h-1 rounded-lg bg-slate-800 accent-white cursor-pointer"
          />
        </div>

        <button
          type="button"
          onClick={() => onChangeFilter({ ...filter, active: !filter.active })}
          className={`w-full py-1.5 rounded-lg font-mono text-xs font-medium border transition-colors ${
            filter.active
              ? 'bg-white/20 border-white/40 text-white shadow-sm'
              : 'bg-black/30 border-white/10 text-slate-300 hover:text-white'
          }`}
        >
          {filter.active ? `[Query Active: ${matchingTargets.length}]` : '[Run Query]'}
        </button>

        {filter.active && (
          <div className="pt-1.5 border-t border-white/[0.08] flex flex-wrap gap-1">
            {matchingTargets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => onSelectTarget(t)}
                className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 border border-white/10 text-[10px] font-mono text-slate-200"
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
