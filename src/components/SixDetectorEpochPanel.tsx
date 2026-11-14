import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Check,
  Cpu,
  GripHorizontal,
  Maximize2,
  Minimize2,
  Sparkles,
  TrendingUp,
  X,
} from 'lucide-react';
import type {
  DetectorArraySummary,
  LvfDetectorBand,
  TargetCatalogEntry,
  ViewMode,
} from '../types/spherex';
import { summarize6DetectorArrays } from '../utils/urlState';

interface SixDetectorEpochPanelProps {
  target: TargetCatalogEntry;
  fov?: number;
  mode: ViewMode;
  filterWheel?: unknown;
  isMaximized?: boolean;
  onToggleMaximize?: () => void;
  onChangeMode: (mode: ViewMode) => void;
  onCloseSplit: () => void;
}

export function SixDetectorEpochPanel({
  target,
  mode,
  isMaximized = false,
  onToggleMaximize,
  onChangeMode,
  onCloseSplit,
}: SixDetectorEpochPanelProps) {
  const detectorArrays = useMemo(
    () => summarize6DetectorArrays(target.spectrum102),
    [target.spectrum102],
  );

  const [selectedDetector, setSelectedDetector] = useState<LvfDetectorBand>('LVF-4');

  const activeDetectorSummary = useMemo(
    () => detectorArrays.find((d) => d.band === selectedDetector) ?? detectorArrays[0],
    [detectorArrays, selectedDetector],
  );

  const activeDetectorChannels = useMemo(
    () => target.spectrum102.filter((ch) => ch.lvfBand === selectedDetector),
    [selectedDetector, target.spectrum102],
  );

  const ep1 = target.epochs[0];
  const ep2 = target.epochs[1] ?? target.epochs[0];

  return (
    <section
      aria-label="6 Detectores LVF y Comparador Multi-Época"
      className="w-full h-full hud-card-elevated rounded-2xl shadow-2xl text-[#ECEEF2] flex flex-col overflow-hidden select-none border border-white/[0.10]"
    >
      {/* DRAG / DRAWER HEADER PILL (Estilo exacto Telemetry Drawer) */}
      <div className="px-4 pt-2 pb-1 border-b border-white/[0.05] flex items-center justify-between text-[9px] font-mono text-[#8E94A0] uppercase tracking-widest bg-[#17181D]/80">
        <span className="flex items-center gap-1.5">
          <GripHorizontal className="w-3 h-3 text-[#52B79A]" />
          <span>::: 6 Detectores LVF &amp; Comparador Multi-Época</span>
        </span>
        <span className="text-[#52B79A] font-semibold">{target.name}</span>
      </div>

      {/* SUB-BARRA DE TELEMETRÍA (Concisa, grafito puro neutral, sin solapamientos) */}
      <div className="px-4 py-2 bg-[#17181D]/90 backdrop-blur-md border-b border-white/[0.07] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono min-w-0">
          <span className="flex items-center gap-1.5 text-white font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#52B79A]" />
            <span>{target.name}</span>
          </span>
          <span className="text-[#686B75] hidden sm:inline">•</span>
          <span className="text-[#52B79A] text-[11px] truncate hidden sm:inline">
            102 Bandas NIR
          </span>
          <span className="text-[#686B75] hidden md:inline">•</span>
          <span className="text-[#ECEEF2] text-[11px] truncate hidden md:inline">
            SNR Co-Adición ×4.12
          </span>
        </div>

        {/* Acciones de ventana */}
        <div className="flex items-center gap-1.5 shrink-0">
          {onToggleMaximize && (
            <button
              type="button"
              onClick={onToggleMaximize}
              className="px-2.5 py-1 rounded-lg bg-[#222328] hover:bg-[#2B2D33] text-xs font-mono text-[#C8CDD6] hover:text-white transition-all flex items-center gap-1.5 border border-white/[0.08]"
              title={isMaximized ? 'Volver a vista dividida' : 'Expandir a pantalla completa'}
            >
              {isMaximized ? (
                <Minimize2 className="w-3.5 h-3.5 text-[#5C7CFA]" />
              ) : (
                <Maximize2 className="w-3.5 h-3.5 text-[#52B79A]" />
              )}
              <span>{isMaximized ? 'Dividida' : 'Completa'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={onCloseSplit}
            className="px-2 py-1 rounded-lg bg-[#222328] hover:bg-[#2B2D33] text-xs font-mono text-[#C8CDD6] hover:text-white transition-all flex items-center gap-1 border border-white/[0.08]"
            title="Cerrar panel y volver al Visor Celeste"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cerrar</span>
          </button>
        </div>
      </div>

      {/* CONTENIDO FLUIDO Y ORGANIZADO */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        
        {/* PARTE 1: SELECTOR DE LOS 6 DETECTORES LVF (0.75-5.00 μm) */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#52B79A]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                1. Co-Adición LVF-1..6 (0.75–5.00 μm)
              </h2>
            </div>
            <div className="text-[11px] font-mono text-[#8E94A0] flex items-center gap-1.5">
              <span>Ganancia teórica:</span>
              <span className="text-[#52B79A] font-semibold bg-[#52B79A]/15 px-2 py-0.5 rounded border border-[#52B79A]/30">
                SNR ×4.12 (√17 bandas)
              </span>
            </div>
          </div>

          {/* 6 Detectores en layout espacioso que nunca trunca texto */}
          <div
            className={`grid gap-2.5 ${
              isMaximized
                ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
                : 'grid-cols-2 sm:grid-cols-3'
            }`}
          >
            {detectorArrays.map((det: DetectorArraySummary) => {
              const isSelected = det.band === selectedDetector;
              return (
                <button
                  key={det.band}
                  type="button"
                  onClick={() => setSelectedDetector(det.band)}
                  className={`text-left p-3 rounded-xl transition-all flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-[#1F2026] border-[#52B79A]/60 shadow-lg'
                      : 'bg-[#15161A] border-white/[0.06] hover:border-white/[0.14] hover:bg-[#1A1B20]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 border-b border-white/[0.04] pb-1">
                    <span className="text-xs font-mono font-bold text-white tracking-wide shrink-0">
                      {det.band}
                    </span>
                    <span className="text-[10px] font-mono text-[#52B79A] font-semibold">
                      {det.wavelengthRangeUm[0].toFixed(2)}–{det.wavelengthRangeUm[1].toFixed(2)} μm
                    </span>
                  </div>

                  {/* Barra de intensidad */}
                  <div className="w-full h-1.5 rounded-full bg-[#0D0E11] overflow-hidden my-2 border border-white/[0.04]">
                    <div
                      className="h-full rounded-full transition-all duration-300"
                      style={{
                        width: `${Math.min(100, Math.max(16, det.meanFluxT2 * 85))}%`,
                        background: isSelected
                          ? 'linear-gradient(90deg, #52B79A, #5C7CFA)'
                          : '#52B79A',
                      }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[10px] font-mono text-[#C8CDD6]">
                    <span>Σ {det.sumFluxT2.toFixed(1)}</span>
                    <span className="text-[#52B79A] font-medium">SNR {det.coaddedSnr}</span>
                  </div>
                  <div className="text-[9px] text-[#8E94A0] truncate mt-1">
                    {det.keyMolecules}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Telemetría y curva del detector activo (Grafito neutro) */}
          <div className="bg-[#17181D]/80 rounded-xl p-3.5 border border-white/[0.06] space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="text-white font-semibold">{activeDetectorSummary.band}:</span>
                <span className="text-[#C8CDD6]">
                  17 Canales (#
                  {activeDetectorSummary.channelRange[0]} al #{activeDetectorSummary.channelRange[1]})
                </span>
                <span className="text-[#8E94A0]">
                  • {activeDetectorSummary.wavelengthRangeUm[0]}–{activeDetectorSummary.wavelengthRangeUm[1]} μm
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8E94A0]">Canal único: {activeDetectorSummary.singleChannelSnr}</span>
                <span className="text-[#52B79A] font-semibold">
                  Co-Adicionado: {activeDetectorSummary.coaddedSnr} (×4.12)
                </span>
              </div>
            </div>

            {/* Gráfico espectral con curva verde esmeralda */}
            <div className="h-28 w-full pt-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={activeDetectorChannels}
                  margin={{ top: 4, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="activeDetGradNeutral" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#52B79A" stopOpacity={0.32} />
                      <stop offset="95%" stopColor="#52B79A" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                  <XAxis
                    dataKey="wavelengthUm"
                    tick={{ fill: '#8E94A0', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    tickFormatter={(v: number) => `${v.toFixed(2)}μm`}
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <YAxis
                    tick={{ fill: '#8E94A0', fontSize: 10, fontFamily: 'JetBrains Mono' }}
                    stroke="rgba(255,255,255,0.08)"
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const ch = payload[0].payload;
                      return (
                        <div className="bg-[#191A20] border border-white/15 px-3 py-2 rounded-lg text-xs font-mono text-white shadow-2xl">
                          <div className="text-[#52B79A] font-semibold">
                            Canal #{ch.channel} — {ch.wavelengthUm} μm
                          </div>
                          <div className="text-[#C8CDD6] mt-0.5">
                            Flujo T₁: {ch.fluxT1} • T₂: {ch.fluxT2}
                          </div>
                          <div className="text-[#8E94A0] text-[10px]">
                            Suma: {ch.fluxSum} | Resta: {ch.fluxDiff}
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey={mode === 'diff' ? 'fluxDiff' : mode === 'sum' ? 'fluxSum' : 'fluxT2'}
                    stroke={mode === 'diff' ? '#F43F5E' : mode === 'sum' ? '#5C7CFA' : '#52B79A'}
                    strokeWidth={2}
                    fill="url(#activeDetGradNeutral)"
                    isAnimationActive={false}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* PARTE 2: COMPARADOR TEMPORAL T1..T4 */}
        <div className="space-y-2.5 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-1.5">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#5C7CFA]" />
              <h2 className="text-xs font-semibold uppercase tracking-wider text-white">
                2. Comparador Temporal Multi-Época
              </h2>
            </div>
            <div className="text-[11px] font-mono text-[#8E94A0]">
              Mov. Propio: <strong className="text-white">{target.velocityArcsecYr.toFixed(2)}&quot;/año</strong> • Variabilidad: <strong className="text-white">Δmag {target.brightnessChangeMag.toFixed(2)}</strong>
            </div>
          </div>

          {/* 4 Modos directos */}
          <div
            className={`grid gap-2.5 ${
              isMaximized ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2'
            }`}
          >
            {/* T1 */}
            <button
              type="button"
              onClick={() => onChangeMode('normal')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                mode === 'normal'
                  ? 'bg-[#1F2026] border-[#52B79A]/60 shadow-lg'
                  : 'bg-[#15161A] border-white/[0.06] hover:border-white/[0.14] hover:bg-[#1A1B20]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">Época T₁ ({ep1.dateLabel})</span>
                {mode === 'normal' && <Check className="w-3.5 h-3.5 text-[#52B79A]" />}
              </div>
              <div className="text-[10px] text-[#8E94A0]">
                Barrido semestral base de referencia astrométrica.
              </div>
              <div className="h-12 w-full rounded-lg bg-[#0D0E11] border border-white/[0.06] flex items-center justify-center relative">
                <div className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_#52B79A] border border-[#52B79A]" />
                <span className="absolute bottom-1 left-2 text-[9px] font-mono text-[#8E94A0]">
                  Base (0.00&quot;)
                </span>
              </div>
            </button>

            {/* T2 */}
            <button
              type="button"
              onClick={() => onChangeMode('blink')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                mode === 'blink'
                  ? 'bg-[#1F2026] border-[#52B79A]/60 shadow-lg'
                  : 'bg-[#15161A] border-white/[0.06] hover:border-white/[0.14] hover:bg-[#1A1B20]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">Época T₂ ({ep2.dateLabel})</span>
                {mode === 'blink' && <Check className="w-3.5 h-3.5 text-[#52B79A]" />}
              </div>
              <div className="text-[10px] text-[#8E94A0]">
                Segundo barrido (+6 meses) para detección por parpadeo.
              </div>
              <div className="h-12 w-full rounded-lg bg-[#0D0E11] border border-white/[0.06] flex items-center justify-center relative">
                <div
                  className="w-3 h-3 rounded-full bg-[#52B79A] shadow-[0_0_12px_#52B79A] border border-white"
                  style={{
                    transform: `translate(${Math.max(-12, Math.min(12, -ep2.raShiftArcsec * 3))}px, ${Math.max(-8, Math.min(8, -ep2.decShiftArcsec * 3))}px)`,
                  }}
                />
                <span className="absolute bottom-1 left-2 text-[9px] font-mono text-[#52B79A]">
                  Δr {Math.hypot(ep2.raShiftArcsec, ep2.decShiftArcsec).toFixed(2)}&quot; desplazado
                </span>
              </div>
            </button>

            {/* Resta */}
            <button
              type="button"
              onClick={() => onChangeMode('diff')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                mode === 'diff'
                  ? 'bg-[#1F2026] border-rose-500/60 shadow-lg'
                  : 'bg-[#15161A] border-white/[0.06] hover:border-white/[0.14] hover:bg-[#1A1B20]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">Resta (T₂ − T₁)</span>
                {mode === 'diff' && <Check className="w-3.5 h-3.5 text-rose-400" />}
              </div>
              <div className="text-[10px] text-[#8E94A0]">
                Cancela estrellas de fondo y resalta el dipolo en movimiento.
              </div>
              <div className="h-12 w-full rounded-lg bg-[#0D0E11] border border-white/[0.06] flex items-center justify-center gap-2 relative">
                <div className="w-2.5 h-2.5 rounded-full bg-rose-500/80 shadow-[0_0_8px_#F43F5E]" />
                <span className="text-[9px] font-mono text-[#8E94A0]">→</span>
                <div className="w-2.5 h-2.5 rounded-full bg-[#52B79A] shadow-[0_0_8px_#52B79A]" />
                <span className="absolute bottom-1 left-2 text-[9px] font-mono text-rose-300">
                  Dipolo Nítido
                </span>
              </div>
            </button>

            {/* Suma */}
            <button
              type="button"
              onClick={() => onChangeMode('sum')}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                mode === 'sum'
                  ? 'bg-[#1F2026] border-[#5C7CFA]/60 shadow-lg'
                  : 'bg-[#15161A] border-white/[0.06] hover:border-white/[0.14] hover:bg-[#1A1B20]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-bold text-white">Suma (T₁ + T₂)</span>
                {mode === 'sum' && <Check className="w-3.5 h-3.5 text-[#5C7CFA]" />}
              </div>
              <div className="text-[10px] text-[#8E94A0]">
                Co-adición inter-épocas para elevar el SNR por factor ×1.41.
              </div>
              <div className="h-12 w-full rounded-lg bg-[#0D0E11] border border-white/[0.06] flex items-center justify-center relative">
                <div className="w-3.5 h-3.5 rounded-full bg-[#5C7CFA]/50 border border-white shadow-[0_0_14px_#5C7CFA]" />
                <span className="absolute bottom-1 left-2 text-[9px] font-mono text-[#A5B4FC]">
                  SNR Boost (+41%)
                </span>
              </div>
            </button>
          </div>

          {/* Telemetría clave (Concisa, sin textos de más) */}
          <div className="pt-2 flex items-center justify-between text-[11px] font-mono text-[#8E94A0] border-t border-white/[0.04]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-[#52B79A] shrink-0" />
              <span>
                Filtro activo:{' '}
                <strong className="text-white">
                  {mode === 'diff'
                    ? 'Resta (T₂−T₁) aísla dipolos móviles de fondo estelar'
                    : mode === 'sum'
                      ? 'Suma (T₁+T₂) eleva detección en fuentes ultra-tenues'
                      : mode === 'blink'
                        ? 'Blink cinemático alternado'
                        : 'Referencia astrométrica base T₁'}
                </strong>
              </span>
            </div>
            <span className="text-[#52B79A]">Sincronizado con Visor</span>
          </div>
        </div>

      </div>
    </section>
  );
}
