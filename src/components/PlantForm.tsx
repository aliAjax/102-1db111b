import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import type { Plant } from '../types';
import { usePlantStore } from '../store/usePlantStore';

interface PlantFormProps {
  isOpen: boolean;
  onClose: () => void;
  editPlant?: Plant | null;
}

export function PlantForm({ isOpen, onClose, editPlant }: PlantFormProps) {
  const { addPlant, updatePlant } = usePlantStore();
  const [name, setName] = useState('');
  const [species, setSpecies] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (editPlant) {
      setName(editPlant.name);
      setSpecies(editPlant.species);
      setLocation(editPlant.location);
      setNotes(editPlant.notes);
    } else {
      setName('');
      setSpecies('');
      setLocation('');
      setNotes('');
    }
  }, [editPlant, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editPlant) {
      updatePlant(editPlant.id, { name, species, location, notes });
    } else {
      addPlant({ name, species, location, notes });
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-sage-900/40 flex items-center justify-center z-50 p-4">
      <div className="bg-cream-50 rounded-2xl shadow-xl w-full max-w-md animate-fade-in">
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
