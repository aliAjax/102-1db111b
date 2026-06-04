import { useState, useRef, useMemo } from 'react';
import { Camera, Plus, Trash2, X, ImagePlus, Droplets, Sparkles, Leaf, Ruler, Search } from 'lucide-react';
import { usePlantStore } from '../store/usePlantStore';
import { compressImage, getTodayString } from '../utils/storage';
import { LEAF_STATUS_LABELS } from '../types';
import type { PlantRecord, GrowthPhoto } from '../types';

interface GrowthAlbumProps {
  plantId: string;
  records: PlantRecord[];
}

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  };
  return date.toLocaleDateString('zh-CN', options);
};

export function GrowthAlbum({ plantId, records }: GrowthAlbumProps) {
  const { growthPhotos, addGrowthPhoto, deleteGrowthPhoto, loadGrowthPhotos } = usePlantStore();
  const [isAdding, setIsAdding] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getTodayString());
  const [note, setNote] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plantPhotos = growthPhotos
    .filter((p) => p.plantId === plantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const recordsByDate = records.reduce((acc, r) => {
    if (!acc[r.date]) acc[r.date] = [];
    acc[r.date].push(r);
    return acc;
  }, {} as { [key: string]: PlantRecord[] });

  const filteredPhotos = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return plantPhotos;
    return plantPhotos.filter((photo) => {
      if (photo.note.toLowerCase().includes(query)) return true;
      const dateStr = formatDate(photo.date).toLowerCase();
      if (dateStr.includes(query)) return true;
      return false;
    });
  }, [plantPhotos, searchQuery]);

  const groupedPhotos = useMemo(() => {
    const groups: { monthKey: string; monthLabel: string; photos: GrowthPhoto[] }[] = [];
    const monthMap = new Map<string, GrowthPhoto[]>();
    filteredPhotos.forEach((photo) => {
      const d = new Date(photo.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthMap.has(monthKey)) monthMap.set(monthKey, []);
      monthMap.get(monthKey)!.push(photo);
    });
    const sortedKeys = [...monthMap.keys()].sort((a, b) => b.localeCompare(a));
    sortedKeys.forEach((key) => {
      const [year, month] = key.split('-');
      const d = new Date(Number(year), Number(month) - 1);
      const monthLabel = d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long' });
      groups.push({ monthKey: key, monthLabel, photos: monthMap.get(key)! });
    });
    return groups;
  }, [filteredPhotos]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async () => {
    if (!pendingFile && !previewUrl) return;
    setIsSubmitting(true);
    try {
      let dataUrl: string;
      if (pendingFile) {
        dataUrl = await compressImage(pendingFile);
      } else {
        return;
      }
      await addGrowthPhoto({
        plantId,
        date: selectedDate,
        photoDataUrl: dataUrl,
        note: note.trim(),
      });
      resetForm();
      await loadGrowthPhotos(plantId);
    } catch (err) {
      console.error('Failed to add photo:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setIsAdding(false);
    setSelectedDate(getTodayString());
    setNote('');
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPendingFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDelete = async (photo: GrowthPhoto) => {
    await deleteGrowthPhoto(photo.id, plantId);
    await loadGrowthPhotos(plantId);
  };

  const renderCareSummary = (date: string) => {
    const dateRecords = recordsByDate[date];
    if (!dateRecords || dateRecords.length === 0) {
      return (
        <span className="text-xs text-sage-400 italic">当天无护理记录</span>
      );
    }

    const tags: { icon: React.ReactNode; label: string; color: string }[] = [];
    dateRecords.forEach((r) => {
      if (r.watered) tags.push({ icon: <Droplets className="w-3 h-3" />, label: '浇水', color: 'bg-blue-50 text-blue-600' });
      if (r.fertilized) tags.push({ icon: <Sparkles className="w-3 h-3" />, label: '施肥', color: 'bg-amber-50 text-amber-600' });
      if (r.leafStatus) tags.push({ icon: <Leaf className="w-3 h-3" />, label: LEAF_STATUS_LABELS[r.leafStatus], color: 'bg-green-50 text-green-600' });
      if (r.height > 0) tags.push({ icon: <Ruler className="w-3 h-3" />, label: `${r.height}cm`, color: 'bg-sage-50 text-sage-600' });
    });

    const noteText = dateRecords.map((r) => r.notes).filter(Boolean).join('；');

    return (
      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag, i) => (
            <span key={i} className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full ${tag.color}`}>
              {tag.icon}
              {tag.label}
            </span>
          ))}
        </div>
        {noteText && <p className="text-xs text-sage-500 line-clamp-2">{noteText}</p>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-3">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-serif text-sage-800 flex items-center gap-2">
          <Camera className="w-5 h-5 text-sage-600" />
          生长相册
        </h2>
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors text-sm"
        >
          <Plus className="w-4 h-4" />
          添加照片
        </button>
      </div>

      {isAdding && (
        <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
          <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-sage-100">
              <h3 className="text-lg font-serif text-sage-800">添加生长照片</h3>
              <button
                onClick={resetForm}
                className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-sage-600" />
              </button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">日期</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={getTodayString()}
                  className="w-full px-4 py-2.5 border border-sage-200 rounded-xl bg-white text-sage-800 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 transition-colors"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">照片</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                {previewUrl ? (
                  <div className="relative rounded-xl overflow-hidden border border-sage-200">
                    <img
                      src={previewUrl}
                      alt="预览"
                      className="w-full max-h-64 object-contain bg-sage-50"
                    />
                    <button
                      onClick={() => {
                        if (previewUrl) URL.revokeObjectURL(previewUrl);
                        setPreviewUrl(null);
                        setPendingFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-black/60 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-12 border-2 border-dashed border-sage-200 rounded-xl flex flex-col items-center gap-3 text-sage-400 hover:text-sage-600 hover:border-sage-400 transition-colors"
                  >
                    <ImagePlus className="w-10 h-10" />
                    <span className="text-sm">点击选择或拍摄照片</span>
                  </button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-sage-700 mb-2">说明</label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="记录这一天的生长变化..."
                  rows={3}
                  className="w-full px-4 py-2.5 border border-sage-200 rounded-xl bg-white text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 transition-colors resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 border border-sage-200 text-sage-700 rounded-xl hover:bg-sage-50 transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!pendingFile || isSubmitting}
                  className="flex-1 px-4 py-2.5 bg-sage-500 text-white rounded-xl hover:bg-sage-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? '保存中...' : '保存'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {plantPhotos.length === 0 ? (
        <div className="text-center py-12 text-sage-400">
          <Camera className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>还没有生长照片</p>
          <p className="text-sm mt-1">记录植物的生长变化吧</p>
        </div>
      ) : (
        <>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sage-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索照片备注或日期..."
              className="w-full pl-9 pr-4 py-2.5 border border-sage-200 rounded-xl bg-white text-sage-800 placeholder:text-sage-300 focus:outline-none focus:ring-2 focus:ring-sage-300 focus:border-sage-400 transition-colors text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 hover:bg-sage-100 rounded transition-colors"
              >
                <X className="w-4 h-4 text-sage-400" />
              </button>
            )}
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="text-center py-12 text-sage-400">
              <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>没有找到匹配的照片</p>
              <p className="text-sm mt-1">尝试其他关键词搜索</p>
            </div>
          ) : (
            <div className="space-y-8">
              {groupedPhotos.map((group) => (
                <div key={group.monthKey}>
                  <div className="flex items-center gap-3 mb-4">
                    <h3 className="text-sm font-medium text-sage-600 whitespace-nowrap">{group.monthLabel}</h3>
                    <div className="flex-1 h-px bg-sage-100" />
                    <span className="text-xs text-sage-400">{group.photos.length} 张</span>
                  </div>
                  <div className="space-y-4">
                    {group.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="group relative bg-white rounded-xl border border-sage-100 shadow-sm overflow-hidden"
                      >
                        <div className="flex flex-col sm:flex-row">
                          <div className="sm:w-56 flex-shrink-0">
                            <img
                              src={photo.photoDataUrl}
                              alt={photo.note || '生长照片'}
                              className="w-full h-48 sm:h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <h4 className="text-sm font-medium text-sage-700">
                                  {formatDate(photo.date)}
                                </h4>
                                {photo.note && (
                                  <p className="text-sm text-sage-600 mt-1.5">{photo.note}</p>
                                )}
                              </div>
                              <button
                                onClick={() => handleDelete(photo)}
                                className="p-1.5 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-4 h-4 text-red-400" />
                              </button>
                            </div>
                            <div className="mt-3 pt-3 border-t border-sage-50">
                              <p className="text-xs text-sage-500 mb-2">护理记录</p>
                              {renderCareSummary(photo.date)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
