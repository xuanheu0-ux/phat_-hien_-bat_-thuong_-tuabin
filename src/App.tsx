import React, { useState, useEffect } from 'react';
import { MachineType, PredictionResult } from './types';
import { parseCSV, processTurbineData } from './utils/turbineProcessor';
import { SAMPLE_DATASETS } from './utils/sampleDatasets';
import { Header } from './components/Header';
import { TabPrediccion } from './components/TabPrediccion';
import { TabGraficas } from './components/TabGraficas';
import { TabSeveridad } from './components/TabSeveridad';
import { TabDatasetInfo } from './components/TabDatasetInfo';
import { TabVisualizacion3D } from './components/TabVisualizacion3D';
import { ModalManualDataInput } from './components/ModalManualDataInput';
import { BarChart3, LineChart, ShieldCheck, Table, AlertCircle, Rotate3d } from 'lucide-react';

export function App() {
  const [machineType, setMachineType] = useState<MachineType>('Francis horizontal');
  const [currentResult, setCurrentResult] = useState<PredictionResult | null>(null);
  const [activeTab, setActiveTab] = useState<'prediccion' | 'graficas' | 'severidad' | 'visualizacion3d' | 'telemetria'>('prediccion');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeRawData, setActiveRawData] = useState<{ rawPoints: any[]; sensors: string[] } | null>(null);
  const [isManualInputOpen, setIsManualInputOpen] = useState<boolean>(false);
  const [manualInputTab, setManualInputTab] = useState<'table' | 'paste' | 'templates'>('table');

  const handleOpenManualInput = (tab: 'table' | 'paste' | 'templates' = 'table') => {
    setManualInputTab(tab);
    setIsManualInputOpen(true);
  };

  // Load initial default sample on first mount
  useEffect(() => {
    const defaultSample = SAMPLE_DATASETS[0];
    try {
      const { data, sensors } = parseCSV(defaultSample.csvContent);
      setActiveRawData({ rawPoints: data, sensors });
      const res = processTurbineData(defaultSample.name, data, sensors, machineType);
      setCurrentResult(res);
    } catch (err: any) {
      setErrorMessage(err.message || 'Lỗi khi tải dữ liệu mẫu ban đầu.');
    }
  }, []);

  // Re-process when machine type changes
  const handleMachineTypeChange = (newType: MachineType) => {
    setMachineType(newType);
    if (activeRawData && currentResult) {
      const updated = processTurbineData(
        currentResult.fileName,
        activeRawData.rawPoints,
        activeRawData.sensors,
        newType
      );
      setCurrentResult(updated);
    }
  };

  // Handle custom file upload
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const text = await file.text();
      const { data, sensors } = parseCSV(text);
      setActiveRawData({ rawPoints: data, sensors });
      const result = processTurbineData(file.name, data, sensors, machineType);
      setCurrentResult(result);
    } catch (err: any) {
      setErrorMessage(`Lỗi khi xử lý "${file.name}": ${err.message || 'Định dạng không tương thích'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle preloaded sample selection
  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_DATASETS.find((s) => s.id === sampleId);
    if (!sample) return;

    setIsProcessing(true);
    setErrorMessage(null);

    setTimeout(() => {
      try {
        const { data, sensors } = parseCSV(sample.csvContent);
        setActiveRawData({ rawPoints: data, sensors });
        const result = processTurbineData(sample.name, data, sensors, machineType);
        setCurrentResult(result);
      } catch (err: any) {
        setErrorMessage(`Lỗi khi tải dữ liệu mẫu: ${err.message}`);
      } finally {
        setIsProcessing(false);
      }
    }, 100);
  };

  // Handle manual data entry applied from modal
  const handleApplyManualData = (data: any[], sensors: string[], title: string) => {
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      setActiveRawData({ rawPoints: data, sensors });
      const result = processTurbineData(title, data, sensors, machineType);
      setCurrentResult(result);
    } catch (err: any) {
      setErrorMessage(`Lỗi phân tích dữ liệu nhập thủ công: ${err.message || 'Dữ liệu không hợp lệ'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* App Header */}
      <Header
        machineType={machineType}
        onMachineTypeChange={handleMachineTypeChange}
        onFileUpload={handleFileUpload}
        onSelectSample={handleSelectSample}
        onOpenManualInput={handleOpenManualInput}
        currentFileName={currentResult?.fileName || ''}
        isProcessing={isProcessing}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Error notification */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-500/50 text-rose-200 flex items-start space-x-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="font-bold text-rose-100">Chú ý:</strong> {errorMessage}
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs text-rose-300 hover:text-white font-bold ml-2"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Navigation Tabs (replicating Streamlit tabs) */}
        <div className="flex border-b border-slate-800 space-x-2 sm:space-x-4 overflow-x-auto">
          <button
            id="tab-prediccion-btn"
            onClick={() => setActiveTab('prediccion')}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'prediccion'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 Dự đoán Tổng quan</span>
          </button>

          <button
            id="tab-3d-btn"
            onClick={() => setActiveTab('visualizacion3d')}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'visualizacion3d'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Rotate3d className="w-4 h-4" />
            <span>🌐 Mô Phỏng 3D Rung Động</span>
          </button>

          <button
            id="tab-graficas-btn"
            onClick={() => setActiveTab('graficas')}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'graficas'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LineChart className="w-4 h-4" />
            <span>📈 Biểu đồ Cảm biến</span>
          </button>

          <button
            id="tab-severidad-btn"
            onClick={() => setActiveTab('severidad')}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'severidad'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>🎯 Mức độ Nghiêm trọng</span>
          </button>

          <button
            id="tab-telemetria-btn"
            onClick={() => setActiveTab('telemetria')}
            className={`pb-3 px-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors whitespace-nowrap ${
              activeTab === 'telemetria'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Table className="w-4 h-4" />
            <span>📋 Dữ liệu &amp; Đo đạc</span>
          </button>
        </div>

        {/* Tab Content Display */}
        {currentResult ? (
          <div>
            {activeTab === 'prediccion' && <TabPrediccion result={currentResult} />}
            {activeTab === 'visualizacion3d' && (
              <TabVisualizacion3D result={currentResult} machineType={machineType} />
            )}
            {activeTab === 'graficas' && <TabGraficas result={currentResult} />}
            {activeTab === 'severidad' && (
              <TabSeveridad result={currentResult} machineType={machineType} />
            )}
            {activeTab === 'telemetria' && (
              <TabDatasetInfo
                result={currentResult}
                onOpenManualInput={handleOpenManualInput}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-16 bg-slate-900/60 rounded-xl border border-slate-800">
            <p className="text-slate-400 text-sm">Đang tải mô hình và dữ liệu đo đạc ban đầu...</p>
          </div>
        )}
      </main>

      {/* Manual Data Input & Technical Scenario Builder Modal */}
      <ModalManualDataInput
        isOpen={isManualInputOpen}
        onClose={() => setIsManualInputOpen(false)}
        onApplyData={handleApplyManualData}
        currentRawData={activeRawData}
        machineType={machineType}
        initialTab={manualInputTab}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-4 mt-auto text-center text-xs text-slate-500">
        <p>
          Hệ thống Phát hiện và Phân loại Bất thường Tuabin Thủy điện Francis / Pelton &bull; Mô hình Học máy Sai số dư Đa thức + Bộ phân loại Logistic
        </p>
      </footer>
    </div>
  );
}

export default App;
