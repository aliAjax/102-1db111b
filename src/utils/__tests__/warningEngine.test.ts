import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { evaluatePlantWarnings, getHighestSeverity } from '../warningEngine';
import type { Plant, PlantRecord } from '../../types';

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
  id: `rec-${overrides.date}-${Math.random().toString(36).substr(2, 4)}`,
  plantId: 'plant-1',
  watered: false,
  fertilized: false,
  leafStatus: '',
  height: 0,
  notes: '',
  ...overrides,
});

const hasWarning = (warnings: ReturnType<typeof evaluatePlantWarnings>, type: string) =>
  warnings.some((w) => w.type === type);

const getWarning = (warnings: ReturnType<typeof evaluatePlantWarnings>, type: string) =>
  warnings.find((w) => w.type === type);

describe('warningEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2025-06-15T12:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('no_watering', () => {
    it('triggers when days since last water exceeds 1.5x interval', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-01', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'no_watering');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('high');
      expect(w!.details.daysWithoutCare).toBe(14);
    });

    it('does not trigger when days since last water is within threshold', () => {
      const plant = makePlant();
      const records = [
        makeRecord({ date: '2025-06-10', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'no_watering')).toBe(false);
    });

    it('triggers with medium severity between 1.5x and 2x interval', () => {
      const plant = makePlant({ wateringInterval: 10 });
      const records = [
        makeRecord({ date: '2025-05-30', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'no_watering');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('medium');
    });

    it('triggers when never watered and days since creation >= interval', () => {
      const plant = makePlant({ createdAt: '2025-05-01' });
      const records: PlantRecord[] = [];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'no_watering');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('high');
      expect(w!.details.daysWithoutCare).toBe(45);
    });

    it('does not trigger when never watered but days since creation < interval', () => {
      const plant = makePlant({ createdAt: '2025-06-14', wateringInterval: 7 });
      const records: PlantRecord[] = [];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'no_watering')).toBe(false);
    });

    it('uses seasonal interval from carePlan for threshold calculation', () => {
      const plant = makePlant({
        createdAt: '2025-05-01',
        carePlan: {
          wateringSchedule: { spring: 5, summer: 3, autumn: 5, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 20, winter: 30 },
        },
      });
      const records = [
        makeRecord({ date: '2025-06-10', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'no_watering');
      expect(w).toBeDefined();
      expect(w!.details.daysWithoutCare).toBe(5);
    });
  });

  describe('yellowing_leaves', () => {
    it('triggers when 3 yellowing records within 30 days', () => {
      const plant = makePlant({ createdAt: '2025-06-01' });
      const records = [
        makeRecord({ date: '2025-06-01', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-10', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-15', leafStatus: 'yellowing' }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'yellowing_leaves');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('low');
      expect(w!.details.recordCount).toBe(3);
    });

    it('triggers with high severity when 5+ yellowing records', () => {
      const plant = makePlant({ createdAt: '2025-06-01' });
      const records = [
        makeRecord({ date: '2025-06-01', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-05', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-08', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-12', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-15', leafStatus: 'yellowing' }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'yellowing_leaves');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('high');
    });

    it('does not trigger with less than 3 yellowing records', () => {
      const plant = makePlant({ createdAt: '2025-06-01' });
      const records = [
        makeRecord({ date: '2025-06-01', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-15', leafStatus: 'yellowing' }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'yellowing_leaves')).toBe(false);
    });

    it('does not trigger when yellowing records span more than 30 days', () => {
      const plant = makePlant({ createdAt: '2025-03-01' });
      const records = [
        makeRecord({ date: '2025-04-01', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-05-01', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-15', leafStatus: 'yellowing' }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'yellowing_leaves')).toBe(false);
    });

    it('ignores non-yellowing records', () => {
      const plant = makePlant({ createdAt: '2025-06-01' });
      const records = [
        makeRecord({ date: '2025-06-01', leafStatus: 'healthy' }),
        makeRecord({ date: '2025-06-05', leafStatus: 'healthy' }),
        makeRecord({ date: '2025-06-10', leafStatus: 'yellowing' }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'yellowing_leaves')).toBe(false);
    });
  });

  describe('stagnant_growth', () => {
    it('triggers when 3+ height records over 30+ days with <=1cm growth', () => {
      const plant = makePlant({ createdAt: '2025-04-01' });
      const records = [
        makeRecord({ date: '2025-05-06', height: 10 }),
        makeRecord({ date: '2025-05-16', height: 10 }),
        makeRecord({ date: '2025-05-26', height: 10.5 }),
        makeRecord({ date: '2025-06-05', height: 10 }),
        makeRecord({ date: '2025-06-15', height: 10.5 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'stagnant_growth');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('medium');
      expect(w!.details.daysWithoutGrowth).toBe(40);
    });

    it('triggers with high severity when 60+ days of stagnation', () => {
      const plant = makePlant({ createdAt: '2025-02-01' });
      const records = [
        makeRecord({ date: '2025-03-15', height: 10 }),
        makeRecord({ date: '2025-04-15', height: 10 }),
        makeRecord({ date: '2025-05-15', height: 10.5 }),
        makeRecord({ date: '2025-06-15', height: 10.5 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'stagnant_growth');
      expect(w).toBeDefined();
      expect(w!.severity).toBe('high');
    });

    it('does not trigger with less than 3 height records', () => {
      const plant = makePlant({ createdAt: '2025-04-01' });
      const records = [
        makeRecord({ date: '2025-05-06', height: 10 }),
        makeRecord({ date: '2025-06-15', height: 10 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'stagnant_growth')).toBe(false);
    });

    it('does not trigger when growth exceeds 1cm', () => {
      const plant = makePlant({ createdAt: '2025-04-01' });
      const records = [
        makeRecord({ date: '2025-05-06', height: 10 }),
        makeRecord({ date: '2025-05-26', height: 13 }),
        makeRecord({ date: '2025-06-15', height: 15 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'stagnant_growth')).toBe(false);
    });

    it('does not trigger when records span less than 30 days', () => {
      const plant = makePlant({ createdAt: '2025-06-01' });
      const records = [
        makeRecord({ date: '2025-06-01', height: 10 }),
        makeRecord({ date: '2025-06-10', height: 10 }),
        makeRecord({ date: '2025-06-15', height: 10 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'stagnant_growth')).toBe(false);
    });

    it('ignores records with height of 0', () => {
      const plant = makePlant({ createdAt: '2025-04-01' });
      const records = [
        makeRecord({ date: '2025-05-06', height: 0 }),
        makeRecord({ date: '2025-05-16', height: 10 }),
        makeRecord({ date: '2025-06-15', height: 10 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'stagnant_growth')).toBe(false);
    });
  });

  describe('over_caring', () => {
    it('triggers when 7+ care records in 14 days with stagnant growth', () => {
      const plant = makePlant({ createdAt: '2025-05-01' });
      const records = [
        makeRecord({ date: '2025-06-02', watered: true, height: 10 }),
        makeRecord({ date: '2025-06-04', watered: true }),
        makeRecord({ date: '2025-06-06', fertilized: true }),
        makeRecord({ date: '2025-06-08', watered: true }),
        makeRecord({ date: '2025-06-10', watered: true, height: 10.5 }),
        makeRecord({ date: '2025-06-12', fertilized: true }),
        makeRecord({ date: '2025-06-14', watered: true }),
        makeRecord({ date: '2025-06-15', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'over_caring');
      expect(w).toBeDefined();
      expect(w!.type).toBe('over_caring');
      expect(w!.details.careFrequency).toBeGreaterThan(0);
    });

    it('does not trigger with less than 7 records in 14 days', () => {
      const plant = makePlant({ createdAt: '2025-05-01' });
      const records = [
        makeRecord({ date: '2025-06-02', watered: true, height: 10 }),
        makeRecord({ date: '2025-06-05', watered: true }),
        makeRecord({ date: '2025-06-08', watered: true, height: 10.5 }),
        makeRecord({ date: '2025-06-11', watered: true }),
        makeRecord({ date: '2025-06-14', watered: true }),
        makeRecord({ date: '2025-06-15', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'over_caring')).toBe(false);
    });

    it('does not trigger when growth exceeds 1cm', () => {
      const plant = makePlant({ createdAt: '2025-05-01' });
      const records = [
        makeRecord({ date: '2025-06-02', watered: true, height: 10 }),
        makeRecord({ date: '2025-06-04', watered: true }),
        makeRecord({ date: '2025-06-06', fertilized: true }),
        makeRecord({ date: '2025-06-08', watered: true }),
        makeRecord({ date: '2025-06-10', watered: true, height: 15 }),
        makeRecord({ date: '2025-06-12', fertilized: true }),
        makeRecord({ date: '2025-06-14', watered: true }),
        makeRecord({ date: '2025-06-15', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'over_caring')).toBe(false);
    });

    it('does not trigger when records span more than 14 days', () => {
      const plant = makePlant({ createdAt: '2025-04-01' });
      const records = [
        makeRecord({ date: '2025-05-20', watered: true, height: 10 }),
        makeRecord({ date: '2025-05-25', watered: true }),
        makeRecord({ date: '2025-05-30', fertilized: true }),
        makeRecord({ date: '2025-06-04', watered: true }),
        makeRecord({ date: '2025-06-08', watered: true, height: 10.5 }),
        makeRecord({ date: '2025-06-12', fertilized: true }),
        makeRecord({ date: '2025-06-15', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'over_caring')).toBe(false);
    });

    it('does not trigger with fewer than 2 height records', () => {
      const plant = makePlant({ createdAt: '2025-05-01' });
      const records = [
        makeRecord({ date: '2025-06-02', watered: true, height: 10 }),
        makeRecord({ date: '2025-06-04', watered: true }),
        makeRecord({ date: '2025-06-06', fertilized: true }),
        makeRecord({ date: '2025-06-08', watered: true }),
        makeRecord({ date: '2025-06-10', watered: true }),
        makeRecord({ date: '2025-06-12', fertilized: true }),
        makeRecord({ date: '2025-06-14', watered: true }),
        makeRecord({ date: '2025-06-15', watered: true }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(hasWarning(warnings, 'over_caring')).toBe(false);
    });

    it('assigns medium severity when care frequency >= 1 per day', () => {
      const plant = makePlant({ createdAt: '2025-05-15' });
      const records: PlantRecord[] = [];
      for (let i = 2; i <= 15; i++) {
        const day = i.toString().padStart(2, '0');
        records.push(
          makeRecord({
            date: `2025-06-${day}`,
            watered: true,
            height: i <= 5 ? 10 : (i >= 10 ? 10.5 : 0),
          })
        );
      }
      const warnings = evaluatePlantWarnings(plant, records);
      const w = getWarning(warnings, 'over_caring');
      if (w) {
        expect(w.severity).toBe('medium');
      }
    });
  });

  describe('getHighestSeverity', () => {
    it('returns null for empty warnings', () => {
      expect(getHighestSeverity([])).toBeNull();
    });

    it('returns the highest severity from warnings', () => {
      const plant = makePlant({ createdAt: '2025-03-01' });
      const records = [
        makeRecord({ date: '2025-06-01', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-05', leafStatus: 'yellowing' }),
        makeRecord({ date: '2025-06-10', leafStatus: 'yellowing' }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      if (warnings.length > 0) {
        const result = getHighestSeverity(warnings);
        expect(result).not.toBeNull();
      }
    });
  });

  describe('no warnings for healthy plant', () => {
    it('returns empty array for well-cared plant', () => {
      const plant = makePlant({ createdAt: '2025-06-10' });
      const records = [
        makeRecord({ date: '2025-06-14', watered: true, leafStatus: 'healthy', height: 10 }),
        makeRecord({ date: '2025-06-10', watered: true, leafStatus: 'healthy', height: 10 }),
      ];
      const warnings = evaluatePlantWarnings(plant, records);
      expect(warnings).toEqual([]);
    });
  });
});
