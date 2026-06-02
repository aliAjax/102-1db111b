import { Droplets, Leaf, AlertTriangle, Clock, CheckCircle } from 'lucide-react';
import type { NextCareInfo } from '../types';
import { SEASON_LABELS } from '../types';

interface NextCareInfoProps {
  info: NextCareInfo;
  compact?: boolean;
}

export function NextCareInfoDisplay({ info, compact }: NextCareInfoProps) {
  const isWater = info.type === 'water';
  const typeLabel = isWater ? '浇水' : '施肥';
  const TypeIcon = isWater ? Droplets : Leaf;

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  const getDaysLabel = () => {
    if (info.isOverdue) {
      return `逾期${Math.abs(info.daysUntil)}天`;
    }
    if (info.daysUntil === 0) {
      return '今天';
    }
    if (info.daysUntil === 1) {
      return '明天';
    }
    return `${info.daysUntil}天后`;
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full ${
          info.isOverdue
            ? 'bg-red-50 text-red-600'
            : info.daysUntil <= 1
            ? 'bg-amber-50 text-amber-600'
            : isWater
            ? 'bg-blue-50 text-blue-600'
            : 'bg-amber-50 text-amber-600'
        }`}
      >
        {info.isOverdue ? (
          <AlertTriangle className="w-3 h-3" />
        ) : (
          <TypeIcon className="w-3 h-3" />
        )}
        <span>{typeLabel}{getDaysLabel()}</span>
      </div>
    );
  }

  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-xl border ${
        info.isOverdue
          ? 'border-red-200 bg-red-50/50'
          : info.daysUntil <= 1
          ? 'border-amber-200 bg-amber-50/50'
          : 'border-sage-100 bg-white'
      }`}
    >
      <div
        className={`p-2.5 rounded-lg ${
          info.isOverdue
            ? 'bg-red-100'
            : isWater
            ? 'bg-blue-50'
            : 'bg-amber-50'
        }`}
      >
        {info.isOverdue ? (
          <AlertTriangle className="w-5 h-5 text-red-500" />
        ) : (
          <TypeIcon
            className={`w-5 h-5 ${
              isWater ? 'text-blue-500' : 'text-amber-500'
            }`}
          />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-sage-800">{typeLabel}</span>
          {info.isOverdue ? (
            <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full">
              逾期{Math.abs(info.daysUntil)}天
            </span>
          ) : info.daysUntil === 0 ? (
            <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-600 rounded-full">
              今天
            </span>
          ) : (
            <span className="text-xs px-2 py-0.5 bg-sage-100 text-sage-600 rounded-full">
              {getDaysLabel()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-1 text-xs text-sage-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            预计{formatDate(info.nextDate)}
          </span>
          {info.lastCareDate && (
            <span>上次{formatDate(info.lastCareDate)}</span>
          )}
          <span className="text-sage-400">
            {SEASON_LABELS[info.currentSeason]}·{info.currentInterval}天/次
          </span>
        </div>
      </div>
      {info.daysUntil <= 0 && !info.isOverdue && (
        <CheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
      )}
    </div>
  );
}

interface NextCareListProps {
  careInfos: NextCareInfo[];
}

export function NextCareList({ careInfos }: NextCareListProps) {
  if (careInfos.length === 0) return null;

  const sortedByUrgency = [...careInfos].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return a.daysUntil - b.daysUntil;
  });

  return (
    <div className="space-y-2">
      {sortedByUrgency.map((info) => (
        <NextCareInfoDisplay key={info.type} info={info} />
      ))}
    </div>
  );
}
