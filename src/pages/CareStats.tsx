import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Droplets, Leaf, Sprout, TrendingUp, BarChart3 } from 'lucide-react';
import { usePlantStore } from '../store/usePlantStore';
import { LEAF_STATUS_LABELS } from '../types';
import type { LeafStatus, PlantRecord } from '../types';

interface PlantGrowth {
  plantId: string;
  plantName: string;
  startHeight: number | null;
  endHeight: number | null;
  growth: number | null;
}

function getDaysAgo(days: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - days);
  return d;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function CareStats() {
  const navigate = useNavigate();
  const { plants, records, loadAllData } = usePlantStore();

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const stats = useMemo(() => {
    const dateList: string[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = getDaysAgo(i);
      dateList.push(
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      );
    }
    const dateSet = new Set(dateList);

    const recentRecords = records.filter((r: PlantRecord) => dateSet.has(r.date));

    const waterCount = recentRecords.filter((r: PlantRecord) => r.watered).length;
    const fertilizeCount = recentRecords.filter((r: PlantRecord) => r.fertilized).length;

    const leafDistribution: { status: LeafStatus; label: string; count: number; color: string }[] = [
      { status: 'healthy', label: LEAF_STATUS_LABELS.healthy, count: 0, color: '#7D9469' },
      { status: 'new_growth', label: LEAF_STATUS_LABELS.new_growth, count: 0, color: '#9CAF88' },
      { status: 'yellowing', label: LEAF_STATUS_LABELS.yellowing, count: 0, color: '#D4A843' },
      { status: 'wilting', label: LEAF_STATUS_LABELS.wilting, count: 0, color: '#C46F42' },
    ];

    recentRecords.forEach((r: PlantRecord) => {
      const entry = leafDistribution.find((d) => d.status === r.leafStatus);
      if (entry) entry.count++;
    });

    const leafTotal = leafDistribution.reduce((s, d) => s + d.count, 0);

    const plantGrowthMap = new Map<string, { name: string; records: PlantRecord[] }>();
    recentRecords.forEach((r: PlantRecord) => {
      if (!plantGrowthMap.has(r.plantId)) {
        const plant = plants.find((p) => p.id === r.plantId);
        plantGrowthMap.set(r.plantId, { name: plant?.name || '未知植物', records: [] });
      }
      if (r.height > 0) {
        plantGrowthMap.get(r.plantId)!.records.push(r);
      }
    });

    const growthData: PlantGrowth[] = [];
    plantGrowthMap.forEach((val, plantId) => {
      const sorted = val.records.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const startHeight = sorted.length > 0 ? sorted[0].height : null;
      const endHeight = sorted.length > 0 ? sorted[sorted.length - 1].height : null;
      const growth = startHeight !== null && endHeight !== null ? endHeight - startHeight : null;
      growthData.push({ plantId, plantName: val.name, startHeight, endHeight, growth });
    });

    const waterByDay: { date: string; count: number }[] = [];
    const fertilizeByDay: { date: string; count: number }[] = [];
    for (const dateStr of dateList) {
      const dayRecords = recentRecords.filter((r: PlantRecord) => r.date === dateStr);
      waterByDay.push({ date: dateStr, count: dayRecords.filter((r: PlantRecord) => r.watered).length });
      fertilizeByDay.push({ date: dateStr, count: dayRecords.filter((r: PlantRecord) => r.fertilized).length });
    }

    return { waterCount, fertilizeCount, leafDistribution, leafTotal, growthData, recentRecords, waterByDay, fertilizeByDay, dateList };
  }, [records, plants]);

  const hasAnyData = stats.recentRecords.length > 0;
  const hasGrowthData = stats.growthData.some((g) => g.growth !== null);
  const dateRangeLabel = `${formatShortDate(stats.dateList[0])} - ${formatShortDate(stats.dateList[stats.dateList.length - 1])}`;

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
            <h1 className="text-lg font-serif text-sage-800">护理统计</h1>
            <div className="w-20" />
          </div>
        </div>
      </header>

      <main className="container py-8">
        {!hasAnyData ? (
          <div className="text-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-sage-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <BarChart3 className="w-10 h-10 text-sage-400" />
            </div>
            <h2 className="text-xl font-serif text-sage-700 mb-2">暂无护理数据</h2>
            <p className="text-sage-500 mb-2">{dateRangeLabel} 内还没有任何护理记录</p>
            <p className="text-sage-400 text-sm">开始记录浇水、施肥等护理操作后，这里将展示统计概览</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4 animate-fade-in">
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-sage-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Droplets className="w-5 h-5 text-blue-500" />
                  </div>
                  <span className="text-sm text-sage-500">浇水次数</span>
                </div>
                <div className="text-3xl font-serif text-sage-800">{stats.waterCount}</div>
                <p className="text-xs text-sage-400 mt-1">{dateRangeLabel}</p>
              </div>
              <div className="bg-white rounded-2xl p-5 shadow-sm border border-sage-100">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                    <Leaf className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-sm text-sage-500">施肥次数</span>
                </div>
                <div className="text-3xl font-serif text-sage-800">{stats.fertilizeCount}</div>
                <p className="text-xs text-sage-400 mt-1">{dateRangeLabel}</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-1">
              <div className="flex items-center gap-2 mb-5">
                <Leaf className="w-5 h-5 text-sage-500" />
                <h2 className="text-lg font-serif text-sage-800">叶片状态分布</h2>
              </div>
              {stats.leafTotal === 0 ? (
                <div className="text-center py-8 text-sage-400 text-sm">
                  {dateRangeLabel} 没有叶片状态记录
                </div>
              ) : (
                <div className="space-y-4">
                  {stats.leafDistribution.map((item) => {
                    const pct = stats.leafTotal > 0 ? (item.count / stats.leafTotal) * 100 : 0;
                    return (
                      <div key={item.status} className="flex items-center gap-3">
                        <span className="text-sm text-sage-600 w-10 text-right flex-shrink-0">
                          {item.label}
                        </span>
                        <div className="flex-1 h-7 bg-sage-50 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${Math.max(pct, 0)}%`,
                              backgroundColor: item.color,
                              minWidth: pct > 0 ? '8px' : '0',
                            }}
                          />
                        </div>
                        <span className="text-sm text-sage-500 w-14 flex-shrink-0">
                          {item.count} 次
                        </span>
                        <span className="text-xs text-sage-400 w-12 flex-shrink-0 text-right">
                          {pct > 0 ? pct.toFixed(0) + '%' : '-'}
                        </span>
                      </div>
                    );
                  })}
                  <div className="pt-3 border-t border-sage-100 text-xs text-sage-400">
                    共 {stats.leafTotal} 条叶片记录
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-2">
              <div className="flex items-center gap-2 mb-5">
                <TrendingUp className="w-5 h-5 text-sage-500" />
                <h2 className="text-lg font-serif text-sage-800">高度增长</h2>
              </div>
              {!hasGrowthData ? (
                <div className="text-center py-8 text-sage-400 text-sm">
                  {dateRangeLabel} 没有高度记录
                </div>
              ) : (
                <div className="space-y-3">
                  {stats.growthData
                    .filter((g) => g.growth !== null)
                    .sort((a, b) => (b.growth || 0) - (a.growth || 0))
                    .map((g) => {
                      const absGrowth = Math.abs(g.growth || 0);
                      const maxGrowth = Math.max(
                        ...stats.growthData.filter((x) => x.growth !== null).map((x) => Math.abs(x.growth || 0)),
                        1
                      );
                      const barPct = (absGrowth / maxGrowth) * 100;
                      const isPositive = (g.growth || 0) >= 0;
                      return (
                        <div key={g.plantId} className="flex items-center gap-3">
                          <div className="w-24 flex-shrink-0 flex items-center gap-1.5 min-w-0">
                            <Sprout className="w-4 h-4 text-sage-400 flex-shrink-0" />
                            <span className="text-sm text-sage-700 truncate">{g.plantName}</span>
                          </div>
                          <div className="flex-1 h-6 bg-sage-50 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${Math.max(barPct, 2)}%`,
                                backgroundColor: isPositive ? '#7D9469' : '#C46F42',
                              }}
                            />
                          </div>
                          <div className="flex-shrink-0 text-right w-20">
                            <span className={`text-sm font-medium ${isPositive ? 'text-sage-600' : 'text-terracotta-500'}`}>
                              {isPositive ? '+' : ''}{g.growth?.toFixed(1)} cm
                            </span>
                            <div className="text-xs text-sage-400">
                              {g.startHeight}→{g.endHeight}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-3">
              <div className="flex items-center gap-2 mb-4">
                <Droplets className="w-5 h-5 text-blue-400" />
                <h2 className="text-lg font-serif text-sage-800">浇水趋势</h2>
                <span className="text-xs text-sage-400 ml-1">{dateRangeLabel}</span>
              </div>
              {stats.waterCount === 0 ? (
                <div className="text-center py-6 text-sage-400 text-sm">暂无浇水记录</div>
              ) : (
                <div className="flex items-end gap-[3px] h-28">
                  {stats.waterByDay.map((d) => {
                    const maxCount = Math.max(...stats.waterByDay.map((x) => x.count), 1);
                    const barH = d.count > 0 ? Math.max((d.count / maxCount) * 100, 10) : 0;
                    return (
                      <div
                        key={d.date}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {barH > 0 && (
                          <div
                            className="w-full rounded-t-sm bg-blue-300 hover:bg-blue-400 transition-colors"
                            style={{ height: `${barH}%` }}
                          />
                        )}
                        <div className="absolute -top-8 bg-sage-800 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {formatShortDate(d.date)}: {d.count}次
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-sage-100 animate-fade-in animate-stagger-4">
              <div className="flex items-center gap-2 mb-4">
                <Leaf className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-serif text-sage-800">施肥趋势</h2>
                <span className="text-xs text-sage-400 ml-1">{dateRangeLabel}</span>
              </div>
              {stats.fertilizeCount === 0 ? (
                <div className="text-center py-6 text-sage-400 text-sm">暂无施肥记录</div>
              ) : (
                <div className="flex items-end gap-[3px] h-28">
                  {stats.fertilizeByDay.map((d) => {
                    const maxCount = Math.max(...stats.fertilizeByDay.map((x) => x.count), 1);
                    const barH = d.count > 0 ? Math.max((d.count / maxCount) * 100, 10) : 0;
                    return (
                      <div
                        key={d.date}
                        className="flex-1 flex flex-col items-center justify-end h-full group relative"
                      >
                        {barH > 0 && (
                          <div
                            className="w-full rounded-t-sm bg-amber-300 hover:bg-amber-400 transition-colors"
                            style={{ height: `${barH}%` }}
                          />
                        )}
                        <div className="absolute -top-8 bg-sage-800 text-white text-xs px-2 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                          {formatShortDate(d.date)}: {d.count}次
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
