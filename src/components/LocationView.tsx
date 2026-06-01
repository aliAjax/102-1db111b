import { MapPin, Calendar, Droplets, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { PlantCard } from './PlantCard';
import { getTodayString } from '../utils/storage';
import type { Plant, PlantRecord } from '../types';

interface LocationViewProps {
  plants: Plant[];
  records: PlantRecord[];
}

interface LocationGroup {
  location: string;
  plants: Plant[];
  count: number;
  latestCareDate: string | null;
  hasWateredToday: boolean;
}

const UNSET_LOCATION = '未设置位置';

export function LocationView({ plants, records }: LocationViewProps) {
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const getLatestRecord = (plantId: string) => {
    const plantRecords = records
      .filter((r) => r.plantId === plantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return plantRecords[0];
  };

  const getLocationGroups = (): LocationGroup[] => {
    const groups: { [key: string]: Plant[] } = {};

    plants.forEach((plant) => {
      const location = plant.location?.trim() || UNSET_LOCATION;
      if (!groups[location]) {
        groups[location] = [];
      }
      groups[location].push(plant);
    });

    const today = getTodayString();

    return Object.entries(groups)
      .map(([location, locationPlants]) => {
        const allRecords = locationPlants.flatMap((p) =>
          records.filter((r) => r.plantId === p.id)
        );

        const latestCareDate = allRecords.length > 0
          ? allRecords
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].date
          : null;

        const hasWateredToday = allRecords.some(
          (r) => r.date === today && r.watered
        );

        return {
          location,
          plants: locationPlants,
          count: locationPlants.length,
          latestCareDate,
          hasWateredToday,
        };
      })
      .sort((a, b) => {
        if (a.location === UNSET_LOCATION) return 1;
        if (b.location === UNSET_LOCATION) return -1;
        return a.location.localeCompare(b.location, 'zh-CN');
      });
  };

  const toggleLocation = (location: string) => {
    setExpandedLocations((prev) => {
      const next = new Set(prev);
      if (next.has(location)) {
        next.delete(location);
      } else {
        next.add(location);
      }
      return next;
    });
  };

  const locationGroups = getLocationGroups();

  if (locationGroups.length === 0) {
    return null;
  }

  return (
    <div className="space-y-6">
      {locationGroups.map((group, groupIndex) => {
        const isExpanded = expandedLocations.has(group.location);
        return (
          <div
            key={group.location}
            className="bg-white/80 backdrop-blur-sm rounded-2xl border border-sage-100 overflow-hidden shadow-sm"
          >
            <div
              className="flex items-center justify-between p-5 cursor-pointer hover:bg-sage-50/50 transition-colors"
              onClick={() => toggleLocation(group.location)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-sage-100 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-sage-600" />
                </div>
                <div>
                  <h3 className="text-lg font-serif text-sage-800">
                    {group.location}
                  </h3>
                  <div className="flex items-center gap-4 mt-1 text-xs text-sage-500">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-sage-400 rounded-full"></span>
                      {group.count} 盆植物
                    </span>
                    {group.latestCareDate && (
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        最近护理：{formatDate(group.latestCareDate)}
                      </span>
                    )}
                    {group.hasWateredToday && (
                      <span className="flex items-center gap-1 text-sage-600 bg-sage-100 px-2 py-0.5 rounded-full">
                        <Droplets className="w-3 h-3" />
                        今日已浇水
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-2 rounded-xl hover:bg-sage-100 transition-colors">
                {isExpanded ? (
                  <ChevronDown className="w-5 h-5 text-sage-500" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-sage-500" />
                )}
              </div>
            </div>

            {isExpanded && (
              <div className="px-5 pb-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 pt-2">
                  {group.plants.map((plant, index) => (
                    <div
                      key={plant.id}
                      style={{ animationDelay: `${groupIndex * 0.05 + index * 0.05}s` }}
                    >
                      <PlantCard
                        plant={plant}
                        latestRecord={getLatestRecord(plant.id)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
