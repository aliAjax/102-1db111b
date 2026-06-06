import { vi } from 'vitest';
import type { Plant, PlantRecord, AppData, CareSkip, GrowthPhoto } from '../types';
import { generateId } from '../utils/storage';

export const createMockPlant = (overrides: Partial<Plant> = {}): Plant => ({
  id: `plant-${generateId()}`,
  name: '测试植物',
  species: '绿萝',
  location: '客厅',
  notes: '',
  createdAt: '2025-01-01',
  wateringInterval: 7,
  fertilizingInterval: 30,
  ...overrides,
});

export const createMockRecord = (overrides: Partial<PlantRecord> & { date: string; plantId: string }): PlantRecord => ({
  id: `rec-${generateId()}`,
  watered: false,
  fertilized: false,
  leafStatus: '',
  height: 0,
  notes: '',
  ...overrides,
});

export const createMockCareSkip = (overrides: Partial<CareSkip> & { plantId: string; scheduledDate: string }): CareSkip => ({
  id: `skip-${generateId()}`,
  type: 'water',
  skippedAt: overrides.scheduledDate,
  ...overrides,
});

export const createMockAppData = (overrides: Partial<AppData> = {}): AppData => ({
  plants: [],
  records: [],
  careSkips: [],
  ...overrides,
});

export const createMockGrowthPhoto = (overrides: Partial<GrowthPhoto> & { plantId: string; date: string; photoDataUrl: string }): GrowthPhoto => ({
  id: `photo-${generateId()}`,
  note: '',
  createdAt: overrides.date,
  ...overrides,
});

export const setMockDate = (date: string) => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(`${date}T12:00:00`));
};

export const resetMockDate = () => {
  vi.useRealTimers();
};
