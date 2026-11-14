import type { SpectralPoint, TargetData } from '../types';

function generateSpectrum(profile: {
  base: number;
  h2oDip: number;
  ch4Dip: number;
  co2Dip: number;
  seed: number;
}): SpectralPoint[] {
  const points: SpectralPoint[] = [];
  const count = 102;
  const minW = 0.75;
  const maxW = 5.0;
  const step = (maxW - minW) / (count - 1);

  for (let i = 0; i < count; i += 1) {
    const w = Number((minW + i * step).toFixed(3));
    // Base Planck-like curve peaked around 1.8 - 2.5 um
    const continuum = Math.exp(-Math.pow((w - 2.1) / 1.7, 2)) * 0.85 + 0.15;

    // Molecular dips
    const h2o1 = Math.exp(-Math.pow((w - 1.4) / 0.12, 2)) * profile.h2oDip * 0.7;
    const h2o2 = Math.exp(-Math.pow((w - 1.9) / 0.15, 2)) * profile.h2oDip * 0.85;
    const h2o3 = Math.exp(-Math.pow((w - 2.8) / 0.22, 2)) * profile.h2oDip * 0.95;

    const ch4_1 = Math.exp(-Math.pow((w - 1.66) / 0.1, 2)) * profile.ch4Dip * 0.8;
    const ch4_2 = Math.exp(-Math.pow((w - 2.25) / 0.12, 2)) * profile.ch4Dip * 0.85;
    const ch4_3 = Math.exp(-Math.pow((w - 3.32) / 0.18, 2)) * profile.ch4Dip * 1.0;

    const co2_1 = Math.exp(-Math.pow((w - 4.26) / 0.12, 2)) * profile.co2Dip;

    // Subtle fine structure noise
    const noise = (Math.sin(i * 12.9898 + profile.seed) * 43758.5453) % 1;
    const fineNoise = (noise - Math.floor(noise) - 0.5) * 0.05;

    const flux = Math.max(
      0.08,
      continuum - h2o1 - h2o2 - h2o3 - ch4_1 - ch4_2 - ch4_3 - co2_1 + fineNoise,
    );
    const fluxDiff = Number(((Math.sin(w * 3) * 0.12) + fineNoise * 0.5).toFixed(3));

    points.push({
      wavelength: w,
      flux: Number(flux.toFixed(3)),
      fluxDiff,
    });
  }

  return points;
}

