import { useState, useEffect, useMemo } from 'react';
import { X, Check, Calendar, Leaf, Droplets, Sprout, AlertTriangle } from 'lucide-react';
import type { LeafStatus, PlantRecord, Plant } from '../types';
import { usePlantStore } from '../store/usePlantStore';
import { getTodayString, getRecordsByDate } from '../utils/storage';
import { LEAF_STATUS_LABELS } from '../types';

interface BatchRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select' | 'settings' | 'preview';

interface RecordPreview {
  plant: Plant;
  isDuplicate: boolean;
  existingRecord?: PlantRecord;
  willSkip: boolean;
}

export function BatchRecordForm({ isOpen, onClose }: BatchRecordFormProps) {
  const { plants, addRecord, loadAllData } = usePlantStore();
  const [step, setStep] = useState<Step>('select');
  const [date, setDate] = useState(getTodayString());
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [watered, setWatered] = useState(false);
  const [fertilized, setFertilized] = useState(false);
  const [leafStatus, setLeafStatus] = useState<LeafStatus>('');
  const [notes, setNotes] = useState('');
  const [previews, setPreviews] = useState<RecordPreview[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setDate(getTodayString());
      setSelectedPlantIds(new Set());
      setWatered(false);
      setFertilized(false);
      setLeafStatus('');
      setNotes('');
      setPreviews([]);
    }
  }, [isOpen]);

  const existingRecords = useMemo(() => {
    return getRecordsByDate(date);
  }, [date]);

  const isRecordDuplicate = (plantId: string): { isDuplicate: boolean; record?: PlantRecord } => {
    const plantExistingRecords = existingRecords.filter((r) => r.plantId === plantId);
    if (plantExistingRecords.length === 0) return { isDuplicate: false };
    
    const duplicateRecord = plantExistingRecords.find(
      (existing) =>
        existing.watered === watered &&
        existing.fertilized === fertilized &&
        existing.leafStatus === leafStatus &&
        existing.notes === notes
    );
    
    return { isDuplicate: !!duplicateRecord, record: duplicateRecord };
  };

  const togglePlantSelection = (plantId: string) => {
    const newSelection = new Set(selectedPlantIds);
    if (newSelection.has(plantId)) {
      newSelection.delete(plantId);
    } else {
      newSelection.add(plantId);
    }
    setSelectedPlantIds(newSelection);
  };

  const selectAllPlants = () => {
    if (selectedPlantIds.size === plants.length) {
      setSelectedPlantIds(new Set());
    } else {
      setSelectedPlantIds(new Set(plants.map((p) => p.id)));
    }
  };

  const goToSettings = () => {
    if (selectedPlantIds.size === 0) return;
    setStep('settings');
  };

  const goToPreview = () => {
    const previewList: RecordPreview[] = [];
    selectedPlantIds.forEach((plantId) => {
      const plant = plants.find((p) => p.id === plantId);
      if (plant) {
        const { isDuplicate, record } = isRecordDuplicate(plantId);
        previewList.push({
          plant,
          isDuplicate,
          existingRecord: record,
          willSkip: isDuplicate,
        });
      }
    });
    setPreviews(previewList);
    setStep('preview');
  };

  const toggleSkip = (plantId: string) => {
    setPreviews((prev) =>
      prev.map((p) =>
        p.plant.id === plantId ? { ...p, willSkip: !p.willSkip } : p
      )
    );
  };

  const handleSubmit = () => {
    const recordsToCreate = previews.filter((p) => !p.willSkip);
    recordsToCreate.forEach((preview) => {
      addRecord({
        plantId: preview.plant.id,
        date,
        watered,
        fertilized,
        leafStatus,
        height: 0,
        notes,
      });
    });
    loadAllData();
    onClose();
  };

  const hasDuplicates = previews.some((p) => p.isDuplicate);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-2xl animate-fade-in max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-sage-100 bg-cream-50 shrink-0">
          <div>
            <h2 className="text-xl font-serif text-sage-800">批量录入护理记录</h2>
            <div className="flex items-center gap-2 mt-2">
              {['选择植物', '设置内容', '确认提交'].map((label, index) => {
                const stepIndex = ['select', 'settings', 'preview'].indexOf(step);
                const isActive = index <= stepIndex;
                const isCurrent = index === stepIndex;
                return (
                  <div key={label} className="flex items-center">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                        isCurrent
                          ? 'bg-sage-500 text-white'
                          : isActive
                          ? 'bg-sage-200 text-sage-700'
                          : 'bg-sage-100 text-sage-400'
                      }`}
                    >
                      {isActive && index < stepIndex ? (
                        <Check className="w-3.5 h-3.5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span
                      className={`ml-1.5 text-sm ${
                        isCurrent ? 'text-sage-700 font-medium' : 'text-sage-400'
                      }`}
                    >
                      {label}
                    </span>
                    {index < 2 && <div className="w-8 h-px bg-sage-200 mx-2" />}
                  </div>
                );
              })}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {step === 'select' && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  <Calendar className="w-4 h-4 inline mr-1.5" />
                  选择日期
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-sm font-medium text-sage-700">
                    选择植物
                    <span className="text-sage-500 ml-2">
                      已选 {selectedPlantIds.size} / {plants.length}
                    </span>
                  </label>
                  <button
                    onClick={selectAllPlants}
                    className="text-sm text-sage-600 hover:text-sage-800 transition-colors"
                  >
                    {selectedPlantIds.size === plants.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                  {plants.map((plant) => (
                    <label
                      key={plant.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                        selectedPlantIds.has(plant.id)
                          ? 'bg-sage-100 border-2 border-sage-300'
                          : 'bg-white border border-sage-200 hover:border-sage-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedPlantIds.has(plant.id)}
                        onChange={() => togglePlantSelection(plant.id)}
                        className="w-5 h-5 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sage-800">{plant.name}</div>
                        <div className="text-sm text-sage-500">
                          {plant.species} · {plant.location}
                        </div>
                      </div>
                    </label>
                  ))}
                  {plants.length === 0 && (
                    <div className="text-center py-8 text-sage-500">
                      还没有添加植物
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {step === 'settings' && (
            <div className="space-y-5">
              <div className="p-4 bg-sage-50 rounded-xl">
                <div className="text-sm text-sage-600">
                  已选择 <span className="font-semibold text-sage-800">{selectedPlantIds.size}</span> 盆植物
                </div>
                <div className="text-sm text-sage-500">
                  日期：{date}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-3 cursor-pointer flex-1 p-4 bg-white rounded-xl border border-sage-200 hover:border-sage-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={watered}
                    onChange={(e) => setWatered(e.target.checked)}
                    className="w-5 h-5 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                  />
                  <Droplets className="w-5 h-5 text-blue-500" />
                  <span className="text-sage-700">已浇水</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer flex-1 p-4 bg-white rounded-xl border border-sage-200 hover:border-sage-300 transition-colors">
                  <input
                    type="checkbox"
                    checked={fertilized}
                    onChange={(e) => setFertilized(e.target.checked)}
                    className="w-5 h-5 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
                  />
                  <Sprout className="w-5 h-5 text-green-500" />
                  <span className="text-sage-700">已施肥</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  <Leaf className="w-4 h-4 inline mr-1.5" />
                  叶片状态
                </label>
                <select
                  value={leafStatus}
                  onChange={(e) => setLeafStatus(e.target.value as LeafStatus)}
                  className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                >
                  <option value="">未记录</option>
                  {Object.entries(LEAF_STATUS_LABELS)
                    .filter(([key]) => key !== '')
                    .map(([key, label]) => (
                      <option key={key} value={key}>
                        {label}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  备注
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="统一的备注说明..."
                  rows={3}
                  className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all resize-none"
                />
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 bg-sage-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sage-800">
                      {date} · 共 {previews.length} 条记录
                    </div>
                    <div className="text-sm text-sage-500 mt-1">
                      {watered && <span className="mr-3">💧 浇水</span>}
                      {fertilized && <span className="mr-3">🌱 施肥</span>}
                      {leafStatus && <span className="mr-3">🍃 {LEAF_STATUS_LABELS[leafStatus]}</span>}
                      {notes && <span>📝 {notes}</span>}
                      {!watered && !fertilized && !leafStatus && !notes && (
                        <span className="text-sage-400">仅创建记录</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {hasDuplicates && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-medium text-amber-800">检测到重复记录</div>
                      <div className="text-sm text-amber-600 mt-1">
                        部分植物在该日期已有完全相同的记录，可选择跳过或继续创建
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                {previews.map((preview) => (
                  <div
                    key={preview.plant.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      preview.isDuplicate
                        ? preview.willSkip
                          ? 'bg-amber-50 border-amber-200'
                          : 'bg-amber-50 border-amber-400'
                        : 'bg-white border-sage-200'
                    }`}
                  >
                    {preview.isDuplicate && (
                      <input
                        type="checkbox"
                        checked={preview.willSkip}
                        onChange={() => toggleSkip(preview.plant.id)}
                        className="w-5 h-5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                        title="勾选则跳过创建"
                      />
                    )}
                    <div className="flex-1">
                      <div className="font-medium text-sage-800">
                        {preview.plant.name}
                      </div>
                      <div className="text-sm text-sage-500">
                        {preview.plant.species} · {preview.plant.location}
                      </div>
                    </div>
                    {preview.isDuplicate ? (
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full ${
                          preview.willSkip
                            ? 'bg-sage-100 text-sage-600'
                            : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {preview.willSkip ? '将跳过' : '重复，将创建'}
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-700">
                        将创建
                      </span>
                    )}
                  </div>
                ))}
              </div>

              <div className="text-sm text-sage-500 text-center">
                将创建 {previews.filter((p) => !p.willSkip).length} 条新记录
                {hasDuplicates && `（跳过 ${previews.filter((p) => p.willSkip).length} 条重复记录）`}
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3 p-6 border-t border-sage-100 bg-cream-50 shrink-0">
          {step === 'select' && (
            <>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                onClick={goToSettings}
                disabled={selectedPlantIds.size === 0}
                className="flex-1 px-4 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                下一步
              </button>
            </>
          )}
          {step === 'settings' && (
            <>
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex-1 px-4 py-3 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={goToPreview}
                className="flex-1 px-4 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
              >
                预览并提交
              </button>
            </>
          )}
          {step === 'preview' && (
            <>
              <button
                type="button"
                onClick={() => setStep('settings')}
                className="flex-1 px-4 py-3 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
              >
                上一步
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={previews.filter((p) => !p.willSkip).length === 0}
                className="flex-1 px-4 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认提交
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
