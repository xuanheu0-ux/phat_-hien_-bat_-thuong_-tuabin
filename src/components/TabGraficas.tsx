import React, { useState } from 'react';
import { PredictionResult } from '../types';
import { ResponsiveContainer, ComposedChart, Scatter, Line, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';

interface TabGraficasProps {
  result: PredictionResult;
}

export const TabGraficas: React.FC<TabGraficasProps> = ({ result }) => {
  const { metadata, severity } = result;
  const { sensors, sensorData, kph, maxValues } = metadata;
  const [selectedSensor, setSelectedSensor] = useState<string>('ALL');

  const severityColorMap = {
    VERDE: { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', label: 'BÌNH THƯỜNG' },
    AMARILLO: { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/30', label: 'CẢNH BÁO' },
    ROJO: { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/30', label: 'NGUY HIỂM' },
    DESCONOCIDO: { text: 'text-slate-400', bg: 'bg-slate-500/10', border: 'border-slate-500/30', label: 'CHƯA XÁC ĐỊNH' },
  };

  // Build chart dataset for a given sensor
  const getSensorChartData = (sensor: string) => {
    const sData = sensorData[sensor];
    if (!sData) return [];

    // Subsample if too many points for smooth rendering
    const total = kph.length;
    const step = total > 400 ? Math.ceil(total / 300) : 1;
    const points: Array<{
      kph: number;
      real: number;
      ajuste: number;
      residuo: number;
      absResiduo: number;
    }> = [];

    for (let i = 0; i < total; i += step) {
      points.push({
        kph: Number(kph[i].toFixed(1)),
        real: Number(sData.original[i].toFixed(2)),
        ajuste: Number(sData.predicted[i].toFixed(2)),
        residuo: Number(sData.residual[i].toFixed(2)),
        absResiduo: Number(sData.absResidual[i].toFixed(2)),
      });
    }

    // Sort by kph for smooth line rendering
    return points.sort((a, b) => a.kph - b.kph);
  };

  const sensorsToDisplay = selectedSensor === 'ALL' ? sensors : [selectedSensor];

  return (
    <div className="space-y-6">
      {/* Sensor Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/60 p-3.5 rounded-xl border border-slate-700/80">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Lọc Cảm Biến:
          </span>
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedSensor('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                selectedSensor === 'ALL'
                  ? 'bg-blue-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              Tất cả ({sensors.length})
            </button>
            {sensors.map((s) => {
              const sev = severity[s] || 'DESCONOCIDO';
              const colors = severityColorMap[sev] || severityColorMap.DESCONOCIDO;
              return (
                <button
                  key={s}
                  onClick={() => setSelectedSensor(s)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition-colors ${
                    selectedSensor === s
                      ? 'bg-blue-600 text-white shadow'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span>{s}</span>
                  <span className={`w-2 h-2 rounded-full ${colors.bg.replace('/10', '')}`} />
                </button>
              );
            })}
          </div>
        </div>

        <div className="text-xs text-slate-400">
          Đường màu đỏ: Khớp Đa thức Bậc 3 &bull; Điểm chấm: Đo đạc thực tế
        </div>
      </div>

      {/* Sensor Graphs List */}
      <div className="space-y-6">
        {sensorsToDisplay.map((sensor) => {
          const sData = sensorData[sensor];
          if (!sData) return null;

          const sev = severity[sensor] || 'DESCONOCIDO';
          const maxVal = maxValues[sensor] ?? 0;
          const colors = severityColorMap[sev] || severityColorMap.DESCONOCIDO;
          const chartPoints = getSensorChartData(sensor);

          return (
            <div
              key={sensor}
              id={`sensor-card-${sensor}`}
              className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow"
            >
              {/* Sensor Header with Key Metrics */}
              <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-700/60 gap-3">
                <div className="flex items-center space-x-3">
                  <h4 className="text-xl font-bold text-white tracking-tight">{sensor}</h4>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${colors.bg} ${colors.text} ${colors.border}`}
                  >
                    MỨC ĐỘ: {colors.label}
                  </span>
                </div>

                <div className="flex flex-wrap gap-4 text-xs sm:text-sm">
                  <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 mr-1.5">Giá Trị Đỉnh:</span>
                    <strong className="text-white font-mono">{maxVal.toFixed(2)} &mu;m</strong>
                  </div>
                  <div className="bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-700/60">
                    <span className="text-slate-400 mr-1.5">Sai Số Dư Trung Bình:</span>
                    <strong className="text-blue-400 font-mono">
                      {sData.meanResidual.toFixed(4)} &mu;m
                    </strong>
                  </div>
                </div>
              </div>

              {/* Sensor Recharts Plot */}
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartPoints}
                    margin={{ top: 10, right: 20, bottom: 20, left: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                    <XAxis
                      dataKey="kph"
                      type="number"
                      domain={['dataMin', 'dataMax']}
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: 'Tốc độ Quay (KPH)',
                        position: 'insideBottom',
                        offset: -12,
                        fill: '#94a3b8',
                        fontSize: 11,
                      }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      tick={{ fontSize: 11 }}
                      label={{
                        value: `Biên độ ${sensor} (\u03bcm)`,
                        angle: -90,
                        position: 'insideLeft',
                        offset: 5,
                        fill: '#94a3b8',
                        fontSize: 11,
                      }}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1">
                              <p className="font-semibold text-slate-200">
                                Tốc độ: <span className="text-amber-400">{data.kph} KPH</span>
                              </p>
                              <p className="text-slate-300">
                                Thực tế: <span className="font-mono text-emerald-400">{data.real} &mu;m</span>
                              </p>
                              <p className="text-slate-300">
                                Đường khớp đa thức: <span className="font-mono text-rose-400">{data.ajuste} &mu;m</span>
                              </p>
                              <p className="text-slate-300">
                                Sai số dư tuyệt đối: <span className="font-mono text-blue-400">{data.absResiduo} &mu;m</span>
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }}
                    />
                    {/* Measured Data Points */}
                    <Scatter
                      name={`Dữ liệu Thực tế (${sensor})`}
                      dataKey="real"
                      fill="#38bdf8"
                      fillOpacity={0.7}
                      stroke="#0284c7"
                      strokeWidth={0.5}
                    />
                    {/* Cubic Polynomial Line */}
                    <Line
                      type="monotone"
                      name="Đường Khớp Đa thức Bậc 3"
                      dataKey="ajuste"
                      stroke="#ef4444"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
