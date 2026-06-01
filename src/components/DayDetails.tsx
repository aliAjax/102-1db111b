import { X, Droplets, Sparkles, Leaf, Ruler } from 'lucide-react';
import type { PlantRecord } from '../types';
import { LEAF_STATUS_LABELS } from '../types';

interface DayDetailsProps {
  isOpen: boolean;
  onClose: () => void;
  date: string;
  records: PlantRecord[];
  plantName: string;
}

export function DayDetails({ isOpen, onClose, date, records, plantName }: DayDetailsProps) {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };
    return date.toLocaleDateString('zh-CN', options);
  };

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-sage-100 sticky top-0 bg-cream-50">
          <div>
            <h2 className="text-xl font-serif text-sage-800">{formatDate(date)}</h2>
            <p className="text-sm text-sage-500 mt-1">{plantName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-600" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {records.length === 0 ? (
            <p className="text-center text-sage-400 py-8">当天没有记录</p>
          ) : (
            records.map((record) => (
              <div
                key={record.id}
                className="bg-white rounded-xl p-4 border border-sage-100"
              >
                <div className="flex flex-wrap gap-2 mb-3">
                  {record.watered && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-600 text-xs rounded-full">
                      <Droplets className="w-3 h-3" />
                      浇水
                    </span>
                  )}
                  {record.fertilized && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-600 text-xs rounded-full">
                      <Sparkles className="w-3 h-3" />
                      施肥
                    </span>
                  )}
                  {record.leafStatus && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-600 text-xs rounded-full">
                      <Leaf className="w-3 h-3" />
                      {LEAF_STATUS_LABELS[record.leafStatus]}
                    </span>
                  )}
                  {record.height > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-sage-50 text-sage-600 text-xs rounded-full">
                      <Ruler className="w-3 h-3" />
                      {record.height} cm
                    </span>
                  )}
                </div>
                {record.notes && (
                  <p className="text-sm text-sage-600">{record.notes}</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
