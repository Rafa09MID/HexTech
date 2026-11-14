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
  Box,
  CheckCircle2,
  Clock,
  Compass,
  Download,
  FileCode2,
  FileSpreadsheet,
  Layers,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Table,
  Target,
  Trash2,
  X,
} from 'lucide-react';
import { MOLECULAR_PRESETS } from '../data/spherexCatalog';
import { SpectralAllSkyCubeViewer } from './SpectralAllSkyCubeViewer';
import type {
  DetectorArraySummary,
  MolecularLensId,
  TargetCatalogEntry,
  ViewMode,
} from '../types/spherex';
import {
  type CandidateConfidenceStatus,
  type WcsDetectionRow,
  calculateAstrometricLinearFit,
  generateAdesPsvContent,
  generateDetectionsCsvContent,
  getCatalogCrossMatchReport,
} from '../utils/astrometryEngine';
import { summarize6DetectorArrays } from '../utils/urlState';
import {
  type FilterWheelMode,
  buildHips2FitsCutoutUrl,
  fetchLiveSimbadVerification,
  type LiveSimbadMetadata,
} from '../services/astronomyApi';

interface CandidateDossierViewProps {
  target: TargetCatalogEntry;
  targets?: TargetCatalogEntry[];
  onSelectTarget?: (target: TargetCatalogEntry) => void;
  detections: WcsDetectionRow[];
  lens: MolecularLensId;
  mode: ViewMode;
  filterWheel: FilterWheelMode;
  shareUrl: string;
  onChangeLens: (lens: MolecularLensId) => void;
  onChangeFilterWheel?: (fw: FilterWheelMode) => void;
  onAddManualDetection: () => void;
  onRemoveDetection: (id: string) => void;
  onResetDetections: () => void;
  onCloseToHud?: () => void;
  onShowToast: (msg: string) => void;
}

const CONFIDENCE_OPTIONS: Array<{
  id: CandidateConfidenceStatus;
  label: string;
  dotColor: string;
}> = [
  { id: 'visual_only', label: 'Solo visual (Preliminar)', dotColor: '#A1A1AA' },
  { id: 'motion_fitted', label: 'Movimiento lineal ajustado', dotColor: '#52B79A' },
  { id: 'known_catalog', label: 'Ya conocido (Validado Gaia/WISE)', dotColor: '#5C7CFA' },
  { id: 'mpc_followup_ready', label: 'Candidato para seguimiento MPC', dotColor: '#F59E0B' },
];

const COMPACT_MOLECULES: Array<{ id: MolecularLensId; label: string }> = [
  { id: 'all', label: 'ALL 102B' },
  { id: 'h2o', label: 'H₂O' },
  { id: 'ch4', label: 'CH₄' },
  { id: 'co2', label: 'CO₂' },
  { id: 'co', label: 'CO' },
  { id: 'nh3', label: 'NH₃' },
];

