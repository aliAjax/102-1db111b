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
} from '../utils/storage';

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
}));
