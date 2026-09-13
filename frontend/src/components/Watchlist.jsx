import React, { useState, useEffect, useMemo } from 'react';
import {
  Bookmark, Plus, Search, Trash2, ArrowUpRight, CheckCircle2,
  AlertCircle, DollarSign, TrendingUp, ExternalLink, Loader2,
  FileText, ShieldCheck, Tag
} from 'lucide-react';
import { api } from '../services/api';

export default function Watchlist({
  onAddTradeWithTicker,
  onSelectTickerForLookup,
  onSelectTickerForStatements
}) {
  const [watchlist, setWatchlist] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // New Watchlist Form States
  const [ticker, setTicker] = useState('');
  const [targetPrice, setTargetPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const loadWatchlist = async () => {
    setIsLoading(true);
    try {
      const data = await api.getWatchlist();
      setWatchlist(data);
    } catch (err) {
      console.error('Failed to load watchlist:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadWatchlist();
  }, []);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!ticker.trim()) {
      setFormError('Please enter a valid ticker symbol.');
      return;
    }

    setIsSubmitting(true);
    try {
      await api.addWatchlistItem({
        ticker: ticker.trim().toUpperCase(),
        notes: notes.trim(),
        target_price: targetPrice ? parseFloat(targetPrice) : null
      });
      setTicker('');
      setTargetPrice('');
      setNotes('');
      setIsAddModalOpen(false);
      await loadWatchlist();
    } catch (err) {
      setFormError(err.message || 'Failed to add ticker to watchlist.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (sym) => {
    if (!window.confirm(`Remove ${sym} from prospective watchlist?`)) return;
    try {
      await api.deleteWatchlistItem(sym);
      await loadWatchlist();
    } catch (err) {
      console.error('Failed to delete watchlist item:', err);
    }
  };

  const filteredWatchlist = useMemo(() => {
    return watchlist.filter((item) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.ticker?.toLowerCase().includes(q) ||
        item.company_name?.toLowerCase().includes(q) ||
        item.sector?.toLowerCase().includes(q) ||
        item.notes?.toLowerCase().includes(q)
      );
    });
  }, [watchlist, searchQuery]);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Pipeline Management
            </span>
            <span className="text-xs text-slate-400">• Prospective Equities Under Consideration</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Research Watchlist</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Track potential trade ideas, monitor target entry prices, and convert to executed positions in one click.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add to Watchlist</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search watchlist by ticker, name, sector, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </div>
        <span className="text-slate-500 font-mono text-xs">
          {filteredWatchlist.length} {filteredWatchlist.length === 1 ? 'ticker' : 'tickers'} in pipeline
        </span>
      </div>

      {/* Watchlist Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-16 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
            <span>Loading watchlist metrics...</span>
          </div>
        ) : filteredWatchlist.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticker / Company</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4 text-right">Live Price</th>
                  <th className="py-3 px-4 text-right">Target Price</th>
                  <th className="py-3 px-4 text-right">P/E</th>
                  <th className="py-3 px-4 text-right">52W Range</th>
                  <th className="py-3 px-4">Team Thesis / Trigger Notes</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-sans">
                {filteredWatchlist.map((item) => {
                  const hasPrice = item.current_price != null;
                  const hasTarget = item.target_price != null;
                  const priceDiff = hasPrice && hasTarget ? ((item.current_price - item.target_price) / item.target_price) * 100 : null;

                  return (
                    <tr key={item.ticker} className="hover:bg-slate-50/80 transition-colors">
                      {/* Ticker & Name */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-bold text-slate-900 font-mono text-sm">{item.ticker}</span>
                          <button
                            onClick={() => onSelectTickerForLookup?.(item.ticker)}
                            className="text-slate-400 hover:text-indigo-600"
                            title="Lookup live company fundamentals"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                        <div className="text-slate-500 text-[11px] truncate max-w-[140px]">{item.company_name}</div>
                      </td>

                      {/* Sector */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px]">
                          {item.sector || 'Other'}
                        </span>
                      </td>

                      {/* Live Market Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        {hasPrice ? `$${Number(item.current_price).toFixed(2)}` : '—'}
                      </td>

                      {/* Target Price */}
                      <td className="py-3.5 px-4 text-right font-mono whitespace-nowrap">
                        {hasTarget ? (
                          <div>
                            <span className="font-bold text-slate-800">${Number(item.target_price).toFixed(2)}</span>
                            {priceDiff != null && (
                              <span className={`block text-[10px] ${priceDiff <= 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                {priceDiff <= 0 ? 'In Target Range' : `+${priceDiff.toFixed(1)}% above`}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">None</span>
                        )}
                      </td>

                      {/* P/E Ratio */}
                      <td className="py-3.5 px-4 text-right font-mono text-slate-800 whitespace-nowrap">
                        {item.pe_ratio != null ? `${Number(item.pe_ratio).toFixed(1)}x` : '—'}
                      </td>

                      {/* 52W Range */}
                      <td className="py-3.5 px-4 text-right font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {item.fifty_two_week_low != null && item.fifty_two_week_high != null
                          ? `$${Number(item.fifty_two_week_low).toFixed(0)} - $${Number(item.fifty_two_week_high).toFixed(0)}`
                          : '—'}
                      </td>

                      {/* Notes / Trigger */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <p className="text-slate-700 text-xs truncate" title={item.notes}>
                          {item.notes || <span className="text-slate-400 italic">No notes logged</span>}
                        </p>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => onAddTradeWithTicker(item.ticker)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded font-semibold text-[11px] flex items-center space-x-1 border border-emerald-200 transition"
                            title="Pre-fill into Trade Execution modal"
                          >
                            <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                            <span>Convert to Trade</span>
                          </button>

                          <button
                            onClick={() => onSelectTickerForStatements?.(item.ticker)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="View Financial Statements"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDelete(item.ticker)}
                            className="p-1 text-slate-300 hover:text-rose-600 transition"
                            title="Remove from Watchlist"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
          <div className="p-16 text-center text-slate-500 text-sm">
            <Bookmark className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-semibold text-slate-700">Your watchlist is empty.</p>
            <p className="text-xs text-slate-400 mt-1">Add prospective tickers you are analyzing before executing a virtual trade.</p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-semibold"
            >
              Add First Prospective Ticker
            </button>
          </div>
        )}
      </div>

      {/* Add to Watchlist Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add to Research Watchlist</h3>
                <p className="text-xs text-slate-400">Track prospective equities before executing</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ticker Symbol *
                </label>
                <input
                  type="text"
                  placeholder="e.g. NVDA, AMZN, MSFT"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full uppercase font-mono font-bold text-sm px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Target Entry Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="e.g. 115.50 (optional)"
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(e.target.value)}
                  className="w-full font-mono px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Thesis Trigger / Watch Notes
                </label>
                <textarea
                  rows="3"
                  placeholder="What is the team waiting for? e.g. Pullback to 50-day MA, next earnings report, margin expansion evidence..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Add Ticker</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
