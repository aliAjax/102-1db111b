export interface Plant {
  id: string;
  name: string;
  species: string;
  location: string;
  notes: string;
  createdAt: string;
  wateringInterval: number;
  fertilizingInterval: number;
}

export type LeafStatus = 'healthy' | 'yellowing' | 'wilting' | 'new_growth' | '';

export interface PlantRecord {
  id: string;
  plantId: string;
  date: string;
  watered: boolean;
  fertilized: boolean;
  leafStatus: LeafStatus;
  height: number;
  notes: string;
}

export interface AppData {
  plants: Plant[];
  records: PlantRecord[];
}

export interface GrowthPhoto {
  id: string;
  plantId: string;
  date: string;
  photoDataUrl: string;
  note: string;
  createdAt: string;
}

export const LEAF_STATUS_LABELS: { [key in LeafStatus]: string } = {
  healthy: '健康',
  yellowing: '发黄',
  wilting: '萎蔫',
  new_growth: '新芽',
  '': '未记录',
};
