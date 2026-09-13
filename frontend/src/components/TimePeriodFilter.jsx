import React from 'react';

export const PERIODS = ['1D', '5D', '1M', '6M', 'YTD', '1Y', '5Y', 'All'];

/**
 * Slices time-series data array client-side based on the selected period.
 * Supports: 1D, 5D, 1M, 6M, YTD, 1Y, 5Y (or Y5), All.
 * @param {Array} data - Array of objects with a date property.
 * @param {string} dateKey - The key holding the date string (e.g. 'date').
 * @param {string} period - '1D' | '5D' | '1M' | '6M' | 'YTD' | '1Y' | '5Y' | 'Y5' | 'All'.
 * @returns {Array} Sliced data array.
 */
export function sliceDataByPeriod(data, dateKey = 'date', period = 'All') {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }

  const p = (period || 'All').toUpperCase();
  if (p === 'ALL') {
    return data;
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

  switch (p) {
    case '1D':
      cutoff.setDate(cutoff.getDate() - 1);
      break;
    case '5D':
      cutoff.setDate(cutoff.getDate() - 7); // 7 calendar days covers 5 trading days
      break;
    case '1M':
      cutoff.setDate(cutoff.getDate() - 30);
      break;
    case '6M':
      cutoff.setDate(cutoff.getDate() - 180);
      break;
    case 'YTD':
      cutoff.setMonth(0, 1);
      cutoff.setHours(0, 0, 0, 0);
      break;
    case '1Y':
      cutoff.setFullYear(cutoff.getFullYear() - 1);
      break;
    case '5Y':
    case 'Y5':
      cutoff.setFullYear(cutoff.getFullYear() - 5);
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

  // Handle weekend/holiday boundaries so charts always have enough points to render
  if (p === '1D' && filtered.length < 2 && data.length >= 2) {
    return data.slice(-2);
  }
  if (p === '5D' && filtered.length < 5 && data.length >= 5) {
    return data.slice(-5);
  }

  return filtered.length > 0 ? filtered : data;
}

/**
 * Reusable Time-Period Filter Pill Bar (1D / 5D / 1M / 6M / YTD / 1Y / 5Y / All)
 */
export default function TimePeriodFilter({
  activePeriod = 'All',
  onChange,
  className = '',
  size = 'xs'
}) {
  const pyClass = size === 'xs' ? 'py-1 px-2 text-[11px]' : 'py-1.5 px-2.5 text-xs';
  const activeNormalized = (activePeriod || 'All').toUpperCase();

  return (
    <div className={`inline-flex items-center space-x-0.5 bg-slate-100 dark:bg-slate-800/90 p-1 rounded-lg border border-slate-200/80 dark:border-slate-700/80 overflow-x-auto scrollbar-none ${className}`}>
      {PERIODS.map((p) => {
        const isMatched = activeNormalized === p.toUpperCase() || (p === '5Y' && activeNormalized === 'Y5');
        return (
          <button
            key={p}
            type="button"
            data-testid={`filter-${p.toLowerCase()}`}
            data-filter={p.toLowerCase()}
            data-period={p}
            title={p === '5Y' ? '5 Years (Y5)' : p}
            onClick={() => onChange(p)}
            className={`${pyClass} rounded-md font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
              isMatched
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200/60 dark:border-slate-700 font-bold'
                : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-slate-700/60'
            }`}
          >
            {p}
            {p === '5Y' && <span className="sr-only"> (Y5)</span>}
          </button>
        );
      })}
    </div>
  );
}
