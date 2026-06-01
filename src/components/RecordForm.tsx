import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { LeafStatus, PlantRecord } from '../types';
import { usePlantStore } from '../store/usePlantStore';
import { getTodayString } from '../utils/storage';
import { LEAF_STATUS_LABELS } from '../types';

interface RecordFormProps {
  isOpen: boolean;
  onClose: () => void;
  plantId: string;
  initialDate?: string;
  editRecord?: PlantRecord | null;
}

export function RecordForm({ isOpen, onClose, plantId, initialDate, editRecord }: RecordFormProps) {
  const { addRecord, updateRecord } = usePlantStore();
  const [date, setDate] = useState(getTodayString());
  const [watered, setWatered] = useState(false);
  const [fertilized, setFertilized] = useState(false);
  const [leafStatus, setLeafStatus] = useState<LeafStatus>('');
  const [height, setHeight] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editRecord) {
      setDate(editRecord.date);
      setWatered(editRecord.watered);
      setFertilized(editRecord.fertilized);
      setLeafStatus(editRecord.leafStatus);
      setHeight(editRecord.height ? editRecord.height.toString() : '');
      setNotes(editRecord.notes);
    } else {
      setDate(initialDate || getTodayString());
      setWatered(false);
      setFertilized(false);
      setLeafStatus('');
      setHeight('');
      setNotes('');
    }
  }, [editRecord, initialDate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const recordData = {
      plantId,
      date,
      watered,
      fertilized,
      leafStatus,
      height: height ? parseFloat(height) : 0,
      notes,
    };

    if (editRecord) {
      updateRecord(editRecord.id, recordData);
    } else {
      addRecord(recordData);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-sage-100 sticky top-0 bg-cream-50">
          <h2 className="text-xl font-serif text-sage-800">
            {editRecord ? '编辑记录' : '添加护理记录'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-600" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              日期
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
            />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={watered}
                onChange={(e) => setWatered(e.target.checked)}
                className="w-5 h-5 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
              />
              <span className="text-sage-700">已浇水</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={fertilized}
                onChange={(e) => setFertilized(e.target.checked)}
                className="w-5 h-5 rounded border-sage-300 text-sage-600 focus:ring-sage-500"
              />
              <span className="text-sage-700">已施肥</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              叶片状态
            </label>
            <select
              value={leafStatus}
              onChange={(e) => setLeafStatus(e.target.value as LeafStatus)}
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
            >
              <option value="">未记录</option>
              {Object.entries(LEAF_STATUS_LABELS).filter(([key]) => key !== '').map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              高度 (cm)
            </label>
            <input
              type="number"
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              placeholder="例如：25.5"
              step="0.1"
              min="0"
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="观察到的变化..."
              rows={3}
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all resize-none"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
            >
              {editRecord ? '保存修改' : '添加记录'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
