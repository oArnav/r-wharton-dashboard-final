import React from 'react';

export const PERIODS = ['1W', '1M', '3M', 'YTD', 'All'];

/**
 * Slices time-series data array client-side based on the selected period.
 * @param {Array} data - Array of objects with a date property.
 * @param {string} dateKey - The key holding the date string (e.g. 'date').
 * @param {string} period - '1W' | '1M' | '3M' | 'YTD' | 'All'.
 * @returns {Array} Sliced data array.
 */
export function sliceDataByPeriod(data, dateKey = 'date', period = 'All') {
  if (!Array.isArray(data) || data.length === 0 || period === 'All') {
    return data || [];
  }

  // Find latest valid date in the data array
  let latestDate = null;
  for (let i = data.length - 1; i >= 0; i--) {
    const raw = data[i]?.[dateKey];
    if (raw) {
      const d = new Date(raw);
      if (!isNaN(d.getTime())) {
        latestDate = d;
        break;
      }
    }
  }

  if (!latestDate) {
    latestDate = new Date();
  }

  const cutoff = new Date(latestDate);

  switch (period) {
    case '1W':
      cutoff.setDate(cutoff.getDate() - 7);
      break;
    case '1M':
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case '3M':
      cutoff.setDate(cutoff.getDate() - 90);
      break;
    case 'YTD':
      cutoff.setMonth(0, 1);
      cutoff.setHours(0, 0, 0, 0);
      break;
    default:
      return data;
  }

  const filtered = data.filter((item) => {
    const raw = item?.[dateKey];
    if (!raw) return true;
    const d = new Date(raw);
    return isNaN(d.getTime()) || d >= cutoff;
  });

  // If 1W yields fewer than 3 points (e.g. over a weekend or holidays) and data has more, take last 5
  if (period === '1W' && filtered.length < 3 && data.length >= 3) {
    return data.slice(-5);
  }

  return filtered.length > 0 ? filtered : data;
}

/**
 * Reusable Time-Period Filter Pill Bar (1W / 1M / 3M / YTD / All)
 */
export default function TimePeriodFilter({
  activePeriod,
  onChange,
  className = '',
  size = 'xs'
}) {
  const pyClass = size === 'xs' ? 'py-1 px-2.5 text-xs' : 'py-1.5 px-3 text-xs';

  return (
    <div className={`inline-flex items-center space-x-1 bg-slate-100 p-1 rounded-lg border border-slate-200/80 ${className}`}>
      {PERIODS.map((p) => {
        const isActive = activePeriod === p;
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={`${pyClass} rounded-md font-semibold transition-all whitespace-nowrap ${
              isActive
                ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60 font-bold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {p}
          </button>
        );
      })}
    </div>
  );
}
