import type { Snapshot, SnapshotDiff, AppData, Plant, PlantRecord } from '../types';
import { loadData, saveData } from './localData';
import { generateId, getTodayString } from './common';

const SNAPSHOT_STORAGE_KEY = 'plant_tracker_snapshots';
const SNAPSHOT_VERSION = 1;

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
