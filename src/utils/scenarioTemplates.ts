import { TechnicalScenarioTemplate } from '../types';
import { RawDataPoint } from './turbineProcessor';

export const BUILT_IN_SCENARIOS: TechnicalScenarioTemplate[] = [
  {
    id: 'builtin-normal',
    title: 'Vận Hành Tiêu Chuẩn (ISO 10816 Zone A)',
    description: 'Trạng thái tuabin cân bằng tốt, độ lệch tâm và rung động hướng kính lẫn dọc trục nằm hoàn toàn trong ngưỡng an toàn dài hạn.',
    category: 'normal',
    author: 'Kỹ sư Thủy điện Quốc gia',
    createdAt: '2025-01-01',
    isBuiltIn: true,
    params: {
      minSpeed: 100,
      maxSpeed: 600,
      sampleCount: 10,
      growthModel: 'linear',
      sensorsConfig: {
        CSP: { base: 8.0, max: 28.0, noise: 1.2 },
        CSL: { base: 9.5, max: 30.5, noise: 1.5 },
        CTP: { base: 11.0, max: 34.0, noise: 1.8 },
        CTL: { base: 0.4, max: 1.1, noise: 0.15 },
      },
    },
  },
  {
    id: 'builtin-unbalance',
    title: 'Mất Cân Bằng Động Bánh Xe Công Tác (1X)',
    description: 'Khối lượng lệch tâm do mài mòn hoặc bám bùn cát làm lực ly tâm tăng theo bình phương tốc độ. Rung hướng kính CSP/CSL/CTP tăng vọt, rung dọc trục CTL thấp.',
    category: 'unbalance',
    author: 'Phòng Phân Tích Chẩn Đoán',
    createdAt: '2025-01-01',
    isBuiltIn: true,
    params: {
      minSpeed: 100,
      maxSpeed: 600,
      sampleCount: 12,
      growthModel: 'quadratic',
      sensorsConfig: {
        CSP: { base: 14.0, max: 88.0, noise: 2.5 },
        CSL: { base: 16.0, max: 94.0, noise: 2.8 },
        CTP: { base: 18.0, max: 98.5, noise: 3.0 },
        CTL: { base: 0.5, max: 1.4, noise: 0.2 },
      },
    },
  },
  {
    id: 'builtin-misalignment',
    title: 'Lệch Trục Khớp Nối Máy Phát - Tuabin (2X)',
    description: 'Lệch tâm góc và song song tại mặt bích khớp nối tạo lực bẻ uốn tuần hoàn 2X, kích động dao động dọc trục lớn (CTL vượt 5.5 µm - Vùng Báo động Đỏ).',
    category: 'misalignment',
    author: 'Tổ Giám Sát Rung Động',
    createdAt: '2025-01-01',
    isBuiltIn: true,
    params: {
      minSpeed: 100,
      maxSpeed: 600,
      sampleCount: 10,
      growthModel: 'linear',
      sensorsConfig: {
        CSP: { base: 22.0, max: 58.0, noise: 2.5 },
        CSL: { base: 26.0, max: 62.0, noise: 3.0 },
        CTP: { base: 32.0, max: 74.0, noise: 3.2 },
        CTL: { base: 1.8, max: 6.2, noise: 0.4 },
      },
    },
  },
  {
    id: 'builtin-looseness',
    title: 'Lỏng Cơ Khí Ổ Bạc Gối Đỡ DE (Mechanical Looseness)',
    description: 'Khe hở gối đỡ vượt giới hạn tiêu chuẩn gây va đập phụ tải, dẫn tới sai số dư bất thường và độ phân tán rung động lớn tại đầu đo CSP/CSL.',
    category: 'looseness',
    author: 'Đội Bảo Dưỡng Tuabin',
    createdAt: '2025-01-01',
    isBuiltIn: true,
    params: {
      minSpeed: 120,
      maxSpeed: 600,
      sampleCount: 10,
      growthModel: 'resonance',
      sensorsConfig: {
        CSP: { base: 28.0, max: 78.0, noise: 6.5 },
        CSL: { base: 15.0, max: 48.0, noise: 5.0 },
        CTP: { base: 20.0, max: 55.0, noise: 3.5 },
        CTL: { base: 0.8, max: 2.2, noise: 0.35 },
      },
    },
  },
  {
    id: 'builtin-resonance',
    title: 'Cộng Hưởng Tốc Độ Tới Hạn (Critical Speed)',
    description: 'Tuabin đi qua dải tốc độ nguy hiểm khiến rung động cộng hưởng tăng đột biến tại vùng tốc độ 380 - 450 KPH trước khi đi vào vận hành ổn định.',
    category: 'resonance',
    author: 'Viện Nghiên Cứu Thủy Lực',
    createdAt: '2025-01-01',
    isBuiltIn: true,
    params: {
      minSpeed: 100,
      maxSpeed: 600,
      sampleCount: 12,
      growthModel: 'resonance',
      sensorsConfig: {
        CSP: { base: 16.0, max: 82.0, noise: 3.0 },
        CSL: { base: 18.0, max: 86.0, noise: 3.2 },
        CTP: { base: 20.0, max: 90.0, noise: 3.5 },
        CTL: { base: 0.6, max: 1.8, noise: 0.25 },
      },
    },
  },
];

