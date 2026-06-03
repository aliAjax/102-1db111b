import { X, AlertTriangle, Droplets, Leaf, TrendingDown, Heart, Info, Clock, FileText } from 'lucide-react';
import type { Warning, PlantRecord } from '../types';
import { WARNING_TYPE_LABELS, WARNING_SEVERITY_LABELS, LEAF_STATUS_LABELS } from '../types';

interface WarningDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  warnings: Warning[];
  records: PlantRecord[];
  plantName: string;
}

const getWarningIcon = (type: Warning['type']) => {
  switch (type) {
    case 'yellowing_leaves':
      return <Leaf className="w-5 h-5 text-amber-500" />;
    case 'wilting_leaves':
      return <Leaf className="w-5 h-5 text-orange-500" />;
    case 'no_watering':
      return <Droplets className="w-5 h-5 text-blue-500" />;
    case 'stagnant_growth':
      return <TrendingDown className="w-5 h-5 text-purple-500" />;
    case 'over_caring':
      return <Heart className="w-5 h-5 text-pink-500" />;
    default:
      return <AlertTriangle className="w-5 h-5 text-amber-500" />;
  }
};

const getSeverityColor = (severity: Warning['severity']) => {
  switch (severity) {
    case 'high':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'medium':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'low':
      return 'bg-blue-50 text-blue-700 border-blue-200';
  }
};

const getSeverityBadgeColor = (severity: Warning['severity']) => {
  switch (severity) {
    case 'high':
      return 'bg-red-500';
    case 'medium':
      return 'bg-amber-500';
    case 'low':
      return 'bg-blue-500';
  }
};

export function WarningDetailModal({ isOpen, onClose, warnings, records, plantName }: WarningDetailModalProps) {
  if (!isOpen) return null;

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getRelatedRecords = (warning: Warning) => {
    return records.filter((r) => warning.relatedRecords.includes(r.id));
  };

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-fade-in">
        <div className="sticky top-0 bg-cream-50 border-b border-sage-100 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-serif text-sage-800">健康预警详情</h3>
              <p className="text-sm text-sage-500">{plantName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
          <div className="space-y-6">
            {warnings.map((warning, index) => {
              const relatedRecords = getRelatedRecords(warning);
              return (
                <div
                  key={warning.id}
                  className={`rounded-xl border p-5 ${getSeverityColor(warning.severity)}`}
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      warning.severity === 'high' ? 'bg-red-100' :
                      warning.severity === 'medium' ? 'bg-amber-100' : 'bg-blue-100'
                    }`}>
                      {getWarningIcon(warning.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium text-lg">{warning.title}</h4>
                        <span className={`text-xs px-2 py-0.5 rounded-full text-white ${getSeverityBadgeColor(warning.severity)}`}>
                          {WARNING_SEVERITY_LABELS[warning.severity]}
                        </span>
                      </div>

                      <p className="text-sm opacity-80 mb-4">{warning.description}</p>

                      <div className="space-y-3 mb-4">
                        <div className="flex items-start gap-2">
                          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium mb-1">判定条件</p>
                            <p className="text-sm opacity-80">{warning.details.condition}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Leaf className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium mb-1">养护建议</p>
                            <p className="text-sm opacity-80">{warning.details.suggestion}</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-2">
                          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
                          <div>
                            <p className="text-xs font-medium mb-1">触发时间</p>
                            <p className="text-sm opacity-80">{formatDate(warning.triggeredAt)}</p>
                          </div>
                        </div>
                      </div>

                      {relatedRecords.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-current/20">
                          <div className="flex items-center gap-2 mb-3">
                            <FileText className="w-4 h-4" />
                            <p className="text-xs font-medium">相关历史记录（{relatedRecords.length}条）</p>
                          </div>
                          <div className="space-y-2">
                            {relatedRecords.map((record) => (
                              <div
                                key={record.id}
                                className="bg-white/50 rounded-lg p-3 text-sm"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium">{formatDate(record.date)}</span>
                                  <div className="flex items-center gap-2">
                                    {record.watered && (
                                      <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                                        <Droplets className="w-3 h-3" />
                                        浇水
                                      </span>
                                    )}
                                    {record.fertilized && (
                                      <span className="inline-flex items-center gap-1 text-xs text-amber-600">
                                        <Leaf className="w-3 h-3" />
                                        施肥
                                      </span>
                                    )}
                                  </div>
                                </div>
                                {record.leafStatus && (
                                  <p className="text-xs mb-1">
                                    叶片状态：{LEAF_STATUS_LABELS[record.leafStatus]}
                                  </p>
                                )}
                                {record.height > 0 && (
                                  <p className="text-xs mb-1">
                                    高度：{record.height}cm
                                  </p>
                                )}
                                {record.notes && (
                                  <p className="text-xs opacity-70">备注：{record.notes}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="sticky bottom-0 bg-cream-50 border-t border-sage-100 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
}
