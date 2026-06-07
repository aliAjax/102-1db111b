import type { Plant, PlantRecord, CareSkip, NextCareInfo, Season } from '../types';
import { getTodayString } from './common';

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
