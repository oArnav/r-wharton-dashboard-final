import React, { useState } from 'react';
import { X, Search, CheckCircle2, AlertCircle, Loader2, DollarSign, Target, ShieldAlert, Wallet, UserCheck } from 'lucide-react';
import { api } from '../services/api';

const TEAM_MEMBERS = ['Arnav', 'Jaivish', 'Harsimar', 'Nairit'];

export default function AddTradeModal({
  isOpen,
  onClose,
  onTradeCreated,
  prefillTicker = '',
  approvedTickers = new Set(),
  availableCash = 500000
}) {
  const today = new Date().toISOString().split('T')[0];

  const [ticker, setTicker] = useState(prefillTicker);
  const [companyName, setCompanyName] = useState('');
  const [sector, setSector] = useState('');
  const [entryDate, setEntryDate] = useState(today);
  const [entryPrice, setEntryPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [rationale, setRationale] = useState('');
  const [exitCondition, setExitCondition] = useState('');
  const [ipsAlignment, setIpsAlignment] = useState('');
  const [ipsFitStatus, setIpsFitStatus] = useState('fit');
  const [loggedBy, setLoggedBy] = useState('Arnav');

  const [isValidating, setIsValidating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [validatedStock, setValidatedStock] = useState(null);

  if (!isOpen) return null;

  const isTickerApproved = ticker.trim() ? approvedTickers.has(ticker.trim().toUpperCase()) : true;

  const handleValidateTicker = async (symbolToFetch = ticker) => {
    const sym = symbolToFetch.trim().toUpperCase();
    if (!sym) {
      setFetchError('Please enter a stock ticker.');
      return;
    }

    setIsValidating(true);
    setFetchError('');
    try {
      const data = await api.getStock(sym);
      setValidatedStock(data);
      setCompanyName(data.company_name || sym);
      setSector(data.sector || 'Other');
      // STRICT POLICY: Do NOT auto-fill entryPrice. User must enter actual WInS fill price.
    } catch (err) {
      setFetchError(err.message || `Failed to fetch '${sym}'.`);
      setValidatedStock(null);
    } finally {
      setIsValidating(false);
    }
  };

  const totalCost = (parseFloat(entryPrice) || 0) * (parseFloat(quantity) || 0);
  const positionSizePct = ((totalCost / 500000.0) * 100.0).toFixed(2);
  const exceedsCash = totalCost > availableCash && totalCost > 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!ticker.trim()) {
      setSubmitError('Ticker is required.');
      return;
    }
    if (!entryPrice || parseFloat(entryPrice) <= 0) {
      setSubmitError('Entry price must be greater than 0. Enter your actual WInS fill price.');
      return;
    }
    if (!quantity || parseFloat(quantity) <= 0) {
      setSubmitError('Quantity must be greater than 0.');
      return;
    }
    if (!rationale.trim()) {
      setSubmitError('Investment rationale is required for WInS compliance.');
      return;
    }
    if (!exitCondition.trim()) {
      setSubmitError('Exit condition is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onTradeCreated({
        ticker: ticker.trim().toUpperCase(),
        company_name: companyName || ticker.trim().toUpperCase(),
        sector: sector || 'Other',
        entry_date: entryDate,
        entry_price: parseFloat(entryPrice),
        quantity: parseFloat(quantity),
        position_size_pct: parseFloat(positionSizePct),
        rationale: rationale.trim(),
        exit_condition: exitCondition.trim(),
        ips_alignment: ipsAlignment.trim(),
        ips_fit_status: ipsAlignment.trim() ? ipsFitStatus : 'missing',
        logged_by: loggedBy
      });
      onClose();
    } catch (err) {
      setSubmitError(err.message || 'Failed to record trade.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Record WInS Trade Execution</h3>
            <p className="text-xs text-slate-400">Manual simulator fill pricing, IPS alignment & cash balance check</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {submitError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Cash Exceeded Warning Banner (Non-blocking) */}
          {exceedsCash && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-1">
              <div className="flex items-center space-x-1.5 font-bold text-amber-800">
                <Wallet className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>⚠️ Available Cash Exceeded Notice</span>
              </div>
              <p className="leading-relaxed">
                This trade requires <strong className="font-mono font-bold">${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>, 
                which exceeds your available cash balance of <strong className="font-mono font-bold">${Number(availableCash).toLocaleString('en-US', { minimumFractionDigits: 2 })}</strong>.
                You may still submit this trade to mirror simulator execution, but virtual cash balance will reflect a negative overdraft.
              </p>
            </div>
          )}

          {/* Ticker Input & Validation */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Stock Ticker *
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value.toUpperCase())}
                placeholder="e.g. AAPL, NVDA, MSFT"
                className="flex-1 uppercase font-mono font-bold px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
              <button
                type="button"
                onClick={() => handleValidateTicker()}
                disabled={isValidating || !ticker.trim()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1 transition disabled:opacity-50"
              >
                {isValidating ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Verify Ticker</span>
                  </>
                )}
              </button>
            </div>

            {!isTickerApproved && ticker.trim() && (
              <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 p-2 rounded-lg mt-2 flex items-start space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>
                  <strong>Competition Notice: </strong> '{ticker}' is not currently on your team's Wharton Approved Stock List. You can still record this trade, but verify eligibility before competition submission.
                </span>
              </p>
            )}

            {fetchError && (
              <p className="text-xs text-rose-600 mt-1 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{fetchError}</span>
              </p>
            )}

            {validatedStock && (
              <div className="mt-2 p-2.5 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-900 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold">{validatedStock.company_name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-blue-600 block uppercase font-bold">Yahoo Reference Price</span>
                  <span className="font-mono font-bold text-blue-900 text-xs">${validatedStock.current_price?.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Company Name, Sector & Logged By */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Company Name
              </label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="e.g. Apple Inc."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Sector
              </label>
              <select
                value={sector}
                onChange={(e) => setSector(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white"
              >
                <option value="">Select Sector...</option>
                <option value="Technology">Technology</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Financial Services">Financial Services</option>
                <option value="Consumer Cyclical">Consumer Cyclical</option>
                <option value="Consumer Defensive">Consumer Defensive</option>
                <option value="Communication Services">Communication Services</option>
                <option value="Industrials">Industrials</option>
                <option value="Energy">Energy</option>
                <option value="Utilities">Utilities</option>
                <option value="Real Estate">Real Estate</option>
                <option value="Basic Materials">Basic Materials</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Logged By (Team Member) *
              </label>
              <select
                value={loggedBy}
                onChange={(e) => setLoggedBy(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white font-medium text-slate-800"
                required
              >
                {TEAM_MEMBERS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Entry Date, WInS Execution Entry Price, Quantity */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Entry Date *
              </label>
              <input
                type="date"
                value={entryDate}
                onChange={(e) => setEntryDate(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  WInS Exec Price ($) *
                </label>
                {validatedStock?.current_price && (
                  <span className="text-[10px] text-slate-400 font-mono" title="Yahoo reference price">
                    Ref: ${validatedStock.current_price.toFixed(2)}
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={entryPrice}
                onChange={(e) => setEntryPrice(e.target.value)}
                placeholder="Exact fill price"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-slate-400"
                required
              />
              <span className="text-[10px] text-slate-500 mt-0.5 block">Actual simulator fill price</span>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Quantity (Shares) *
              </label>
              <input
                type="number"
                step="1"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 100"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-slate-900 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Sizing & Cash Balance Preview */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
            <div>
              <span className="text-slate-500 block">Total Trade Cost Basis:</span>
              <span className="font-bold text-slate-900 font-mono text-sm">
                ${Number(totalCost).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] text-slate-400 block font-mono mt-0.5">
                Available Cash: ${Number(availableCash).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
            <div className="sm:text-right">
              <span className="text-slate-500 block">Portfolio Sizing (% of $500k):</span>
              <span className={`font-bold font-mono text-sm ${parseFloat(positionSizePct) > 20 ? 'text-amber-600' : 'text-blue-600'}`}>
                {positionSizePct}%
              </span>
              {parseFloat(positionSizePct) > 20 && (
                <span className="block text-[10px] text-amber-700 font-medium">⚠️ Exceeds 20% single-holding rule</span>
              )}
            </div>
          </div>

          {/* Investment Rationale */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Investment Rationale * (Human Analysis — Zero AI)
            </label>
            <textarea
              rows={2}
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why are we purchasing this company? (e.g. Sustainable pricing power, high ROE, AI tailwind)..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Exit Condition */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Pre-defined Exit Condition *
            </label>
            <input
              type="text"
              value={exitCondition}
              onChange={(e) => setExitCondition(e.target.value)}
              placeholder="e.g. Stop-loss at -8%, Target price of $240, or earnings deceleration"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Client IPS Alignment */}
          <div className="p-3 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-900 flex items-center space-x-1">
                <Target className="w-3.5 h-3.5 text-blue-600" />
                <span>Client IPS Alignment Documentation</span>
              </span>
              <span className="text-[10px] uppercase font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                WInS Rubric Core
              </span>
            </div>

            <textarea
              rows={2}
              value={ipsAlignment}
              onChange={(e) => setIpsAlignment(e.target.value)}
              placeholder="Explain explicitly how this holding satisfies the client's objective (Growth), risk tolerance, and constraints..."
              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none placeholder-blue-300"
            />

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-slate-600">Holding Fit Status:</span>
              <select
                value={ipsFitStatus}
                onChange={(e) => setIpsFitStatus(e.target.value)}
                className="px-2.5 py-1 border border-blue-300 rounded text-xs bg-white text-slate-800 font-medium focus:outline-none"
              >
                <option value="fit">Complies with Client IPS (Fit)</option>
                <option value="unclear">Needs Justification (Unclear)</option>
                <option value="missing">Undocumented (Missing)</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
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
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Executing...</span>
                </>
              ) : (
                <span>Execute & Record Trade</span>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
}
