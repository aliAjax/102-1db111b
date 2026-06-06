import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateNextCare } from '../storage';
import type { Plant, PlantRecord, CareSkip } from '../../types';

const makePlant = (overrides: Partial<Plant> = {}): Plant => ({
  id: 'plant-1',
  name: 'Test Plant',
  species: 'Test Species',
  location: 'Indoor',
  notes: '',
  createdAt: '2025-05-01',
  wateringInterval: 7,
  fertilizingInterval: 30,
  ...overrides,
});

const makeRecord = (overrides: Partial<PlantRecord> & { date: string }): PlantRecord => ({
  id: `rec-${overrides.date}`,
  plantId: 'plant-1',
  watered: false,
  fertilized: false,
  leafStatus: '',
  height: 0,
  notes: '',
  ...overrides,
});

const makeSkip = (overrides: Partial<CareSkip> & { scheduledDate: string }): CareSkip => ({
  id: `skip-${overrides.scheduledDate}`,
  plantId: 'plant-1',
  type: 'water',
  skippedAt: overrides.scheduledDate,
  ...overrides,
});

describe('calculateNextCare', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('seasonal care plan', () => {
    it('uses summer watering interval from carePlan', () => {
      const plant = makePlant({
        createdAt: '2025-06-12',
        carePlan: {
          wateringSchedule: { spring: 5, summer: 3, autumn: 5, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 20, winter: 30 },
        },
      });
      const result = calculateNextCare(plant, [], [], 'water');
      expect(result.currentInterval).toBe(3);
      expect(result.currentSeason).toBe('summer');
      expect(result.nextDate).toBe('2025-06-15');
    });

    it('uses summer fertilizing interval from carePlan', () => {
      const plant = makePlant({
        createdAt: '2025-06-01',
        carePlan: {
          wateringSchedule: { spring: 5, summer: 3, autumn: 5, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 20, winter: 30 },
        },
      });
      const result = calculateNextCare(plant, [], [], 'fertilize');
      expect(result.currentInterval).toBe(15);
    });

    it('falls back to default interval when seasonal interval is 0', () => {
      const plant = makePlant({
        createdAt: '2025-06-12',
        carePlan: {
          wateringSchedule: { spring: 5, summer: 0, autumn: 5, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 20, winter: 30 },
        },
      });
      const result = calculateNextCare(plant, [], [], 'water');
      expect(result.currentInterval).toBe(7);
    });

    it('uses winter interval when date is in winter', () => {
      vi.setSystemTime(new Date('2025-01-15T12:00:00'));
      const plant = makePlant({
        createdAt: '2025-01-10',
        carePlan: {
          wateringSchedule: { spring: 5, summer: 3, autumn: 5, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 20, winter: 30 },
        },
      });
      const result = calculateNextCare(plant, [], [], 'water');
      expect(result.currentInterval).toBe(10);
      expect(result.currentSeason).toBe('winter');
    });
  });

  describe('no care history', () => {
    it('calculates next care from createdAt when no records exist', () => {
      const plant = makePlant({ createdAt: '2025-06-10' });
      const result = calculateNextCare(plant, [], [], 'water');
      expect(result.nextDate).toBe('2025-06-17');
      expect(result.daysUntil).toBe(2);
      expect(result.isOverdue).toBe(false);
      expect(result.lastCareDate).toBeNull();
    });

    it('returns overdue when createdAt + interval is before today', () => {
      const plant = makePlant({ createdAt: '2025-05-01' });
      const result = calculateNextCare(plant, [], [], 'water');
      expect(result.isOverdue).toBe(true);
      expect(result.daysUntil).toBeLessThan(0);
    });
  });

  describe('with care history', () => {
    it('calculates next care from last care date', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-10', watered: true }),
      ];
      const result = calculateNextCare(plant, records, [], 'water');
      expect(result.nextDate).toBe('2025-06-17');
      expect(result.daysUntil).toBe(2);
      expect(result.isOverdue).toBe(false);
      expect(result.lastCareDate).toBe('2025-06-10');
    });

    it('detects overdue when last care was too long ago', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-01', watered: true }),
      ];
      const result = calculateNextCare(plant, records, [], 'water');
      expect(result.nextDate).toBe('2025-06-08');
      expect(result.daysUntil).toBe(-7);
      expect(result.isOverdue).toBe(true);
    });

    it('uses the most recent care record when multiple exist', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-01', watered: true }),
        makeRecord({ date: '2025-06-12', watered: true }),
      ];
      const result = calculateNextCare(plant, records, [], 'water');
      expect(result.nextDate).toBe('2025-06-19');
      expect(result.lastCareDate).toBe('2025-06-12');
    });
  });

  describe('skipped care', () => {
    it('calculates from skip scheduled date when skip exists and no care after skip', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-01', watered: true }),
      ];
      const skips = [
        makeSkip({ scheduledDate: '2025-06-08', type: 'water' }),
      ];
      const result = calculateNextCare(plant, records, skips, 'water');
      expect(result.nextDate).toBe('2025-06-15');
      expect(result.daysUntil).toBe(0);
      expect(result.isOverdue).toBe(false);
    });

    it('ignores skips of different care type', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-10', watered: true }),
      ];
      const skips = [
        makeSkip({ scheduledDate: '2025-06-08', type: 'fertilize' }),
      ];
      const result = calculateNextCare(plant, records, skips, 'water');
      expect(result.nextDate).toBe('2025-06-17');
      expect(result.lastCareDate).toBe('2025-06-10');
    });
  });

  describe('deferred care', () => {
    it('uses deferredToDate as next care date', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-01', watered: true }),
      ];
      const skips = [
        makeSkip({
          scheduledDate: '2025-06-08',
          type: 'water',
          deferredToDate: '2025-06-12',
        }),
      ];
      const result = calculateNextCare(plant, records, skips, 'water');
      expect(result.nextDate).toBe('2025-06-12');
      expect(result.isOverdue).toBe(true);
    });
  });

  describe('deferred then care completed', () => {
    it('uses last care date when care was done after deferred date', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-01', watered: true }),
        makeRecord({ date: '2025-06-13', watered: true }),
      ];
      const skips = [
        makeSkip({
          scheduledDate: '2025-06-08',
          type: 'water',
          deferredToDate: '2025-06-12',
        }),
      ];
      const result = calculateNextCare(plant, records, skips, 'water');
      expect(result.nextDate).toBe('2025-06-20');
      expect(result.daysUntil).toBe(5);
      expect(result.isOverdue).toBe(false);
      expect(result.lastCareDate).toBe('2025-06-13');
    });

    it('uses last care date when care was done after simple skip', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-05-20', watered: true }),
        makeRecord({ date: '2025-06-10', watered: true }),
      ];
      const skips = [
        makeSkip({ scheduledDate: '2025-06-08', type: 'water' }),
      ];
      const result = calculateNextCare(plant, records, skips, 'water');
      expect(result.nextDate).toBe('2025-06-17');
      expect(result.lastCareDate).toBe('2025-06-10');
    });
  });
});
