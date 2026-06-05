import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, GitCompare, Calendar, Droplets, AlertTriangle, TrendingUp, Sprout, CheckCircle2, XCircle, Info, SlidersHorizontal, ArrowUpDown, Eye, EyeOff, ClipboardList } from 'lucide-react';
import { usePlantStore } from '../store/usePlantStore';
import type { Plant } from '../types';

interface PlantCompareData {
  plantId: string;
  plantName: string;
  plant: Plant;
  totalRecords: number;
  heightRecords: number;
  recordDensity: number;
  hasSparseData: boolean;
  hasNoData: boolean;

  heightStart: number | null;
  heightEnd: number | null;
  heightGrowth: number | null;
  heightGrowthRate: number | null;

  waterCount: number;
  waterFrequency: number | null;

  leafAbnormalCount: number;
  leafHealthyCount: number;
  leafAbnormalRate: number | null;

  stabilityScore: number;
  stabilityLevel: 'excellent' | 'good' | 'fair' | 'poor' | 'insufficient';
  dataQualityNote: string;
}

type DimensionKey = 'growthSpeed' | 'wateringRegularity' | 'leafAbnormalRate' | 'recordCompleteness';

type SortDimension = DimensionKey | 'stability';

const ALL_DIMENSIONS: DimensionKey[] = ['growthSpeed', 'wateringRegularity', 'leafAbnormalRate', 'recordCompleteness'];

const DIMENSION_LABELS: Record<DimensionKey, string> = {
  growthSpeed: '生长速度',
  wateringRegularity: '浇水规律',
  leafAbnormalRate: '叶片异常率',
  recordCompleteness: '记录完整度',
};

const SORT_OPTIONS: { key: SortDimension; label: string }[] = [
  { key: 'stability', label: '综合稳定性' },
  { key: 'growthSpeed', label: '生长速度' },
  { key: 'wateringRegularity', label: '浇水规律' },
  { key: 'leafAbnormalRate', label: '叶片异常率' },
  { key: 'recordCompleteness', label: '记录完整度' },
];

function getDimensionSortValue(data: PlantCompareData, dimension: SortDimension): number {
  if (data.hasNoData) return -Infinity;

  switch (dimension) {
    case 'stability':
      return data.stabilityScore;
    case 'growthSpeed':
      return data.heightGrowthRate ?? -Infinity;
    case 'wateringRegularity': {
      if (data.waterFrequency === null) return -Infinity;
      const expectedFreq = 1 / (data.plant.wateringInterval || 7);
      if (expectedFreq === 0) return -Infinity;
      const ratio = data.waterFrequency / expectedFreq;
      return 1 - Math.min(Math.abs(1 - ratio), 1);
    }
    case 'leafAbnormalRate':
      return data.leafAbnormalRate !== null ? 1 - data.leafAbnormalRate : -Infinity;
    case 'recordCompleteness':
      return Math.min(data.recordDensity, 1);
  }
}

function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(0, 0, 0, 0);
  return Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getDateRangeOptions(): { label: string; value: number }[] {
  return [
    { label: '最近7天', value: 7 },
    { label: '最近30天', value: 30 },
    { label: '最近90天', value: 90 },
    { label: '今年', value: 365 },
    { label: '全部时间', value: 0 },
  ];
}

function getStartDate(days: number, earliestRecordDate: string | null, plantCreatedAt: string): string {
  if (days === 0) {
    return earliestRecordDate || plantCreatedAt;
  }
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - (days - 1));
  return formatDate(d.toISOString());
}

