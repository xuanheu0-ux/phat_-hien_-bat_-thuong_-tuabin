import { MachineType, MachineThresholds, SeverityLevel, SeverityThreshold } from '../types';

export const DEFAULT_ACTION_LIMITS: Record<MachineType, MachineThresholds> = {
  'Francis horizontal': {
    'GE-DE': { verde: 100, amarillo: 150, rojo: 150 },
    'GE-NDE': { verde: 95, amarillo: 150, rojo: 150 },
    'T': { verde: 95, amarillo: 150, rojo: 150 },
  },
  'Pelton horizontal': {
    'GE-DE': { verde: 145, amarillo: 225, rojo: 225 },
    'GE-NDE': { verde: 95, amarillo: 150, rojo: 150 },
    'T': { verde: 95, amarillo: 150, rojo: 150 },
  },
  'Pump horizontal': {
    'GE-DE': { verde: 110, amarillo: 170, rojo: 170 },
    'GE-NDE': { verde: 110, amarillo: 170, rojo: 170 },
    'T': { verde: 95, amarillo: 150, rojo: 150 },
  },
};

// Sensor-specific limits from README
export const SENSOR_SPECIFIC_LIMITS: Record<string, SeverityThreshold> = {
  CSP: { verde: 60, amarillo: 100, rojo: 100 },
  CSL: { verde: 70, amarillo: 110, rojo: 110 },
  CTP: { verde: 80, amarillo: 120, rojo: 120 },
  CTL: { verde: 2.5, amarillo: 5.0, rojo: 5.0 },
};

/**
 * Solve linear system A * x = b using Gaussian elimination with partial pivoting.
 */
function solveLinearSystem(A: number[][], b: number[]): number[] {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);

  for (let i = 0; i < n; i++) {
    // Pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
        maxRow = k;
      }
    }
    const temp = M[i];
    M[i] = M[maxRow];
    M[maxRow] = temp;

    const pivot = M[i][i];
    if (Math.abs(pivot) < 1e-12) {
      continue;
    }

    for (let k = i + 1; k < n; k++) {
      const factor = M[k][i] / pivot;
      for (let j = i; j <= n; j++) {
        M[k][j] -= factor * M[i][j];
      }
    }
  }

  const x = new Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let sum = M[i][n];
    for (let j = i + 1; j < n; j++) {
      sum -= M[i][j] * x[j];
    }
    x[i] = Math.abs(M[i][i]) > 1e-12 ? sum / M[i][i] : 0;
  }
  return x;
}

/**
 * Fit cubic polynomial y = c0 + c1*x + c2*x^2 + c3*x^3
 */
export function fitPolynomial(x: number[], y: number[], degree = 3): number[] {
  const n = x.length;
  if (n === 0) return [0, 0, 0, 0];

  // Normal equations for polynomial regression of degree m:
  // Matrix size (degree + 1) x (degree + 1)
  const m = degree + 1;
  const A: number[][] = Array.from({ length: m }, () => new Array(m).fill(0));
  const b: number[] = new Array(m).fill(0);

  // Compute powers sums
  const powers: number[] = new Array(2 * degree + 1).fill(0);
  for (let i = 0; i < n; i++) {
    let p = 1;
    for (let k = 0; k <= 2 * degree; k++) {
      powers[k] += p;
      p *= x[i];
    }
  }

  for (let i = 0; i < m; i++) {
    for (let j = 0; j < m; j++) {
      A[i][j] = powers[i + j];
    }
  }

  for (let i = 0; i < n; i++) {
    let p = 1;
    for (let j = 0; j < m; j++) {
      b[j] += y[i] * p;
      p *= x[i];
    }
  }

  return solveLinearSystem(A, b);
}

export function evaluatePolynomial(coeffs: number[], x: number): number {
  let result = 0;
  let p = 1;
  for (let i = 0; i < coeffs.length; i++) {
    result += coeffs[i] * p;
    p *= x;
  }
  return result;
}

/**
 * Maps sensor name to vibration direction
 */
export function getSensorDirection(sensorName: string): 'GE-NDE' | 'GE-DE' | 'T' {
  const upper = sensorName.toUpperCase();
  if (upper.startsWith('CLE') || upper.startsWith('CS') || upper.startsWith('C1')) {
    return 'GE-NDE';
  }
  if (upper.startsWith('CLA') || upper.startsWith('CI') || upper.startsWith('C2') || upper.startsWith('CG')) {
    return 'GE-DE';
  }
  if (upper.startsWith('CT')) {
    return 'T';
  }
  return 'T';
}

/**
 * Check severity for maximum measured values
 */
export function checkSeverity(
  maxValues: Record<string, number>,
  machineType: MachineType,
  useSensorSpecific = true,
  customThresholds?: Partial<Record<string, SeverityThreshold>>
): Record<string, SeverityLevel> {
  const result: Record<string, SeverityLevel> = {};
  const machineLimits = DEFAULT_ACTION_LIMITS[machineType];

  for (const [sensor, value] of Object.entries(maxValues)) {
    let threshold: SeverityThreshold;

    if (customThresholds && customThresholds[sensor]) {
      threshold = customThresholds[sensor]!;
    } else if (useSensorSpecific && SENSOR_SPECIFIC_LIMITS[sensor]) {
      threshold = SENSOR_SPECIFIC_LIMITS[sensor];
    } else {
      const direction = getSensorDirection(sensor);
      threshold = machineLimits[direction];
    }

    if (value <= threshold.verde) {
      result[sensor] = 'VERDE';
    } else if (value <= threshold.amarillo) {
      result[sensor] = 'AMARILLO';
    } else {
      result[sensor] = 'ROJO';
    }
  }

  return result;
}
