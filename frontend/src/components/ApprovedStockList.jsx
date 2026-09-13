import React, { useState, useMemo } from 'react';
import {
  ShieldCheck, Plus, Search, Trash2, CheckCircle2,
  AlertTriangle, UploadCloud, Loader2, X, ExternalLink
} from 'lucide-react';

export default function ApprovedStockList({
  approvedStocks = [],
  onAddStock,
  onBulkAdd,
  onDeleteStock,
  onSelectTickerForLookup
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);

  // Single Add form states
  const [ticker, setTicker] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Bulk Add state
  const [bulkInput, setBulkInput] = useState('');
  const [bulkNotes, setBulkNotes] = useState('Wharton Guidebook S&P 500 List');

  const filteredStocks = useMemo(() => {
    return approvedStocks.filter((s) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.ticker?.toLowerCase().includes(q) ||
        s.company_name?.toLowerCase().includes(q) ||
        s.sector?.toLowerCase().includes(q) ||
        s.notes?.toLowerCase().includes(q)
      );
    });
  }, [approvedStocks, searchQuery]);

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!ticker.trim()) {
      setError('Ticker symbol is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddStock({
        ticker: ticker.trim().toUpperCase(),
        company_name: companyName.trim() || ticker.trim().toUpperCase(),
        sector: sector || 'Other',
        notes: notes.trim() || 'Wharton Approved'
      });
      setTicker('');
      setCompanyName('');
      setSector('');
      setNotes('');
      setIsAddModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to add approved stock.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBulkSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const raw = bulkInput
      .split(/[\s,;\n]+/)
      .map((s) => s.trim().toUpperCase())
      .filter((s) => s.length >= 1);

    if (!raw.length) {
      setError('Please paste at least one ticker symbol.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onBulkAdd(raw, bulkNotes.trim() || 'Wharton Guidebook Bulk');
      setBulkInput('');
      setIsBulkModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to bulk import tickers.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Wharton Official Guidebook
            </span>
            <span className="text-xs text-slate-400">• Eligible Trading Universe ({approvedStocks.length} Tickers)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Approved Stock List Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage the whitelist of approved equities under Wharton WInS competition rules. Cross-checked in Trade Log and Screener.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsBulkModalOpen(true)}
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-300"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-600" />
            <span>Bulk Paste Tickers</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-start space-x-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong>Non-blocking Warning Mechanism: </strong>
          Trading an unapproved ticker triggers a visible warning badge in the Trade Log and Screener, but will not block execution in case the team has received an exception or is analyzing a spin-off.
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search approved ticker, company, or sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>
        <span className="text-slate-500 font-mono text-xs">
          Showing {filteredStocks.length} of {approvedStocks.length} approved
        </span>
      </div>

      {/* Approved Stocks Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredStocks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Ticker</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Sector</th>
                  <th className="py-3 px-4">Eligibility Notes</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredStocks.map((stock) => (
                  <tr key={stock.ticker} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-slate-900 font-mono text-sm whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <span>{stock.ticker}</span>
                        <button
                          onClick={() => onSelectTickerForLookup(stock.ticker)}
                          className="text-slate-400 hover:text-blue-600"
                          title="Lookup live company fundamentals"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-800">
                      {stock.company_name || stock.ticker}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px]">
                        {stock.sector || 'Other'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-[11px]">
                      {stock.notes || 'Wharton Approved'}
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>ELIGIBLE</span>
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (window.confirm(`Remove ${stock.ticker} from approved stock list?`)) {
                            onDeleteStock(stock.ticker);
                          }
                        }}
                        className="p-1 text-slate-300 hover:text-rose-600 transition"
                        title="Delete from approved list"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm">
            <ShieldCheck className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-700">No approved stocks match your search.</p>
          </div>
        )}
      </div>

      {/* Single Add Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Add Approved Stock</h3>
                <p className="text-xs text-slate-400">Add an eligible ticker to Wharton WInS list</p>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSingleSubmit} className="p-6 space-y-4 text-xs">
              {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Ticker Symbol *
                </label>
                <input
                  type="text"
                  placeholder="e.g. AAPL, MSFT, SPY"
                  value={ticker}
                  onChange={(e) => setTicker(e.target.value.toUpperCase())}
                  className="w-full uppercase font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg text-sm"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Apple Inc."
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Sector
                </label>
                <input
                  type="text"
                  placeholder="e.g. Technology"
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Eligibility Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified on Wharton guidebook page 14"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
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
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Add to List</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Bulk Paste Approved Tickers</h3>
                <p className="text-xs text-slate-400">Paste multiple tickers from Wharton's official guidebook</p>
              </div>
              <button onClick={() => setIsBulkModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBulkSubmit} className="p-6 space-y-4 text-xs">
              {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Paste Tickers (Comma, space, or newline separated) *
                </label>
                <textarea
                  rows="6"
                  placeholder="AAPL, MSFT, NVDA, AMZN, GOOGL, META, TSLA, JPM, JNJ, UNH, XOM, V, PG, MA, HD..."
                  value={bulkInput}
                  onChange={(e) => setBulkInput(e.target.value.toUpperCase())}
                  className="w-full uppercase font-mono px-3 py-2 border border-slate-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Default Batch Note
                </label>
                <input
                  type="text"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Import Tickers</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
