import { useEffect, useState } from 'react';
import { Plus, Database, LayoutGrid, MapPin } from 'lucide-react';
import { usePlantStore } from '../store/usePlantStore';
import { PlantCard } from '../components/PlantCard';
import { LocationView } from '../components/LocationView';
import { PlantForm } from '../components/PlantForm';
import { DailyCare } from '../components/DailyCare';
import { ImportExportModal } from '../components/ImportExportModal';

type ViewMode = 'grid' | 'location';

export function Home() {
  const { plants, records, loadAllData } = usePlantStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [, forceUpdate] = useState({});

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
                onClick={() => setIsImportExportOpen(true)}
                className="p-2.5 bg-white border border-sage-200 text-sage-600 rounded-xl hover:bg-sage-50 transition-colors"
                title="数据管理"
              >
                <Database className="w-5 h-5" />
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-serif text-sage-800">我的植物</h2>
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

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {plants.map((plant, index) => (
                  <div key={plant.id} style={{ animationDelay: `${index * 0.05}s` }}>
                    <PlantCard
                      plant={plant}
                      latestRecord={getLatestRecord(plant.id)}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <LocationView plants={plants} records={records} />
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
    </div>
  );
}
