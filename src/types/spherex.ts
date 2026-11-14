export type MolecularLensId = 'all' | 'h2o' | 'ch4' | 'co2' | 'co' | 'nh3';

export type ViewMode = 'normal' | 'blink' | 'diff' | 'sum';

export type LayoutViewMode = 'hud' | 'split' | 'nested';

export type EpochIndex = 1 | 2 | 3 | 4;

export type LvfDetectorBand = 'LVF-1' | 'LVF-2' | 'LVF-3' | 'LVF-4' | 'LVF-5' | 'LVF-6';

export interface SpectralChannel {
  channel: number;
  wavelengthUm: number;
  lvfBand: LvfDetectorBand;
  fluxT1: number;
  fluxT2: number;
  fluxDiff: number;
  fluxSum: number;
  snr: number;
}

export interface DetectorArraySummary {
  band: LvfDetectorBand;
  wavelengthRangeUm: [number, number];
  channelRange: [number, number];
  keyMolecules: string;
  sumFluxT1: number;
  sumFluxT2: number;
  sumFluxDiff: number;
  sumFluxCombined: number;
  meanFluxT2: number;
  singleChannelSnr: number;
  coaddedSnr: number;
  snrGainFactor: number;
}

export interface OnTheFlyFieldSource {
  id: string;
  label: string;
  designation: string;
  raDeg: number;
  decDeg: number;
  dxArcsec: number;
  dyArcsec: number;
  sourceClass: string;
  spectralType: string;
  tEffK: number;
  dominantMolecules: MolecularLensId[];
  aiConfidencePct: number;
  aiSummary: string;
  gaiaId?: string;
  wiseId?: string;
  gMag?: number;
  w1Mag?: number;
  w2Mag?: number;
  pmArcsecYr: number;
  spectrum102: SpectralChannel[];
}

export interface CatalogOverlayState {
  gaiaDr3: boolean;
  allWise: boolean;
}

export interface EpochData {
  epoch: EpochIndex;
  label: string;
  dateLabel: string;
  mjd: number;
  raShiftArcsec: number;
  decShiftArcsec: number;
  fluxScale: number;
}

export interface ContaminationFlags {
  artifact: 'Clean' | 'Caution' | 'Flagged';
  saturation: 'Low' | 'Moderate' | 'High';
  zodiacalBg: 'Clean' | 'Elevated';
  cosmicRay: 'Clean' | 'Corrected';
  detail: string;
}

export interface TargetCatalogEntry {
  id: string;
  name: string;
  designation: string;
  category: string;
  isChallengeTarget: boolean;
  spectralType: string;
  raDeg: number;
  decDeg: number;
  defaultFov: number;
  velocityArcsecYr: number;
  brightnessChangeMag: number;
  distancePc: number;
  dominantMolecules: MolecularLensId[];
  aiConfidencePct: number;
  aiSummary: string;
  fitsId: string;
  epochs: EpochData[];
  spectrum102: SpectralChannel[];
  contamination: ContaminationFlags;
  skyRenderPreset:
    | 'spiral_field'
    | 'red_dwarf'
    | 'cold_brown_dwarf'
    | 'binary_bd'
    | 'yso_disk'
    | 'mira_giant';
}

export interface LiveTickerAlert {
  id: string;
  targetId: string;
  label: string;
  raDeg: number;
  decDeg: number;
  timestamp: string;
  severity: 'cyan' | 'amber' | 'emerald';
}

export interface MotionFilterQuery {
  minVelocityArcsecYr: number;
  minBrightnessChangeMag: number;
  active: boolean;
}

export interface SelectionBoxArea {
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  areaDegLabel: string;
  detectedObjectsCount: number;
}

export interface ExplorerUrlState {
  target: string;
  ra: number;
  dec: number;
  fov: number;
  epoch: EpochIndex;
  mode: ViewMode;
  view: LayoutViewMode;
  lens: MolecularLensId;
}

export interface FloatingModuleVisibility {
  spectra: boolean;
  aiInsights: boolean;
  metadata: boolean;
  motionFilters: boolean;
  selectionTool: boolean;
  shareUrl: boolean;
}

