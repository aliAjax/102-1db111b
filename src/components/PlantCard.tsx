import { Sprout, MapPin, Calendar, Droplets } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Plant, PlantRecord } from '../types';

interface PlantCardProps {
  plant: Plant;
  latestRecord?: PlantRecord;
}

export function PlantCard({ plant, latestRecord }: PlantCardProps) {
  const navigate = useNavigate();

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  return (
    <div
      onClick={() => navigate(`/plant/${plant.id}`)}
      className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 hover:shadow-md hover:border-sage-200 transition-all cursor-pointer group animate-fade-in"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center">
          <Sprout className="w-6 h-6 text-sage-600" />
        </div>
        {latestRecord?.watered && (
          <span className="flex items-center gap-1 text-xs text-sage-500 bg-sage-50 px-2 py-1 rounded-full">
            <Droplets className="w-3 h-3" />
            已浇水
          </span>
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
    </div>
  );
}
