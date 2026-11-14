import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ChevronDown, ChevronUp, Sparkles, ShieldCheck } from 'lucide-react';
import type { TargetData } from '../types';

interface TelemetryDrawerProps {
  target: TargetData;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function TelemetryDrawer({
  target,
  isOpen,
  onToggleOpen,
}: TelemetryDrawerProps) {
  const [selectedMolecule, setSelectedMolecule] = useState<string | null>(null);
  const [isAiExpanded, setIsAiExpanded] = useState(true);
  const [isFlagsExpanded, setIsFlagsExpanded] = useState(true);

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={onToggleOpen}
        aria-label="Abrir panel de telemetría"
        className="fixed top-16 right-4 z-30 p-2.5 rounded-xl bg-[#0D1017]/90 border border-white/10 hover:border-cyan-400 text-neutral-300 hover:text-white backdrop-blur-xl shadow-xl flex items-center gap-1.5 text-xs font-mono"
      >
        <ChevronDown className="w-4 h-4 rotate-90 text-cyan-400" />
        <span>Telemetry Drawer</span>
      </button>
    );
  }

  return (
    <aside className="w-80 md:w-96 h-full bg-[#080A0F]/95 border-l border-white/[0.08] backdrop-blur-2xl flex flex-col z-30 select-none shrink-0 shadow-[-10px_0_30px_rgba(0,0,0,0.7)] animate-in slide-in-from-right duration-300">
      {/* Header Bar matching Image 1 & 2 */}
      <div className="h-12 px-4 border-b border-white/[0.08] flex items-center justify-between gap-3 bg-[#0D1017]/50">
        <span className="text-xs font-semibold tracking-wider uppercase text-neutral-300">
          Telemetry Drawer
        </span>
        <button
          type="button"
          onClick={onToggleOpen}
          aria-label="Minimizar panel de telemetría"
          className="p-1 text-neutral-400 hover:text-white transition-colors"
        >
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>

      {/* Subheader: Object Analysis */}
      <div className="px-4 py-3 border-b border-white/[0.06] bg-black/30">
        <h2 className="text-sm font-semibold text-white tracking-tight">
          Object Analysis: {target.name}
          {target.classification ? (
            <span className="text-neutral-400 font-normal text-xs ml-1">
              ({target.classification})
            </span>
          ) : null}
        </h2>
      </div>

      {/* Main Drawer Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* CARD 1: Spectral Analysis (102 Bands) */}
        <section className="bg-[#0E121C]/80 border border-white/[0.08] rounded-xl p-3.5 backdrop-blur-md shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-neutral-200">
              Spectral Analysis (102 Bands)
            </span>
            <span className="text-[10px] font-mono text-cyan-400/90 bg-cyan-950/40 border border-cyan-800/40 px-1.5 py-0.5 rounded">
              Recharts
            </span>
          </div>

          {/* Molecular Filter Badges matching screenshot: CH4, H2O, H2O, CO2 */}
          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedMolecule(selectedMolecule === 'CH4' ? null : 'CH4')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                selectedMolecule === 'CH4'
                  ? 'bg-slate-300 text-black shadow-sm'
                  : 'bg-slate-800/80 border border-slate-700/60 text-slate-300 hover:bg-slate-700'
              }`}
            >
              CH4
            </button>
            <button
              type="button"
              onClick={() => setSelectedMolecule(selectedMolecule === 'H2O' ? null : 'H2O')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                selectedMolecule === 'H2O'
                  ? 'bg-blue-400 text-black shadow-sm'
                  : 'bg-blue-950/70 border border-blue-800/50 text-blue-300 hover:bg-blue-900'
              }`}
            >
              H2O
            </button>
            <button
              type="button"
              onClick={() => setSelectedMolecule(selectedMolecule === 'H2O_2' ? null : 'H2O_2')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                selectedMolecule === 'H2O_2'
                  ? 'bg-cyan-400 text-black shadow-sm'
                  : 'bg-cyan-950/70 border border-cyan-800/50 text-cyan-300 hover:bg-cyan-900'
              }`}
            >
              H2O
            </button>
            <button
              type="button"
              onClick={() => setSelectedMolecule(selectedMolecule === 'CO2' ? null : 'CO2')}
              className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium transition-all ${
                selectedMolecule === 'CO2'
                  ? 'bg-amber-400 text-black shadow-sm'
                  : 'bg-amber-950/70 border border-amber-800/50 text-amber-300 hover:bg-amber-900'
              }`}
            >
              CO2
            </button>
          </div>

          {/* Golden Recharts Line Chart with vertical bands */}
          <div className="h-44 w-full bg-[#05070B] border border-white/[0.06] rounded-lg pt-2 pr-2 pb-0.5 shadow-inner">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={target.spectrum}
                margin={{ top: 8, right: 6, left: -20, bottom: 2 }}
              >
                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="2 2" />
                <XAxis
                  dataKey="wavelength"
                  type="number"
                  domain={[0.75, 5.0]}
                  ticks={[0.75, 2.0, 3.5, 5.0]}
                  tick={{ fill: '#737373', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  tickFormatter={(val: number) => val.toFixed(2)}
                  stroke="rgba(255,255,255,0.08)"
                />
                <YAxis
                  domain={[0, 1]}
                  ticks={[0, 0.5, 1]}
                  tick={{ fill: '#737373', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                  stroke="rgba(255,255,255,0.08)"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload as { wavelength: number; flux: number };
                    return (
                      <div className="bg-black/90 border border-white/20 px-2 py-1 rounded text-[10px] font-mono text-neutral-200">
                        <span className="text-amber-300">{d.wavelength.toFixed(3)} μm</span>: {d.flux.toFixed(3)}
                      </div>
                    );
                  }}
                />

                {/* Shaded Molecular Absorption Bands (CH4, H2O, CO2) */}
                <ReferenceArea x1={1.3} x2={1.5} fill="rgba(59, 130, 246, 0.12)" strokeOpacity={0} />
                <ReferenceArea x1={1.6} x2={1.75} fill="rgba(148, 163, 184, 0.12)" strokeOpacity={0} />
                <ReferenceArea x1={1.8} x2={2.05} fill="rgba(34, 211, 238, 0.12)" strokeOpacity={0} />
                <ReferenceArea x1={4.15} x2={4.4} fill="rgba(245, 158, 11, 0.14)" strokeOpacity={0} />

                {/* Golden Spectral Line */}
                <Line
                  type="monotone"
                  dataKey="flux"
                  stroke="#F59E0B"
                  strokeWidth={1.8}
                  dot={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] font-mono text-center text-neutral-400">
            Wavelength (μm)
          </div>
        </section>

        {/* CARD 2: AI Molecular Insights matching screenshot */}
        <section className="bg-[#0E121C]/80 border border-white/[0.08] rounded-xl p-3.5 backdrop-blur-md shadow-lg space-y-2.5">
          <button
            type="button"
            onClick={() => setIsAiExpanded(!isAiExpanded)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-xs font-semibold text-neutral-200">
                AI Molecular Insights
              </span>
            </div>
            {isAiExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isAiExpanded && (
            <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-400/35 text-xs text-cyan-200 leading-relaxed shadow-[0_0_15px_rgba(34,211,238,0.08)]">
              {target.aiInsightText}
            </div>
          )}
        </section>

        {/* CARD 3: Metadata & Contamination Flags matching screenshot */}
        <section className="bg-[#0E121C]/80 border border-white/[0.08] rounded-xl p-3.5 backdrop-blur-md shadow-lg space-y-2.5">
          <button
            type="button"
            onClick={() => setIsFlagsExpanded(!isFlagsExpanded)}
            className="w-full flex items-center justify-between text-left"
          >
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-xs font-semibold text-neutral-200">
                Metadata &amp; Contamination Flags
              </span>
            </div>
            {isFlagsExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-neutral-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-neutral-400" />
            )}
          </button>

          {isFlagsExpanded && (
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/[0.05]">
                <span className="text-neutral-400">Artifact Flag:</span>
                <span className="text-emerald-400 font-medium">
                  {target.artifactFlag}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-black/40 border border-white/[0.05]">
                <span className="text-neutral-400">Star Light Contamination:</span>
                <span className="text-emerald-300 font-medium">
                  {target.contaminationLevel}
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </aside>
  );
}
