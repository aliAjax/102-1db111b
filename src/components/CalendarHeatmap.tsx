import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PlantRecord } from '../types';

interface CalendarHeatmapProps {
  records: PlantRecord[];
  onDateClick: (date: string) => void;
}

export function CalendarHeatmap({ records, onDateClick }: CalendarHeatmapProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const firstDayOfWeek = firstDay.getDay();

  const monthNames = [
    '一月', '二月', '三月', '四月', '五月', '六月',
    '七月', '八月', '九月', '十月', '十一月', '十二月',
  ];

  const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

  const getRecordsForDate = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return records.filter((r) => r.date === dateStr);
  };

  const getActivityLevel = (day: number) => {
    const dayRecords = getRecordsForDate(day);
    if (dayRecords.length === 0) return 0;
    let wateredCount = 0;
    let fertilizedCount = 0;
    for (const r of dayRecords) {
      if (r.watered) wateredCount++;
      if (r.fertilized) fertilizedCount++;
    }
    const careCount = wateredCount + fertilizedCount;
    if (careCount === 0) return 1;
    if (careCount === 1) return 2;
    if (careCount === 2) return 3;
    return 4;
  };

  const getBgColor = (level: number) => {
    const colors = ['bg-cream-300', 'bg-sage-100', 'bg-sage-200', 'bg-sage-400', 'bg-sage-500'];
    return colors[level];
  };

  const getTextColor = (level: number) => {
    return level >= 3 ? 'text-white' : 'text-sage-700';
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
  };

  const days: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-sage-600" />
        </button>
        <h3 className="font-serif text-lg text-sage-800">
          {year}年 {monthNames[month]}
        </h3>
        <button
          onClick={nextMonth}
          className="p-2 hover:bg-sage-100 rounded-lg transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-sage-600" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs text-sage-500 py-2 font-medium"
          >
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, index) => {
          if (day === null) {
            return <div key={index} className="aspect-square" />;
          }
          const level = getActivityLevel(day);
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const hasRecords = getRecordsForDate(day).length > 0;

          return (
            <button
              key={index}
              onClick={() => hasRecords && onDateClick(dateStr)}
              className={`aspect-square flex items-center justify-center text-sm rounded-lg transition-all ${getBgColor(level)} ${getTextColor(level)} ${
                hasRecords ? 'cursor-pointer hover:ring-2 hover:ring-sage-400' : 'cursor-default'
              } ${isToday(day) ? 'ring-2 ring-terracotta-400' : ''}`}
            >
              {day}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-2 mt-4 text-xs text-sage-500">
        <span>少</span>
        {[0, 1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`w-4 h-4 rounded ${getBgColor(level)}`}
          />
        ))}
        <span>多</span>
      </div>
    </div>
  );
}
