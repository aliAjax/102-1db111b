import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Sprout, MapPin, Pencil, Trash2, Droplets, Leaf } from 'lucide-react';
import { usePlantStore } from '../store/usePlantStore';
import { Timeline } from '../components/Timeline';
import { HeightChart } from '../components/HeightChart';
import { CalendarHeatmap } from '../components/CalendarHeatmap';
import { RecordForm } from '../components/RecordForm';
import { PlantForm } from '../components/PlantForm';
import { DayDetails } from '../components/DayDetails';
import { GrowthAlbum } from '../components/GrowthAlbum';
import type { PlantRecord } from '../types';

export function PlantDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { getPlantById, records, deletePlant, loadAllData, loadGrowthPhotos } = usePlantStore();
  
  const [isRecordFormOpen, setIsRecordFormOpen] = useState(false);
  const [isPlantFormOpen, setIsPlantFormOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editRecord, setEditRecord] = useState<PlantRecord | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (id) {
      loadGrowthPhotos(id);
    }
  }, [id, loadGrowthPhotos]);

  const plant = id ? getPlantById(id) : undefined;
  const plantRecords = records
    .filter((r) => r.plantId === id)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  useEffect(() => {
    if (id && !plant) {
      navigate('/');
    }
  }, [plant, id, navigate]);

  if (!plant) return null;

  const handleDateClick = (date: string) => {
    setSelectedDate(date);
  };

  const handleEditRecord = (record: PlantRecord) => {
    setEditRecord(record);
    setIsRecordFormOpen(true);
  };

  const handleCloseRecordForm = () => {
    setIsRecordFormOpen(false);
    setEditRecord(null);
  };

  const handleDeletePlant = () => {
    if (id) {
      deletePlant(id);
      navigate('/');
    }
  };

  const selectedDateRecords = selectedDate
    ? plantRecords.filter((r) => r.date === selectedDate)
    : [];

  return (
    <div className="min-h-screen bg-cream-200">
      <header className="bg-white/60 backdrop-blur-sm border-b border-sage-100 sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sage-600 hover:text-sage-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">返回</span>
            </button>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsPlantFormOpen(true)}
                className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
                title="编辑植物信息"
              >
                <Pencil className="w-5 h-5 text-sage-600" />
              </button>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="p-2 hover:bg-red-50 rounded-lg transition-colors"
                title="删除植物"
              >
                <Trash2 className="w-5 h-5 text-red-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container py-8">
        <div className="bg-white rounded-2xl p-6 mb-6 shadow-sm border border-sage-100 animate-fade-in">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 bg-sage-100 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Sprout className="w-8 h-8 text-sage-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-serif text-sage-800 mb-1">{plant.name}</h1>
              {plant.species && (
                <p className="text-sage-500 mb-2">{plant.species}</p>
              )}
              {plant.location && (
                <span className="inline-flex items-center gap-1 text-sm text-sage-500">
                  <MapPin className="w-4 h-4" />
                  {plant.location}
                </span>
              )}
              {plant.notes && (
                <p className="text-sm text-sage-500 mt-2">{plant.notes}</p>
              )}
              <div className="flex flex-wrap gap-3 mt-3">
                <span className="inline-flex items-center gap-1.5 text-sm text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
                  <Droplets className="w-4 h-4" />
                  每 {plant.wateringInterval || 7} 天浇水
                </span>
                <span className="inline-flex items-center gap-1.5 text-sm text-amber-600 bg-amber-50 px-3 py-1.5 rounded-full">
                  <Leaf className="w-4 h-4" />
                  每 {plant.fertilizingInterval || 30} 天施肥
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-1">
            <h2 className="text-lg font-serif text-sage-800 mb-4">高度趋势</h2>
            <HeightChart records={plantRecords} />
          </div>
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-2">
            <CalendarHeatmap records={plantRecords} onDateClick={handleDateClick} />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-3">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-serif text-sage-800">生长记录</h2>
            <button
              onClick={() => setIsRecordFormOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors text-sm"
            >
              <Plus className="w-4 h-4" />
              添加记录
            </button>
          </div>
          <Timeline records={plantRecords} onEditRecord={handleEditRecord} />
        </div>

        {id && (
          <div className="mt-6">
            <GrowthAlbum plantId={id} records={plantRecords} />
          </div>
        )}
      </main>

      <RecordForm
        isOpen={isRecordFormOpen}
        onClose={handleCloseRecordForm}
        plantId={id!}
        editRecord={editRecord}
      />

      <PlantForm
        isOpen={isPlantFormOpen}
        onClose={() => setIsPlantFormOpen(false)}
        editPlant={plant}
      />

      <DayDetails
        isOpen={!!selectedDate}
        onClose={() => setSelectedDate(null)}
        date={selectedDate || ''}
        records={selectedDateRecords}
        plantName={plant.name}
      />

      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-sm animate-fade-in p-6">
            <h3 className="text-lg font-serif text-sage-800 mb-2">确认删除</h3>
            <p className="text-sage-500 mb-6">
              确定要删除「{plant.name}」吗？所有相关记录也会被删除，此操作不可撤销。
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 px-4 py-2.5 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleDeletePlant}
                className="flex-1 px-4 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
