import { useState, useEffect } from 'react';
import { X, Camera, RotateCcw, Trash2, Clock, AlertTriangle, CheckCircle, Plus, FileText, ChevronDown, ChevronRight, Sprout, ClipboardList } from 'lucide-react';
import type { Snapshot, SnapshotDiff, Plant, PlantRecord } from '../types';
import { LEAF_STATUS_LABELS } from '../types';
import {
  loadSnapshots,
  createSnapshot,
  deleteSnapshot,
  calculateSnapshotDiff,
  restoreSnapshot,
  loadData,
} from '../utils/storage';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRestoreComplete: () => void;
}

type ViewMode = 'list' | 'create' | 'confirmRestore';

function getPlantSummary(plant: Plant): string {
  const parts: string[] = [];
  if (plant.species) parts.push(plant.species);
  if (plant.location) parts.push(plant.location);
  return parts.length > 0 ? parts.join(' · ') : '';
}

function getRecordSummary(record: PlantRecord, plantName: string): string {
  const actions: string[] = [];
  if (record.watered) actions.push('浇水');
  if (record.fertilized) actions.push('施肥');
  const actionStr = actions.length > 0 ? actions.join('+') : '无操作';
  const leafStr = record.leafStatus ? `叶:${LEAF_STATUS_LABELS[record.leafStatus]}` : '';
  const heightStr = record.height > 0 ? `${record.height}cm` : '';
  const extras = [leafStr, heightStr].filter(Boolean).join(' ');
  return `${record.date} ${plantName} — ${actionStr}${extras ? ' · ' + extras : ''}`;
}

function getPlantFieldDiffs(snapshot: Plant, current: Plant): { label: string; from: string; to: string }[] {
  const diffs: { label: string; from: string; to: string }[] = [];
  const fieldLabels: Record<string, string> = {
    name: '名称',
    species: '品种',
    location: '位置',
    notes: '备注',
    wateringInterval: '浇水间隔',
    fertilizingInterval: '施肥间隔',
  };

  for (const key of Object.keys(fieldLabels)) {
    const k = key as keyof Plant;
    if (JSON.stringify(snapshot[k]) !== JSON.stringify(current[k])) {
      const fromVal = String(snapshot[k] ?? '');
      const toVal = String(current[k] ?? '');
      if (fromVal || toVal) {
        diffs.push({ label: fieldLabels[key], from: fromVal || '(空)', to: toVal || '(空)' });
      }
    }
  }

  if (JSON.stringify(snapshot.carePlan) !== JSON.stringify(current.carePlan)) {
    diffs.push({ label: '养护计划', from: snapshot.carePlan ? '已设置' : '未设置', to: current.carePlan ? '已设置' : '未设置' });
  }

  return diffs;
}

function getRecordFieldDiffs(snapshot: PlantRecord, current: PlantRecord): { label: string; from: string; to: string }[] {
  const diffs: { label: string; from: string; to: string }[] = [];

  if (snapshot.watered !== current.watered) {
    diffs.push({ label: '浇水', from: snapshot.watered ? '是' : '否', to: current.watered ? '是' : '否' });
  }
  if (snapshot.fertilized !== current.fertilized) {
    diffs.push({ label: '施肥', from: snapshot.fertilized ? '是' : '否', to: current.fertilized ? '是' : '否' });
  }
  if (snapshot.leafStatus !== current.leafStatus) {
    diffs.push({ label: '叶片状态', from: LEAF_STATUS_LABELS[snapshot.leafStatus] || '未记录', to: LEAF_STATUS_LABELS[current.leafStatus] || '未记录' });
  }
  if (snapshot.height !== current.height) {
    diffs.push({ label: '高度', from: snapshot.height > 0 ? `${snapshot.height}cm` : '未记录', to: current.height > 0 ? `${current.height}cm` : '未记录' });
  }
  if (snapshot.notes !== current.notes) {
    diffs.push({ label: '备注', from: snapshot.notes || '(空)', to: current.notes || '(空)' });
  }

  return diffs;
}