function calculateStabilityScore(data: Omit<PlantCompareData, 'stabilityScore' | 'stabilityLevel'>): { score: number; level: PlantCompareData['stabilityLevel'] } {
  if (data.hasNoData) {
    return { score: 0, level: 'insufficient' };
  }

  if (data.hasSparseData && data.totalRecords < 3) {
    return { score: 20, level: 'poor' };
  }

  let score = 0;
  let weightSum = 0;

  const dataQualityWeight = 25;
  if (!data.hasSparseData) {
    score += dataQualityWeight;
  } else if (data.totalRecords >= 5) {
    score += dataQualityWeight * 0.6;
  } else {
    score += dataQualityWeight * 0.3;
  }
  weightSum += dataQualityWeight;

  if (data.leafAbnormalRate !== null) {
    const leafWeight = 35;
    const abnormalRate = data.leafAbnormalRate;
    if (abnormalRate <= 0.05) {
      score += leafWeight;
    } else if (abnormalRate <= 0.15) {
      score += leafWeight * 0.8;
    } else if (abnormalRate <= 0.3) {
      score += leafWeight * 0.5;
    } else if (abnormalRate <= 0.5) {
      score += leafWeight * 0.25;
    }
    weightSum += leafWeight;
  }

  if (data.waterFrequency !== null) {
    const waterWeight = 25;
    const expectedInterval = data.plant.wateringInterval || 7;
    const expectedFrequency = 1 / expectedInterval;
    const actualFrequency = data.waterFrequency;
    const ratio = Math.min(actualFrequency / expectedFrequency, 2);

    if (ratio >= 0.8 && ratio <= 1.3) {
      score += waterWeight;
    } else if (ratio >= 0.5 && ratio <= 1.8) {
      score += waterWeight * 0.7;
    } else if (ratio >= 0.3) {
      score += waterWeight * 0.4;
    }
    weightSum += waterWeight;
  }

  if (data.heightGrowthRate !== null && data.heightRecords >= 3) {
    const heightWeight = 15;
    if (data.heightGrowthRate >= 0) {
      score += heightWeight;
    } else if (data.heightGrowthRate >= -0.1) {
      score += heightWeight * 0.5;
    }
    weightSum += heightWeight;
  }

  const finalScore = weightSum > 0 ? Math.round((score / weightSum) * 100) : 0;

  let level: PlantCompareData['stabilityLevel'];
  if (data.hasSparseData && data.totalRecords < 5) {
    level = 'insufficient';
  } else if (finalScore >= 85) {
    level = 'excellent';
  } else if (finalScore >= 70) {
    level = 'good';
  } else if (finalScore >= 50) {
    level = 'fair';
  } else {
    level = 'poor';
  }

  return { score: finalScore, level };
}

