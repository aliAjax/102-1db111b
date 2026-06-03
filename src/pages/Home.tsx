import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Database, LayoutGrid, MapPin, BarChart3, GitCompare, Camera, ListPlus, X, Filter } from 'lucide-react';
import { usePlantStore } from '../store/usePlantStore';
import { PlantCard } from '../components/PlantCard';
import { LocationView } from '../components/LocationView';
import { PlantForm } from '../components/PlantForm';
import { DailyCare } from '../components/DailyCare';
import { ImportExportModal } from '../components/ImportExportModal';
import { SnapshotModal } from '../components/SnapshotModal';
import { BatchRecordForm } from '../components/BatchRecordForm';
import { getHighestSeverity } from '../utils/warningEngine';
import type { WarningSeverity } from '../types';
import { WARNING_SEVERITY_LABELS } from '../types';

type ViewMode = 'grid' | 'location';

type WarningFilter = 'all' | 'has_warning' | 'no_warning' | WarningSeverity;

const WARNING_FILTER_OPTIONS: { value: WarningFilter; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: 'has_warning', label: '有预警' },
  { value: 'no_warning', label: '无预警' },
  { value: 'high', label: `严重 (${WARNING_SEVERITY_LABELS.high})` },
  { value: 'medium', label: `中等 (${WARNING_SEVERITY_LABELS.medium})` },
  { value: 'low', label: `轻微 (${WARNING_SEVERITY_LABELS.low})` },
];

