import { useMemo, useState } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Download, FileSpreadsheet, Info, Maximize2, RotateCcw, Sparkles } from 'lucide-react';
import { MOLECULAR_PRESETS } from '../data/spherexCatalog';
import type {
  FloatingModuleVisibility,
  LayoutViewMode,
  MolecularLensId,
  OnTheFlyFieldSource,
  SpectralChannel,
  TargetCatalogEntry,
  ViewMode,
} from '../types/spherex';
import {
  type WcsDetectionRow,
  calculateAstrometricLinearFit,
} from '../utils/astrometryEngine';
import { summarize6DetectorArrays } from '../utils/urlState';

interface SpectralTelemetryModuleProps {
  target: TargetCatalogEntry;
  activeOnTheFlySource?: OnTheFlyFieldSource | null;
  detections?: WcsDetectionRow[];
  lens: MolecularLensId;
  mode: ViewMode;
  layoutView: LayoutViewMode;
  visibility: FloatingModuleVisibility;
  shareUrl: string;
  onOpenDossier?: () => void;
  onOpenSixDetectors?: () => void;
  onClearOnTheFlySource?: () => void;
  onChangeLens: (lens: MolecularLensId) => void;
  onToggleVisibility: (key: keyof FloatingModuleVisibility) => void;
  onExportReport: (format: 'md' | 'json') => void;
}

const COMPACT_MOLECULES: Array<{ id: MolecularLensId; label: string }> = [
  { id: 'h2o', label: 'H₂O' },
  { id: 'ch4', label: 'CH₄' },
  { id: 'co2', label: 'CO₂' },
  { id: 'nh3', label: 'NH₃' },
];

