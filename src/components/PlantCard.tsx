import { Sprout, MapPin, Calendar, Droplets, Leaf, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Plant, PlantRecord, NextCareInfo } from '../types';

interface PlantCardProps {
  plant: Plant;
  latestRecord?: PlantRecord;
  nextCareInfos?: NextCareInfo[];
}

export function PlantCard({ plant, latestRecord, nextCareInfos }: PlantCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const mostUrgent = nextCareInfos?.reduce<NextCareInfo | null>((worst, info) => {
    if (!worst) return info;
    if (info.isOverdue && !worst.isOverdue) return info;
    if (info.isOverdue && worst.isOverdue) return info.daysUntil < worst.daysUntil ? info : worst;
    if (!info.isOverdue && !worst.isOverdue) return info.daysUntil < worst.daysUntil ? info : worst;
    return worst;
  }, null);

  const hasOverdue = nextCareInfos?.some((i) => i.isOverdue);
  const hasUrgent = nextCareInfos?.some((i) => !i.isOverdue && i.daysUntil <= 1);

  return (
    <div
      onClick={() => navigate(`/plant/${plant.id}`)}
      className={`bg-white rounded-2xl p-6 shadow-sm border hover:shadow-md transition-all cursor-pointer group animate-fade-in ${
        hasOverdue
          ? 'border-red-200 hover:border-red-300'
          : hasUrgent
          ? 'border-amber-200 hover:border-amber-300'
          : 'border-sage-100 hover:border-sage-200'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center">
          <Sprout className="w-6 h-6 text-sage-600" />
        </div>
        {mostUrgent && (
          <div
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${
              mostUrgent.isOverdue
                ? 'bg-red-50 text-red-600'
                : mostUrgent.daysUntil <= 1
                ? 'bg-amber-50 text-amber-600'
                : mostUrgent.type === 'water'
                ? 'bg-blue-50 text-blue-600'
                : 'bg-amber-50 text-amber-600'
            }`}
          >
            {mostUrgent.isOverdue ? (
              <AlertTriangle className="w-3 h-3" />
            ) : mostUrgent.type === 'water' ? (
              <Droplets className="w-3 h-3" />
            ) : (
              <Leaf className="w-3 h-3" />
            )}
            <span>
              {mostUrgent.isOverdue
                ? `${mostUrgent.type === 'water' ? '浇水' : '施肥'}逾期${Math.abs(mostUrgent.daysUntil)}天`
                : mostUrgent.daysUntil === 0
                ? `${mostUrgent.type === 'water' ? '浇水' : '施肥'}今天`
                : `${mostUrgent.type === 'water' ? '浇水' : '施肥'}${mostUrgent.daysUntil}天后`}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-lg font-serif text-sage-800 mb-1 group-hover:text-sage-600 transition-colors">
        {plant.name}
      </h3>
      {plant.species && (
        <p className="text-sm text-sage-500 mb-3">{plant.species}</p>
      )}
      <div className="flex flex-wrap gap-3 text-xs text-sage-500">
        {plant.location && (
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {plant.location}
          </span>
        )}
        {latestRecord && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(latestRecord.date)}
          </span>
        )}
      </div>
      {nextCareInfos && nextCareInfos.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-sage-50">
          {nextCareInfos.map((info) => (
            <span
              key={info.type}
              className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${
                info.isOverdue
                  ? 'bg-red-50 text-red-500'
                  : info.daysUntil <= 1
                  ? 'bg-amber-50 text-amber-500'
                  : info.type === 'water'
                  ? 'bg-blue-50 text-blue-500'
                  : 'bg-amber-50 text-amber-500'
              }`}
            >
              {info.type === 'water' ? (
                <Droplets className="w-3 h-3" />
              ) : (
                <Leaf className="w-3 h-3" />
              )}
              {info.isOverdue
                ? `逾期${Math.abs(info.daysUntil)}天`
                : info.daysUntil === 0
                ? '今天'
                : `${info.daysUntil}天后`}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
