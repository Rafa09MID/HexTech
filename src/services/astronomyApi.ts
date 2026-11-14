/**
 * Free Public Astronomy API Service (Aladin Lite v3 CDS + CDS HiPS2FITS + CDS Simbad/VizieR)
 * Used to visualize real infrared sky cutouts (2MASS / AllWISE / DSS2), Gaia DR3 & WISE catalog overlays,
 * and live catalog metadata while the FastAPI + Astropy backend is being prepared.
 */

export type FilterWheelMode = 'srgb' | 'raw' | 'wavelength';

export interface FilterWheelOption {
  id: FilterWheelMode;
  label: string;
  shortLabel: string;
  hipsSurvey: string;
  aladinSurveyId: string;
  description: string;
}

export const FILTER_WHEEL_OPTIONS: FilterWheelOption[] = [
  {
    id: 'srgb',
    label: 'sRGB (2MASS NIR J/H/Ks)',
    shortLabel: 'sRGB',
    hipsSurvey: 'CDS/P/2MASS/color',
    aladinSurveyId: 'P/2MASS/color',
    description: 'Composición en color verdadero cercano al infrarrojo (1.25–2.16 μm, bandas LVF 1-3).',
  },
  {
    id: 'raw',
    label: 'Raw (Intensidad Monocromática FITS)',
    shortLabel: 'Raw',
    hipsSurvey: 'CDS/P/DSS2/red',
    aladinSurveyId: 'P/DSS2/red',
    description: 'Recorte monocromático de intensidad cruda para inspección de centroide astrométrico.',
  },
  {
    id: 'wavelength',
    label: 'Wavelength (AllWISE Térmico 3.4–12 μm)',
    shortLabel: 'Wavelength',
    hipsSurvey: 'CDS/P/allWISE/color',
    aladinSurveyId: 'P/allWISE/color',
    description: 'Mapa infrarrojo de onda larga (AllWISE W1/W2/W3) ideal para enanas marrones Y4 y discos de polvo.',
  },
];

export interface OverlayCatalogPoint {
  id: string;
  catalog: 'Gaia DR3' | 'AllWISE';
  designation: string;
  raDeg: number;
  decDeg: number;
  dxArcsec: number;
  dyArcsec: number;
  magLabel: string;
  pmArcsecYr: number;
}

/**
 * Generates deterministic, realistic Gaia DR3 and AllWISE overlay sources in the field of view
 * around the given coordinates so catalog overlays work both with Aladin Lite and offline/procedural canvas.
 */
