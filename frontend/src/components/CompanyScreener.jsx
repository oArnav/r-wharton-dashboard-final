import React, { useState, useEffect, useMemo } from 'react';
import {
  SlidersHorizontal, Search, Download, Plus, Save,
  CheckCircle2, AlertCircle, Loader2, Sparkles, Filter,
  ShieldCheck, ArrowUpDown, ChevronDown, ChevronUp, FileSpreadsheet
} from 'lucide-react';
import { api } from '../services/api';

const MOAT_OPTIONS = [
  { id: 'brand', label: 'Brand & Pricing Power' },
  { id: 'switching costs', label: 'High Switching Costs' },
  { id: 'network effect', label: 'Network Effects' },
  { id: 'low-cost', label: 'Low-Cost Advantage' },
  { id: 'none', label: 'No Significant Moat' }
];

export default function CompanyScreener({
  onSelectTickerForLookup,
  onAddTradeWithTicker,
  approvedTickers = new Set()
}) {
  const [tickerInput, setTickerInput] = useState('AAPL, MSFT, NVDA, AMZN, GOOGL, JPM, JNJ, XOM');
  const [screenerData, setScreenerData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');

  // Customizable Weights (Nairit's Weights Engine)
  const [weights, setWeights] = useState({
    roe: 25,
    margin: 20,
    pe: 20,
    debt: 15,
    growth: 20
  });

  const [showWeightSliders, setShowWeightSliders] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [moatFilter, setMoatFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all'); // 'all' | 'approved' | 'unapproved'
  const [sortField, setSortField] = useState('composite_score');
  const [sortDirection, setSortDirection] = useState('desc');

  // Edit qualitative notes modal / inline state
  const [editingCompany, setEditingCompany] = useState(null);

  const fetchScorecards = async (customWeights = weights) => {
    setIsLoading(true);
    setError('');
    try {
      const tickers = tickerInput.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean);
      const data = await api.getScreenerScorecard(tickers, customWeights);
      setScreenerData(data);
    } catch (err) {
      setError(err.message || 'Failed to fetch screener scorecard.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchScorecards();
  }, []);

  const handleWeightChange = (key, val) => {
    const num = parseFloat(val) || 0;
    const newWeights = { ...weights, [key]: num };
    setWeights(newWeights);
    fetchScorecards(newWeights);
  };

  const handleSaveNotes = async (ticker, moat, esg, bmodel) => {
    try {
      await api.saveScreenerNotes(ticker, {
        moat_type: moat,
        esg_note: esg,
        business_model: bmodel
      });
      setSaveSuccess(`Updated qualitative notes for ${ticker}`);
      setTimeout(() => setSaveSuccess(''), 3000);
      setEditingCompany(null);
      fetchScorecards();
    } catch (err) {
      setError(err.message || 'Failed to save notes.');
    }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const sectors = useMemo(() => {
    const s = new Set();
    screenerData.forEach((item) => {
      if (item.sector) s.add(item.sector);
    });
    return Array.from(s).sort();
  }, [screenerData]);

  const filteredData = useMemo(() => {
    return screenerData
      .filter((item) => {
        if (moatFilter !== 'all' && item.moat_type !== moatFilter) return false;
        if (sectorFilter !== 'all' && item.sector !== sectorFilter) return false;

        const isApproved = approvedTickers && typeof approvedTickers.has === 'function'
          ? approvedTickers.has(item.ticker?.toUpperCase())
          : false;
        if (approvalFilter === 'approved' && !isApproved) return false;
        if (approvalFilter === 'unapproved' && isApproved) return false;

        if (searchFilter.trim()) {
          const q = searchFilter.toLowerCase();
          const matchTicker = item.ticker?.toLowerCase().includes(q);
          const matchName = item.company_name?.toLowerCase().includes(q);
          const matchMoat = item.moat_type?.toLowerCase().includes(q);
          if (!matchTicker && !matchName && !matchMoat) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortDirection === 'asc' ? valA - valB : valB - valA;
        }
        valA = String(valA || '');
        valB = String(valB || '');
        return sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
      });
  }, [screenerData, moatFilter, sectorFilter, approvalFilter, searchFilter, sortField, sortDirection, approvedTickers]);

  // CSV Export
  const exportScreenerCsv = () => {
    if (!filteredData.length) return;
    const headers = [
      'Ticker', 'Company Name', 'Wharton Status', 'Sector', 'Composite Score',
      'P/E Ratio', 'ROE (%)', 'Net Margin (%)', 'Debt-to-Equity (%)',
      'YoY Revenue Growth (%)', 'Moat Type', 'ESG Notes', 'Business Model'
    ];
    const rows = filteredData.map((d) => {
      const isApproved = approvedTickers && typeof approvedTickers.has === 'function'
        ? approvedTickers.has(d.ticker?.toUpperCase())
        : false;
      return [
        d.ticker,
        `"${(d.company_name || '').replace(/"/g, '""')}"`,
        isApproved ? 'Approved' : 'Unapproved',
        d.sector,
        d.composite_score,
        d.pe_ratio || '',
        d.roe ? (d.roe * 100).toFixed(2) : '',
        d.net_margin ? (d.net_margin * 100).toFixed(2) : '',
        d.debt_to_equity || '',
        d.revenue_growth_yoy ? (d.revenue_growth_yoy * 100).toFixed(2) : '',
        d.moat_type || 'none',
        `"${(d.esg_note || '').replace(/"/g, '""')}"`,
        `"${(d.business_model || '').replace(/"/g, '""')}"`
      ];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'wins_company_screener.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Quantitative & Qualitative Screening
            </span>
            <span className="text-xs text-slate-400">• Customizable Multi-Factor Scorecard</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Company Screener & Scorecard</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto-fetch valuation, profitability, balance sheet ratios, and layer on qualitative moat analysis.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowWeightSliders(!showWeightSliders)}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border ${
              showWeightSliders ? 'bg-blue-50 text-blue-700 border-blue-300' : 'bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Adjust Weights</span>
          </button>

          <button
            onClick={exportScreenerCsv}
            disabled={!filteredData.length}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-300 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Ticker Search / Input Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter comma-separated tickers (e.g. AAPL, MSFT, NVDA, JNJ, XOM)..."
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2 uppercase font-mono font-semibold text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => fetchScorecards()}
            disabled={isLoading || !tickerInput.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Screen Companies</span>
          </button>
        </div>

        {/* Weights Engine Sliders Panel */}
        {showWeightSliders && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-800">
              <span className="flex items-center space-x-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                <span>Nairit's Scorecard Weighting Model (Normalized to 100%)</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Total: {weights.roe + weights.margin + weights.pe + weights.debt + weights.growth}%
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-5 gap-4 text-xs">
              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  ROE Weight: <strong className="text-slate-900">{weights.roe}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.roe}
                  onChange={(e) => handleWeightChange('roe', e.target.value)}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  Net Margin: <strong className="text-slate-900">{weights.margin}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.margin}
                  onChange={(e) => handleWeightChange('margin', e.target.value)}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  P/E Valuation: <strong className="text-slate-900">{weights.pe}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.pe}
                  onChange={(e) => handleWeightChange('pe', e.target.value)}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  Debt-to-Equity: <strong className="text-slate-900">{weights.debt}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.debt}
                  onChange={(e) => handleWeightChange('debt', e.target.value)}
                  className="w-full accent-blue-600"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 font-medium block mb-1">
                  Growth YoY: <strong className="text-slate-900">{weights.growth}%</strong>
                </label>
                <input
                  type="range"
                  min="0"
                  max="50"
                  step="5"
                  value={weights.growth}
                  onChange={(e) => handleWeightChange('growth', e.target.value)}
                  className="w-full accent-blue-600"
                />
              </div>
            </div>
          </div>
        )}

        {/* Filter bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs pt-1 border-t border-slate-100">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filter by name, ticker, moat..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Sector:</span>
              <select
                value={sectorFilter}
                onChange={(e) => setSectorFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Sectors ({sectors.length})</option>
                {sectors.map((sec) => (
                  <option key={sec} value={sec}>{sec}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Wharton List:</span>
              <select
                value={approvalFilter}
                onChange={(e) => setApprovalFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Tickers</option>
                <option value="approved">Approved Only</option>
                <option value="unapproved">Unapproved Only</option>
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <span className="text-slate-500 font-medium">Moat Filter:</span>
              <select
                value={moatFilter}
                onChange={(e) => setMoatFilter(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white"
              >
                <option value="all">All Moats</option>
                {MOAT_OPTIONS.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Screener Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('composite_score')}>
                    <div className="flex items-center space-x-1">
                      <span>Score / Rank</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Ticker / Company</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">P/E</th>
                  <th className="py-3 px-4 text-right">ROE</th>
                  <th className="py-3 px-4 text-right">Net Margin</th>
                  <th className="py-3 px-4 text-right">D/E</th>
                  <th className="py-3 px-4 text-right">YoY Rev</th>
                  <th className="py-3 px-4">Economic Moat</th>
                  <th className="py-3 px-4">Qualitative Analysis</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredData.map((item, rankIdx) => {
                  const score = item.composite_score || 0;
                  const isApproved = approvedTickers && typeof approvedTickers.has === 'function'
                    ? approvedTickers.has(item.ticker?.toUpperCase())
                    : false;
                  const scoreColor =
                    score >= 75
                      ? 'bg-emerald-500 text-white'
                      : score >= 55
                      ? 'bg-blue-600 text-white'
                      : score >= 40
                      ? 'bg-amber-500 text-white'
                      : 'bg-rose-500 text-white';

                  return (
                    <tr key={item.ticker} className="hover:bg-slate-50/80 transition-colors">
                      {/* Score / Rank */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          <span className="text-slate-400 font-mono text-[11px]">#{rankIdx + 1}</span>
                          <span className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${scoreColor}`}>
                            {score}
                          </span>
                        </div>
                      </td>

                      {/* Ticker & Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 font-mono text-sm">{item.ticker}</span>
                          {isApproved ? (
                            <span
                              className="inline-flex items-center text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200"
                              title="Approved under Wharton WInS competition rules"
                            >
                              <CheckCircle2 className="w-2.5 h-2.5 mr-0.5 text-emerald-600" />
                              Approved
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200"
                              title="Not on Approved List - Verify this ticker is permitted under current competition rules"
                            >
                              <AlertCircle className="w-2.5 h-2.5 mr-0.5 text-amber-600" />
                              Unapproved
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[140px]">{item.company_name}</div>
                      </td>

                      {/* Sector */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {item.sector}
                      </td>

                      {/* P/E */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                        {item.pe_ratio != null ? `${Number(item.pe_ratio).toFixed(1)}x` : '—'}
                      </td>

                      {/* ROE */}
                      <td className="py-3.5 px-4 text-right font-mono font-medium text-slate-800">
                        {item.roe != null ? `${(item.roe * 100).toFixed(1)}%` : '—'}
                      </td>

                      {/* Net Margin */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                        {item.net_margin != null ? `${(item.net_margin * 100).toFixed(1)}%` : '—'}
                      </td>

                      {/* Debt-to-Equity */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-800">
                        {item.debt_to_equity != null ? `${Number(item.debt_to_equity).toFixed(0)}%` : '—'}
                      </td>

                      {/* YoY Revenue */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {item.revenue_growth_yoy != null ? (
                          <span className={item.revenue_growth_yoy >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                            {item.revenue_growth_yoy >= 0 ? '+' : ''}{(item.revenue_growth_yoy * 100).toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>

                      {/* Economic Moat */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800 border border-slate-200">
                          {MOAT_OPTIONS.find((m) => m.id === item.moat_type)?.label || item.moat_type || 'None'}
                        </span>
                      </td>

                      {/* Qualitative Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="truncate text-slate-700" title={item.business_model}>
                          <strong className="text-slate-500 text-[10px]">Model: </strong>
                          {item.business_model || <span className="text-slate-400 italic">No notes</span>}
                        </div>
                        {item.esg_note && (
                          <div className="truncate text-emerald-700 text-[10px] mt-0.5" title={item.esg_note}>
                            <strong>ESG: </strong>{item.esg_note}
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => setEditingCompany(item)}
                            className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium"
                            title="Edit Moat, ESG, and Business Model notes"
                          >
                            Edit Notes
                          </button>
                          <button
                            onClick={() => onAddTradeWithTicker(item.ticker)}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[11px] font-semibold"
                            title="Pre-fill into Trade Log"
                          >
                            + Trade
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm">
            <SlidersHorizontal className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-700">No screener results.</p>
            <p className="text-xs text-slate-400 mt-1">Input tickers above and click 'Screen Companies' to compute scorecards.</p>
          </div>
        )}
      </div>

      {/* Edit Qualitative Notes Modal */}
      {editingCompany && (
        <EditNotesModal
          company={editingCompany}
          onClose={() => setEditingCompany(null)}
          onSave={handleSaveNotes}
        />
      )}

    </div>
  );
}

function EditNotesModal({ company, onClose, onSave }) {
  const [moat, setMoat] = useState(company.moat_type || 'none');
  const [esg, setEsg] = useState(company.esg_note || '');
  const [bmodel, setBmodel] = useState(company.business_model || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Qualitative Analysis — {company.ticker}</h3>
            <p className="text-xs text-slate-400">{company.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSave(company.ticker, moat, esg.trim(), bmodel.trim());
          }}
          className="p-6 space-y-4 text-xs"
        >
          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Economic Moat Classification *
            </label>
            <select
              value={moat}
              onChange={(e) => setMoat(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
            >
              {MOAT_OPTIONS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Business Model Summary
            </label>
            <textarea
              rows="3"
              value={bmodel}
              onChange={(e) => setBmodel(e.target.value)}
              placeholder="How does the company generate cash? Pricing power, recurring revenue, operating leverage..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              ESG & Sustainability Notes
            </label>
            <textarea
              rows="2"
              value={esg}
              onChange={(e) => setEsg(e.target.value)}
              placeholder="Carbon emissions, corporate governance, labor safety, supply chain audit..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
            >
              Save Notes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
