import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Navbar from './components/Navbar';
import HomeDashboard from './components/HomeDashboard';
import PortfolioOverview from './components/PortfolioOverview';
import TradeLog from './components/TradeLog';
import ApprovedStockList from './components/ApprovedStockList';
import SectorDashboard from './components/SectorDashboard';
import CompanyScreener from './components/CompanyScreener';
import BenchmarkRiskView from './components/BenchmarkRiskView';
import ReportOutline from './components/ReportOutline';
import NewsScanner from './components/NewsScanner';
import StockLookup from './components/StockLookup';
import AIUsageLog from './components/AIUsageLog';
import AddTradeModal from './components/AddTradeModal';
import FinancialStatements from './components/FinancialStatements';
import Watchlist from './components/Watchlist';
import CompanyCompare from './components/CompanyCompare';
import { api } from './services/api';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [summary, setSummary] = useState(null);
  const [trades, setTrades] = useState([]);
  const [ips, setIps] = useState(null);
  const [sectors, setSectors] = useState([]);
  const [aiLogs, setAiLogs] = useState([]);
  const [approvedStocks, setApprovedStocks] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [globalError, setGlobalError] = useState('');
  const [toast, setToast] = useState(null);

  // Cross-tab actions & state
  const [selectedLookupTicker, setSelectedLookupTicker] = useState('AAPL');
  const [selectedStatementTicker, setSelectedStatementTicker] = useState('AAPL');
  const [isTradeModalOpenPrefill, setIsTradeModalOpenPrefill] = useState(false);
  const [prefillTradeTicker, setPrefillTradeTicker] = useState('');

  const approvedTickers = useMemo(() => {
    return new Set((approvedStocks || []).map((s) => s.ticker?.toUpperCase()));
  }, [approvedStocks]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev?.message === message ? null : prev));
    }, 4000);
  };

  const loadAllData = useCallback(async (customRf = null) => {
    setIsRefreshing(true);
    setGlobalError('');
    try {
      const [sumRes, tradesRes, ipsRes, sectorsRes, logsRes, approvedRes, watchlistRes] = await Promise.all([
        api.getPortfolioSummary(customRf),
        api.getTrades(),
        api.getIps(),
        api.getSectors(),
        api.getAiLogs(),
        api.getApprovedStocks(),
        api.getWatchlist().catch(() => []),
      ]);
      setSummary(sumRes);
      setTrades(tradesRes);
      setIps(ipsRes);
      setSectors(sectorsRes);
      setAiLogs(logsRes);
      setApprovedStocks(approvedRes || []);
      setWatchlist(watchlistRes || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setGlobalError(err.message || 'Unable to connect to backend server. Make sure the API server is running at http://localhost:8000.');
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Client IPS update
  const handleUpdateIps = async (ipsData) => {
    const updated = await api.updateIps(ipsData);
    setIps(updated);
    showToast('Client IPS updated and persisted across team dashboard.');
  };

  // Sector actions
  const handleAddSector = async (sectorData) => {
    await api.addSector(sectorData);
    const updatedSectors = await api.getSectors();
    setSectors(updatedSectors);
    showToast(`Tracked sector ${sectorData.name} (${sectorData.etf_ticker}) added.`);
  };

  const handleUpdateSector = async (sectorId, sectorData) => {
    await api.updateSector(sectorId, sectorData);
    const updatedSectors = await api.getSectors();
    setSectors(updatedSectors);
    showToast('Sector macro notes and stance updated.');
  };

  const handleDeleteSector = async (sectorId) => {
    await api.deleteSector(sectorId);
    const updatedSectors = await api.getSectors();
    setSectors(updatedSectors);
    showToast('Sector removed from tracked list.', 'info');
  };

  // Trade actions
  const handleTradeCreated = async (tradeData) => {
    await api.createTrade(tradeData);
    await loadAllData();
    showToast(`Trade for ${tradeData.ticker} executed and added to portfolio.`);
  };

  const handleTradeClosed = async (tradeId, exitData) => {
    const closed = await api.closePosition(tradeId, exitData);
    await loadAllData();
    const pnl = closed.realized_pnl >= 0 ? `+$${closed.realized_pnl}` : `-$${Math.abs(closed.realized_pnl)}`;
    showToast(`Position ${closed.ticker} closed with ${pnl} realized P&L.`);
  };

  const handleUpdateTradeIps = async (tradeId, ipsAlignment, ipsFitStatus) => {
    await api.updateTradeIps(tradeId, ipsAlignment, ipsFitStatus);
    await loadAllData();
    showToast('Client IPS alignment documented for holding.');
  };

  const handleDeleteTrade = async (tradeId) => {
    await api.deleteTrade(tradeId);
    await loadAllData();
    showToast('Trade record removed from database.', 'info');
  };

  // Approved Stocks actions
  const handleAddApprovedStock = async (stockData) => {
    await api.addApprovedStock(stockData);
    const updated = await api.getApprovedStocks();
    setApprovedStocks(updated);
    showToast(`${stockData.ticker} added to Wharton Approved Stock List.`);
  };

  const handleBulkAddApprovedStocks = async (tickers, defaultNote) => {
    const res = await api.bulkAddApprovedStocks(tickers, defaultNote);
    const updated = await api.getApprovedStocks();
    setApprovedStocks(updated);
    showToast(`Imported ${res.added_count} new tickers (${res.total_in_batch} evaluated) to Approved List.`);
  };

  const handleDeleteApprovedStock = async (ticker) => {
    await api.deleteApprovedStock(ticker);
    const updated = await api.getApprovedStocks();
    setApprovedStocks(updated);
    showToast(`${ticker} removed from approved list.`, 'info');
  };

  // AI Log action
  const handleLogAdded = async (logData) => {
    await api.createAiLog(logData);
    await loadAllData();
    showToast(`AI log entry for ${logData.team_member} recorded.`);
  };

  // Update Risk Free Rate
  const handleUpdateRiskFreeRate = async (newRate) => {
    await loadAllData(newRate);
    showToast(`Risk-free rate set to ${newRate}%. Risk metrics recalculated.`);
  };

  // Cross-tab navigations
  const handleSelectTickerForLookup = (ticker) => {
    setSelectedLookupTicker(ticker);
    setActiveTab('lookup');
  };

  const handleSelectTickerForStatements = (ticker) => {
    setSelectedStatementTicker(ticker);
    setActiveTab('statements');
  };

  const handleAddTradeWithTicker = (ticker) => {
    setPrefillTradeTicker(ticker);
    setIsTradeModalOpenPrefill(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900">
      
      {/* Navigation Bar with Quick-Jump Search & Mobile Drawer */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onRefresh={() => loadAllData()}
        isRefreshing={isRefreshing}
        cashRemaining={summary?.cash_remaining}
        portfolioValue={summary?.total_portfolio_value}
        trades={trades}
        approvedStocks={approvedStocks}
        sectors={sectors}
        watchlist={watchlist}
        onSelectTickerForLookup={handleSelectTickerForLookup}
        onSelectTickerForStatements={handleSelectTickerForStatements}
        onAddTradeWithTicker={handleAddTradeWithTicker}
      />

      {/* Global Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div className={`px-4 py-3 rounded-xl shadow-lg border flex items-center space-x-3 text-xs font-medium ${
            toast.type === 'success'
              ? 'bg-emerald-900 text-white border-emerald-700'
              : toast.type === 'info'
              ? 'bg-slate-900 text-white border-slate-700'
              : 'bg-rose-900 text-white border-rose-700'
          }`}>
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" />
            )}
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="text-white/60 hover:text-white ml-2">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
        
        {globalError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start justify-between">
            <div className="flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Backend Connection Issue:</span>
                <p className="mt-0.5">{globalError}</p>
                <p className="mt-1 text-slate-500">Ensure backend server is running at http://localhost:8000.</p>
              </div>
            </div>
            <button
              onClick={() => loadAllData()}
              className="px-2.5 py-1 bg-rose-200 hover:bg-rose-300 text-rose-900 rounded font-semibold text-[11px]"
            >
              Retry
            </button>
          </div>
        )}

        {/* Tab 0: Home Command Center / Countdown & Activity Feed */}
        {activeTab === 'home' && (
          <HomeDashboard
            summary={summary}
            ips={ips}
            trades={trades}
            approvedCount={approvedStocks.length}
            onSelectTab={setActiveTab}
            onSelectTickerForStatements={handleSelectTickerForStatements}
            onSelectTickerForLookup={handleSelectTickerForLookup}
          />
        )}

        {/* Tab 1: Portfolio Overview & IPS */}
        {activeTab === 'overview' && (
          <PortfolioOverview
            summary={summary}
            ips={ips}
            trades={trades}
            onUpdateIps={handleUpdateIps}
            onUpdateTradeIps={handleUpdateTradeIps}
            onUpdateRiskFreeRate={handleUpdateRiskFreeRate}
            onSelectTab={setActiveTab}
          />
        )}

        {/* Tab 2: Trade Log */}
        {activeTab === 'trades' && (
          <TradeLog
            trades={trades}
            approvedTickers={approvedTickers}
            availableCash={summary?.cash_remaining != null ? summary.cash_remaining : 500000}
            onRefresh={() => loadAllData()}
            onTradeCreated={handleTradeCreated}
            onTradeClosed={handleTradeClosed}
            onUpdateTradeIps={handleUpdateTradeIps}
            onDeleteTrade={handleDeleteTrade}
            onSelectTickerForLookup={handleSelectTickerForLookup}
          />
        )}

        {/* Tab 3: Watchlist Pipeline (Phase 4) */}
        {activeTab === 'watchlist' && (
          <Watchlist
            onSelectTickerForLookup={handleSelectTickerForLookup}
            onSelectTickerForStatements={handleSelectTickerForStatements}
            onAddTradeWithTicker={handleAddTradeWithTicker}
            approvedTickers={approvedTickers}
          />
        )}

        {/* Tab 4: Raw Financial Statements (Phase 4) */}
        {activeTab === 'statements' && (
          <FinancialStatements
            initialTicker={selectedStatementTicker}
            onSelectTickerForLookup={handleSelectTickerForLookup}
            onAddTradeWithTicker={handleAddTradeWithTicker}
            approvedTickers={approvedTickers}
          />
        )}

        {/* Tab 5: Peer Comparison Matrix (Phase 4) */}
        {activeTab === 'compare' && (
          <CompanyCompare
            onSelectTickerForStatements={handleSelectTickerForStatements}
            onAddTradeWithTicker={handleAddTradeWithTicker}
            approvedTickers={approvedTickers}
          />
        )}

        {/* Tab 6: Approved Stock List */}
        {activeTab === 'approved' && (
          <ApprovedStockList
            approvedStocks={approvedStocks}
            onAddStock={handleAddApprovedStock}
            onBulkAdd={handleBulkAddApprovedStocks}
            onDeleteStock={handleDeleteApprovedStock}
            onSelectTickerForLookup={handleSelectTickerForLookup}
          />
        )}

        {/* Tab 7: Screener / Scorecard */}
        {activeTab === 'screener' && (
          <CompanyScreener
            onSelectTickerForLookup={handleSelectTickerForLookup}
            onAddTradeWithTicker={handleAddTradeWithTicker}
            approvedTickers={approvedTickers}
          />
        )}

        {/* Tab 8: Sector Dashboard */}
        {activeTab === 'sectors' && (
          <SectorDashboard
            sectors={sectors}
            trades={trades}
            summary={summary}
            onAddSector={handleAddSector}
            onUpdateSector={handleUpdateSector}
            onDeleteSector={handleDeleteSector}
            onRefresh={() => loadAllData()}
            isRefreshing={isRefreshing}
          />
        )}

        {/* Tab 9: Benchmark & Risk Engine */}
        {activeTab === 'benchmark' && (
          <BenchmarkRiskView
            summary={summary}
            trades={trades}
            onUpdateRiskFreeRate={handleUpdateRiskFreeRate}
          />
        )}

        {/* Tab 10: Report Outline Skeleton */}
        {activeTab === 'report' && (
          <ReportOutline />
        )}

        {/* Tab 11: News Scanner */}
        {activeTab === 'news' && (
          <NewsScanner />
        )}

        {/* Tab 12: Stock Lookup */}
        {activeTab === 'lookup' && (
          <StockLookup
            initialTicker={selectedLookupTicker}
            onAddTradeWithTicker={handleAddTradeWithTicker}
            onSelectTickerForStatements={handleSelectTickerForStatements}
          />
        )}

        {/* Tab 13: AI Usage Log */}
        {activeTab === 'ai-log' && (
          <AIUsageLog
            logs={aiLogs}
            onLogAdded={handleLogAdded}
          />
        )}

      </main>

      {/* Prefilled Trade Modal from Stock Lookup, Screener, or Watchlist */}
      <AddTradeModal
        isOpen={isTradeModalOpenPrefill}
        onClose={() => setIsTradeModalOpenPrefill(false)}
        onTradeCreated={handleTradeCreated}
        prefillTicker={prefillTradeTicker}
        approvedTickers={approvedTickers}
        availableCash={summary?.cash_remaining != null ? summary.cash_remaining : 500000}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>Wharton Investment Simulator (WInS) Team Portal • Virtual Capital: $500,000</span>
          <div className="flex items-center space-x-3 sm:space-x-4 text-[11px] flex-wrap justify-center">
            <span className="font-semibold text-blue-600">Phase 5 Production Governance Build</span>
            <span>•</span>
            <span>Real-time yfinance feed (Zero AI fabrication)</span>
            <span>•</span>
            <span className="text-emerald-600 font-medium">● SQLite WAL DB Synchronized</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
