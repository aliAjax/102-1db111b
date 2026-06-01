import type { PlantRecord } from '../types';

interface HeightChartProps {
  records: PlantRecord[];
}

export function HeightChart({ records }: HeightChartProps) {
  const heightRecords = records
    .filter((r: PlantRecord) => r.height > 0)
    .sort((a: PlantRecord, b: PlantRecord) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (heightRecords.length < 2) {
    return (
      <div className="h-48 flex items-center justify-center text-sage-400 text-sm">
        需要至少 2 条高度记录才能显示趋势
      </div>
    );
  }

  const heights = heightRecords.map((r) => r.height);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const padding = 10;
  const width = 100;
  const chartHeight = 100;
  const heightRange = maxHeight - minHeight || 1;

  const points = heightRecords.map((r, i) => {
    const x = padding + (i / (heightRecords.length - 1)) * (width - padding * 2);
    const y =
      chartHeight -
      padding -
      ((r.height - minHeight) / heightRange) * (chartHeight - padding * 2);
    return `${x},${y}`;
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-4">
      <svg
        viewBox={`0 0 ${width} ${chartHeight}`}
        className="w-full h-48"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9CAF88" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#9CAF88" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        <polyline
          fill="none"
          stroke="#D4DAC9"
          strokeWidth="0.5"
          points={`${padding},${padding} ${width - padding},${padding} ${padding},${chartHeight - padding} ${width - padding},${chartHeight - padding}`}
        />
        
        <polygon
          fill="url(#areaGradient)"
          points={`${padding},${chartHeight - padding} ${points.join(' ')} ${width - padding},${chartHeight - padding}`}
        />
        
        <polyline
          fill="none"
          stroke="#7D9469"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={points.join(' ')}
        />
        
        {points.map((point, i) => {
          const [x, y] = point.split(',');
          return (
            <circle
              key={i}
              cx={parseFloat(x)}
              cy={parseFloat(y)}
              r="2"
              fill="#5C6F4B"
            />
          );
        })}
      </svg>
      
      <div className="flex justify-between items-center text-xs text-sage-500">
        <div className="flex flex-col">
          <span>{formatDate(heightRecords[0].date)}</span>
          <span className="text-sage-600 font-medium">
            {heightRecords[0].height} cm
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span>{formatDate(heightRecords[heightRecords.length - 1].date)}</span>
          <span className="text-sage-600 font-medium">
            {heightRecords[heightRecords.length - 1].height} cm
          </span>
        </div>
      </div>
    </div>
  );
}