export function PlantCompare() {
  const navigate = useNavigate();
  const { plants, records, loadAllData } = usePlantStore();
  const [selectedPlantIds, setSelectedPlantIds] = useState<string[]>([]);
  const [dateRangeDays, setDateRangeDays] = useState<number>(30);
  const [hiddenDimensions, setHiddenDimensions] = useState<Set<DimensionKey>>(new Set());
  const [sortDimension, setSortDimension] = useState<SortDimension>('stability');

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (plants.length > 0 && selectedPlantIds.length === 0) {
      setSelectedPlantIds(plants.slice(0, Math.min(5, plants.length)).map(p => p.id));
    }
  }, [plants, selectedPlantIds.length]);

  const compareData = useMemo((): PlantCompareData[] => {
    const today = formatDate(new Date().toISOString());

    return selectedPlantIds.map((plantId): PlantCompareData => {
      const plant = plants.find(p => p.id === plantId)!;
      const plantRecords = records.filter(r => r.plantId === plantId);

      const plantRecordDates = plantRecords.map(r => r.date).sort();
      const earliestRecordDate = plantRecordDates.length > 0 ? plantRecordDates[0] : null;

      const startDate = getStartDate(dateRangeDays, earliestRecordDate, plant.createdAt);
      const endDate = today;
      const totalDays = getDaysBetween(startDate, endDate);

      const filteredRecords = plantRecords.filter(r => {
        const recordDate = new Date(r.date);
        return recordDate >= new Date(startDate) && recordDate <= new Date(endDate);
      }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const totalRecords = filteredRecords.length;
      const heightRecords = filteredRecords.filter(r => r.height > 0).length;

      const expectedRecords = Math.min(totalDays, 90);
      const recordDensity = totalRecords > 0 ? totalRecords / expectedRecords : 0;
      const hasSparseData = totalRecords > 0 && recordDensity < 0.3;
      const hasNoData = totalRecords === 0;

      let heightStart: number | null = null;
      let heightEnd: number | null = null;
      let heightGrowth: number | null = null;
      let heightGrowthRate: number | null = null;

      if (heightRecords >= 2) {
        const heightSorted = filteredRecords.filter(r => r.height > 0);
        heightStart = heightSorted[0].height;
        heightEnd = heightSorted[heightSorted.length - 1].height;
        heightGrowth = heightEnd - heightStart;
        const daysBetween = getDaysBetween(heightSorted[0].date, heightSorted[heightSorted.length - 1].date);
        heightGrowthRate = daysBetween > 0 ? heightGrowth / daysBetween : null;
      }

      const waterCount = filteredRecords.filter(r => r.watered).length;
      const waterFrequency = totalDays > 0 ? waterCount / totalDays : null;

      const leafAbnormalCount = filteredRecords.filter(r => r.leafStatus === 'yellowing' || r.leafStatus === 'wilting').length;
      const leafHealthyCount = filteredRecords.filter(r => r.leafStatus === 'healthy' || r.leafStatus === 'new_growth').length;
      const totalLeafRecords = leafAbnormalCount + leafHealthyCount;
      const leafAbnormalRate = totalLeafRecords > 0 ? leafAbnormalCount / totalLeafRecords : null;

      const dataQualityNotes: string[] = [];
      if (hasNoData) {
        dataQualityNotes.push('该时间范围内无任何记录');
      } else {
        if (hasSparseData) {
          dataQualityNotes.push(`记录较稀疏（${totalRecords}条/共${totalDays}天）`);
        }
        if (heightRecords === 0) {
          dataQualityNotes.push('无高度记录');
        } else if (heightRecords < 3) {
          dataQualityNotes.push(`高度记录仅${heightRecords}条，增长分析可能不准确`);
        }
        if (totalLeafRecords === 0) {
          dataQualityNotes.push('无叶片状态记录');
        }
      }

      const baseData: Omit<PlantCompareData, 'stabilityScore' | 'stabilityLevel'> = {
        plantId,
        plantName: plant.name,
        plant,
        totalRecords,
        heightRecords,
        recordDensity,
        hasSparseData,
        hasNoData,
        heightStart,
        heightEnd,
        heightGrowth,
        heightGrowthRate,
        waterCount,
        waterFrequency,
        leafAbnormalCount,
        leafHealthyCount,
        leafAbnormalRate,
        dataQualityNote: dataQualityNotes.join('；'),
      };

      const stability = calculateStabilityScore(baseData);

      return {
        ...baseData,
        stabilityScore: stability.score,
        stabilityLevel: stability.level,
      };
    }).sort((a, b) => {
      const aVal = getDimensionSortValue(a, sortDimension);
      const bVal = getDimensionSortValue(b, sortDimension);
      if (aVal === -Infinity && bVal !== -Infinity) return 1;
      if (bVal === -Infinity && aVal !== -Infinity) return -1;
      if (aVal === -Infinity && bVal === -Infinity) return b.stabilityScore - a.stabilityScore;
      if (aVal !== bVal) return bVal - aVal;
      return b.stabilityScore - a.stabilityScore;
    });
  }, [selectedPlantIds, dateRangeDays, plants, records, sortDimension]);

  const togglePlantSelection = (plantId: string) => {
    setSelectedPlantIds(prev => {
      if (prev.includes(plantId)) {
        return prev.filter(id => id !== plantId);
      } else {
        return [...prev, plantId];
      }
    });
  };

  const selectAllPlants = () => {
    setSelectedPlantIds(plants.map(p => p.id));
  };

  const clearSelection = () => {
    setSelectedPlantIds([]);
  };

  const toggleDimension = (dim: DimensionKey) => {
    setHiddenDimensions(prev => {
      const next = new Set(prev);
      if (next.has(dim)) {
        next.delete(dim);
      } else {
        next.add(dim);
      }
      return next;
    });
  };

  const getStabilityColor = (level: PlantCompareData['stabilityLevel']): string => {
    switch (level) {
      case 'excellent': return '#7D9469';
      case 'good': return '#9CAF88';
      case 'fair': return '#D4A843';
      case 'poor': return '#C46F42';
      case 'insufficient': return '#9CA3AF';
    }
  };

  const getStabilityLabel = (level: PlantCompareData['stabilityLevel']): string => {
    switch (level) {
      case 'excellent': return '养护极佳';
      case 'good': return '养护良好';
      case 'fair': return '养护一般';
      case 'poor': return '需要关注';
      case 'insufficient': return '数据不足';
    }
  };

  const getStabilityIcon = (level: PlantCompareData['stabilityLevel']) => {
    switch (level) {
      case 'excellent':
      case 'good':
        return <CheckCircle2 className="w-5 h-5" />;
      case 'fair':
        return <AlertTriangle className="w-5 h-5" />;
      case 'poor':
        return <XCircle className="w-5 h-5" />;
      case 'insufficient':
        return <Info className="w-5 h-5" />;
    }
  };

  const maxWaterCount = Math.max(...compareData.map(d => d.waterCount), 1);
  const maxGrowth = Math.max(...compareData.map(d => Math.abs(d.heightGrowth || 0)), 1);

  return (
    <div className="min-h-screen bg-cream-200">
      <header className="bg-white/60 backdrop-blur-sm border-b border-sage-100 sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-sage-600 hover:text-sage-800 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span className="hidden sm:inline">返回首页</span>
            </button>
            <h1 className="text-lg font-serif text-sage-800 flex items-center gap-2">
              <GitCompare className="w-5 h-5" />
              植物对比分析
            </h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="container py-8 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-sage-500" />
            <h2 className="text-lg font-serif text-sage-800">选择时间范围</h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {getDateRangeOptions().map(option => (
              <button
                key={option.value}
                onClick={() => setDateRangeDays(option.value)}
                className={`px-4 py-2 rounded-xl text-sm transition-colors ${
                  dateRangeDays === option.value
                    ? 'bg-sage-500 text-white'
                    : 'bg-sage-50 text-sage-600 hover:bg-sage-100'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-1">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sprout className="w-5 h-5 text-sage-500" />
              <h2 className="text-lg font-serif text-sage-800">选择对比植物</h2>
              <span className="text-sm text-sage-400">（已选 {selectedPlantIds.length} 盆）</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={selectAllPlants}
                className="text-sm text-sage-500 hover:text-sage-700 transition-colors"
              >
                全选
              </button>
              <span className="text-sage-200">|</span>
              <button
                onClick={clearSelection}
                className="text-sm text-sage-500 hover:text-sage-700 transition-colors"
              >
                清空
              </button>
            </div>
          </div>
          {plants.length === 0 ? (
            <div className="text-center py-8 text-sage-400">
              还没有添加植物，先去首页添加吧
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {plants.map(plant => {
                const isSelected = selectedPlantIds.includes(plant.id);
                return (
                  <button
                    key={plant.id}
                    onClick={() => togglePlantSelection(plant.id)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      isSelected
                        ? 'border-sage-500 bg-sage-50 shadow-sm'
                        : 'border-sage-100 bg-white hover:border-sage-200'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="w-8 h-8 bg-sage-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Sprout className={`w-4 h-4 ${isSelected ? 'text-sage-600' : 'text-sage-400'}`} />
                      </div>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-sage-500 border-sage-500' : 'border-sage-200'
                      }`}>
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </div>
                    <div className={`font-medium text-sm truncate ${isSelected ? 'text-sage-800' : 'text-sage-600'}`}>
                      {plant.name}
                    </div>
                    <div className="text-xs text-sage-400 truncate mt-0.5">
                      {plant.species || '未记录品种'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {selectedPlantIds.length > 0 && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-2">
            <div className="flex items-center gap-2 mb-4">
              <SlidersHorizontal className="w-5 h-5 text-sage-500" />
              <h2 className="text-lg font-serif text-sage-800">对比控制</h2>
            </div>
            <div className="space-y-5">
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <ArrowUpDown className="w-4 h-4 text-sage-400" />
                  <span className="text-sm font-medium text-sage-700">排序方式</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {SORT_OPTIONS.map(option => (
                    <button
                      key={option.key}
                      onClick={() => setSortDimension(option.key)}
                      className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                        sortDimension === option.key
                          ? 'bg-sage-500 text-white'
                          : 'bg-sage-50 text-sage-600 hover:bg-sage-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-4 h-4 text-sage-400" />
                  <span className="text-sm font-medium text-sage-700">显示维度</span>
                  <span className="text-xs text-sage-400">（点击切换显示/隐藏）</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_DIMENSIONS.map(dim => {
                    const isHidden = hiddenDimensions.has(dim);
                    return (
                      <button
                        key={dim}
                        onClick={() => toggleDimension(dim)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                          isHidden
                            ? 'bg-sage-50 text-sage-400 line-through'
                            : 'bg-sage-100 text-sage-700'
                        }`}
                      >
                        {isHidden ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                        {DIMENSION_LABELS[dim]}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedPlantIds.length === 0 ? (
          <div className="text-center py-20 animate-fade-in animate-stagger-2">
            <div className="w-20 h-20 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <GitCompare className="w-10 h-10 text-sage-400" />
            </div>
            <h2 className="text-xl font-serif text-sage-700 mb-2">请选择要对比的植物</h2>
            <p className="text-sage-500">从上方选择至少一盆植物开始对比分析</p>
          </div>
        ) : (
          <>
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-2">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-sage-500" />
                  <h2 className="text-lg font-serif text-sage-800">养护稳定性排名</h2>
                </div>
                {sortDimension !== 'stability' && (
                  <span className="text-xs text-sage-400 flex items-center gap-1">
                    <ArrowUpDown className="w-3 h-3" />
                    按{SORT_OPTIONS.find(o => o.key === sortDimension)?.label}排序
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {compareData.map((data, index) => (
                  <div
                    key={data.plantId}
                    className={`p-4 rounded-xl border transition-all ${
                      index === 0 && data.stabilityLevel !== 'insufficient'
                        ? 'border-sage-300 bg-gradient-to-r from-sage-50 to-white'
                        : 'border-sage-100 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        index === 0 && data.stabilityLevel !== 'insufficient'
                          ? 'bg-amber-100 text-amber-600'
                          : 'bg-sage-100 text-sage-500'
                      }`}>
                        <span className="font-bold text-sm">{index + 1}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sage-800">{data.plantName}</span>
                          {data.hasSparseData && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">
                              数据稀疏
                            </span>
                          )}
                          {data.hasNoData && (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">
                              无数据
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1.5" style={{ color: getStabilityColor(data.stabilityLevel) }}>
                            {getStabilityIcon(data.stabilityLevel)}
                            <span className="text-sm font-medium">{getStabilityLabel(data.stabilityLevel)}</span>
                          </div>
                          <span className="text-sage-300">|</span>
                          <span className="text-sm text-sage-500">
                            综合得分 <span className="font-semibold" style={{ color: getStabilityColor(data.stabilityLevel) }}>
                              {data.stabilityScore}
                            </span>
                          </span>
                        </div>
                        {data.dataQualityNote && (
                          <div className="mt-2 text-xs text-sage-400 flex items-start gap-1">
                            <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                            <span>{data.dataQualityNote}</span>
                          </div>
                        )}
                      </div>
                      <div className="w-24 h-16 relative flex-shrink-0">
                        <svg className="w-full h-full" viewBox="0 0 100 64">
                          <circle
                            cx="50"
                            cy="32"
                            r="26"
                            fill="none"
                            stroke="#F5F5F4"
                            strokeWidth="6"
                          />
                          <circle
                            cx="50"
                            cy="32"
                            r="26"
                            fill="none"
                            stroke={getStabilityColor(data.stabilityLevel)}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${(data.stabilityScore / 100) * 163} 163`}
                            transform="rotate(-90 50 32)"
                            className="transition-all duration-700"
                          />
                          <text
                            x="50"
                            y="37"
                            textAnchor="middle"
                            className="text-lg font-bold"
                            fill={getStabilityColor(data.stabilityLevel)}
                          >
                            {data.stabilityScore}
                          </text>
                        </svg>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {!hiddenDimensions.has('growthSpeed') && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-3">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-sage-500" />
                <h2 className="text-lg font-serif text-sage-800">高度增长对比</h2>
              </div>
              <div className="space-y-4">
                {compareData.map(data => (
                  <div key={data.plantId} className="flex items-center gap-4">
                    <div className="w-28 flex-shrink-0 truncate text-sm text-sage-700">
                      {data.plantName}
                    </div>
                    <div className="flex-1 h-8 bg-sage-50 rounded-full overflow-hidden flex items-center">
                      {data.heightGrowth === null ? (
                        <div className="px-4 text-sm text-sage-400">
                          {data.heightRecords === 0 ? '无高度记录' : '记录不足，无法计算'}
                        </div>
                      ) : (
                        <div
                          className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-3"
                          style={{
                            width: `${Math.max((Math.abs(data.heightGrowth) / maxGrowth) * 100, 5)}%`,
                            backgroundColor: data.heightGrowth >= 0 ? '#7D9469' : '#C46F42',
                            minWidth: '60px',
                          }}
                        >
                          <span className="text-xs text-white font-medium">
                            {data.heightGrowth >= 0 ? '+' : ''}{data.heightGrowth.toFixed(1)} cm
                          </span>
                        </div>
                      )}
                    </div>
                    {data.heightGrowth !== null && (
                      <div className="w-32 flex-shrink-0 text-right text-xs text-sage-400">
                        {data.heightStart?.toFixed(1)} → {data.heightEnd?.toFixed(1)} cm
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            )}

            {!hiddenDimensions.has('wateringRegularity') && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-4">
              <div className="flex items-center gap-2 mb-5">
                <Droplets className="w-5 h-5 text-blue-500" />
                <h2 className="text-lg font-serif text-sage-800">浇水频率对比</h2>
              </div>
              <div className="space-y-4">
                {compareData.map(data => {
                  const expectedInterval = data.plant.wateringInterval || 7;
                  const actualInterval = data.waterFrequency && data.waterFrequency > 0
                    ? (1 / data.waterFrequency).toFixed(1)
                    : null;
                  return (
                    <div key={data.plantId} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0 truncate text-sm text-sage-700">
                        {data.plantName}
                      </div>
                      <div className="flex-1 h-8 bg-sage-50 rounded-full overflow-hidden flex items-center">
                        {data.waterCount === 0 ? (
                          <div className="px-4 text-sm text-sage-400">
                            {data.hasNoData ? '无记录' : '无浇水记录'}
                          </div>
                        ) : (
                          <div
                            className="h-full bg-blue-400 rounded-full transition-all duration-700 flex items-center justify-end pr-3"
                            style={{
                              width: `${Math.max((data.waterCount / maxWaterCount) * 100, 5)}%`,
                              minWidth: '60px',
                            }}
                          >
                            <span className="text-xs text-white font-medium">{data.waterCount} 次</span>
                          </div>
                        )}
                      </div>
                      <div className="w-32 flex-shrink-0 text-right">
                        {actualInterval ? (
                          <div>
                            <span className={`text-sm font-medium ${
                              Math.abs(parseFloat(actualInterval) - expectedInterval) <= 1
                                ? 'text-sage-600'
                                : 'text-amber-500'
                            }`}>
                              约 {actualInterval} 天/次
                            </span>
                            <div className="text-xs text-sage-400">
                              预期 {expectedInterval} 天
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-sage-400">无法计算</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {!hiddenDimensions.has('leafAbnormalRate') && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-5">
              <div className="flex items-center gap-2 mb-5">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-serif text-sage-800">叶片异常对比</h2>
              </div>
              <div className="space-y-4">
                {compareData.map(data => {
                  const totalLeafRecords = data.leafAbnormalCount + data.leafHealthyCount;
                  return (
                    <div key={data.plantId} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0 truncate text-sm text-sage-700">
                        {data.plantName}
                      </div>
                      <div className="flex-1 h-8 bg-sage-50 rounded-full overflow-hidden flex items-center">
                        {totalLeafRecords === 0 ? (
                          <div className="px-4 text-sm text-sage-400">
                            {data.hasNoData ? '无记录' : '无叶片状态记录'}
                          </div>
                        ) : (
                          <div className="flex h-full w-full">
                            {data.leafHealthyCount > 0 && (
                              <div
                                className="h-full bg-sage-400 transition-all duration-700 flex items-center justify-center"
                                style={{
                                  width: `${(data.leafHealthyCount / totalLeafRecords) * 100}%`,
                                }}
                              >
                                {data.leafHealthyCount > 0 && (
                                  <span className="text-xs text-white font-medium px-1">
                                    健康 {data.leafHealthyCount}
                                  </span>
                                )}
                              </div>
                            )}
                            {data.leafAbnormalCount > 0 && (
                              <div
                                className="h-full bg-amber-400 transition-all duration-700 flex items-center justify-center"
                                style={{
                                  width: `${(data.leafAbnormalCount / totalLeafRecords) * 100}%`,
                                }}
                              >
                                {data.leafAbnormalCount > 0 && (
                                  <span className="text-xs text-white font-medium px-1">
                                    异常 {data.leafAbnormalCount}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="w-32 flex-shrink-0 text-right">
                        {totalLeafRecords > 0 ? (
                          <div>
                            <span className={`text-sm font-medium ${
                              data.leafAbnormalRate !== null && data.leafAbnormalRate <= 0.1
                                ? 'text-sage-600'
                                : data.leafAbnormalRate !== null && data.leafAbnormalRate <= 0.3
                                ? 'text-amber-500'
                                : 'text-terracotta-500'
                            }`}>
                              异常率 {data.leafAbnormalRate !== null ? (data.leafAbnormalRate * 100).toFixed(0) : 0}%
                            </span>
                            <div className="text-xs text-sage-400">
                              共 {totalLeafRecords} 条记录
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-sage-400">无法计算</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {!hiddenDimensions.has('recordCompleteness') && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-6">
              <div className="flex items-center gap-2 mb-5">
                <ClipboardList className="w-5 h-5 text-sage-500" />
                <h2 className="text-lg font-serif text-sage-800">记录完整度对比</h2>
              </div>
              <div className="space-y-4">
                {compareData.map(data => {
                  const completenessPercent = Math.min(Math.round(data.recordDensity * 100), 100);
                  return (
                    <div key={data.plantId} className="flex items-center gap-4">
                      <div className="w-28 flex-shrink-0 truncate text-sm text-sage-700">
                        {data.plantName}
                      </div>
                      <div className="flex-1 h-8 bg-sage-50 rounded-full overflow-hidden flex items-center">
                        {data.hasNoData ? (
                          <div className="px-4 text-sm text-sage-400">
                            无记录
                          </div>
                        ) : (
                          <div
                            className="h-full rounded-full transition-all duration-700 flex items-center justify-end pr-3"
                            style={{
                              width: `${Math.max(completenessPercent, 5)}%`,
                              backgroundColor: completenessPercent >= 70
                                ? '#7D9469'
                                : completenessPercent >= 40
                                ? '#D4A843'
                                : '#C46F42',
                              minWidth: '60px',
                            }}
                          >
                            <span className="text-xs text-white font-medium">
                              {completenessPercent}%
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="w-32 flex-shrink-0 text-right">
                        {!data.hasNoData ? (
                          <div>
                            <span className={`text-sm font-medium ${
                              completenessPercent >= 70
                                ? 'text-sage-600'
                                : completenessPercent >= 40
                                ? 'text-amber-500'
                                : 'text-terracotta-500'
                            }`}>
                              {data.totalRecords} 条记录
                            </span>
                            <div className="text-xs text-sage-400">
                              {data.hasSparseData ? '记录较稀疏' : '记录较完整'}
                            </div>
                          </div>
                        ) : (
                          <div className="text-xs text-sage-400">无法计算</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            <div className="bg-gradient-to-r from-sage-50 to-cream-100 rounded-2xl p-6 border border-sage-100 animate-fade-in animate-stagger-7">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-sage-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Info className="w-5 h-5 text-sage-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-sage-800 mb-2">稳定性评分说明</h3>
                  <div className="text-sm text-sage-600 space-y-1.5">
                    <p>• <strong>数据质量（25%）</strong>：记录频率和完整性，记录越完整得分越高</p>
                    <p>• <strong>叶片健康（35%）</strong>：叶片异常（发黄、萎蔫）出现的比例，异常越少得分越高</p>
                    <p>• <strong>浇水规律（25%）</strong>：实际浇水频率与预期间隔的吻合程度，越规律得分越高</p>
                    <p>• <strong>生长趋势（15%）</strong>：高度是否持续稳定增长，正增长得分更高</p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-sage-200">
                    <div className="flex flex-wrap gap-4 text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#7D9469' }} />
                        <span className="text-sage-600">极佳 (≥85分)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#9CAF88' }} />
                        <span className="text-sage-600">良好 (70-84分)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#D4A843' }} />
                        <span className="text-sage-600">一般 (50-69分)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#C46F42' }} />
                        <span className="text-sage-600">需关注 (&lt;50分)</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-300" />
                        <span className="text-sage-600">数据不足</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
