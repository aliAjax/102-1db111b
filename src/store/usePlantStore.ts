import { create } from 'zustand';
import type { Plant, PlantRecord } from '../types';
import {
  loadData,
  addPlant as storageAddPlant,
  updatePlant as storageUpdatePlant,
  deletePlant as storageDeletePlant,
  addRecord as storageAddRecord,
  updateRecord as storageUpdateRecord,
  deleteRecord as storageDeleteRecord,
  getRecordsByPlantId,
  getTodayString,
} from '../utils/storage';

export interface CareTask {
  plantId: string;
  plantName: string;
  type: 'water' | 'fertilize';
  status: 'pending' | 'completed';
  lastCareDate: string | null;
  daysSinceLastCare: number;
}

interface PlantStore {
  plants: Plant[];
  records: PlantRecord[];
  isLoaded: boolean;
  
  loadAllData: () => void;
  addPlant: (plant: Omit<Plant, 'id' | 'createdAt'>) => void;
  updatePlant: (id: string, updates: Partial<Plant>) => void;
  deletePlant: (id: string) => void;
  
  addRecord: (record: Omit<PlantRecord, 'id'>) => void;
  updateRecord: (id: string, updates: Partial<PlantRecord>) => void;
  deleteRecord: (id: string) => void;
  
  getPlantRecords: (plantId: string) => PlantRecord[];
  getPlantById: (id: string) => Plant | undefined;
  
  getTodayCareTasks: () => CareTask[];
  completeCareTask: (plantId: string, taskType: 'water' | 'fertilize') => void;
}

export const usePlantStore = create<PlantStore>((set, get) => ({
  plants: [],
  records: [],
  isLoaded: false,

  loadAllData: () => {
    const data = loadData();
    set({
      plants: data.plants,
      records: data.records,
      isLoaded: true,
    });
  },

  addPlant: (plant) => {
    const newPlant = storageAddPlant(plant);
    set((state) => ({
      plants: [...state.plants, newPlant],
    }));
  },

  updatePlant: (id, updates) => {
    const updated = storageUpdatePlant(id, updates);
    if (updated) {
      set((state) => ({
        plants: state.plants.map((p) => (p.id === id ? updated : p)),
      }));
    }
  },

  deletePlant: (id) => {
    storageDeletePlant(id);
    set((state) => ({
      plants: state.plants.filter((p) => p.id !== id),
      records: state.records.filter((r) => r.plantId !== id),
    }));
  },

  addRecord: (record) => {
    const newRecord = storageAddRecord(record);
    set((state) => ({
      records: [...state.records, newRecord],
    }));
  },

  updateRecord: (id, updates) => {
    const updated = storageUpdateRecord(id, updates);
    if (updated) {
      set((state) => ({
        records: state.records.map((r) => (r.id === id ? updated : r)),
      }));
    }
  },

  deleteRecord: (id) => {
    storageDeleteRecord(id);
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    }));
  },

  getPlantRecords: (plantId) => {
    return getRecordsByPlantId(plantId);
  },

  getPlantById: (id) => {
    return get().plants.find((p) => p.id === id);
  },

  getTodayCareTasks: () => {
    const { plants, records } = get();
    const today = getTodayString();
    const tasks: CareTask[] = [];

    plants.forEach((plant) => {
      const plantRecords = records
        .filter((r) => r.plantId === plant.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const lastWaterRecord = plantRecords.find((r) => r.watered);
      const lastFertilizeRecord = plantRecords.find((r) => r.fertilized);

      const todayRecord = plantRecords.find((r) => r.date === today);

      const getDaysDiff = (dateStr: string | null): number => {
        if (!dateStr) return Infinity;
        const lastDate = new Date(dateStr);
        const todayDate = new Date(today);
        return Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      };

      const daysSinceLastWater = getDaysDiff(lastWaterRecord?.date || null);
      const needsWater = daysSinceLastWater >= (plant.wateringInterval || 7);
      const waterCompleted = todayRecord?.watered || false;

      if (needsWater || waterCompleted) {
        tasks.push({
          plantId: plant.id,
          plantName: plant.name,
          type: 'water',
          status: waterCompleted ? 'completed' : 'pending',
          lastCareDate: lastWaterRecord?.date || null,
          daysSinceLastCare: daysSinceLastWater === Infinity ? -1 : daysSinceLastWater,
        });
      }

      const daysSinceLastFertilize = getDaysDiff(lastFertilizeRecord?.date || null);
      const needsFertilize = daysSinceLastFertilize >= (plant.fertilizingInterval || 30);
      const fertilizeCompleted = todayRecord?.fertilized || false;

      if (needsFertilize || fertilizeCompleted) {
        tasks.push({
          plantId: plant.id,
          plantName: plant.name,
          type: 'fertilize',
          status: fertilizeCompleted ? 'completed' : 'pending',
          lastCareDate: lastFertilizeRecord?.date || null,
          daysSinceLastCare: daysSinceLastFertilize === Infinity ? -1 : daysSinceLastFertilize,
        });
      }
    });

    return tasks;
  },

  completeCareTask: (plantId: string, taskType: 'water' | 'fertilize') => {
    const { records, addRecord, updateRecord } = get();
    const today = getTodayString();

    const todayRecord = records.find(
      (r) => r.plantId === plantId && r.date === today
    );

    if (todayRecord) {
      const updates: Partial<PlantRecord> = {};
      if (taskType === 'water') updates.watered = true;
      if (taskType === 'fertilize') updates.fertilized = true;
      updateRecord(todayRecord.id, updates);
    } else {
      addRecord({
        plantId,
        date: today,
        watered: taskType === 'water',
        fertilized: taskType === 'fertilize',
        leafStatus: '',
        height: 0,
        notes: '',
      });
    }
  },
}));
