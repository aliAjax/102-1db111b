import { useState, useEffect } from 'react';
import { X, Droplets, Leaf, Sun, CloudRain, Snowflake } from 'lucide-react';
import type { Plant, Season, SeasonalInterval, CarePlan } from '../types';
import { SEASON_LABELS } from '../types';
import { usePlantStore } from '../store/usePlantStore';
import { getCurrentSeason } from '../utils/storage';

interface CarePlanFormProps {
  isOpen: boolean;
  onClose: () => void;
  plant: Plant;
}

const SEASON_ICONS: Record<Season, typeof Sun> = {
  spring: Sun,
  summer: Sun,
  autumn: CloudRain,
  winter: Snowflake,
};

const SEASON_COLORS: Record<Season, string> = {
  spring: 'text-green-500 bg-green-50',
  summer: 'text-orange-500 bg-orange-50',
  autumn: 'text-amber-600 bg-amber-50',
  winter: 'text-blue-500 bg-blue-50',
};

const defaultInterval = (plant: Plant, type: 'water' | 'fertilize'): SeasonalInterval => {
  const base = type === 'water' ? (plant.wateringInterval || 7) : (plant.fertilizingInterval || 30);
  return { spring: base, summer: base, autumn: base, winter: base };
};

export function CarePlanForm({ isOpen, onClose, plant }: CarePlanFormProps) {
  const { updatePlant } = usePlantStore();
  const currentSeason = getCurrentSeason();

  const [wateringSchedule, setWateringSchedule] = useState<SeasonalInterval>(
    plant.carePlan?.wateringSchedule || defaultInterval(plant, 'water')
  );
  const [fertilizingSchedule, setFertilizingSchedule] = useState<SeasonalInterval>(
    plant.carePlan?.fertilizingSchedule || defaultInterval(plant, 'fertilize')
  );
  const [activeTab, setActiveTab] = useState<'water' | 'fertilize'>('water');

  useEffect(() => {
    setWateringSchedule(plant.carePlan?.wateringSchedule || defaultInterval(plant, 'water'));
    setFertilizingSchedule(plant.carePlan?.fertilizingSchedule || defaultInterval(plant, 'fertilize'));
  }, [plant, isOpen]);

  const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

  const handleIntervalChange = (
    type: 'water' | 'fertilize',
    season: Season,
    value: string
  ) => {
    const numVal = parseInt(value) || 0;
    if (type === 'water') {
      setWateringSchedule((prev) => ({ ...prev, [season]: numVal }));
    } else {
      setFertilizingSchedule((prev) => ({ ...prev, [season]: numVal }));
    }
  };

  const handleReset = (type: 'water' | 'fertilize') => {
    if (type === 'water') {
      setWateringSchedule(defaultInterval(plant, 'water'));
    } else {
      setFertilizingSchedule(defaultInterval(plant, 'fertilize'));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const carePlan: CarePlan = {
      wateringSchedule,
      fertilizingSchedule,
    };
    updatePlant(plant.id, { carePlan });
    onClose();
  };

  const handleRemovePlan = () => {
    updatePlant(plant.id, { carePlan: undefined });
    onClose();
  };

  if (!isOpen) return null;

  const activeSchedule = activeTab === 'water' ? wateringSchedule : fertilizingSchedule;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-sage-100">
          <div>
            <h2 className="text-xl font-serif text-sage-800">养护计划</h2>
            <p className="text-sm text-sage-500 mt-1">{plant.name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-sage-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="flex gap-2 bg-sage-50 rounded-xl p-1">
            <button
              type="button"
              onClick={() => setActiveTab('water')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'water'
                  ? 'bg-blue-500 text-white shadow-sm'
                  : 'text-sage-600 hover:bg-sage-100'
              }`}
            >
              <Droplets className="w-4 h-4" />
              浇水计划
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('fertilize')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'fertilize'
                  ? 'bg-amber-500 text-white shadow-sm'
                  : 'text-sage-600 hover:bg-sage-100'
              }`}
            >
              <Leaf className="w-4 h-4" />
              施肥计划
            </button>
          </div>

          <div className="space-y-3">
            {seasons.map((season) => {
              const Icon = SEASON_ICONS[season];
              const colorClass = SEASON_COLORS[season];
              const isCurrentSeason = season === currentSeason;
              return (
                <div
                  key={season}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                    isCurrentSeason
                      ? 'border-sage-300 bg-sage-50'
                      : 'border-sage-100 bg-white'
                  }`}
                >
                  <div className={`p-2 rounded-lg ${colorClass}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-sage-700">
                        {SEASON_LABELS[season]}
                      </span>
                      {isCurrentSeason && (
                        <span className="text-xs px-2 py-0.5 bg-sage-200 text-sage-700 rounded-full">
                          当前
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      value={activeSchedule[season]}
                      onChange={(e) => handleIntervalChange(activeTab, season, e.target.value)}
                      min="0"
                      max="365"
                      className="w-16 px-2 py-1.5 bg-white border border-sage-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent"
                    />
                    <span className="text-xs text-sage-500">天/次</span>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={() => handleReset(activeTab)}
            className="text-sm text-sage-500 hover:text-sage-700 underline transition-colors"
          >
            重置为默认间隔（{activeTab === 'water' ? plant.wateringInterval || 7 : plant.fertilizingInterval || 30}天）
          </button>

          <div className="flex gap-3 pt-2">
            {plant.carePlan && (
              <button
                type="button"
                onClick={handleRemovePlan}
                className="px-4 py-3 border border-red-200 text-red-500 rounded-xl hover:bg-red-50 transition-colors text-sm"
              >
                删除计划
              </button>
            )}
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
              保存计划
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
