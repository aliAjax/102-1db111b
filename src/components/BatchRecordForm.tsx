import { useState, useEffect, useMemo, useCallback } from 'react';
import { X, Check, Calendar, Leaf, Droplets, Sprout, AlertTriangle, Ruler, RotateCcw } from 'lucide-react';
import type { LeafStatus, PlantRecord, Plant } from '../types';
import { usePlantStore } from '../store/usePlantStore';
import { getTodayString } from '../utils/common';
import { getRecordsByDate, getRecordsByPlantId } from '../utils/localData';
import { LEAF_STATUS_LABELS } from '../types';

interface BatchRecordFormProps {
  isOpen: boolean;
  onClose: () => void;
}

type Step = 'select' | 'settings' | 'preview';

interface PlantRecordEntry {
  plantId: string;
  watered: boolean;
  fertilized: boolean;
  leafStatus: LeafStatus;
  height: number;
  notes: string;
  prefilledLeafStatus: LeafStatus;
  prefilledHeight: number;
}

interface RecordPreview {
  plant: Plant;
  entry: PlantRecordEntry;
  isDuplicate: boolean;
  existingRecord?: PlantRecord;
  willSkip: boolean;
}

function isEntryModified(entry: PlantRecordEntry): boolean {
  if (entry.watered || entry.fertilized) return true;
  if (entry.leafStatus !== entry.prefilledLeafStatus) return true;
  if (entry.height !== entry.prefilledHeight) return true;
  if (entry.notes.trim() !== '') return true;
  return false;
}

