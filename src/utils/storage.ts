import type { Plant, PlantRecord, AppData, GrowthPhoto } from '../types';

const STORAGE_KEY = 'plant_tracker_data';
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
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Failed to load data from localStorage:', e);
  }
  return { plants: [], records: [] };
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
  } catch (e) {
    return { valid: false, error: '文件解析失败：不是有效的 JSON 格式' };
  }
};

export const getImportPreview = (importData: AppData): ImportPreview => {
  const currentData = loadData();
  const currentPlantIds = new Set(currentData.plants.map(p => p.id));
  const currentRecordIds = new Set(currentData.records.map(r => r.id));

  const newPlants = importData.plants.filter(p => !currentPlantIds.has(p.id));
  const existingPlants = importData.plants.filter(p => currentPlantIds.has(p.id));
  const newRecords = importData.records.filter(r => !currentRecordIds.has(r.id));
  const existingRecords = importData.records.filter(r => currentRecordIds.has(r.id));

  return { newPlants, existingPlants, newRecords, existingRecords };
};

export const mergeImportData = (importData: AppData, overwriteExisting: boolean): void => {
  const currentData = loadData();
  
  if (overwriteExisting) {
    const importPlantIds = new Set(importData.plants.map(p => p.id));
    const importRecordIds = new Set(importData.records.map(r => r.id));
    
    const mergedPlants = [
      ...currentData.plants.filter(p => !importPlantIds.has(p.id)),
      ...importData.plants,
    ];
    
    const mergedRecords = [
      ...currentData.records.filter(r => !importRecordIds.has(r.id)),
      ...importData.records,
    ];
    
    saveData({ plants: mergedPlants, records: mergedRecords });
  } else {
    const currentPlantIds = new Set(currentData.plants.map(p => p.id));
    const currentRecordIds = new Set(currentData.records.map(r => r.id));
    
    const newPlants = importData.plants.filter(p => !currentPlantIds.has(p.id));
    const newRecords = importData.records.filter(r => !currentRecordIds.has(r.id));
    
    saveData({
      plants: [...currentData.plants, ...newPlants],
      records: [...currentData.records, ...newRecords],
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