const LOCAL_STORAGE_KEY = 'custom_turbine_scenarios_v1';

export function getStoredCustomScenarios(): TechnicalScenarioTemplate[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load custom scenarios:', err);
    return [];
  }
}

export function saveCustomScenario(scenario: TechnicalScenarioTemplate): boolean {
  try {
    const current = getStoredCustomScenarios();
    const existingIndex = current.findIndex((s) => s.id === scenario.id);
    if (existingIndex >= 0) {
      current[existingIndex] = scenario;
    } else {
      current.unshift(scenario);
    }
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(current));
    return true;
  } catch (err) {
    console.error('Failed to save custom scenario:', err);
    return false;
  }
}

export function deleteCustomScenario(scenarioId: string): boolean {
  try {
    const current = getStoredCustomScenarios();
    const updated = current.filter((s) => s.id !== scenarioId);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed to delete custom scenario:', err);
    return false;
  }
}

/**
 * Generates telemetry raw data points from a technical scenario configuration.
 */
export function generateScenarioData(scenario: TechnicalScenarioTemplate): {
  rawPoints: RawDataPoint[];
  sensors: string[];
} {
  const { minSpeed, maxSpeed, sampleCount, growthModel, sensorsConfig } = scenario.params;
  const sensors = Object.keys(sensorsConfig);
  const rawPoints: RawDataPoint[] = [];

  const now = new Date();
  const baseTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);

  // Distribute speeds from minSpeed to maxSpeed, with steady samples at max
  const speeds: number[] = [];
  const rampSteps = Math.max(3, sampleCount - 3);
  for (let i = 0; i < rampSteps; i++) {
    const spd = minSpeed + (maxSpeed - minSpeed) * (i / (rampSteps - 1));
    speeds.push(Math.round(spd));
  }
  // Add steady nominal speed points
  while (speeds.length < sampleCount) {
    speeds.push(maxSpeed);
  }

  speeds.forEach((speed, idx) => {
    const time = new Date(baseTime.getTime() + idx * 60 * 1000);
    const fecha = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(
      time.getDate()
    ).padStart(2, '0')} ${String(time.getHours()).padStart(2, '0')}:${String(
      time.getMinutes()
    ).padStart(2, '0')}:00`;

    const point: RawDataPoint = {
      Fecha: fecha,
      KPH: speed,
    };

    const ratio = Math.max(0, Math.min(1, (speed - minSpeed) / (maxSpeed - minSpeed || 1)));

    let factor = ratio;
    if (growthModel === 'quadratic') {
      // Centrifugal force model: F ~ omega^2
      factor = ratio * ratio;
    } else if (growthModel === 'resonance') {
      // Critical speed resonance curve peaking around ratio = 0.7
      const resonancePeak = Math.exp(-Math.pow((ratio - 0.7) / 0.18, 2)) * 0.45;
      factor = Math.min(1, ratio * 0.85 + resonancePeak);
    }

    sensors.forEach((s) => {
      const cfg = sensorsConfig[s] || { base: 10, max: 50, noise: 2 };
      const range = cfg.max - cfg.base;
      const noise = (Math.random() * 2 - 1) * cfg.noise;
      const val = Math.max(0.1, Number((cfg.base + range * factor + noise).toFixed(2)));
      point[s] = val;
    });

    rawPoints.push(point);
  });

  return { rawPoints, sensors };
}
