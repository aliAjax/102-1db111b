import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Plant, SeasonalInterval, Season } from '../types';
import { SEASON_LABELS } from '../types';
import { usePlantStore } from '../store/usePlantStore';

interface PlantFormProps {
  isOpen: boolean;
  onClose: () => void;
  editPlant?: Plant | null;
}

const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export function PlantForm({ isOpen, onClose, editPlant }: PlantFormProps) {
  const { addPlant, updatePlant } = usePlantStore();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [wateringInterval, setWateringInterval] = useState('7');
  const [fertilizingInterval, setFertilizingInterval] = useState('30');
  const [enableSeasonalPlan, setEnableSeasonalPlan] = useState(false);
  const [seasonalWater, setSeasonalWater] = useState<SeasonalInterval>({
    spring: 7, summer: 5, autumn: 7, winter: 10,
  });
  const [seasonalFertilize, setSeasonalFertilize] = useState<SeasonalInterval>({
    spring: 30, summer: 20, autumn: 30, winter: 45,
  });

  useEffect(() => {
    if (editPlant) {
      setName(editPlant.name);
      setSpecies(editPlant.species);
      setLocation(editPlant.location);
      setNotes(editPlant.notes);
      setWateringInterval(editPlant.wateringInterval?.toString() || '7');
      setFertilizingInterval(editPlant.fertilizingInterval?.toString() || '30');
      if (editPlant.carePlan) {
        setEnableSeasonalPlan(true);
        setSeasonalWater(editPlant.carePlan.wateringSchedule);
        setSeasonalFertilize(editPlant.carePlan.fertilizingSchedule);
      } else {
        setEnableSeasonalPlan(false);
      }
    } else {
      setName('');
      setSpecies('');
      setLocation('');
      setNotes('');
      setWateringInterval('7');
      setFertilizingInterval('30');
      setEnableSeasonalPlan(false);
      const wBase = 7;
      const fBase = 30;
      setSeasonalWater({ spring: wBase, summer: Math.max(1, wBase - 2), autumn: wBase, winter: wBase + 3 });
      setSeasonalFertilize({ spring: fBase, summer: Math.max(1, fBase - 10), autumn: fBase, winter: fBase + 15 });
    }
  }, [editPlant, isOpen]);

  const handleSeasonalWaterChange = (season: Season, val: string) => {
    setSeasonalWater((prev) => ({ ...prev, [season]: parseInt(val) || 0 }));
  };

  const handleSeasonalFertilizeChange = (season: Season, val: string) => {
    setSeasonalFertilize((prev) => ({ ...prev, [season]: parseInt(val) || 0 }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const baseData = {
      name,
      species,
      location,
      notes,
      wateringInterval: parseInt(wateringInterval) || 7,
      fertilizingInterval: parseInt(fertilizingInterval) || 30,
    };

    if (enableSeasonalPlan) {
      const carePlan = {
        wateringSchedule: seasonalWater,
        fertilizingSchedule: seasonalFertilize,
      };
      if (editPlant) {
        updatePlant(editPlant.id, { ...baseData, carePlan });
      } else {
        addPlant({ ...baseData, carePlan });
      }
    } else {
      if (editPlant) {
        updatePlant(editPlant.id, { ...baseData, carePlan: undefined });
      } else {
        addPlant(baseData);
      }
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-sage-100">
          <h2 className="text-xl font-serif text-sage-800">
            {editPlant ? '编辑植物' : '添加新植物'}
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
              植物名称 *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如：绿萝"
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              品种
            </label>
            <input
              type="text"
              value={species}
              onChange={(e) => setSpecies(e.target.value)}
              placeholder="例如：黄金葛"
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              摆放位置
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="例如：客厅窗台"
              className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
            />
          </div>

          <div className="border border-sage-100 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-sage-700">
                启用季节养护计划
              </label>
              <button
                type="button"
                onClick={() => setEnableSeasonalPlan(!enableSeasonalPlan)}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  enableSeasonalPlan ? 'bg-sage-500' : 'bg-sage-200'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    enableSeasonalPlan ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {enableSeasonalPlan ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-sage-700 mb-2">浇水周期（天/次）</p>
                  <div className="grid grid-cols-2 gap-2">
                    {seasons.map((s) => (
                      <div key={`w-${s}`} className="flex items-center gap-2">
                        <span className="text-xs text-sage-500 w-10">{SEASON_LABELS[s]}</span>
                        <input
                          type="number"
                          value={seasonalWater[s]}
                          onChange={(e) => handleSeasonalWaterChange(s, e.target.value)}
                          min="0"
                          className="flex-1 px-2 py-1.5 bg-white border border-sage-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-sage-700 mb-2">施肥周期（天/次）</p>
                  <div className="grid grid-cols-2 gap-2">
                    {seasons.map((s) => (
                      <div key={`f-${s}`} className="flex items-center gap-2">
                        <span className="text-xs text-sage-500 w-10">{SEASON_LABELS[s]}</span>
                        <input
                          type="number"
                          value={seasonalFertilize[s]}
                          onChange={(e) => handleSeasonalFertilizeChange(s, e.target.value)}
                          min="0"
                          className="flex-1 px-2 py-1.5 bg-white border border-sage-200 rounded-lg text-center text-sm focus:outline-none focus:ring-2 focus:ring-sage-400"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    浇水间隔 (天)
                  </label>
                  <input
                    type="number"
                    value={wateringInterval}
                    onChange={(e) => setWateringInterval(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-sage-700 mb-2">
                    施肥间隔 (天)
                  </label>
                  <input
                    type="number"
                    value={fertilizingInterval}
                    onChange={(e) => setFertilizingInterval(e.target.value)}
                    min="1"
                    className="w-full px-4 py-3 bg-white border border-sage-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-sage-700 mb-2">
              备注
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="养护注意事项..."
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
              {editPlant ? '保存修改' : '添加植物'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
