import React from 'react';
import { PredictionResult } from '../types';
import { CheckCircle2, AlertTriangle, Gauge, Radio, Cpu, Layers } from 'lucide-react';

interface TabPrediccionProps {
  result: PredictionResult;
}

export const TabPrediccion: React.FC<TabPrediccionProps> = ({ result }) => {
  const { prediction, confidence, probabilities, metadata, residualsStats } = result;
  const isMisalignment = prediction === 'LỆCH TRỤC' || prediction === 'DESALINEACIÓN';

  const confidencePct = (confidence * 100).toFixed(1);
  const desbalPct = (probabilities.desbalanceo * 100).toFixed(1);
  const desalinPct = (probabilities.desalineacion * 100).toFixed(1);

  const desbalPoints = Math.round(metadata.samplesAnalyzed * probabilities.desbalanceo);
  const desalinPoints = Math.round(metadata.samplesAnalyzed * probabilities.desalineacion);

  return (
    <div className="space-y-6">
      {/* 1. Primary Classification Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          id="prediction-diagnosis-banner"
          className={`md:col-span-2 p-5 rounded-xl border flex items-start space-x-4 shadow-lg ${
            isMisalignment
              ? 'bg-rose-950/40 border-rose-500/40 text-rose-100'
              : 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
          }`}
        >
          <div
            className={`p-3 rounded-xl ${
              isMisalignment ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
            }`}
          >
            {isMisalignment ? (
              <AlertTriangle className="w-8 h-8" />
            ) : (
              <CheckCircle2 className="w-8 h-8" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Chẩn đoán Mô hình Xác suất (Hồi quy Logistic)
              </span>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold border ${
                  isMisalignment
                    ? 'bg-rose-500/20 border-rose-400 text-rose-300'
                    : 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                }`}
              >
                Độ tin cậy: {confidencePct}%
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
              {prediction}
            </h2>
            <p className="text-sm mt-1.5 opacity-90 leading-relaxed">
              {isMisalignment
                ? 'Phát hiện hiện tượng lệch trục tại trục truyền động hoặc bánh xe công tác với thành phần sóng hài bậc 2 (2X) và độ lệch dư cao ở cảm biến dọc trục (CTL).'
                : 'Phát hiện hiện tượng mất cân bằng tĩnh/động do khối lượng lệch tâm, với biên độ dao động bậc 1 (1X) chiếm ưu thế tại các cảm biến hướng kính (CSP/CSL).'}
            </p>
          </div>
        </div>

        {/* Total Samples Card */}
        <div
          id="total-samples-card"
          className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-5 flex flex-col justify-between shadow"
        >
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
              Mẫu Phân Tích
            </span>
            <div className="text-3xl sm:text-4xl font-extrabold text-white mt-2">
              {metadata.samplesAnalyzed.toLocaleString()}
            </div>
            <p className="text-xs text-slate-400 mt-1">Các điểm đo lường theo thời gian đã đồng bộ</p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between text-xs">
            <span className="text-slate-400">Điểm bất thường (|r| &gt; 0.1):</span>
            <span className="font-semibold text-amber-400">{metadata.nAnomalies}</span>
          </div>
        </div>
      </div>

      {/* 2. Phenomenon Distribution */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow">
        <h3 className="text-base font-bold text-white mb-4 flex items-center">
          <span className="mr-2">📊</span> Phân Bố Hiện Tượng
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div className="bg-slate-900/80 border border-emerald-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-emerald-400 flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 mr-2"></span>
                Mất Cân Bằng
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 font-bold border border-emerald-500/30">
                {desbalPct}%
              </span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">{desbalPoints} điểm</div>
            <div className="text-xs text-slate-400 mt-1">Xác suất: {probabilities.desbalanceo}</div>
          </div>

          <div className="bg-slate-900/80 border border-rose-500/20 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-rose-400 flex items-center">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400 mr-2"></span>
                Lệch Trục
              </span>
              <span className="text-xs px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 font-bold border border-rose-500/30">
                {desalinPct}%
              </span>
            </div>
            <div className="text-2xl font-bold text-white mt-2">{desalinPoints} điểm</div>
            <div className="text-xs text-slate-400 mt-1">Xác suất: {probabilities.desalineacion}</div>
          </div>
        </div>

        {/* Visual Probability Bar */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-slate-400 font-medium">
            <span>P(Mất cân bằng)</span>
            <span>P(Lệch trục)</span>
          </div>
          <div className="h-3 w-full bg-slate-700/60 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${desbalPct}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Mất cân bằng: ${desbalPct}%`}
            />
            <div
              style={{ width: `${desalinPct}%` }}
              className="bg-rose-500 transition-all duration-500"
              title={`Lệch trục: ${desalinPct}%`}
            />
          </div>
        </div>
      </div>

      {/* 3. Analysis Information */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow">
        <h3 className="text-base font-bold text-white mb-4 flex items-center">
          <span className="mr-2">📋</span> Thông Tin Phân Tích Vận Hành
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/70 border border-slate-700/60 rounded-lg p-3.5 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Gauge className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">Tốc Độ Định Mức</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {metadata.nominalSpeed} <span className="text-xs text-slate-400 font-normal">KPH</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/60 rounded-lg p-3.5 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">Cảm Biến Đã Ghi Nhận</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {metadata.sensors.length} <span className="text-xs text-slate-400 font-normal">({metadata.sensors.join(', ')})</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/60 rounded-lg p-3.5 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">Độ Tin Cậy Mô Hình</span>
              <div className="text-lg font-bold text-white mt-0.5">{confidencePct}%</div>
            </div>
          </div>

          <div className="bg-slate-900/70 border border-slate-700/60 rounded-lg p-3.5 flex items-start space-x-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs text-slate-400">Sai Số Dư Trung Bình</span>
              <div className="text-lg font-bold text-white mt-0.5">
                {residualsStats.mean.toFixed(3)} <span className="text-xs text-slate-400 font-normal">&mu;m</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
