import { useState, useEffect } from 'react';
import { X, Camera, RotateCcw, Trash2, Clock, AlertTriangle, CheckCircle, Plus, FileText } from 'lucide-react';
import type { Snapshot, SnapshotDiff } from '../types';
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

export function SnapshotModal({ isOpen, onClose, onRestoreComplete }: SnapshotModalProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState<Snapshot | null>(null);
  const [snapshotDiff, setSnapshotDiff] = useState<SnapshotDiff | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshotDescription, setSnapshotDescription] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

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
  };

  const handleClose = () => {
    onClose();
    setTimeout(resetState, 200);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-lg animate-fade-in overflow-hidden max-h-[90vh] flex flex-col">
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
                  <h3 className="font-medium text-amber-800 mb-1">即将恢复快照</h3>
                  <p className="text-sm text-amber-700">
                    恢复后，当前数据将被「{selectedSnapshot.name}」的数据覆盖，此操作不可撤销。
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-sage-700">恢复影响预览</h4>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className={`p-3 rounded-lg ${snapshotDiff.plantsRemoved.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${snapshotDiff.plantsRemoved.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {snapshotDiff.plantCountChange > 0 ? `+${snapshotDiff.plantCountChange}` : snapshotDiff.plantCountChange}
                    </div>
                    <div className={`text-xs ${snapshotDiff.plantsRemoved.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      植物数量变化
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg ${snapshotDiff.recordsRemoved.length > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <div className={`text-2xl font-bold ${snapshotDiff.recordsRemoved.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      {snapshotDiff.recordCountChange > 0 ? `+${snapshotDiff.recordCountChange}` : snapshotDiff.recordCountChange}
                    </div>
                    <div className={`text-xs ${snapshotDiff.recordsRemoved.length > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      记录数量变化
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {snapshotDiff.plantsAdded.length > 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      <span>将删除 {snapshotDiff.plantsAdded.length} 个新增的植物</span>
                    </div>
                  )}
                  {snapshotDiff.plantsRemoved.length > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Plus className="w-4 h-4" />
                      <span>将恢复 {snapshotDiff.plantsRemoved.length} 个已删除的植物</span>
                    </div>
                  )}
                  {snapshotDiff.plantsModified.length > 0 && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <RotateCcw className="w-4 h-4" />
                      <span>将还原 {snapshotDiff.plantsModified.length} 个被修改的植物</span>
                    </div>
                  )}
                  {snapshotDiff.recordsAdded.length > 0 && (
                    <div className="flex items-center gap-2 text-red-600">
                      <Trash2 className="w-4 h-4" />
                      <span>将删除 {snapshotDiff.recordsAdded.length} 条新增的记录</span>
                    </div>
                  )}
                  {snapshotDiff.recordsRemoved.length > 0 && (
                    <div className="flex items-center gap-2 text-green-600">
                      <Plus className="w-4 h-4" />
                      <span>将恢复 {snapshotDiff.recordsRemoved.length} 条已删除的记录</span>
                    </div>
                  )}
                  {snapshotDiff.recordsModified.length > 0 && (
                    <div className="flex items-center gap-2 text-amber-600">
                      <RotateCcw className="w-4 h-4" />
                      <span>将还原 {snapshotDiff.recordsModified.length} 条被修改的记录</span>
                    </div>
                  )}
                  {snapshotDiff.plantsAdded.length === 0 && 
                   snapshotDiff.plantsRemoved.length === 0 && 
                   snapshotDiff.plantsModified.length === 0 &&
                   snapshotDiff.recordsAdded.length === 0 && 
                   snapshotDiff.recordsRemoved.length === 0 && 
                   snapshotDiff.recordsModified.length === 0 && (
                    <div className="flex items-center gap-2 text-sage-600 p-3 bg-sage-50 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      <span>当前数据与快照一致，无变化</span>
                    </div>
                  )}
                </div>
              </div>

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
