import React, { useRef } from 'react';
import { MachineType } from '../types';
import { SAMPLE_DATASETS } from '../utils/sampleDatasets';
import { Activity, Upload, Database, Settings2, Edit3, Sparkles } from 'lucide-react';

interface HeaderProps {
  machineType: MachineType;
  onMachineTypeChange: (type: MachineType) => void;
  onFileUpload: (file: File) => void;
  onSelectSample: (sampleId: string) => void;
  onOpenManualInput?: (tab?: 'table' | 'paste' | 'templates') => void;
  currentFileName: string;
  isProcessing: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  machineType,
  onMachineTypeChange,
  onFileUpload,
  onSelectSample,
  onOpenManualInput,
  currentFileName,
  isProcessing,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          
          {/* App Branding */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold shadow-inner">
              <span className="text-xl">⚡</span>
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Phát Hiện Bất Thường Tuabin Thủy Lực
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  ML + Sai số dư
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Chẩn đoán mất cân bằng vs lệch trục và đánh giá mức độ nghiêm trọng rung động
              </p>
            </div>
          </div>

          {/* Quick Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Machine Selector */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
              <Settings2 className="w-3.5 h-3.5 text-slate-400 mr-1.5" />
              <span className="text-slate-400 mr-2 font-medium">Loại máy:</span>
              <select
                id="machine-type-select"
                aria-label="Loại máy tuabin"
                value={machineType}
                onChange={(e) => onMachineTypeChange(e.target.value as MachineType)}
                className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="Francis horizontal" className="bg-slate-800 text-slate-200">Francis trục ngang</option>
                <option value="Pelton horizontal" className="bg-slate-800 text-slate-200">Pelton trục ngang</option>
                <option value="Pump horizontal" className="bg-slate-800 text-slate-200">Bơm trục ngang</option>
              </select>
            </div>

            {/* Preloaded Samples Dropdown */}
            <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs">
              <Database className="w-3.5 h-3.5 text-blue-400 mr-1.5" />
              <span className="text-slate-400 mr-2 font-medium">Dữ liệu mẫu:</span>
              <select
                id="sample-data-select"
                aria-label="Chọn tập dữ liệu mẫu"
                onChange={(e) => e.target.value && onSelectSample(e.target.value)}
                defaultValue=""
                className="bg-transparent text-blue-300 font-semibold focus:outline-none cursor-pointer"
              >
                <option value="" disabled className="bg-slate-800 text-slate-400">Tải tập dữ liệu mẫu...</option>
                {SAMPLE_DATASETS.map((s) => (
                  <option key={s.id} value={s.id} className="bg-slate-800 text-slate-200">
                    {s.name} ({s.expectedClass})
                  </option>
                ))}
              </select>
            </div>

            {/* Technical Scenarios Builder / Presets Button */}
            <button
              id="open-scenarios-header-btn"
              type="button"
              onClick={() => onOpenManualInput && onOpenManualInput('templates')}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-semibold shadow transition-colors"
              title="Mẫu tình huống kỹ thuật (Mất cân bằng, Lệch trục, Lỏng cơ khí...)"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5 text-amber-400" />
              <span>Mẫu Kỹ Thuật</span>
            </button>

            {/* Manual Data Entry Button */}
            <button
              id="open-manual-input-header-btn"
              type="button"
              onClick={() => onOpenManualInput && onOpenManualInput('table')}
              disabled={isProcessing}
              className="inline-flex items-center px-3 py-1.5 bg-slate-800 hover:bg-slate-700 hover:text-white border border-slate-700/90 text-slate-200 rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5 mr-1.5 text-blue-400" />
              <span>Nhập Số Liệu</span>
            </button>

            {/* CSV File Upload */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <button
              id="upload-csv-btn"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="inline-flex items-center px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow transition-colors"
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" />
              {isProcessing ? 'Đang xử lý...' : 'Tải lên CSV'}
            </button>
          </div>

        </div>

        {/* Current Active File Banner */}
        {currentFileName && (
          <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center space-x-2">
              <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Tệp đang phân tích: <strong className="text-slate-200 font-mono">{currentFileName}</strong></span>
            </div>
            <span className="text-slate-500 text-[11px]">
              Định dạng hỗ trợ: dấu chấm phẩy (;) hoặc dấu phẩy (,)
            </span>
          </div>
        )}
      </div>
    </header>
  );
};
