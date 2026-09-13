import React, { useState, useEffect, useMemo } from 'react';
import {
  DollarSign, TrendingUp, TrendingDown, Percent, Wallet, ShieldAlert,
  PieChart as PieIcon, BarChart3, Info, ArrowUpRight, ArrowDownRight, Award,
  ShieldCheck, AlertTriangle, Scale, CheckCircle2, RefreshCw, Layers
} from 'lucide-react';
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend,
  AreaChart, Area, XAxis, YAxis, CartesianGrid
} from 'recharts';
import MetricsCard from './MetricsCard';
import ClientIPSBanner from './ClientIPSBanner';
import IPSTraceability from './IPSTraceability';
import TimePeriodFilter, { sliceDataByPeriod } from './TimePeriodFilter';
import { api } from '../services/api';

const SECTOR_COLORS = [
  '#2563eb', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899',
  '#06b6d4', '#f97316', '#64748b', '#14b8a6', '#6366f1'
];

const TEAM_MEMBERS = ['Arnav', 'Jaivish', 'Harsimar', 'Nairit'];

export default function PortfolioOverview({
  summary,
  ips,
  trades = [],
  onUpdateIps,
  onUpdateTradeIps,
  onUpdateRiskFreeRate,
  onSelectTab
}) {
  const [rfInput, setRfInput] = useState(
    summary?.risk_metrics?.risk_free_rate != null ? summary.risk_metrics.risk_free_rate : 4.5
  );
  const [portfolioHistory, setPortfolioHistory] = useState([]);
  const [portPeriod, setPortPeriod] = useState('All');

  // Reconciliation Check State (Phase 5)
  const [actualCashInput, setActualCashInput] = useState('');
  const [actualPortInput, setActualPortInput] = useState('');
  const [reconciledBy, setReconciledBy] = useState('Arnav');
  const [recNotes, setRecNotes] = useState('');
  const [isSavingRec, setIsSavingRec] = useState(false);
  const [recSuccess, setRecSuccess] = useState('');
  const [recHistory, setRecHistory] = useState([]);

  const loadRecHistory = async () => {
    try {
      const hist = await api.getReconciliationHistory(5);
      setRecHistory(hist || []);
    } catch (e) {
      console.error('Error fetching reconciliation history:', e);
    }
  };

  useEffect(() => {
    loadRecHistory();
  }, []);

  useEffect(() => {
    api.getBenchmarkComparison('^GSPC', '5y')
      .then((data) => setPortfolioHistory(data))
      .catch((err) => console.error(err));
  }, [trades]);

  const displayPortHistory = useMemo(() => {
    return sliceDataByPeriod(portfolioHistory, 'date', portPeriod);
  }, [portfolioHistory, portPeriod]);

  if (!summary) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500 flex items-center space-x-2">
          <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading portfolio analytics...</span>
        </div>
      </div>
    );
  }

  const {
    starting_capital = 500000,
    total_portfolio_value = 500000,
    total_pnl = 0,
    total_pnl_pct = 0,
    realized_pnl = 0,
    unrealized_pnl = 0,
    cash_remaining = 500000,
    cash_percentage = 100,
    total_invested_value = 0,
    win_rate = 0,
    closed_positions_count = 0,
    open_positions_count = 0,
    sector_allocations = [],
    risk_metrics = {},
    ips_traceability = {},
    enriched_open_trades = [],
  } = summary;

  const isProfit = total_pnl >= 0;
  const isRealizedProfit = (realized_pnl || 0) >= 0;
  const isUnrealizedProfit = (unrealized_pnl || 0) >= 0;
  const investedPercentage = Math.max(0, 100 - cash_percentage);

  // Live reconciliation gap calculations
  const parsedActualCash = parseFloat(actualCashInput);
  const parsedActualPort = parseFloat(actualPortInput);

  const cashGap = !isNaN(parsedActualCash) ? parsedActualCash - cash_remaining : null;
  const portGap = !isNaN(parsedActualPort) ? parsedActualPort - total_portfolio_value : null;

  const handleSaveReconciliation = async (e) => {
    e.preventDefault();
    if (isNaN(parsedActualCash) || isNaN(parsedActualPort)) return;
    setIsSavingRec(true);
    setRecSuccess('');
    try {
      await api.addReconciliation({
        checked_by: reconciledBy,
        actual_cash: parsedActualCash,
        actual_portfolio_value: parsedActualPort,
        calculated_cash: cash_remaining,
        calculated_portfolio_value: total_portfolio_value,
        notes: recNotes.trim()
      });
      setRecSuccess('Reconciliation audit logged successfully.');
      setTimeout(() => setRecSuccess(''), 4000);
      loadRecHistory();
    } catch (err) {
      console.error('Failed to save reconciliation:', err);
    } finally {
      setIsSavingRec(false);
    }
  };

  const handleRfSubmit = (e) => {
    e.preventDefault();
    const parsed = parseFloat(rfInput);
    if (!isNaN(parsed) && parsed >= 0) {
      onUpdateRiskFreeRate(parsed);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Top Prominent Client IPS Banner */}
      <ClientIPSBanner ips={ips} onUpdateIps={onUpdateIps} />

      {/* 2. Top Banner: Wharton WInS Portfolio Value & Cash Breakdown */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-6 text-white border border-blue-900/40 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-blue-400 bg-blue-900/60 px-2.5 py-0.5 rounded-full border border-blue-700/50">
              Wharton Investment Simulator
            </span>
            <span className="text-xs text-slate-400">• Virtual Capital: $500,000</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mt-2 tracking-tight">
            ${Number(total_portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h1>
          <p className="text-xs text-slate-300 mt-1 flex items-center space-x-2">
            <span>Base: ${Number(starting_capital).toLocaleString()}</span>
            <span>•</span>
            <span className={isProfit ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
              Total Net P&L: {isProfit ? '+' : ''}${Number(total_pnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isProfit ? '+' : ''}{total_pnl_pct}%)
            </span>
          </p>
        </div>

        {/* Capital Allocation Bar */}
        <div className="w-full md:w-80 bg-slate-800/80 rounded-xl p-3 border border-slate-700">
          <div className="flex justify-between text-xs text-slate-300 mb-1.5 font-medium">
            <span className="font-semibold text-emerald-400">Cash: {cash_percentage}%</span>
            <span className="font-semibold text-blue-400">Invested: {investedPercentage.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2.5 overflow-hidden flex">
            <div
              className="bg-emerald-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, cash_percentage)}%` }}
              title={`Cash: $${Number(cash_remaining).toLocaleString()}`}
            />
            <div
              className="bg-blue-500 h-full transition-all duration-500"
              style={{ width: `${Math.min(100, investedPercentage)}%` }}
              title={`Invested: $${Number(total_invested_value).toLocaleString()}`}
            />
          </div>
          <div className="flex justify-between text-[11px] text-slate-300 mt-1.5 font-mono">
            <span>${Number(cash_remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span>${Number(total_invested_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      </div>

      {/* 3. Five KPI Cards: Available Cash & Explicit Realized vs. Unrealized Split */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Card 1: Total Portfolio Value */}
        <MetricsCard
          title="Total Portfolio Value"
          value={`$${Number(total_portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle="Cash + Open Holdings"
          change={`${isProfit ? '+' : ''}${total_pnl_pct}%`}
          changeType={isProfit ? 'positive' : 'negative'}
          icon={DollarSign}
        />

        {/* Card 2: Prominent Available Cash */}
        <MetricsCard
          title="Available Cash Balance"
          value={`$${Number(cash_remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`${cash_percentage}% of virtual fund`}
          change="$500,000 base"
          changeType="neutral"
          icon={Wallet}
          badge="Simulator Cash"
        />

        {/* Card 3: Realized P&L */}
        <MetricsCard
          title="Realized P&L"
          value={`${isRealizedProfit ? '+' : ''}$${Number(realized_pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`From ${closed_positions_count} closed positions`}
          change={closed_positions_count > 0 ? `${win_rate}% Win Rate` : 'No closed trades'}
          changeType={isRealizedProfit ? 'positive' : 'negative'}
          icon={isRealizedProfit ? TrendingUp : TrendingDown}
          badge="Closed P&L"
        />

        {/* Card 4: Unrealized P&L */}
        <MetricsCard
          title="Unrealized Paper P&L"
          value={`${isUnrealizedProfit ? '+' : ''}$${Number(unrealized_pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          subtitle={`On ${open_positions_count} active holdings`}
          change={`$${Number(total_invested_value).toLocaleString()} open`}
          changeType={isUnrealizedProfit ? 'positive' : 'negative'}
          icon={isUnrealizedProfit ? TrendingUp : TrendingDown}
          badge="Paper Gain/Loss"
        />

        {/* Card 5: Win Rate & Beta */}
        <MetricsCard
          title="Win Rate & Risk"
          value={`${win_rate}%`}
          subtitle={`Beta: ${risk_metrics.portfolio_beta != null ? risk_metrics.portfolio_beta : '—'} | Sharpe: ${risk_metrics.sharpe_ratio != null ? risk_metrics.sharpe_ratio : '—'}`}
          change={risk_metrics.portfolio_beta ? `Beta ${risk_metrics.portfolio_beta}` : 'Unlevered'}
          changeType="neutral"
          icon={Award}
          badge="Discipline"
        />

      </div>

      {/* 4. Portfolio Value Over Time Chart */}
      {portfolioHistory.length > 1 && (
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <span>Portfolio Value Over Time ($)</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Historical valuation track derived from executed trades and daily market closes</p>
            </div>
            <div className="flex items-center space-x-3">
              <TimePeriodFilter activePeriod={portPeriod} onChange={setPortPeriod} />
              <span className="text-xs font-mono font-bold text-slate-800 hidden md:inline">
                ${Number(total_portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayPortHistory} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                <defs>
                  <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 text-white p-2.5 rounded-lg shadow-xl text-xs space-y-1 border border-slate-700">
                          <p className="font-semibold text-slate-300">{data.date}</p>
                          <p className="font-mono text-emerald-400">
                            Portfolio: ${Number(data.portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </p>
                          {data.sp500_normalized && (
                            <p className="font-mono text-slate-400 text-[11px]">
                              S&P 500: ${Number(data.sp500_normalized).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </p>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area type="monotone" dataKey="portfolio_value" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#portGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* 5. Phase 5 Deliverable: Manual WInS Simulator Reconciliation Check */}
      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center space-x-2">
              <Scale className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-bold text-slate-900">Manual WInS Simulator Reconciliation</h2>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                Audit Tool
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter your live numbers from the official Wharton simulator blotter to audit any cash or execution discrepancies.
            </p>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">No auto-fix • Surfaces mismatches</span>
        </div>

        {recSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{recSuccess}</span>
          </div>
        )}

        <form onSubmit={handleSaveReconciliation} className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Actual WInS Cash Balance ($) *
            </label>
            <input
              type="number"
              step="0.01"
              value={actualCashInput}
              onChange={(e) => setActualCashInput(e.target.value)}
              placeholder="e.g. 484500.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Calculated: ${Number(cash_remaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Actual WInS Total Value ($) *
            </label>
            <input
              type="number"
              step="0.01"
              value={actualPortInput}
              onChange={(e) => setActualPortInput(e.target.value)}
              placeholder="e.g. 502100.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              Calculated: ${Number(total_portfolio_value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Audited By (Team Member) *
            </label>
            <select
              value={reconciledBy}
              onChange={(e) => setReconciledBy(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {TEAM_MEMBERS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            <input
              type="text"
              value={recNotes}
              onChange={(e) => setRecNotes(e.target.value)}
              placeholder="Optional notes..."
              className="w-full mt-1 px-2.5 py-1 border border-slate-200 rounded text-[11px]"
            />
          </div>

          <div className="flex flex-col justify-between">
            {/* Live Delta Display */}
            <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Cash Gap:</span>
                <span className={`font-mono font-bold ${cashGap == null ? 'text-slate-400' : Math.abs(cashGap) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {cashGap != null ? `${cashGap >= 0 ? '+' : ''}$${cashGap.toFixed(2)}` : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-500">Portfolio Gap:</span>
                <span className={`font-mono font-bold ${portGap == null ? 'text-slate-400' : Math.abs(portGap) < 0.05 ? 'text-emerald-600' : 'text-amber-600'}`}>
                  {portGap != null ? `${portGap >= 0 ? '+' : ''}$${portGap.toFixed(2)}` : '—'}
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSavingRec || cashGap == null}
              className="w-full mt-2 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-sm transition disabled:opacity-50 flex items-center justify-center space-x-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Log Audit Check</span>
            </button>
          </div>
        </form>

        {/* Previous Audits History Strip */}
        {recHistory.length > 0 && (
          <div className="pt-2 border-t border-slate-100">
            <span className="text-[11px] font-bold text-slate-500 block mb-1">Recent Audit Check History:</span>
            <div className="divide-y divide-slate-100 max-h-36 overflow-y-auto text-[11px]">
              {recHistory.map((h) => (
                <div key={h.id} className="py-1.5 flex items-center justify-between text-slate-600 font-mono">
                  <span>
                    <strong className="text-slate-800">{h.checked_by}</strong> on {h.checked_at?.split(' ')[0]}
                  </span>
                  <span>
                    Actual Cash: ${Number(h.actual_cash).toLocaleString()} ({h.cash_discrepancy >= 0 ? '+' : ''}${Number(h.cash_discrepancy).toFixed(2)})
                  </span>
                  <span>
                    Actual Port: ${Number(h.actual_portfolio_value).toLocaleString()} ({h.portfolio_discrepancy >= 0 ? '+' : ''}${Number(h.portfolio_discrepancy).toFixed(2)})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 6. Sector Allocations Donut & Risk Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sector Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <PieIcon className="w-4 h-4 text-blue-600" />
                <span>Sector Diversification & Sizing</span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">Asset distribution across S&P 500 sectors against client guidelines</p>
            </div>
            <button
              onClick={() => onSelectTab('sectors')}
              className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
            >
              Sector Stance →
            </button>
          </div>

          {sector_allocations.length > 0 ? (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="h-52 w-52 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={sector_allocations}
                      dataKey="value"
                      nameKey="sector"
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {sector_allocations.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.sector === 'Cash' ? '#10b981' : SECTOR_COLORS[index % SECTOR_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value, name) => [
                        `$${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2 })}`,
                        name
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="flex-1 space-y-1.5 w-full">
                {sector_allocations.map((item, idx) => (
                  <div key={item.sector} className="flex items-center justify-between text-xs py-1 border-b border-slate-100 last:border-none">
                    <div className="flex items-center space-x-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: item.sector === 'Cash' ? '#10b981' : SECTOR_COLORS[idx % SECTOR_COLORS.length] }}
                      />
                      <span className="font-medium text-slate-800">{item.sector}</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-semibold text-slate-900">${Number(item.value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-slate-400 ml-1.5">({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-sm">
              <PieIcon className="w-10 h-10 stroke-1 mb-2 text-slate-300" />
              <span>No sector holdings yet.</span>
            </div>
          )}
        </div>

        {/* Risk & Performance Analytics */}
        <div className="lg:col-span-5 bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" />
                  <span>Portfolio Risk Metrics</span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Automated calculations derived strictly from live prices</p>
              </div>
              <button
                onClick={() => onSelectTab('benchmark')}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
              >
                Benchmark View →
              </button>
            </div>

            {/* Risk-free rate config */}
            <form onSubmit={handleRfSubmit} className="mb-4 p-2 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Risk-Free Rate (3M T-Bill):</span>
              <div className="flex items-center space-x-1.5">
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  max="20"
                  value={rfInput}
                  onChange={(e) => setRfInput(e.target.value)}
                  className="w-14 px-1.5 py-0.5 border border-slate-300 rounded font-mono text-center font-semibold text-slate-900 bg-white"
                />
                <span>%</span>
                <button type="submit" className="px-2 py-0.5 bg-blue-600 text-white rounded text-[11px] font-medium">
                  Set
                </button>
              </div>
            </form>

            {/* Risk Grid */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3 rounded-lg bg-indigo-50/60 border border-indigo-100">
                <span className="text-[11px] font-semibold text-indigo-800 uppercase block">Sharpe Ratio</span>
                <div className="text-xl font-bold font-mono text-indigo-950 mt-1">
                  {risk_metrics.sharpe_ratio != null ? risk_metrics.sharpe_ratio : '—'}
                </div>
                <span className="text-[10px] text-indigo-700 mt-0.5 block">Risk-adjusted return</span>
              </div>

              <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100">
                <span className="text-[11px] font-semibold text-amber-800 uppercase block">Portfolio Beta</span>
                <div className="text-xl font-bold font-mono text-amber-950 mt-1">
                  {risk_metrics.portfolio_beta != null ? risk_metrics.portfolio_beta : '—'}
                </div>
                <span className="text-[10px] text-amber-700 mt-0.5 block">vs S&P 500 (1.0)</span>
              </div>

              <div className="p-3 rounded-lg bg-rose-50/60 border border-rose-100">
                <span className="text-[11px] font-semibold text-rose-800 uppercase block">Max Drawdown</span>
                <div className="text-xl font-bold font-mono text-rose-950 mt-1">
                  {risk_metrics.max_drawdown_pct != null ? `${risk_metrics.max_drawdown_pct}%` : '—'}
                </div>
                <span className="text-[10px] text-rose-700 mt-0.5 block">6M peak-to-trough</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-700 uppercase block">Annualized Vol</span>
                <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                  {risk_metrics.annualized_volatility_pct != null ? `${risk_metrics.annualized_volatility_pct}%` : '—'}
                </div>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Std dev of daily returns</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* 7. IPS Traceability Checker Embedded */}
      <IPSTraceability
        trades={trades}
        ips={ips}
        onUpdateTradeIps={onUpdateTradeIps}
        onSelectTab={onSelectTab}
      />

    </div>
  );
}
