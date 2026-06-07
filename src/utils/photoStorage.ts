import type { GrowthPhoto } from '../types';
import { generateId, getTodayString } from './common';

const IDB_NAME = 'plant_tracker_photos';
const IDB_STORE = 'growth_photos';
const IDB_VERSION = 1;

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
