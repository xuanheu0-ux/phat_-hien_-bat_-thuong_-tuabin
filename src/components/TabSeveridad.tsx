import React, { useState } from 'react';
import { PredictionResult, MachineType } from '../types';
import { DEFAULT_ACTION_LIMITS, SENSOR_SPECIFIC_LIMITS, getSensorDirection } from '../utils/math';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface TabSeveridadProps {
  result: PredictionResult;
  machineType: MachineType;
}

export const TabSeveridad: React.FC<TabSeveridadProps> = ({ result, machineType }) => {
  const { severity, metadata } = result;
  const { sensors, maxValues } = metadata;
  const [showLimitsReference, setShowLimitsReference] = useState<boolean>(false);

  const verdeCount = Object.values(severity).filter((s) => s === 'VERDE').length;
  const amarilloCount = Object.values(severity).filter((s) => s === 'AMARILLO').length;
  const rojoCount = Object.values(severity).filter((s) => s === 'ROJO').length;
  const totalSensors = sensors.length;

  const rojosSensors = sensors.filter((s) => severity[s] === 'ROJO');
  const amarillosSensors = sensors.filter((s) => severity[s] === 'AMARILLO');

  return (
    <div className="space-y-6">
      {/* 1. Summary of States Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 flex items-center justify-between shadow">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              🟢 Trạng Thái Bình Thường (An toàn)
            </span>
            <div className="text-3xl font-extrabold text-white mt-1">{verdeCount}</div>
            <p className="text-xs text-slate-400 mt-0.5">{verdeCount} trong số {totalSensors} cảm biến</p>
          </div>
          <CheckCircle className="w-8 h-8 text-emerald-400 opacity-80" />
        </div>

        <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-4 flex items-center justify-between shadow">
          <div>
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              🟡 Cảnh Báo (Cần chú ý)
            </span>
            <div className="text-3xl font-extrabold text-white mt-1">{amarilloCount}</div>
            <p className="text-xs text-slate-400 mt-0.5">{amarilloCount} trong số {totalSensors} cảm biến</p>
          </div>
          <AlertTriangle className="w-8 h-8 text-amber-400 opacity-80" />
        </div>

        <div className="bg-rose-950/30 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between shadow">
          <div>
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              🔴 Nguy Hiểm (Báo động)
            </span>
            <div className="text-3xl font-extrabold text-white mt-1">{rojoCount}</div>
            <p className="text-xs text-slate-400 mt-0.5">{rojoCount} trong số {totalSensors} cảm biến</p>
          </div>
          <AlertCircle className="w-8 h-8 text-rose-400 opacity-80" />
        </div>
      </div>

      {/* 2. Automated Actionable Recommendations */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow space-y-3">
        <h3 className="text-base font-bold text-white flex items-center">
          <span className="mr-2">💡</span> Khuyến Nghị Vận Hành &amp; Bảo Dưỡng Kỹ Thuật
        </h3>

        {rojoCount > 0 && (
          <div className="p-4 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-200 flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-rose-100 font-bold block">
                🔴 NGUY HIỂM: {rojosSensors.join(', ')} - Cần xử lý NGAY LẬP TỨC
              </strong>
              <p className="text-xs text-rose-200/90 mt-1 leading-relaxed">
                Biên độ rung động đỉnh vượt quá ngưỡng cắt tải / nguy cơ hư hỏng cơ khí. Cần lập kế hoạch dừng máy kiểm tra gối đỡ, đánh giá độ rơ khớp nối trục và kiểm tra nhiệt độ kim loại babbitt.
              </p>
            </div>
          </div>
        )}

        {amarilloCount > 0 && (
          <div className="p-4 rounded-lg bg-amber-950/50 border border-amber-500/40 text-amber-200 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-amber-100 font-bold block">
                🟡 CẢNH BÁO: {amarillosSensors.join(', ')} - Giám Sát Liên Tục
              </strong>
              <p className="text-xs text-amber-200/90 mt-1 leading-relaxed">
                Mức rung động nằm trong vùng cảnh báo. Cần theo dõi xu hướng biến thiên ở chế độ tải liên tục và phân tích góc pha trước kỳ dừng máy bảo dưỡng tiếp theo.
              </p>
            </div>
          </div>
        )}

        {verdeCount === totalSensors && (
          <div className="p-4 rounded-lg bg-emerald-950/50 border border-emerald-500/40 text-emerald-200 flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-emerald-100 font-bold block">
                🟢 BÌNH THƯỜNG: Tất cả cảm biến đều trong giới hạn cho phép
              </strong>
              <p className="text-xs text-emerald-200/90 mt-1 leading-relaxed">
                Độ rung tối đa đo được ở tốc độ định mức và quá trình quá độ nằm trong phạm vi vận hành an toàn liên tục theo tiêu chuẩn ISO/ngưỡng quy định.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Detailed Severity Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden shadow">
        <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center">
            <span className="mr-2">🎯</span> Báo Cáo Mức Độ Nghiêm Trọng Theo Cảm Biến ({machineType})
          </h3>
          <button
            onClick={() => setShowLimitsReference(!showLimitsReference)}
            className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center space-x-1"
          >
            <Info className="w-3.5 h-3.5 mr-1" />
            <span>{showLimitsReference ? 'Ẩn Bảng Ngưỡng' : 'Xem Bảng Ngưỡng Quy Chuẩn'}</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="bg-slate-900/90 text-slate-300 font-semibold text-xs uppercase tracking-wider border-b border-slate-700">
                <th className="px-4 py-3">Cảm Biến</th>
                <th className="px-4 py-3">Phương Đo / Vị Trí</th>
                <th className="px-4 py-3">Giá Trị Đỉnh Đo Được</th>
                <th className="px-4 py-3">Ngưỡng An Toàn (Xanh)</th>
                <th className="px-4 py-3">Ngưỡng Cảnh Báo (Vàng)</th>
                <th className="px-4 py-3">Mức Rung Động</th>
                <th className="px-4 py-3">Trạng Thái Vận Hành</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {sensors.map((sensor) => {
                const level = severity[sensor] || 'DESCONOCIDO';
                const maxVal = maxValues[sensor] ?? 0;
                const direction = getSensorDirection(sensor);
                const specific = SENSOR_SPECIFIC_LIMITS[sensor];
                const general = DEFAULT_ACTION_LIMITS[machineType][direction];
                const threshold = specific || general;

                let rowBg = 'hover:bg-slate-800/40';
                let textColor = 'text-slate-200';
                let badgeStyle = 'bg-slate-500/20 text-slate-300 border-slate-500/40';
                let estadoText = 'Chưa xác định';
                let levelLabel = 'CHƯA XÁC ĐỊNH';

                if (level === 'VERDE') {
                  rowBg = 'bg-emerald-950/20 hover:bg-emerald-950/30';
                  textColor = 'text-emerald-300';
                  badgeStyle = 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
                  estadoText = '✅ An Toàn (Bình thường)';
                  levelLabel = 'XANH (BÌNH THƯỜNG)';
                } else if (level === 'AMARILLO') {
                  rowBg = 'bg-amber-950/20 hover:bg-amber-950/30';
                  textColor = 'text-amber-300';
                  badgeStyle = 'bg-amber-500/20 text-amber-400 border-amber-500/40';
                  estadoText = '⚠️ Cảnh Báo (Theo dõi)';
                  levelLabel = 'VÀNG (CẢNH BÁO)';
                } else if (level === 'ROJO') {
                  rowBg = 'bg-rose-950/20 hover:bg-rose-950/30';
                  textColor = 'text-rose-300';
                  badgeStyle = 'bg-rose-500/20 text-rose-400 border-rose-500/40';
                  estadoText = '❌ Nguy Hiểm (Dừng máy)';
                  levelLabel = 'ĐỎ (NGUY HIỂM)';
                }

                return (
                  <tr key={sensor} className={`transition-colors ${rowBg}`}>
                    <td className="px-4 py-3 font-bold text-white font-mono">{sensor}</td>
                    <td className="px-4 py-3 text-xs text-slate-400">{direction}</td>
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {maxVal.toFixed(2)} &mu;m
                    </td>
                    <td className="px-4 py-3 text-xs text-emerald-400 font-mono">
                      &le; {threshold.verde} &mu;m
                    </td>
                    <td className="px-4 py-3 text-xs text-amber-400 font-mono">
                      {threshold.verde} - {threshold.amarillo} &mu;m
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold border ${badgeStyle}`}>
                        {levelLabel}
                      </span>
                    </td>
                    <td className={`px-4 py-3 font-semibold text-xs ${textColor}`}>
                      {estadoText}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Threshold Reference Table (Collapsible) */}
      {showLimitsReference && (
        <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-5 shadow space-y-4">
          <h4 className="text-sm font-bold text-slate-200">
            Bảng Ngưỡng Tham Chiếu Kỹ Thuật (Tiêu chuẩn Rung động Tuabin Thủy lực)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="space-y-2">
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">
                Ngưỡng Theo Cảm Biến Cụ Thể (Francis):
              </span>
              <ul className="space-y-1 text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <li><strong>CSP (Ổ đỡ trên - Hướng kính song song):</strong> Xanh &le; 60, Vàng 60-100, Đỏ &gt; 100 &mu;m</li>
                <li><strong>CSL (Ổ đỡ trên - Hướng kính vuông góc):</strong> Xanh &le; 70, Vàng 70-110, Đỏ &gt; 110 &mu;m</li>
                <li><strong>CTP (Ổ đỡ tuabin - Hướng song song):</strong> Xanh &le; 80, Vàng 80-120, Đỏ &gt; 120 &mu;m</li>
                <li><strong>CTL (Ổ đỡ tuabin - Dọc trục):</strong> Xanh &le; 2.5, Vàng 2.5-5.0, Đỏ &gt; 5.0 &mu;m</li>
              </ul>
            </div>
            <div className="space-y-2">
              <span className="font-semibold text-slate-400 uppercase tracking-wider block">
                Ngưỡng Theo Loại Máy ({machineType}):
              </span>
              <ul className="space-y-1 text-slate-300 bg-slate-950/60 p-3 rounded-lg border border-slate-800">
                <li><strong>GE-DE (Phía khớp nối máy phát):</strong> Xanh &le; {DEFAULT_ACTION_LIMITS[machineType]['GE-DE'].verde}, Vàng &le; {DEFAULT_ACTION_LIMITS[machineType]['GE-DE'].amarillo} &mu;m</li>
                <li><strong>GE-NDE (Phía không khớp nối máy phát):</strong> Xanh &le; {DEFAULT_ACTION_LIMITS[machineType]['GE-NDE'].verde}, Vàng &le; {DEFAULT_ACTION_LIMITS[machineType]['GE-NDE'].amarillo} &mu;m</li>
                <li><strong>T (Vùng bánh xe tuabin):</strong> Xanh &le; {DEFAULT_ACTION_LIMITS[machineType]['T'].verde}, Vàng &le; {DEFAULT_ACTION_LIMITS[machineType]['T'].amarillo} &mu;m</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
