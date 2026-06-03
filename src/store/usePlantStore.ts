import { create } from 'zustand';
import type { Plant, PlantRecord, GrowthPhoto, CareSkip, NextCareInfo, Warning } from '../types';
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
  addGrowthPhoto as storageAddGrowthPhoto,
  getGrowthPhotosByPlantId as storageGetGrowthPhotos,
  deleteGrowthPhoto as storageDeleteGrowthPhoto,
  deleteGrowthPhotosByPlantId as storageDeleteGrowthPhotosByPlantId,
  addCareSkip as storageAddCareSkip,
  deleteCareSkipsByPlantId as storageDeleteCareSkipsByPlantId,
  calculateNextCare,
} from '../utils/storage';
import { evaluatePlantWarnings } from '../utils/warningEngine';

export interface CareTask {
  plantId: string;
  plantName: string;
  type: 'water' | 'fertilize';
  status: 'pending' | 'completed';
  lastCareDate: string | null;
  daysSinceLastCare: number;
  nextCareInfo: NextCareInfo;
}

interface PlantStore {
  plants: Plant[];
  records: PlantRecord[];
  growthPhotos: GrowthPhoto[];
  careSkips: CareSkip[];
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
  skipCareTask: (plantId: string, taskType: 'water' | 'fertilize') => void;

  getNextCareInfo: (plantId: string) => NextCareInfo[];
  getNextCareForPlant: (plantId: string, type: 'water' | 'fertilize') => NextCareInfo;

  getPlantWarnings: (plantId: string) => Warning[];
  getAllPlantWarnings: () => Map<string, Warning[]>;

  loadGrowthPhotos: (plantId: string) => Promise<void>;
  addGrowthPhoto: (photo: Omit<GrowthPhoto, 'id' | 'createdAt'>) => Promise<GrowthPhoto>;
  deleteGrowthPhoto: (id: string, plantId: string) => Promise<void>;
}

export const usePlantStore = create<PlantStore>((set, get) => ({
  plants: [],
  records: [],
  growthPhotos: [],
  careSkips: [],
  isLoaded: false,

  loadAllData: () => {
    const data = loadData();
    set({
      plants: data.plants,
      records: data.records,
      careSkips: data.careSkips || [],
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
    storageDeleteGrowthPhotosByPlantId(id);
    storageDeleteCareSkipsByPlantId(id);
    set((state) => ({
      plants: state.plants.filter((p) => p.id !== id),
      records: state.records.filter((r) => r.plantId !== id),
      growthPhotos: state.growthPhotos.filter((p) => p.plantId !== id),
      careSkips: state.careSkips.filter((s) => s.plantId !== id),
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
    const { plants, records, careSkips } = get();
    const today = getTodayString();
    const tasks: CareTask[] = [];

    plants.forEach((plant) => {
      const plantRecords = records
        .filter((r) => r.plantId === plant.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      const todayRecord = plantRecords.find((r) => r.date === today);

      for (const type of ['water', 'fertilize'] as const) {
        const nextInfo = calculateNextCare(plant, records, careSkips, type);
        const isCompleted = type === 'water' ? !!todayRecord?.watered : !!todayRecord?.fertilized;
        const isPending = nextInfo.isOverdue || nextInfo.daysUntil <= 0;

        if (isPending || isCompleted) {
          tasks.push({
            plantId: plant.id,
            plantName: plant.name,
            type,
            status: isCompleted ? 'completed' : 'pending',
            lastCareDate: nextInfo.lastCareDate,
            daysSinceLastCare: nextInfo.lastCareDate
              ? Math.floor((new Date(today).getTime() - new Date(nextInfo.lastCareDate).getTime()) / (1000 * 60 * 60 * 24))
              : -1,
            nextCareInfo: nextInfo,
          });
        }
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

  skipCareTask: (plantId: string, taskType: 'water' | 'fertilize') => {
    const nextInfo = get().getNextCareForPlant(plantId, taskType);
    const scheduledDate = nextInfo.isOverdue ? getTodayString() : nextInfo.nextDate;

    const newSkip = storageAddCareSkip({
      plantId,
      type: taskType,
      scheduledDate,
      skippedAt: getTodayString(),
    });

    set((state) => ({
      careSkips: [...state.careSkips, newSkip],
    }));
  },

  getNextCareInfo: (plantId: string) => {
    const { plants, records, careSkips } = get();
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return [];
    return [
      calculateNextCare(plant, records, careSkips, 'water'),
      calculateNextCare(plant, records, careSkips, 'fertilize'),
    ];
  },

  getNextCareForPlant: (plantId: string, type: 'water' | 'fertilize') => {
    const { plants, records, careSkips } = get();
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) {
      return {
        type,
        nextDate: '',
        daysUntil: 0,
        isOverdue: false,
        lastCareDate: null,
        currentInterval: type === 'water' ? 7 : 30,
        currentSeason: 'spring' as const,
      };
    }
    return calculateNextCare(plant, records, careSkips, type);
  },

  getPlantWarnings: (plantId: string) => {
    const { plants, records } = get();
    const plant = plants.find((p) => p.id === plantId);
    if (!plant) return [];
    return evaluatePlantWarnings(plant, records);
  },

  getAllPlantWarnings: () => {
    const { plants, records } = get();
    const warningsMap = new Map<string, Warning[]>();
    plants.forEach((plant) => {
      const warnings = evaluatePlantWarnings(plant, records);
      if (warnings.length > 0) {
        warningsMap.set(plant.id, warnings);
      }
    });
    return warningsMap;
  },

  loadGrowthPhotos: async (plantId: string) => {
    const photos = await storageGetGrowthPhotos(plantId);
    set((state) => ({
      growthPhotos: [
        ...state.growthPhotos.filter((p) => p.plantId !== plantId),
        ...photos,
      ],
    }));
  },

  addGrowthPhoto: async (photo: Omit<GrowthPhoto, 'id' | 'createdAt'>) => {
    const newPhoto = await storageAddGrowthPhoto(photo);
    set((state) => ({
      growthPhotos: [...state.growthPhotos, newPhoto],
    }));
    return newPhoto;
  },

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  deleteGrowthPhoto: async (id: string, plantId: string) => {
    await storageDeleteGrowthPhoto(id);
    set((state) => ({
      growthPhotos: state.growthPhotos.filter((p) => p.id !== id),
    }));
  },
}));
