import React, { useState } from 'react';
import {
  ShieldCheck, AlertTriangle, CheckCircle2, Edit2, X,
  FileCheck, HelpCircle, Loader2, ArrowRight
} from 'lucide-react';

export default function IPSTraceability({
  trades = [],
  ips,
  onUpdateTradeIps,
  onSelectTab
}) {
  const [editingTrade, setEditingTrade] = useState(null);
  const [alignmentText, setAlignmentText] = useState('');
  const [fitStatus, setFitStatus] = useState('fit');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const openTrades = trades.filter((t) => t.status === 'open');
  const totalOpen = openTrades.length;

  const documentedTrades = openTrades.filter((t) => t.ips_alignment && t.ips_fit_status === 'fit');
  const unclearTrades = openTrades.filter((t) => t.ips_fit_status === 'unclear');
  const missingTrades = openTrades.filter((t) => !t.ips_alignment || t.ips_fit_status === 'missing');

  const compliancePct = totalOpen > 0 ? Math.round((documentedTrades.length / totalOpen) * 100) : 100;

  const handleOpenEdit = (trade) => {
    setEditingTrade(trade);
    setAlignmentText(trade.ips_alignment || '');
    setFitStatus(trade.ips_fit_status === 'missing' ? 'fit' : trade.ips_fit_status || 'fit');
    setError('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateTradeIps(editingTrade.id, alignmentText.trim(), fitStatus);
      setEditingTrade(null);
    } catch (err) {
      setError(err.message || 'Failed to update IPS alignment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
      
      {/* Header & Compliance Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Audit & Governance
            </span>
            <span className="text-xs text-slate-400">• WInS Competition Rule</span>
          </div>
          <h2 className="text-base font-bold text-slate-900 mt-1 flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            <span>IPS-Traceability & Fit Checker</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Audit trail ensuring 100% of holdings explicitly document compliance with client objectives and constraints.
          </p>
        </div>

        {/* Compliance Gauge Card */}
        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 min-w-[200px] text-right">
          <span className="text-[11px] font-semibold text-slate-500 block uppercase">Documented Fit Score</span>
          <div className="text-2xl font-bold font-mono text-slate-900">
            {compliancePct}%
          </div>
          <span className="text-[10px] text-slate-500 block">
            {documentedTrades.length} of {totalOpen} open positions certified
          </span>
        </div>
      </div>

      {/* Flag Alert if any positions missing or unclear */}
      {(missingTrades.length > 0 || unclearTrades.length > 0) && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-xs flex items-start space-x-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Governance Warning: {missingTrades.length + unclearTrades.length} position(s) need review</span>
            <p className="text-[11px] text-amber-800">
              {missingTrades.length > 0 && `${missingTrades.length} position(s) lack documented alignment. `}
              {unclearTrades.length > 0 && `${unclearTrades.length} position(s) marked as unclear fit.`}
              {' '}Document client fit before submitting final Wharton deliverables.
            </p>
          </div>
        </div>
      )}

      {/* Holdings List with IPS Badges */}
      {openTrades.length > 0 ? (
        <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto pr-1 text-xs">
          {openTrades.map((trade) => {
            const isMissing = !trade.ips_alignment || trade.ips_fit_status === 'missing';
            const isUnclear = trade.ips_fit_status === 'unclear';

            return (
              <div key={trade.id} className="py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50 px-2 rounded-lg transition">
                
                <div className="flex items-center space-x-2.5 min-w-[140px]">
                  {isMissing ? (
                    <span title="Missing alignment documentation">
                      <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    </span>
                  ) : isUnclear ? (
                    <span title="Marked as unclear fit with client constraints">
                      <HelpCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                    </span>
                  ) : (
                    <span title="Verified client alignment">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    </span>
                  )}
                  <div>
                    <span className="font-bold font-mono text-slate-900">{trade.ticker}</span>
                    <span className="text-[11px] text-slate-400 block truncate max-w-[110px]">{trade.company_name}</span>
                  </div>
                </div>

                <div className="flex-1 truncate max-w-md">
                  {trade.ips_alignment ? (
                    <p className="text-slate-700 truncate" title={trade.ips_alignment}>
                      <strong className="text-slate-500 text-[10px]">Client Fit Thesis: </strong>
                      {trade.ips_alignment}
                    </p>
                  ) : (
                    <span className="text-rose-600 font-semibold text-[11px] italic">
                      ⚠️ Undocumented: Add rationale for client objective ({ips?.objective || 'growth'})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    isMissing
                      ? 'bg-rose-100 text-rose-800'
                      : isUnclear
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {trade.ips_fit_status || 'Missing'}
                  </span>

                  <button
                    onClick={() => handleOpenEdit(trade)}
                    className="p-1 text-slate-400 hover:text-blue-600 transition"
                    title="Edit alignment thesis"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center text-slate-400 text-xs">
          No open positions to audit. Record trades to verify client IPS compliance.
        </div>
      )}

      {/* Edit Modal */}
      {editingCompanyModal(editingTrade, alignmentText, setAlignmentText, fitStatus, setFitStatus, isSubmitting, error, handleSave, () => setEditingTrade(null))}

    </div>
  );
}

function editingCompanyModal(trade, alignmentText, setAlignmentText, fitStatus, setFitStatus, isSubmitting, error, handleSave, onClose) {
  if (!trade) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">Document Client Alignment — {trade.ticker}</h3>
            <p className="text-xs text-slate-400">{trade.company_name}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">✕</button>
        </div>

        <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
          {error && <div className="p-3 bg-rose-50 text-rose-700 rounded-lg">{error}</div>}

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Client Fit Status *
            </label>
            <select
              value={fitStatus}
              onChange={(e) => setFitStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-semibold"
            >
              <option value="fit">✅ Documented & Compliant Fit</option>
              <option value="unclear">⚠️ Unclear Fit / Under Review</option>
              <option value="missing">❌ Non-Compliant / Missing Fit</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
              How does this holding align with the client's objective and constraints? *
            </label>
            <textarea
              rows="4"
              value={alignmentText}
              onChange={(e) => setAlignmentText(e.target.value)}
              placeholder="Explain why this position conforms to client risk tolerance, ESG rules, return horizon, or sector exclusions..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg"
              required
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
              disabled={isSubmitting}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save Traceability</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