export function getFieldOverlayCatalogSources(
  centerRaDeg: number,
  centerDecDeg: number,
  fovDeg: number,
  targetId: string,
): OverlayCatalogPoint[] {
  const cosDec = Math.max(0.1, Math.cos((centerDecDeg * Math.PI) / 180));
  const halfFovArcsec = (fovDeg * 3600) / 2;
  const seedBase = Math.round(centerRaDeg * 13 + centerDecDeg * 29);

  const points: OverlayCatalogPoint[] = [];

  // 1. Primary target catalog entries
  if (targetId === 'wise-0855') {
    points.push({
      id: 'wise-primary',
      catalog: 'AllWISE',
      designation: 'WISE J085510.831-071442.53',
      raDeg: centerRaDeg,
      decDeg: centerDecDeg,
      dxArcsec: 0,
      dyArcsec: 0,
      magLabel: 'W1=17.82, W2=14.02 (Y4)',
      pmArcsecYr: 8.08,
    });
  } else if (targetId !== 'm51-sector-34a') {
    points.push({
      id: 'gaia-primary',
      catalog: 'Gaia DR3',
      designation:
        targetId === 'barnards-star'
          ? 'Gaia DR3 4472832130942575872'
          : `Gaia DR3 (${targetId.toUpperCase()})`,
      raDeg: centerRaDeg,
      decDeg: centerDecDeg,
      dxArcsec: 0,
      dyArcsec: 0,
      magLabel: targetId === 'barnards-star' ? 'G=8.19 mag' : 'G=10.8 mag',
      pmArcsecYr: targetId === 'barnards-star' ? 10.39 : 4.7,
    });
    points.push({
      id: 'wise-primary',
      catalog: 'AllWISE',
      designation:
        targetId === 'barnards-star'
          ? 'WISEA J175747.94+044314.5'
          : `AllWISE (${targetId.toUpperCase()})`,
      raDeg: centerRaDeg + 0.4 / (3600 * cosDec),
      decDeg: centerDecDeg - 0.3 / 3600,
      dxArcsec: 0.4,
      dyArcsec: -0.3,
      magLabel: 'W1=4.38, W2=4.14 mag',
      pmArcsecYr: targetId === 'barnards-star' ? 10.38 : 4.69,
    });
  }

  // 2. Surrounding field stars in Gaia DR3 and AllWISE
  const fieldOffsets: Array<{
    rx: number;
    ry: number;
    cat: 'Gaia DR3' | 'AllWISE';
    mag: string;
    pm: number;
  }> = [
    { rx: -0.42, ry: -0.34, cat: 'Gaia DR3', mag: 'G=13.42', pm: 0.04 },
    { rx: 0.38, ry: -0.28, cat: 'Gaia DR3', mag: 'G=14.81', pm: 0.02 },
    { rx: -0.31, ry: 0.41, cat: 'Gaia DR3', mag: 'G=15.19', pm: 0.08 },
    { rx: 0.46, ry: 0.36, cat: 'Gaia DR3', mag: 'G=12.95', pm: 0.01 },
    { rx: -0.18, ry: -0.48, cat: 'Gaia DR3', mag: 'G=16.05', pm: 0.11 },
    { rx: 0.22, ry: 0.44, cat: 'Gaia DR3', mag: 'G=15.64', pm: 0.03 },
    { rx: -0.45, ry: 0.12, cat: 'AllWISE', mag: 'W1=13.1, W2=12.8', pm: 0.02 },
    { rx: 0.31, ry: -0.41, cat: 'AllWISE', mag: 'W1=14.4, W2=13.2', pm: 0.19 },
    { rx: -0.24, ry: 0.27, cat: 'AllWISE', mag: 'W1=15.0, W2=13.6', pm: 0.35 },
    { rx: 0.41, ry: 0.16, cat: 'AllWISE', mag: 'W1=12.7, W2=12.5', pm: 0.01 },
    { rx: 0.14, ry: -0.22, cat: 'AllWISE', mag: 'W1=15.6, W2=14.1', pm: 0.48 },
  ];

  fieldOffsets.forEach((fo, idx) => {
    const dxArcsec = Number((fo.rx * halfFovArcsec).toFixed(2));
    const dyArcsec = Number((fo.ry * halfFovArcsec).toFixed(2));
    const ra = Number((centerRaDeg + dxArcsec / (3600 * cosDec)).toFixed(5));
    const dec = Number((centerDecDeg + dyArcsec / 3600).toFixed(5));
    const idNum = Math.abs(seedBase * 100 + idx * 37);

    points.push({
      id: `${fo.cat === 'Gaia DR3' ? 'gaia' : 'wise'}-field-${idx}`,
      catalog: fo.cat,
      designation:
        fo.cat === 'Gaia DR3'
          ? `Gaia DR3 44728${String(idNum).padStart(7, '0')}`
          : `WISEA J${String(idNum).padStart(6, '0')}`,
      raDeg: ra,
      decDeg: dec,
      dxArcsec,
      dyArcsec,
      magLabel: fo.mag,
      pmArcsecYr: fo.pm,
    });
  });

  return points;
}

const imageCache = new Map<string, HTMLImageElement>();
const pendingRequests = new Map<string, Promise<HTMLImageElement | null>>();

/**
 * Builds the public CDS HiPS2FITS URL for a given sky position and filter wheel mode.
 */
export function buildHips2FitsCutoutUrl(
  raDeg: number,
  decDeg: number,
  fovDeg: number,
  filterMode: FilterWheelMode,
  width = 960,
  height = 680,
): string {
  const opt = FILTER_WHEEL_OPTIONS.find((o) => o.id === filterMode) ?? FILTER_WHEEL_OPTIONS[0];
  const clampedFov = Math.max(0.05, Math.min(2.5, fovDeg));
  const params = new URLSearchParams({
    hips: opt.hipsSurvey,
    width: String(width),
    height: String(height),
    fov: clampedFov.toFixed(4),
    projection: 'TAN',
    coordsys: 'icrs',
    ra: raDeg.toFixed(5),
    dec: decDeg.toFixed(5),
    format: 'jpg',
  });
  return `https://alasky.cds.unistra.fr/hips-image-services/hips2fits?${params.toString()}`;
}

