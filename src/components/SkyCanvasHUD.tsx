import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Crosshair, Database, Globe, Minus, Plus, RotateCcw, Sparkles, X } from 'lucide-react';
import type {
  CatalogOverlayState,
  EpochIndex,
  MotionFilterQuery,
  OnTheFlyFieldSource,
  TargetCatalogEntry,
  ViewMode,
} from '../types/spherex';
import { clampDec, generateOnTheFlySourceAtCoordinate, normalizeRa } from '../utils/urlState';
import { drawMockDeepSkyField } from '../data/mockSkyData';
import {
  type FilterWheelMode,
  FILTER_WHEEL_OPTIONS,
  buildHips2FitsCutoutUrl,
  getFieldOverlayCatalogSources,
} from '../services/astronomyApi';
import type { WcsDetectionRow } from '../utils/astrometryEngine';

declare global {
  interface Window {
    A?: {
      init?: Promise<void>;
      aladin: (container: HTMLElement | string, options?: Record<string, unknown>) => AladinInstance;
      catalog?: (options?: Record<string, unknown>) => AladinCatalog;
      source?: (ra: number, dec: number, data?: Record<string, unknown>) => unknown;
    };
  }
}

interface AladinInstance {
  gotoRaDec: (ra: number, dec: number) => void;
  setFoV: (fovDeg: number) => void;
  setImageSurvey: (survey: string) => void;
  addCatalog?: (cat: AladinCatalog) => void;
  removeLayers?: () => void;
}

interface AladinCatalog {
  addSources: (sources: unknown[]) => void;
}

interface SkyCanvasHUDProps {
  target: TargetCatalogEntry;
  allTargets: TargetCatalogEntry[];
  detections?: WcsDetectionRow[];
  ra: number;
  dec: number;
  fov: number;
  epoch: EpochIndex;
  blinkFrame: 1 | 2;
  mode: ViewMode;
  filterWheel?: FilterWheelMode;
  motionFilter: MotionFilterQuery;
  catalogOverlays: CatalogOverlayState;
  activeOnTheFlySource: OnTheFlyFieldSource | null;
  isDrawerOpen?: boolean;
  isSplitView?: boolean;
  onViewportChange: (next: { ra?: number; dec?: number; fov?: number }) => void;
  onChangeFilterWheel?: (fw: FilterWheelMode) => void;
  onToggleCatalogOverlay: (key: keyof CatalogOverlayState) => void;
  onSelectOnTheFlySource: (source: OnTheFlyFieldSource | null) => void;
  onMarkDetectionAtCurrentEpoch?: (raDeg: number, decDeg: number) => void;
}

interface StarParticle {
  dx: number;
  dy: number;
  r: number;
  alpha: number;
  color: string;
  hasHairline: boolean;
}

function createStarfield(seed: number, count = 240): StarParticle[] {
  const list: StarParticle[] = [];
  for (let i = 0; i < count; i += 1) {
    const h1 = Math.sin(i * 12.9898 + seed * 1.13) * 43758.5453;
    const h2 = Math.sin(i * 78.233 + seed * 2.71) * 24634.6345;
    const h3 = Math.sin(i * 41.127 + seed * 5.03) * 19283.4712;
    const f1 = h1 - Math.floor(h1);
    const f2 = h2 - Math.floor(h2);
    const f3 = h3 - Math.floor(h3);

    list.push({
      dx: (f1 - 0.5) * 1.5,
      dy: (f2 - 0.5) * 1.5,
      r: f3 > 0.94 ? 1.4 : f3 > 0.75 ? 1.0 : 0.6,
      alpha: 0.2 + f3 * 0.6,
      color: f3 > 0.88 ? '#ECEEF2' : f3 > 0.65 ? '#D0D5DD' : '#98A2B3',
      hasHairline: i % 28 === 0,
    });
  }
  return list;
}

