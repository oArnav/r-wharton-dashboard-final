import React, { useState, useEffect, useMemo } from 'react';
import {
  TrendingUp, TrendingDown, ShieldAlert, Activity, Award,
  Info, RefreshCw, Loader2, ArrowUpRight, CheckCircle2
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine
} from 'recharts';
import { api } from '../services/api';
import TimePeriodFilter, { sliceDataByPeriod } from './TimePeriodFilter';

export default function BenchmarkRiskView({ summary, trades = [], onUpdateRiskFreeRate }) {
  const [timeFilter, setTimeFilter] = useState('3M');
  const [benchmarkTicker, setBenchmarkTicker] = useState('^GSPC');
  const [rawChartData, setRawChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rfInput, setRfInput] = useState(
    summary?.risk_metrics?.risk_free_rate != null ? summary.risk_metrics.risk_free_rate : 4.5
  );

  const fetchComparison = async () => {
    setIsLoading(true);
    try {
      // Fetch full 1y series and slice client-side for zero latency
      const data = await api.getBenchmarkComparison(benchmarkTicker, '1y');
      setRawChartData(data || []);
    } catch (err) {
      console.error('Error fetching benchmark comparison:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison();
  }, [benchmarkTicker, trades, summary?.total_portfolio_value]);

  // Client-side instant date slicing
  const displayChartData = useMemo(() => {
    return sliceDataByPeriod(rawChartData, 'date', timeFilter);
  }, [rawChartData, timeFilter]);

  const handleRfSubmit = (e) => {
    e.preventDefault();
    const val = parseFloat(rfInput);
    if (!isNaN(val) && val >= 0) {
      onUpdateRiskFreeRate(val);
    }
  };

  const riskMetrics = summary?.risk_metrics || {};
  const latestPoint = displayChartData.length > 0 ? displayChartData[displayChartData.length - 1] : null;
  const firstPoint = displayChartData.length > 0 ? displayChartData[0] : null;

  // Normalized relative return for the sliced window
  const portReturn = latestPoint && firstPoint
    ? Number(latestPoint.portfolio_return_pct - firstPoint.portfolio_return_pct).toFixed(2)
    : (summary?.total_pnl_pct || 0);
  const bmReturn = latestPoint && firstPoint
    ? Number(latestPoint.benchmark_return_pct - firstPoint.benchmark_return_pct).toFixed(2)
    : 0;
  const alpha = (portReturn - bmReturn).toFixed(2);
  const isAlphaPositive = parseFloat(alpha) >= 0;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Benchmark & Risk Attribution
            </span>
            <span className="text-xs text-slate-400">• Portfolio vs. S&P 500 (^GSPC)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Performance vs. Benchmark & Risk Engine</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Evaluate cumulative alpha generation, volatility, drawdown protection, and risk-adjusted Sharpe ratios.
          </p>
        </div>

        {/* Time-Period Filter (Client-side slicing) */}
        <div className="flex items-center space-x-2">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Range:</span>
          <TimePeriodFilter activePeriod={timeFilter} onChange={setTimeFilter} />
        </div>
      </div>

      {/* KPI Cards: Alpha, Sharpe, Beta, Max Drawdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Cumulative Alpha */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Cumulative Excess Return (Alpha)</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-bold font-mono ${isAlphaPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isAlphaPositive ? '+' : ''}{alpha}%
            </span>
            <span className={`text-xs px-2 py-0.5 rounded font-semibold ${isAlphaPositive ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
              {isAlphaPositive ? 'Outperforming' : 'Underperforming'}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 flex justify-between font-mono">
            <span>Portfolio: {portReturn >= 0 ? '+' : ''}{portReturn}%</span>
            <span>S&P 500: {bmReturn >= 0 ? '+' : ''}{bmReturn}%</span>
          </div>
        </div>

        {/* Sharpe Ratio */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Sharpe Ratio</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-indigo-950">
              {riskMetrics.sharpe_ratio != null ? riskMetrics.sharpe_ratio : '—'}
            </span>
            <span className="text-xs font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
              Rf: {riskMetrics.risk_free_rate}%
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Excess return per unit of total risk. Target &gt; 1.0.
          </p>
        </div>

        {/* Weighted Beta */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Portfolio Beta</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-900">
              {riskMetrics.portfolio_beta != null ? riskMetrics.portfolio_beta : '—'}
            </span>
            <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-medium">
              S&P 500 = 1.0
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            {riskMetrics.weighted_equity_beta != null
              ? `Equity-only beta: ${riskMetrics.weighted_equity_beta}`
              : 'Weighted average beta of holdings'}
          </p>
        </div>

        {/* Max Drawdown */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">Max Drawdown</span>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-rose-600">
              {riskMetrics.max_drawdown_pct != null ? `${riskMetrics.max_drawdown_pct}%` : '—'}
            </span>
            <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
              6M Window
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">
            Largest peak-to-trough capital decline.
          </p>
        </div>

      </div>

      {/* Main Benchmark Comparison Chart */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Cumulative Return (%): Portfolio vs. S&P 500 Benchmark</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Calculated strictly from real trade executions and live historical closing prices</p>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <span className="flex items-center space-x-1.5 font-medium text-blue-600">
              <span className="w-3 h-3 rounded-full bg-blue-600"></span>
              <span>WInS Portfolio</span>
            </span>
            <span className="flex items-center space-x-1.5 font-medium text-slate-500">
              <span className="w-3 h-3 rounded-full bg-slate-400"></span>
              <span>S&P 500 (^GSPC)</span>
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="h-72 flex items-center justify-center text-slate-500 text-sm space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Fetching historical benchmark data...</span>
          </div>
        ) : displayChartData.length > 0 ? (
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickFormatter={(val) => `${val}%`} tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val, name) => [
                    `${val >= 0 ? '+' : ''}${val}%`,
                    name === 'portfolio_return_pct' ? 'Portfolio Return' : 'S&P 500 Return'
                  ]}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                />
                <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                <Line
                  type="monotone"
                  dataKey="portfolio_return_pct"
                  name="portfolio_return_pct"
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="benchmark_return_pct"
                  name="benchmark_return_pct"
                  stroke="#94a3b8"
                  strokeWidth={1.8}
                  strokeDasharray="4 4"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-72 flex flex-col items-center justify-center text-slate-400 text-sm">
            <TrendingUp className="w-10 h-10 mb-2 stroke-1 text-slate-300" />
            <span>Record open holdings to start plotting live portfolio vs benchmark returns.</span>
          </div>
        )}

        {/* Configurable Risk-Free Rate Form */}
        <form onSubmit={handleRfSubmit} className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-1.5 text-slate-600">
            <Info className="w-4 h-4 text-blue-500" />
            <span>Sharpe Ratio Risk-Free Baseline (3-Month US Treasury Bill):</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="number"
              step="0.05"
              min="0"
              max="20"
              value={rfInput}
              onChange={(e) => setRfInput(e.target.value)}
              className="w-16 px-2 py-1 border border-slate-300 rounded font-mono text-center font-semibold"
            />
            <span className="font-semibold">%</span>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-800 hover:bg-slate-900 text-white rounded font-medium"
            >
              Update Sharpe
            </button>
          </div>
        </form>

      </div>

    </div>
  );
}
