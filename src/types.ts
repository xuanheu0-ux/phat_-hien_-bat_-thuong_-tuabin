export type MachineType = 'Francis horizontal' | 'Pelton horizontal' | 'Pump horizontal';

export type SeverityLevel = 'VERDE' | 'AMARILLO' | 'ROJO' | 'DESCONOCIDO';

export interface SensorResidualData {
  original: number[];
  predicted: number[];
  residual: number[];
  absResidual: number[];
  meanResidual: number;
}

export interface PredictionResult {
  fileName: string;
  timestamp: string;
  prediction: 'MẤT CÂN BẰNG' | 'LỆCH TRỤC' | 'DESBALANCEO' | 'DESALINEACIÓN';
  confidence: number;
  probabilities: {
    desbalanceo: number;
    desalineacion: number;
  };
  metadata: {
    nominalSpeed: number;
    samplesAnalyzed: number;
    nAnomalies: number;
    sensors: string[];
    sensorData: Record<string, SensorResidualData>;
    kph: number[];
    maxValues: Record<string, number>;
  };
  severity: Record<string, SeverityLevel>;
  residualsStats: {
    mean: number;
    max: number;
    std: number;
  };
}

export interface SeverityThreshold {
  verde: number;
  amarillo: number;
  rojo: number;
}

export interface MachineThresholds {
  'GE-DE': SeverityThreshold;
  'GE-NDE': SeverityThreshold;
  'T': SeverityThreshold;
}

export interface SensorParamConfig {
  base: number;
  max: number;
  noise: number;
}

export interface TechnicalScenarioTemplate {
  id: string;
  title: string;
  description: string;
  category: 'unbalance' | 'misalignment' | 'normal' | 'looseness' | 'resonance' | 'custom';
  author?: string;
  createdAt: string;
  isBuiltIn?: boolean;
  params: {
    minSpeed: number;
    maxSpeed: number;
    sampleCount: number;
    growthModel: 'quadratic' | 'linear' | 'resonance';
    sensorsConfig: Record<string, SensorParamConfig>;
  };
  sampleRows?: Array<{
    fecha: string;
    kph: number;
    [sensor: string]: any;
  }>;
}
