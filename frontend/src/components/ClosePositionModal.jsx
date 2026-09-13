import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Loader2, Info } from 'lucide-react';

const TEAM_MEMBERS = ['Arnav', 'Jaivish', 'Harsimar', 'Nairit'];

export default function ClosePositionModal({ isOpen, onClose, trade, onTradeClosed }) {
  const today = new Date().toISOString().split('T')[0];

  // STRICT POLICY: Do NOT auto-fill exit price from market fetcher. User must enter actual WInS fill price.
  const [exitPrice, setExitPrice] = useState('');
  const [exitDate, setExitDate] = useState(today);
  const [outcomeNote, setOutcomeNote] = useState('');
  const [closedBy, setClosedBy] = useState('Arnav');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !trade) return null;

  const entryPrice = parseFloat(trade.entry_price) || 0;
  const quantity = parseFloat(trade.quantity) || 0;
  const costBasis = entryPrice * quantity;

  const parsedExitPrice = parseFloat(exitPrice) || 0;
  const exitProceeds = parsedExitPrice * quantity;
  const realizedPnl = exitProceeds - costBasis;
  const realizedPnlPct = entryPrice > 0 ? ((parsedExitPrice - entryPrice) / entryPrice) * 100 : 0;
  const isProfitable = realizedPnl >= 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!parsedExitPrice || parsedExitPrice <= 0) {
      setError('Please enter your actual WInS execution exit price.');
      return;
    }
    if (!exitDate) {
      setError('Exit date is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTradeClosed(trade.id, {
        exit_price: parsedExitPrice,
        exit_date: exitDate,
        outcome_note: outcomeNote.trim() ? `[Closed by ${closedBy}] ${outcomeNote.trim()}` : `[Closed by ${closedBy}] Position liquidated in simulator`,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to close position.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Close Position — {trade.ticker}</h3>
            <p className="text-xs text-slate-400">{trade.company_name} • {trade.quantity} Shares</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Trade Info Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs grid grid-cols-3 gap-2 text-center">
            <div>
              <span className="text-slate-500 block">Entry Price</span>
              <span className="font-bold text-slate-800 font-mono">${entryPrice.toFixed(2)}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Shares</span>
              <span className="font-bold text-slate-800 font-mono">{quantity.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Cost Basis</span>
              <span className="font-bold text-slate-800 font-mono">${costBasis.toLocaleString()}</span>
            </div>
          </div>

          {/* Reference Quote Notice */}
          {trade.current_price && (
            <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
              <span className="flex items-center space-x-1.5 text-blue-800 font-medium">
                <Info className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <span>Yahoo Reference Quote:</span>
              </span>
              <span className="font-mono font-bold text-blue-950">${Number(trade.current_price).toFixed(2)}</span>
            </div>
          )}

          {/* Exit Price, Exit Date, Closed By */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                WInS Exit Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={exitPrice}
                onChange={(e) => setExitPrice(e.target.value)}
                placeholder="Actual fill price"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <span className="text-[10px] text-slate-400 block mt-0.5">Simulator fill price</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Exit Date *
              </label>
              <input
                type="date"
                value={exitDate}
                onChange={(e) => setExitDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Closed By *
              </label>
              <select
                value={closedBy}
                onChange={(e) => setClosedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
                required
              >
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Realized P&L Live Preview */}
          <div className={`p-4 rounded-xl border text-center transition-colors ${
            parsedExitPrice > 0
              ? isProfitable
                ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/80 border-rose-200 text-rose-950'
              : 'bg-slate-50 border-slate-200 text-slate-700'
          }`}>
            <span className="text-xs font-medium uppercase tracking-wider block">Calculated Realized P&L</span>
            <div className="text-2xl font-bold font-mono mt-1">
              {parsedExitPrice > 0 ? `${isProfitable ? '+' : ''}$${realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '$0.00'}
            </div>
            <span className="text-xs font-semibold mt-0.5 block">
              {parsedExitPrice > 0 ? `Return: ${isProfitable ? '+' : ''}${realizedPnlPct.toFixed(2)}%` : 'Enter execution price above to preview P&L'}
            </span>
          </div>

          {/* Outcome Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Trade Outcome & Post-Mortem Note (Zero AI)
            </label>
            <textarea
              rows={2}
              value={outcomeNote}
              onChange={(e) => setOutcomeNote(e.target.value)}
              placeholder="Why was the position closed? (e.g. Target reached, stop-loss triggered, quarterly thesis revision)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !parsedExitPrice}
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Closing Position...</span>
                </>
              ) : (
                <span>Confirm & Realize P&L</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
