import React, { useState, useEffect } from 'react';
import {
  GitCompare, Search, Plus, X, ArrowUpRight, CheckCircle2,
  AlertCircle, ShieldCheck, Download, Loader2, Award, FileText
} from 'lucide-react';
import { api } from '../services/api';

const COMPARISON_PRESETS = [
  { label: 'Cloud & AI Titans', tickers: ['MSFT', 'AMZN', 'GOOGL'] },
  { label: 'Semiconductors', tickers: ['NVDA', 'AVGO', 'CRM'] },
  { label: 'Financial Giants', tickers: ['JPM', 'BAC', 'V'] },
  { label: 'Consumer & Retail', tickers: ['WMT', 'COST', 'PG'] },
  { label: 'Healthcare Leaders', tickers: ['JNJ', 'UNH', 'LLY'] }
];

export default function CompanyCompare({
  onAddTradeWithTicker,
  onSelectTickerForLookup,
  onSelectTickerForStatements
}) {
  const [selectedTickers, setSelectedTickers] = useState(['AAPL', 'MSFT', 'NVDA']);
  const [tickerInput, setTickerInput] = useState('');
  const [compareData, setCompareData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchComparison = async (tickersToFetch = selectedTickers) => {
    if (!tickersToFetch || tickersToFetch.length < 2) return;
    setIsLoading(true);
    setError('');
    try {
      const res = await api.compareStocks(tickersToFetch);
      setCompareData(res.comparison || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch comparison metrics.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchComparison(selectedTickers);
  }, [selectedTickers]);

  const handleAddTicker = (e) => {
    e.preventDefault();
    const sym = tickerInput.trim().toUpperCase();
    if (!sym) return;
    if (selectedTickers.includes(sym)) {
      setError(`Ticker ${sym} is already in comparison.`);
      return;
    }
    if (selectedTickers.length >= 4) {
      setError('You can compare a maximum of 4 companies at a time.');
      return;
    }
    const updated = [...selectedTickers, sym];
    setSelectedTickers(updated);
    setTickerInput('');
    fetchComparison(updated);
  };

  const handleRemoveTicker = (sym) => {
    if (selectedTickers.length <= 2) {
      setError('Comparison requires at least 2 companies.');
      return;
    }
    const updated = selectedTickers.filter((t) => t !== sym);
    setSelectedTickers(updated);
    fetchComparison(updated);
  };

  const handleApplyPreset = (presetTickers) => {
    setSelectedTickers(presetTickers);
    fetchComparison(presetTickers);
  };

  // Helper to find best value for a metric
  const getBestValue = (key, higherIsBetter = true) => {
    const valid = compareData
      .map((d) => d[key])
      .filter((v) => v != null && !isNaN(v) && v > 0);
    if (!valid.length) return null;
    return higherIsBetter ? Math.max(...valid) : Math.min(...valid);
  };

  const formatPct = (val) => (val != null ? `${(val * 100).toFixed(1)}%` : '—');
  const formatMultiple = (val) => (val != null ? `${Number(val).toFixed(1)}x` : '—');
  const formatCap = (val) => {
    if (val == null) return '—';
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
    return `$${Number(val).toLocaleString()}`;
  };

  // CSV Export
  const exportCompareCsv = () => {
    if (!compareData.length) return;
    const headers = ['Metric', ...compareData.map((d) => d.ticker)];
    const metrics = [
      { label: 'Company Name', getter: (d) => d.company_name },
      { label: 'Sector', getter: (d) => d.sector },
      { label: 'Price', getter: (d) => d.current_price != null ? `$${d.current_price}` : '' },
      { label: 'P/E (Trailing)', getter: (d) => d.pe_ratio || '' },
      { label: 'P/E (Forward)', getter: (d) => d.forward_pe || '' },
      { label: 'Gross Margin', getter: (d) => d.gross_margin ? `${(d.gross_margin * 100).toFixed(1)}%` : '' },
      { label: 'Operating Margin', getter: (d) => d.operating_margin ? `${(d.operating_margin * 100).toFixed(1)}%` : '' },
      { label: 'Net Margin', getter: (d) => d.net_margin ? `${(d.net_margin * 100).toFixed(1)}%` : '' },
      { label: 'ROE', getter: (d) => d.roe ? `${(d.roe * 100).toFixed(1)}%` : '' },
      { label: 'ROA', getter: (d) => d.roa ? `${(d.roa * 100).toFixed(1)}%` : '' },
      { label: 'Debt-to-Equity', getter: (d) => d.debt_to_equity ? `${d.debt_to_equity}%` : '' },
      { label: 'Current Ratio', getter: (d) => d.current_ratio || '' },
      { label: 'Beta', getter: (d) => d.beta || '' },
      { label: 'Market Cap', getter: (d) => formatCap(d.market_cap) },
      { label: 'Moat Type', getter: (d) => d.moat_type || 'none' }
    ];

    const rows = metrics.map((m) => {
      return [`"${m.label}"`, ...compareData.map((d) => `"${m.getter(d)}"` )];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `wins_company_compare_${selectedTickers.join('_')}.csv`);
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
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Cross-Company Valuation & Fundamentals
            </span>
            <span className="text-xs text-slate-400">• Side-by-Side Factor Analysis</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Company Compare View</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Compare 2 to 4 tickers side-by-side across valuation multiples, profitability, balance sheet strength, and moats.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={exportCompareCsv}
            disabled={!compareData.length}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export Comparison</span>
          </button>
        </div>
      </div>

      {/* Ticker Management Bar & Presets */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          
          {/* Active Tickers Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Comparing:</span>
            {selectedTickers.map((sym) => (
              <span
                key={sym}
                className="inline-flex items-center space-x-1.5 bg-blue-50 border border-blue-200 text-blue-900 px-3 py-1 rounded-full text-xs font-mono font-bold"
              >
                <span>{sym}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTicker(sym)}
                  className="text-blue-400 hover:text-rose-600 transition"
                  title="Remove from comparison"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>

          {/* Add Ticker Input */}
          <form onSubmit={handleAddTicker} className="flex items-center space-x-2">
            <input
              type="text"
              placeholder="Add ticker (e.g. TSLA)..."
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              className="px-3 py-1.5 uppercase font-mono font-bold text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none w-36"
            />
            <button
              type="submit"
              disabled={!tickerInput.trim() || selectedTickers.length >= 4}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
            >
              <Plus className="w-3 h-3" />
              <span>Add</span>
            </button>
          </form>

        </div>

        {/* Industry Presets */}
        <div className="flex items-center space-x-2 text-xs overflow-x-auto pt-2 border-t border-slate-100">
          <span className="text-slate-400 font-medium text-[11px] whitespace-nowrap">Presets:</span>
          {COMPARISON_PRESETS.map((pr) => (
            <button
              key={pr.label}
              onClick={() => handleApplyPreset(pr.tickers)}
              className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-medium whitespace-nowrap transition"
            >
              {pr.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}

      {/* Comparison Grid Table */}
      {isLoading ? (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
          <span>Fetching real-time company comparisons...</span>
        </div>
      ) : compareData.length > 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              
              {/* Table Header: Companies */}
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-4 px-5 text-slate-500 font-bold uppercase tracking-wider text-[11px] w-48 bg-slate-100/70">
                    Metric / Company
                  </th>
                  {compareData.map((c) => (
                    <th key={c.ticker} className="py-4 px-5 min-w-[200px] border-l border-slate-200">
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center space-x-1.5">
                            <span className="text-base font-black font-mono text-slate-900">{c.ticker}</span>
                            {c.is_approved ? (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Approved
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                                Unapproved
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate max-w-[170px] mt-0.5">{c.company_name}</div>
                          <div className="text-[11px] font-medium text-slate-400 mt-0.5">{c.sector}</div>
                        </div>

                        <div className="text-right font-mono">
                          <span className="text-base font-bold text-slate-900 block">
                            ${c.current_price != null ? Number(c.current_price).toFixed(2) : '—'}
                          </span>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center space-x-1.5">
                        <button
                          onClick={() => onAddTradeWithTicker?.(c.ticker)}
                          className="px-2 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-semibold transition"
                        >
                          + Trade
                        </button>
                        <button
                          onClick={() => onSelectTickerForStatements?.(c.ticker)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium transition"
                        >
                          Statements
                        </button>
                        <button
                          onClick={() => onSelectTickerForLookup?.(c.ticker)}
                          className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-medium transition"
                        >
                          Lookup
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 font-sans text-xs">
                
                {/* SECTION 1: VALUATION */}
                <tr className="bg-slate-100/50 font-bold text-slate-700">
                  <td colSpan={compareData.length + 1} className="py-2 px-5 text-[11px] uppercase tracking-wider text-blue-900">
                    Valuation Multiples
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Trailing P/E</td>
                  {compareData.map((c) => {
                    const best = getBestValue('pe_ratio', false);
                    const isBest = best && c.pe_ratio === best;
                    return (
                      <td key={c.ticker} className={`py-3 px-5 border-l border-slate-200 font-mono ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-800' : ''}`}>
                        {formatMultiple(c.pe_ratio)} {isBest && '★'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Forward P/E</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {formatMultiple(c.forward_pe)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Price-to-Book (P/B)</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {formatMultiple(c.pb_ratio)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">EV / EBITDA</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {formatMultiple(c.ev_ebitda)}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Market Capitalization</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono font-semibold">
                      {formatCap(c.market_cap)}
                    </td>
                  ))}
                </tr>

                {/* SECTION 2: PROFITABILITY & RETURNS */}
                <tr className="bg-slate-100/50 font-bold text-slate-700">
                  <td colSpan={compareData.length + 1} className="py-2 px-5 text-[11px] uppercase tracking-wider text-emerald-900">
                    Profitability & Capital Returns
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Gross Margin</td>
                  {compareData.map((c) => {
                    const best = getBestValue('gross_margin', true);
                    const isBest = best && c.gross_margin === best;
                    return (
                      <td key={c.ticker} className={`py-3 px-5 border-l border-slate-200 font-mono ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-800' : ''}`}>
                        {formatPct(c.gross_margin)} {isBest && '★'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Operating Margin</td>
                  {compareData.map((c) => {
                    const best = getBestValue('operating_margin', true);
                    const isBest = best && c.operating_margin === best;
                    return (
                      <td key={c.ticker} className={`py-3 px-5 border-l border-slate-200 font-mono ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-800' : ''}`}>
                        {formatPct(c.operating_margin)} {isBest && '★'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Net Profit Margin</td>
                  {compareData.map((c) => {
                    const best = getBestValue('net_margin', true);
                    const isBest = best && c.net_margin === best;
                    return (
                      <td key={c.ticker} className={`py-3 px-5 border-l border-slate-200 font-mono ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-800' : ''}`}>
                        {formatPct(c.net_margin)} {isBest && '★'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Return on Equity (ROE)</td>
                  {compareData.map((c) => {
                    const best = getBestValue('roe', true);
                    const isBest = best && c.roe === best;
                    return (
                      <td key={c.ticker} className={`py-3 px-5 border-l border-slate-200 font-mono ${isBest ? 'bg-emerald-50/70 font-bold text-emerald-800' : ''}`}>
                        {formatPct(c.roe)} {isBest && '★'}
                      </td>
                    );
                  })}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Return on Assets (ROA)</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {formatPct(c.roa)}
                    </td>
                  ))}
                </tr>

                {/* SECTION 3: SOLVENCY, BALANCE SHEET & RISK */}
                <tr className="bg-slate-100/50 font-bold text-slate-700">
                  <td colSpan={compareData.length + 1} className="py-2 px-5 text-[11px] uppercase tracking-wider text-amber-900">
                    Solvency, Balance Sheet & Market Risk
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Debt-to-Equity</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {c.debt_to_equity != null ? `${Number(c.debt_to_equity).toFixed(1)}%` : '—'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Current Ratio</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {c.current_ratio != null ? `${Number(c.current_ratio).toFixed(2)}x` : '—'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Market Beta (5Y)</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono">
                      {c.beta != null ? Number(c.beta).toFixed(2) : '—'}
                    </td>
                  ))}
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">52-Week Range</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200 font-mono text-[11px] text-slate-500">
                      {c.fifty_two_week_low != null && c.fifty_two_week_high != null
                        ? `$${Number(c.fifty_two_week_low).toFixed(0)} - $${Number(c.fifty_two_week_high).toFixed(0)}`
                        : '—'}
                    </td>
                  ))}
                </tr>

                {/* SECTION 4: QUALITATIVE MOAT */}
                <tr className="bg-slate-100/50 font-bold text-slate-700">
                  <td colSpan={compareData.length + 1} className="py-2 px-5 text-[11px] uppercase tracking-wider text-purple-900">
                    Qualitative Moat Classification
                  </td>
                </tr>

                <tr>
                  <td className="py-3 px-5 font-medium text-slate-700 bg-slate-50/50">Economic Moat</td>
                  {compareData.map((c) => (
                    <td key={c.ticker} className="py-3 px-5 border-l border-slate-200">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-semibold text-slate-800 border border-slate-200 uppercase text-[10px]">
                        {c.moat_type || 'None'}
                      </span>
                    </td>
                  ))}
                </tr>

              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
          <GitCompare className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-700">Select at least 2 companies to compare.</p>
          <p className="text-xs text-slate-400 mt-1">Pick an industry preset above or enter tickers to build a comparison matrix.</p>
        </div>
      )}

    </div>
  );
}
