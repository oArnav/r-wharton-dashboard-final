import React, { useState } from 'react';
import { Target, Shield, Clock, AlertTriangle, Edit3, X, CheckCircle2, Loader2, Award } from 'lucide-react';

export default function ClientIPSBanner({ ips, onUpdateIps }) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [objective, setObjective] = useState(ips?.objective || 'growth');
  const [riskTolerance, setRiskTolerance] = useState(ips?.risk_tolerance || 'moderate');
  const [timeHorizon, setTimeHorizon] = useState(ips?.time_horizon || '10 Weeks');
  const [constraints, setConstraints] = useState(ips?.constraints || '');
  const [benchmark, setBenchmark] = useState(ips?.benchmark || 'S&P 500 (^GSPC)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleOpenEdit = () => {
    setObjective(ips?.objective || 'growth');
    setRiskTolerance(ips?.risk_tolerance || 'moderate');
    setTimeHorizon(ips?.time_horizon || '10 Weeks');
    setConstraints(ips?.constraints || '');
    setBenchmark(ips?.benchmark || 'S&P 500 (^GSPC)');
    setIsEditModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      await onUpdateIps({
        objective,
        risk_tolerance: riskTolerance,
        time_horizon: timeHorizon,
        constraints: constraints.trim(),
        benchmark: benchmark.trim() || 'S&P 500 (^GSPC)',
      });
      setIsEditModalOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to update IPS.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRiskBadgeColor = (risk) => {
    if (risk === 'aggressive') return 'bg-rose-100 text-rose-800 border-rose-200';
    if (risk === 'conservative') return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    return 'bg-amber-100 text-amber-800 border-amber-200';
  };

  return (
    <>
      {/* Top Prominent IPS Summary Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-2xl p-5 text-white border border-blue-800/60 shadow-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 px-2.5 py-0.5 rounded-full border border-blue-400/30 flex items-center space-x-1">
                <Target className="w-3 h-3 text-blue-300" />
                <span>Client Investment Policy Statement (IPS)</span>
              </span>
              <span className="text-xs text-slate-300">• WInS Competition Mandate</span>
            </div>
            
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <span className="text-slate-400">Objective:</span>
                <span className="uppercase font-bold text-white px-2 py-0.5 rounded bg-blue-800/80 border border-blue-600/40">
                  {ips?.objective || 'Growth'}
                </span>
              </span>

              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <span className="text-slate-400">Risk:</span>
                <span className={`uppercase font-bold text-[11px] px-2 py-0.5 rounded border ${getRiskBadgeColor(ips?.risk_tolerance)}`}>
                  {ips?.risk_tolerance || 'Moderate'}
                </span>
              </span>

              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Horizon:</span>
                <span className="font-mono text-slate-100">{ips?.time_horizon || '10 Weeks'}</span>
              </span>

              <span className="font-semibold text-slate-200 flex items-center space-x-1">
                <Award className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-slate-400">Benchmark:</span>
                <span className="font-mono text-amber-300 font-bold">{ips?.benchmark || 'S&P 500 (^GSPC)'}</span>
              </span>
            </div>

            {/* Constraints display */}
            {ips?.constraints && (
              <p className="text-xs text-slate-300 flex items-start space-x-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                <span>
                  <strong className="text-slate-200">Mandated Constraints: </strong>
                  {ips.constraints}
                </span>
              </p>
            )}
          </div>

          {/* Edit Button */}
          <button
            onClick={handleOpenEdit}
            className="self-start md:self-center px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-white/20 shadow-sm"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Client IPS</span>
          </button>

        </div>
      </div>

      {/* Edit IPS Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8">
            
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Configure Client IPS</h3>
                <p className="text-xs text-slate-400">Define client objectives, risk profile, and portfolio boundaries</p>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4 text-xs">
              {error && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Client Objective *
                  </label>
                  <select
                    value={objective}
                    onChange={(e) => setObjective(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="growth">Capital Growth</option>
                    <option value="income">Current Income</option>
                    <option value="capital preservation">Capital Preservation</option>
                    <option value="mixed">Mixed / Balanced</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Risk Tolerance *
                  </label>
                  <select
                    value={riskTolerance}
                    onChange={(e) => setRiskTolerance(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="moderate">Moderate</option>
                    <option value="aggressive">Aggressive</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Time Horizon *
                  </label>
                  <input
                    type="text"
                    value={timeHorizon}
                    onChange={(e) => setTimeHorizon(e.target.value)}
                    placeholder="e.g. 10 Weeks (Competition Duration)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Benchmark *
                  </label>
                  <input
                    type="text"
                    value={benchmark}
                    onChange={(e) => setBenchmark(e.target.value)}
                    placeholder="e.g. S&P 500 (^GSPC)"
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Constraints & Exclusions (Free text)
                </label>
                <textarea
                  rows="3"
                  value={constraints}
                  onChange={(e) => setConstraints(e.target.value)}
                  placeholder="e.g. No leverage, ESG screen required, max 20% single position weight, no tobacco or weapons"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 rounded-lg font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Client IPS</span>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