export function Home() {
  const { plants, records, loadAllData, getNextCareInfo, getPlantWarnings } = usePlantStore();
  const navigate = useNavigate();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isBatchRecordOpen, setIsBatchRecordOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [, forceUpdate] = useState({});
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [warningFilter, setWarningFilter] = useState<WarningFilter>('all');

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    const interval = setInterval(() => forceUpdate({}), 1000);
    return () => clearInterval(interval);
  }, []);

  const getLatestRecord = (plantId: string) => {
    const plantRecords = records
      .filter((r) => r.plantId === plantId)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return plantRecords[0];
  };

  const locations = useMemo(() => {
    const uniqueLocations = new Set<string>();
    plants.forEach((plant) => {
      if (plant.location?.trim()) {
        uniqueLocations.add(plant.location.trim());
      }
    });
    return Array.from(uniqueLocations).sort((a, b) => a.localeCompare(b, 'zh-CN'));
  }, [plants]);

  const getPlantWarningsSafe = useCallback((plantId: string) => {
    try {
      return getPlantWarnings(plantId) || [];
    } catch (e) {
      console.error('Failed to get warnings for plant', plantId, e);
      return [];
    }
  }, [getPlantWarnings]);

  const allWarningsMap = useMemo(() => {
    const map = new Map<string, { warnings: ReturnType<typeof getPlantWarningsSafe>; highestSeverity: WarningSeverity | null }>();
    plants.forEach((plant) => {
      try {
        const warnings = getPlantWarningsSafe(plant.id);
        const highestSeverity = getHighestSeverity(warnings);
        map.set(plant.id, { warnings, highestSeverity });
      } catch (e) {
        console.error('Failed to process warnings for plant', plant.id, e);
        map.set(plant.id, { warnings: [], highestSeverity: null });
      }
    });
    return map;
  }, [plants, getPlantWarningsSafe]);

  const filteredPlants = useMemo(() => {
    return plants.filter((plant) => {
      if (locationFilter !== 'all') {
        const plantLocation = plant.location?.trim() || '';
        if (plantLocation !== locationFilter) {
          return false;
        }
      }

      const warningInfo = allWarningsMap.get(plant.id);
      if (!warningInfo) return false;

      const { warnings, highestSeverity } = warningInfo;
      const hasWarning = warnings.length > 0;

      if (warningFilter === 'has_warning' && !hasWarning) {
        return false;
      }
      if (warningFilter === 'no_warning' && hasWarning) {
        return false;
      }
      if (warningFilter === 'high' && highestSeverity !== 'high') {
        return false;
      }
      if (warningFilter === 'medium' && highestSeverity !== 'medium') {
        return false;
      }
      if (warningFilter === 'low' && highestSeverity !== 'low') {
        return false;
      }

      return true;
    });
  }, [plants, locationFilter, warningFilter, allWarningsMap]);

  const hasActiveFilters = locationFilter !== 'all' || warningFilter !== 'all';

  const clearFilters = useCallback(() => {
    setLocationFilter('all');
    setWarningFilter('all');
  }, []);

  return (
    <div className="min-h-screen bg-cream-200">
      <header className="bg-white/60 backdrop-blur-sm border-b border-sage-100 sticky top-0 z-40">
        <div className="container py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-serif text-sage-800">植物生长日记</h1>
              <p className="text-sm text-sage-500 mt-1">
                记录每一次浇水，见证每一寸生长
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/care-stats')}
                className="p-2.5 bg-white border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
                title="护理统计"
              >
                <BarChart3 className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate('/compare')}
                className="p-2.5 bg-white border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
                title="对比分析"
              >
                <GitCompare className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsImportExportOpen(true)}
                className="p-2.5 bg-white border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
                title="数据管理"
              >
                <Database className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsSnapshotOpen(true)}
                className="p-2.5 bg-white border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
                title="数据快照"
              >
                <Camera className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsBatchRecordOpen(true)}
                className="p-2.5 bg-sage-100 border border-sage-300 text-sage-700 rounded-xl hover:bg-sage-200 transition-colors"
                title="批量录入护理记录"
              >
                <ListPlus className="w-5 h-5" />
              </button>
              <button
                onClick={() => setIsFormOpen(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors shadow-sm"
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">添加植物</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        {plants.length > 0 && (
          <div className="mb-8">
            <DailyCare />
          </div>
        )}

        {plants.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <svg
                className="w-10 h-10 text-sage-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h2 className="text-xl font-serif text-sage-700 mb-2">
              还没有植物
            </h2>
            <p className="text-sage-500 mb-6">
              点击右上角按钮添加你的第一盆植物吧
            </p>
            <button
              onClick={() => setIsFormOpen(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors"
            >
              <Plus className="w-5 h-5" />
              添加植物
            </button>
          </div>
        ) : (
          <div>
            <div className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <h2 className="text-lg font-serif text-sage-800">我的植物</h2>
                  {hasActiveFilters && (
                    <span className="text-xs bg-sage-100 text-sage-600 px-2.5 py-1 rounded-full">
                      筛选结果 {filteredPlants.length} / {plants.length}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-sage-100 shadow-sm">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-sage-500 text-white'
                        : 'text-sage-600 hover:bg-sage-50'
                    }`}
                  >
                    <LayoutGrid className="w-4 h-4" />
                    <span className="hidden sm:inline">网格视图</span>
                  </button>
                  <button
                    onClick={() => setViewMode('location')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                      viewMode === 'location'
                        ? 'bg-sage-500 text-white'
                        : 'text-sage-600 hover:bg-sage-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span className="hidden sm:inline">位置视图</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-sage-500" />
                  <span className="text-sm text-sage-600">筛选：</span>
                </div>

                <select
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="px-3 py-2 bg-white border border-sage-200 rounded-lg text-sm text-sage-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent cursor-pointer"
                >
                  <option value="all">全部位置</option>
                  {locations.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>

                <select
                  value={warningFilter}
                  onChange={(e) => setWarningFilter(e.target.value as WarningFilter)}
                  className="px-3 py-2 bg-white border border-sage-200 rounded-lg text-sm text-sage-700 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-transparent cursor-pointer"
                >
                  {WARNING_FILTER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {hasActiveFilters && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-sage-600 hover:text-sage-800 hover:bg-sage-50 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    清空筛选
                  </button>
                )}
              </div>
            </div>

            {filteredPlants.length === 0 ? (
              <div className="text-center py-20 bg-white/60 rounded-2xl border border-sage-100">
                <div className="w-20 h-20 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Filter className="w-10 h-10 text-sage-400" />
                </div>
                <h2 className="text-xl font-serif text-sage-700 mb-2">
                  没有符合筛选条件的植物
                </h2>
                <p className="text-sage-500 mb-6">
                  试试调整筛选条件，或者
                  <button
                    onClick={clearFilters}
                    className="text-sage-600 hover:text-sage-800 underline ml-1"
                  >
                    清空所有筛选
                  </button>
                </p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredPlants.map((plant, index) => (
                  <div key={plant.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <PlantCard
                      plant={plant}
                      latestRecord={getLatestRecord(plant.id)}
                      nextCareInfos={getNextCareInfo(plant.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <LocationView plants={filteredPlants} records={records} />
            )}
          </div>
        )}
      </main>

      <PlantForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />

      <ImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        onImportComplete={loadAllData}
      />

      <SnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        onRestoreComplete={loadAllData}
      />

      <BatchRecordForm
        isOpen={isBatchRecordOpen}
        onClose={() => setIsBatchRecordOpen(false)}
      />
    </div>
  );
}
