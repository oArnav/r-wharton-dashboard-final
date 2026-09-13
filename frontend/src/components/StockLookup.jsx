import React, { useState, useEffect, useMemo } from 'react';
import {
  Search, Loader2, AlertCircle, TrendingUp, TrendingDown,
  DollarSign, Activity, ShieldCheck, BarChart2, RefreshCw,
  PlusCircle, CheckCircle, Calculator, LineChart as ChartIcon,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Area, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend
} from 'recharts';
import { api } from '../services/api';
import TimePeriodFilter, { sliceDataByPeriod } from './TimePeriodFilter';

const QUICK_TICKERS = ['AAPL', 'MSFT', 'NVDA', 'AMZN', 'GOOGL', 'SPY', 'JNJ', 'JPM'];

export default function StockLookup({ initialTicker = '', onAddTradeWithTicker, onSelectTickerForStatements }) {
  const [tickerInput, setTickerInput] = useState(initialTicker || 'AAPL');
  const [stockData, setStockData] = useState(null);
  const [historyData, setHistoryData] = useState([]);
  const [timeFilter, setTimeFilter] = useState('6M');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [error, setError] = useState('');
  const [customGrowthRate, setCustomGrowthRate] = useState('');

  const displayHistoryData = useMemo(() => {
    return sliceDataByPeriod(historyData, 'date', timeFilter);
  }, [historyData, timeFilter]);

  const handleFetchStock = async (symbol = tickerInput, forceRefresh = false) => {
    const sym = symbol.trim().toUpperCase();
    if (!sym) return;

    setIsLoading(true);
    setIsLoadingHistory(true);
    setError('');
    try {
      const [data, hist] = await Promise.all([
        api.getStock(sym, forceRefresh),
        api.getStockHistory(sym, '5y').catch(() => [])
      ]);
      setStockData(data);
      setTickerInput(sym);
      setHistoryData(hist || []);
      if (data?.eps_growth_yoy != null) {
        setCustomGrowthRate((data.eps_growth_yoy * 100).toFixed(1));
      } else {
        setCustomGrowthRate('');
      }
    } catch (err) {
      setError(err.message || `Failed to retrieve data for '${sym}'.`);
      setStockData(null);
      setHistoryData([]);
    } finally {
      setIsLoading(false);
      setIsLoadingHistory(false);
    }
  };

  const fetchPriceHistory = async (symbol, period) => {
    setIsLoadingHistory(true);
    try {
      const hist = await api.getStockHistory(symbol, period);
      setHistoryData(hist || []);
    } catch (err) {
      console.error('Failed to load history:', err);
      setHistoryData([]);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (initialTicker) {
      handleFetchStock(initialTicker);
    } else {
      handleFetchStock('AAPL');
    }
  }, [initialTicker]);

  const handlePeriodChange = (p) => {
    setHistoryPeriod(p);
    if (stockData?.ticker) {
      fetchPriceHistory(stockData.ticker, p);
    }
  };

  const formatNumber = (val, prefix = '', suffix = '', decimals = 2) => {
    if (val == null || isNaN(val)) return '—';
    return `${prefix}${Number(val).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`;
  };

  const formatLargeCurrency = (val) => {
    if (val == null || isNaN(val)) return '—';
    const num = Number(val);
    if (Math.abs(num) >= 1e12) return `$${(num / 1e12).toFixed(2)}T`;
    if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
    if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
    return `$${num.toLocaleString()}`;
  };

  const formatPct = (val) => {
    if (val == null || isNaN(val)) return '—';
    return `${(Number(val) * 100).toFixed(2)}%`;
  };

  const computedPeg = (() => {
    if (!stockData || stockData.pe_ratio == null) return null;
    const g = parseFloat(customGrowthRate);
    if (!isNaN(g) && g > 0) {
      return (stockData.pe_ratio / g).toFixed(2);
    }
    return stockData.peg_ratio != null ? stockData.peg_ratio.toFixed(2) : null;
  })();

  const range52Pct = (() => {
    if (!stockData || stockData.fifty_two_week_low == null || stockData.fifty_two_week_high == null) return null;
    const low = stockData.fifty_two_week_low;
    const high = stockData.fifty_two_week_high;
    const cur = stockData.current_price;
    if (high <= low) return 50;
    const pct = ((cur - low) / (high - low)) * 100;
    return Math.max(0, Math.min(100, pct));
  })();

  return (
    <div className="space-y-6">
      
      {/* Top Search Bar & Popular Pills */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleFetchStock();
          }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="w-5 h-5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search ticker symbol (e.g. AAPL, MSFT, NVDA, SPY)..."
              value={tickerInput}
              onChange={(e) => setTickerInput(e.target.value.toUpperCase())}
              className="w-full pl-10 pr-4 py-2.5 uppercase font-mono font-bold text-slate-900 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-base"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !tickerInput.trim()}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-sm flex items-center justify-center space-x-2 transition disabled:opacity-50 shadow-sm"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Fetching Data...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span>Fetch Fundamentals</span>
              </>
            )}
          </button>
        </form>

        <div className="mt-3 flex items-center space-x-2 overflow-x-auto text-xs">
          <span className="text-slate-400 font-medium">Quick Watch:</span>
          {QUICK_TICKERS.map((sym) => (
            <button
              key={sym}
              type="button"
              onClick={() => handleFetchStock(sym)}
              className={`px-2.5 py-1 rounded-md font-mono font-semibold transition ${
                tickerInput === sym
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {sym}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Lookup Error:</span>
            <p className="mt-0.5 text-xs text-rose-600">{error}</p>
          </div>
        </div>
      )}

      {stockData && (
        <div className="space-y-6">
          
          {/* Header Banner */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3">
                <span className="text-2xl font-black font-mono tracking-tight text-white">{stockData.ticker}</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  {stockData.sector}
                </span>
                <span className="text-xs text-slate-400">{stockData.industry}</span>
              </div>
              <h2 className="text-lg font-semibold text-slate-200 mt-1">{stockData.company_name}</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Data Source: Yahoo Finance • 15-min Cache Active
              </p>
            </div>

            <div className="flex items-center space-x-4">
              <div className="text-right">
                <span className="text-xs text-slate-400 block uppercase tracking-wider">Live Price</span>
                <span className="text-3xl font-bold font-mono text-emerald-400">
                  ${Number(stockData.current_price).toFixed(2)}
                </span>
                <span className="text-[11px] text-slate-400 block">{stockData.currency}</span>
              </div>

              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => onAddTradeWithTicker(stockData.ticker)}
                  className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Record in Trade Log</span>
                </button>

                {onSelectTickerForStatements && (
                  <button
                    onClick={() => onSelectTickerForStatements(stockData.ticker)}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center space-x-1.5 shadow-sm transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>View Statements</span>
                  </button>
                )}

                <button
                  onClick={() => handleFetchStock(stockData.ticker, true)}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium flex items-center justify-center space-x-1 transition"
                  title="Force fresh market fetch"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Force Fresh Fetch</span>
                </button>
              </div>
            </div>
          </div>

          {/* Price History Chart Component */}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <ChartIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Price History & Trend Channels — {stockData.ticker}</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Includes 50-day and 200-day rolling moving averages</p>
              </div>

              <TimePeriodFilter activePeriod={timeFilter} onChange={setTimeFilter} />
            </div>

            {isLoadingHistory ? (
              <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                <span>Loading price series...</span>
              </div>
            ) : displayHistoryData.length > 0 ? (
              <div className="h-64 w-full" style={{ minHeight: '260px' }}>
                <ResponsiveContainer width="100%" height={260} minHeight={260}>
                  <ComposedChart data={displayHistoryData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#94a3b8" strokeOpacity={0.25} />
                    <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `$${v}`}
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <Tooltip
                      formatter={(val, name) => [
                        `$${Number(val).toFixed(2)}`,
                        name === 'price' ? 'Close Price' : name === 'ma50' ? '50-Day MA' : '200-Day MA'
                      ]}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="price"
                      name="price"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorPrice)"
                    />
                    <Line
                      type="monotone"
                      dataKey="ma50"
                      name="ma50"
                      stroke="#f59e0b"
                      strokeWidth={1.5}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="ma200"
                      name="ma200"
                      stroke="#10b981"
                      strokeWidth={1.5}
                      strokeDasharray="3 3"
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-slate-400 dark:text-slate-500 text-xs">
                Historical chart unavailable for this symbol.
              </div>
            )}
          </div>

          {/* 52-Week Range Bar */}
          {stockData.fifty_two_week_low != null && stockData.fifty_two_week_high != null && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-center text-xs text-slate-600 font-medium mb-1.5">
                <span className="font-semibold text-slate-700">52-Week Price Range</span>
                <span className="font-mono text-slate-500">
                  ${stockData.fifty_two_week_low.toFixed(2)} — ${stockData.fifty_two_week_high.toFixed(2)}
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-3 relative overflow-hidden">
                <div
                  className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${range52Pct}%` }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-slate-400 mt-1 font-mono">
                <span>52W Low: ${stockData.fifty_two_week_low.toFixed(2)}</span>
                <span className="font-semibold text-slate-700">Current: ${stockData.current_price.toFixed(2)} ({range52Pct?.toFixed(0)}% of range)</span>
                <span>52W High: ${stockData.fifty_two_week_high.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Thematic Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Card 1: Valuation Multiples */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-3 border-b border-slate-100 pb-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <span>Valuation Multiples</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">P/E (Trailing)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNumber(stockData.pe_ratio)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Forward P/E</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNumber(stockData.forward_pe)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">P/B Ratio</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNumber(stockData.pb_ratio)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">EV / EBITDA</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNumber(stockData.ev_ebitda)}x</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">EPS (TTM)</span>
                  <span className="font-mono font-semibold text-slate-900">${formatNumber(stockData.eps)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Market Cap</span>
                  <span className="font-mono font-semibold text-slate-900">{formatLargeCurrency(stockData.market_cap)}</span>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-700 flex items-center space-x-1">
                      <Calculator className="w-3 h-3 text-blue-500" />
                      <span>PEG Ratio</span>
                    </span>
                    <span className="font-mono font-bold text-blue-600">
                      {computedPeg ? `${computedPeg}x` : '—'}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-[10px] text-slate-500">
                    <span>Est Growth:</span>
                    <input
                      type="number"
                      placeholder="e.g. 15"
                      value={customGrowthRate}
                      onChange={(e) => setCustomGrowthRate(e.target.value)}
                      className="w-14 px-1.5 py-0.5 border border-slate-300 rounded font-mono text-center text-slate-800 bg-slate-50"
                    />
                    <span>%</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Profitability & Margins */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-3 border-b border-slate-100 pb-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Profitability & Margins</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Gross Margin</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.gross_margin)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Operating Margin</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.operating_margin)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Net Profit Margin</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.net_margin)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Return on Equity (ROE)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.roe)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Return on Assets (ROA)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.roa)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Revenue (TTM)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatLargeCurrency(stockData.revenue_ttm)}</span>
                </div>
              </div>
            </div>

            {/* Card 3: Solvency & Risk */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-3 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>Balance Sheet & Risk</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Stock Beta (5Y)</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNumber(stockData.beta)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Debt-to-Equity</span>
                  <span className="font-mono font-semibold text-slate-900">
                    {stockData.debt_to_equity != null ? `${stockData.debt_to_equity}%` : '—'}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Current Ratio</span>
                  <span className="font-mono font-semibold text-slate-900">{formatNumber(stockData.current_ratio)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Forward EPS</span>
                  <span className="font-mono font-semibold text-slate-900">${formatNumber(stockData.forward_eps)}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-[11px] text-slate-600 mt-3">
                  <span className="font-semibold block mb-0.5">Beta interpretation:</span>
                  {stockData.beta != null ? (
                    stockData.beta > 1 ? (
                      <span>{(stockData.beta - 1).toFixed(2)}x more volatile than S&P 500 index.</span>
                    ) : (
                      <span>{(1 - stockData.beta).toFixed(2)}x less volatile than broad market.</span>
                    )
                  ) : 'Beta data unavailable.'}
                </div>
              </div>
            </div>

            {/* Card 4: Technicals & Growth */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
              <div className="flex items-center space-x-2 text-slate-900 font-bold text-sm mb-3 border-b border-slate-100 pb-2">
                <BarChart2 className="w-4 h-4 text-amber-600" />
                <span>Technicals & Growth</span>
              </div>
              <div className="space-y-2.5 text-xs">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">50-Day Moving Avg</span>
                  <span className="font-mono font-semibold text-slate-900">${formatNumber(stockData.fifty_day_ma)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">200-Day Moving Avg</span>
                  <span className="font-mono font-semibold text-slate-900">${formatNumber(stockData.two_hundred_day_ma)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Dividend Yield</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.dividend_yield)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Revenue Growth YoY</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.revenue_growth_yoy)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">EPS Growth YoY</span>
                  <span className="font-mono font-semibold text-slate-900">{formatPct(stockData.eps_growth_yoy)}</span>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
