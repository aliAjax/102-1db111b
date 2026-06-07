import type { Plant, PlantRecord, AppData, CareSkip } from '../types';
import { generateId, getTodayString } from './common';

const STORAGE_KEY = 'plant_tracker_data';

export const loadData = (): AppData => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored);
      if (!data.careSkips) data.careSkips = [];
      return data;
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
  }
  return { plants: [], records: [], careSkips: [] };
};

export const saveData = (data: AppData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save data to localStorage:', e);
  }
};

export const addPlant = (plant: Omit<Plant, 'id' | 'createdAt' | 'wateringInterval' | 'fertilizingInterval'> & Partial<Pick<Plant, 'wateringInterval' | 'fertilizingInterval'>>): Plant => {
  const data = loadData();
  const newPlant: Plant = {
    wateringInterval: 7,
    fertilizingInterval: 30,
    ...plant,
    id: generateId(),
    createdAt: getTodayString(),
  };
  data.plants.push(newPlant);
  saveData(data);
  return newPlant;
};

export const updatePlant = (id: string, updates: Partial<Plant>): Plant | null => {
  const data = loadData();
  const index = data.plants.findIndex((p) => p.id === id);
  if (index === -1) return null;
  data.plants[index] = { ...data.plants[index], ...updates };
  saveData(data);
  return data.plants[index];
};

export const deletePlant = (id: string): void => {
  const data = loadData();
  data.plants = data.plants.filter((p) => p.id !== id);
  data.records = data.records.filter((r) => r.plantId !== id);
  data.careSkips = (data.careSkips || []).filter((s) => s.plantId !== id);
  saveData(data);
};

export const addRecord = (record: Omit<PlantRecord, 'id'>): PlantRecord => {
  const data = loadData();
  const newRecord: PlantRecord = {
    ...record,
    id: generateId(),
  };
  data.records.push(newRecord);
  saveData(data);
  return newRecord;
};

export const updateRecord = (id: string, updates: Partial<PlantRecord>): PlantRecord | null => {
  const data = loadData();
  const index = data.records.findIndex((r) => r.id === id);
  if (index === -1) return null;
  data.records[index] = { ...data.records[index], ...updates };
  saveData(data);
  return data.records[index];
};

export const deleteRecord = (id: string): void => {
  const data = loadData();
  data.records = data.records.filter((r) => r.id !== id);
  saveData(data);
};

export const getRecordsByPlantId = (plantId: string): PlantRecord[] => {
  const data = loadData();
  return data.records
    .filter((r) => r.plantId === plantId)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getRecordsByDate = (date: string, plantId?: string): PlantRecord[] => {
  const data = loadData();
  return data.records.filter((r) => {
    const dateMatch = r.date === date;
    const plantMatch = plantId ? r.plantId === plantId : true;
    return dateMatch && plantMatch;
  });
};

export const getPlantById = (id: string): Plant | undefined => {
  const data = loadData();
  return data.plants.find((p) => p.id === id);
};

export const getAllPlants = (): Plant[] => {
  const data = loadData();
  return data.plants;
};

export const addCareSkip = (skip: Omit<CareSkip, 'id'>): CareSkip => {
  const data = loadData();
  const newSkip: CareSkip = { ...skip, id: generateId() };
  if (!data.careSkips) data.careSkips = [];
  data.careSkips.push(newSkip);
  saveData(data);
  return newSkip;
};

export const getCareSkipsByPlantId = (plantId: string): CareSkip[] => {
  const data = loadData();
  return (data.careSkips || []).filter((s) => s.plantId === plantId);
};

export const getAllCareSkips = (): CareSkip[] => {
  const data = loadData();
  return data.careSkips || [];
};

export const deleteCareSkipsByPlantId = (plantId: string): void => {
  const data = loadData();
  data.careSkips = (data.careSkips || []).filter((s) => s.plantId !== plantId);
  saveData(data);
};