/**
 * Loads and caches a real astronomical cutout image from CDS HiPS2FITS WITHOUT crossOrigin="anonymous"
 * so standard DOM <img> and non-tainted rendering never fail due to strict CORS headers.
 * Returns null if offline or if the request times out, allowing seamless procedural fallback.
 */
export function loadRealSkyCutout(
  targetId: string,
  raDeg: number,
  decDeg: number,
  fovDeg: number,
  filterMode: FilterWheelMode,
): Promise<HTMLImageElement | null> {
  const fovBucket = Number(fovDeg.toFixed(2));
  const raBucket = Number(raDeg.toFixed(3));
  const decBucket = Number(decDeg.toFixed(3));
  const cacheKey = `${targetId}:${raBucket}:${decBucket}:${filterMode}:${fovBucket}`;

  const existing = imageCache.get(cacheKey);
  if (existing) {
    return Promise.resolve(existing);
  }

  const inflight = pendingRequests.get(cacheKey);
  if (inflight) {
    return inflight;
  }

  const url = buildHips2FitsCutoutUrl(raDeg, decDeg, fovBucket, filterMode);

  const promise = new Promise<HTMLImageElement | null>((resolve) => {
    if (typeof Image === 'undefined') {
      resolve(null);
      return;
    }

    const img = new Image();
    // Do NOT force crossOrigin = 'anonymous' first if the server omits ACAO headers on error responses,
    // which previously caused instant CORS failure in browser <canvas>.

    const timeoutId = window.setTimeout(() => {
      pendingRequests.delete(cacheKey);
      resolve(null);
    }, 5500);

    img.onload = () => {
      window.clearTimeout(timeoutId);
      imageCache.set(cacheKey, img);
      pendingRequests.delete(cacheKey);
      resolve(img);
    };

    img.onerror = () => {
      window.clearTimeout(timeoutId);
      pendingRequests.delete(cacheKey);
      resolve(null);
    };

    img.src = url;
  });

  pendingRequests.set(cacheKey, promise);
  return promise;
}

export interface LiveSimbadMetadata {
  found: boolean;
  mainId: string;
  objectType: string;
  raDeg: number;
  decDeg: number;
  pmRaMasYr: number | null;
  pmDecMasYr: number | null;
  sourceUrl: string;
}

/**
 * Queries the public CDS Simbad TAP/Sesame API for live astronomical verification.
 */
export async function fetchLiveSimbadVerification(
  designationOrName: string,
  raDeg: number,
  decDeg: number,
): Promise<LiveSimbadMetadata | null> {
  try {
    const queryName = designationOrName.split('/')[0].trim();
    const url = `https://cds.unistra.fr/cgi-bin/nph-sesame/-oxp/SNV?${encodeURIComponent(queryName)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const xmlText = await res.text();

    const onameMatch = xmlText.match(/<oname>([^<]+)<\/oname>/);
    const otypeMatch = xmlText.match(/<otype>([^<]+)<\/otype>/);
    const pmRaMatch = xmlText.match(/<pmRA>([^<]+)<\/pmRA>/);
    const pmDecMatch = xmlText.match(/<pmDE>([^<]+)<\/pmDE>/);

    return {
      found: Boolean(onameMatch),
      mainId: onameMatch ? onameMatch[1].trim() : queryName,
      objectType: otypeMatch ? otypeMatch[1].trim() : 'Confirmed Catalog Source',
      raDeg,
      decDeg,
      pmRaMasYr: pmRaMatch ? Number(pmRaMatch[1]) : null,
      pmDecMasYr: pmDecMatch ? Number(pmDecMatch[1]) : null,
      sourceUrl: `https://simbad.cds.unistra.fr/simbad/sim-id?Ident=${encodeURIComponent(queryName)}`,
    };
  } catch {
    return null;
  }
}