export const TARGETS_DATA: TargetData[] = [
  {
    id: 'barnards-star',
    name: "Barnard's Star",
    shortName: "Barnard's Star",
    designation: 'GJ 699 / HIP 87937',
    classification: 'M4.0V Red Dwarf',
    raDeg: 269.4521,
    decDeg: 4.6934,
    raFormatted: '17h57m48.5s',
    decFormatted: '+04°41\'36"',
    surveyTitle: "— SPHEREx / 2MASS Photo of Barnard's Star",
    modelTitle: '— 3D Astrometric Displacement & Kinematics',
    colorScheme: {
      core: '#FFC078',
      halo: 'rgba(255, 145, 60, 0.45)',
      wireframe: 'rgba(255, 255, 255, 0.65)',
    },
    wireframe: {
      axesRatio: [1.25, 0.95, 1.0],
      rotationAngle: -0.42,
      showJet: true,
      jetAngleRad: 1.62,
    },
    spectrum: generateSpectrum({
      base: 0.88,
      h2oDip: 0.45,
      ch4Dip: 0.15,
      co2Dip: 0.25,
      seed: 11,
    }),
    aiInsightText: 'High confidence detection of Water Vapor signature / CO detected',
    artifactFlag: 'Clean',
    contaminationLevel: 'Low',
    activeMolecules: ['H2O', 'CO2'],
  },
  {
    id: 'wise-0855',
    name: 'WISE 0855',
    shortName: 'WISE 0855',
    designation: 'WISE J085510.83-071442.5',
    classification: 'Brown Dwarf (Y4)',
    raDeg: 133.7951,
    decDeg: -7.2451,
    raFormatted: '08h55m10.831s',
    decFormatted: '-7d14m42.53s',
    surveyTitle: '— SPHEREx / ALLWISE Photo of WISE 0855',
    modelTitle: '— 3D Thermal IR & Cold Atmosphere Shell',
    colorScheme: {
      core: '#A5C9FF',
      halo: 'rgba(70, 140, 255, 0.42)',
      wireframe: 'rgba(180, 215, 255, 0.65)',
    },
    wireframe: {
      axesRatio: [1.08, 1.08, 1.0],
      rotationAngle: 0.15,
      showJet: true,
      jetAngleRad: 3.08,
    },
    spectrum: generateSpectrum({
      base: 0.92,
      h2oDip: 0.68,
      ch4Dip: 0.74,
      co2Dip: 0.18,
      seed: 29,
    }),
    aiInsightText: 'High probability of Methane and Water Ice signature detected',
    artifactFlag: 'Clean',
    contaminationLevel: 'Low',
    activeMolecules: ['CH4', 'H2O'],
  },
  {
    id: 'epsilon-indi-b',
    name: 'Epsilon Indi B',
    shortName: 'Epsilon Indi B',
    designation: 'eps Ind Ba / Bb',
    classification: 'Brown Dwarf Binary (T1V + T6V)',
    raDeg: 330.8402,
    decDeg: -56.786,
    raFormatted: '22h03m21.6s',
    decFormatted: '-56°47\'09"',
    surveyTitle: '— SPHEREx / 2MASS Photo of Epsilon Indi B',
    modelTitle: '— 3D Binary Orbital Shell & Methane Atmosphere',
    colorScheme: {
      core: '#FFC890',
      halo: 'rgba(235, 125, 70, 0.45)',
      wireframe: 'rgba(255, 230, 205, 0.6)',
    },
    wireframe: {
      axesRatio: [1.38, 0.88, 0.92],
      rotationAngle: 0.65,
      showJet: true,
      jetAngleRad: -0.58,
    },
    spectrum: generateSpectrum({
      base: 0.85,
      h2oDip: 0.55,
      ch4Dip: 0.68,
      co2Dip: 0.12,
      seed: 43,
    }),
    aiInsightText: 'Deep CH₄ methane absorption bands & dual photometric center',
    artifactFlag: 'Clean',
    contaminationLevel: 'Low',
    activeMolecules: ['CH4', 'H2O'],
  },
  {
    id: 'rw-aurigae',
    name: 'RW Aurigae',
    shortName: 'RW Aurigae',
    designation: 'HD 240764 / V* RW Aur',
    classification: 'T Tauri Variable (YSO)',
    raDeg: 76.9565,
    decDeg: 30.4014,
    raFormatted: '05h07m49.5s',
    decFormatted: '+30°24\'05"',
    surveyTitle: '— SPHEREx / ALLWISE Photo of RW Aurigae',
    modelTitle: '— 3D Circumstellar Dust Disk & Halo',
    colorScheme: {
      core: '#FFE2A0',
      halo: 'rgba(255, 175, 75, 0.45)',
      wireframe: 'rgba(255, 220, 165, 0.65)',
    },
    wireframe: {
      axesRatio: [1.6, 0.65, 0.72],
      rotationAngle: 0.82,
      showJet: false,
    },
    spectrum: generateSpectrum({
      base: 0.8,
      h2oDip: 0.25,
      ch4Dip: 0.08,
      co2Dip: 0.42,
      seed: 71,
    }),
    aiInsightText: 'Circumstellar dust extinction event & thermal IR excess >3.5 μm',
    artifactFlag: 'Caution: Nebula BG',
    contaminationLevel: 'Medium',
    activeMolecules: ['CO2', 'H2O'],
  },
  {
    id: 'r-draconis',
    name: 'R Draconis',
    shortName: 'R Draconis',
    designation: 'HD 149880 / V* R Dra',
    classification: 'Mira Variable (M5e-M9e)',
    raDeg: 249.6021,
    decDeg: 66.7501,
    raFormatted: '16h38m24.2s',
    decFormatted: '+66°45\'00"',
    surveyTitle: '— SPHEREx Photo of R Draconis',
    modelTitle: '— 3D Radial Pulsation Shell Model',
    colorScheme: {
      core: '#FFA07A',
      halo: 'rgba(255, 95, 75, 0.5)',
      wireframe: 'rgba(255, 195, 185, 0.65)',
    },
    wireframe: {
      axesRatio: [1.2, 1.2, 1.2],
      rotationAngle: 0.1,
      showJet: false,
    },
    spectrum: generateSpectrum({
      base: 0.9,
      h2oDip: 0.62,
      ch4Dip: 0.05,
      co2Dip: 0.35,
      seed: 93,
    }),
    aiInsightText: 'Radial atmospheric pulsation +78% amplitude & deep CO/H₂O bands',
    artifactFlag: 'Clean',
    contaminationLevel: 'Low',
    activeMolecules: ['H2O', 'CO2'],
  },
];
