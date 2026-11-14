import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BrowserRouter, useSearchParams } from 'react-router-dom';
import { LIVE_TICKER_ALERTS, MOLECULAR_PRESETS, SPHEREX_TARGETS } from './data/spherexCatalog';
import type {
  CatalogOverlayState,
  EpochIndex,
  ExplorerUrlState,
  FloatingModuleVisibility,
  LayoutViewMode,
  LiveTickerAlert,
  MolecularLensId,
  MotionFilterQuery,
  OnTheFlyFieldSource,
  TargetCatalogEntry,
  ViewMode,
} from './types/spherex';
import {
  clampDec,
  formatDecDms,
  formatRaHms,
  normalizeRa,
  parseExplorerUrlParams,
  serializeExplorerUrlParams,
} from './utils/urlState';
import {
  type WcsDetectionRow,
  buildInitialDetectionsForTarget,
  calculateAstrometricLinearFit,
} from './utils/astrometryEngine';
import type { FilterWheelMode } from './services/astronomyApi';
import { SkyCanvasHUD } from './components/SkyCanvasHUD';
import { SixDetectorEpochPanel } from './components/SixDetectorEpochPanel';
import { TopTelemetryBar } from './components/TopTelemetryBar';
import { MotionFiltersDeck } from './components/MotionFiltersDeck';
import { SpectralTelemetryModule } from './components/SpectralTelemetryModule';
import { CandidateDossierView } from './components/CandidateDossierView';
import { TimeTravelBlinkBar } from './components/TimeTravelBlinkBar';
import { RadialControlMenu, type RadialDirectionKey } from './components/RadialControlMenu';
import { CommandSearchModal } from './components/CommandSearchModal';
import { DraggableHUDPanel } from './components/DraggableHUDPanel';