export function SkyCanvasHUD({
  target,
  allTargets,
  detections = [],
  ra,
  dec,
  fov,
  epoch,
  blinkFrame,
  mode,
  filterWheel = 'srgb',
  motionFilter,
  catalogOverlays,
  activeOnTheFlySource,
  isDrawerOpen = true,
  isSplitView = false,
  onViewportChange,
  onChangeFilterWheel,
  onToggleCatalogOverlay,
  onSelectOnTheFlySource,
  onMarkDetectionAtCurrentEpoch,
}: SkyCanvasHUDProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const aladinContainerRef = useRef<HTMLDivElement>(null);
  const aladinInstanceRef = useRef<AladinInstance | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [cursorSky, setCursorSky] = useState({ ra, dec });
  const [aladinReady, setAladinReady] = useState(false);
  const [hipsImgLoaded, setHipsImgLoaded] = useState(false);
  const [hipsImgError, setHipsImgError] = useState(false);

  const dragPanRef = useRef<{
    active: boolean;
    moved: boolean;
    startX: number;
    startY: number;
    startRa: number;
    startDec: number;
  }>({
    active: false,
    moved: false,
    startX: 0,
    startY: 0,
    startRa: ra,
    startDec: dec,
  });

  const activeEpochNumber: EpochIndex = mode === 'blink' ? blinkFrame : epoch;
  const activeEpoch = useMemo(
    () => target.epochs.find((e) => e.epoch === activeEpochNumber) ?? target.epochs[0],
    [activeEpochNumber, target.epochs],
  );

  const stars = useMemo(
    () => createStarfield(Math.round(target.raDeg * 5 + target.decDeg * 11)),
    [target.decDeg, target.raDeg],
  );

  const overlaySources = useMemo(
    () => getFieldOverlayCatalogSources(target.raDeg, target.decDeg, fov, target.id),
    [fov, target.decDeg, target.id, target.raDeg],
  );

  const hipsCutoutUrl = useMemo(() => {
    const fovBucket = Number(fov.toFixed(2));
    const raBucket = Number(ra.toFixed(4));
    const decBucket = Number(dec.toFixed(4));
    return buildHips2FitsCutoutUrl(raBucket, decBucket, fovBucket, filterWheel, 1024, 720);
  }, [dec, filterWheel, fov, ra]);

  // Reset image load state when URL changes
  useEffect(() => {
    setHipsImgLoaded(false);
    setHipsImgError(false);
  }, [hipsCutoutUrl]);

  // Initialize Aladin Lite v3 if script is available
  useEffect(() => {
    let cancelled = false;
    const container = aladinContainerRef.current;
    if (!container || typeof window === 'undefined') return;

    const tryInitAladin = async () => {
      try {
        if (!window.A) return;
        if (window.A.init) {
          await window.A.init;
        }
        if (cancelled || !aladinContainerRef.current) return;
        const opt = FILTER_WHEEL_OPTIONS.find((o) => o.id === filterWheel) ?? FILTER_WHEEL_OPTIONS[0];
        const instance = window.A.aladin(aladinContainerRef.current, {
          survey: opt.aladinSurveyId,
          fov,
          target: `${ra} ${dec}`,
          showReticle: false,
          showZoomControl: false,
          showFullscreenControl: false,
          showLayersControl: false,
          showGotoControl: false,
          showShareControl: false,
          showCatalog: true,
          showFrame: false,
          cooFrame: 'ICRSd',
        });
        aladinInstanceRef.current = instance;
        setAladinReady(true);
      } catch {
        // Fallback to native HiPS2FITS + procedural canvas
      }
    };

    tryInitAladin();
    const timer = window.setTimeout(tryInitAladin, 1400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  // Synchronize Aladin Lite viewport & survey when state changes
  useEffect(() => {
    const inst = aladinInstanceRef.current;
    if (!inst || !aladinReady) return;
    try {
      const opt = FILTER_WHEEL_OPTIONS.find((o) => o.id === filterWheel) ?? FILTER_WHEEL_OPTIONS[0];
      inst.setImageSurvey(opt.aladinSurveyId);
      inst.gotoRaDec(ra, dec);
      inst.setFoV(fov);
    } catch {
      // ignore
    }
  }, [aladinReady, dec, filterWheel, fov, ra]);

  // Render tactical HUD overlay: procedural background (when needed), Gaia/WISE catalog overlays,
  // multi-epoch trajectory, T2-T1 dipole, T1+T2 co-add reinforcement, and on-the-fly spectral marker
  useEffect(() => {
    const canvas = canvasRef.current;
    const host = hostRef.current;
    if (!canvas || !host) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId = 0;

    const render = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = host.getBoundingClientRect();
      const w = Math.max(1, Math.floor(rect.width));
      const h = Math.max(1, Math.floor(rect.height));

      if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
        canvas.width = w * dpr;
        canvas.height = h * dpr;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, w, h);

      const hasRealSkyBackground = (aladinReady || hipsImgLoaded) && mode !== 'diff';

      // If no live sky image or if in Difference (T2 - T1) mode, paint neutral deep space background
      if (!hasRealSkyBackground) {
        ctx.fillStyle = '#08090C';
        ctx.fillRect(0, 0, w, h);
      }

      const zoomFactor = Math.max(0.55, Math.min(2.6, target.defaultFov / Math.max(fov, 0.04)));
      const degPerPxX = fov / w;
      const degPerPxY = fov / h;
      const panOffsetX = (ra - target.raDeg) / Math.max(1e-6, degPerPxX);
      const panOffsetY = (dec - target.decDeg) / Math.max(1e-6, degPerPxY);

      const cx = w * 0.46 + panOffsetX;
      const cy = h * 0.48 + panOffsetY;

      if (!hasRealSkyBackground) {
        drawMockDeepSkyField(
          ctx,
          w,
          h,
          cx,
          cy,
          zoomFactor,
          target.skyRenderPreset,
          mode === 'diff',
        );
      }

      // 2. Crisp Pinpoint Reference Stars (subtle overlay when live sky is active, full when procedural)
      for (const st of stars) {
        const sx = cx + st.dx * w * Math.min(zoomFactor, 1.8);
        const sy = cy + st.dy * h * Math.min(zoomFactor, 1.8);
        if (sx < -10 || sx > w + 10 || sy < -10 || sy > h + 10) continue;

        ctx.globalAlpha =
          mode === 'diff'
            ? st.alpha * 0.22
            : mode === 'sum'
              ? Math.min(1, st.alpha * 0.85)
              : hasRealSkyBackground
                ? st.alpha * 0.32
                : st.alpha;
        ctx.fillStyle = st.color;
        ctx.beginPath();
        ctx.arc(sx, sy, mode === 'sum' ? st.r * 1.25 : st.r, 0, Math.PI * 2);
        ctx.fill();

        if (st.hasHairline && mode !== 'diff' && !hasRealSkyBackground) {
          ctx.strokeStyle = 'rgba(200, 205, 214, 0.18)';
          ctx.lineWidth = 0.7;
          ctx.beginPath();
          ctx.moveTo(sx - 7, sy);
          ctx.lineTo(sx + 7, sy);
          ctx.moveTo(sx, sy - 7);
          ctx.lineTo(sx, sy + 7);
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 1;

      const pxPerArcsec = 5.2 * Math.min(zoomFactor, 1.8);

      // 3. Gaia DR3 & AllWISE Astronomical Catalog Overlays (NASA Consideration)
      if (catalogOverlays.gaiaDr3 || catalogOverlays.allWise) {
        const halfFovArcsec = (fov * 3600) / 2;
        overlaySources.forEach((src) => {
          if (src.catalog === 'Gaia DR3' && !catalogOverlays.gaiaDr3) return;
          if (src.catalog === 'AllWISE' && !catalogOverlays.allWise) return;

          const sx = cx - (src.dxArcsec / Math.max(10, halfFovArcsec)) * (w * 0.36);
          const sy = cy - (src.dyArcsec / Math.max(10, halfFovArcsec)) * (h * 0.36);

          ctx.save();
          if (src.catalog === 'Gaia DR3') {
            // Gaia DR3: Crisp Indigo Diamond Marker
            ctx.strokeStyle = '#5C7CFA';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.moveTo(sx, sy - 7);
            ctx.lineTo(sx + 7, sy);
            ctx.lineTo(sx, sy + 7);
            ctx.lineTo(sx - 7, sy);
            ctx.closePath();
            ctx.stroke();

            ctx.fillStyle = '#A5B4FC';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(`Gaia (${src.magLabel})`, sx + 9, sy - 3);
          } else {
            // AllWISE: Seafoam Circle + Cross Marker
            ctx.strokeStyle = '#52B79A';
            ctx.lineWidth = 1.3;
            ctx.beginPath();
            ctx.arc(sx, sy, 6.5, 0, Math.PI * 2);
            ctx.stroke();

            ctx.fillStyle = '#8EC5B6';
            ctx.font = '9px "JetBrains Mono", monospace';
            ctx.fillText(`WISE (${src.magLabel})`, sx + 9, sy + 9);
          }
          ctx.restore();
        });
      }

      // 4. Multi-Epoch Trajectory Vector & Marked Positions (T1 -> T4)
      const epochCoords = target.epochs.map((ep) => ({
        label: ep.label,
        epoch: ep.epoch,
        x: cx - ep.raShiftArcsec * pxPerArcsec,
        y: cy - ep.decShiftArcsec * pxPerArcsec,
      }));

      if (epochCoords.length >= 2 && target.velocityArcsecYr >= 0.5) {
        ctx.save();
        ctx.strokeStyle = 'rgba(82, 183, 154, 0.5)';
        ctx.lineWidth = 1.2;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        epochCoords.forEach((pt, i) => {
          if (i === 0) ctx.moveTo(pt.x, pt.y);
          else ctx.lineTo(pt.x, pt.y);
        });
        ctx.stroke();
        ctx.setLineDash([]);

        epochCoords.forEach((pt) => {
          const isCurrent = pt.epoch === activeEpochNumber;
          ctx.fillStyle = isCurrent ? '#52B79A' : 'rgba(236, 238, 242, 0.55)';
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, isCurrent ? 3.2 : 2.0, 0, Math.PI * 2);
          ctx.fill();
        });
        ctx.restore();
      }

      // 5. Target Position at Active Epoch (Supports Normal, Blink, Diff T2-T1, and Sum T1+T2)
      const targetX = cx - activeEpoch.raShiftArcsec * pxPerArcsec;
      const targetY = cy - activeEpoch.decShiftArcsec * pxPerArcsec;

      if (mode === 'diff') {
        const t1 = epochCoords[0];
        const t2 = epochCoords[1] ?? epochCoords[0];

        // Negative T1 lobe
        const negGrad = ctx.createRadialGradient(t1.x, t1.y, 1, t1.x, t1.y, 18);
        negGrad.addColorStop(0, 'rgba(244, 63, 94, 0.85)');
        negGrad.addColorStop(1, 'rgba(244, 63, 94, 0)');
        ctx.fillStyle = negGrad;
        ctx.beginPath();
        ctx.arc(t1.x, t1.y, 18, 0, Math.PI * 2);
        ctx.fill();

        // Positive T2 lobe
        const posGrad = ctx.createRadialGradient(t2.x, t2.y, 1, t2.x, t2.y, 20);
        posGrad.addColorStop(0, 'rgba(82, 183, 154, 0.92)');
        posGrad.addColorStop(1, 'rgba(82, 183, 154, 0)');
        ctx.fillStyle = posGrad;
        ctx.beginPath();
        ctx.arc(t2.x, t2.y, 20, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ECEEF2';
        ctx.fillText(`${target.name.toUpperCase()} [RESTA T₂ − T₁]`, t2.x + 14, t2.y + 16);
      } else if (mode === 'sum') {
        const t1 = epochCoords[0];
        const t2 = epochCoords[1] ?? epochCoords[0];

        // Co-added T1 + T2 reinforced signal (SNR x1.41)
        for (const pt of [t1, t2]) {
          const sumGrad = ctx.createRadialGradient(pt.x, pt.y, 1, pt.x, pt.y, 28);
          sumGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
          sumGrad.addColorStop(0.3, 'rgba(92, 124, 250, 0.55)');
          sumGrad.addColorStop(0.65, 'rgba(82, 183, 154, 0.22)');
          sumGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
          ctx.fillStyle = sumGrad;
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 28, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ECEEF2';
        ctx.fillText(
          `${target.name.toUpperCase()} [SUMA T₁ + T₂ • SNR ×1.41]`,
          t2.x + 14,
          t2.y + 16,
        );
      } else {
        const glowRadius = 26 * Math.max(0.65, Math.min(1.45, activeEpoch.fluxScale));
        const glow = ctx.createRadialGradient(targetX, targetY, 1, targetX, targetY, glowRadius);
        glow.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
        glow.addColorStop(0.25, 'rgba(82, 183, 154, 0.42)');
        glow.addColorStop(0.6, 'rgba(82, 183, 154, 0.1)');
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(targetX, targetY, glowRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(targetX, targetY, 2.4, 0, Math.PI * 2);
        ctx.fill();

        // Clean Astrometric Reticle
        ctx.strokeStyle = 'rgba(236, 238, 242, 0.55)';
        ctx.lineWidth = 0.9;
        ctx.beginPath();
        ctx.moveTo(targetX - 20, targetY);
        ctx.lineTo(targetX - 6, targetY);
        ctx.moveTo(targetX + 6, targetY);
        ctx.lineTo(targetX + 20, targetY);
        ctx.moveTo(targetX, targetY - 20);
        ctx.lineTo(targetX, targetY - 6);
        ctx.moveTo(targetX, targetY + 6);
        ctx.lineTo(targetX, targetY + 20);
        ctx.stroke();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#ECEEF2';
        ctx.fillText(
          `${target.name.toUpperCase()} [${activeEpoch.label}]`,
          targetX + 12,
          targetY + 16,
        );
      }

      // 6. On-The-Fly Clicked Source Marker (102-band dynamic spectrum probe)
      if (activeOnTheFlySource) {
        const halfFovArcsec = (fov * 3600) / 2;
        const ox = cx - (activeOnTheFlySource.dxArcsec / Math.max(10, halfFovArcsec)) * (w * 0.5);
        const oy = cy - (activeOnTheFlySource.dyArcsec / Math.max(10, halfFovArcsec)) * (h * 0.5);

        ctx.save();
        ctx.strokeStyle = '#52B79A';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(ox, oy, 11, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = '#52B79A';
        ctx.beginPath();
        ctx.arc(ox, oy, 2.8, 0, Math.PI * 2);
        ctx.fill();

        ctx.font = '10px "JetBrains Mono", monospace';
        ctx.fillStyle = '#52B79A';
        ctx.fillText(`⚡ ${activeOnTheFlySource.label} [102B AL VUELO]`, ox + 14, oy - 6);
        ctx.restore();
      }

      // 7. User-Marked Detections Overlay
      const userDetections = detections.filter((d) => d.source === 'USER_MARKED');
      userDetections.forEach((ud, idx) => {
        const ux = cx - (ud.raDeg - target.raDeg) * 3600 * pxPerArcsec;
        const uy = cy - (ud.decDeg - target.decDeg) * 3600 * pxPerArcsec;
        ctx.strokeStyle = '#5C7CFA';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.arc(ux, uy, 6, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = '#A5B4FC';
        ctx.font = '9px "JetBrains Mono", monospace';
        ctx.fillText(`M${idx + 1}`, ux + 8, uy - 4);
      });

      // 8. Motion Filter Candidates
      if (motionFilter.active) {
        const matching = allTargets.filter(
          (item) =>
            item.velocityArcsecYr >= motionFilter.minVelocityArcsecYr ||
            item.brightnessChangeMag >= motionFilter.minBrightnessChangeMag,
        );
        matching.forEach((m, idx) => {
          const ox = cx + (idx % 2 === 0 ? -1 : 1) * (95 + idx * 28);
          const oy = cy + (idx < 2 ? -1 : 1) * (65 + idx * 18);
          ctx.strokeStyle = 'rgba(82, 183, 154, 0.7)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(ox, oy, 8, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = '#ECEEF2';
          ctx.font = '9px "JetBrains Mono", monospace';
          ctx.fillText(m.name, ox + 11, oy + 3);
        });
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animId);
  }, [
    activeEpoch,
    activeEpochNumber,
    activeOnTheFlySource,
    aladinReady,
    allTargets,
    catalogOverlays,
    dec,
    detections,
    fov,
    hipsImgLoaded,
    mode,
    motionFilter,
    overlaySources,
    ra,
    stars,
    target,
  ]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.5;
      const ny = 0.5 - (e.clientY - rect.top) / Math.max(1, rect.height);
      setCursorSky({
        ra: normalizeRa(ra + nx * fov),
        dec: clampDec(dec + ny * fov),
      });

      if (dragPanRef.current.active) {
        const dx = e.clientX - dragPanRef.current.startX;
        const dy = e.clientY - dragPanRef.current.startY;
        if (Math.hypot(dx, dy) > 4) {
          dragPanRef.current.moved = true;
        }
        const degPerPx = fov / Math.max(240, rect.width);
        onViewportChange({
          ra: Number(normalizeRa(dragPanRef.current.startRa - dx * degPerPx).toFixed(5)),
          dec: Number(clampDec(dragPanRef.current.startDec + dy * degPerPx).toFixed(5)),
        });
      }
    },
    [dec, fov, onViewportChange, ra],
  );

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.ctrlKey) return;
    if ((e.target as HTMLElement).closest('button')) return;
    dragPanRef.current = {
      active: true,
      moved: false,
      startX: e.clientX,
      startY: e.clientY,
      startRa: ra,
      startDec: dec,
    };
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    const wasActive = dragPanRef.current.active;
    const wasMoved = dragPanRef.current.moved;
    dragPanRef.current.active = false;

    // If user clicked cleanly on the sky without dragging, generate a 102-band spectrum on the fly!
    if (wasActive && !wasMoved && !(e.target as HTMLElement).closest('button')) {
      const rect = e.currentTarget.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / Math.max(1, rect.width) - 0.46;
      const ny = 0.48 - (e.clientY - rect.top) / Math.max(1, rect.height);
      const cosDec = Math.max(0.1, Math.cos((dec * Math.PI) / 180));
      const clickedRa = normalizeRa(ra - (nx * fov) / cosDec);
      const clickedDec = clampDec(dec + ny * fov);
      const distFromTargetDeg = Math.hypot((clickedRa - target.raDeg) * cosDec, clickedDec - target.decDeg);

      // If clicking very close to the primary target (< 4% of FoV), restore primary target spectrum
      if (distFromTargetDeg < fov * 0.04) {
        onSelectOnTheFlySource(null);
      } else {
        const otf = generateOnTheFlySourceAtCoordinate(clickedRa, clickedDec, target);
        onSelectOnTheFlySource(otf);
      }
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    const factor = e.deltaY > 0 ? 1.12 : 0.89;
    const nextFov = Number(Math.max(0.05, Math.min(4.0, fov * factor)).toFixed(3));
    onViewportChange({ fov: nextFov });
  };

  const zoomFactor = Math.max(0.55, Math.min(2.6, target.defaultFov / Math.max(fov, 0.04)));

  return (
    <div
      ref={hostRef}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        dragPanRef.current.active = false;
      }}
      onWheel={handleWheel}
      className="relative w-full h-full bg-[#08090C] overflow-hidden cursor-crosshair select-none"
    >
      {/* LAYER A: Aladin Lite v3 Official CDS Sky Container */}
      <div
        ref={aladinContainerRef}
        className={`absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300 ${
          aladinReady && mode !== 'diff' ? 'opacity-85' : 'opacity-0'
        }`}
      />

      {/* LAYER B: CORS-Safe Native DOM <img> HiPS2FITS Cutout (No crossOrigin anonymous tainting) */}
      {!aladinReady && !hipsImgError && mode !== 'diff' && (
        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none overflow-hidden">
          <img
            src={hipsCutoutUrl}
            alt={`Cielo infrarrojo CDS ${target.name}`}
            onLoad={() => setHipsImgLoaded(true)}
            onError={() => setHipsImgError(true)}
            style={{
              transform: `scale(${Math.min(2.2, Math.max(0.75, zoomFactor))})`,
              filter:
                filterWheel === 'raw'
                  ? 'grayscale(100%) contrast(125%)'
                  : mode === 'sum'
                    ? 'saturate(135%) contrast(125%) brightness(115%)'
                    : filterWheel === 'wavelength'
                      ? 'saturate(135%) contrast(112%)'
                      : 'none',
            }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${
              hipsImgLoaded ? 'opacity-80' : 'opacity-0'
            }`}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'radial-gradient(circle at 46% 48%, rgba(8,9,12,0) 20%, rgba(8,9,12,0.55) 75%, rgba(8,9,12,0.96) 100%)',
            }}
          />
        </div>
      )}

      {/* LAYER C: Tactical Astrometric & Catalog Overlay Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

      {/* Bottom-Left Ordered Control Bar: Rueda de Filtros + Capas Gaia/WISE + Espectro al Vuelo + Marcar Punto */}
      <div
        className={`absolute z-20 flex flex-wrap items-center gap-2 pointer-events-auto transition-all duration-300 ${
          isSplitView
            ? 'bottom-3 left-3 right-[595px] lg:right-[635px] xl:right-[675px]'
            : isDrawerOpen
              ? 'bottom-[88px] left-3 right-[355px]'
              : 'bottom-[88px] left-3 right-3'
        }`}
      >
        {/* Rueda de Filtros (Trello Requirement: sRGB | Raw | Wavelength) */}
        {onChangeFilterWheel && (
          <div className="hud-card-pill rounded-xl p-1 flex items-center gap-1 text-[10px] font-mono">
            <span className="px-2 text-[#8E94A0] hidden sm:inline">Filtro:</span>
            {FILTER_WHEEL_OPTIONS.map((fw) => (
              <button
                key={fw.id}
                type="button"
                onClick={() => onChangeFilterWheel(fw.id)}
                title={fw.description}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filterWheel === fw.id
                    ? 'bg-white/[0.16] text-white font-semibold'
                    : 'text-[#8E94A0] hover:text-white'
                }`}
              >
                {fw.shortLabel}
              </button>
            ))}
          </div>
        )}

        {/* Superposición de Catálogos Gaia DR3 & AllWISE (NASA Consideration) */}
        <div className="hud-card-pill rounded-xl p-1 flex items-center gap-1 text-[10px] font-mono">
          <span className="px-2 text-[#8E94A0] hidden md:inline flex items-center gap-1">
            <Database className="w-3 h-3 inline mr-1 text-[#5C7CFA]" />
            Capas:
          </span>
          <button
            type="button"
            onClick={() => onToggleCatalogOverlay('gaiaDr3')}
            title="Superponer fuentes astrométricas de la misión Gaia DR3"
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              catalogOverlays.gaiaDr3
                ? 'bg-[#5C7CFA]/25 text-white border border-[#5C7CFA]/50 font-semibold'
                : 'text-[#8E94A0] hover:text-white border border-transparent'
            }`}
          >
            Gaia DR3
          </button>
          <button
            type="button"
            onClick={() => onToggleCatalogOverlay('allWise')}
            title="Superponer catálogo infrarrojo de la misión WISE (AllWISE)"
            className={`px-2.5 py-1 rounded-lg transition-colors ${
              catalogOverlays.allWise
                ? 'bg-[#52B79A]/25 text-white border border-[#52B79A]/50 font-semibold'
                : 'text-[#8E94A0] hover:text-white border border-transparent'
            }`}
          >
            WISE
          </button>
        </div>

        {/* Marcar Posición en Época Actual (Para el Expediente de Candidato) */}
        {onMarkDetectionAtCurrentEpoch && (
          <button
            type="button"
            onClick={() => {
              const cosDec = Math.max(0.1, Math.cos((target.decDeg * Math.PI) / 180));
              const measuredRa = target.raDeg + activeEpoch.raShiftArcsec / (3600 * cosDec);
              const measuredDec = target.decDeg + activeEpoch.decShiftArcsec / 3600;
              onMarkDetectionAtCurrentEpoch(measuredRa, measuredDec);
            }}
            title="Registrar posición astrométrica de esta época en el Expediente de Candidato"
            className="hud-card-pill px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#ECEEF2] hover:text-white flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Crosshair className="w-3 h-3 text-[#52B79A]" />
            <span>Marcar ({activeEpoch.label})</span>
          </button>
        )}

        {/* Indicador de Espectro Sobre la Marcha (On-The-Fly) */}
        {activeOnTheFlySource && onSelectOnTheFlySource ? (
          <div
            title={`Espectro activo al vuelo: ${activeOnTheFlySource.label} (Clic en × para restaurar)`}
            className="hud-card-pill px-2.5 py-1.5 rounded-xl text-[10px] font-mono text-[#52B79A] border border-[#52B79A]/45 bg-[#141A17]/85 flex items-center gap-1.5 shadow-sm min-w-0"
          >
            <Sparkles className="w-3 h-3 text-[#52B79A] shrink-0" />
            <span className="text-[#8E94A0] shrink-0 hidden sm:inline">Al Vuelo:</span>
            <span className="font-semibold text-white truncate max-w-[110px] sm:max-w-[150px] md:max-w-[190px]">
              {activeOnTheFlySource.label}
            </span>
            <button
              type="button"
              onClick={() => onSelectOnTheFlySource(null)}
              className="p-0.5 rounded hover:bg-white/10 text-[#8E94A0] hover:text-white transition-colors shrink-0 ml-0.5"
              title="Restaurar espectro base del objetivo"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : !isSplitView ? (
          <div className="hidden 2xl:flex items-center gap-2 hud-card-pill px-3 py-1.5 rounded-xl text-[10px] font-mono text-[#8E94A0] truncate">
            <Globe className="w-3 h-3 text-[#52B79A] shrink-0" />
            <span className="truncate">
              {aladinReady
                ? `Aladin Lite v3 CDS (${filterWheel.toUpperCase()})`
                : hipsImgLoaded
                  ? `CDS HiPS (${filterWheel.toUpperCase()})`
                  : `Motor Híbrido (${filterWheel.toUpperCase()})`}
            </span>
            <span className="text-[#525866]">|</span>
            <span className="text-[#C8CDD6] truncate">
              Clic en cualquier punto → Espectro 102B al vuelo ({cursorSky.ra.toFixed(3)}°,{' '}
              {cursorSky.dec >= 0 ? '+' : ''}
              {cursorSky.dec.toFixed(3)}°)
            </span>
          </div>
        ) : null}
        {/* Zoom Controls integrados en la barra */}
        <div className="hud-card-pill rounded-xl flex items-center divide-x divide-white/[0.08] overflow-hidden">
          <button
            type="button"
            onClick={() => onViewportChange({ fov: Number(Math.max(0.05, fov * 0.8).toFixed(3)) })}
            title="Acercar (Zoom In)"
            className="p-1.5 text-[#C8CDD6] hover:text-white hover:bg-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onViewportChange({ fov: Number(Math.min(4.0, fov * 1.25).toFixed(3)) })}
            title="Alejar (Zoom Out)"
            className="p-1.5 text-[#C8CDD6] hover:text-white hover:bg-white/10 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              onSelectOnTheFlySource(null);
              onViewportChange({ ra: target.raDeg, dec: target.decDeg, fov: target.defaultFov });
            }}
            title="Centrar objetivo"
            className="p-1.5 text-[#C8CDD6] hover:text-white hover:bg-white/10 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
