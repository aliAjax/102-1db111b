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

export interface Snapshot {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  data: AppData;
  version: number;
}

export interface SnapshotDiff {
  plantsAdded: Plant[];
  plantsRemoved: Plant[];
  plantsModified: Plant[];
  plantsModifiedCurrent: Plant[];
  recordsAdded: PlantRecord[];
  recordsRemoved: PlantRecord[];
  recordsModified: PlantRecord[];
  recordsModifiedCurrent: PlantRecord[];
  plantCountChange: number;
  recordCountChange: number;
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
  deferredToDate?: string;
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

export type WarningType = 'yellowing_leaves' | 'no_watering' | 'stagnant_growth' | 'wilting_leaves' | 'over_caring';

export type WarningSeverity = 'low' | 'medium' | 'high';

export interface Warning {
  id: string;
  type: WarningType;
  severity: WarningSeverity;
  title: string;
  description: string;
  triggeredAt: string;
  relatedRecords: string[];
  details: WarningDetail;
}

export interface WarningDetail {
  condition: string;
  suggestion: string;
  recordCount?: number;
  daysWithoutCare?: number;
  daysWithoutGrowth?: number;
  careFrequency?: number;
}

export const WARNING_TYPE_LABELS: Record<WarningType, string> = {
  yellowing_leaves: '叶片发黄',
  no_watering: '缺水',
  stagnant_growth: '生长停滞',
  wilting_leaves: '叶片萎蔫',
  over_caring: '过度护理',
};

export const WARNING_SEVERITY_LABELS: Record<WarningSeverity, string> = {
  low: '轻微',
  medium: '中等',
  high: '严重',
};
