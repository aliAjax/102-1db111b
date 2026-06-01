import { Droplets, Leaf, Ruler, Sparkles, Pencil, Trash2 } from 'lucide-react';
import type { PlantRecord } from '../types';
import { LEAF_STATUS_LABELS } from '../types';
import { usePlantStore } from '../store/usePlantStore';

interface TimelineProps {
  records: PlantRecord[];
  onEditRecord: (record: PlantRecord) => void;
}

export function Timeline({ records, onEditRecord }: TimelineProps) {
  const { deleteRecord } = usePlantStore();

  if (records.length === 0) {
    return (
      <div className="text-center py-12 text-sage-400">
        <Leaf className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>还没有护理记录</p>
      </div>
    );
  }

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

  const groupedRecords = records.reduce((acc, record) => {
    if (!acc[record.date]) {
      acc[record.date] = [];
    }
    acc[record.date].push(record);
    return acc;
  }, {} as { [key: string]: PlantRecord[] });

  const sortedDates = Object.keys(groupedRecords).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime()
  );

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-sage-200" />
      
      <div className="space-y-8">
        {sortedDates.map((date, dateIndex) => (
          <div key={date} className="relative animate-fade-in" style={{ animationDelay: `${dateIndex * 0.05}s` }}>
            <div className="absolute left-2 w-5 h-5 bg-sage-400 rounded-full border-4 border-cream-200" />
            
            <div className="ml-12">
              <h4 className="text-sm font-medium text-sage-600 mb-3">
                {formatDate(date)}
              </h4>
              
              <div className="space-y-3">
                {groupedRecords[date].map((record) => (
                  <div
                    key={record.id}
                    className="bg-white rounded-xl p-4 border border-sage-100 shadow-sm group"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 space-y-3">
                        <div className="flex flex-wrap gap-2">
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
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => onEditRecord(record)}
                          className="p-1.5 hover:bg-sage-100 rounded-lg transition-colors"
                        >
                          <Pencil className="w-4 h-4 text-sage-500" />
                        </button>
                        <button
                          onClick={() => deleteRecord(record.id)}
                          className="p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
