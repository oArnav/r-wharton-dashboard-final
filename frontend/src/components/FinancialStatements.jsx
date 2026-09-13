import React, { useState, useEffect, useMemo } from 'react';
import {
  FileSpreadsheet, Search, Calendar, Filter, Download,
  RefreshCw, Loader2, CheckSquare, Square, Check, Layers,
  ExternalLink, Info, DollarSign
} from 'lucide-react';
import { api } from '../services/api';

const QUICK_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'JPM', 'JNJ', 'XOM'];

export default function FinancialStatements({ initialTicker = 'AAPL', onAddTradeWithTicker }) {
  const [tickerInput, setTickerInput] = useState(initialTicker || 'AAPL');
  const [statementData, setStatementData] = useState(null);
  const [activeStatement, setActiveStatement] = useState('income_statement'); // 'income_statement' | 'balance_sheet' | 'cash_flow'
  const [periodType, setPeriodType] = useState('annual'); // 'annual' | 'quarterly'
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [formatMode, setFormatMode] = useState('compact'); // 'compact' ($M / $B) | 'full' ($123,456,789)

  // Line item selection state: { [statementKey]: Set of selected line item names }
  const [selectedItems, setSelectedItems] = useState({});
  const [itemSearchQuery, setItemSearchQuery] = useState('');
  const [showItemFilterPanel, setShowItemFilterPanel] = useState(false);

  const fetchStatements = async (symbol = tickerInput, period = periodType, forceRefresh = false) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;

    setIsLoading(true);
    setError('');
    try {
      const data = await api.getFinancialStatements(sym, period, forceRefresh);
      setStatementData(data);
      setTickerInput(sym);

      // Initialize selected items for each statement to only key items by default
      const initialSelection = {};
      ['income_statement', 'balance_sheet', 'cash_flow'].forEach((stmtKey) => {
        const stmt = data[stmtKey];
        if (stmt?.line_items) {
          const keySet = new Set(
            stmt.line_items
              .filter((it) => it.is_key)
              .map((it) => it.name)
          );
          // If no items flagged as key, select all
          if (keySet.size === 0) {
            stmt.line_items.forEach((it) => keySet.add(it.name));
          }
          initialSelection[stmtKey] = keySet;
        }
      });
      setSelectedItems(initialSelection);
    } catch (err) {
      setError(err.message || `Failed to fetch financial statements for '${sym}'.`);
      setStatementData(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatements(initialTicker, periodType);
  }, []);

  const handlePeriodTypeChange = (newPeriod) => {
    setPeriodType(newPeriod);
    if (statementData?.ticker) {
      fetchStatements(statementData.ticker, newPeriod);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchStatements(tickerInput, periodType);
  };

  // Current active statement object
  const currentStatement = statementData ? statementData[activeStatement] : null;
  const periods = currentStatement?.periods || [];
  const allLineItems = currentStatement?.line_items || [];
  const activeSelectedSet = selectedItems[activeStatement] || new Set();

  // Toggle single item
  const toggleItem = (name) => {
    setSelectedItems((prev) => {
      const currentSet = new Set(prev[activeStatement] || []);
      if (currentSet.has(name)) {
        currentSet.delete(name);
      } else {
        currentSet.add(name);
      }
      return { ...prev, [activeStatement]: currentSet };
    });
  };

  // Presets
  const selectKeyOnly = () => {
    const keySet = new Set(
      allLineItems.filter((it) => it.is_key).map((it) => it.name)
    );
    setSelectedItems((prev) => ({ ...prev, [activeStatement]: keySet }));
  };

  const selectAll = () => {
    const allSet = new Set(allLineItems.map((it) => it.name));
    setSelectedItems((prev) => ({ ...prev, [activeStatement]: allSet }));
  };

  const clearAll = () => {
    setSelectedItems((prev) => ({ ...prev, [activeStatement]: new Set() }));
  };

  // Filtered line items for display
  const displayedLineItems = useMemo(() => {
    return allLineItems.filter((item) => activeSelectedSet.has(item.name));
  }, [allLineItems, activeSelectedSet]);

  // Format monetary value
  const formatValue = (val) => {
    if (val == null || isNaN(val)) return '—';
    const absVal = Math.abs(val);
    const isNegative = val < 0;

    if (formatMode === 'full') {
      const formatted = Math.round(absVal).toLocaleString('en-US');
      return isNegative ? `(${formatted})` : formatted;
    }

    // Compact mode
    if (absVal >= 1e12) {
      const num = (absVal / 1e12).toFixed(2);
      return isNegative ? `($${num}T)` : `$${num}T`;
    }
    if (absVal >= 1e9) {
      const num = (absVal / 1e9).toFixed(2);
      return isNegative ? `($${num}B)` : `$${num}B`;
    }
    if (absVal >= 1e6) {
      const num = (absVal / 1e6).toFixed(2);
      return isNegative ? `($${num}M)` : `$${num}M`;
    }
    if (absVal >= 1e3) {
      const num = (absVal / 1e3).toFixed(1);
      return isNegative ? `($${num}K)` : `$${num}K`;
    }
    return isNegative ? `(${val.toFixed(2)})` : val.toFixed(2);
  };

  // CSV Export
  const exportStatementCsv = () => {
    if (!displayedLineItems.length || !periods.length) return;
    const headers = ['Line Item', ...periods];
    const rows = displayedLineItems.map((item) => {
      const vals = periods.map((p) => item.values?.[p] != null ? item.values[p] : '');
      return [`"${item.name.replace(/"/g, '""')}"`, ...vals];
    });

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${statementData?.ticker || 'wins'}_${activeStatement}_${periodType}.csv`);
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
              SEC Filings & Yahoo Finance Data
            </span>
            <span className="text-xs text-slate-400">• Raw Audited Statements (Zero AI Analysis)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Financial Statement Explorer</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Inspect raw Income Statement, Balance Sheet, and Cash Flow filings with customizable line items.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* Format Mode Toggle */}
          <button
            onClick={() => setFormatMode(formatMode === 'compact' ? 'full' : 'compact')}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition"
          >
            {formatMode === 'compact' ? 'Show Full Values' : 'Show Compact ($M/$B)'}
          </button>

          {/* Export CSV */}
          <button
            onClick={exportStatementCsv}
            disabled={!displayedLineItems.length}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 border border-slate-300 transition disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Quick Ticker Selector */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Enter ticker (e.g. AAPL, MSFT, NVDA, AMZN, JNJ)..."
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-2 uppercase font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !tickerInput.trim()}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 transition disabled:opacity-50"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            <span>Fetch Statements</span>
          </button>
        </form>

        {/* Quick Tickers */}
        <div className="flex items-center space-x-2 text-xs overflow-x-auto pt-1">
          <span className="text-slate-400 font-medium text-[11px]">Quick Symbols:</span>
          {QUICK_TICKERS.map((sym) => (
            <button
              key={sym}
              onClick={() => {
                setTickerInput(sym);
                fetchStatements(sym, periodType);
              }}
              className="px-2 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-mono font-semibold text-[11px] transition"
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-rose-500 hover:text-rose-700 font-bold">✕</button>
        </div>
      )}

      {/* Main Statement Viewer */}
      {isLoading ? (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-sm flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          <p className="font-semibold text-slate-800">Fetching audited statements from Yahoo Finance...</p>
          <p className="text-xs text-slate-400">Loading Income Statement, Balance Sheet, and Cash Flow</p>
        </div>
      ) : statementData ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden space-y-0">
          
          {/* Company Meta Header & Fetch Date Notice */}
          <div className="p-5 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-lg font-mono font-black text-white">{statementData.ticker}</span>
                <span className="text-xs text-slate-400">• {statementData.company_name}</span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                  {statementData.sector}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1 flex items-center space-x-2">
                <span>Exact Fetch Timestamp: <strong className="text-slate-200 font-mono">{statementData.fetch_date}</strong></span>
                <span>•</span>
                <span className="text-emerald-400">Raw Filing Data (Unmodified)</span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchStatements(statementData.ticker, periodType, true)}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition border border-slate-700"
                title="Force refresh statements cache"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Data</span>
              </button>
              {onAddTradeWithTicker && (
                <button
                  onClick={() => onAddTradeWithTicker(statementData.ticker)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 transition"
                >
                  <span>+ Trade</span>
                </button>
              )}
            </div>
          </div>

          {/* Statement Controls Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
            
            {/* Statement Type Tabs */}
            <div className="flex items-center space-x-1 bg-slate-200/80 p-1 rounded-lg">
              {[
                { id: 'income_statement', label: 'Income Statement' },
                { id: 'balance_sheet', label: 'Balance Sheet' },
                { id: 'cash_flow', label: 'Cash Flow' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveStatement(tab.id)}
                  className={`px-3 py-1.5 rounded-md font-semibold transition ${
                    activeStatement === tab.id
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Frequency Selector (Annual vs Quarterly) & Line Item Filter Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center bg-slate-200/80 p-1 rounded-lg">
                <button
                  onClick={() => handlePeriodTypeChange('annual')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    periodType === 'annual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Annual
                </button>
                <button
                  onClick={() => handlePeriodTypeChange('quarterly')}
                  className={`px-3 py-1 rounded-md font-semibold transition ${
                    periodType === 'quarterly' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Quarterly
                </button>
              </div>

              <button
                onClick={() => setShowItemFilterPanel(!showItemFilterPanel)}
                className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1.5 border transition ${
                  showItemFilterPanel
                    ? 'bg-blue-50 text-blue-700 border-blue-300'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Line Items ({activeSelectedSet.size} of {allLineItems.length})</span>
              </button>
            </div>

          </div>

          {/* Line Items Checkbox / Filter Panel */}
          {showItemFilterPanel && (
            <div className="p-4 bg-slate-50 border-b border-slate-200 space-y-3 text-xs animate-in fade-in duration-150">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-800">Select Line Items to Display:</span>
                  <button
                    onClick={selectKeyOnly}
                    className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-200 font-medium hover:bg-blue-100"
                  >
                    Key Items Preset
                  </button>
                  <button
                    onClick={selectAll}
                    className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300"
                  >
                    Select All
                  </button>
                  <button
                    onClick={clearAll}
                    className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded font-medium hover:bg-slate-300"
                  >
                    Clear All
                  </button>
                </div>

                <div className="relative max-w-xs">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search line item name..."
                    value={itemSearchQuery}
                    onChange={(e) => setItemSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1 border border-slate-300 rounded text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-2 bg-white rounded-lg border border-slate-200">
                {allLineItems
                  .filter((it) => !itemSearchQuery.trim() || it.name.toLowerCase().includes(itemSearchQuery.toLowerCase()))
                  .map((it) => {
                    const isChecked = activeSelectedSet.has(it.name);
                    return (
                      <label
                        key={it.name}
                        className="flex items-center space-x-2 p-1 rounded hover:bg-slate-50 cursor-pointer text-[11px]"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleItem(it.name)}
                          className="rounded text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        <span className={`truncate ${isChecked ? 'font-semibold text-slate-900' : 'text-slate-500'}`} title={it.name}>
                          {it.name}
                        </span>
                      </label>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Statements Data Table */}
          {displayedLineItems.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/80 text-slate-700 font-semibold border-b border-slate-200 text-[11px] uppercase tracking-wider">
                  <tr>
                    <th className="py-3 px-4 min-w-[240px]">Line Item</th>
                    {periods.map((p) => (
                      <th key={p} className="py-3 px-4 text-right font-mono font-bold text-slate-800 min-w-[130px]">
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-mono">
                  {displayedLineItems.map((item, idx) => {
                    const isKeyItem = item.is_key;
                    return (
                      <tr
                        key={item.name}
                        className={`${
                          isKeyItem ? 'bg-slate-50/70 font-semibold' : 'hover:bg-slate-50/50'
                        } transition-colors`}
                      >
                        <td className="py-3 px-4 font-sans text-slate-900 flex items-center space-x-1.5">
                          {isKeyItem && (
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-600 flex-shrink-0" title="Key Metric" />
                          )}
                          <span className={isKeyItem ? 'font-bold' : 'font-normal'}>{item.name}</span>
                        </td>

                        {periods.map((p) => {
                          const val = item.values?.[p];
                          const formatted = formatValue(val);
                          const isNegative = val != null && val < 0;

                          return (
                            <td
                              key={p}
                              className={`py-3 px-4 text-right whitespace-nowrap ${
                                isNegative ? 'text-rose-600 font-semibold' : 'text-slate-800'
                              }`}
                            >
                              {formatted}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-sm">
              <FileSpreadsheet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="font-semibold text-slate-700">No line items selected.</p>
              <p className="text-xs text-slate-400 mt-1">Open 'Line Items' above or click 'Key Items Preset' to display metrics.</p>
              <button
                onClick={selectKeyOnly}
                className="mt-3 px-4 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg"
              >
                Reset to Key Items Preset
              </button>
            </div>
          )}

        </div>
      ) : (
        <div className="p-16 bg-white rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
          <FileSpreadsheet className="w-12 h-12 mx-auto mb-2 text-slate-300" />
          <p className="font-semibold text-slate-700">No financial statement loaded.</p>
          <p className="text-xs text-slate-400 mt-1">Enter a ticker symbol above and click 'Fetch Statements' to view filings.</p>
        </div>
      )}

    </div>
  );
}
