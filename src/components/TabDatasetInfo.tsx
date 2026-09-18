import React, { useState } from 'react';
import { PredictionResult } from '../types';
import { Database, FileText, Download, Edit3, Sparkles } from 'lucide-react';

interface TabDatasetInfoProps {
  result: PredictionResult;
  onOpenManualInput?: (tab?: 'table' | 'paste' | 'templates') => void;
}

export const TabDatasetInfo: React.FC<TabDatasetInfoProps> = ({ result, onOpenManualInput }) => {
  const { metadata, fileName, timestamp, prediction, confidence } = result;
  const [page, setPage] = useState<number>(0);
  const pageSize = 15;

  const totalPoints = metadata.samplesAnalyzed;
  const totalPages = Math.ceil(totalPoints / pageSize);
  const startIndex = page * pageSize;
  const endIndex = Math.min(startIndex + pageSize, totalPoints);

  const downloadCSV = () => {
    const headers = ['Index', 'Fecha', 'KPH', ...metadata.sensors];
    const rows = [];
    rows.push(headers.join(';'));

    for (let i = 0; i < totalPoints; i++) {
      const sensorVals = metadata.sensors.map(
        (s) => metadata.sensorData[s]?.original[i]?.toFixed(2) ?? '0'
      );
      rows.push([i + 1, `2025-11-28 10:00:${(i % 60).toString().padStart(2, '0')}`, metadata.kph[i].toFixed(2), ...sensorVals].join(';'));
    }

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `analisis_${fileName || 'turbina'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Overview Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center">
            <FileText className="w-4 h-4 mr-2 text-blue-400" />
            Thông Tin Siêu Dữ Liệu (Metadata)
          </h3>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-400">Tệp Đang Phân Tích:</span>
              <span className="font-mono text-white font-semibold">{fileName}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-400">Thời Gian Xử Lý:</span>
              <span className="font-mono text-slate-300">{new Date(timestamp).toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex justify-between py-1 border-b border-slate-700/50">
              <span className="text-slate-400">Tốc Độ Định Mức Nhận Diện:</span>
              <span className="font-mono text-emerald-400 font-bold">{metadata.nominalSpeed} KPH</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-slate-400">Chẩn Đoán Chính:</span>
              <span className="font-bold text-amber-400">{prediction} ({(confidence * 100).toFixed(1)}%)</span>
            </div>
          </div>
        </div>

        <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-5 shadow space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center">
            <Database className="w-4 h-4 mr-2 text-emerald-400" />
            Kênh Thu Thập Dữ Liệu (Cảm Biến Rung)
          </h3>
          <div className="space-y-2 text-xs">
            <p className="text-slate-300 leading-relaxed">
              Hệ thống tiếp nhận tín hiệu từ các cảm biến đo độ dịch chuyển bằng dòng điện xoáy Foucault (đầu dò tiệm cận cảm ứng), theo dõi quỹ đạo chuyển động của trục và bánh xe công tác tuabin.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              {metadata.sensors.map((s) => (
                <div key={s} className="bg-slate-900/80 p-2 rounded border border-slate-800 flex justify-between">
                  <span className="font-mono font-bold text-blue-300">{s}</span>
                  <span className="text-slate-400">{metadata.sensorData[s]?.meanResidual.toFixed(3)} &mu;m sai số</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Raw Data Preview Table */}
      <div className="bg-slate-800/60 border border-slate-700/80 rounded-xl overflow-hidden shadow">
        <div className="px-5 py-4 border-b border-slate-700/80 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-white flex items-center">
              <Database className="w-4 h-4 mr-2 text-amber-400" />
              Mẫu Dữ Liệu Đo Đạc Telemetry (Hàng {startIndex + 1} đến {endIndex} trên tổng số {totalPoints})
            </h3>
            <p className="text-xs text-slate-400">Kiểm tra giá trị đo thực tế và giá trị tính toán theo từng mẫu thời gian</p>
          </div>

          <div className="flex items-center space-x-2">
            {onOpenManualInput && (
              <>
                <button
                  id="open-scenarios-table-btn"
                  onClick={() => onOpenManualInput('templates')}
                  className="inline-flex items-center px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold shadow transition-colors"
                  title="Mẫu tình huống kỹ thuật"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
                  Mẫu Kỹ Thuật
                </button>

                <button
                  id="open-manual-input-table-btn"
                  onClick={() => onOpenManualInput('table')}
                  className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1.5" />
                  Nhập / Sửa Số Liệu
                </button>
              </>
            )}

            <button
              onClick={downloadCSV}
              className="inline-flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Tải Tệp CSV
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-700">
                <th className="px-3 py-2.5">STT</th>
                <th className="px-3 py-2.5">KPH (Tốc độ)</th>
                {metadata.sensors.map((s) => (
                  <React.Fragment key={s}>
                    <th className="px-3 py-2.5 text-blue-300">{s} Đo thực (&mu;m)</th>
                    <th className="px-3 py-2.5 text-rose-300">{s} Đường khớp</th>
                    <th className="px-3 py-2.5 text-amber-300">{s} |Sai số|</th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono">
              {Array.from({ length: endIndex - startIndex }).map((_, offset) => {
                const idx = startIndex + offset;
                return (
                  <tr key={idx} className="hover:bg-slate-800/40">
                    <td className="px-3 py-2 text-slate-500 font-sans">{idx + 1}</td>
                    <td className="px-3 py-2 font-bold text-white">{metadata.kph[idx].toFixed(2)}</td>
                    {metadata.sensors.map((s) => {
                      const sData = metadata.sensorData[s];
                      const real = sData?.original[idx] ?? 0;
                      const pred = sData?.predicted[idx] ?? 0;
                      const absR = sData?.absResidual[idx] ?? 0;
                      return (
                        <React.Fragment key={s}>
                          <td className="px-3 py-2 text-slate-200">{real.toFixed(2)}</td>
                          <td className="px-3 py-2 text-slate-400">{pred.toFixed(2)}</td>
                          <td className="px-3 py-2 text-amber-400">{absR.toFixed(2)}</td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3 bg-slate-900/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Trang {page + 1} / {totalPages}</span>
          <div className="flex space-x-2">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Trước
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
              disabled={page >= totalPages - 1}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 rounded text-slate-200"
            >
              Sau
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
