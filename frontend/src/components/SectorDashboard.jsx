import React, { useState } from 'react';
import {
  Layers, Plus, Edit2, Trash2, ArrowUpRight, ArrowDownRight,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, HelpCircle,
  RefreshCw, Loader2, X, Info
} from 'lucide-react';

export default function SectorDashboard({
  sectors = [],
  trades = [],
  summary,
  onAddSector,
  onUpdateSector,
  onDeleteSector,
  onRefresh,
  isRefreshing
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSector, setEditingSector] = useState(null);

  // Form states
  const [name, setName] = useState('');
  const [etfTicker, setEtfTicker] = useState('');
  const [inflationTrend, setInflationTrend] = useState('stable');
  const [rateDirection, setRateDirection] = useState('neutral');
  const [macroNotes, setMacroNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const openAddModal = () => {
    setEditingSector(null);
    setName('');
    setEtfTicker('');
    setInflationTrend('stable');
    setRateDirection('neutral');
    setMacroNotes('');
    setError('');
    setIsModalOpen(true);
  };

  const openEditModal = (sector) => {
    setEditingSector(sector);
    setName(sector.name);
    setEtfTicker(sector.etf_ticker);
    setInflationTrend(sector.inflation_trend || 'stable');
    setRateDirection(sector.rate_direction || 'neutral');
    setMacroNotes(sector.macro_notes || '');
    setError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name.trim() || !etfTicker.trim()) {
      setError('Sector Name and ETF Proxy ticker are required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        etf_ticker: etfTicker.trim().toUpperCase(),
        inflation_trend: inflationTrend,
        rate_direction: rateDirection,
        macro_notes: macroNotes.trim()
      };

      if (editingSector) {
        await onUpdateSector(editingSector.id, payload);
      } else {
        await onAddSector(payload);
      }
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save sector.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStanceBadge = (stance) => {
    switch (stance) {
      case 'favorable':
        return {
          label: 'FAVORABLE',
          classes: 'bg-emerald-100 text-emerald-800 border-emerald-300',
          dot: 'bg-emerald-500'
        };
      case 'unfavorable':
        return {
          label: 'UNFAVORABLE',
          classes: 'bg-rose-100 text-rose-800 border-rose-300',
          dot: 'bg-rose-500'
        };
      default:
        return {
          label: 'NEUTRAL',
          classes: 'bg-amber-100 text-amber-800 border-amber-300',
          dot: 'bg-amber-500'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Macro Strategy & Rotation
            </span>
            <span className="text-xs text-slate-400">• Sector Allocation Engine</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Sector Dashboard & Rules-Based Scoring</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Monitor real-time sector ETF momentum combined with manual macro factors (inflation, interest rates).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-blue-600' : ''}`} />
            <span>Refresh ETFs</span>
          </button>

          <button
            onClick={openAddModal}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Track New Sector</span>
          </button>
        </div>
      </div>

      {/* Rules Explainer Banner */}
      <div className="p-3.5 bg-slate-100/90 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Transparent Rules-Based Scoring: </strong>
          Sector stance is determined by mathematical if/then logic (Zero AI):
          <span className="ml-1 text-slate-700">
            [1] ETF Price &gt; 50-day Moving Average (+1 point) • [2] Falling Interest Rates (+1 point) • [3] Falling/Stable Inflation (+1 point). 
            Total &ge; 2 &rarr; <span className="font-semibold text-emerald-700">Favorable</span>; 0 to 1 &rarr; <span className="font-semibold text-amber-700">Neutral</span>; &le; -1 &rarr; <span className="font-semibold text-rose-700">Unfavorable</span>.
          </span>
        </div>
      </div>

      {/* Sector Cards / Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {sectors.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Sector Name</th>
                  <th className="py-3 px-4">ETF Proxy</th>
                  <th className="py-3 px-4 text-right">ETF Price</th>
                  <th className="py-3 px-4 text-center">50-day MA Trend</th>
                  <th className="py-3 px-4 text-right">1M Return</th>
                  <th className="py-3 px-4 text-right">3M Return</th>
                  <th className="py-3 px-4">Macro Factors (Manual)</th>
                  <th className="py-3 px-4 text-center">Portfolio Exposure</th>
                  <th className="py-3 px-4 text-center">Rules-Based Stance</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sectors.map((sec) => {
                  const etf = sec.etf_metrics || {};
                  const rules = sec.rules_eval || {};
                  const stance = getStanceBadge(rules.stance);
                  const isRetPositive1M = etf.return_1m_pct != null && etf.return_1m_pct >= 0;
                  const isRetPositive3M = etf.return_3m_pct != null && etf.return_3m_pct >= 0;

                  const openInSec = (trades || []).filter(
                    (t) => t.status === 'open' && (t.sector || '').trim().toLowerCase() === (sec.name || '').trim().toLowerCase()
                  );
                  const secVal = openInSec.reduce((sum, t) => sum + (t.market_value || (t.entry_price * t.quantity) || 0), 0);
                  const totalVal = summary?.total_portfolio_value || 500000;
                  const weight = totalVal > 0 ? ((secVal / totalVal) * 100).toFixed(1) : '0.0';

                  return (
                    <tr key={sec.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Sector Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {sec.name}
                      </td>

                      {/* ETF Proxy */}
                      <td className="py-3.5 px-4 font-mono font-semibold text-blue-600">
                        {sec.etf_ticker}
                      </td>

                      {/* ETF Price */}
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-800">
                        {etf.current_price != null ? `$${etf.current_price.toFixed(2)}` : '—'}
                      </td>

                      {/* 50MA Status */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {etf.is_above_50ma != null ? (
                          <span className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-semibold ${
                            etf.is_above_50ma ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {etf.is_above_50ma ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            <span>{etf.is_above_50ma ? 'Above 50MA' : 'Below 50MA'}</span>
                          </span>
                        ) : '—'}
                      </td>

                      {/* 1M Return */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {etf.return_1m_pct != null ? (
                          <span className={isRetPositive1M ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                            {isRetPositive1M ? '+' : ''}{etf.return_1m_pct}%
                          </span>
                        ) : '—'}
                      </td>

                      {/* 3M Return */}
                      <td className="py-3.5 px-4 text-right font-mono">
                        {etf.return_3m_pct != null ? (
                          <span className={isRetPositive3M ? 'text-emerald-600 font-semibold' : 'text-rose-600 font-semibold'}>
                            {isRetPositive3M ? '+' : ''}{etf.return_3m_pct}%
                          </span>
                        ) : '—'}
                      </td>

                      {/* Macro Factors & Notes */}
                      <td className="py-3.5 px-4 max-w-xs">
                        <div className="flex items-center space-x-2 text-[11px]">
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            Rates: <strong className="capitalize">{sec.rate_direction}</strong>
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                            Inflation: <strong className="capitalize">{sec.inflation_trend}</strong>
                          </span>
                        </div>
                        {sec.macro_notes && (
                          <p className="text-[11px] text-slate-500 mt-1 truncate" title={sec.macro_notes}>
                            {sec.macro_notes}
                          </p>
                        )}
                      </td>

                      {/* Portfolio Exposure */}
                      <td className="py-3.5 px-4 text-center font-mono">
                        {openInSec.length > 0 ? (
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                            <span>{weight}%</span>
                            <span className="text-[10px] text-blue-600 font-normal">({openInSec.length})</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0.0%</span>
                        )}
                      </td>

                      {/* Rules-Based Stance */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${stance.classes}`}
                          title={rules.rationale}
                        >
                          <span className={`w-2 h-2 rounded-full ${stance.dot}`} />
                          <span>{stance.label}</span>
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center space-x-1.5">
                          <button
                            onClick={() => openEditModal(sec)}
                            className="p-1 text-slate-400 hover:text-blue-600 transition"
                            title="Edit sector macro inputs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (window.confirm(`Remove ${sec.name} from tracked sectors?`)) {
                                onDeleteSector(sec.id);
                              }
                            }}
                            className="p-1 text-slate-400 hover:text-rose-600 transition"
                            title="Delete sector"
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
          <div className="p-12 text-center text-slate-500 text-sm">
            <Layers className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-700">No tracked sectors configured.</p>
            <button
              onClick={openAddModal}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold"
            >
              Add First Sector
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Sector Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">{editingSector ? 'Edit Tracked Sector' : 'Track New Sector'}</h3>
                <p className="text-xs text-slate-400">Configure sector ETF proxy and manual macro inputs</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  {error}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Sector Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technology, Healthcare, Energy"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Sector Proxy ETF Ticker *
                </label>
                <input
                  type="text"
                  placeholder="e.g. XLK, XLV, XLE, XLF, XLY"
                  value={etfTicker}
                  onChange={(e) => setEtfTicker(e.target.value.toUpperCase())}
                  className="w-full uppercase font-mono font-semibold px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Rate Direction
                  </label>
                  <select
                    value={rateDirection}
                    onChange={(e) => setRateDirection(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="falling">Falling / Easing</option>
                    <option value="neutral">Neutral / Unchanged</option>
                    <option value="rising">Rising / Tightening</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Inflation Trend
                  </label>
                  <select
                    value={inflationTrend}
                    onChange={(e) => setInflationTrend(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="falling">Falling / Cooling</option>
                    <option value="stable">Stable / Anchored</option>
                    <option value="rising">Rising / Accelerating</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Manual Macro Notes
                </label>
                <textarea
                  rows="2"
                  value={macroNotes}
                  onChange={(e) => setMacroNotes(e.target.value)}
                  placeholder="Qualitative macro context, supply chain bottlenecks, regulatory catalysts..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Sector</span>}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
