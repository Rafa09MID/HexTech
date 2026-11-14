export interface SpectralPoint {
  wavelength: number;
  flux: number;
  fluxDiff?: number;
}

export interface TargetData {
  id: string;
  name: string;
  shortName: string;
  designation: string;
  classification: string;
  raDeg: number;
  decDeg: number;
  raFormatted: string;
  decFormatted: string;
  surveyTitle: string;
  modelTitle: string;
  colorScheme: {
    core: string;
    halo: string;
    wireframe: string;
  };
  wireframe: {
    axesRatio: [number, number, number];
    rotationAngle: number;
    showJet: boolean;
    jetAngleRad?: number;
  };
  spectrum: SpectralPoint[];
  aiInsightText: string;
  artifactFlag: string;
  contaminationLevel: string;
  activeMolecules: Array<'CH4' | 'H2O' | 'CO2'>;
}

export type CanvasMode = 'split' | 'sky';