export function BatchRecordForm({ isOpen, onClose }: BatchRecordFormProps) {
  const { plants, addRecord, loadAllData } = usePlantStore();
  const [step, setStep] = useState<Step>('select');
  const [date, setDate] = useState(getTodayString());
  const [selectedPlantIds, setSelectedPlantIds] = useState<Set<string>>(new Set());
  const [entries, setEntries] = useState<Map<string, PlantRecordEntry>>(new Map());
  const [previews, setPreviews] = useState<RecordPreview[]>([]);

  useEffect(() => {
    if (isOpen) {
      setStep('select');
      setDate(getTodayString());
      setSelectedPlantIds(new Set());
      setEntries(new Map());
      setPreviews([]);
    }
  }, [isOpen]);

  const existingRecords = useMemo(() => {
    return getRecordsByDate(date);
  }, [date]);

  const buildEntriesFromSelection = useCallback(() => {
    const newEntries = new Map<string, PlantRecordEntry>();
    selectedPlantIds.forEach((plantId) => {
      const plantRecords = getRecordsByPlantId(plantId);
      const lastRecord = plantRecords.length > 0 ? plantRecords[0] : null;

      const existing = entries.get(plantId);
      if (existing) {
        newEntries.set(plantId, existing);
      } else {
        newEntries.set(plantId, {
          plantId,
          watered: false,
          fertilized: false,
          leafStatus: lastRecord?.leafStatus || '',
          height: lastRecord?.height || 0,
          notes: '',
          prefilledLeafStatus: lastRecord?.leafStatus || '',
          prefilledHeight: lastRecord?.height || 0,
        });
      }
    });
    return newEntries;
  }, [selectedPlantIds, entries]);

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
    setEntries(buildEntriesFromSelection());
    setStep('settings');
  };

  const updateEntry = (plantId: string, updates: Partial<PlantRecordEntry>) => {
    setEntries((prev) => {
      const current = prev.get(plantId);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(plantId, { ...current, ...updates });
      return next;
    });
  };

  const resetEntryToPrefill = (plantId: string) => {
    setEntries((prev) => {
      const current = prev.get(plantId);
      if (!current) return prev;
      const next = new Map(prev);
      next.set(plantId, {
        ...current,
        watered: false,
        fertilized: false,
        leafStatus: current.prefilledLeafStatus,
        height: current.prefilledHeight,
        notes: '',
      });
      return next;
    });
  };

  const batchSetWatered = (value: boolean) => {
    setEntries((prev) => {
      const next = new Map(prev);
      next.forEach((entry, key) => {
        next.set(key, { ...entry, watered: value });
      });
      return next;
    });
  };

  const batchSetFertilized = (value: boolean) => {
    setEntries((prev) => {
      const next = new Map(prev);
      next.forEach((entry, key) => {
        next.set(key, { ...entry, fertilized: value });
      });
      return next;
    });
  };

  const goToPreview = () => {
    const previewList: RecordPreview[] = [];
    entries.forEach((entry, plantId) => {
      const plant = plants.find((p) => p.id === plantId);
      if (!plant) return;

      if (!isEntryModified(entry)) return;

      const plantExistingRecords = existingRecords.filter((r) => r.plantId === plantId);
      let isDuplicate = false;
      let duplicateRecord: PlantRecord | undefined;

      if (plantExistingRecords.length > 0) {
        duplicateRecord = plantExistingRecords.find(
          (existing) =>
            existing.watered === entry.watered &&
            existing.fertilized === entry.fertilized &&
            existing.leafStatus === entry.leafStatus &&
            existing.height === entry.height &&
            existing.notes === entry.notes
        );
        isDuplicate = !!duplicateRecord;
      }

      previewList.push({
        plant,
        entry,
        isDuplicate,
        existingRecord: duplicateRecord,
        willSkip: isDuplicate,
      });
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
        watered: preview.entry.watered,
        fertilized: preview.entry.fertilized,
        leafStatus: preview.entry.leafStatus,
        height: preview.entry.height,
        notes: preview.entry.notes,
      });
    });
    loadAllData();
    onClose();
  };

  const hasDuplicates = previews.some((p) => p.isDuplicate);
  const modifiedCount = Array.from(entries.values()).filter(isEntryModified).length;

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
                  {plants.map((plant) => {
                    const plantRecords = getRecordsByPlantId(plant.id);
                    const lastRecord = plantRecords.length > 0 ? plantRecords[0] : null;
                    return (
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
                          {lastRecord && (
                            <div className="text-xs text-sage-400 mt-1">
                              上次记录：{lastRecord.leafStatus ? LEAF_STATUS_LABELS[lastRecord.leafStatus] : '无叶片状态'}
                              {lastRecord.height > 0 ? ` · ${lastRecord.height}cm` : ''}
                              <span className="text-sage-300 mx-1">·</span>
                              {lastRecord.date}
                            </div>
                          )}
                        </div>
                      </label>
                    );
                  })}
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
            <div className="space-y-4">
              <div className="p-4 bg-sage-50 rounded-xl">
                <div className="text-sm text-sage-600">
                  已选择 <span className="font-semibold text-sage-800">{selectedPlantIds.size}</span> 盆植物
                  <span className="text-sage-400 mx-2">·</span>
                  日期：{date}
                </div>
                <div className="text-xs text-sage-400 mt-1">
                  叶片状态和高度已按上次记录预填，勾选浇水/施肥并按需微调即可
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => batchSetWatered(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-blue-50 border border-blue-200 rounded-xl text-sm text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <Droplets className="w-4 h-4" />
                  全部浇水
                </button>
                <button
                  type="button"
                  onClick={() => batchSetFertilized(true)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 hover:bg-green-100 transition-colors"
                >
                  <Sprout className="w-4 h-4" />
                  全部施肥
                </button>
              </div>

              <div className="space-y-3 max-h-[52vh] overflow-y-auto pr-1">
                {Array.from(entries.values()).map((entry) => {
                  const plant = plants.find((p) => p.id === entry.plantId);
                  if (!plant) return null;
                  const modified = isEntryModified(entry);
                  return (
                    <div
                      key={entry.plantId}
                      className={`p-4 rounded-xl border transition-all ${
                        modified
                          ? 'bg-white border-sage-300 shadow-sm'
                          : 'bg-sage-50/50 border-sage-200'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <div className="font-medium text-sage-800 text-sm">{plant.name}</div>
                          <div className="text-xs text-sage-400">{plant.species}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          {modified && (
                            <button
                              type="button"
                              onClick={() => resetEntryToPrefill(entry.plantId)}
                              className="text-xs text-sage-400 hover:text-sage-600 flex items-center gap-1 transition-colors"
                            >
                              <RotateCcw className="w-3 h-3" />
                              重置
                            </button>
                          )}
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full ${
                              modified
                                ? 'bg-sage-100 text-sage-600'
                                : 'bg-sage-50 text-sage-400'
                            }`}
                          >
                            {modified ? '已修改' : '未修改'}
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-4 mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.watered}
                            onChange={(e) => updateEntry(entry.plantId, { watered: e.target.checked })}
                            className="w-4 h-4 rounded border-sage-300 text-blue-500 focus:ring-blue-400"
                          />
                          <Droplets className={`w-4 h-4 ${entry.watered ? 'text-blue-500' : 'text-sage-300'}`} />
                          <span className={`text-sm ${entry.watered ? 'text-blue-600' : 'text-sage-500'}`}>浇水</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={entry.fertilized}
                            onChange={(e) => updateEntry(entry.plantId, { fertilized: e.target.checked })}
                            className="w-4 h-4 rounded border-sage-300 text-green-500 focus:ring-green-400"
                          />
                          <Sprout className={`w-4 h-4 ${entry.fertilized ? 'text-green-500' : 'text-sage-300'}`} />
                          <span className={`text-sm ${entry.fertilized ? 'text-green-600' : 'text-sage-500'}`}>施肥</span>
                        </label>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-sage-500 mb-1">
                            <Leaf className="w-3 h-3 inline mr-1" />
                            叶片状态
                          </label>
                          <select
                            value={entry.leafStatus}
                            onChange={(e) => updateEntry(entry.plantId, { leafStatus: e.target.value as LeafStatus })}
                            className="w-full px-2.5 py-1.5 text-sm bg-white border border-sage-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-400 transition-all"
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
                          {entry.prefilledLeafStatus && entry.leafStatus === entry.prefilledLeafStatus && (
                            <span className="text-xs text-sage-300 mt-0.5 block">按上次预填</span>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-sage-500 mb-1">
                            <Ruler className="w-3 h-3 inline mr-1" />
                            高度 (cm)
                          </label>
                          <input
                            type="number"
                            min="0"
                            step="0.1"
                            value={entry.height || ''}
                            onChange={(e) => updateEntry(entry.plantId, { height: parseFloat(e.target.value) || 0 })}
                            placeholder="0"
                            className="w-full px-2.5 py-1.5 text-sm bg-white border border-sage-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-400 transition-all"
                          />
                          {entry.prefilledHeight > 0 && entry.height === entry.prefilledHeight && (
                            <span className="text-xs text-sage-300 mt-0.5 block">按上次预填</span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3">
                        <input
                          type="text"
                          value={entry.notes}
                          onChange={(e) => updateEntry(entry.plantId, { notes: e.target.value })}
                          placeholder="备注（可选）"
                          className="w-full px-2.5 py-1.5 text-sm bg-white border border-sage-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sage-400 transition-all"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {modifiedCount === 0 && (
                <div className="text-center py-3 text-sage-400 text-sm">
                  请至少为一盆植物勾选浇水/施肥或修改叶片状态和高度
                </div>
              )}
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-4">
              <div className="p-4 bg-sage-50 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sage-800">
                      {date} · 共 {previews.length} 条有变更的记录
                    </div>
                    <div className="text-sm text-sage-500 mt-1">
                      未修改的植物已自动跳过
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

              {previews.length === 0 ? (
                <div className="text-center py-8 text-sage-400">
                  没有需要提交的记录
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-2">
                  {previews.map((preview) => (
                    <div
                      key={preview.plant.id}
                      className={`p-3 rounded-xl border transition-all ${
                        preview.isDuplicate
                          ? preview.willSkip
                            ? 'bg-amber-50 border-amber-200'
                            : 'bg-amber-50 border-amber-400'
                          : 'bg-white border-sage-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {preview.isDuplicate && (
                          <input
                            type="checkbox"
                            checked={preview.willSkip}
                            onChange={() => toggleSkip(preview.plant.id)}
                            className="w-5 h-5 mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
                            title="勾选则跳过创建"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sage-800">{preview.plant.name}</span>
                            {preview.isDuplicate ? (
                              <span
                                className={`text-xs px-2 py-0.5 rounded-full ${
                                  preview.willSkip
                                    ? 'bg-sage-100 text-sage-600'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {preview.willSkip ? '将跳过' : '重复，将创建'}
                              </span>
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                将创建
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-sage-500 mt-1 flex flex-wrap gap-x-3 gap-y-1">
                            {preview.entry.watered && (
                              <span className="flex items-center gap-1">
                                <Droplets className="w-3.5 h-3.5 text-blue-500" />
                                浇水
                              </span>
                            )}
                            {preview.entry.fertilized && (
                              <span className="flex items-center gap-1">
                                <Sprout className="w-3.5 h-3.5 text-green-500" />
                                施肥
                              </span>
                            )}
                            {preview.entry.leafStatus && (
                              <span className="flex items-center gap-1">
                                <Leaf className="w-3.5 h-3.5 text-green-400" />
                                {LEAF_STATUS_LABELS[preview.entry.leafStatus]}
                              </span>
                            )}
                            {preview.entry.height > 0 && (
                              <span className="flex items-center gap-1">
                                <Ruler className="w-3.5 h-3.5 text-sage-400" />
                                {preview.entry.height}cm
                              </span>
                            )}
                          </div>
                          {preview.entry.notes && (
                            <div className="text-xs text-sage-400 mt-1 truncate">
                              {preview.entry.notes}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

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
                disabled={modifiedCount === 0}
                className="flex-1 px-4 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
