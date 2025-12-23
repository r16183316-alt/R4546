
import React from 'react';

interface QuotaDisplayProps {
  remaining: number;
  total: number;
}

export const QuotaDisplay: React.FC<QuotaDisplayProps> = ({ remaining, total }) => {
  const percentage = (remaining / total) * 100;
  
  let statusColor = 'bg-green-500';
  let textColor = 'text-green-600';
  let label = '额度充足';

  if (remaining === 0) {
    statusColor = 'bg-gray-400';
    textColor = 'text-gray-500';
    label = '今日已用完';
  } else if (remaining < 10) {
    statusColor = 'bg-red-500 animate-pulse';
    textColor = 'text-red-600 font-bold';
    label = `仅剩 ${remaining} 次`;
  } else if (remaining < 50) {
    statusColor = 'bg-yellow-500';
    textColor = 'text-yellow-600';
    label = '额度有限';
  }

  return (
    <div className="w-full max-w-xs space-y-2">
      <div className="flex justify-between items-end text-xs font-medium">
        <span className={textColor}>{label}</span>
        <span className="text-slate-400">{remaining} / {total} 次</span>
      </div>
      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`h-full transition-all duration-500 ${statusColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
