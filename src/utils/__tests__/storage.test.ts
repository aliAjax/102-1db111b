import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  loadData,
  saveData,
  addPlant,
  updatePlant,
  deletePlant,
  addRecord,
  updateRecord,
  deleteRecord,
  getRecordsByPlantId,
  getRecordsByDate,
  getPlantById,
  getAllPlants,
  addCareSkip,
  getCareSkipsByPlantId,
  getAllCareSkips,
  deleteCareSkipsByPlantId,
} from '../localData';
import {
  exportData,
  validateImportData,
  getImportPreview,
  mergeImportData,
} from '../importExport';
import {
  getCurrentSeason,
  getCareInterval,
} from '../carePlan';
import {
  createSnapshot,
  loadSnapshots,
  deleteSnapshot,
  calculateSnapshotDiff,
  restoreSnapshot,
} from '../snapshots';
import { getTodayString } from '../common';
import {
  addGrowthPhoto,
  getGrowthPhotosByPlantId,
  deleteGrowthPhoto,
  deleteGrowthPhotosByPlantId,
} from '../photoStorage';
import type { Plant, AppData } from '../../types';
import { setMockDate, resetMockDate, createMockPlant, createMockRecord } from '../../test/testUtils';

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    resetMockDate();
  });

  describe('localStorage 基础操作', () => {
    it('loadData 返回默认空数据', () => {
      const data = loadData();
      expect(data).toEqual({ plants: [], records: [], careSkips: [] });
    });

    it('saveData 保存后 loadData 能正确读取', () => {
      const testData: AppData = {
        plants: [createMockPlant({ id: 'p1', name: '测试' })],
        records: [],
        careSkips: [],
      };
      saveData(testData);
      const loaded = loadData();
      expect(loaded.plants).toHaveLength(1);
      expect(loaded.plants[0].name).toBe('测试');
    });

    it('loadData 兼容缺少 careSkips 的旧数据', () => {
      const oldData = {
        plants: [],
        records: [],
      };
      localStorage.setItem('plant_tracker_data', JSON.stringify(oldData));
      const data = loadData();
      expect(data.careSkips).toEqual([]);
    });

    it('loadData 在 localStorage 损坏时返回默认数据', () => {
      localStorage.setItem('plant_tracker_data', 'invalid json');
      const data = loadData();
      expect(data).toEqual({ plants: [], records: [], careSkips: [] });
    });
  });

  describe('植物 CRUD', () => {
    it('addPlant 创建新植物并保存', () => {
      setMockDate('2025-06-15');
      const plant = addPlant({
        name: '绿萝',
        species: 'Epipremnum aureum',
        location: '客厅',
        notes: '喜阴',
        wateringInterval: 5,
        fertilizingInterval: 20,
      });
      expect(plant.id).toBeDefined();
      expect(plant.createdAt).toBe('2025-06-15');
      expect(plant.name).toBe('绿萝');
      expect(plant.wateringInterval).toBe(5);

      const loaded = loadData();
      expect(loaded.plants).toHaveLength(1);
    });

    it('addPlant 使用默认间隔值', () => {
      const plant = addPlant({
        name: '绿萝',
        species: 'Epipremnum aureum',
        location: '客厅',
        notes: '',
      });
      expect(plant.wateringInterval).toBe(7);
      expect(plant.fertilizingInterval).toBe(30);
    });

    it('getAllPlants 返回所有植物', () => {
      addPlant({ name: '植物1', species: 's1', location: 'l1', notes: '' });
      addPlant({ name: '植物2', species: 's2', location: 'l2', notes: '' });
      const plants = getAllPlants();
      expect(plants).toHaveLength(2);
    });

    it('getPlantById 通过 ID 查找植物', () => {
      const created = addPlant({ name: '查找测试', species: 's', location: 'l', notes: '' });
      const found = getPlantById(created.id);
      expect(found?.name).toBe('查找测试');
    });

    it('getPlantById 找不到返回 undefined', () => {
      const found = getPlantById('nonexistent');
      expect(found).toBeUndefined();
    });

    it('updatePlant 更新植物信息', () => {
      const created = addPlant({ name: '旧名称', species: 's', location: 'l', notes: '' });
      const updated = updatePlant(created.id, { name: '新名称', notes: '更新了' });
      expect(updated?.name).toBe('新名称');
      expect(updated?.notes).toBe('更新了');

      const found = getPlantById(created.id);
      expect(found?.name).toBe('新名称');
    });

    it('updatePlant 不存在的 ID 返回 null', () => {
      const result = updatePlant('nonexistent', { name: 'test' });
      expect(result).toBeNull();
    });

    it('deletePlant 删除植物及相关记录', () => {
      const plant1 = addPlant({ name: '植物1', species: 's', location: 'l', notes: '' });
      const plant2 = addPlant({ name: '植物2', species: 's', location: 'l', notes: '' });
      
      addRecord({ plantId: plant1.id, date: '2025-06-01', watered: true, fertilized: false, leafStatus: '', height: 0, notes: '' });
      addRecord({ plantId: plant2.id, date: '2025-06-01', watered: true, fertilized: false, leafStatus: '', height: 0, notes: '' });

      deletePlant(plant1.id);

      const plants = getAllPlants();
      expect(plants).toHaveLength(1);
      expect(plants[0].id).toBe(plant2.id);

      const records = getRecordsByPlantId(plant1.id);
      expect(records).toHaveLength(0);
    });
  });

  describe('记录 CRUD', () => {
    let testPlant: Plant;

    beforeEach(() => {
      testPlant = addPlant({ name: '测试植物', species: 's', location: 'l', notes: '' });
    });

    it('addRecord 创建新记录', () => {
      const record = addRecord({
        plantId: testPlant.id,
        date: '2025-06-15',
        watered: true,
        fertilized: false,
        leafStatus: 'healthy',
        height: 10,
        notes: '状态良好',
      });
      expect(record.id).toBeDefined();
      expect(record.plantId).toBe(testPlant.id);
      expect(record.watered).toBe(true);
    });

    it('getRecordsByPlantId 返回植物的所有记录，按日期倒序', () => {
      addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-01' }));
      addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-15' }));
      addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-10' }));

      const records = getRecordsByPlantId(testPlant.id);
      expect(records).toHaveLength(3);
      expect(records[0].date).toBe('2025-06-15');
      expect(records[2].date).toBe('2025-06-01');
    });

    it('getRecordsByDate 按日期过滤记录', () => {
      addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-15' }));
      addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-10' }));

      const records = getRecordsByDate('2025-06-15');
      expect(records).toHaveLength(1);
      expect(records[0].date).toBe('2025-06-15');
    });

    it('getRecordsByDate 可同时按植物 ID 过滤', () => {
      const plant2 = addPlant({ name: '植物2', species: 's', location: 'l', notes: '' });
      addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-15' }));
      addRecord(createMockRecord({ plantId: plant2.id, date: '2025-06-15' }));

      const records = getRecordsByDate('2025-06-15', testPlant.id);
      expect(records).toHaveLength(1);
    });

    it('updateRecord 更新记录', () => {
      const record = addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-15', notes: '旧笔记' }));
      const updated = updateRecord(record.id, { notes: '新笔记', height: 15 });
      expect(updated?.notes).toBe('新笔记');
      expect(updated?.height).toBe(15);
    });

    it('updateRecord 不存在的 ID 返回 null', () => {
      const result = updateRecord('nonexistent', { notes: 'test' });
      expect(result).toBeNull();
    });

    it('deleteRecord 删除记录', () => {
      const record = addRecord(createMockRecord({ plantId: testPlant.id, date: '2025-06-15' }));
      deleteRecord(record.id);
      const records = getRecordsByPlantId(testPlant.id);
      expect(records).toHaveLength(0);
    });
  });

  describe('日期和季节', () => {
    it('getTodayString 返回 YYYY-MM-DD 格式', () => {
      setMockDate('2025-06-15');
      expect(getTodayString()).toBe('2025-06-15');
    });

    it('getCurrentSeason 正确判断季节', () => {
      setMockDate('2025-03-15');
      expect(getCurrentSeason()).toBe('spring');

      setMockDate('2025-06-15');
      expect(getCurrentSeason()).toBe('summer');

      setMockDate('2025-09-15');
      expect(getCurrentSeason()).toBe('autumn');

      setMockDate('2025-12-15');
      expect(getCurrentSeason()).toBe('winter');

      setMockDate('2025-01-15');
      expect(getCurrentSeason()).toBe('winter');
    });

    it('getCareInterval 使用默认间隔', () => {
      const plant = createMockPlant();
      expect(getCareInterval(plant, 'water')).toBe(7);
      expect(getCareInterval(plant, 'fertilize')).toBe(30);
    });

    it('getCareInterval 使用 carePlan 的季节间隔', () => {
      const plant = createMockPlant({
        carePlan: {
          wateringSchedule: { spring: 5, summer: 3, autumn: 6, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 25, winter: 30 },
        },
      });
      setMockDate('2025-06-15');
      expect(getCareInterval(plant, 'water')).toBe(3);
      expect(getCareInterval(plant, 'fertilize')).toBe(15);
    });

    it('getCareInterval 季节间隔为 0 时回退到默认值', () => {
      const plant = createMockPlant({
        carePlan: {
          wateringSchedule: { spring: 5, summer: 0, autumn: 6, winter: 10 },
          fertilizingSchedule: { spring: 20, summer: 15, autumn: 25, winter: 30 },
        },
      });
      setMockDate('2025-06-15');
      expect(getCareInterval(plant, 'water')).toBe(7);
    });
  });

  describe('导入导出', () => {
    beforeEach(() => {
      const plant = addPlant({ name: '本地植物', species: 's', location: 'l', notes: '' });
      addRecord(createMockRecord({ plantId: plant.id, date: '2025-06-01', watered: true }));
    });

    it('exportData 导出 JSON 字符串', () => {
      const data = exportData();
      const parsed = JSON.parse(data);
      expect(parsed.plants).toHaveLength(1);
      expect(parsed.records).toHaveLength(1);
    });

    describe('validateImportData', () => {
      it('验证有效的导入数据', () => {
        const importData: AppData = {
          plants: [createMockPlant({ id: 'import-1', name: '导入植物' })],
          records: [createMockRecord({ id: 'rec-1', plantId: 'import-1', date: '2025-06-01' })],
          careSkips: [],
        };
        const result = validateImportData(JSON.stringify(importData));
        expect(result.valid).toBe(true);
        expect(result.data?.plants).toHaveLength(1);
      });

      it('拒绝无效 JSON', () => {
        const result = validateImportData('not valid json');
        expect(result.valid).toBe(false);
        expect(result.error).toContain('JSON 格式');
      });

      it('拒绝缺少 plants 数组的数据', () => {
        const invalidData = { records: [] };
        const result = validateImportData(JSON.stringify(invalidData));
        expect(result.valid).toBe(false);
        expect(result.error).toContain('plants');
      });

      it('拒绝缺少 records 数组的数据', () => {
        const invalidData = { plants: [] };
        const result = validateImportData(JSON.stringify(invalidData));
        expect(result.valid).toBe(false);
        expect(result.error).toContain('records');
      });

      it('拒绝植物缺少必填字段', () => {
        const invalidData = {
          plants: [{ name: '缺 id 的植物' }],
          records: [],
        };
        const result = validateImportData(JSON.stringify(invalidData));
        expect(result.valid).toBe(false);
        expect(result.error).toContain('id');
      });

      it('拒绝记录缺少必填字段', () => {
        const invalidData = {
          plants: [createMockPlant({ id: 'p1' })],
          records: [{ plantId: 'p1' }],
        };
        const result = validateImportData(JSON.stringify(invalidData));
        expect(result.valid).toBe(false);
        expect(result.error).toContain('id');
      });
    });

    describe('getImportPreview', () => {
      it('正确区分新增和已存在的数据', () => {
        const localPlant = getAllPlants()[0];
        const localRecord = getRecordsByPlantId(localPlant.id)[0];

        const importData: AppData = {
          plants: [
            localPlant,
            createMockPlant({ id: 'new-plant', name: '新植物' }),
          ],
          records: [
            localRecord,
            createMockRecord({ id: 'new-rec', plantId: 'new-plant', date: '2025-06-15' }),
          ],
          careSkips: [],
        };

        const preview = getImportPreview(importData);
        expect(preview.existingPlants).toHaveLength(1);
        expect(preview.newPlants).toHaveLength(1);
        expect(preview.existingRecords).toHaveLength(1);
        expect(preview.newRecords).toHaveLength(1);
      });
    });

    describe('mergeImportData', () => {
      it('非覆盖模式只添加新数据', () => {
        const localPlant = getAllPlants()[0];
        const importData: AppData = {
          plants: [
            { ...localPlant, name: '被修改的名称' },
            createMockPlant({ id: 'new-plant', name: '新植物' }),
          ],
          records: [],
          careSkips: [],
        };

        mergeImportData(importData, false);

        const plants = getAllPlants();
        expect(plants).toHaveLength(2);
        expect(plants.find(p => p.id === localPlant.id)?.name).toBe(localPlant.name);
        expect(plants.find(p => p.id === 'new-plant')).toBeDefined();
      });

      it('覆盖模式替换已存在的数据', () => {
        const localPlant = getAllPlants()[0];
        const importData: AppData = {
          plants: [
            { ...localPlant, name: '被修改的名称' },
          ],
          records: [],
          careSkips: [],
        };

        mergeImportData(importData, true);

        const plants = getAllPlants();
        expect(plants.find(p => p.id === localPlant.id)?.name).toBe('被修改的名称');
      });
    });
  });

  describe('CareSkip', () => {
    let testPlant: Plant;

    beforeEach(() => {
      testPlant = addPlant({ name: '测试植物', species: 's', location: 'l', notes: '' });
    });

    it('addCareSkip 添加跳过记录', () => {
      const skip = addCareSkip({
        plantId: testPlant.id,
        type: 'water',
        scheduledDate: '2025-06-15',
        skippedAt: '2025-06-15',
      });
      expect(skip.id).toBeDefined();
      expect(skip.plantId).toBe(testPlant.id);
    });

    it('getCareSkipsByPlantId 返回植物的跳过记录', () => {
      addCareSkip({ plantId: testPlant.id, type: 'water', scheduledDate: '2025-06-15', skippedAt: '2025-06-15' });
      const skips = getCareSkipsByPlantId(testPlant.id);
      expect(skips).toHaveLength(1);
    });

    it('getAllCareSkips 返回所有跳过记录', () => {
      const plant2 = addPlant({ name: '植物2', species: 's', location: 'l', notes: '' });
      addCareSkip({ plantId: testPlant.id, type: 'water', scheduledDate: '2025-06-15', skippedAt: '2025-06-15' });
      addCareSkip({ plantId: plant2.id, type: 'fertilize', scheduledDate: '2025-06-15', skippedAt: '2025-06-15' });
      const skips = getAllCareSkips();
      expect(skips).toHaveLength(2);
    });

    it('deleteCareSkipsByPlantId 删除植物的所有跳过记录', () => {
      addCareSkip({ plantId: testPlant.id, type: 'water', scheduledDate: '2025-06-15', skippedAt: '2025-06-15' });
      addCareSkip({ plantId: testPlant.id, type: 'fertilize', scheduledDate: '2025-06-15', skippedAt: '2025-06-15' });
      deleteCareSkipsByPlantId(testPlant.id);
      const skips = getCareSkipsByPlantId(testPlant.id);
      expect(skips).toHaveLength(0);
    });
  });

  describe('快照功能', () => {
    beforeEach(() => {
      addPlant({ name: '快照植物', species: 's', location: 'l', notes: '' });
    });

    it('createSnapshot 创建快照', () => {
      setMockDate('2025-06-15');
      const snapshot = createSnapshot('测试快照', '快照描述');
      expect(snapshot.id).toBeDefined();
      expect(snapshot.name).toBe('测试快照');
      expect(snapshot.createdAt).toBe('2025-06-15');
      expect(snapshot.data.plants).toHaveLength(1);
    });

    it('loadSnapshots 加载所有快照，按时间倒序', () => {
      setMockDate('2025-06-10');
      createSnapshot('快照1', '');
      setMockDate('2025-06-15');
      createSnapshot('快照2', '');

      const snapshots = loadSnapshots();
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0].name).toBe('快照2');
      expect(snapshots[1].name).toBe('快照1');
    });

    it('deleteSnapshot 删除快照', () => {
      const snapshot = createSnapshot('待删除', '');
      deleteSnapshot(snapshot.id);
      const snapshots = loadSnapshots();
      expect(snapshots).toHaveLength(0);
    });

    it('calculateSnapshotDiff 计算差异', () => {
      const snapshot = createSnapshot('基线', '');
      addPlant({ name: '新增植物', species: 's', location: 'l', notes: '' });

      const diff = calculateSnapshotDiff(snapshot);
      expect(diff.plantsAdded).toHaveLength(1);
      expect(diff.plantsRemoved).toHaveLength(0);
      expect(diff.plantCountChange).toBe(-1);
    });

    it('restoreSnapshot 恢复快照数据', () => {
      const snapshot = createSnapshot('基线', '');
      const originalPlants = snapshot.data.plants.length;
      addPlant({ name: '临时植物', species: 's', location: 'l', notes: '' });
      expect(getAllPlants()).toHaveLength(originalPlants + 1);

      restoreSnapshot(snapshot);
      expect(getAllPlants()).toHaveLength(originalPlants);
    });
  });

  describe('IndexedDB 照片存储', () => {
    let testPlant: Plant;

    beforeEach(() => {
      testPlant = addPlant({ name: '测试植物', species: 's', location: 'l', notes: '' });
    });

    it('addGrowthPhoto 添加照片', async () => {
      const photo = await addGrowthPhoto({
        plantId: testPlant.id,
        date: '2025-06-15',
        photoDataUrl: 'data:image/jpeg;base64,test',
        note: '测试照片',
      });
      expect(photo.id).toBeDefined();
      expect(photo.plantId).toBe(testPlant.id);
    });

    it('getGrowthPhotosByPlantId 获取植物照片', async () => {
      await addGrowthPhoto({ plantId: testPlant.id, date: '2025-06-10', photoDataUrl: 'url1', note: '' });
      await addGrowthPhoto({ plantId: testPlant.id, date: '2025-06-15', photoDataUrl: 'url2', note: '' });

      const photos = await getGrowthPhotosByPlantId(testPlant.id);
      expect(photos).toHaveLength(2);
      expect(photos[0].date).toBe('2025-06-15');
    });

    it('deleteGrowthPhoto 删除照片', async () => {
      const photo = await addGrowthPhoto({ plantId: testPlant.id, date: '2025-06-15', photoDataUrl: 'url', note: '' });
      await deleteGrowthPhoto(photo.id);
      const photos = await getGrowthPhotosByPlantId(testPlant.id);
      expect(photos).toHaveLength(0);
    });

    it('deleteGrowthPhotosByPlantId 删除植物所有照片', async () => {
      await addGrowthPhoto({ plantId: testPlant.id, date: '2025-06-10', photoDataUrl: 'url1', note: '' });
      await addGrowthPhoto({ plantId: testPlant.id, date: '2025-06-15', photoDataUrl: 'url2', note: '' });
      await deleteGrowthPhotosByPlantId(testPlant.id);
      const photos = await getGrowthPhotosByPlantId(testPlant.id);
      expect(photos).toHaveLength(0);
    });
  });
});