export function CandidateDossierView({
  target,
  targets,
  onSelectTarget,
  detections,
  lens,
  mode: _mode,
  filterWheel,
  shareUrl,
  onChangeLens,
  onChangeFilterWheel: _onChangeFilterWheel,
  onAddManualDetection,
  onRemoveDetection,
  onResetDetections,
  onCloseToHud,
  onShowToast,
}: CandidateDossierViewProps) {
  const [confidenceStatus, setConfidenceStatus] = useState<CandidateConfidenceStatus>(
    target.id === 'm51-sector-34a'
      ? 'mpc_followup_ready'
      : target.velocityArcsecYr > 1.0
        ? 'known_catalog'
        : 'motion_fitted',
  );

  const [centerViewMode, setCenterViewMode] = useState<'cube' | 'spectrum'>('cube');

  const [notesByTarget] = useState<Record<string, string>>({
    'wise-0855':
      'Ajuste lineal en 4 épocas SPHEREx confirma μ = 8.08"/año (PA 274.7°), coincidiendo con Luhman (2014) en AllWISE. Fuerte absorción CH₄ y H₂O descarta asteroide cercano.',
    'barnards-star':
      'Estrella patrón de calibración astrométrica. Residual RMS < 0.05" contra Gaia DR3.',
    'm51-sector-34a':
      'Objeto en movimiento consistente entre barridos semestrales sin contraparte en Gaia DR3 ni MPChecker. Priorizar seguimiento astrométrico terrestre.',
  });

  const [cutoutImgError, setCutoutImgError] = useState(false);
  const [liveSimbadLoading, setLiveSimbadLoading] = useState(false);
  const [liveSimbadData, setLiveSimbadData] = useState<LiveSimbadMetadata | null>(null);

  const currentNotes = notesByTarget[target.id] ?? '';

  const fit = useMemo(
    () => calculateAstrometricLinearFit(detections, target),
    [detections, target],
  );

  const detectorArrays = useMemo(
    () => summarize6DetectorArrays(target.spectrum102),
    [target.spectrum102],
  );

  const catalogReport = useMemo(() => getCatalogCrossMatchReport(target), [target]);

  const gaiaEntry = useMemo(
    () => catalogReport.entries.find((e) => e.catalog === 'Gaia DR3'),
    [catalogReport.entries],
  );
  const wiseEntry = useMemo(
    () => catalogReport.entries.find((e) => e.catalog === 'AllWISE'),
    [catalogReport.entries],
  );

  const activePreset = useMemo(
    () => MOLECULAR_PRESETS.find((p) => p.id === lens) ?? MOLECULAR_PRESETS[0],
    [lens],
  );

  const filteredSpectrum = useMemo(() => {
    const [minUm, maxUm] = activePreset.bandRangeUm;
    return target.spectrum102.filter(
      (ch) => ch.wavelengthUm >= minUm && ch.wavelengthUm <= maxUm,
    );
  }, [activePreset.bandRangeUm, target.spectrum102]);

  const cutoutPreviewUrl = useMemo(
    () =>
      buildHips2FitsCutoutUrl(
        target.raDeg,
        target.decDeg,
        target.defaultFov,
        filterWheel,
        320,
        200,
      ),
    [filterWheel, target.decDeg, target.defaultFov, target.raDeg],
  );

  const handleDownloadFile = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportAdes = () => {
    const ades = generateAdesPsvContent(target, detections, confidenceStatus, currentNotes);
    handleDownloadFile(ades, `ades-spherex-${target.id}.psv`, 'text/plain;charset=utf-8');
    onShowToast('Exportado formato IAU ADES-PSV para el Minor Planet Center');
  };

  const handleExportCsv = () => {
    const csv = generateDetectionsCsvContent(target, detections, fit);
    handleDownloadFile(csv, `detecciones-wcs-${target.id}.csv`, 'text/csv;charset=utf-8');
    onShowToast('Tabla de detecciones exportada (.csv)');
  };

  const handleExportJson = () => {
    const payload = {
      mission: 'NASA SPHEREx All-Sky Survey (Candidate Dossier)',
      generatedAt: new Date().toISOString(),
      confidenceStatus,
      target: {
        id: target.id,
        name: target.name,
        designation: target.designation,
        raDeg: target.raDeg,
        decDeg: target.decDeg,
        spectralType: target.spectralType,
      },
      astrometricLinearFit: fit,
      catalogCrossMatch: catalogReport,
      detections,
      contaminationFlags: target.contamination,
      logbook: {
        notes: currentNotes,
        shareUrl,
      },
    };
    handleDownloadFile(
      JSON.stringify(payload, null, 2),
      `expediente-candidato-${target.id}.json`,
      'application/json',
    );
    onShowToast('Expediente completo exportado (.json)');
  };

  const handlePrintReviewerReport = () => {
    window.print();
    onShowToast('Generando vista imprimible / PDF');
  };

  const handleVerifyLiveSimbad = async () => {
    setLiveSimbadLoading(true);
    const res = await fetchLiveSimbadVerification(target.designation, target.raDeg, target.decDeg);
    setLiveSimbadData(res);
    setLiveSimbadLoading(false);
    if (res?.found) {
      onShowToast(`Verificado en CDS Simbad: ${res.mainId}`);
    } else {
      onShowToast('Consulta CDS completada');
    }
  };

  // Max flux for relative bar widths
  const maxDetectorFlux = useMemo(
    () => Math.max(...detectorArrays.map((d) => d.sumFluxT2), 1),
    [detectorArrays],
  );

  return (
    <section
      aria-label="Expediente de Candidato y Bitácora Científica"
      className="fixed inset-x-0 top-14 bottom-0 z-30 bg-[#0E0F12] text-[#ECEEF2] flex flex-col overflow-hidden animate-panel-enter select-none"
    >
      {/* 1. BARRA SUPERIOR DE FILTROS CATEGÓRICOS (Inspirada en Power BI / Dashboard Ejecutivo) */}
      <div className="px-4 py-2.5 bg-[#141519] border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 flex-nowrap overflow-x-auto">
        {/* Filtros horizontales de candidatos */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] font-mono uppercase tracking-wider text-[#8E94A0] mr-1 hidden sm:inline">
            Candidato:
          </span>
          {targets && targets.length > 0 ? (
            targets.map((t) => {
              const isSelected = t.id === target.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onSelectTarget?.(t)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition-all flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-[#222328] text-white border border-[#52B79A]/50 shadow-sm'
                      : 'text-[#8E94A0] hover:text-white hover:bg-white/[0.05] border border-transparent'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#52B79A]" />}
                  <span>{t.name}</span>
                </button>
              );
            })
          ) : (
            <div className="flex items-center gap-2 text-xs font-semibold text-white px-2">
              <span className="w-2 h-2 rounded-full bg-[#52B79A]" />
              <span>{target.name}</span>
            </div>
          )}
        </div>

        {/* Acciones de Exportación & Estado */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Selector de Estado */}
          <div className="flex items-center gap-1.5 bg-[#1B1C22] border border-white/[0.08] rounded-xl px-2.5 py-1">
            <span className="text-[10px] font-mono text-[#8E94A0] uppercase hidden md:inline">
              Estado:
            </span>
            <select
              value={confidenceStatus}
              onChange={(e) => setConfidenceStatus(e.target.value as CandidateConfidenceStatus)}
              className="bg-transparent text-xs font-mono text-white focus:outline-none cursor-pointer"
            >
              {CONFIDENCE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id} className="bg-[#17181D] text-white">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Botones de Exportación Compactos */}
          <button
            type="button"
            onClick={handlePrintReviewerReport}
            className="px-2.5 py-1 rounded-lg bg-[#1B1C22] hover:bg-[#25272E] text-xs font-mono text-[#C8CDD6] hover:text-white border border-white/[0.07] flex items-center gap-1.5 transition-colors"
            title="Imprimir Ficha PDF"
          >
            <Printer className="w-3.5 h-3.5 text-[#8E94A0]" />
            <span className="hidden sm:inline">PDF</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-2.5 py-1 rounded-lg bg-[#1B1C22] hover:bg-[#25272E] text-xs font-mono text-[#C8CDD6] hover:text-white border border-white/[0.07] flex items-center gap-1.5 transition-colors"
            title="Descargar Tabla CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#52B79A]" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportJson}
            className="px-2.5 py-1 rounded-lg bg-[#1B1C22] hover:bg-[#25272E] text-xs font-mono text-[#C8CDD6] hover:text-white border border-white/[0.07] flex items-center gap-1.5 transition-colors"
            title="Descargar JSON"
          >
            <Download className="w-3.5 h-3.5 text-[#8E94A0]" />
            <span className="hidden sm:inline">JSON</span>
          </button>

          <button
            type="button"
            onClick={handleExportAdes}
            className="px-3 py-1 rounded-lg text-xs font-mono text-white border border-[#52B79A]/40 bg-[#52B79A]/20 hover:bg-[#52B79A]/30 flex items-center gap-1.5 transition-colors shadow-sm"
            title="Exportar formato IAU ADES-PSV para el Minor Planet Center"
          >
            <FileCode2 className="w-3.5 h-3.5 text-[#52B79A]" />
            <span>ADES-PSV (MPC)</span>
          </button>

          {onCloseToHud && (
            <button
              type="button"
              onClick={onCloseToHud}
              className="px-2.5 py-1 rounded-lg bg-[#222328] hover:bg-[#2B2D33] text-xs font-mono text-[#C8CDD6] hover:text-white border border-white/[0.08] flex items-center gap-1 transition-colors"
              title="Volver al Visor Celeste"
            >
              <X className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Volver</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. ESTRUCTURA PRINCIPAL DEL EXPEDIENTE (Estructura rigurosa, NO Bento Grid, Ocupa 100% de la pantalla) */}
      <div className="flex-1 p-3.5 grid grid-cols-12 gap-3.5 overflow-y-auto lg:overflow-hidden">
        
        {/* COLUMNA 1: 5 TARJETAS KPI NUMÉRICAS (Inspiradas en la columna izquierda de la referencia) */}
        <div className="col-span-12 lg:col-span-2 flex flex-col gap-2.5 justify-between">
          {/* KPI 1: Movimiento Propio */}
          <div className="bg-[#15161A] p-3 rounded-xl border border-white/[0.06] flex flex-col justify-between h-full">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E94A0] flex items-center justify-between">
              <span>Movimiento Propio (μ)</span>
              <Compass className="w-3.5 h-3.5 text-[#52B79A]" />
            </div>
            <div className="my-1">
              <div className="text-xl font-mono font-bold text-white tracking-tight">
                {fit.velocityArcsecYr.toFixed(2)}&quot;/año
              </div>
              <div className="text-[10px] font-mono text-[#52B79A] truncate">
                PA {fit.positionAngleDeg.toFixed(1)}° ({fit.compassDirection})
              </div>
            </div>
            <div className="text-[9px] text-[#686B75] border-t border-white/[0.04] pt-1">
              Escala anual de desplazamiento
            </div>
          </div>

          {/* KPI 2: Consistencia Lineal (R²) */}
          <div className="bg-[#15161A] p-3 rounded-xl border border-white/[0.06] flex flex-col justify-between h-full">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E94A0] flex items-center justify-between">
              <span>Ajuste Lineal (R²)</span>
              <Clock className="w-3.5 h-3.5 text-[#5C7CFA]" />
            </div>
            <div className="my-1">
              <div className="text-xl font-mono font-bold text-white tracking-tight">
                R² = {fit.rSquared.toFixed(4)}
              </div>
              <div className="text-[10px] font-mono text-[#5C7CFA] truncate">
                RMS ±{fit.rmsResidualArcsec.toFixed(3)}&quot;
              </div>
            </div>
            <div className="text-[9px] text-[#686B75] border-t border-white/[0.04] pt-1">
              {fit.isLinearConsistent ? 'Movimiento Lineal y Constante' : 'Bajo Monitoreo'}
            </div>
          </div>

          {/* KPI 3: Velocidad Horaria MPC */}
          <div className="bg-[#15161A] p-3 rounded-xl border border-white/[0.06] flex flex-col justify-between h-full">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E94A0] flex items-center justify-between">
              <span>Velocidad Horaria</span>
              <Target className="w-3.5 h-3.5 text-[#52B79A]" />
            </div>
            <div className="my-1">
              <div className="text-xl font-mono font-bold text-white tracking-tight">
                {fit.velocityArcsecHr.toFixed(5)}&quot;/h
              </div>
              <div className="text-[10px] font-mono text-[#8E94A0] truncate">
                Cadencia espacial SPHEREx
              </div>
            </div>
            <div className="text-[9px] text-[#686B75] border-t border-white/[0.04] pt-1">
              Para coordinación con MPC
            </div>
          </div>

          {/* KPI 4: Variabilidad Fotométrica */}
          <div className="bg-[#15161A] p-3 rounded-xl border border-white/[0.06] flex flex-col justify-between h-full">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E94A0] flex items-center justify-between">
              <span>Variabilidad</span>
              <Sparkles className="w-3.5 h-3.5 text-[#EAB308]" />
            </div>
            <div className="my-1">
              <div className="text-xl font-mono font-bold text-white tracking-tight">
                {target.brightnessChangeMag > 0
                  ? `Δmag ${target.brightnessChangeMag.toFixed(2)}`
                  : 'Fotometría Fija'}
              </div>
              <div className="text-[10px] font-mono text-[#8E94A0] truncate">
                {target.category}
              </div>
            </div>
            <div className="text-[9px] text-[#686B75] border-t border-white/[0.04] pt-1">
              Contraste inter-épocas T₂ − T₁
            </div>
          </div>

          {/* KPI 5: Cadencia Observacional */}
          <div className="bg-[#15161A] p-3 rounded-xl border border-white/[0.06] flex flex-col justify-between h-full">
            <div className="text-[10px] font-mono uppercase tracking-wider text-[#8E94A0] flex items-center justify-between">
              <span>Cadencia</span>
              <Layers className="w-3.5 h-3.5 text-[#52B79A]" />
            </div>
            <div className="my-1">
              <div className="text-xl font-mono font-bold text-white tracking-tight">
                {detections.length} Cutouts
              </div>
              <div className="text-[10px] font-mono text-[#52B79A] truncate">
                {fit.mpcAssessment.spanDays.toFixed(1)} días de línea base
              </div>
            </div>
            <div className="text-[9px] text-[#686B75] border-t border-white/[0.04] pt-1">
              Barridos semestrales espaciados
            </div>
          </div>
        </div>

        {/* COLUMNA 2: ÁREA CENTRAL (2 Filas estructuradas: Tabla WCS arriba, Espectro 102B abajo) */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-3 h-full overflow-hidden">
          
          {/* FILA ARRIBA: TABLA DE DETECCIONES ASTROMÉTRICAS (WCS / IRSA) */}
          <div className="bg-[#15161A] rounded-xl border border-white/[0.06] flex flex-col overflow-hidden flex-1 min-h-[220px]">
            {/* Header de la Tabla */}
            <div className="px-4 py-2 bg-[#1B1C22] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <Table className="w-3.5 h-3.5 text-[#52B79A]" />
                <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
                  1. Detecciones Astrométricas WCS (IRSA / SPHEREx)
                </span>
                <span className="text-[10px] font-mono text-[#8E94A0] bg-white/[0.04] px-2 py-0.5 rounded">
                  {detections.length} observaciones
                </span>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={onAddManualDetection}
                  className="px-2.5 py-1 rounded-lg bg-[#222328] hover:bg-[#2B2D33] text-[11px] font-mono text-[#52B79A] hover:text-white border border-[#52B79A]/30 flex items-center gap-1 transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  <span>Marcar Posición</span>
                </button>

                <button
                  type="button"
                  onClick={onResetDetections}
                  className="p-1 rounded-lg bg-[#222328] hover:bg-[#2B2D33] text-[#8E94A0] hover:text-white transition-colors"
                  title="Restablecer detecciones"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            {/* Contenido de la Tabla */}
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-left text-xs font-mono border-collapse">
                <thead>
                  <tr className="bg-[#111215] text-[#8E94A0] text-[10px] uppercase tracking-wider sticky top-0 z-10 border-b border-white/[0.06]">
                    <th className="py-2 px-3 font-medium">Época</th>
                    <th className="py-2 px-3 font-medium">Archivo FITS</th>
                    <th className="py-2 px-3 font-medium">Fecha UTC</th>
                    <th className="py-2 px-3 font-medium">RA (ICRS)</th>
                    <th className="py-2 px-3 font-medium">Dec (ICRS)</th>
                    <th className="py-2 px-3 font-medium">±Inc.</th>
                    <th className="py-2 px-3 font-medium">Banda / Det</th>
                    <th className="py-2 px-3 font-medium">HDU Flags</th>
                    <th className="py-2 px-2 text-right font-medium"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.04]">
                  {detections.map((row) => (
                    <tr
                      key={row.id}
                      className="hover:bg-white/[0.03] transition-colors group text-[#C8CDD6]"
                    >
                      <td className="py-2 px-3 font-semibold text-white whitespace-nowrap">
                        {row.epochLabel}
                      </td>
                      <td className="py-2 px-3 text-[#8E94A0] truncate max-w-[140px]" title={row.fitsFileId}>
                        {row.fitsFileId}
                      </td>
                      <td className="py-2 px-3 text-[#A1A1AA] whitespace-nowrap">
                        {row.utcIso.slice(0, 16).replace('T', ' ')}
                      </td>
                      <td className="py-2 px-3 text-[#52B79A] font-semibold whitespace-nowrap">
                        {row.raDeg.toFixed(5)}°
                      </td>
                      <td className="py-2 px-3 text-white font-semibold whitespace-nowrap">
                        {row.decDeg >= 0 ? '+' : ''}
                        {row.decDeg.toFixed(5)}°
                      </td>
                      <td className="py-2 px-3 text-[#8E94A0] whitespace-nowrap">
                        ±{row.uncertaintyArcsec.toFixed(2)}&quot;
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span className="text-white">{row.bandLabel}</span>
                        <span className="text-[#686B75] ml-1">({row.detectorId})</span>
                      </td>
                      <td className="py-2 px-3 whitespace-nowrap">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            row.hduFlags.includes('CLEAN')
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {row.hduFlags[0] ?? 'CLEAN'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-right">
                        {row.id.startsWith('custom-') && (
                          <button
                            type="button"
                            onClick={() => onRemoveDetection(row.id)}
                            className="p-1 rounded text-[#8E94A0] hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Eliminar detección"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* FILA ABAJO: INTERPRETACIONES ALLSKYCUBE 3D & 2D / ESPECTRO 102B */}
          <div className="bg-[#15161A] rounded-xl border border-white/[0.06] flex flex-col overflow-hidden flex-1 min-h-[260px]">
            {/* Header con Switcher entre Cubo Espectral (3D & 2D) y Espectro 102B */}
            <div className="px-4 py-2 bg-[#1B1C22] border-b border-white/[0.06] flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#131418] p-0.5 rounded-lg border border-white/[0.06] text-xs font-mono">
                  <button
                    type="button"
                    onClick={() => setCenterViewMode('cube')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                      centerViewMode === 'cube'
                        ? 'bg-[#52B79A] text-black font-bold shadow-sm'
                        : 'text-[#8E94A0] hover:text-white'
                    }`}
                  >
                    <Box className="w-3.5 h-3.5" />
                    <span>2. AllSkyCube: Interpretación 3D &amp; 2D</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCenterViewMode('spectrum')}
                    className={`px-2.5 py-1 rounded-md flex items-center gap-1.5 transition-colors ${
                      centerViewMode === 'spectrum'
                        ? 'bg-[#52B79A] text-black font-bold shadow-sm'
                        : 'text-[#8E94A0] hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Espectro 102 Bandas</span>
                  </button>
                </div>
              </div>

              {centerViewMode === 'spectrum' && (
                <div className="flex items-center gap-1">
                  {COMPACT_MOLECULES.map((m) => {
                    const isActive = lens === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => onChangeLens(m.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
                          isActive
                            ? 'bg-[#52B79A] text-black font-bold'
                            : 'bg-[#222328] text-[#8E94A0] hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Contenido Dinámico: Cubo Espectral 3D/2D o Gráfico de Espectroscopía */}
            <div className="flex-1 p-2 min-h-0 overflow-y-auto">
              {centerViewMode === 'cube' ? (
                <SpectralAllSkyCubeViewer target={target} activeWavelengthUm={2.42} />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={filteredSpectrum}
                    margin={{ top: 8, right: 12, left: -16, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="dossierFullSpecGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#52B79A" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#52B79A" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(255,255,255,0.04)" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="wavelengthUm"
                      stroke="#525866"
                      fontSize={10}
                      tickFormatter={(v: number) => `${v.toFixed(2)}μm`}
                      tickLine={false}
                    />
                    <YAxis stroke="#525866" fontSize={10} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#17181D',
                        borderColor: 'rgba(255,255,255,0.12)',
                        borderRadius: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace',
                      }}
                      formatter={(val: number) => [`${val.toFixed(3)} Jy`, 'Flujo T2']}
                      labelFormatter={(label: number) => `λ = ${label.toFixed(3)} μm`}
                    />
                    <Area
                      type="monotone"
                      dataKey="fluxT2"
                      stroke="#52B79A"
                      strokeWidth={1.8}
                      fill="url(#dossierFullSpecGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* COLUMNA 3: DESGLOSE POR DETECTOR, CRUCE DE CATÁLOGOS Y CUTOUT (Inspirado en la columna derecha de la referencia con barras) */}
        <div className="col-span-12 lg:col-span-3 flex flex-col gap-3 h-full overflow-y-auto">
          
          {/* BLOQUE A: DESGLOSE POR DETECTOR (Barras horizontales, exactamente como la referencia de Power BI!) */}
          <div className="bg-[#15161A] rounded-xl border border-white/[0.06] p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[10px] font-mono uppercase tracking-wider text-[#8E94A0]">
              <span className="font-bold text-white"># Desglose por Detector</span>
              <span>Ganancia SNR</span>
            </div>

            <div className="space-y-2 pt-1">
              {detectorArrays.map((det: DetectorArraySummary) => {
                const pct = Math.min(100, Math.max(12, (det.sumFluxT2 / maxDetectorFlux) * 100));
                return (
                  <div key={det.band} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-white">{det.band}</span>
                      <span className="text-[10px] text-[#52B79A] font-medium">
                        Σ {det.sumFluxT2.toFixed(1)} • SNR {det.coaddedSnr}
                      </span>
                    </div>

                    {/* Barra horizontal de intensidad proporcional */}
                    <div className="w-full h-2 rounded-full bg-[#0D0E11] overflow-hidden border border-white/[0.04]">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: '#52B79A',
                        }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[9px] text-[#686B75] font-mono">
                      <span>{det.wavelengthRangeUm[0].toFixed(2)}–{det.wavelengthRangeUm[1].toFixed(2)} μm</span>
                      <span className="truncate max-w-[120px]">{det.keyMolecules}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* BLOQUE B: CRUCE CON CATÁLOGOS CONOCIDOS */}
          <div className="bg-[#15161A] rounded-xl border border-white/[0.06] p-3.5 space-y-2.5">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[10px] font-mono uppercase tracking-wider text-[#8E94A0]">
              <span className="font-bold text-white">Cruce de Catálogos</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-[#5C7CFA]" />
            </div>

            <div className="space-y-2 text-xs font-mono">
              {/* Gaia DR3 */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#111215] border border-white/[0.04]">
                <div>
                  <div className="text-white font-semibold">Gaia DR3</div>
                  <div className="text-[10px] text-[#8E94A0]">Astrometría óptica</div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    gaiaEntry?.matched
                      ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                      : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {gaiaEntry?.matched ? 'Coincidente' : 'Sin Contraparte'}
                </span>
              </div>

              {/* AllWISE */}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#111215] border border-white/[0.04]">
                <div>
                  <div className="text-white font-semibold">AllWISE</div>
                  <div className="text-[10px] text-[#8E94A0]">Infrarrojo W1/W2</div>
                </div>
                <span
                  className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    wiseEntry?.matched
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/30'
                      : 'bg-zinc-700/30 text-zinc-400 border border-zinc-700/40'
                  }`}
                >
                  {wiseEntry?.matched ? 'Registrado W1/W2' : 'No Detectado'}
                </span>
              </div>

              {/* Consulta CDS Simbad interactiva */}
              <div className="pt-1">
                <button
                  type="button"
                  onClick={handleVerifyLiveSimbad}
                  disabled={liveSimbadLoading}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-[#202126] hover:bg-[#2A2B33] text-xs font-mono text-[#5C7CFA] hover:text-white border border-[#5C7CFA]/30 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Search className="w-3.5 h-3.5" />
                  <span>{liveSimbadLoading ? 'Consultando CDS...' : 'Verificar en CDS Simbad'}</span>
                </button>
                {liveSimbadData && (
                  <div className="mt-1.5 text-[10px] font-mono text-[#52B79A] bg-[#111215] p-2 rounded border border-white/[0.04]">
                    {liveSimbadData.found
                      ? `Coincidencia: ${liveSimbadData.mainId} (${liveSimbadData.objectType})`
                      : 'No catalogado en CDS Simbad (Candidato Nuevo)'}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* BLOQUE C: BANDERAS DE CALIDAD FITS & CUTOUT INFRARROJO REAL */}
          <div className="bg-[#15161A] rounded-xl border border-white/[0.06] p-3.5 space-y-2">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2 text-[10px] font-mono uppercase tracking-wider text-[#8E94A0]">
              <span className="font-bold text-white">Banderas FITS & Cutout</span>
              <span className="text-[#52B79A]">IA {target.aiConfidencePct}%</span>
            </div>

            {/* Banderas de contaminación */}
            <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono">
              <div className="bg-[#111215] p-1.5 rounded border border-white/[0.04]">
                <span className="text-[#8E94A0]">Artifact:</span>{' '}
                <span className="text-white font-semibold">[{target.contamination.artifact}]</span>
              </div>
              <div className="bg-[#111215] p-1.5 rounded border border-white/[0.04]">
                <span className="text-[#8E94A0]">Saturation:</span>{' '}
                <span className="text-white font-semibold">[{target.contamination.saturation}]</span>
              </div>
              <div className="bg-[#111215] p-1.5 rounded border border-white/[0.04]">
                <span className="text-[#8E94A0]">Zodiacal:</span>{' '}
                <span className="text-white font-semibold">[{target.contamination.zodiacalBg}]</span>
              </div>
              <div className="bg-[#111215] p-1.5 rounded border border-white/[0.04]">
                <span className="text-[#8E94A0]">Cosmic Ray:</span>{' '}
                <span className="text-white font-semibold">[{target.contamination.cosmicRay}]</span>
              </div>
            </div>

            {/* Cutout astronómico real */}
            <div className="pt-1">
              <div className="relative w-full h-24 rounded-lg overflow-hidden bg-[#0D0E11] border border-white/[0.06]">
                {!cutoutImgError ? (
                  <img
                    src={cutoutPreviewUrl}
                    alt={`Cutout IR ${target.name}`}
                    className="w-full h-full object-cover"
                    onError={() => setCutoutImgError(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-[10px] font-mono text-[#8E94A0]">
                    Simulación NIR SPHEREx
                  </div>
                )}
                <div className="absolute bottom-1 right-1 bg-black/70 px-1.5 py-0.5 rounded text-[8px] font-mono text-white">
                  CDS / 2MASS
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