function downloadFindingSheet(
  target: TargetCatalogEntry,
  state: ExplorerUrlState,
  shareUrl: string,
  format: 'md' | 'json',
) {
  const activeLens = MOLECULAR_PRESETS.find((p) => p.id === state.lens) ?? MOLECULAR_PRESETS[0];
  const filenameBase = `spherex-finding-${target.id}-ep${state.epoch}`;

  if (format === 'json') {
    const payload = {
      mission: 'NASA SPHEREx All-Sky NIR Survey (102 LVF Bands)',
      generatedAt: new Date().toISOString(),
      target: {
        id: target.id,
        name: target.name,
        designation: target.designation,
        category: target.category,
        spectralType: target.spectralType,
        fitsId: target.fitsId,
      },
      viewport: {
        raDeg: state.ra,
        raHms: formatRaHms(state.ra),
        decDeg: state.dec,
        decDms: formatDecDms(state.dec),
        fovDeg: state.fov,
        epoch: state.epoch,
        mode: state.mode,
        view: state.view,
        molecularLens: activeLens.id,
      },
      kinematics: {
        velocityArcsecYr: target.velocityArcsecYr,
        brightnessChangeMag: target.brightnessChangeMag,
        distancePc: target.distancePc,
      },
      aiInsights: {
        confidencePct: target.aiConfidencePct,
        dominantMolecules: target.dominantMolecules,
        summary: target.aiSummary,
      },
      contaminationFlags: target.contamination,
      shareUrl,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filenameBase}.json`;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  const md = [
    `# Expediente de Candidato — HexTech // SPHEREx Explorer`,
    ``,
    `- **Objetivo:** ${target.name} (\`${target.designation}\`)`,
    `- **Categoría:** ${target.category} (${target.spectralType})`,
    `- **ID FITS / Archivo:** \`${target.fitsId}\``,
    `- **Coordenadas (ICRS):** RA \`${state.ra.toFixed(5)}°\` (\`${formatRaHms(state.ra)}\`) | Dec \`${state.dec.toFixed(5)}°\` (\`${formatDecDms(state.dec)}\`)`,
    `- **Campo de Visión (FoV):** \`${state.fov.toFixed(3)}°\``,
    `- **Época Activa / Modo:** Epoch T${state.epoch} • Modo \`${state.mode}\` • Lente \`${activeLens.label}\` (${activeLens.bandRangeUm[0]}–${activeLens.bandRangeUm[1]} μm)`,
    ``,
    `## Cinemática y Variabilidad`,
    `- **Movimiento Propio:** \`${target.velocityArcsecYr.toFixed(2)} arcsec/yr\``,
    `- **Cambio de Brillo (Δmag):** \`${target.brightnessChangeMag.toFixed(2)} mag\``,
    `- **Distancia Estimada:** \`${target.distancePc} pc\``,
    ``,
    `## Insights Moleculares (IA — ${target.aiConfidencePct}% Confianza)`,
    `${target.aiSummary}`,
    ``,
    `## Banderas de Contaminación y Validación`,
    `- **Artifact Flag:** ${target.contamination.artifact}`,
    `- **Star Light Saturation:** ${target.contamination.saturation}`,
    `- **Zodiacal Background:** ${target.contamination.zodiacalBg}`,
    `- **Cosmic Ray:** ${target.contamination.cosmicRay}`,
    `- **Nota Técnica:** ${target.contamination.detail}`,
    ``,
    `## Enlace Reproducible`,
    `${shareUrl}`,
  ].join('\n');

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.md`;
  a.click();
  URL.revokeObjectURL(url);
}

export function SpherexExplorerShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlState = useMemo(() => parseExplorerUrlParams(searchParams), [searchParams]);

  const selectedTarget = useMemo(
    () => SPHEREX_TARGETS.find((t) => t.id === urlState.target) ?? SPHEREX_TARGETS[0],
    [urlState.target],
  );

  const [visibility, setVisibility] = useState<FloatingModuleVisibility>({
    spectra: true,
    aiInsights: true,
    metadata: true,
    motionFilters: false,
    selectionTool: false,
    shareUrl: false,
  });

  const [showLiveTicker] = useState(false);
  const [filterWheel, setFilterWheel] = useState<FilterWheelMode>('srgb');
  const [catalogOverlays, setCatalogOverlays] = useState<CatalogOverlayState>({
    gaiaDr3: false,
    allWise: false,
  });
  const [activeOnTheFlySource, setActiveOnTheFlySource] = useState<OnTheFlyFieldSource | null>(
    null,
  );

  // WCS Detections state per target (supports marking new positions interactively)
  const [customDetectionsMap, setCustomDetectionsMap] = useState<
    Record<string, WcsDetectionRow[]>
  >({});

  const activeDetections = useMemo(
    () =>
      customDetectionsMap[selectedTarget.id] ?? buildInitialDetectionsForTarget(selectedTarget),
    [customDetectionsMap, selectedTarget],
  );

  const [motionFilter, setMotionFilter] = useState<MotionFilterQuery>({
    minVelocityArcsecYr: 1.5,
    minBrightnessChangeMag: 0.4,
    active: false,
  });

  const [blinkFrame, setBlinkFrame] = useState<1 | 2>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEpochPanelMaximized, setIsEpochPanelMaximized] = useState(false);
  const [cmdKOpen, setCmdKOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // Hold [Ctrl] + Mouse Move Directional Radial State
  const mousePosRef = useRef({
    x: typeof window !== 'undefined' ? Math.round(window.innerWidth * 0.42) : 520,
    y: typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.48) : 420,
  });
  const [radialAnchor, setRadialAnchor] = useState<{ x: number; y: number } | null>(null);
  const [radialDirection, setRadialDirection] = useState<RadialDirectionKey>(null);
  const [radialOffset, setRadialOffset] = useState({ dx: 0, dy: 0 });
  const radialAnchorRef = useRef<{ x: number; y: number } | null>(null);
  const radialDirectionRef = useRef<RadialDirectionKey>(null);

  const showToast = useCallback((msg: string) => {
    setToastMsg(msg);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2800);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  const updateUrlState = useCallback(
    (patch: Partial<ExplorerUrlState>) => {
      const next: ExplorerUrlState = {
        ...urlState,
        ...patch,
      };
      next.ra = normalizeRa(next.ra);
      next.dec = clampDec(next.dec);
      next.fov = Math.max(0.04, Math.min(8, next.fov));
      setSearchParams(serializeExplorerUrlParams(next), { replace: true });
    },
    [setSearchParams, urlState],
  );

  useEffect(() => {
    if (!searchParams.has('target') && !searchParams.has('ra')) {
      setSearchParams(serializeExplorerUrlParams(urlState), { replace: true });
    }
  }, [searchParams, setSearchParams, urlState]);

  const shareUrl = useMemo(() => {
    const queryStr = serializeExplorerUrlParams(urlState).toString();
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://hextech-spherex.app';
    return `${origin}/?${queryStr}`;
  }, [urlState]);

  const handleToggleModule = useCallback((key: keyof FloatingModuleVisibility) => {
    setVisibility((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleCopyShareUrl = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // ignore
    }
    showToast(`URL copiada al portapapeles`);
  }, [shareUrl, showToast]);

  const handleSelectRadialDirection = useCallback(
    (dir: NonNullable<RadialDirectionKey>) => {
      handleToggleModule(dir);
      if (dir === 'shareUrl') {
        handleCopyShareUrl();
      } else {
        const labels: Record<NonNullable<RadialDirectionKey>, string> = {
          aiInsights: 'AI Insights',
          spectra: 'Spectra (102 Bandas)',
          metadata: 'Metadata & Flags',
          shareUrl: 'URL Compartida',
        };
        showToast(`Módulo ${labels[dir]} alternado`);
      }
      radialAnchorRef.current = null;
      radialDirectionRef.current = null;
      setRadialAnchor(null);
      setRadialDirection(null);
      setRadialOffset({ dx: 0, dy: 0 });
    },
    [handleCopyShareUrl, handleToggleModule, showToast],
  );

  // Hold [Ctrl] + Mouse Move Directional Radial Menu Listener
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      const anchor = radialAnchorRef.current;
      if (!anchor) return;

      const dx = e.clientX - anchor.x;
      const dy = e.clientY - anchor.y;
      setRadialOffset({ dx, dy });

      const dist = Math.hypot(dx, dy);
      if (dist < 16) {
        radialDirectionRef.current = null;
        setRadialDirection(null);
        return;
      }

      let nextDir: RadialDirectionKey = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        nextDir = dx < 0 ? 'spectra' : 'metadata';
      } else {
        nextDir = dy < 0 ? 'aiInsights' : 'shareUrl';
      }
      radialDirectionRef.current = nextDir;
      setRadialDirection(nextDir);
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        radialAnchorRef.current = null;
        radialDirectionRef.current = null;
        setRadialAnchor(null);
        setRadialDirection(null);
        if (!cmdKOpen) {
          e.preventDefault();
          setCmdKOpen(true);
        }
        return;
      }

      if (e.key === 'Control' && !e.repeat && !cmdKOpen) {
        const clampedX = Math.max(
          130,
          Math.min(window.innerWidth - 130, mousePosRef.current.x),
        );
        const clampedY = Math.max(
          130,
          Math.min(window.innerHeight - 130, mousePosRef.current.y),
        );
        const anchor = { x: clampedX, y: clampedY };
        radialAnchorRef.current = anchor;
        radialDirectionRef.current = null;
        setRadialAnchor(anchor);
        setRadialDirection(null);
        setRadialOffset({ dx: 0, dy: 0 });
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' && radialAnchorRef.current) {
        const chosen = radialDirectionRef.current;
        if (chosen) {
          handleSelectRadialDirection(chosen);
        } else {
          radialAnchorRef.current = null;
          radialDirectionRef.current = null;
          setRadialAnchor(null);
          setRadialDirection(null);
          setRadialOffset({ dx: 0, dy: 0 });
        }
      }
    };

    const onBlur = () => {
      radialAnchorRef.current = null;
      radialDirectionRef.current = null;
      setRadialAnchor(null);
      setRadialDirection(null);
      setRadialOffset({ dx: 0, dy: 0 });
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [cmdKOpen, handleSelectRadialDirection]);

  // Blink mode automatic frame alternation
  useEffect(() => {
    if (urlState.mode !== 'blink') return;
    const timer = window.setInterval(() => {
      setBlinkFrame((prev) => (prev === 1 ? 2 : 1));
    }, 420);
    return () => window.clearInterval(timer);
  }, [urlState.mode]);

  // Timelapse playback loop across Epochs T1..T4
  useEffect(() => {
    if (!isPlaying) return;
    const timer = window.setInterval(() => {
      const nextEpoch = ((urlState.epoch % 4) + 1) as EpochIndex;
      updateUrlState({ epoch: nextEpoch });
    }, 950);
    return () => window.clearInterval(timer);
  }, [isPlaying, updateUrlState, urlState.epoch]);

  const handleSelectTarget = useCallback(
    (target: TargetCatalogEntry) => {
      setIsPlaying(false);
      setActiveOnTheFlySource(null);
      updateUrlState({
        target: target.id,
        ra: target.raDeg,
        dec: target.decDeg,
        fov: target.defaultFov,
      });
      showToast(`Objetivo: ${target.name}`);
    },
    [showToast, updateUrlState],
  );

  const handleJumpCoordinates = useCallback(
    (ra: number, dec: number) => {
      setIsPlaying(false);
      setActiveOnTheFlySource(null);
      updateUrlState({ ra, dec });
      showToast(`RA ${ra.toFixed(5)}°, Dec ${dec.toFixed(5)}°`);
    },
    [showToast, updateUrlState],
  );

  const handleViewportChange = useCallback(
    (next: { ra?: number; dec?: number; fov?: number }) => {
      updateUrlState({
        ra: next.ra ?? urlState.ra,
        dec: next.dec ?? urlState.dec,
        fov: next.fov ?? urlState.fov,
      });
    },
    [updateUrlState, urlState.dec, urlState.fov, urlState.ra],
  );

  const handleChangeLayoutView = useCallback(
    (view: LayoutViewMode) => {
      updateUrlState({ view });
    },
    [updateUrlState],
  );

  // Add manual / marked astrometric detection to the target's expediente
  const handleAddDetection = useCallback(
    (customRa?: number, customDec?: number) => {
      const baseList =
        customDetectionsMap[selectedTarget.id] ?? buildInitialDetectionsForTarget(selectedTarget);
      const countUser = baseList.filter((d) => d.source === 'USER_MARKED').length + 1;
      const lastRow = baseList[baseList.length - 1];
      const nextMjd = Number((lastRow.mjd + 45.0).toFixed(1));
      const dtYears = (nextMjd - baseList[0].mjd) / 365.25;
      const cosDec = Math.max(0.1, Math.cos((selectedTarget.decDeg * Math.PI) / 180));

      const epoch1 = selectedTarget.epochs[0];
      const epoch2 = selectedTarget.epochs[3] ?? selectedTarget.epochs[1];
      const pmRaArcsecYr = (epoch2.raShiftArcsec - epoch1.raShiftArcsec) / 0.75;
      const pmDecArcsecYr = (epoch2.decShiftArcsec - epoch1.decShiftArcsec) / 0.75;

      const newRa =
        customRa ??
        Number((selectedTarget.raDeg + (pmRaArcsecYr * dtYears) / (3600 * cosDec)).toFixed(6));
      const newDec =
        customDec ?? Number((selectedTarget.decDeg + (pmDecArcsecYr * dtYears) / 3600).toFixed(6));

      const newRow: WcsDetectionRow = {
        id: `${selectedTarget.id}-user-${Date.now()}`,
        epochLabel: `M${countUser}`,
        fitsFileId: selectedTarget.fitsId.replace('_102B.fits', `_M${countUser}_USER.fits`),
        utcIso: '2026-02-04T06:15:00Z',
        mjd: nextMjd,
        raDeg: newRa,
        decDeg: newDec,
        uncertaintyArcsec: 0.12,
        bandLabel: 'LVF-4 (3.32 μm)',
        detectorId: 'DET-2B NIR',
        magNir: lastRow.magNir,
        hduFlags: ['CLEAN'],
        source: 'USER_MARKED',
      };

      const updated = [...baseList, newRow];
      setCustomDetectionsMap((prev) => ({
        ...prev,
        [selectedTarget.id]: updated,
      }));

      const fit = calculateAstrometricLinearFit(updated, selectedTarget);
      showToast(
        `Posición ${newRow.epochLabel} añadida • Ajuste: ${fit.velocityArcsecYr.toFixed(2)}"/yr (R²=${fit.rSquared.toFixed(3)})`,
      );
    },
    [customDetectionsMap, selectedTarget, showToast],
  );

  const handleRemoveDetection = useCallback(
    (id: string) => {
      setCustomDetectionsMap((prev) => {
        const list = prev[selectedTarget.id] ?? buildInitialDetectionsForTarget(selectedTarget);
        return {
          ...prev,
          [selectedTarget.id]: list.filter((d) => d.id !== id),
        };
      });
      showToast('Medición manual eliminada');
    },
    [selectedTarget, showToast],
  );

  const handleResetDetections = useCallback(() => {
    setCustomDetectionsMap((prev) => {
      const next = { ...prev };
      delete next[selectedTarget.id];
      return next;
    });
    showToast('Detecciones WCS restauradas a las 4 épocas base');
  }, [selectedTarget.id, showToast]);

  const handleStepBlink = useCallback(() => {
    if (urlState.mode !== 'blink') {
      updateUrlState({ mode: 'blink' });
    }
    setBlinkFrame((prev) => (prev === 1 ? 2 : 1));
  }, [updateUrlState, urlState.mode]);

  const handleToggleBlink = useCallback(() => {
    setIsPlaying(false);
    updateUrlState({ mode: urlState.mode === 'blink' ? 'normal' : 'blink' });
  }, [updateUrlState, urlState.mode]);

  const handleToggleDiff = useCallback(() => {
    setIsPlaying(false);
    updateUrlState({ mode: urlState.mode === 'diff' ? 'normal' : 'diff' });
  }, [updateUrlState, urlState.mode]);

  const handleToggleSum = useCallback(() => {
    setIsPlaying(false);
    updateUrlState({ mode: urlState.mode === 'sum' ? 'normal' : 'sum' });
  }, [updateUrlState, urlState.mode]);

  const handleToggleCatalogOverlay = useCallback(
    (key: keyof CatalogOverlayState) => {
      setCatalogOverlays((prev) => {
        const nextVal = !prev[key];
        const label = key === 'gaiaDr3' ? 'Gaia DR3' : 'AllWISE';
        showToast(`Capa ${label} ${nextVal ? 'activada' : 'ocultada'}`);
        return { ...prev, [key]: nextVal };
      });
    },
    [showToast],
  );

  const handleJumpAlert = useCallback(
    (alert: LiveTickerAlert) => {
      const target = SPHEREX_TARGETS.find((t) => t.id === alert.targetId);
      if (target) {
        handleSelectTarget(target);
      } else {
        handleJumpCoordinates(alert.raDeg, alert.decDeg);
      }
    },
    [handleJumpCoordinates, handleSelectTarget],
  );

  const handleExecuteCmdAction = useCallback(
    (action: 'blink' | 'diff' | 'sum' | 'split' | 'motion' | 'selection') => {
      if (action === 'blink') handleToggleBlink();
      if (action === 'diff') handleToggleDiff();
      if (action === 'sum') handleToggleSum();
      if (action === 'split') {
        handleChangeLayoutView(urlState.view === 'split' ? 'hud' : 'split');
      }
      if (action === 'motion') {
        handleToggleModule('motionFilters');
      }
      if (action === 'selection') {
        handleChangeLayoutView('nested');
      }
    },
    [
      handleChangeLayoutView,
      handleToggleBlink,
      handleToggleDiff,
      handleToggleModule,
      handleToggleSum,
      urlState.view,
    ],
  );

  const isDrawerVisible =
    urlState.view !== 'nested' &&
    (visibility.spectra || visibility.aiInsights || visibility.metadata || visibility.shareUrl);

  const screenW = typeof window !== 'undefined' ? window.innerWidth : 1440;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08090C] text-[#ECEEF2] select-none">
      {/* LAYER 1: BASE VISUALIZATION SKY STAGE & SPLIT FLOATING DRAWER */}
      <main className="absolute inset-0 w-full h-full overflow-hidden">
        {/* Full Sky Canvas (Centered and active, visible directly or through frosted floating drawer) */}
        <div
          className={`relative h-full w-full transition-all duration-300 ${
            urlState.view === 'split' && isEpochPanelMaximized ? 'hidden' : 'block'
          }`}
        >
          <SkyCanvasHUD
            target={selectedTarget}
            allTargets={SPHEREX_TARGETS}
            detections={activeDetections}
            ra={urlState.ra}
            dec={urlState.dec}
            fov={urlState.fov}
            epoch={urlState.epoch}
            blinkFrame={blinkFrame}
            mode={urlState.mode}
            filterWheel={filterWheel}
            motionFilter={motionFilter}
            catalogOverlays={catalogOverlays}
            activeOnTheFlySource={activeOnTheFlySource}
            isDrawerOpen={urlState.view === 'split' || (isDrawerVisible && urlState.view === 'hud')}
            isSplitView={urlState.view === 'split'}
            onViewportChange={handleViewportChange}
            onChangeFilterWheel={(fw) => {
              setFilterWheel(fw);
              showToast(`Filtro visual: ${fw.toUpperCase()}`);
            }}
            onToggleCatalogOverlay={handleToggleCatalogOverlay}
            onSelectOnTheFlySource={(src) => {
              setActiveOnTheFlySource(src);
              if (src) {
                showToast(`Espectro de 102 bandas generado al vuelo: ${src.designation}`);
              } else {
                showToast(`Restaurado espectro base: ${selectedTarget.name}`);
              }
            }}
            onMarkDetectionAtCurrentEpoch={(mRa, mDec) => handleAddDetection(mRa, mDec)}
          />
        </div>

        {/* 6 DETECTORES / ÉPOCAS (Estilo exacto Telemetry Drawer: flotante, esquinas redondeadas, contornos pulidos) */}
        {urlState.view === 'split' && (
          <div
            className={`fixed z-30 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              isEpochPanelMaximized
                ? 'inset-x-3 sm:inset-x-6 top-16 bottom-3'
                : 'top-16 right-3 bottom-3 w-full sm:w-[580px] lg:w-[620px] xl:w-[660px] max-w-[calc(100vw-24px)]'
            }`}
          >
            <SixDetectorEpochPanel
              target={selectedTarget}
              mode={urlState.mode}
              isMaximized={isEpochPanelMaximized}
              onToggleMaximize={() => setIsEpochPanelMaximized((p) => !p)}
              onChangeMode={(nextMode: ViewMode) => {
                setIsPlaying(false);
                updateUrlState({ mode: nextMode });
              }}
              onCloseSplit={() => {
                setIsEpochPanelMaximized(false);
                handleChangeLayoutView('hud');
              }}
            />
          </div>
        )}
      </main>

      {/* LAYER 2A: TOP TELEMETRY BAR (Simplified 3 Clear Views + Interactive FoV Selector) */}
      <div className="fixed top-0 inset-x-0 z-40 pointer-events-none">
        <TopTelemetryBar
          targets={SPHEREX_TARGETS}
          selectedTarget={selectedTarget}
          ra={urlState.ra}
          dec={urlState.dec}
          layoutView={urlState.view}
          fov={urlState.fov}
          onSelectTarget={handleSelectTarget}
          onChangeLayoutView={handleChangeLayoutView}
          onChangeFov={(nextFov) => {
            handleViewportChange({ fov: nextFov });
            showToast(
              nextFov > 0.5
                ? `Campo amplio FoV ${nextFov.toFixed(2)}°: Mayor transferencia de datos para rastreo rápido`
                : `Campo de visión FoV ajustado a ${nextFov.toFixed(2)}°`,
            );
          }}
          onOpenCmdK={() => setCmdKOpen(true)}
        />
      </div>

      {/* LAYER 2B: FULL-SCREEN CANDIDATE DOSSIER & BITÁCORA */}
      {urlState.view === 'nested' && (
        <CandidateDossierView
          target={selectedTarget}
          targets={SPHEREX_TARGETS}
          onSelectTarget={handleSelectTarget}
          detections={activeDetections}
          lens={urlState.lens}
          mode={urlState.mode}
          filterWheel={filterWheel}
          shareUrl={shareUrl}
          onChangeLens={(lens: MolecularLensId) => updateUrlState({ lens })}
          onChangeFilterWheel={(fw) => setFilterWheel(fw)}
          onAddManualDetection={() => handleAddDetection()}
          onRemoveDetection={handleRemoveDetection}
          onResetDetections={handleResetDetections}
          onCloseToHud={() => handleChangeLayoutView('hud')}
          onShowToast={showToast}
        />
      )}

      {/* LAYER 2C: DRAGGABLE [Deck] Motion Filters Panel */}
      {urlState.view === 'hud' && visibility.motionFilters && (
        <DraggableHUDPanel
          id="motion-deck"
          defaultPosition={{ x: 16, y: 84 }}
          headerTitle="Motion Filters"
        >
          <MotionFiltersDeck
            isOpen={visibility.motionFilters}
            filter={motionFilter}
            allTargets={SPHEREX_TARGETS}
            onChangeFilter={setMotionFilter}
            onSelectTarget={handleSelectTarget}
            onClose={() => handleToggleModule('motionFilters')}
          />
        </DraggableHUDPanel>
      )}

      {/* LAYER 2E: RIGHT LATERAL TELEMETRY DRAWER (Only in HUD mode) */}
      {urlState.view === 'hud' && isDrawerVisible && (
        <DraggableHUDPanel
          id="telemetry-drawer"
          defaultPosition={{
            x: Math.max(20, screenW - 355),
            y: 64,
          }}
          headerTitle="Telemetry Drawer"
        >
          <SpectralTelemetryModule
            target={selectedTarget}
            activeOnTheFlySource={activeOnTheFlySource}
            detections={activeDetections}
            lens={urlState.lens}
            mode={urlState.mode}
            layoutView={urlState.view}
            visibility={visibility}
            shareUrl={shareUrl}
            onOpenDossier={() => handleChangeLayoutView('nested')}
            onOpenSixDetectors={() => handleChangeLayoutView('split')}
            onClearOnTheFlySource={() => setActiveOnTheFlySource(null)}
            onChangeLens={(lens: MolecularLensId) => updateUrlState({ lens })}
            onToggleVisibility={handleToggleModule}
            onExportReport={(format) => {
              downloadFindingSheet(selectedTarget, urlState, shareUrl, format);
              showToast(`Ficha descargada (.${format})`);
            }}
          />
        </DraggableHUDPanel>
      )}

      {/* LAYER 2F: HOLD [CTRL] + MOUSE MOVE DIRECTIONAL RADIAL MENU */}
      {urlState.view === 'hud' && (
        <RadialControlMenu
          position={radialAnchor}
          activeDirection={radialDirection}
          mouseOffset={radialOffset}
          visibility={visibility}
          onSelectDirection={handleSelectRadialDirection}
        />
      )}

      {/* LAYER 2G: BOTTOM TIME-TRAVEL BLINK BAR (Only in HUD mode) */}
      {urlState.view === 'hud' && (
        <div
          className={`fixed bottom-3 left-3 z-30 pointer-events-none transition-all duration-300 ${
            isDrawerVisible ? 'right-[365px]' : 'right-3'
          }`}
        >
          <TimeTravelBlinkBar
            epochs={selectedTarget.epochs}
            epoch={urlState.epoch}
            blinkFrame={blinkFrame}
            mode={urlState.mode}
            isPlaying={isPlaying}
            showLiveTicker={showLiveTicker}
            alerts={LIVE_TICKER_ALERTS}
            targets={SPHEREX_TARGETS}
            onEpochChange={(epoch) => {
              setIsPlaying(false);
              updateUrlState({ epoch });
            }}
            onTogglePlay={() => setIsPlaying((p) => !p)}
            onToggleBlink={handleToggleBlink}
            onToggleDiff={handleToggleDiff}
            onToggleSum={handleToggleSum}
            onStepBlink={handleStepBlink}
            onJumpAlert={handleJumpAlert}
            onSelectTarget={handleSelectTarget}
          />
        </div>
      )}

      {/* LAYER 3A: SUBTLE HUD TOAST */}
      {toastMsg && (
        <div className="fixed top-[68px] left-1/2 -translate-x-1/2 z-50 hud-card-elevated px-4 py-1.5 rounded-full text-xs font-mono text-[#ECEEF2] shadow-2xl animate-panel-enter pointer-events-none border border-white/15">
          {toastMsg}
        </div>
      )}

      {/* LAYER 3B: COMMAND SEARCH PALETTE (Cmd+K) */}
      <CommandSearchModal
        targets={SPHEREX_TARGETS}
        isOpen={cmdKOpen}
        onClose={() => setCmdKOpen(false)}
        onSelectTarget={handleSelectTarget}
        onJumpCoordinates={handleJumpCoordinates}
        onExecuteAction={handleExecuteCmdAction}
      />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <SpherexExplorerShell />
    </BrowserRouter>
  );
}
