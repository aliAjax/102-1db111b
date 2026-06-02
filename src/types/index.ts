export interface Plant {
  id: string;
  name: string;
  species: string;
  location: string;
  notes: string;
  createdAt: string;
  wateringInterval: number;
  fertilizingInterval: number;
  carePlan?: CarePlan;
}

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonalInterval {
  spring: number;
  summer: number;
  autumn: number;
  winter: number;
}

export interface CarePlan {
  wateringSchedule: SeasonalInterval;
  fertilizingSchedule: SeasonalInterval;
}

export interface CareSkip {
  id: string;
  plantId: string;
  type: 'water' | 'fertilize';
  scheduledDate: string;
  skippedAt: string;
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
  careSkips?: CareSkip[];
}

export interface GrowthPhoto {
  id: string;
  plantId: string;
  date: string;
  photoDataUrl: string;
  note: string;
  createdAt: string;
}

export interface NextCareInfo {
  type: 'water' | 'fertilize';
  nextDate: string;
  daysUntil: number;
  isOverdue: boolean;
  lastCareDate: string | null;
  currentInterval: number;
  currentSeason: Season;
}

export const SEASON_LABELS: Record<Season, string> = {
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

export const LEAF_STATUS_LABELS: { [key in LeafStatus]: string } = {
  healthy: '健康',
  yellowing: '发黄',
  wilting: '萎蔫',
  new_growth: '新芽',
  '': '未记录',
};
