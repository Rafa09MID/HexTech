import type {
  DetectorArraySummary,
  EpochIndex,
  ExplorerUrlState,
  LayoutViewMode,
  LvfDetectorBand,
  MolecularLensId,
  OnTheFlyFieldSource,
  SpectralChannel,
  TargetCatalogEntry,
  ViewMode,
} from '../types/spherex';

export interface SpectrumProfile {
  baseFlux: number;
  tEffK: number;
  h2oDepth: number;
  ch4Depth: number;
  co2Depth: number;
  coDepth: number;
  nh3Depth: number;
  dustExcess: number;
  t2Scale: number;
  t2Tilt: number;
  seed: number;
}

export const LVF_SPANS: Array<{
  band: LvfDetectorBand;
  start: number;
  end: number;
  count: number;
  keyMolecules: string;
}> = [
  { band: 'LVF-1', start: 0.75, end: 1.11, count: 17, keyMolecules: 'Continuo Óptico-NIR / TiO / FeH' },
  { band: 'LVF-2', start: 1.11, end: 1.64, count: 17, keyMolecules: 'Vapor H₂O (1.40 μm) / NH₃ (1.51 μm)' },
  { band: 'LVF-3', start: 1.64, end: 2.42, count: 17, keyMolecules: 'CH₄ (1.66, 2.25 μm) / H₂O (1.90 μm)' },
  { band: 'LVF-4', start: 2.42, end: 3.82, count: 17, keyMolecules: 'Hielo H₂O (2.80 μm) / CH₄ ν₃ (3.32 μm) / PAH' },
  { band: 'LVF-5', start: 3.82, end: 4.42, count: 17, keyMolecules: 'Hielo y Gas CO₂ (4.26 μm)' },
  { band: 'LVF-6', start: 4.42, end: 5.0, count: 17, keyMolecules: 'CO Fundamental (4.67 μm) / Exceso Térmico' },
];

function gaussian(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z);
}

function deterministicJitter(channel: number, seed: number): number {
  const s = Math.sin(channel * 12.9898 + seed * 78.233) * 43758.5453;
  return s - Math.floor(s) - 0.5;
}

/**
 * Generates an exact 102-band SPHEREx LVF spectrum (0.75 - 5.00 um)
 * normalized smoothly for clear visual comparison and molecular band extraction.
 */
export function generate102BandSpectrum(profile: SpectrumProfile): SpectralChannel[] {
  const result: SpectralChannel[] = [];
  let channel = 1;

  for (const span of LVF_SPANS) {
    const step = (span.end - span.start) / span.count;
    for (let i = 0; i < span.count; i += 1) {
      const wavelengthUm = Number((span.start + (i + 0.5) * step).toFixed(3));

      const x = 14388 / (wavelengthUm * Math.max(profile.tEffK, 220));
      const refX = 14388 / (1.8 * Math.max(profile.tEffK, 220));
      const planck = 1 / (Math.pow(wavelengthUm, 3) * Math.expm1(Math.min(x, 38)));
      const planckRef = 1 / (Math.pow(1.8, 3) * Math.expm1(Math.min(refX, 38)));
      let continuum = profile.baseFlux * Math.min(2.2, planck / Math.max(planckRef, 1e-9));

      if (profile.dustExcess > 0) {
        continuum += profile.baseFlux * profile.dustExcess * Math.pow(wavelengthUm / 3.2, 2.0);
      }

      const h2oAbs =
        profile.h2oDepth *
        (0.65 * gaussian(wavelengthUm, 1.4, 0.08) +
          0.85 * gaussian(wavelengthUm, 1.9, 0.11) +
          1.0 * gaussian(wavelengthUm, 2.8, 0.17));
      const ch4Abs =
        profile.ch4Depth *
        (0.7 * gaussian(wavelengthUm, 1.66, 0.07) +
          0.75 * gaussian(wavelengthUm, 2.25, 0.09) +
          1.0 * gaussian(wavelengthUm, 3.32, 0.14));
      const co2Abs = profile.co2Depth * gaussian(wavelengthUm, 4.26, 0.09);
      const coAbs = profile.coDepth * gaussian(wavelengthUm, 4.67, 0.09);
      const nh3Abs =
        profile.nh3Depth *
        (0.75 * gaussian(wavelengthUm, 1.51, 0.06) + 1.0 * gaussian(wavelengthUm, 2.98, 0.09));

      const transmission = Math.max(0.08, 1 - h2oAbs - ch4Abs - co2Abs - coAbs - nh3Abs);
      const jitter = 1 + deterministicJitter(channel, profile.seed) * 0.035;
      const fluxT1 = Number(Math.max(0.03, continuum * transmission * jitter).toFixed(3));

      const tilt = 1 + profile.t2Tilt * ((wavelengthUm - 2.2) / 2.8);
      const jitterT2 = 1 + deterministicJitter(channel + 140, profile.seed + 5) * 0.035;
      const fluxT2 = Number(
        Math.max(0.03, fluxT1 * profile.t2Scale * tilt * jitterT2).toFixed(3),
      );
      const fluxDiff = Number((fluxT2 - fluxT1).toFixed(3));
      const fluxSum = Number((fluxT1 + fluxT2).toFixed(3));
      const snr = Number((28 + (fluxT1 / Math.max(profile.baseFlux, 0.1)) * 95).toFixed(1));

      result.push({
        channel,
        wavelengthUm,
        lvfBand: span.band,
        fluxT1,
        fluxT2,
        fluxDiff,
        fluxSum,
        snr,
      });

      channel += 1;
    }
  }

  return result;
}

