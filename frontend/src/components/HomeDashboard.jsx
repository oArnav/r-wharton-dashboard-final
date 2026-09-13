import React, { useState, useEffect } from 'react';
import {
  Clock, Target, ShieldCheck, TrendingUp, Layers, SlidersHorizontal,
  FileText, Newspaper, Search, BrainCircuit, ListOrdered, Award,
  ArrowUpRight, AlertTriangle, CheckCircle2, Wallet, DollarSign,
  Activity, Eye, Scale, FileSpreadsheet, RefreshCw, ExternalLink,
  Download, Calendar, Plus, Trash2, ShieldAlert, Check
} from 'lucide-react';
import { api } from '../services/api';

export default function HomeDashboard({
  summary,
  ips,
  trades = [],
  approvedCount = 0,
  onSelectTab,
  onSelectTickerForStatements,
  onSelectTickerForLookup
}) {
  // Competition Deadlines: Oct 10, 2026 and Dec 5, 2026
  const [timeLeftOct10, setTimeLeftOct10] = useState({ days: 0, hours: 0, passed: false });
  const [timeLeftDec5, setTimeLeftDec5] = useState({ days: 0, hours: 0, passed: false });
  const [activityFeed, setActivityFeed] = useState([]);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedLimit, setFeedLimit] = useState(8);

  // Deadlines & Milestones (Phase 5)
  const [deadlines, setDeadlines] = useState([]);
  const [isLoadingDeadlines, setIsLoadingDeadlines] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newIsHard, setNewIsHard] = useState(false);
  const [isAddingDeadline, setIsAddingDeadline] = useState(false);
  const [deadlineError, setDeadlineError] = useState('');
  const [isDownloadingBackup, setIsDownloadingBackup] = useState(false);
  const [backupSuccess, setBackupSuccess] = useState(false);

  useEffect(() => {
    const calculateTime = () => {
      const now = new Date();
      const currentYear = now.getFullYear();

      // Oct 10
      let oct10 = new Date(currentYear, 9, 10, 23, 59, 59);
      if (now > oct10) {
        oct10 = new Date(currentYear + 1, 9, 10, 23, 59, 59);
      }
      const diffOct = oct10 - now;
      const daysOct = Math.floor(diffOct / (1000 * 60 * 60 * 24));
      const hoursOct = Math.floor((diffOct / (1000 * 60 * 60)) % 24);
      setTimeLeftOct10({ days: daysOct, hours: hoursOct, passed: diffOct < 0 });

      // Dec 5
      let dec5 = new Date(currentYear, 11, 5, 23, 59, 59);
      if (now > dec5) {
        dec5 = new Date(currentYear + 1, 11, 5, 23, 59, 59);
      }
      const diffDec = dec5 - now;
      const daysDec = Math.floor(diffDec / (1000 * 60 * 60 * 24));
      const hoursDec = Math.floor((diffDec / (1000 * 60 * 60)) % 24);
      setTimeLeftDec5({ days: daysDec, hours: hoursDec, passed: diffDec < 0 });
    };

    calculateTime();
    const timer = setInterval(calculateTime, 60000);
    return () => clearInterval(timer);
  }, []);

  const loadFeed = async () => {
    setIsLoadingFeed(true);
    try {
      const feed = await api.getActivityFeed(15);
      setActivityFeed(feed || []);
    } catch (err) {
      console.error('Failed to load activity feed:', err);
    } finally {
      setIsLoadingFeed(false);
    }
  };

  const loadDeadlines = async () => {
    setIsLoadingDeadlines(true);
    try {
      const data = await api.getDeadlines();
      setDeadlines(data || []);
    } catch (err) {
      console.error('Failed to load deadlines:', err);
    } finally {
      setIsLoadingDeadlines(false);
    }
  };

  useEffect(() => {
    loadFeed();
    loadDeadlines();
  }, []);

  const handleAddDeadline = async (e) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) {
      setDeadlineError('Milestone title and deadline date are required.');
      return;
    }
    setDeadlineError('');
    setIsAddingDeadline(true);
    try {
      await api.addDeadline({
        title: newTitle.trim(),
        deadline_date: newDate,
        description: newDesc.trim(),
        is_hard_deadline: newIsHard
      });
      setNewTitle('');
      setNewDate('');
      setNewDesc('');
      setNewIsHard(false);
      await loadDeadlines();
    } catch (err) {
      setDeadlineError(err.message || 'Failed to add deadline.');
    } finally {
      setIsAddingDeadline(false);
    }
  };

  const handleDeleteDeadline = async (id) => {
    if (!window.confirm('Are you sure you want to remove this milestone?')) return;
    try {
      await api.deleteDeadline(id);
      await loadDeadlines();
    } catch (err) {
      console.error('Failed to delete deadline:', err);
    }
  };

  const handleBackupDownload = async () => {
    setIsDownloadingBackup(true);
    try {
      await api.downloadFullBackup();
      setBackupSuccess(true);
      setTimeout(() => setBackupSuccess(false), 4000);
    } catch (err) {
      alert('Failed to download full database backup: ' + err.message);
    } finally {
      setIsDownloadingBackup(false);
    }
  };

  const getDeadlineStatus = (dateStr) => {
    const now = new Date();
    // Use midnight of target date
    const target = new Date(dateStr + 'T23:59:59');
    const diffMs = target - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return {
      days: diffDays,
      isOverdue: diffDays < 0,
      isUrgent: diffDays >= 0 && diffDays <= 3,
      isSoon: diffDays > 3 && diffDays <= 7
    };
  };

  const urgentDeadlines = deadlines.filter((d) => {
    const st = getDeadlineStatus(d.deadline_date);
    return st.isUrgent || (st.isOverdue && st.days >= -1);
  });

  const totalPortfolioValue = summary?.total_portfolio_value || 500000;
  const totalPnl = summary?.total_pnl || 0;
  const totalPnlPct = summary?.total_pnl_pct || 0;
  const cashRemaining = summary?.cash_remaining || 500000;
  const cashPct = summary?.cash_percentage || 100;
  const winRate = summary?.win_rate || 0;
  const isProfit = totalPnl >= 0;

  const openTrades = trades.filter((t) => t.status === 'open');
  const ipsCompliance = summary?.ips_traceability?.compliance_pct || 100;

  const getActivityBadge = (type) => {
    switch (type) {
      case 'trade':
        return { label: 'Trade', bg: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
      case 'watchlist':
        return { label: 'Watchlist', bg: 'bg-blue-100 text-blue-800 border-blue-300' };
      case 'screener':
        return { label: 'Screener', bg: 'bg-purple-100 text-purple-800 border-purple-300' };
      case 'ips':
        return { label: 'IPS Update', bg: 'bg-amber-100 text-amber-800 border-amber-300' };
      case 'news':
        return { label: 'News Tag', bg: 'bg-cyan-100 text-cyan-800 border-cyan-300' };
      case 'approved':
        return { label: 'Stock List', bg: 'bg-indigo-100 text-indigo-800 border-indigo-300' };
      case 'ai_log':
        return { label: 'AI Audit', bg: 'bg-slate-100 text-slate-800 border-slate-300' };
      case 'trade_edit':
        return { label: 'Trade Revision', bg: 'bg-orange-100 text-orange-800 border-orange-300' };
      case 'reconciliation':
        return { label: 'Reconciliation', bg: 'bg-teal-100 text-teal-800 border-teal-300' };
      default:
        return { label: 'Event', bg: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const handleActivityClick = (item) => {
    if (item.type === 'trade' || item.type === 'trade_edit') {
      onSelectTab('trades');
    } else if (item.type === 'watchlist') {
      onSelectTab('watchlist');
    } else if (item.type === 'screener') {
      onSelectTab('screener');
    } else if (item.type === 'ips' || item.type === 'reconciliation') {
      onSelectTab('overview');
    } else if (item.type === 'news') {
      onSelectTab('news');
    } else if (item.type === 'approved') {
      onSelectTab('approved');
    } else if (item.type === 'ai_log') {
      onSelectTab('ai-log');
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 0. Critical WInS Deadline Alert Banner (within 3 days or today) */}
      {urgentDeadlines.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 sm:p-5 text-rose-950 shadow-md flex items-start space-x-3.5 animate-in fade-in duration-300">
          <div className="p-2.5 bg-rose-600 text-white rounded-xl flex-shrink-0">
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full border border-rose-300">
                🚨 Critical WInS Deadline Alert
              </span>
              <span className="text-xs font-bold text-rose-800">
                Action Required Within 72 Hours!
              </span>
            </div>
            <div className="mt-2 space-y-1.5">
              {urgentDeadlines.map((item) => {
                const st = getDeadlineStatus(item.deadline_date);
                return (
                  <div key={item.id} className="text-xs flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900">• {item.title}:</span>
                    <span className="font-extrabold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                      {st.isOverdue ? 'DUE TODAY / OVERDUE!' : st.days === 0 ? 'DUE TODAY!' : `ONLY ${st.days} DAY${st.days > 1 ? 'S' : ''} REMAINING`}
                    </span>
                    <span className="text-slate-600 font-medium">({item.deadline_date})</span>
                    {item.description && <span className="text-slate-500 italic">— {item.description}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 1. Hero Team Banner with Competition Deadline Countdowns */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white border border-blue-900/50 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-3 py-0.5 rounded-full border border-blue-400/30">
                Wharton Investment Simulator (WInS)
              </span>
              <span className="text-xs text-slate-400">• Team Portal: Arnav, Jaivish, Harsimar, Nairit</span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Investment Management Command Center
            </h1>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Institutional-grade portfolio governance for managing a shared $500,000 virtual capital account.
              Zero AI fabrication, verified market filings, rules-based sector macro rotation, and full client IPS traceability.
            </p>
          </div>

          {/* Countdown Cards */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3 self-start lg:self-center w-full sm:w-auto">
            
            {/* Oct 10 Countdown */}
            <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 flex-1 sm:min-w-[145px] text-center">
              <span className="text-[10px] uppercase font-bold text-amber-400 flex items-center justify-center space-x-1">
                <Clock className="w-3 h-3" />
                <span>First Trade Due</span>
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-white">
                {timeLeftOct10.days}d {timeLeftOct10.hours}h
              </div>
              <span className="text-[11px] text-slate-400 block font-medium">October 10 Deadline</span>
            </div>

            {/* Dec 5 Countdown */}
            <div className="bg-slate-800/90 rounded-xl p-3.5 border border-slate-700 flex-1 sm:min-w-[145px] text-center">
              <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-center space-x-1">
                <Award className="w-3 h-3" />
                <span>Trading Closes</span>
              </span>
              <div className="text-xl sm:text-2xl font-black font-mono mt-1 text-white">
                {timeLeftDec5.days}d {timeLeftDec5.hours}h
              </div>
              <span className="text-[11px] text-slate-400 block font-medium">December 5 Final Close</span>
            </div>

          </div>

        </div>
      </div>

      {/* 2. Top Snapshots: Portfolio & Client IPS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Portfolio Snapshot */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Portfolio Equity</span>
              <DollarSign className="w-4 h-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold font-mono text-slate-900 mt-2">
              ${Number(totalPortfolioValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className={`text-xs font-semibold mt-1 inline-block ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
              {isProfit ? '+' : ''}${Number(totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ({isProfit ? '+' : ''}{totalPnlPct}%)
            </span>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Cash: ${Number(cashRemaining).toLocaleString()} ({cashPct}%)</span>
            <button
              onClick={() => onSelectTab('overview')}
              className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <span>Overview</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Client IPS Snapshot */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Client IPS Profile</span>
              <Target className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="mt-2 space-y-1 text-xs">
              <div className="flex items-center space-x-2">
                <span className="text-slate-500 font-medium">Objective:</span>
                <span className="font-bold text-slate-900 capitalize px-2 py-0.5 rounded bg-blue-50 text-blue-800 text-[11px]">
                  {ips?.objective || 'Growth'}
                </span>
                <span className="font-bold text-slate-900 capitalize px-2 py-0.5 rounded bg-amber-50 text-amber-800 text-[11px]">
                  {ips?.risk_tolerance || 'Moderate'} Risk
                </span>
              </div>
              <div className="text-slate-600 truncate text-[11px] pt-1" title={ips?.constraints}>
                <strong>Constraints: </strong>{ips?.constraints || 'No leverage, max 20% position weight'}
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Benchmark: {ips?.benchmark || 'S&P 500'}</span>
            <button
              onClick={() => onSelectTab('overview')}
              className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <span>View IPS</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Governance & Rules Compliance Snapshot */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">WInS Rule Compliance</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Client IPS Alignment:</span>
                <span className="font-bold font-mono text-emerald-600">{ipsCompliance}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Approved Stock Directory:</span>
                <span className="font-bold font-mono text-blue-600">{approvedCount} Tickers</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Open Positions:</span>
                <span className="font-bold font-mono text-slate-900">{openTrades.length} Active</span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Guidebook Checked</span>
            <button
              onClick={() => onSelectTab('approved')}
              className="text-blue-600 font-semibold hover:underline flex items-center space-x-0.5"
            >
              <span>Approved List</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 3. Real-Time Team Activity Feed (Phase 4 Deliverable) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-bold text-slate-900">Recent Team Activity</h2>
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[11px] text-slate-400 font-medium hidden sm:inline">Live Team Audit Trail</span>
              </div>
              <p className="text-xs text-slate-500">Reverse-chronological log of trades, watchlist entries, IPS changes, and analyst tags</p>
            </div>
          </div>

          <div className="flex items-center space-x-2 self-start sm:self-center">
            <button
              onClick={loadFeed}
              disabled={isLoadingFeed}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs flex items-center space-x-1"
              title="Refresh activity feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFeed ? 'animate-spin text-blue-600' : ''}`} />
              <span className="hidden sm:inline text-[11px]">Refresh</span>
            </button>
            <button
              onClick={() => setFeedLimit(feedLimit === 8 ? 15 : 8)}
              className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 rounded-lg transition"
            >
              {feedLimit === 8 ? 'Show More (15)' : 'Show Less (8)'}
            </button>
          </div>
        </div>

        {/* Activity Items List */}
        <div className="mt-4 divide-y divide-slate-100">
          {activityFeed.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">
              {isLoadingFeed ? 'Loading recent activities...' : 'No activity recorded yet. Trades, watchlist additions, notes, and IPS updates will appear here.'}
            </div>
          ) : (
            activityFeed.slice(0, feedLimit).map((item) => {
              const badge = getActivityBadge(item.type);
              return (
                <div
                  key={item.id}
                  onClick={() => handleActivityClick(item)}
                  className="py-3 px-2 rounded-lg hover:bg-slate-50/80 transition cursor-pointer flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border flex-shrink-0 ${badge.bg}`}>
                      {badge.label}
                    </span>
                    <p className="text-xs font-medium text-slate-800 truncate group-hover:text-blue-600 transition">
                      {item.text}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 text-slate-400">
                    <span className="text-[11px] font-mono whitespace-nowrap">{item.relative_time}</span>
                    <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-blue-600 transition" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 4. Module Launchpad Grid */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">Institutional Navigation Launchpad</h2>
            <p className="text-xs text-slate-500 mt-0.5">Quick access to all research, valuation, governance, and trading tools</p>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-full self-start sm:self-auto">
            12 Institutional Modules
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          
          {/* Phase 4: Watchlist Pipeline */}
          <button
            onClick={() => onSelectTab('watchlist')}
            className="p-4 rounded-xl border border-blue-200 bg-blue-50/30 hover:border-blue-500 hover:bg-white hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 w-fit rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
                <Eye className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">
                Phase 4
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-blue-600 transition">Watchlist Pipeline</h3>
            <p className="text-xs text-slate-500 mt-1">Prospective stock pipeline with target prices, thesis tracking, and 1-click Convert to Trade.</p>
          </button>

          {/* Phase 4: Financial Statements */}
          <button
            onClick={() => onSelectTab('statements')}
            className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/30 hover:border-indigo-500 hover:bg-white hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 w-fit rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                Phase 4
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-indigo-600 transition">Financial Statement Fetcher</h3>
            <p className="text-xs text-slate-500 mt-1">Raw Income Statement, Balance Sheet, and Cash Flow filings with annual/quarterly toggles.</p>
          </button>

          {/* Phase 4: Compare View */}
          <button
            onClick={() => onSelectTab('compare')}
            className="p-4 rounded-xl border border-purple-200 bg-purple-50/30 hover:border-purple-500 hover:bg-white hover:shadow-md transition text-left group"
          >
            <div className="flex items-center justify-between">
              <div className="p-2 w-fit rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
                <Scale className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">
                Phase 4
              </span>
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-purple-600 transition">Peer Comparison Matrix</h3>
            <p className="text-xs text-slate-500 mt-1">Side-by-side 2–4 ticker fundamentals comparison with green best-in-class highlights.</p>
          </button>

          {/* 1. Trade Log */}
          <button
            onClick={() => onSelectTab('trades')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
              <ListOrdered className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-blue-600 transition">Trade Log & Execution</h3>
            <p className="text-xs text-slate-500 mt-1">Execute virtual holdings, record entries/exits, realize P&L, and export full CSV.</p>
          </button>

          {/* 2. Approved Stock List */}
          <button
            onClick={() => onSelectTab('approved')}
            className="p-4 rounded-xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-emerald-100 text-emerald-700 group-hover:bg-emerald-600 group-hover:text-white transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-emerald-600 transition">Approved Stock List</h3>
            <p className="text-xs text-slate-500 mt-1">Wharton guidebook eligible ticker directory with bulk paste and rule checks.</p>
          </button>

          {/* 3. Screener & Scorecard */}
          <button
            onClick={() => onSelectTab('screener')}
            className="p-4 rounded-xl border border-slate-200 hover:border-indigo-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-indigo-100 text-indigo-700 group-hover:bg-indigo-600 group-hover:text-white transition">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-indigo-600 transition">Company Screener</h3>
            <p className="text-xs text-slate-500 mt-1">Custom weighted scorecard (Nairit's weights), economic moat type, and ESG notes.</p>
          </button>

          {/* 4. Sector Dashboard */}
          <button
            onClick={() => onSelectTab('sectors')}
            className="p-4 rounded-xl border border-amber-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-amber-100 text-amber-700 group-hover:bg-amber-600 group-hover:text-white transition">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-amber-600 transition">Sector Macro Rotation</h3>
            <p className="text-xs text-slate-500 mt-1">ETF proxy price momentum (XLK, XLV), manual rate/inflation inputs, and stance rules.</p>
          </button>

          {/* 5. Benchmark & Risk */}
          <button
            onClick={() => onSelectTab('benchmark')}
            className="p-4 rounded-xl border border-slate-200 hover:border-purple-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-purple-100 text-purple-700 group-hover:bg-purple-600 group-hover:text-white transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-purple-600 transition">Benchmark & Risk Engine</h3>
            <p className="text-xs text-slate-500 mt-1">Portfolio vs S&P 500 cumulative return chart, 1W/1M/3M/YTD/All filters, Sharpe, and beta.</p>
          </button>

          {/* 6. Report Outline Skeleton */}
          <button
            onClick={() => onSelectTab('report')}
            className="p-4 rounded-xl border border-slate-200 hover:border-rose-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-rose-100 text-rose-700 group-hover:bg-rose-600 group-hover:text-white transition">
              <FileText className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-rose-600 transition">Final Report Skeleton</h3>
            <p className="text-xs text-slate-500 mt-1">Standard 8-section report editor with auto-save and full markdown document export.</p>
          </button>

          {/* 7. News Scanner */}
          <button
            onClick={() => onSelectTab('news')}
            className="p-4 rounded-xl border border-slate-200 hover:border-cyan-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-cyan-100 text-cyan-700 group-hover:bg-cyan-600 group-hover:text-white transition">
              <Newspaper className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-cyan-600 transition">RSS News Scanner</h3>
            <p className="text-xs text-slate-500 mt-1">Live financial headlines filtered by active holdings with thesis relevance tagging.</p>
          </button>

          {/* 8. AI Usage Log */}
          <button
            onClick={() => onSelectTab('ai-log')}
            className="p-4 rounded-xl border border-slate-200 hover:border-slate-800 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-slate-200 text-slate-800 group-hover:bg-slate-900 group-hover:text-white transition">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-slate-900 transition">AI Usage & Disclosure</h3>
            <p className="text-xs text-slate-500 mt-1">Member prompt audit log (Arnav/Jaivish/Harsimar/Nairit) with CSV export for WInS.</p>
          </button>

          {/* 9. Stock Fundamentals & Technical Lookup */}
          <button
            onClick={() => onSelectTab('lookup')}
            className="p-4 rounded-xl border border-slate-200 hover:border-blue-500 hover:shadow-md transition text-left group bg-slate-50/50 hover:bg-white"
          >
            <div className="p-2 w-fit rounded-lg bg-blue-100 text-blue-700 group-hover:bg-blue-600 group-hover:text-white transition">
              <Search className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm text-slate-900 mt-3 group-hover:text-blue-600 transition">Stock Lookup & Quotes</h3>
            <p className="text-xs text-slate-500 mt-1">Real-time live prices, valuation multiples, 50MA/200MA trends, and direct Trade Execution.</p>
          </button>

        </div>
      </div>

      {/* 5. Team Milestones & Competition Deadlines Manager (Phase 5) */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Competition Deadlines & Team Milestones</h2>
              <p className="text-xs text-slate-500">Official Wharton WInS milestones and internal team checkpoints for Arnav, Jaivish, Harsimar, and Nairit</p>
            </div>
          </div>
          <button
            onClick={loadDeadlines}
            disabled={isLoadingDeadlines}
            className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-800 text-xs flex items-center space-x-1 self-start sm:self-auto"
            title="Refresh deadlines"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingDeadlines ? 'animate-spin text-amber-600' : ''}`} />
            <span className="text-[11px]">Refresh</span>
          </button>
        </div>

        {/* Deadlines List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {deadlines.length === 0 ? (
            <div className="col-span-2 py-6 text-center text-xs text-slate-400">
              {isLoadingDeadlines ? 'Loading team deadlines...' : 'No deadlines found.'}
            </div>
          ) : (
            deadlines.map((item) => {
              const st = getDeadlineStatus(item.deadline_date);
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition flex flex-col justify-between ${
                    st.isUrgent
                      ? 'border-rose-300 bg-rose-50/40'
                      : st.isSoon
                      ? 'border-amber-200 bg-amber-50/30'
                      : st.isOverdue
                      ? 'border-slate-200 bg-slate-50/60 opacity-75'
                      : 'border-slate-200 bg-white hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border ${
                          item.is_hard_deadline
                            ? 'bg-rose-100 text-rose-800 border-rose-200'
                            : 'bg-blue-100 text-blue-800 border-blue-200'
                        }`}>
                          {item.is_hard_deadline ? 'Wharton Official Rule' : 'Internal Milestone'}
                        </span>
                      </div>
                      <h4 className="font-bold text-sm text-slate-900 mt-2">{item.title}</h4>
                      {item.description && (
                        <p className="text-xs text-slate-600 mt-1">{item.description}</p>
                      )}
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border inline-block ${
                        st.isOverdue
                          ? 'bg-slate-200 text-slate-700 border-slate-300'
                          : st.isUrgent
                          ? 'bg-rose-600 text-white border-rose-700 animate-pulse'
                          : st.isSoon
                          ? 'bg-amber-100 text-amber-900 border-amber-300'
                          : 'bg-blue-100 text-blue-800 border-blue-300'
                      }`}>
                        {st.isOverdue
                          ? 'Passed'
                          : st.days === 0
                          ? 'Due Today!'
                          : `${st.days}d Left`}
                      </span>
                      <span className="text-[11px] font-mono text-slate-500 block mt-1">
                        {item.deadline_date}
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span className="text-[11px]">Milestone ID: #{item.id}</span>
                    <button
                      onClick={() => handleDeleteDeadline(item.id)}
                      className="text-slate-400 hover:text-rose-600 transition p-1"
                      title="Delete milestone"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Add Milestone Form */}
        <form onSubmit={handleAddDeadline} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
          <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Add Internal Team Milestone or Wharton Submission Target</span>
          </div>

          {deadlineError && (
            <div className="text-xs text-rose-600 font-semibold">{deadlineError}</div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Sector Macro Review"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Target Date *</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                required
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-600 block mb-1">Description</label>
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Key deliverables or assignee"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={newIsHard}
                onChange={(e) => setNewIsHard(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              <span className="font-medium">Strict Wharton Hard Deadline (Rule requirement)</span>
            </label>

            <button
              type="submit"
              disabled={isAddingDeadline}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition disabled:opacity-50 flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isAddingDeadline ? 'Saving...' : 'Add Milestone'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* 6. Institutional Governance & Database Backup (Phase 5) */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl p-5 sm:p-6 text-white border border-slate-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Institutional Governance & Concurrency Assurance
            </span>
          </div>
          <h3 className="text-lg font-bold text-white">Full System Database Backup (.json)</h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Exports all 12 SQLite database tables (trades, audit edits, reconciliation history, approved stocks, IPS, sectors, watchlist, and AI logs) into a single timestamped JSON file. Concurrency protected by SQLite WAL mode and 5000ms busy timeout for simultaneous 4-member editing.
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
              PRAGMA journal_mode=WAL
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
              PRAGMA busy_timeout=5000
            </span>
            <span className="text-[10px] bg-slate-800 px-2 py-0.5 rounded border border-slate-700 text-slate-300">
              Zero AI Fabrication Guarantee
            </span>
          </div>
        </div>

        <button
          onClick={handleBackupDownload}
          disabled={isDownloadingBackup}
          className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center space-x-2 transition shadow-md flex-shrink-0 ${
            backupSuccess
              ? 'bg-emerald-600 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50'
          }`}
        >
          {backupSuccess ? (
            <>
              <Check className="w-4 h-4" />
              <span>Backup Downloaded!</span>
            </>
          ) : (
            <>
              <Download className={`w-4 h-4 ${isDownloadingBackup ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingBackup ? 'Exporting All Tables...' : 'Export Full Backup (.json)'}</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