export function SpectralTelemetryModule({
  target,
  activeOnTheFlySource = null,
  detections = [],
  lens,
  mode,
  visibility,
  onOpenDossier,
  onOpenSixDetectors,
  onClearOnTheFlySource,
  onChangeLens,
  onExportReport,
}: SpectralTelemetryModuleProps) {
  const [spectralToggle, setSpectralToggle] = useState(true);
  const [showDrawerInfo, setShowDrawerInfo] = useState(false);

  const activeSpectrum = activeOnTheFlySource
    ? activeOnTheFlySource.spectrum102
    : target.spectrum102;

  const activePreset = useMemo(
    () => MOLECULAR_PRESETS.find((p) => p.id === lens) ?? MOLECULAR_PRESETS[0],
    [lens],
  );

  const filteredData = useMemo(() => {
    const [minUm, maxUm] = activePreset.bandRangeUm;
    return activeSpectrum.filter(
      (ch) => ch.wavelengthUm >= minUm && ch.wavelengthUm <= maxUm,
    );
  }, [activePreset.bandRangeUm, activeSpectrum]);

  const detectorSummaries = useMemo(
    () => summarize6DetectorArrays(activeSpectrum),
    [activeSpectrum],
  );

  const fit = useMemo(
    () => (detections.length >= 2 ? calculateAstrometricLinearFit(detections, target) : null),
    [detections, target],
  );

  // Exact seafoam-teal curve color from reference (#52B79A)
  const curveColor = mode === 'diff' ? '#F43F5E' : '#52B79A';
  const dataKeyName =
    mode === 'diff' ? 'fluxDiff' : mode === 'sum' ? 'fluxSum' : 'fluxT2';

  const anyVisible =
    visibility.spectra || visibility.aiInsights || visibility.metadata || visibility.shareUrl;
  if (!anyVisible) return null;

  return (
    <aside className="w-[335px] hud-card rounded-2xl shadow-2xl flex flex-col max-h-[calc(100vh-145px)] overflow-hidden animate-panel-enter select-none">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/[0.07] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] font-medium text-[#ECEEF2] tracking-tight">
            Telemetry Drawer
          </span>
          <button
            type="button"
            onClick={() => setShowDrawerInfo((p) => !p)}
            title="Información del Telemetry Drawer"
            className="text-[#8E94A0] hover:text-white transition-colors"
          >
            <Info className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {onOpenDossier && (
            <button
              type="button"
              onClick={onOpenDossier}
              title="Abrir Expediente de Candidato y Bitácora a pantalla completa"
              className="px-2 py-1 rounded-lg bg-[#242832] hover:bg-[#2E3340] border border-white/10 text-[10px] font-mono text-[#ECEEF2] flex items-center gap-1 transition-colors"
            >
              <Maximize2 className="w-3 h-3 text-[#52B79A]" />
              <span>Expediente</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => onExportReport('md')}
            title="Descargar Ficha Rápida (.md)"
            className="text-[11px] font-mono text-[#8E94A0] hover:text-white flex items-center gap-1 transition-colors"
          >
            <Download className="w-3 h-3" />
          </button>
        </div>
      </div>

      {showDrawerInfo && (
        <div className="p-3 bg-[#15171C] border-b border-white/[0.07] text-[10px] text-[#C8CDD6] leading-relaxed font-sans shrink-0">
          <strong>Telemetry Drawer:</strong> Inspección espectral de 102 canales LVF (0.75–5.00 μm),
          generación de espectros sobre la marcha al hacer clic en cualquier fuente del visor,
          y descripción por IA de los datos wavelength.
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5">
        {/* On-the-fly active source badge */}
        {activeOnTheFlySource && (
          <div className="hud-subcard rounded-xl p-2.5 border border-[#52B79A]/40 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1 text-[10px] font-mono text-[#52B79A] font-semibold">
                <Sparkles className="w-3 h-3 shrink-0" />
                <span className="truncate">ESPECTRO AL VUELO (102B)</span>
              </div>
              <div className="text-[11px] text-white font-medium truncate">
                {activeOnTheFlySource.designation}
              </div>
              <div className="text-[10px] font-mono text-[#8E94A0]">
                RA {activeOnTheFlySource.raDeg.toFixed(4)}° • Dec{' '}
                {activeOnTheFlySource.decDeg.toFixed(4)}°
              </div>
            </div>
            {onClearOnTheFlySource && (
              <button
                type="button"
                onClick={onClearOnTheFlySource}
                title="Volver al objetivo principal"
                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-mono text-white flex items-center gap-1 shrink-0"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Base</span>
              </button>
            )}
          </div>
        )}

        {/* 1. Spectral Analysis */}
        {visibility.spectra && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-[#ECEEF2]">Spectral Analysis</span>
              <span className="text-[10px] font-mono text-[#8E94A0]">
                {mode === 'sum'
                  ? 'Suma T₁+T₂ (102B)'
                  : mode === 'diff'
                    ? 'Resta T₂−T₁ (102B)'
                    : '102 Bandas (LVF 1-6)'}
              </span>
            </div>

            <div className="hud-subcard rounded-xl p-2.5 space-y-2">
              <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredData}
                    margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="drawerSpecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={curveColor} stopOpacity={0.28} />
                        <stop offset="95%" stopColor={curveColor} stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="2 2" />
                    <XAxis
                      dataKey="wavelengthUm"
                      type="number"
                      domain={activePreset.bandRangeUm}
                      tick={{ fill: '#8E94A0', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                      tickFormatter={(v: number) => `${v.toFixed(1)}`}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <YAxis
                      tick={{ fill: '#8E94A0', fontSize: 9, fontFamily: 'JetBrains Mono' }}
                      stroke="rgba(255,255,255,0.1)"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload as SpectralChannel;
                        return (
                          <div className="bg-[#181A20]/95 border border-white/15 px-2 py-1 rounded text-[10px] font-mono text-[#ECEEF2]">
                            <div>
                              {d.wavelengthUm.toFixed(2)} μm ({d.lvfBand})
                            </div>
                            <div className="text-[#52B79A]">
                              Flujo:{' '}
                              {mode === 'diff'
                                ? d.fluxDiff.toFixed(3)
                                : mode === 'sum'
                                  ? d.fluxSum.toFixed(3)
                                  : d.fluxT2.toFixed(3)}
                            </div>
                          </div>
                        );
                      }}
                    />
                    {activePreset.highlightBands.map((b) => (
                      <ReferenceArea
                        key={b.name}
                        x1={b.x1}
                        x2={b.x2}
                        fill="rgba(82, 183, 154, 0.08)"
                        strokeOpacity={0}
                      />
                    ))}
                    <Area
                      type="monotone"
                      dataKey={dataKeyName}
                      stroke={curveColor}
                      strokeWidth={1.6}
                      fill="url(#drawerSpecGrad)"
                      isAnimationActive={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="text-center text-[9px] font-mono text-[#8E94A0]">
                Wavelength (μm) • 0.75 – 5.00
              </div>

              {/* Molecular Filter Pills */}
              <div className="flex items-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => onChangeLens('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                    lens === 'all'
                      ? 'bg-white/15 text-white border border-white/25 font-semibold'
                      : 'bg-white/[0.04] text-[#8E94A0] hover:text-white border border-transparent'
                  }`}
                >
                  ALL
                </button>
                {COMPACT_MOLECULES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => onChangeLens(lens === m.id ? 'all' : m.id)}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono transition-colors ${
                      lens === m.id
                        ? 'bg-[#52B79A]/20 text-white border border-[#52B79A]/45 font-semibold'
                        : 'bg-white/[0.04] text-[#8E94A0] hover:text-white border border-transparent'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Compact 6 Detector Arrays Co-Added SNR Strip */}
              <div className="pt-1.5 border-t border-white/[0.06] space-y-1">
                <div className="flex items-center justify-between text-[9px] font-mono text-[#8E94A0]">
                  <span>Suma 6 Detectores (SNR ×4.12):</span>
                  {onOpenSixDetectors && (
                    <button
                      type="button"
                      onClick={onOpenSixDetectors}
                      className="text-[#52B79A] hover:underline"
                    >
                      Expandir 6 LVF →
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-6 gap-1 text-[9px] font-mono">
                  {detectorSummaries.map((det) => (
                    <div
                      key={det.band}
                      className="rounded bg-[#181A20] border border-white/[0.06] py-1 text-center"
                      title={`${det.band}: Σ=${det.sumFluxT2} | SNR=${det.coaddedSnr}`}
                    >
                      <div className="text-[#8E94A0]">{det.band.replace('LVF-', 'D')}</div>
                      <div className="text-[#52B79A] font-semibold">{det.sumFluxT2.toFixed(1)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. AI Insights (Wavelength AI Description) */}
        {visibility.aiInsights && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#ECEEF2]">AI Insights</div>

            <div className="hud-subcard rounded-xl p-3 space-y-2.5">
              {/* Top toggle row */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#ECEEF2]">
                  Spectral Analysis (Wavelength IA)
                </span>
                <button
                  type="button"
                  onClick={() => setSpectralToggle((p) => !p)}
                  className={`w-7 h-4 rounded-full flex items-center p-0.5 transition-colors ${
                    spectralToggle ? 'bg-[#5C7CFA] justify-end' : 'bg-[#383C47] justify-start'
                  }`}
                >
                  <span className="w-3 h-3 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] text-[#8E94A0]">Spectral</div>
                <div className="text-[11px] text-[#ECEEF2] mt-0.5 leading-snug">
                  {spectralToggle
                    ? activeOnTheFlySource
                      ? activeOnTheFlySource.aiSummary
                      : target.aiSummary
                    : activeOnTheFlySource
                      ? `${activeOnTheFlySource.sourceClass} (${activeOnTheFlySource.spectralType})`
                      : `${target.category} (${target.spectralType})`}
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between">
                <div>
                  <div className="text-[10px] text-[#8E94A0]">Date (Cadencia SPHEREx)</div>
                  <div className="text-[11px] font-mono text-[#ECEEF2] mt-0.5">
                    May – Dec, 2025 ({detections.length || 4} épocas)
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[#8E94A0]">Ajuste Lineal</div>
                  <div className="text-[11px] font-mono text-[#52B79A] mt-0.5">
                    {(activeOnTheFlySource
                      ? activeOnTheFlySource.pmArcsecYr
                      : fit?.velocityArcsecYr ?? target.velocityArcsecYr
                    ).toFixed(2)}
                    &quot;/yr
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-white/[0.06]">
                <div className="text-[10px] text-[#8E94A0]">Clasificación Orientativa</div>
                <div className="text-[11px] text-[#ECEEF2] mt-0.5">
                  {activeOnTheFlySource
                    ? `${activeOnTheFlySource.sourceClass} • Confianza ${activeOnTheFlySource.aiConfidencePct}%`
                    : `${fit?.classification.badgeText ?? target.category} • Confianza ${target.aiConfidencePct}%`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Metadata / Contamination Flags */}
        {visibility.metadata && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-[#ECEEF2]">Metadata/Contamination Flags</div>

            <div className="hud-subcard rounded-xl p-3 space-y-1.5 font-mono text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#8E94A0]">Artifact Flag:</span>
                <span className="text-[#ECEEF2]">{target.contamination.artifact}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E94A0]">Star Light Saturation:</span>
                <span className="text-[#ECEEF2]">{target.contamination.saturation}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E94A0]">Zodiacal Background:</span>
                <span className="text-[#ECEEF2]">{target.contamination.zodiacalBg}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#8E94A0]">Cosmic Ray HDU:</span>
                <span className="text-[#ECEEF2]">{target.contamination.cosmicRay}</span>
              </div>
            </div>
          </div>
        )}

        {/* Direct CTA to Open the Full-Screen Candidate Dossier */}
        {onOpenDossier && (
          <button
            type="button"
            onClick={onOpenDossier}
            className="w-full py-2 px-3 rounded-xl bg-[#232732] hover:bg-[#2C313F] border border-white/10 text-xs font-mono text-[#ECEEF2] flex items-center justify-center gap-2 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#52B79A]" />
            <span>Abrir Expediente MPC &amp; Bitácora</span>
          </button>
        )}
      </div>
    </aside>
  );
}