/**
 * Sums separately all spectral channels taken by each of the 6 SPHEREx LVF detector arrays
 * (LVF-1 to LVF-6, 17 bands each) to improve the signal-to-noise ratio (SNR gain = sqrt(17) ≈ 4.12x).
 */
export function summarize6DetectorArrays(spectrum102: SpectralChannel[]): DetectorArraySummary[] {
  return LVF_SPANS.map((span, idx) => {
    const channels = spectrum102.filter((ch) => ch.lvfBand === span.band);
    const n = Math.max(1, channels.length);
    const sumFluxT1 = Number(channels.reduce((acc, c) => acc + c.fluxT1, 0).toFixed(3));
    const sumFluxT2 = Number(channels.reduce((acc, c) => acc + c.fluxT2, 0).toFixed(3));
    const sumFluxDiff = Number((sumFluxT2 - sumFluxT1).toFixed(3));
    const sumFluxCombined = Number((sumFluxT1 + sumFluxT2).toFixed(3));
    const meanFluxT2 = Number((sumFluxT2 / n).toFixed(3));

    const meanSingleSnr = channels.reduce((acc, c) => acc + c.snr, 0) / n;
    const snrGainFactor = Number(Math.sqrt(n).toFixed(2));
    const coaddedSnr = Number((meanSingleSnr * snrGainFactor).toFixed(1));

    const startCh = idx * 17 + 1;
    const endCh = startCh + n - 1;

    return {
      band: span.band,
      wavelengthRangeUm: [span.start, span.end],
      channelRange: [startCh, endCh],
      keyMolecules: span.keyMolecules,
      sumFluxT1,
      sumFluxT2,
      sumFluxDiff,
      sumFluxCombined,
      meanFluxT2,
      singleChannelSnr: Number(meanSingleSnr.toFixed(1)),
      coaddedSnr,
      snrGainFactor,
    };
  });
}

/**
 * Generates an on-the-fly 102-band SPHEREx spectrum and AI wavelength description
 * for any arbitrary celestial coordinate or field source clicked by the user.
 */
