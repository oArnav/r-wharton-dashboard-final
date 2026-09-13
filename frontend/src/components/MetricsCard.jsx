import React from 'react';

export default function MetricsCard({
  title,
  value,
  subtitle,
  change,
  changeType = 'neutral', // 'positive' | 'negative' | 'neutral'
  icon: Icon,
  badge,
}) {
  const getChangeClasses = () => {
    if (changeType === 'positive') return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (changeType === 'negative') return 'text-rose-600 bg-rose-50 border-rose-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  return (
    <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</span>
        {Icon && (
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <div className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
          {value}
        </div>
        {change && (
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-md border ${getChangeClasses()}`}>
            {change}
          </span>
        )}
      </div>

      {(subtitle || badge) && (
        <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
          <span>{subtitle}</span>
          {badge && (
            <span className="font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
              {badge}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
