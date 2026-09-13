import React, { useState, useMemo } from 'react';
import {
  Plus, Download, Filter, ArrowUpDown, CheckCircle2,
  Clock, XCircle, Search, Trash2, ArrowUpRight, ArrowDownRight,
  ExternalLink, FileSpreadsheet, ShieldCheck, AlertTriangle, Edit2, X, Loader2,
  ShieldAlert, History, Calendar, User
} from 'lucide-react';
import AddTradeModal from './AddTradeModal';
import ClosePositionModal from './ClosePositionModal';
import { api } from '../services/api';

const TEAM_MEMBERS = ['Arnav', 'Jaivish', 'Harsimar', 'Nairit'];

export default function TradeLog({
  trades = [],
  approvedTickers = new Set(),
  availableCash = 500000,
  onRefresh,
  onTradeCreated,
  onTradeClosed,
  onUpdateTradeIps,
  onDeleteTrade,
  onSelectTickerForLookup,
}) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tradeToClose, setTradeToClose] = useState(null);

  // Edit IPS Modal
  const [editingIpsTrade, setEditingIpsTrade] = useState(null);
  const [ipsText, setIpsText] = useState('');
  const [ipsFit, setIpsFit] = useState('fit');
  const [isUpdatingIps, setIsUpdatingIps] = useState(false);

  // Edit Trade Modal (Phase 5)
  const [editingTrade, setEditingTrade] = useState(null);
  const [editEntryPrice, setEditEntryPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editRationale, setEditRationale] = useState('');
  const [editExitCondition, setEditExitCondition] = useState('');
  const [editedBy, setEditedBy] = useState('Arnav');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Audit History Modal (Phase 5)
  const [historyTrade, setHistoryTrade] = useState(null);
  const [auditEdits, setAuditEdits] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Filters & Sorting
  const [statusFilter, setStatusFilter] = useState('all');
  const [sectorFilter, setSectorFilter] = useState('all');
  const [ipsFilter, setIpsFilter] = useState('all');
  const [approvalFilter, setApprovalFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('entry_date');
  const [sortDirection, setSortDirection] = useState('desc');

  const sectors = useMemo(() => {
    const set = new Set();
    trades.forEach((t) => {
      if (t.sector) set.add(t.sector);
    });
    return Array.from(set).sort();
  }, [trades]);

  const filteredTrades = useMemo(() => {
    return trades
      .filter((trade) => {
        if (statusFilter !== 'all' && trade.status !== statusFilter) return false;
        if (sectorFilter !== 'all' && trade.sector !== sectorFilter) return false;
        
        const isApproved = approvedTickers.has(trade.ticker?.toUpperCase());
        if (approvalFilter === 'approved' && !isApproved) return false;
        if (approvalFilter === 'unapproved' && isApproved) return false;

        if (ipsFilter !== 'all') {
          const fit = trade.ips_fit_status || 'missing';
          if (ipsFilter === 'missing' && trade.ips_alignment) return false;
          if (ipsFilter === 'fit' && (fit !== 'fit' || !trade.ips_alignment)) return false;
          if (ipsFilter === 'unclear' && fit !== 'unclear') return false;
        }

        if (startDate && trade.entry_date < startDate) return false;
        if (endDate && trade.entry_date > endDate) return false;

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchesTicker = trade.ticker?.toLowerCase().includes(q);
          const matchesCompany = trade.company_name?.toLowerCase().includes(q);
          const matchesRationale = trade.rationale?.toLowerCase().includes(q);
          const matchesIps = trade.ips_alignment?.toLowerCase().includes(q);
          const matchesMember = trade.logged_by?.toLowerCase().includes(q);
          if (!matchesTicker && !matchesCompany && !matchesRationale && !matchesIps && !matchesMember) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (['entry_price', 'exit_price', 'quantity', 'realized_pnl', 'unrealized_pnl', 'position_size_pct'].includes(sortField)) {
          valA = parseFloat(valA) || 0;
          valB = parseFloat(valB) || 0;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [trades, statusFilter, sectorFilter, ipsFilter, approvalFilter, startDate, endDate, searchQuery, sortField, sortDirection, approvedTickers]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const renderSortIndicator = (field) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-50" />;
    return <span className="text-blue-600 font-bold text-xs">{sortDirection === 'asc' ? '▲' : '▼'}</span>;
  };

  const handleOpenIpsEdit = (trade) => {
    setEditingIpsTrade(trade);
    setIpsText(trade.ips_alignment || '');
    setIpsFit(trade.ips_fit_status === 'missing' ? 'fit' : trade.ips_fit_status || 'fit');
  };

  const handleSaveIps = async (e) => {
    e.preventDefault();
    if (!editingIpsTrade) return;
    setIsUpdatingIps(true);
    try {
      await onUpdateTradeIps(editingIpsTrade.id, ipsText.trim(), ipsFit);
      setEditingIpsTrade(null);
    } catch (err) {
      console.error('Error updating trade IPS:', err);
    } finally {
      setIsUpdatingIps(false);
    }
  };

  // Open Edit Trade Modal
  const handleOpenEditTrade = (trade) => {
    setEditingTrade(trade);
    setEditEntryPrice(trade.entry_price ? trade.entry_price.toString() : '');
    setEditQuantity(trade.quantity ? trade.quantity.toString() : '');
    setEditEntryDate(trade.entry_date || '');
    setEditRationale(trade.rationale || '');
    setEditExitCondition(trade.exit_condition || '');
    setEditedBy(trade.logged_by || 'Arnav');
    setEditError('');
  };

  const handleSaveEditTrade = async (e) => {
    e.preventDefault();
    if (!editingTrade) return;
    setIsSavingEdit(true);
    setEditError('');
    try {
      await api.editTrade(editingTrade.id, {
        entry_price: parseFloat(editEntryPrice),
        quantity: parseFloat(editQuantity),
        entry_date: editEntryDate,
        rationale: editRationale.trim(),
        exit_condition: editExitCondition.trim(),
      }, editedBy);
      setEditingTrade(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setEditError(err.message || 'Failed to update trade.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Open Audit History Modal
  const handleOpenHistory = async (trade) => {
    setHistoryTrade(trade);
    setIsLoadingHistory(true);
    try {
      const edits = await api.getTradeEdits(trade.id);
      setAuditEdits(edits || []);
    } catch (err) {
      console.error('Failed to load audit edits:', err);
      setAuditEdits([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleExportCSV = () => {
    window.open(api.getExportCsvUrl(), '_blank');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Controls */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight flex items-center space-x-2">
            <span>WInS Trade Execution Ledger</span>
            <span className="text-xs font-normal text-slate-500">
              ({trades.length} Total Trades • {trades.filter(t => t.status === 'open').length} Active Holdings)
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manual simulator execution pricing, team member attribution, and persistent edit audit logs.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition"
            title="Download complete trades blotter CSV"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Record New Trade</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row gap-3">
          
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ticker, company, rationale, member..."
              className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Date Range Filters */}
          <div className="flex items-center space-x-2 text-xs">
            <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span className="text-slate-500 text-[11px]">From:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>
            <div className="flex items-center space-x-1 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
              <span className="text-slate-500 text-[11px]">To:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-xs text-slate-700 focus:outline-none"
              />
            </div>
            {(startDate || endDate) && (
              <button
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="text-[11px] text-blue-600 hover:underline px-1"
              >
                Clear Dates
              </button>
            )}
          </div>

        </div>

        {/* Dropdowns row */}
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          {/* Status Tabs */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({trades.length})
            </button>
            <button
              onClick={() => setStatusFilter('open')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'open' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Open ({trades.filter((t) => t.status === 'open').length})
            </button>
            <button
              onClick={() => setStatusFilter('closed')}
              className={`px-3 py-1.5 rounded-md font-medium transition ${
                statusFilter === 'closed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Closed ({trades.filter((t) => t.status === 'closed').length})
            </button>
          </div>

          {/* Sector Filter */}
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Sectors</option>
            {sectors.map((sec) => (
              <option key={sec} value={sec}>{sec}</option>
            ))}
          </select>

          {/* Guidebook Approval Filter */}
          <select
            value={approvalFilter}
            onChange={(e) => setApprovalFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white font-medium"
          >
            <option value="all">All Stocks</option>
            <option value="approved">✅ Guidebook Approved</option>
            <option value="unapproved">⚠️ Non-Whitelisted</option>
          </select>

          {/* IPS Filter */}
          <select
            value={ipsFilter}
            onChange={(e) => setIpsFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All IPS Statuses</option>
            <option value="fit">✅ Documented Fit</option>
            <option value="unclear">⚠️ Unclear Fit</option>
            <option value="missing">❌ Missing Fit</option>
          </select>

          <span className="text-slate-400 text-[11px] ml-auto">
            Showing {filteredTrades.length} of {trades.length} records
          </span>
        </div>
      </div>

      {/* Trades Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredTrades.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('ticker')}>
                    <div className="flex items-center space-x-1">
                      <span>Ticker</span>
                      {renderSortIndicator('ticker')}
                    </div>
                  </th>
                  <th className="py-3 px-3">Logged By</th>
                  <th className="py-3 px-3">Sector</th>
                  <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('entry_date')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>Entry Date</span>
                      {renderSortIndicator('entry_date')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('entry_price')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>WInS Exec Price</span>
                      {renderSortIndicator('entry_price')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Market Quote</th>
                  <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('quantity')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>Shares</span>
                      {renderSortIndicator('quantity')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Cost Basis</th>
                  <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('realized_pnl')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>P&L (Realized / Paper)</span>
                      {renderSortIndicator('realized_pnl')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right cursor-pointer hover:bg-slate-100" onClick={() => handleSort('position_size_pct')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>Weight</span>
                      {renderSortIndicator('position_size_pct')}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredTrades.map((trade) => {
                  const isClosed = trade.status === 'closed';
                  const isApproved = approvedTickers.has(trade.ticker?.toUpperCase());
                  const costBasis = (parseFloat(trade.entry_price) || 0) * (parseFloat(trade.quantity) || 0);

                  const pnl = isClosed ? trade.realized_pnl : trade.unrealized_pnl;
                  const isProfit = (pnl || 0) >= 0;

                  return (
                    <tr key={trade.id} className="hover:bg-slate-50/80 transition-colors">
                      
                      {/* Status */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isClosed ? 'bg-slate-100 text-slate-700' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {trade.status}
                        </span>
                      </td>

                      {/* Ticker & Company */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => onSelectTickerForLookup && onSelectTickerForLookup(trade.ticker)}
                            className="font-bold text-slate-900 font-mono hover:text-blue-600 hover:underline flex items-center space-x-0.5"
                          >
                            <span>{trade.ticker}</span>
                            <ArrowUpRight className="w-3 h-3 text-slate-400" />
                          </button>
                          {isApproved ? (
                            <span title="Wharton Approved Stock" className="text-emerald-600">
                              <ShieldCheck className="w-3.5 h-3.5" />
                            </span>
                          ) : (
                            <span title="Non-Whitelisted Ticker" className="text-amber-500">
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px]" title={trade.company_name}>
                          {trade.company_name}
                        </div>
                      </td>

                      {/* Logged By */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium border border-slate-200">
                          <User className="w-2.5 h-2.5 text-slate-500" />
                          <span>{trade.logged_by || 'Arnav'}</span>
                        </span>
                      </td>

                      {/* Sector */}
                      <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                        <span className="text-[11px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-700">
                          {trade.sector || 'Other'}
                        </span>
                      </td>

                      {/* Entry Date */}
                      <td className="py-3 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                        {trade.entry_date}
                      </td>

                      {/* WInS Execution Entry Price */}
                      <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 whitespace-nowrap">
                        ${Number(trade.entry_price).toFixed(2)}
                      </td>

                      {/* Market Quote (Yahoo Reference) */}
                      <td className="py-3 px-3 text-right font-mono text-slate-500 whitespace-nowrap">
                        {trade.current_price ? (
                          <span title="Latest Yahoo reference quote">
                            ${Number(trade.current_price).toFixed(2)}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>

                      {/* Shares */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        {Number(trade.quantity).toLocaleString()}
                      </td>

                      {/* Cost Basis */}
                      <td className="py-3 px-3 text-right font-mono text-slate-700 whitespace-nowrap">
                        ${costBasis.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* P&L */}
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className={`font-mono font-bold ${isProfit ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {isProfit ? '+' : ''}${Number(pnl || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {isClosed ? 'Realized' : 'Paper Gain'}
                        </div>
                      </td>

                      {/* Position Weight */}
                      <td className="py-3 px-3 text-right font-mono whitespace-nowrap">
                        <span className={`font-semibold ${trade.position_size_pct > 20 ? 'text-amber-600' : 'text-slate-700'}`}>
                          {trade.position_size_pct}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center space-x-1">
                          
                          {/* Close Position Button */}
                          {!isClosed && (
                            <button
                              onClick={() => setTradeToClose(trade)}
                              className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded text-[11px] font-semibold transition"
                              title="Liquidate holding in simulator"
                            >
                              Close
                            </button>
                          )}

                          {/* Edit Trade Button */}
                          <button
                            onClick={() => handleOpenEditTrade(trade)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-slate-800 rounded transition"
                            title="Edit trade details & log audit note"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          {/* View Audit History Button */}
                          <button
                            onClick={() => handleOpenHistory(trade)}
                            className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition"
                            title="View revision audit trail"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Trade Button */}
                          <button
                            onClick={() => {
                              if (window.confirm(`Delete trade record for ${trade.ticker}?`)) {
                                onDeleteTrade(trade.id);
                              }
                            }}
                            className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition"
                            title="Delete trade record"
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
            <Clock className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-700">No trades match the selected filters.</p>
          </div>
        )}
      </div>

      {/* Edit Trade Modal (Phase 5) */}
      {editingTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 text-xs">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Edit Trade — {editingTrade.ticker}</h3>
                <p className="text-xs text-slate-400">Modifications will be logged in the public audit trail</p>
              </div>
              <button onClick={() => setEditingTrade(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleSaveEditTrade} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700">
                  {editError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Entry Date *</label>
                  <input
                    type="date"
                    value={editEntryDate}
                    onChange={(e) => setEditEntryDate(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Edited By (Team Member) *</label>
                  <select
                    value={editedBy}
                    onChange={(e) => setEditedBy(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg bg-white font-medium"
                    required
                  >
                    {TEAM_MEMBERS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">WInS Entry Price ($) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={editEntryPrice}
                    onChange={(e) => setEditEntryPrice(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 uppercase mb-1">Shares *</label>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Investment Rationale *</label>
                <textarea
                  rows={2}
                  value={editRationale}
                  onChange={(e) => setEditRationale(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 uppercase mb-1">Exit Condition *</label>
                <input
                  type="text"
                  value={editExitCondition}
                  onChange={(e) => setEditExitCondition(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  required
                />
              </div>

              <div className="pt-3 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setEditingTrade(null)}
                  className="px-4 py-2 border rounded-lg font-medium text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center space-x-1.5"
                >
                  {isSavingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>Save & Log Revision</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Audit History Modal (Phase 5) */}
      {historyTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden my-8 text-xs">
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Revision Audit History — {historyTrade.ticker}</h3>
                <p className="text-xs text-slate-400">Chronological ledger of all field modifications by team members</p>
              </div>
              <button onClick={() => setHistoryTrade(null)} className="text-slate-400 hover:text-white">✕</button>
            </div>

            <div className="p-6 space-y-3">
              {isLoadingHistory ? (
                <div className="py-8 text-center text-slate-500 flex items-center justify-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Loading audit log...</span>
                </div>
              ) : auditEdits.length === 0 ? (
                <div className="py-8 text-center text-slate-400">
                  No subsequent edits recorded for this trade. All original values remain as logged by <strong>{historyTrade.logged_by || 'Arnav'}</strong>.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
                  {auditEdits.map((edit) => (
                    <div key={edit.id} className="py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 capitalize">
                          {edit.field_changed?.replace('_', ' ')}
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {edit.timestamp}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Edited by <strong className="text-slate-700">{edit.edited_by}</strong>
                      </div>
                      <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded-lg mt-1 font-mono text-[11px]">
                        <div className="text-rose-700 line-through truncate">
                          From: {edit.old_value || 'None'}
                        </div>
                        <div className="text-emerald-700 truncate">
                          To: {edit.new_value}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t flex justify-end">
                <button
                  type="button"
                  onClick={() => setHistoryTrade(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Trade Modal */}
      <AddTradeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onTradeCreated={onTradeCreated}
        approvedTickers={approvedTickers}
        availableCash={availableCash}
      />

      {/* Close Position Modal */}
      <ClosePositionModal
        isOpen={!!tradeToClose}
        trade={tradeToClose}
        onClose={() => setTradeToClose(null)}
        onTradeClosed={onTradeClosed}
      />

    </div>
  );
}