export function generateOnTheFlySourceAtCoordinate(
  raDeg: number,
  decDeg: number,
  parentTarget: TargetCatalogEntry,
): OnTheFlyFieldSource {
  const normRa = normalizeRa(raDeg);
  const clampedDec = clampDec(decDeg);
  const cosDec = Math.max(0.1, Math.cos((clampedDec * Math.PI) / 180));
  const dxArcsec = Number(((normRa - parentTarget.raDeg) * 3600 * cosDec).toFixed(2));
  const dyArcsec = Number(((clampedDec - parentTarget.decDeg) * 3600).toFixed(2));

  const hash = Math.abs(Math.round(normRa * 10000 + clampedDec * 10000));
  const archetypeIdx = hash % 4;

  const raHmsCompact = formatRaHms(normRa).replace(/[hms.]/g, '').slice(0, 6);
  const decSign = clampedDec >= 0 ? '+' : '-';
  const decDmsCompact = formatDecDms(clampedDec).replace(/[°'".+-]/g, '').slice(0, 6);
  const coordDesignation = `SPHEREx J${raHmsCompact}${decSign}${decDmsCompact}`;

  if (archetypeIdx === 0) {
    const spectrum102 = generate102BandSpectrum({
      baseFlux: 0.72,
      tEffK: 850,
      h2oDepth: 0.54,
      ch4Depth: 0.61,
      co2Depth: 0.12,
      coDepth: 0.21,
      nh3Depth: 0.24,
      dustExcess: 0.14,
      t2Scale: 1.04,
      t2Tilt: 0.05,
      seed: (hash % 97) + 17,
    });
    return {
      id: `otf-${hash}`,
      label: `Candidato T/Y (${coordDesignation.slice(-11)})`,
      designation: coordDesignation,
      raDeg: Number(normRa.toFixed(5)),
      decDeg: Number(clampedDec.toFixed(5)),
      dxArcsec,
      dyArcsec,
      sourceClass: 'Sub-Brown Dwarf Candidate (Enana Marrón T8/Y0)',
      spectralType: 'T8V',
      tEffK: 850,
      dominantMolecules: ['ch4', 'h2o', 'nh3'],
      aiConfidencePct: 94,
      aiSummary:
        'Espectro generado al vuelo (102 bandas): Fuerte absorción combinada de metano (CH₄ en 1.66 y 3.32 μm) y vapor de agua (H₂O en 1.4/1.9 μm) en detectores LVF-2 a LVF-4, con pico térmico en 4.5 μm. Perfil subestelar frío sin contraparte óptica en Gaia DR3.',
      wiseId: `WISEA J${raHmsCompact}${decSign}${decDmsCompact}`,
      w1Mag: 16.42,
      w2Mag: 14.18,
      pmArcsecYr: 1.84,
      spectrum102,
    };
  }

  if (archetypeIdx === 1) {
    const spectrum102 = generate102BandSpectrum({
      baseFlux: 0.81,
      tEffK: 3250,
      h2oDepth: 0.38,
      ch4Depth: 0.05,
      co2Depth: 0.11,
      coDepth: 0.29,
      nh3Depth: 0.02,
      dustExcess: 0.02,
      t2Scale: 1.01,
      t2Tilt: 0.01,
      seed: (hash % 89) + 31,
    });
    return {
      id: `otf-${hash}`,
      label: `Estrella M-Dwarf (${coordDesignation.slice(-11)})`,
      designation: coordDesignation,
      raDeg: Number(normRa.toFixed(5)),
      decDeg: Number(clampedDec.toFixed(5)),
      dxArcsec,
      dyArcsec,
      sourceClass: 'Foreground M3.5V Dwarf (Gaia DR3 + AllWISE)',
      spectralType: 'M3.5V',
      tEffK: 3250,
      dominantMolecules: ['h2o', 'co'],
      aiConfidencePct: 96,
      aiSummary:
        'Espectro generado al vuelo (102 bandas): Continuo fotosférico de ~3250 K dominado en LVF-1/LVF-2 con bandas de H₂O (1.4/1.9 μm) y banda fundamental de CO (4.67 μm en LVF-6). Fuente registrada en Gaia DR3 y AllWISE.',
      gaiaId: `Gaia DR3 44728${String(hash).slice(0, 9)}`,
      wiseId: `WISEA J${raHmsCompact}${decSign}${decDmsCompact}`,
      gMag: 13.85,
      w1Mag: 10.12,
      w2Mag: 9.94,
      pmArcsecYr: 0.42,
      spectrum102,
    };
  }

  if (archetypeIdx === 2) {
    const spectrum102 = generate102BandSpectrum({
      baseFlux: 0.68,
      tEffK: 1950,
      h2oDepth: 0.49,
      ch4Depth: 0.14,
      co2Depth: 0.44,
      coDepth: 0.36,
      nh3Depth: 0.06,
      dustExcess: 0.42,
      t2Scale: 1.18,
      t2Tilt: 0.12,
      seed: (hash % 73) + 53,
    });
    return {
      id: `otf-${hash}`,
      label: `Fuente Hielo H₂O/CO₂ (${coordDesignation.slice(-11)})`,
      designation: coordDesignation,
      raDeg: Number(normRa.toFixed(5)),
      decDeg: Number(clampedDec.toFixed(5)),
      dxArcsec,
      dyArcsec,
      sourceClass: 'Ice-Rich Envelope / Solar System or YSO Candidate',
      spectralType: 'Ice-Rich IR',
      tEffK: 1950,
      dominantMolecules: ['h2o', 'co2', 'co'],
      aiConfidencePct: 93,
      aiSummary:
        'Espectro generado al vuelo (102 bandas): Profunda absorción de hielo de agua a 2.80 μm (LVF-4) y dióxido de carbono a 4.26 μm (LVF-5), acompañada de exceso térmico infrarrojo en LVF-6. Consistente con coma rica en volátiles o envoltura circunestelar.',
      wiseId: `WISEA J${raHmsCompact}${decSign}${decDmsCompact}`,
      w1Mag: 15.1,
      w2Mag: 13.45,
      pmArcsecYr: 2.65,
      spectrum102,
    };
  }

  const spectrum102 = generate102BandSpectrum({
    baseFlux: 0.76,
    tEffK: 3900,
    h2oDepth: 0.22,
    ch4Depth: 0.28,
    co2Depth: 0.19,
    coDepth: 0.21,
    nh3Depth: 0.05,
    dustExcess: 0.26,
    t2Scale: 1.07,
    t2Tilt: 0.04,
    seed: (hash % 83) + 67,
  });
  return {
    id: `otf-${hash}`,
    label: `Fuente PAH / Galaxia IR (${coordDesignation.slice(-11)})`,
    designation: coordDesignation,
    raDeg: Number(normRa.toFixed(5)),
    decDeg: Number(clampedDec.toFixed(5)),
    dxArcsec,
    dyArcsec,
    sourceClass: 'Background Star-Forming Galaxy / PAH 3.3 μm Emitter',
    spectralType: 'PAH-IR',
    tEffK: 3900,
    dominantMolecules: ['ch4', 'co2', 'co'],
    aiConfidencePct: 91,
    aiSummary:
      'Espectro generado al vuelo (102 bandas): Rasgo aromático en la banda de 3.3 μm (LVF-4) y continuo infrarrojo moderado en LVF-5/LVF-6. Posición estacionaria en Gaia DR3 / AllWISE; útil como referencia astrométrica de fondo.',
    gaiaId: `Gaia DR3 44729${String(hash).slice(0, 9)}`,
    wiseId: `WISEA J${raHmsCompact}${decSign}${decDmsCompact}`,
    gMag: 18.4,
    w1Mag: 14.3,
    w2Mag: 13.6,
    pmArcsecYr: 0.01,
    spectrum102,
  };
}

export function normalizeRa(ra: number): number {
  const m = ra % 360;
  return m < 0 ? m + 360 : m;
}

export function clampDec(dec: number): number {
  return Math.max(-90, Math.min(90, dec));
}

export function formatRaHms(raDeg: number): string {
  const hoursTotal = normalizeRa(raDeg) / 15;
  const h = Math.floor(hoursTotal);
  const mFloat = (hoursTotal - h) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${String(h).padStart(2, '0')}h${String(m).padStart(2, '0')}m${s.toFixed(2).padStart(5, '0')}s`;
}

export function formatDecDms(decDeg: number): string {
  const clamped = clampDec(decDeg);
  const sign = clamped >= 0 ? '+' : '-';
  const abs = Math.abs(clamped);
  const d = Math.floor(abs);
  const mFloat = (abs - d) * 60;
  const m = Math.floor(mFloat);
  const s = (mFloat - m) * 60;
  return `${sign}${String(d).padStart(2, '0')}°${String(m).padStart(2, '0')}'${s.toFixed(1).padStart(4, '0')}"`;
}

export function parseRaDecInput(raw: string): { ra: number; dec: number } | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const decMatch = trimmed.match(/^([+-]?\d+(?:\.\d+)?)\s*(?:,|\s+)\s*([+-]?\d+(?:\.\d+)?)$/);
  if (decMatch) {
    const ra = Number(decMatch[1]);
    const dec = Number(decMatch[2]);
    if (Number.isFinite(ra) && Number.isFinite(dec) && ra >= -360 && ra <= 360 && dec >= -90 && dec <= 90) {
      return { ra: Number(normalizeRa(ra).toFixed(5)), dec: Number(clampDec(dec).toFixed(5)) };
    }
  }

  const sexMatch = trimmed.match(
    /^(\d{1,2})[h:\s]+(\d{1,2})[m:\s]+(\d{1,2}(?:\.\d+)?)s?\s*[,;\s]+\s*([+-]?\d{1,2})[d°:\s]+(\d{1,2})[m':\s]+(\d{1,2}(?:\.\d+)?)[s"]?$/i,
  );
  if (sexMatch) {
    const h = Number(sexMatch[1]);
    const m = Number(sexMatch[2]);
    const s = Number(sexMatch[3]);
    const dStr = sexMatch[4];
    const sign = dStr.startsWith('-') ? -1 : 1;
    const dAbs = Math.abs(Number(dStr));
    const dm = Number(sexMatch[5]);
    const ds = Number(sexMatch[6]);
    if (h < 24 && m < 60 && s < 60 && dAbs <= 90 && dm < 60 && ds < 60) {
      return {
        ra: Number(normalizeRa((h + m / 60 + s / 3600) * 15).toFixed(5)),
        dec: Number(clampDec(sign * (dAbs + dm / 60 + ds / 3600)).toFixed(5)),
      };
    }
  }

  return null;
}

const VALID_MODES = new Set<ViewMode>(['normal', 'blink', 'diff', 'sum']);
const VALID_VIEWS = new Set<LayoutViewMode>(['hud', 'split', 'nested']);
const VALID_LENSES = new Set<MolecularLensId>(['all', 'h2o', 'ch4', 'co2', 'co', 'nh3']);

export function parseExplorerUrlParams(searchParams: URLSearchParams): ExplorerUrlState {
  const target = searchParams.get('target') || 'barnards-star';
  const raParam = searchParams.get('ra');
  const decParam = searchParams.get('dec');
  const fovParam = searchParams.get('fov');
  const epochParam = searchParams.get('epoch');

  const raRaw = raParam !== null && raParam.trim() !== '' ? Number(raParam) : NaN;
  const decRaw = decParam !== null && decParam.trim() !== '' ? Number(decParam) : NaN;
  const fovRaw = fovParam !== null && fovParam.trim() !== '' ? Number(fovParam) : NaN;
  const epochRaw = epochParam !== null && epochParam.trim() !== '' ? Number(epochParam) : NaN;
  const modeRaw = searchParams.get('mode') as ViewMode | null;
  const viewRaw = searchParams.get('view') as LayoutViewMode | null;
  const lensRaw = searchParams.get('lens') as MolecularLensId | null;

  const epoch: EpochIndex =
    epochRaw === 1 || epochRaw === 2 || epochRaw === 3 || epochRaw === 4 ? epochRaw : 1;

  return {
    target,
    ra: Number.isFinite(raRaw) ? normalizeRa(raRaw) : 269.4521,
    dec: Number.isFinite(decRaw) ? clampDec(decRaw) : 4.6934,
    fov: Number.isFinite(fovRaw) ? Math.max(0.04, Math.min(8, fovRaw)) : 0.15,
    epoch,
    mode: modeRaw && VALID_MODES.has(modeRaw) ? modeRaw : 'normal',
    view: viewRaw && VALID_VIEWS.has(viewRaw) ? viewRaw : 'hud',
    lens: lensRaw && VALID_LENSES.has(lensRaw) ? lensRaw : 'all',
  };
}

export function serializeExplorerUrlParams(state: ExplorerUrlState): URLSearchParams {
  const sp = new URLSearchParams();
  sp.set('target', state.target);
  sp.set('ra', state.ra.toFixed(5));
  sp.set('dec', state.dec.toFixed(5));
  sp.set('fov', state.fov.toFixed(3));
  sp.set('epoch', String(state.epoch));
  sp.set('mode', state.mode);
  sp.set('view', state.view);
  sp.set('lens', state.lens);
  return sp;
}

export function filterTargetsByMotion(
  targets: TargetCatalogEntry[],
  minVelocityArcsecYr: number,
  minBrightnessChangeMag: number,
): TargetCatalogEntry[] {
  return targets.filter(
    (t) =>
      t.velocityArcsecYr >= minVelocityArcsecYr ||
      t.brightnessChangeMag >= minBrightnessChangeMag,
  );
}
