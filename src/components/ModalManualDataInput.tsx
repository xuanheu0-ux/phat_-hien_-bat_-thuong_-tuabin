import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  FileSpreadsheet,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Table,
  UploadCloud,
  ChevronRight,
  HelpCircle,
  Save,
  BookmarkPlus,
} from 'lucide-react';
import { RawDataPoint } from '../utils/turbineProcessor';
import { MachineType, TechnicalScenarioTemplate } from '../types';
import { ManualScenarioBuilder } from './ManualScenarioBuilder';
import { saveCustomScenario } from '../utils/scenarioTemplates';

interface ModalManualDataInputProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyData: (data: RawDataPoint[], sensors: string[], title: string) => void;
  currentRawData: { rawPoints: RawDataPoint[]; sensors: string[] } | null;
  machineType: MachineType;
  initialTab?: 'table' | 'paste' | 'templates';
}

interface EditableRow {
  id: string;
  fecha: string;
  kph: number | string;
  [sensorKey: string]: any;
}

export const ModalManualDataInput: React.FC<ModalManualDataInputProps> = ({
  isOpen,
  onClose,
  onApplyData,
  currentRawData,
  machineType,
  initialTab = 'table',
}) => {
  const [sensors, setSensors] = useState<string[]>(['CSP', 'CSL', 'CTP', 'CTL']);
  const [newSensorName, setNewSensorName] = useState<string>('');
  const [rows, setRows] = useState<EditableRow[]>([]);
  const [datasetName, setDatasetName] = useState<string>('Dữ liệu nhập thủ công');
  const [activeTab, setActiveTab] = useState<'table' | 'paste' | 'templates'>(initialTab);
  const [pasteText, setPasteText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync initialTab when modal opens or initialTab changes
  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // States for "Save Current Table as Scenario Template"
  const [showSaveAsTemplate, setShowSaveAsTemplate] = useState<boolean>(false);
  const [saveTemplateTitle, setSaveTemplateTitle] = useState<string>('');
  const [saveTemplateDesc, setSaveTemplateDesc] = useState<string>('');
  const [saveTemplateCategory, setSaveTemplateCategory] = useState<TechnicalScenarioTemplate['category']>('unbalance');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Initialize or load current data when modal opens
  useEffect(() => {
    if (isOpen) {
      if (currentRawData && currentRawData.rawPoints.length > 0) {
        setSensors([...currentRawData.sensors]);
        // Limit initial display to first 25 points or all if small
        const initRows: EditableRow[] = currentRawData.rawPoints.slice(0, 30).map((p, idx) => {
          const rowObj: EditableRow = {
            id: `row-${idx}-${Date.now()}`,
            fecha: p.Fecha || `2025-11-28 10:${String(idx).padStart(2, '0')}:00`,
            kph: p.KPH,
          };
          currentRawData.sensors.forEach((s) => {
            rowObj[s] = p[s] ?? 0;
          });
          return rowObj;
        });
        setRows(initRows);
        setDatasetName('Dữ liệu tùy chỉnh');
      } else {
        // Generate default 8 rows
        generateDefaultRows(['CSP', 'CSL', 'CTP', 'CTL']);
      }
      setErrorMsg(null);
    }
  }, [isOpen]);

  const generateDefaultRows = (activeSensors: string[]) => {
    const defaultData: EditableRow[] = [
      { id: '1', fecha: '2025-11-28 10:00:00', kph: 150, CSP: 12.5, CSL: 14.2, CTP: 18.0, CTL: 0.8 },
      { id: '2', fecha: '2025-11-28 10:01:00', kph: 300, CSP: 22.1, CSL: 25.4, CTP: 29.5, CTL: 1.1 },
      { id: '3', fecha: '2025-11-28 10:02:00', kph: 450, CSP: 31.8, CSL: 36.2, CTP: 42.0, CTL: 1.4 },
      { id: '4', fecha: '2025-11-28 10:03:00', kph: 550, CSP: 39.4, CSL: 44.5, CTP: 51.2, CTL: 1.6 },
      { id: '5', fecha: '2025-11-28 10:04:00', kph: 600, CSP: 45.0, CSL: 48.0, CTP: 58.0, CTL: 1.9 },
      { id: '6', fecha: '2025-11-28 10:05:00', kph: 600, CSP: 45.3, CSL: 48.5, CTP: 57.8, CTL: 1.85 },
      { id: '7', fecha: '2025-11-28 10:06:00', kph: 600, CSP: 45.1, CSL: 48.2, CTP: 58.2, CTL: 1.9 },
      { id: '8', fecha: '2025-11-28 10:07:00', kph: 600, CSP: 45.4, CSL: 48.6, CTP: 58.1, CTL: 1.92 },
    ];
    setSensors(activeSensors);
    setRows(defaultData);
  };

  // Add new row
  const handleAddRow = () => {
    const lastRow = rows[rows.length - 1];
    const nextSpeed = lastRow ? Number(lastRow.kph) : 600;
    const newRow: EditableRow = {
      id: `row-${Date.now()}-${Math.random()}`,
      fecha: `2025-11-28 10:${String(rows.length % 60).padStart(2, '0')}:00`,
      kph: nextSpeed,
    };
    sensors.forEach((s) => {
      newRow[s] = lastRow ? Number(lastRow[s] || 0) : 10;
    });
    setRows([...rows, newRow]);
  };

  // Delete row
  const handleDeleteRow = (id: string) => {
    if (rows.length <= 5) {
      setErrorMsg('Cần tối thiểu 5 điểm đo để mô hình phân tích hồi quy đa thức hoạt động chính xác.');
      return;
    }
    setRows(rows.filter((r) => r.id !== id));
    setErrorMsg(null);
  };

  // Change cell value
  const handleCellChange = (id: string, field: string, value: string) => {
    setRows(
      rows.map((r) => {
        if (r.id === id) {
          return { ...r, [field]: value };
        }
        return r;
      })
    );
  };

  // Add a new sensor column
  const handleAddSensor = () => {
    const trimmed = newSensorName.trim().toUpperCase();
    if (!trimmed) return;
    if (sensors.includes(trimmed)) {
      setErrorMsg(`Cảm biến ${trimmed} đã tồn tại trong bảng.`);
      return;
    }
    setSensors([...sensors, trimmed]);
    setRows(
      rows.map((r) => ({
        ...r,
        [trimmed]: 10.0,
      }))
    );
    setNewSensorName('');
    setErrorMsg(null);
  };

  // Quick Preset Templates
  const applyPreset = (type: 'unbalance' | 'misalignment' | 'normal') => {
    let newRows: EditableRow[] = [];
    const baseSensors = ['CSP', 'CSL', 'CTP', 'CTL'];
    setSensors(baseSensors);

    if (type === 'unbalance') {
      setDatasetName('Mẫu Thủ Công: Mất Cân Bằng (1X Cao)');
      // Radial sensors high, axial CTL low
      const speeds = [100, 200, 300, 400, 500, 580, 600, 600, 600, 600];
      newRows = speeds.map((spd, i) => {
        const ratio = spd / 600;
        return {
          id: `unb-${i}`,
          fecha: `2025-11-28 11:${String(i).padStart(2, '0')}:00`,
          kph: spd,
          CSP: (15 + 75 * ratio * ratio + (Math.random() * 2 - 1)).toFixed(1),
          CSL: (18 + 82 * ratio * ratio + (Math.random() * 2 - 1)).toFixed(1),
          CTP: (20 + 88 * ratio * ratio + (Math.random() * 2 - 1)).toFixed(1),
          CTL: (0.5 + 1.1 * ratio + (Math.random() * 0.2)).toFixed(2), // low axial
        };
      });
    } else if (type === 'misalignment') {
      setDatasetName('Mẫu Thủ Công: Lệch Trục (2X & Dọc Trục Cao)');
      // High axial CTL > 4.5 and noticeable coupling vibration
      const speeds = [120, 250, 380, 480, 550, 600, 600, 600, 600, 600];
      newRows = speeds.map((spd, i) => {
        const ratio = spd / 600;
        return {
          id: `mis-${i}`,
          fecha: `2025-11-28 14:${String(i).padStart(2, '0')}:00`,
          kph: spd,
          CSP: (25 + 50 * ratio + (Math.random() * 4 - 2)).toFixed(1),
          CSL: (28 + 55 * ratio + (Math.random() * 4 - 2)).toFixed(1),
          CTP: (35 + 72 * ratio + (Math.random() * 5 - 2)).toFixed(1),
          CTL: (1.5 + 4.8 * ratio + (Math.random() * 0.4)).toFixed(2), // HIGH AXIAL!
        };
      });
    } else {
      setDatasetName('Mẫu Thủ Công: Bình Thường (Đạt Tiêu Chuẩn)');
      const speeds = [100, 200, 300, 400, 500, 600, 600, 600, 600];
      newRows = speeds.map((spd, i) => {
        const ratio = spd / 600;
        return {
          id: `norm-${i}`,
          fecha: `2025-11-28 09:${String(i).padStart(2, '0')}:00`,
          kph: spd,
          CSP: (8 + 25 * ratio + (Math.random() * 2 - 1)).toFixed(1),
          CSL: (9 + 28 * ratio + (Math.random() * 2 - 1)).toFixed(1),
          CTP: (12 + 32 * ratio + (Math.random() * 2 - 1)).toFixed(1),
          CTL: (0.4 + 0.8 * ratio + (Math.random() * 0.1)).toFixed(2),
        };
      });
    }

    setRows(newRows);
    setActiveTab('table');
    setErrorMsg(null);
  };

  // Parse Pasted Text (CSV or Excel TSV)
  const handleParsePastedText = () => {
    if (!pasteText.trim()) {
      setErrorMsg('Vui lòng dán văn bản bảng số liệu (từ Excel, Google Sheets hoặc CSV).');
      return;
    }

    try {
      const lines = pasteText
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l.length > 0);
      if (lines.length < 2) {
        throw new Error('Dữ liệu dán vào cần có ít nhất 1 dòng tiêu đề và 1 dòng số liệu.');
      }

      // Detect delimiter: tab (\t), semicolon (;), or comma (,)
      const firstLine = lines[0];
      let delim = '\t';
      if (firstLine.includes('\t')) delim = '\t';
      else if (firstLine.includes(';')) delim = ';';
      else if (firstLine.includes(',')) delim = ',';

      const rawHeaders = firstLine.split(delim).map((h) => h.trim().replace(/^["']|["']$/g, ''));
      const speedCol = rawHeaders.findIndex((h) => h.toUpperCase() === 'KPH');
      if (speedCol === -1) {
        throw new Error('Không tìm thấy cột "KPH" trong dòng tiêu đề.');
      }

      const parsedSensors: string[] = [];
      rawHeaders.forEach((h, idx) => {
        const upper = h.toUpperCase();
        if (
          idx !== speedCol &&
          upper !== 'FECHA' &&
          upper !== 'DATE' &&
          upper !== 'TIME' &&
          upper !== 'INDEX' &&
          upper !== '#' &&
          h.length > 0
        ) {
          parsedSensors.push(h);
        }
      });

      if (parsedSensors.length === 0) {
        throw new Error('Không nhận diện được cột cảm biến nào (CSP, CSL, CTP, CTL, v.v.).');
      }

      const parsedRows: EditableRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(delim).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length <= speedCol) continue;

        const speed = parseFloat(parts[speedCol].replace(',', '.'));
        if (isNaN(speed)) continue;

        const rowObj: EditableRow = {
          id: `paste-${i}-${Date.now()}`,
          fecha: parts[0]?.includes(':') ? parts[0] : `2025-11-28 10:${String(i % 60).padStart(2, '0')}:00`,
          kph: speed,
        };

        parsedSensors.forEach((s) => {
          const colIdx = rawHeaders.indexOf(s);
          if (colIdx !== -1 && colIdx < parts.length) {
            const val = parseFloat(parts[colIdx].replace(',', '.'));
            rowObj[s] = isNaN(val) ? 0 : val;
          } else {
            rowObj[s] = 0;
          }
        });

        parsedRows.push(rowObj);
      }

      if (parsedRows.length < 5) {
        throw new Error('Cần tối thiểu 5 dòng dữ liệu hợp lệ.');
      }

      setSensors(parsedSensors);
      setRows(parsedRows);
      setDatasetName('Dữ liệu dán trực tiếp');
      setActiveTab('table');
      setErrorMsg(null);
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi khi phân tích dữ liệu dán.');
    }
  };

  // Validate and submit data to main application state
  const handleApply = () => {
    if (rows.length < 5) {
      setErrorMsg('Vui lòng nhập tối thiểu 5 hàng dữ liệu để mô hình tính toán sai số dư.');
      return;
    }

    const cleanData: RawDataPoint[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const speed = typeof r.kph === 'number' ? r.kph : parseFloat(String(r.kph).replace(',', '.'));
      if (isNaN(speed)) {
        setErrorMsg(`Hàng ${i + 1}: Tốc độ KPH không hợp lệ ("${r.kph}").`);
        return;
      }

      const pt: RawDataPoint = {
        Fecha: r.fecha || `2025-11-28 10:${String(i % 60).padStart(2, '0')}:00`,
        KPH: speed,
      };

      for (const s of sensors) {
        const valRaw = r[s];
        const val = typeof valRaw === 'number' ? valRaw : parseFloat(String(valRaw).replace(',', '.'));
        if (isNaN(val)) {
          setErrorMsg(`Hàng ${i + 1}: Giá trị cảm biến ${s} không hợp lệ ("${valRaw}").`);
          return;
        }
        pt[s] = val;
      }

      cleanData.push(pt);
    }

    // Success! Send to parent
    onApplyData(cleanData, sensors, datasetName || 'Dữ liệu thủ công');
    onClose();
  };

  // Load scenario generated points directly into the editable table
  const handleLoadScenarioToTable = (data: RawDataPoint[], newSensors: string[], title: string) => {
    setSensors(newSensors);
    const mappedRows: EditableRow[] = data.map((pt, idx) => {
      const r: EditableRow = {
        id: `sc-row-${idx}-${Date.now()}`,
        fecha: pt.Fecha || `2025-11-28 10:${String(idx % 60).padStart(2, '0')}:00`,
        kph: pt.KPH,
      };
      newSensors.forEach((s) => {
        r[s] = pt[s] ?? 0;
      });
      return r;
    });
    setRows(mappedRows);
    setDatasetName(title);
    setActiveTab('table');
    setErrorMsg(null);
  };

  // Apply scenario directly to the application
  const handleApplyScenarioDirectly = (data: RawDataPoint[], newSensors: string[], title: string) => {
    onApplyData(data, newSensors, title);
    onClose();
  };

  // Save the currently edited table rows as a new custom scenario template
  const handleSaveCurrentTableAsScenario = () => {
    if (!saveTemplateTitle.trim()) {
      setErrorMsg('Vui lòng nhập tên cho mẫu tình huống kỹ thuật.');
      return;
    }
    if (rows.length < 5) {
      setErrorMsg('Cần tối thiểu 5 hàng dữ liệu để lưu thành mẫu.');
      return;
    }

    const speeds = rows.map((r) => Number(r.kph) || 0).filter((s) => s > 0);
    const minSpeed = Math.min(...speeds) || 100;
    const maxSpeed = Math.max(...speeds) || 600;

    const sensorsConfig: Record<string, any> = {};
    sensors.forEach((s) => {
      const vals = rows.map((r) => Number(r[s]) || 0);
      const base = Math.min(...vals) || 10;
      const max = Math.max(...vals) || 50;
      sensorsConfig[s] = {
        base: Number(base.toFixed(1)),
        max: Number(max.toFixed(1)),
        noise: 2.0,
      };
    });

    const newScenario: TechnicalScenarioTemplate = {
      id: `custom-from-table-${Date.now()}`,
      title: saveTemplateTitle.trim(),
      description:
        saveTemplateDesc.trim() ||
        `Mẫu kịch bản lưu từ bảng đo đạc (${rows.length} hàng, dải tốc độ ${minSpeed}-${maxSpeed} KPH)`,
      category: saveTemplateCategory,
      author: 'Kỹ sư vận hành',
      createdAt: new Date().toISOString().split('T')[0],
      isBuiltIn: false,
      params: {
        minSpeed,
        maxSpeed,
        sampleCount: rows.length,
        growthModel: saveTemplateCategory === 'unbalance' ? 'quadratic' : 'linear',
        sensorsConfig,
      },
    };

    saveCustomScenario(newScenario);
    setShowSaveAsTemplate(false);
    setSaveTemplateTitle('');
    setSaveTemplateDesc('');
    setSaveSuccessMsg(`Đã lưu bảng dữ liệu thành mẫu kịch bản "${newScenario.title}" vào thư viện!`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[92vh] bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-850 border-b border-slate-700/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center">
                Nhập Dữ Liệu &amp; Đo Đạc Thủ Công
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập trực tiếp bảng đo đạc telemetry, kiểm tra hoặc mô phỏng tình huống rung động cho tuabin {machineType}
              </p>
            </div>
          </div>

          <button
            id="close-manual-input-modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="px-6 pt-3 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between flex-wrap gap-2">
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab('table')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'table'
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Table className="w-3.5 h-3.5" />
              <span>Bảng Nhập Số Liệu ({rows.length} hàng)</span>
            </button>
            <button
              onClick={() => setActiveTab('paste')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'paste'
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>Dán Bảng (Excel / CSV)</span>
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-3 py-2 text-xs font-semibold rounded-t-lg border-b-2 transition-colors flex items-center space-x-1.5 ${
                activeTab === 'templates'
                  ? 'border-blue-500 text-blue-400 bg-slate-800/60'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Mẫu Tình Huống Kỹ Thuật</span>
            </button>
          </div>

          <div className="flex items-center space-x-2 text-xs pb-2">
            <span className="text-slate-400">Tên bộ dữ liệu:</span>
            <input
              type="text"
              value={datasetName}
              onChange={(e) => setDatasetName(e.target.value)}
              className="bg-slate-800 border border-slate-700 px-2.5 py-1 rounded text-white text-xs font-medium focus:outline-none focus:border-blue-500 w-52"
              placeholder="VD: Kiểm tra sau bảo dưỡng 2026..."
            />
          </div>
        </div>

        {/* Error Alert if any */}
        {errorMsg && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-950/60 border border-rose-500/50 text-rose-200 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
            <button
              onClick={() => setErrorMsg(null)}
              className="text-rose-400 hover:text-rose-200 text-xs underline font-semibold"
            >
              Bỏ qua
            </button>
          </div>
        )}

        {/* Success Alert if any */}
        {saveSuccessMsg && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-emerald-950/60 border border-emerald-500/50 text-emerald-200 text-xs flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="flex-1">{saveSuccessMsg}</span>
          </div>
        )}

        {/* Modal Body Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* TAB 1: INTERACTIVE TABLE */}
          {activeTab === 'table' && (
            <div className="space-y-4">
              {/* Table Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/50 p-3 rounded-xl border border-slate-700/60">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleAddRow}
                    className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors shadow"
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" />
                    Thêm Hàng (+1)
                  </button>

                  <button
                    onClick={() => generateDefaultRows(sensors)}
                    className="inline-flex items-center px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Mặc Định
                  </button>

                  <button
                    onClick={() => {
                      setSaveTemplateTitle(datasetName || 'Mẫu Kỹ Thuật Đo Đạc');
                      setShowSaveAsTemplate(true);
                    }}
                    className="inline-flex items-center px-3 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-emerald-100 rounded-lg text-xs font-semibold transition-colors shadow"
                    title="Lưu bảng số liệu hiện tại thành một Mẫu Kịch Bản Kỹ Thuật để tái sử dụng"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5 mr-1 text-emerald-300" />
                    Lưu Thành Mẫu Kỹ Thuật
                  </button>
                </div>

                {/* Add Sensor Column Form */}
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-slate-400">Thêm cảm biến:</span>
                  <input
                    type="text"
                    value={newSensorName}
                    onChange={(e) => setNewSensorName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddSensor()}
                    placeholder="VD: CTI, CTM..."
                    className="bg-slate-900 border border-slate-700 px-2 py-1 rounded text-xs text-white uppercase w-28 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    onClick={handleAddSensor}
                    className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded text-xs font-medium"
                  >
                    Thêm cột
                  </button>
                </div>
              </div>

              {/* Editable Grid Table */}
              <div className="border border-slate-700/80 rounded-xl overflow-x-auto shadow bg-slate-950/60">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-900 text-slate-300 font-semibold uppercase tracking-wider border-b border-slate-700">
                      <th className="px-3 py-2.5 w-12 text-center">STT</th>
                      <th className="px-3 py-2.5 w-36">Thời Gian (Fecha)</th>
                      <th className="px-3 py-2.5 w-32 text-amber-300">Tốc Độ (KPH)</th>
                      {sensors.map((s) => (
                        <th key={s} className="px-3 py-2.5 text-blue-300 min-w-[100px]">
                          {s} (&mu;m)
                        </th>
                      ))}
                      <th className="px-3 py-2.5 w-14 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono">
                    {rows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-slate-800/30">
                        <td className="px-3 py-1.5 text-center text-slate-500 font-sans">{idx + 1}</td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={row.fecha}
                            onChange={(e) => handleCellChange(row.id, 'fecha', e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-700/70 rounded px-2 py-1 text-slate-200 text-xs font-sans focus:outline-none focus:border-blue-500"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="number"
                            step="any"
                            value={row.kph}
                            onChange={(e) => handleCellChange(row.id, 'kph', e.target.value)}
                            className="w-full bg-slate-900/90 border border-slate-700/70 rounded px-2 py-1 text-amber-300 font-bold text-xs focus:outline-none focus:border-amber-500"
                          />
                        </td>
                        {sensors.map((s) => (
                          <td key={s} className="px-2 py-1">
                            <input
                              type="number"
                              step="any"
                              value={row[s] ?? ''}
                              onChange={(e) => handleCellChange(row.id, s, e.target.value)}
                              className="w-full bg-slate-900/90 border border-slate-700/70 rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => handleDeleteRow(row.id)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded transition-colors"
                            title="Xóa hàng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>
                  Tổng số hàng: <strong className="text-white">{rows.length}</strong> (yêu cầu tối thiểu 5 hàng)
                </span>
                <span>
                  Các cảm biến đang theo dõi: <strong className="text-blue-400">{sensors.join(', ')}</strong>
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: COPY-PASTE FROM EXCEL OR CSV */}
          {activeTab === 'paste' && (
            <div className="space-y-3">
              <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/60 text-xs space-y-2 text-slate-300">
                <p className="font-semibold text-white flex items-center">
                  <HelpCircle className="w-4 h-4 mr-1.5 text-blue-400" />
                  Hướng dẫn sao chép từ Excel hoặc Google Sheets:
                </p>
                <p>
                  1. Chọn vùng bảng dữ liệu gồm dòng tiêu đề (chứa cột <strong className="text-amber-300">KPH</strong> và các cảm biến <strong className="text-blue-300">CSP, CSL, CTP, CTL</strong>) và các dòng số đo.
                </p>
                <p>2. Nhấn Ctrl+C (Copy), sau đó nhấp vào ô bên dưới và nhấn Ctrl+V (Paste).</p>
                <p className="text-slate-400">
                  Hệ thống tự động nhận diện định dạng phân tách Tab (\t), dấu chấm phẩy (;) hoặc dấu phẩy (,).
                </p>
              </div>

              <textarea
                rows={10}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
                placeholder={`Fecha\tKPH\tCSP\tCSL\tCTP\tCTL\n2025-11-28 10:00:00\t150\t12.5\t14.2\t18.0\t0.8\n2025-11-28 10:01:00\t300\t22.1\t25.4\t29.5\t1.1\n2025-11-28 10:02:00\t450\t31.8\t36.2\t42.0\t1.4\n2025-11-28 10:03:00\t600\t45.0\t48.0\t58.0\t1.9\n2025-11-28 10:04:00\t600\t45.2\t48.1\t58.1\t1.85`}
                className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-blue-500 leading-relaxed"
              />

              <button
                onClick={handleParsePastedText}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Phân Tích &amp; Nạp Vào Bảng Dữ Liệu</span>
              </button>
            </div>
          )}

          {/* TAB 3: TECHNICAL SCENARIO BUILDER & TEMPLATES (BUILT-IN & MANUAL CUSTOM) */}
          {activeTab === 'templates' && (
            <ManualScenarioBuilder
              onApplyScenario={handleApplyScenarioDirectly}
              onSendToTable={handleLoadScenarioToTable}
              currentSensors={sensors}
            />
          )}
        </div>

        {/* DIALOG: SAVE CURRENT TABLE AS A TECHNICAL SCENARIO TEMPLATE */}
        {showSaveAsTemplate && (
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm z-30 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-fade-in">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <h4 className="text-sm font-bold text-white flex items-center space-x-2">
                  <BookmarkPlus className="w-4 h-4 text-emerald-400" />
                  <span>Lưu Bảng Đo Thành Mẫu Kỹ Thuật Thủ Công</span>
                </h4>
                <button
                  onClick={() => setShowSaveAsTemplate(false)}
                  className="text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Tên Mẫu Tình Huống Kỹ Thuật *
                  </label>
                  <input
                    type="text"
                    value={saveTemplateTitle}
                    onChange={(e) => setSaveTemplateTitle(e.target.value)}
                    placeholder="VD: Kiểm tra sau đại tu gối trục số 1..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Phân Loại Kỹ Thuật
                  </label>
                  <select
                    value={saveTemplateCategory}
                    onChange={(e) => setSaveTemplateCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="unbalance">Mất cân bằng 1X (Unbalance)</option>
                    <option value="misalignment">Lệch trục 2X (Misalignment)</option>
                    <option value="normal">Bình thường (ISO 10816 Zone A/B)</option>
                    <option value="looseness">Lỏng cơ khí bạc đỡ (Looseness)</option>
                    <option value="resonance">Cộng hưởng tới hạn (Resonance)</option>
                    <option value="custom">Tùy chỉnh đặc thù (Custom)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 font-semibold block mb-1">
                    Mô Tả Hiện Trường &amp; Ghi Chú
                  </label>
                  <textarea
                    rows={3}
                    value={saveTemplateDesc}
                    onChange={(e) => setSaveTemplateDesc(e.target.value)}
                    placeholder="Ghi chú điều kiện vận hành, tải máy phát, tình trạng rung đo được..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800 text-[11px] text-slate-400">
                  Mẫu này sẽ lưu {rows.length} điểm đo đạc với các cảm biến ({sensors.join(', ')}) vào Thư viện Mẫu Kỹ Thuật trên trình duyệt của bạn để tái sử dụng bất cứ lúc nào.
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-800">
                <button
                  onClick={() => setShowSaveAsTemplate(false)}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleSaveCurrentTableAsScenario}
                  className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow"
                >
                  Lưu Vào Thư Viện
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-850 border-t border-slate-700/80 flex items-center justify-between">
          <div className="text-xs text-slate-400">
            Dữ liệu sẽ được truyền trực tiếp vào thuật toán hồi quy đa thức &amp; mô phỏng 3D
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold transition-colors"
            >
              Hủy
            </button>
            <button
              id="apply-manual-data-btn"
              onClick={handleApply}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Áp Dụng &amp; Phân Tích Kỹ Thuật</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
