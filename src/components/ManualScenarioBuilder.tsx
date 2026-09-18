import React, { useState, useEffect } from 'react';
import {
  TechnicalScenarioTemplate,
  SensorParamConfig,
} from '../types';
import {
  BUILT_IN_SCENARIOS,
  getStoredCustomScenarios,
  saveCustomScenario,
  deleteCustomScenario,
  generateScenarioData,
} from '../utils/scenarioTemplates';
import { RawDataPoint } from '../utils/turbineProcessor';
import {
  Sparkles,
  Plus,
  Save,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Activity,
  Sliders,
  FileText,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface ManualScenarioBuilderProps {
  onApplyScenario: (data: RawDataPoint[], sensors: string[], title: string) => void;
  onSendToTable: (data: RawDataPoint[], sensors: string[], title: string) => void;
  currentSensors: string[];
}

export const ManualScenarioBuilder: React.FC<ManualScenarioBuilderProps> = ({
  onApplyScenario,
  onSendToTable,
  currentSensors,
}) => {
  const [customScenarios, setCustomScenarios] = useState<TechnicalScenarioTemplate[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(BUILT_IN_SCENARIOS[1].id);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for manual input/creation of scenario
  const [formTitle, setFormTitle] = useState<string>('');
  const [formDescription, setFormDescription] = useState<string>('');
  const [formCategory, setFormCategory] = useState<TechnicalScenarioTemplate['category']>('unbalance');
  const [formAuthor, setFormAuthor] = useState<string>('Kỹ sư vận hành');
  const [formMinSpeed, setFormMinSpeed] = useState<number>(100);
  const [formMaxSpeed, setFormMaxSpeed] = useState<number>(600);
  const [formSampleCount, setFormSampleCount] = useState<number>(10);
  const [formGrowthModel, setFormGrowthModel] = useState<'quadratic' | 'linear' | 'resonance'>('quadratic');
  const [formSensorsConfig, setFormSensorsConfig] = useState<Record<string, SensorParamConfig>>({
    CSP: { base: 15, max: 85, noise: 2.5 },
    CSL: { base: 18, max: 92, noise: 2.8 },
    CTP: { base: 20, max: 96, noise: 3.0 },
    CTL: { base: 0.5, max: 1.5, noise: 0.2 },
  });

  // Preview data generated in real-time
  const [previewData, setPreviewData] = useState<{ rawPoints: RawDataPoint[]; sensors: string[] }>({
    rawPoints: [],
    sensors: [],
  });

  // Load custom scenarios on mount
  useEffect(() => {
    refreshCustomScenarios();
  }, []);

  const refreshCustomScenarios = () => {
    const list = getStoredCustomScenarios();
    setCustomScenarios(list);
  };

  // Combine built-in and custom scenarios
  const allScenarios = [...BUILT_IN_SCENARIOS, ...customScenarios];
  const currentScenario = allScenarios.find((s) => s.id === selectedScenarioId) || BUILT_IN_SCENARIOS[0];

  // Update preview whenever form states or selected scenario changes
  useEffect(() => {
    if (isEditing) {
      // Build temporary scenario from form
      const tempScenario: TechnicalScenarioTemplate = {
        id: 'preview',
        title: formTitle,
        description: formDescription,
        category: formCategory,
        createdAt: new Date().toISOString(),
        params: {
          minSpeed: formMinSpeed,
          maxSpeed: formMaxSpeed,
          sampleCount: formSampleCount,
          growthModel: formGrowthModel,
          sensorsConfig: formSensorsConfig,
        },
      };
      setPreviewData(generateScenarioData(tempScenario));
    } else if (currentScenario) {
      setPreviewData(generateScenarioData(currentScenario));
    }
  }, [
    isEditing,
    selectedScenarioId,
    formTitle,
    formDescription,
    formCategory,
    formMinSpeed,
    formMaxSpeed,
    formSampleCount,
    formGrowthModel,
    formSensorsConfig,
  ]);

  // Start creating a brand new scenario manually
  const handleStartCreateNew = () => {
    setFormTitle('Mẫu Tình Huống Kỹ Thuật Mới');
    setFormDescription('Kịch bản mô phỏng tình trạng rung động tuabin thủy lực...');
    setFormCategory('unbalance');
    setFormAuthor('Kỹ sư trạm thủy điện');
    setFormMinSpeed(100);
    setFormMaxSpeed(600);
    setFormSampleCount(10);
    setFormGrowthModel('quadratic');
    setFormSensorsConfig({
      CSP: { base: 14, max: 80, noise: 2.0 },
      CSL: { base: 16, max: 86, noise: 2.5 },
      CTP: { base: 18, max: 90, noise: 3.0 },
      CTL: { base: 0.6, max: 1.6, noise: 0.2 },
    });
    setIsEditing(true);
  };

  // Start editing existing scenario
  const handleStartEdit = (sc: TechnicalScenarioTemplate) => {
    setFormTitle(sc.isBuiltIn ? `${sc.title} (Bản tùy chỉnh)` : sc.title);
    setFormDescription(sc.description);
    setFormCategory(sc.category);
    setFormAuthor(sc.author || 'Kỹ sư vận hành');
    setFormMinSpeed(sc.params.minSpeed);
    setFormMaxSpeed(sc.params.maxSpeed);
    setFormSampleCount(sc.params.sampleCount);
    setFormGrowthModel(sc.params.growthModel);
    setFormSensorsConfig(JSON.parse(JSON.stringify(sc.params.sensorsConfig)));
    setIsEditing(true);
  };

  // Change sensor parameter in form
  const handleSensorParamChange = (
    sensor: string,
    field: keyof SensorParamConfig,
    value: number
  ) => {
    setFormSensorsConfig((prev) => ({
      ...prev,
      [sensor]: {
        ...prev[sensor],
        [field]: value,
      },
    }));
  };

  // Save scenario to localStorage
  const handleSaveScenario = () => {
    if (!formTitle.trim()) {
      setNotification({ type: 'error', message: 'Vui lòng nhập tên cho mẫu tình huống kỹ thuật.' });
      return;
    }

    const newId = `custom-sc-${Date.now()}`;
    const newScenario: TechnicalScenarioTemplate = {
      id: newId,
      title: formTitle.trim(),
      description: formDescription.trim(),
      category: formCategory,
      author: formAuthor.trim() || 'Kỹ sư vận hành',
      createdAt: new Date().toISOString().split('T')[0],
      isBuiltIn: false,
      params: {
        minSpeed: formMinSpeed,
        maxSpeed: formMaxSpeed,
        sampleCount: formSampleCount,
        growthModel: formGrowthModel,
        sensorsConfig: formSensorsConfig,
      },
    };

    const ok = saveCustomScenario(newScenario);
    if (ok) {
      refreshCustomScenarios();
      setSelectedScenarioId(newId);
      setIsEditing(false);
      setNotification({
        type: 'success',
        message: `Đã lưu thành công mẫu kịch bản kỹ thuật "${newScenario.title}" vào thư viện!`,
      });
      setTimeout(() => setNotification(null), 4000);
    } else {
      setNotification({ type: 'error', message: 'Không thể lưu mẫu kịch bản vào bộ nhớ trình duyệt.' });
    }
  };

  // Delete custom scenario
  const handleDeleteCustom = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm('Bạn có chắc chắn muốn xóa mẫu kịch bản kỹ thuật này không?')) {
      deleteCustomScenario(id);
      refreshCustomScenarios();
      if (selectedScenarioId === id) {
        setSelectedScenarioId(BUILT_IN_SCENARIOS[0].id);
      }
      setNotification({ type: 'success', message: 'Đã xóa mẫu kịch bản thành công.' });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Export templates as JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(customScenarios, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `mau-tinh-huong-ky-thuat-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import templates from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target?.result as string);
        if (Array.isArray(imported)) {
          let count = 0;
          imported.forEach((sc) => {
            if (sc.title && sc.params) {
              saveCustomScenario({
                ...sc,
                id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
                isBuiltIn: false,
              });
              count++;
            }
          });
          refreshCustomScenarios();
          setNotification({ type: 'success', message: `Đã nhập thành công ${count} mẫu tình huống kỹ thuật!` });
        } else {
          setNotification({ type: 'error', message: 'Định dạng tệp JSON không hợp lệ.' });
        }
      } catch (err) {
        setNotification({ type: 'error', message: 'Lỗi đọc tệp JSON.' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Action Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-850 p-4 rounded-xl border border-slate-700/80 shadow-sm">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center space-x-2">
            <Sliders className="w-4 h-4 text-blue-400" />
            <span>Thư Viện &amp; Bộ Tạo Mẫu Tình Huống Kỹ Thuật Thủ Công</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Tự do thiết lập các thông số cơ khí, dải tốc độ, độ lệch trục, mất cân bằng và biên độ rung từng cảm biến
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {!isEditing ? (
            <button
              id="create-new-scenario-btn"
              onClick={handleStartCreateNew}
              className="inline-flex items-center px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              Tạo Mẫu Kỹ Thuật Mới
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg text-xs font-medium transition-colors"
            >
              Quay Lại Danh Sách
            </button>
          )}

          {/* Import / Export JSON */}
          <div className="flex items-center space-x-1 border-l border-slate-700 pl-2">
            <label className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer transition-colors" title="Nhập tệp JSON">
              <Upload className="w-3.5 h-3.5" />
              <input type="file" accept=".json" onChange={handleImportJSON} className="hidden" />
            </label>
            <button
              onClick={handleExportJSON}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
              title="Xuất tệp JSON"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center space-x-2 ${
            notification.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/60 border-rose-500/50 text-rose-200'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* MAIN CONTENT AREA: TWO-COLUMN OR EDITING FORM */}
      {!isEditing ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left Column: List of Scenarios */}
          <div className="lg:col-span-5 space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
              Danh Sách Mẫu Kịch Bản ({allScenarios.length})
            </div>

            {allScenarios.map((sc) => {
              const isSelected = sc.id === selectedScenarioId;
              let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
              if (sc.category === 'unbalance') badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
              if (sc.category === 'misalignment') badgeColor = 'bg-rose-500/20 text-rose-300 border-rose-500/30';
              if (sc.category === 'normal') badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

              return (
                <div
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-slate-800/90 border-blue-500 shadow-md ring-1 ring-blue-500/40'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                          {sc.category === 'unbalance' && 'Mất cân bằng 1X'}
                          {sc.category === 'misalignment' && 'Lệch trục 2X'}
                          {sc.category === 'normal' && 'Bình thường ISO'}
                          {sc.category === 'looseness' && 'Lỏng cơ khí'}
                          {sc.category === 'resonance' && 'Cộng hưởng'}
                          {sc.category === 'custom' && 'Tùy chỉnh'}
                        </span>
                        {sc.isBuiltIn ? (
                          <span className="text-[10px] text-slate-500">Mẫu chuẩn</span>
                        ) : (
                          <span className="text-[10px] text-blue-400 font-medium">Tự tạo</span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white mt-1.5 line-clamp-1">{sc.title}</h4>
                    </div>

                    <div className="flex items-center space-x-1 shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEdit(sc);
                        }}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                        title="Sao chép / Sửa thông số mẫu này"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {!sc.isBuiltIn && (
                        <button
                          onClick={(e) => handleDeleteCustom(sc.id, e)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition-colors"
                          title="Xóa mẫu này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5 pt-2 border-t border-slate-800">
                    <span>{sc.params.sampleCount} mẫu ({sc.params.minSpeed}-{sc.params.maxSpeed} KPH)</span>
                    <span className="text-slate-400">{sc.author || 'Kỹ sư'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Active Scenario Details & Live Preview */}
          <div className="lg:col-span-7 bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider">
                    Chi Tiết Mẫu Đang Chọn
                  </span>
                  <h3 className="text-sm font-bold text-white mt-0.5">{currentScenario.title}</h3>
                </div>

                <button
                  onClick={() => handleStartEdit(currentScenario)}
                  className="inline-flex items-center px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs transition-colors"
                >
                  <Copy className="w-3 h-3 mr-1 text-amber-400" />
                  Nhân Bản &amp; Tùy Biến
                </button>
              </div>

              <p className="text-xs text-slate-300 mt-3 leading-relaxed">
                {currentScenario.description}
              </p>

              {/* Sensor Config Grid of current scenario */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-3.5">
                {Object.entries(currentScenario.params.sensorsConfig).map(([sensor, cfg]) => (
                  <div key={sensor} className="bg-slate-850 p-2.5 rounded-lg border border-slate-800">
                    <div className="text-[11px] font-bold text-blue-400">{sensor}</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">
                      Gốc: <strong className="text-slate-200">{cfg.base} µm</strong>
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Cực đại: <strong className="text-amber-300">{cfg.max} µm</strong>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview Table */}
              <div className="border border-slate-800 rounded-lg overflow-hidden bg-slate-950/60 max-h-48 overflow-y-auto">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      <th className="px-2.5 py-1.5">Tốc độ (KPH)</th>
                      {previewData.sensors.map((s) => (
                        <th key={s} className="px-2.5 py-1.5 text-blue-300">{s} (µm)</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {previewData.rawPoints.slice(0, 8).map((pt, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="px-2.5 py-1 text-amber-300 font-bold">{pt.KPH}</td>
                        {previewData.sensors.map((s) => (
                          <td key={s} className="px-2.5 py-1 text-slate-200">{pt[s]}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="text-[10px] text-slate-500 mt-1.5 italic">
                * Hiển thị trước 8 điểm đo đại diện (tổng {previewData.rawPoints.length} điểm)
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-end space-x-2.5">
              <button
                onClick={() =>
                  onSendToTable(previewData.rawPoints, previewData.sensors, currentScenario.title)
                }
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors flex items-center space-x-1.5"
              >
                <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                <span>Nạp Vào Bảng Chỉnh Sửa</span>
              </button>

              <button
                id="apply-scenario-now-btn"
                onClick={() =>
                  onApplyScenario(previewData.rawPoints, previewData.sensors, currentScenario.title)
                }
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Áp Dụng Vào Phân Tích &amp; Mô Phỏng</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* EDITING / MANUAL CREATION FORM */
        <div className="bg-slate-900/90 border border-blue-500/40 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center space-x-2">
                <Edit2 className="w-4 h-4 text-amber-400" />
                <span>Thiết Lập Mẫu Tình Huống Kỹ Thuật Thủ Công</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Nhập tên, loại bất thường cơ học và điều chỉnh các thanh trượt tham số từng cảm biến
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium transition-colors"
              >
                Hủy
              </button>
              <button
                id="save-manual-scenario-btn"
                onClick={handleSaveScenario}
                className="inline-flex items-center px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow transition-colors"
              >
                <Save className="w-3.5 h-3.5 mr-1.5" />
                Lưu Vào Thư Viện Mẫu
              </button>
            </div>
          </div>

          {/* Form Basic Metadata */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 text-xs">
            <div className="sm:col-span-6 space-y-1">
              <label className="text-slate-300 font-semibold">Tên Mẫu Tình Huống Kỹ Thuật *</label>
              <input
                type="text"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="VD: Mất cân bằng cánh bánh xe công tác sau va đập..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-slate-300 font-semibold">Phân Loại Bất Thường</label>
              <select
                value={formCategory}
                onChange={(e) => setFormCategory(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="unbalance">Mất cân bằng 1X (Unbalance)</option>
                <option value="misalignment">Lệch trục 2X (Misalignment)</option>
                <option value="normal">Bình thường (ISO 10816 Zone A/B)</option>
                <option value="looseness">Lỏng cơ khí ổ bạc (Looseness)</option>
                <option value="resonance">Cộng hưởng tới hạn (Resonance)</option>
                <option value="custom">Tùy chỉnh đặc thù (Custom)</option>
              </select>
            </div>

            <div className="sm:col-span-3 space-y-1">
              <label className="text-slate-300 font-semibold">Người Lập / Ghi Nhận</label>
              <input
                type="text"
                value={formAuthor}
                onChange={(e) => setFormAuthor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="sm:col-span-12 space-y-1">
              <label className="text-slate-300 font-semibold">Mô Tả Kỹ Thuật &amp; Ghi Chú Hiện Trường</label>
              <textarea
                rows={2}
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                placeholder="Ghi nhận hiện tượng rung lắc, phân tích nguyên nhân vật lý, điều kiện vận hành lúc ghi nhận số liệu..."
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Operating Speed & Growth Model Parameters */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="text-slate-400 block mb-1">Tốc độ tối thiểu (KPH)</label>
              <input
                type="number"
                value={formMinSpeed}
                onChange={(e) => setFormMinSpeed(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Tốc độ định mức (KPH)</label>
              <input
                type="number"
                value={formMaxSpeed}
                onChange={(e) => setFormMaxSpeed(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-amber-300 font-bold font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Số điểm lấy mẫu (N)</label>
              <input
                type="number"
                min={5}
                max={30}
                value={formSampleCount}
                onChange={(e) => setFormSampleCount(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-white font-mono"
              />
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Quy luật rung động</label>
              <select
                value={formGrowthModel}
                onChange={(e) => setFormGrowthModel(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
              >
                <option value="quadratic">Bậc 2 (Lực ly tâm KPH²)</option>
                <option value="linear">Tuyến tính (Lệch trục)</option>
                <option value="resonance">Đỉnh cộng hưởng tới hạn</option>
              </select>
            </div>
          </div>

          {/* Per-Sensor Sliders & Inputs */}
          <div>
            <div className="text-xs font-semibold text-slate-300 mb-2 flex items-center justify-between">
              <span>Thiết Lập Biên Độ Rung Từng Cảm Biến:</span>
              <span className="text-[11px] text-slate-400">Đơn vị: Micromet (&mu;m)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(formSensorsConfig).map(([sensor, cfg]) => (
                <div key={sensor} className="bg-slate-850/80 p-3 rounded-xl border border-slate-700/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-400 text-xs flex items-center">
                      <Activity className="w-3.5 h-3.5 mr-1" />
                      Đầu đo {sensor} {sensor === 'CTL' ? '(Dọc trục)' : '(Hướng kính)'}
                    </span>
                    <span className="text-[11px] font-mono text-amber-300">
                      {cfg.base} &rarr; {cfg.max} &mu;m (&plusmn;{cfg.noise})
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                      <span className="text-slate-400 block mb-0.5">Rung gốc:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cfg.base}
                        onChange={(e) => handleSensorParamChange(sensor, 'base', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-white font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Rung cực đại:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cfg.max}
                        onChange={(e) => handleSensorParamChange(sensor, 'max', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-amber-300 font-bold font-mono"
                      />
                    </div>
                    <div>
                      <span className="text-slate-400 block mb-0.5">Độ nhiễu:</span>
                      <input
                        type="number"
                        step="0.1"
                        value={cfg.noise}
                        onChange={(e) => handleSensorParamChange(sensor, 'noise', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-0.5 text-slate-300 font-mono"
                      />
                    </div>
                  </div>

                  <input
                    type="range"
                    min={0.1}
                    max={sensor === 'CTL' ? 10 : 140}
                    step={0.5}
                    value={cfg.max}
                    onChange={(e) => handleSensorParamChange(sensor, 'max', parseFloat(e.target.value))}
                    className="w-full accent-blue-500 h-1.5 bg-slate-950 rounded-lg cursor-pointer"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Real-time Preview and Actions */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div className="text-[11px] text-slate-400">
              Đang sinh trước <strong>{previewData.rawPoints.length}</strong> hàng số liệu đo theo thời gian thực
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() =>
                  onSendToTable(previewData.rawPoints, previewData.sensors, formTitle || 'Mẫu Kỹ Thuật Tùy Chỉnh')
                }
                className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Chuyển Sang Bảng Dữ Liệu
              </button>

              <button
                onClick={() =>
                  onApplyScenario(previewData.rawPoints, previewData.sensors, formTitle || 'Mẫu Kỹ Thuật Tùy Chỉnh')
                }
                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold shadow-lg transition-colors flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Áp Dụng Vào Phân Tích &amp; Mô Phỏng Ngay</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
