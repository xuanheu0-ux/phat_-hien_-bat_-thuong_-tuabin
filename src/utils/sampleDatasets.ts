import { RawDataPoint } from './turbineProcessor';

export interface SampleDataset {
  id: string;
  name: string;
  description: string;
  expectedClass: 'MẤT CÂN BẰNG' | 'LỆCH TRỤC' | 'DESBALANCEO' | 'DESALINEACIÓN';
  csvContent: string;
}

/**
 * Generates realistic hydraulic turbine shutdown ("parada") or start-up ("arranque") vibration data
 */
function generateTurbineRun(
  type: 'imbalance' | 'misalignment' | 'high_imbalance',
  sampleCount = 600
): { csv: string; rawPoints: RawDataPoint[]; sensors: string[] } {
  const sensors = ['CSP', 'CSL', 'CTP', 'CTL'];
  const nominalSpeed = 279.2;
  const lines: string[] = [];
  lines.push('Fecha;KPH;CSP;CSL;CTP;CTL');

  const rawPoints: RawDataPoint[] = [];
  const startTime = new Date('2025-11-28T10:00:00Z').getTime();

  for (let i = 0; i < sampleCount; i++) {
    const t = i / sampleCount;
    // Speed profile: stable nominal speed for first 15%, then deceleration curve to 0
    let kph = 0;
    if (t < 0.15) {
      kph = nominalSpeed + (Math.sin(i * 0.4) * 0.35) + ((Math.random() - 0.5) * 0.2);
    } else {
      const decelTime = (t - 0.15) / 0.85;
      kph = nominalSpeed * Math.max(0, 1 - Math.pow(decelTime, 1.2)) + ((Math.random() - 0.5) * 0.4);
    }
    kph = Math.max(0, kph);

    // Vibration profiles: baseline cubic polynomial + harmonic excitation + noise
    const normSpeed = kph / nominalSpeed;
    const baseCubic = 0.1 + 0.5 * normSpeed + 0.8 * Math.pow(normSpeed, 2) - 0.4 * Math.pow(normSpeed, 3);
    const resonance = Math.exp(-Math.pow((kph - 135) / 25, 2)) * 18; // critical speed resonance peak

    let csp = 0;
    let csl = 0;
    let ctp = 0;
    let ctl = 0;

    if (type === 'imbalance') {
      // 1X rotational unbalance mainly in radial sensors (CSP, CSL)
      csp = 24 + baseCubic * 48 + resonance * 0.8 + (Math.random() - 0.5) * 2.8;
      csl = 28 + baseCubic * 52 + resonance * 0.9 + (Math.random() - 0.5) * 3.1;
      ctp = 18 + baseCubic * 32 + resonance * 0.4 + (Math.random() - 0.5) * 1.9;
      ctl = 0.8 + baseCubic * 1.1 + (Math.random() - 0.5) * 0.15; // axial stays low
    } else if (type === 'misalignment') {
      // Misalignment: strong axial component (CTL) and 2X reaction, higher CTP
      csp = 22 + baseCubic * 36 + (Math.random() - 0.5) * 2.2;
      csl = 25 + baseCubic * 39 + (Math.random() - 0.5) * 2.4;
      ctp = 32 + baseCubic * 58 + resonance * 0.7 + (Math.random() - 0.5) * 3.5;
      ctl = 1.9 + baseCubic * 3.8 + (Math.sin(i * 0.25) * 0.8) + (Math.random() - 0.5) * 0.35; // high axial!
    } else {
      // High imbalance with severe vibration exceeding yellow/red limits
      csp = 38 + baseCubic * 75 + resonance * 1.5 + (Math.random() - 0.5) * 4.5;
      csl = 42 + baseCubic * 82 + resonance * 1.6 + (Math.random() - 0.5) * 4.8;
      ctp = 25 + baseCubic * 45 + resonance * 0.6 + (Math.random() - 0.5) * 2.5;
      ctl = 1.1 + baseCubic * 1.6 + (Math.random() - 0.5) * 0.25;
    }

    const dateStr = new Date(startTime + i * 2000).toISOString().replace('T', ' ').substring(0, 19);
    lines.push(`${dateStr};${kph.toFixed(2)};${csp.toFixed(2)};${csl.toFixed(2)};${ctp.toFixed(2)};${ctl.toFixed(2)}`);

    rawPoints.push({
      Fecha: dateStr,
      KPH: Number(kph.toFixed(2)),
      CSP: Number(csp.toFixed(2)),
      CSL: Number(csl.toFixed(2)),
      CTP: Number(ctp.toFixed(2)),
      CTL: Number(ctl.toFixed(2)),
    });
  }

  return {
    csv: lines.join('\n'),
    rawPoints,
    sensors,
  };
}

const sample1 = generateTurbineRun('imbalance', 600);
const sample2 = generateTurbineRun('misalignment', 600);
const sample3 = generateTurbineRun('high_imbalance', 600);

export const SAMPLE_DATASETS: SampleDataset[] = [
  {
    id: '12_paradaDesblnCSLCSPCTP',
    name: '12_paradaDesblnCSLCSPCTP.csv',
    description: 'Quá trình dừng máy tuabin Francis có hiện tượng mất cân bằng cơ khí ở bánh xe công tác (CSP/CSL chiếm ưu thế, chế độ vận hành bình thường).',
    expectedClass: 'MẤT CÂN BẰNG',
    csvContent: sample1.csv,
  },
  {
    id: '1_arranqueParadaDesln',
    name: '1_arranqueParadaDesln.csv',
    description: 'Quá trình khởi động và giảm tốc có hiện tượng lệch góc tại khớp nối trục (độ lệch dư cảm biến dọc trục CTL tăng cao).',
    expectedClass: 'LỆCH TRỤC',
    csvContent: sample2.csv,
  },
  {
    id: '5_paradaDesblnCILCIP_severo',
    name: '5_paradaDesblnCILCIP_severo.csv',
    description: 'Chế độ rung động cao với mất cân bằng nghiêm trọng vượt qua ngưỡng báo động đỏ (Cảnh báo / Nguy hiểm).',
    expectedClass: 'MẤT CÂN BẰNG',
    csvContent: sample3.csv,
  },
];