function DiffSection({
  title,
  icon,
  count,
  color,
  children,
  defaultOpen = true,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  color: 'red' | 'green' | 'amber';
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const colorMap = {
    red: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', icon: 'text-red-500', badge: 'bg-red-100 text-red-700' },
    green: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700', icon: 'text-green-500', badge: 'bg-green-100 text-green-700' },
    amber: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', icon: 'text-amber-500', badge: 'bg-amber-100 text-amber-700' },
  };
  const c = colorMap[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className={`font-medium text-sm ${c.text}`}>{title}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${c.badge}`}>{count}</span>
        </div>
        {open ? <ChevronDown className={`w-4 h-4 ${c.icon}`} /> : <ChevronRight className={`w-4 h-4 ${c.icon}`} />}
      </button>
      {open && <div className="px-4 pb-3 space-y-1.5">{children}</div>}
    </div>
  );
}

export function SnapshotModal({ isOpen, onClose, onRestoreComplete }: SnapshotModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [snapshotDiff, setSnapshotDiff] = useState<SnapshotDiff | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPlantNameMap, setCurrentPlantNameMap] = useState<Map<string, string>>(new Map());
  const [snapshotPlantNameMap, setSnapshotPlantNameMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    if (isOpen) {
      setSnapshots(loadSnapshots());
    }
  }, [isOpen]);

  const handleCreateSnapshot = () => {
    if (!snapshotName.trim()) return;

    setIsCreating(true);
    setTimeout(() => {
      createSnapshot(snapshotName.trim(), snapshotDescription.trim());
      setSnapshots(loadSnapshots());
      setSnapshotName('');
      setSnapshotDescription('');
      setViewMode('list');
      setIsCreating(false);
    }, 500);
  };

  const handleDeleteSnapshot = (id: string) => {
    deleteSnapshot(id);
    setSnapshots(loadSnapshots());
  };

  const handlePrepareRestore = (snapshot: Snapshot) => {
    setSelectedSnapshot(snapshot);
    setSnapshotDiff(calculateSnapshotDiff(snapshot));
    setCurrentPlantNameMap(new Map(loadData().plants.map(p => [p.id, p.name])));
    setSnapshotPlantNameMap(new Map(snapshot.data.plants.map(p => [p.id, p.name])));
    setViewMode('confirmRestore');
  };

  const handleConfirmRestore = () => {
    if (!selectedSnapshot) return;

    setIsRestoring(true);
    setTimeout(() => {
      restoreSnapshot(selectedSnapshot);
      setIsRestoring(false);
      onRestoreComplete();
      onClose();
      resetState();
    }, 1000);
  };

  const resetState = () => {
    setViewMode('list');
    setSelectedSnapshot(null);
    setSnapshotDiff(null);
    setSnapshotName('');
    setSnapshotDescription('');
    setIsRestoring(false);
    setIsCreating(false);
    setCurrentPlantNameMap(new Map());
    setSnapshotPlantNameMap(new Map());
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 200);
  };

  if (!isOpen) return null;

  const isDiffView = viewMode === 'confirmRestore';

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className={`bg-cream-50 rounded-2xl shadow-xl w-full animate-fade-in overflow-hidden max-h-[90vh] flex flex-col ${isDiffView ? 'max-w-2xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between p-6 border-b border-sage-100 flex-shrink-0">
          <h2 className="text-xl font-serif text-sage-800">
            {viewMode === 'list' && '数据快照'}
            {viewMode === 'create' && '创建快照'}
            {viewMode === 'confirmRestore' && '恢复确认'}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {viewMode === 'list' && (
            <div className="space-y-4">
              <p className="text-sage-500 text-sm">
                创建数据快照以便在重要修改前备份，随时可以恢复到之前的状态。
              </p>

              <button
                onClick={() => setViewMode('create')}
                className="w-full flex items-center gap-4 p-4 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
              >
                <Plus className="w-6 h-6" />
                <div className="text-left">
                  <div className="font-medium">创建新快照</div>
                  <div className="text-sm text-sage-100">保存当前所有植物和记录的状态</div>
                </div>
              </button>

              {snapshots.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-sage-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-sage-400" />
                  </div>
                  <p className="text-sage-500">还没有快照</p>
                  <p className="text-sage-400 text-sm mt-1">创建第一个快照来保护您的数据</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <h3 className="font-medium text-sage-700 text-sm">已保存的快照</h3>
                  {snapshots.map((snapshot) => (
                    <div
                      key={snapshot.id}
                      className="bg-white rounded-xl p-4 border border-sage-100 hover:border-sage-200 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sage-800 truncate">
                            {snapshot.name}
                          </h4>
                          {snapshot.description && (
                            <p className="text-sm text-sage-500 mt-1 line-clamp-2">
                              {snapshot.description}
                            </p>
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-sage-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {snapshot.createdAt}
                            </span>
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              {snapshot.data.plants.length} 个植物
                            </span>
                            <span>{snapshot.data.records.length} 条记录</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handlePrepareRestore(snapshot)}
                            className="p-2 text-sage-600 hover:bg-sage-100 rounded-lg transition-colors"
                            title="恢复此快照"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSnapshot(snapshot.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="删除此快照"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {viewMode === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  快照名称 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={snapshotName}
                  onChange={(e) => setSnapshotName(e.target.value)}
                  placeholder="例如：批量修改前备份"
                  className="w-full px-4 py-2.5 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">
                  描述（可选）
                </label>
                <textarea
                  value={snapshotDescription}
                  onChange={(e) => setSnapshotDescription(e.target.value)}
                  placeholder="记录创建此快照的原因..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent resize-none"
                />
              </div>

              <div className="p-4 bg-sage-50 rounded-xl">
                <h4 className="font-medium text-sage-700 text-sm mb-2">当前数据统计</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-sm">
                    <span className="text-sage-500">植物数量：</span>
                    <span className="text-sage-700 font-medium">
                      {loadData().plants.length}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="text-sage-500">记录数量：</span>
                    <span className="text-sage-700 font-medium">
                      {loadData().records.length}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setViewMode('list')}
                  className="flex-1 px-4 py-2.5 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
                  disabled={isCreating}
                >
                  取消
                </button>
                <button
                  onClick={handleCreateSnapshot}
                  disabled={!snapshotName.trim() || isCreating}
                  className="flex-1 px-4 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isCreating ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      创建中...
                    </>
                  ) : (
                    <>
                      <Camera className="w-4 h-4" />
                      创建快照
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {viewMode === 'confirmRestore' && snapshotDiff && selectedSnapshot && (
            <div className="space-y-5">
              <div className="flex items-start gap-3 p-4 bg-amber-50 rounded-xl border border-amber-200">
                <AlertTriangle className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium text-amber-800 mb-1">即将恢复快照「{selectedSnapshot.name}」</h3>
                  <p className="text-sm text-amber-700">
                    恢复后，当前数据将被快照数据覆盖，此操作不可撤销。请仔细查看以下差异。
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-white border border-sage-200 text-center">
                  <div className={`text-2xl font-bold ${snapshotDiff.plantCountChange !== 0 ? (snapshotDiff.plantCountChange > 0 ? 'text-green-600' : 'text-red-600') : 'text-sage-600'}`}>
                    {snapshotDiff.plantCountChange > 0 ? `+${snapshotDiff.plantCountChange}` : snapshotDiff.plantCountChange}
                  </div>
                  <div className="text-xs text-sage-500">植物数量变化</div>
                </div>
                <div className="p-3 rounded-lg bg-white border border-sage-200 text-center">
                  <div className={`text-2xl font-bold ${snapshotDiff.recordCountChange !== 0 ? (snapshotDiff.recordCountChange > 0 ? 'text-green-600' : 'text-red-600') : 'text-sage-600'}`}>
                    {snapshotDiff.recordCountChange > 0 ? `+${snapshotDiff.recordCountChange}` : snapshotDiff.recordCountChange}
                  </div>
                  <div className="text-xs text-sage-500">记录数量变化</div>
                </div>
              </div>

              {snapshotDiff.plantsAdded.length === 0 &&
               snapshotDiff.plantsRemoved.length === 0 &&
               snapshotDiff.plantsModified.length === 0 &&
               snapshotDiff.recordsAdded.length === 0 &&
               snapshotDiff.recordsRemoved.length === 0 &&
               snapshotDiff.recordsModified.length === 0 && (
                <div className="flex items-center gap-2 text-sage-600 p-4 bg-sage-50 rounded-xl border border-sage-200">
                  <CheckCircle className="w-5 h-5" />
                  <span>当前数据与快照一致，恢复不会产生任何变化</span>
                </div>
              )}

              {(snapshotDiff.plantsAdded.length > 0 || snapshotDiff.plantsRemoved.length > 0 || snapshotDiff.plantsModified.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Sprout className="w-4 h-4 text-sage-600" />
                    <h4 className="font-medium text-sage-700 text-sm">植物变更</h4>
                  </div>
                  <div className="space-y-2">
                    {snapshotDiff.plantsAdded.length > 0 && (
                      <DiffSection
                        title="将删除的植物（快照之后新增的）"
                        icon={<Trash2 className="w-4 h-4" />}
                        count={snapshotDiff.plantsAdded.length}
                        color="red"
                      >
                        {snapshotDiff.plantsAdded.map(plant => (
                          <div key={plant.id} className="text-sm text-red-800 bg-white rounded-lg px-3 py-2 border border-red-100">
                            <span className="font-medium">{plant.name}</span>
                            {getPlantSummary(plant) && <span className="text-red-500 ml-2">{getPlantSummary(plant)}</span>}
                          </div>
                        ))}
                      </DiffSection>
                    )}

                    {snapshotDiff.plantsRemoved.length > 0 && (
                      <DiffSection
                        title="将恢复的植物（快照之后删除的）"
                        icon={<Plus className="w-4 h-4" />}
                        count={snapshotDiff.plantsRemoved.length}
                        color="green"
                      >
                        {snapshotDiff.plantsRemoved.map(plant => (
                          <div key={plant.id} className="text-sm text-green-800 bg-white rounded-lg px-3 py-2 border border-green-100">
                            <span className="font-medium">{plant.name}</span>
                            {getPlantSummary(plant) && <span className="text-green-500 ml-2">{getPlantSummary(plant)}</span>}
                          </div>
                        ))}
                      </DiffSection>
                    )}

                    {snapshotDiff.plantsModified.length > 0 && (
                      <DiffSection
                        title="将还原的植物（快照之后修改的）"
                        icon={<RotateCcw className="w-4 h-4" />}
                        count={snapshotDiff.plantsModified.length}
                        color="amber"
                      >
                        {snapshotDiff.plantsModified.map((snapshotPlant, idx) => {
                          const currentPlant = snapshotDiff.plantsModifiedCurrent[idx];
                          const fieldDiffs = currentPlant ? getPlantFieldDiffs(snapshotPlant, currentPlant) : [];
                          return (
                            <div key={snapshotPlant.id} className="text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
                              <div className="font-medium text-amber-800">{snapshotPlant.name}</div>
                              {fieldDiffs.length > 0 && (
                                <div className="mt-1.5 space-y-0.5">
                                  {fieldDiffs.map(diff => (
                                    <div key={diff.label} className="text-xs flex items-center gap-1.5">
                                      <span className="text-sage-500 w-14 flex-shrink-0 text-right">{diff.label}</span>
                                      <span className="text-amber-600 line-through">{diff.to}</span>
                                      <span className="text-sage-400">→</span>
                                      <span className="text-green-600">{diff.from}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </DiffSection>
                    )}
                  </div>
                </div>
              )}

              {(snapshotDiff.recordsAdded.length > 0 || snapshotDiff.recordsRemoved.length > 0 || snapshotDiff.recordsModified.length > 0) && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <ClipboardList className="w-4 h-4 text-sage-600" />
                    <h4 className="font-medium text-sage-700 text-sm">记录变更</h4>
                  </div>
                  <div className="space-y-2">
                    {snapshotDiff.recordsAdded.length > 0 && (
                      <DiffSection
                        title={`将删除的记录（快照之后新增的）`}
                        icon={<Trash2 className="w-4 h-4" />}
                        count={snapshotDiff.recordsAdded.length}
                        color="red"
                        defaultOpen={snapshotDiff.recordsAdded.length <= 10}
                      >
                        {snapshotDiff.recordsAdded.map(record => {
                          const plantName = currentPlantNameMap.get(record.plantId) || snapshotPlantNameMap.get(record.plantId) || '未知植物';
                          return (
                            <div key={record.id} className="text-sm text-red-800 bg-white rounded-lg px-3 py-1.5 border border-red-100">
                              {getRecordSummary(record, plantName)}
                            </div>
                          );
                        })}
                      </DiffSection>
                    )}

                    {snapshotDiff.recordsRemoved.length > 0 && (
                      <DiffSection
                        title="将恢复的记录（快照之后删除的）"
                        icon={<Plus className="w-4 h-4" />}
                        count={snapshotDiff.recordsRemoved.length}
                        color="green"
                        defaultOpen={snapshotDiff.recordsRemoved.length <= 10}
                      >
                        {snapshotDiff.recordsRemoved.map(record => {
                          const plantName = snapshotPlantNameMap.get(record.plantId) || currentPlantNameMap.get(record.plantId) || '未知植物';
                          return (
                            <div key={record.id} className="text-sm text-green-800 bg-white rounded-lg px-3 py-1.5 border border-green-100">
                              {getRecordSummary(record, plantName)}
                            </div>
                          );
                        })}
                      </DiffSection>
                    )}

                    {snapshotDiff.recordsModified.length > 0 && (
                      <DiffSection
                        title="将还原的记录（快照之后修改的）"
                        icon={<RotateCcw className="w-4 h-4" />}
                        count={snapshotDiff.recordsModified.length}
                        color="amber"
                        defaultOpen={snapshotDiff.recordsModified.length <= 5}
                      >
                        {snapshotDiff.recordsModified.map((snapshotRecord, idx) => {
                          const currentRecord = snapshotDiff.recordsModifiedCurrent[idx];
                          const plantName = currentPlantNameMap.get(snapshotRecord.plantId) || snapshotPlantNameMap.get(snapshotRecord.plantId) || '未知植物';
                          const fieldDiffs = currentRecord ? getRecordFieldDiffs(snapshotRecord, currentRecord) : [];
                          return (
                            <div key={snapshotRecord.id} className="text-sm bg-white rounded-lg px-3 py-2 border border-amber-100">
                              <div className="text-amber-800">{snapshotRecord.date} {plantName}</div>
                              {fieldDiffs.length > 0 && (
                                <div className="mt-1 space-y-0.5">
                                  {fieldDiffs.map(diff => (
                                    <div key={diff.label} className="text-xs flex items-center gap-1.5">
                                      <span className="text-sage-500 w-14 flex-shrink-0 text-right">{diff.label}</span>
                                      <span className="text-amber-600 line-through">{diff.to}</span>
                                      <span className="text-sage-400">→</span>
                                      <span className="text-green-600">{diff.from}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </DiffSection>
                    )}
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => {
                    setViewMode('list');
                    setSelectedSnapshot(null);
                    setSnapshotDiff(null);
                  }}
                  className="flex-1 px-4 py-2.5 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
                  disabled={isRestoring}
                >
                  取消
                </button>
                <button
                  onClick={handleConfirmRestore}
                  disabled={isRestoring}
                  className="flex-1 px-4 py-2.5 bg-amber-500 text-white rounded-xl hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isRestoring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      恢复中...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      确认恢复
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
