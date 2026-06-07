import type { Plant, PlantRecord, AppData, CareSkip } from '../types';
import { loadData, saveData } from './localData';

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
