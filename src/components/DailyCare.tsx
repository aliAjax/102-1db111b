import { Droplets, Leaf, Check, Calendar, Sparkles, SkipForward } from 'lucide-react';
import { usePlantStore, type CareTask } from '../store/usePlantStore';
import { getTodayString } from '../utils/storage';
import { SEASON_LABELS } from '../types';

export function DailyCare() {
  const { getTodayCareTasks, completeCareTask, skipCareTask } = usePlantStore();
  const tasks = getTodayCareTasks();

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const completedTasks = tasks.filter((t) => t.status === 'completed');

  const waterTasks = pendingTasks.filter((t) => t.type === 'water');
  const fertilizeTasks = pendingTasks.filter((t) => t.type === 'fertilize');

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const handleComplete = (task: CareTask) => {
    completeCareTask(task.plantId, task.type);
  };

  const handleSkip = (task: CareTask) => {
    skipCareTask(task.plantId, task.type);
  };

  const TaskCard = ({ task }: { task: CareTask }) => (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-sage-100 hover:shadow-sm transition-shadow">
      <div className="flex items-center gap-3">
        <div
          className={`p-2.5 rounded-lg ${
            task.type === 'water' ? 'bg-blue-50' : 'bg-amber-50'
          }`}
        >
          {task.type === 'water' ? (
            <Droplets className="w-5 h-5 text-blue-500" />
          ) : (
            <Leaf className="w-5 h-5 text-amber-500" />
          )}
        </div>
        <div>
          <p className="font-medium text-sage-800">{task.plantName}</p>
          <p className="text-sm text-sage-500">
            {task.type === 'water' ? '浇水' : '施肥'}
            {task.lastCareDate && (
              <span className="ml-2">
                上次：{formatDate(task.lastCareDate)}
                {task.daysSinceLastCare >= 0 && ` (${task.daysSinceLastCare}天前)`}
              </span>
            )}
            {!task.lastCareDate && <span className="ml-2">首次养护</span>}
          </p>
          {task.nextCareInfo.currentInterval > 0 && (
            <p className="text-xs text-sage-400 mt-0.5">
              {SEASON_LABELS[task.nextCareInfo.currentSeason]}周期：每{task.nextCareInfo.currentInterval}天
            </p>
          )}
        </div>
      </div>
      {task.status === 'pending' ? (
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleSkip(task)}
            className="flex items-center gap-1 px-3 py-2 border border-sage-200 text-sage-500 text-sm rounded-lg hover:bg-sage-50 transition-colors"
            title="跳过本次，不破坏原有计划时间线"
          >
            <SkipForward className="w-3.5 h-3.5" />
            跳过
          </button>
          <button
            onClick={() => handleComplete(task)}
            className="flex items-center gap-1.5 px-4 py-2 bg-sage-500 text-white text-sm rounded-lg hover:bg-sage-600 transition-colors"
          >
            <Check className="w-4 h-4" />
            完成
          </button>
        </div>
      ) : (
        <span className="flex items-center gap-1.5 px-4 py-2 bg-emerald-50 text-emerald-600 text-sm rounded-lg">
          <Check className="w-4 h-4" />
          已完成
        </span>
      )}
    </div>
  );

  if (tasks.length === 0) {
    return (
      <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sage-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-sage-100 rounded-xl">
            <Sparkles className="w-5 h-5 text-sage-600" />
          </div>
          <div>
            <h2 className="text-lg font-serif text-sage-800">今日养护</h2>
            <p className="text-sm text-sage-500">{getTodayString()}</p>
          </div>
        </div>
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-sage-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-sage-400" />
          </div>
          <p className="text-sage-600">今天没有需要养护的植物</p>
          <p className="text-sm text-sage-400 mt-1">继续保持好习惯！</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 border border-sage-100">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sage-100 rounded-xl">
            <Calendar className="w-5 h-5 text-sage-600" />
          </div>
          <div>
            <h2 className="text-lg font-serif text-sage-800">今日养护</h2>
            <p className="text-sm text-sage-500">{getTodayString()}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full">
            待浇水 {waterTasks.length}
          </span>
          <span className="px-3 py-1 bg-amber-50 text-amber-600 rounded-full">
            待施肥 {fertilizeTasks.length}
          </span>
          <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full">
            已完成 {completedTasks.length}
          </span>
        </div>
      </div>

      {pendingTasks.length > 0 && (
        <div className="space-y-3 mb-5">
          {pendingTasks.map((task, index) => (
            <TaskCard key={`${task.plantId}-${task.type}-${index}`} task={task} />
          ))}
        </div>
      )}

      {completedTasks.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-sage-600 mb-3 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-500" />
            已完成 ({completedTasks.length})
          </h3>
          <div className="space-y-3 opacity-70">
            {completedTasks.map((task, index) => (
              <TaskCard key={`${task.plantId}-${task.type}-${index}`} task={task} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
