import type { Plant, PlantRecord, Warning, WarningType, WarningSeverity } from '../types';
import { WARNING_TYPE_LABELS } from '../types';
import { generateId, getTodayString, getCareInterval, getCurrentSeason } from './storage';

interface WarningRule {
  type: WarningType;
  evaluate: (plant: Plant, records: PlantRecord[]) => Warning | null;
}

const getDaysDiff = (date1: string, date2: string): number => {
  const d1 = new Date(date1).getTime();
  const d2 = new Date(date2).getTime();
  return Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
};

const createWarning = (
  type: WarningType,
  severity: WarningSeverity,
  title: string,
  description: string,
  relatedRecords: string[],
  details: Warning['details']
): Warning => ({
  id: generateId(),
  type,
  severity,
  title,
  description,
  triggeredAt: getTodayString(),
  relatedRecords,
  details,
});

const rules: WarningRule[] = [
  {
    type: 'yellowing_leaves',
    evaluate: (plant, records) => {
      const sortedRecords = [...records]
        .filter((r) => r.leafStatus === 'yellowing')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (sortedRecords.length < 3) return null;

      const firstRecord = sortedRecords[sortedRecords.length - 1];
      const lastRecord = sortedRecords[0];
      const daysSpan = getDaysDiff(firstRecord.date, lastRecord.date);

      if (daysSpan <= 30 && sortedRecords.length >= 3) {
        const severity: WarningSeverity = sortedRecords.length >= 5 ? 'high' : sortedRecords.length >= 4 ? 'medium' : 'low';

        return createWarning(
          'yellowing_leaves',
          severity,
          `${WARNING_TYPE_LABELS.yellowing_leaves}预警`,
          `近${daysSpan}天内有${sortedRecords.length}次记录叶片发黄`,
          sortedRecords.map((r) => r.id),
          {
            condition: `连续${sortedRecords.length}次记录显示叶片发黄，持续${daysSpan}天`,
            suggestion: '检查是否浇水过多、光照不足或缺乏营养，建议调整养护环境',
            recordCount: sortedRecords.length,
          }
        );
      }

      return null;
    },
  },

  {
    type: 'wilting_leaves',
    evaluate: (plant, records) => {
      const sortedRecords = [...records]
        .filter((r) => r.leafStatus === 'wilting')
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      if (sortedRecords.length < 2) return null;

      const firstRecord = sortedRecords[sortedRecords.length - 1];
      const lastRecord = sortedRecords[0];
      const daysSpan = getDaysDiff(firstRecord.date, lastRecord.date);

      if (daysSpan <= 14) {
        const severity: WarningSeverity = sortedRecords.length >= 3 ? 'high' : 'medium';

        return createWarning(
          'wilting_leaves',
          severity,
          `${WARNING_TYPE_LABELS.wilting_leaves}预警`,
          `近${daysSpan}天内有${sortedRecords.length}次记录叶片萎蔫`,
          sortedRecords.map((r) => r.id),
          {
            condition: `${sortedRecords.length}次记录显示叶片萎蔫，持续${daysSpan}天`,
            suggestion: '检查土壤湿度，可能需要及时浇水或调整光照强度',
            recordCount: sortedRecords.length,
          }
        );
      }

      return null;
    },
  },

  {
    type: 'no_watering',
    evaluate: (plant, records) => {
      const sortedRecords = [...records].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const lastWateredRecord = sortedRecords.find((r) => r.watered);
      const today = getTodayString();
      const waterInterval = getCareInterval(plant, 'water', getCurrentSeason());

      if (!lastWateredRecord) {
        const daysSinceCreation = getDaysDiff(plant.createdAt, today);
        if (daysSinceCreation >= waterInterval) {
          return createWarning(
            'no_watering',
            'high',
            `${WARNING_TYPE_LABELS.no_watering}预警`,
            `自${plant.createdAt}添加以来从未浇水，已${daysSinceCreation}天`,
            [],
            {
              condition: `植物添加${daysSinceCreation}天以来从未记录浇水`,
              suggestion: '请尽快检查土壤湿度，及时为植物浇水',
              daysWithoutCare: daysSinceCreation,
            }
          );
        }
        return null;
      }

      const daysSinceLastWater = getDaysDiff(lastWateredRecord.date, today);
      const threshold = waterInterval * 1.5;

      if (daysSinceLastWater >= threshold) {
        const severity: WarningSeverity = daysSinceLastWater >= waterInterval * 2 ? 'high' : 'medium';

        return createWarning(
          'no_watering',
          severity,
          `${WARNING_TYPE_LABELS.no_watering}预警`,
          `已${daysSinceLastWater}天没有浇水（建议每${waterInterval}天浇水一次）`,
          [lastWateredRecord.id],
          {
            condition: `距离上次浇水已${daysSinceLastWater}天，超过建议间隔${waterInterval}天的${Math.round(threshold / waterInterval * 100)}%`,
            suggestion: `建议立即浇水，正常浇水频率为每${waterInterval}天一次`,
            daysWithoutCare: daysSinceLastWater,
          }
        );
      }

      return null;
    },
  },

  {
    type: 'stagnant_growth',
    evaluate: (plant, records) => {
      const heightRecords = [...records]
        .filter((r) => r.height > 0)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      if (heightRecords.length < 3) return null;

      const recentRecords = heightRecords.slice(-5);
      const heights = recentRecords.map((r) => r.height);
      const minHeight = Math.min(...heights);
      const maxHeight = Math.max(...heights);
      const growthDelta = maxHeight - minHeight;

      const firstRecord = recentRecords[0];
      const lastRecord = recentRecords[recentRecords.length - 1];
      const daysSpan = getDaysDiff(firstRecord.date, lastRecord.date);

      if (daysSpan >= 30 && growthDelta <= 1) {
        const careRecordsInPeriod = records.filter(
          (r) =>
            new Date(r.date).getTime() >= new Date(firstRecord.date).getTime() &&
            new Date(r.date).getTime() <= new Date(lastRecord.date).getTime()
        );

        const severity: WarningSeverity = daysSpan >= 60 ? 'high' : 'medium';

        return createWarning(
          'stagnant_growth',
          severity,
          `${WARNING_TYPE_LABELS.stagnant_growth}预警`,
          `近${daysSpan}天内高度几乎没有变化（仅增长${growthDelta}cm）`,
          recentRecords.map((r) => r.id),
          {
            condition: `在${daysSpan}天内，高度从${minHeight}cm增长到${maxHeight}cm，仅增长${growthDelta}cm`,
            suggestion: '检查光照、水分和养分是否充足，可能需要更换更大的花盆或补充肥料',
            recordCount: careRecordsInPeriod.length,
            daysWithoutGrowth: daysSpan,
          }
        );
      }

      return null;
    },
  },

  {
    type: 'over_caring',
    evaluate: (plant, records) => {
      const recentRecords = [...records]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 14);

      if (recentRecords.length < 7) return null;

      const firstRecord = recentRecords[recentRecords.length - 1];
      const lastRecord = recentRecords[0];
      const daysSpan = getDaysDiff(firstRecord.date, lastRecord.date);

      if (daysSpan <= 14 && recentRecords.length >= 7) {
        const heightRecords = recentRecords.filter((r) => r.height > 0);
        let growthDelta = 0;
        if (heightRecords.length >= 2) {
          const heights = heightRecords.map((r) => r.height);
          growthDelta = Math.max(...heights) - Math.min(...heights);
        }

        if (growthDelta <= 1) {
          const waterCount = recentRecords.filter((r) => r.watered).length;
          const fertilizeCount = recentRecords.filter((r) => r.fertilized).length;
          const careFrequency = recentRecords.length / Math.max(daysSpan, 1);

          const severity: WarningSeverity = careFrequency >= 1 ? 'medium' : 'low';

          return createWarning(
            'over_caring',
            severity,
            `${WARNING_TYPE_LABELS.over_caring}预警`,
            `近${daysSpan}天内护理${recentRecords.length}次，但生长停滞（仅增长${growthDelta}cm）`,
            recentRecords.map((r) => r.id),
            {
              condition: `${daysSpan}天内记录${recentRecords.length}次（浇水${waterCount}次，施肥${fertilizeCount}次），平均每${(1 / careFrequency).toFixed(1)}天护理一次，但高度仅增长${growthDelta}cm`,
              suggestion: '可能存在过度护理，建议适当减少浇水或施肥频率，观察植物状态变化',
              recordCount: recentRecords.length,
              careFrequency: parseFloat(careFrequency.toFixed(2)),
            }
          );
        }
      }

      return null;
    },
  },
];

export const evaluatePlantWarnings = (plant: Plant, records: PlantRecord[]): Warning[] => {
  const plantRecords = records.filter((r) => r.plantId === plant.id);
  const warnings: Warning[] = [];

  for (const rule of rules) {
    const warning = rule.evaluate(plant, plantRecords);
    if (warning) {
      warnings.push(warning);
    }
  }

  return warnings.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
};

export const getHighestSeverity = (warnings: Warning[]): WarningSeverity | null => {
  if (warnings.length === 0) return null;
  const severityOrder: WarningSeverity[] = ['high', 'medium', 'low'];
  for (const severity of severityOrder) {
    if (warnings.some((w) => w.severity === severity)) {
      return severity;
    }
  }
  return null;
};
