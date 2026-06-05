import type { Plant, PlantRecord, AppData, GrowthPhoto, CareSkip, Season, NextCareInfo, Snapshot, SnapshotDiff } from '../types';

const STORAGE_KEY = 'plant_tracker_data';
const SNAPSHOT_STORAGE_KEY = 'plant_tracker_snapshots';
const SNAPSHOT_VERSION = 1;
const IDB_NAME = 'plant_tracker_photos';
const IDB_STORE = 'growth_photos';
const IDB_VERSION = 1;

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

export const getTodayString = (): string => {
  return new Date().toISOString().split('T')[0];
};

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

export const addPlant = (plant: Omit<Plant, 'id' | 'createdAt'>): Plant => {
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

export interface ImportValidationResult {
  valid: boolean;
  error?: string;
  data?: AppData;
}

export interface ImportPreview {
  newPlants: Plant[];
  existingPlants: Plant[];
  newRecords: PlantRecord[];
  existingRecords: PlantRecord[];
  newCareSkips: CareSkip[];
  existingCareSkips: CareSkip[];
}

export const exportData = (): string => {
  const data = loadData();
  return JSON.stringify(data, null, 2);
};

export const downloadExport = (): void => {
  const dataStr = exportData();
  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  link.href = url;
  link.download = `植物日记_备份_${date}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const validateImportData = (jsonStr: string): ImportValidationResult => {
  try {
    const data = JSON.parse(jsonStr);
    if (!data || typeof data !== 'object') {
      return { valid: false, error: '文件格式不正确：根节点必须是对象' };
    }
    if (!Array.isArray(data.plants)) {
      return { valid: false, error: '文件格式不正确：缺少 plants 数组' };
    }
    if (!Array.isArray(data.records)) {
      return { valid: false, error: '文件格式不正确：缺少 records 数组' };
    }
    const requiredPlantFields = ['id', 'name', 'createdAt'];
    for (const plant of data.plants) {
      if (!plant || typeof plant !== 'object') {
        return { valid: false, error: '文件格式不正确：plants 数组中包含无效项' };
      }
      for (const field of requiredPlantFields) {
        if (!plant[field]) {
          return { valid: false, error: `文件格式不正确：植物缺少必填字段 ${field}` };
        }
      }
    }
    const requiredRecordFields = ['id', 'plantId', 'date'];
    for (const record of data.records) {
      if (!record || typeof record !== 'object') {
        return { valid: false, error: '文件格式不正确：records 数组中包含无效项' };
      }
      for (const field of requiredRecordFields) {
        if (!record[field]) {
          return { valid: false, error: `文件格式不正确：记录缺少必填字段 ${field}` };
        }
      }
    }
    return { valid: true, data: data as AppData };
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (e) {
    return { valid: false, error: '文件解析失败：不是有效的 JSON 格式' };
  }
};

export const getImportPreview = (importData: AppData): ImportPreview => {
  const currentData = loadData();
  const currentPlantIds = new Set(currentData.plants.map(p => p.id));
  const currentRecordIds = new Set(currentData.records.map(r => r.id));
  const currentSkipIds = new Set((currentData.careSkips || []).map(s => s.id));

  const newPlants = importData.plants.filter(p => !currentPlantIds.has(p.id));
  const existingPlants = importData.plants.filter(p => currentPlantIds.has(p.id));
  const newRecords = importData.records.filter(r => !currentRecordIds.has(r.id));
  const existingRecords = importData.records.filter(r => currentRecordIds.has(r.id));
  const importSkips = importData.careSkips || [];
  const newCareSkips = importSkips.filter(s => !currentSkipIds.has(s.id));
  const existingCareSkips = importSkips.filter(s => currentSkipIds.has(s.id));

  return { newPlants, existingPlants, newRecords, existingRecords, newCareSkips, existingCareSkips };
};

export const mergeImportData = (importData: AppData, overwriteExisting: boolean): void => {
  const currentData = loadData();
  
  if (overwriteExisting) {
    const importPlantIds = new Set(importData.plants.map(p => p.id));
    const importRecordIds = new Set(importData.records.map(r => r.id));
    const importSkipIds = new Set((importData.careSkips || []).map(s => s.id));
    
    const mergedPlants = [
      ...currentData.plants.filter(p => !importPlantIds.has(p.id)),
      ...importData.plants,
    ];
    
    const mergedRecords = [
      ...currentData.records.filter(r => !importRecordIds.has(r.id)),
      ...importData.records,
    ];

    const mergedCareSkips = [
      ...(currentData.careSkips || []).filter(s => !importSkipIds.has(s.id)),
      ...(importData.careSkips || []),
    ];
    
    saveData({ plants: mergedPlants, records: mergedRecords, careSkips: mergedCareSkips });
  } else {
    const currentPlantIds = new Set(currentData.plants.map(p => p.id));
    const currentRecordIds = new Set(currentData.records.map(r => r.id));
    const currentSkipIds = new Set((currentData.careSkips || []).map(s => s.id));
    
    const newPlants = importData.plants.filter(p => !currentPlantIds.has(p.id));
    const newRecords = importData.records.filter(r => !currentRecordIds.has(r.id));
    const newCareSkips = (importData.careSkips || []).filter(s => !currentSkipIds.has(s.id));
    
    saveData({
      plants: [...currentData.plants, ...newPlants],
      records: [...currentData.records, ...newRecords],
      careSkips: [...(currentData.careSkips || []), ...newCareSkips],
    });
  }
};

function openPhotoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(IDB_NAME, IDB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        const store = db.createObjectStore(IDB_STORE, { keyPath: 'id' });
        store.createIndex('plantId', 'plantId', { unique: false });
        store.createIndex('date', 'date', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export const addGrowthPhoto = async (photo: Omit<GrowthPhoto, 'id' | 'createdAt'>): Promise<GrowthPhoto> => {
  const db = await openPhotoDB();
  const newPhoto: GrowthPhoto = {
    ...photo,
    id: generateId(),
    createdAt: getTodayString(),
  };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const request = store.add(newPhoto);
    request.onsuccess = () => resolve(newPhoto);
    request.onerror = () => reject(request.error);
  });
};

export const getGrowthPhotosByPlantId = async (plantId: string): Promise<GrowthPhoto[]> => {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const index = store.index('plantId');
    const request = index.getAll(plantId);
    request.onsuccess = () => {
      const photos = (request.result as GrowthPhoto[]).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      resolve(photos);
    };
    request.onerror = () => reject(request.error);
  });
};

export const deleteGrowthPhoto = async (id: string): Promise<void> => {
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const deleteGrowthPhotosByPlantId = async (plantId: string): Promise<void> => {
  const photos = await getGrowthPhotosByPlantId(plantId);
  const db = await openPhotoDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    for (const photo of photos) {
      store.delete(photo.id);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};

export const getCurrentSeason = (): Season => {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
};

export const getCareInterval = (plant: Plant, type: 'water' | 'fertilize', season?: Season): number => {
  const currentSeason = season || getCurrentSeason();
  if (plant.carePlan) {
    const schedule = type === 'water' ? plant.carePlan.wateringSchedule : plant.carePlan.fertilizingSchedule;
    const interval = schedule[currentSeason];
    if (interval > 0) return interval;
  }
  return type === 'water' ? (plant.wateringInterval || 7) : (plant.fertilizingInterval || 30);
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

export const calculateNextCare = (
  plant: Plant,
  records: PlantRecord[],
  skips: CareSkip[],
  type: 'water' | 'fertilize'
): NextCareInfo => {
  const today = getTodayString();
  const season = getCurrentSeason();
  const interval = getCareInterval(plant, type, season);

  const plantRecords = records
    .filter((r) => r.plantId === plant.id)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const lastCareRecord = [...plantRecords]
    .reverse()
    .find((r) => type === 'water' ? r.watered : r.fertilized);
  const lastCareDate = lastCareRecord?.date || null;

  const plantSkips = skips
    .filter((s) => s.plantId === plant.id && s.type === type)
    .sort((a, b) => {
      const aDate = a.deferredToDate || a.scheduledDate;
      const bDate = b.deferredToDate || b.scheduledDate;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });

  let nextDate: string;
  let baseDate: string;

  if (plantSkips.length > 0) {
    const latestSkip = plantSkips[0];
    const latestSkipTime = new Date(latestSkip.deferredToDate || latestSkip.scheduledDate).getTime();
    const lastCareTime = lastCareDate ? new Date(lastCareDate).getTime() : 0;

    if (lastCareTime > latestSkipTime) {
      baseDate = lastCareDate!;
      const baseTime = new Date(baseDate).getTime();
      nextDate = new Date(baseTime + interval * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    } else {
      if (latestSkip.deferredToDate) {
        nextDate = latestSkip.deferredToDate;
        baseDate = latestSkip.deferredToDate;
      } else {
        baseDate = latestSkip.scheduledDate;
        const baseTime = new Date(baseDate).getTime();
        nextDate = new Date(baseTime + interval * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      }
    }
  } else {
    baseDate = lastCareDate || plant.createdAt;
    const baseTime = new Date(baseDate).getTime();
    nextDate = new Date(baseTime + interval * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  const nextTime = new Date(nextDate).getTime();
  const todayTime = new Date(today).getTime();
  const daysUntil = Math.ceil((nextTime - todayTime) / (24 * 60 * 60 * 1000));
  const isOverdue = daysUntil < 0;

  return {
    type,
    nextDate,
    daysUntil,
    isOverdue,
    lastCareDate,
    currentInterval: interval,
    currentSeason: season,
  };
};

export const compressImage = (file: File, maxWidth = 800, quality = 0.7): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas context not available'));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
};

const normalizeAppData = (data: Partial<AppData>): AppData => {
  return {
    plants: data.plants || [],
    records: data.records || [],
    careSkips: data.careSkips || [],
  };
};

export const loadSnapshots = (): Snapshot[] => {
  try {
    const stored = localStorage.getItem(SNAPSHOT_STORAGE_KEY);
    if (stored) {
      const snapshots = JSON.parse(stored);
      if (Array.isArray(snapshots)) {
        return snapshots
          .map((snapshot: unknown) => {
            const partialSnapshot = snapshot as Partial<Snapshot>;
            return {
              ...partialSnapshot,
              data: normalizeAppData((partialSnapshot.data as Partial<AppData>) || {}),
            } as Snapshot;
          })
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
    }
  } catch (e) {
    console.error('Failed to load snapshots from localStorage:', e);
  }
  return [];
};

const saveSnapshots = (snapshots: Snapshot[]): void => {
  try {
    localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(snapshots));
  } catch (e) {
    console.error('Failed to save snapshots to localStorage:', e);
  }
};

export const createSnapshot = (name: string, description: string): Snapshot => {
  const currentData = loadData();
  const newSnapshot: Snapshot = {
    id: generateId(),
    name,
    description,
    createdAt: getTodayString(),
    data: normalizeAppData(currentData),
    version: SNAPSHOT_VERSION,
  };
  
  const snapshots = loadSnapshots();
  snapshots.unshift(newSnapshot);
  saveSnapshots(snapshots);
  
  return newSnapshot;
};

export const deleteSnapshot = (id: string): void => {
  const snapshots = loadSnapshots().filter((s) => s.id !== id);
  saveSnapshots(snapshots);
};

export const calculateSnapshotDiff = (snapshot: Snapshot): SnapshotDiff => {
  const currentData = loadData();
  const snapshotData = normalizeAppData(snapshot.data);
  
  const currentPlantIds = new Set(currentData.plants.map(p => p.id));
  const snapshotPlantIds = new Set(snapshotData.plants.map(p => p.id));
  const currentRecordIds = new Set(currentData.records.map(r => r.id));
  const snapshotRecordIds = new Set(snapshotData.records.map(r => r.id));
  
  const plantsAdded = currentData.plants.filter(p => !snapshotPlantIds.has(p.id));
  const plantsRemoved = snapshotData.plants.filter(p => !currentPlantIds.has(p.id));
  
  const plantsModified = snapshotData.plants.filter(p => {
    const current = currentData.plants.find(cp => cp.id === p.id);
    if (!current) return false;
    return JSON.stringify(current) !== JSON.stringify(p);
  });

  const plantsModifiedCurrent = currentData.plants.filter(p => {
    const snapshot = snapshotData.plants.find(sp => sp.id === p.id);
    if (!snapshot) return false;
    return JSON.stringify(snapshot) !== JSON.stringify(p);
  });

  const recordsAdded = currentData.records.filter(r => !snapshotRecordIds.has(r.id));
  const recordsRemoved = snapshotData.records.filter(r => !currentRecordIds.has(r.id));

  const recordsModified = snapshotData.records.filter(r => {
    const current = currentData.records.find(cr => cr.id === r.id);
    if (!current) return false;
    return JSON.stringify(current) !== JSON.stringify(r);
  });

  const recordsModifiedCurrent = currentData.records.filter(r => {
    const snapshot = snapshotData.records.find(sr => sr.id === r.id);
    if (!snapshot) return false;
    return JSON.stringify(snapshot) !== JSON.stringify(r);
  });
  
  return {
    plantsAdded,
    plantsRemoved,
    plantsModified,
    plantsModifiedCurrent,
    recordsAdded,
    recordsRemoved,
    recordsModified,
    recordsModifiedCurrent,
    plantCountChange: snapshotData.plants.length - currentData.plants.length,
    recordCountChange: snapshotData.records.length - currentData.records.length,
  };
};

export const restoreSnapshot = (snapshot: Snapshot): void => {
  const normalizedData = normalizeAppData(snapshot.data);
  saveData(normalizedData);
};
