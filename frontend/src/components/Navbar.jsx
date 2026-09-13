import React, { useState, useEffect, useRef } from 'react';
import {
  Home, LayoutDashboard, ListOrdered, Search, BrainCircuit, RefreshCw,
  Layers, SlidersHorizontal, TrendingUp, Newspaper, ShieldCheck, FileText,
  Eye, Scale, FileSpreadsheet, Menu, X, ArrowRight, CornerDownLeft, Sparkles,
  Download, Sun, Moon
} from 'lucide-react';
import { api } from '../services/api';

export default function Navbar({
  activeTab,
  setActiveTab,
  onRefresh,
  isRefreshing,
  cashRemaining,
  portfolioValue,
  trades = [],
  approvedStocks = [],
  sectors = [],
  watchlist = [],
  onSelectTickerForLookup,
  onSelectTickerForStatements,
  onAddTradeWithTicker,
  isDarkMode = false,
  onToggleDarkMode
}) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const tabs = [
    { id: 'home', label: 'Command Center', shortLabel: 'Home', icon: Home },
    { id: 'overview', label: 'Portfolio & IPS', shortLabel: 'Portfolio', icon: LayoutDashboard },
    { id: 'trades', label: 'Trade Log', shortLabel: 'Trades', icon: ListOrdered },
    { id: 'watchlist', label: 'Watchlist', shortLabel: 'Watchlist', icon: Eye },
    { id: 'statements', label: 'Financial Statements', shortLabel: 'Statements', icon: FileSpreadsheet },
    { id: 'compare', label: 'Compare Matrix', shortLabel: 'Compare', icon: Scale },
    { id: 'screener', label: 'Screener', shortLabel: 'Screener', icon: SlidersHorizontal },
    { id: 'sectors', label: 'Sectors', shortLabel: 'Sectors', icon: Layers },
    { id: 'benchmark', label: 'Risk / Benchmark', shortLabel: 'Risk', icon: TrendingUp },
    { id: 'approved', label: 'Approved Stocks', shortLabel: 'Approved', icon: ShieldCheck },
    { id: 'report', label: 'Report Skeleton', shortLabel: 'Report', icon: FileText },
    { id: 'news', label: 'News Scanner', shortLabel: 'News', icon: Newspaper },
    { id: 'lookup', label: 'Stock Lookup', shortLabel: 'Lookup', icon: Search },
    { id: 'ai-log', label: 'AI Usage Log', shortLabel: 'AI Log', icon: BrainCircuit },
  ];

  // Global keyboard shortcut: press '/' to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
        e.preventDefault();
        setIsSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        setSearchQuery('');
        searchInputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside to close search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter Quick-Jump search results
  const getSearchResults = () => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return { tabs: [], stocks: [], sectorsList: [] };

    // 1. Matching tabs
    const matchedTabs = tabs.filter(
      (t) => t.label.toLowerCase().includes(q) || t.shortLabel.toLowerCase().includes(q) || t.id.toLowerCase().includes(q)
    );

    // 2. Collect unique tickers from portfolio, approved list, and watchlist
    const tickerMap = new Map();
    trades.forEach((t) => {
      if (t.ticker) tickerMap.set(t.ticker.toUpperCase(), { ticker: t.ticker.toUpperCase(), name: t.company_name, source: 'Holding' });
    });
    watchlist.forEach((w) => {
      if (w.ticker && !tickerMap.has(w.ticker.toUpperCase())) {
        tickerMap.set(w.ticker.toUpperCase(), { ticker: w.ticker.toUpperCase(), name: w.company_name, source: 'Watchlist' });
      }
    });
    approvedStocks.forEach((a) => {
      if (a.ticker && !tickerMap.has(a.ticker.toUpperCase())) {
        tickerMap.set(a.ticker.toUpperCase(), { ticker: a.ticker.toUpperCase(), name: a.company_name, source: 'Approved List' });
      }
    });

    // If query is an uppercase ticker like AAPL, ensure it's suggested even if not in DB
    const upperQ = q.toUpperCase();
    if (/^[A-Z0-9.\-]{1,6}$/.test(upperQ) && !tickerMap.has(upperQ)) {
      tickerMap.set(upperQ, { ticker: upperQ, name: 'Direct Lookup', source: 'Market' });
    }

    const matchedStocks = Array.from(tickerMap.values()).filter(
      (s) => s.ticker.toLowerCase().includes(q) || (s.name && s.name.toLowerCase().includes(q))
    ).slice(0, 6);

    // 3. Matching sectors
    const matchedSectors = (sectors || []).filter(
      (s) => s.name?.toLowerCase().includes(q) || s.etf_ticker?.toLowerCase().includes(q)
    ).slice(0, 4);

    return {
      tabs: matchedTabs.slice(0, 5),
      stocks: matchedStocks,
      sectorsList: matchedSectors,
    };
  };

  const results = getSearchResults();
  const hasResults = results.tabs.length > 0 || results.stocks.length > 0 || results.sectorsList.length > 0;

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setIsSearchOpen(false);
    setIsMobileMenuOpen(false);
    setSearchQuery('');
  };

  const handleStockAction = (ticker, action) => {
    setIsSearchOpen(false);
    setSearchQuery('');
    if (action === 'lookup' && onSelectTickerForLookup) {
      onSelectTickerForLookup(ticker);
    } else if (action === 'statements' && onSelectTickerForStatements) {
      onSelectTickerForStatements(ticker);
    } else if (action === 'trade' && onAddTradeWithTicker) {
      onAddTradeWithTicker(ticker);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-md">
      {/* Top Header Row */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Subtitle */}
          <div
            onClick={() => handleSelectTab('home')}
            className="flex items-center space-x-3 cursor-pointer flex-shrink-0"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center font-black text-lg shadow-inner border border-blue-400/30 text-white">
              W
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-base sm:text-lg tracking-tight text-white">Wharton WInS</span>
              </div>
              <p className="text-[11px] text-slate-400 hidden sm:block">$500,000 Team Virtual Fund</p>
            </div>
          </div>

          {/* Persistent Quick-Jump Search Bar (Desktop & Tablet) */}
          <div ref={searchContainerRef} className="relative flex-1 max-w-md mx-2 sm:mx-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                placeholder="Quick-Jump: ticker, sector, page..."
                className="w-full pl-9 pr-14 py-1.5 bg-slate-800/90 hover:bg-slate-800 focus:bg-slate-800 text-xs text-white rounded-xl border border-slate-700/80 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition placeholder-slate-400 outline-none"
              />
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center space-x-1 pointer-events-none">
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-700/80 text-slate-300 rounded border border-slate-600">
                  /
                </kbd>
              </div>
            </div>

            {/* Dropdown Results Popover */}
            {isSearchOpen && searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50 text-xs divide-y divide-slate-800 animate-in fade-in-50 duration-150 max-h-[80vh] overflow-y-auto">
                
                {/* 1. Tickers & Company Actions */}
                {results.stocks.length > 0 && (
                  <div className="p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                      Companies & Tickers
                    </span>
                    <div className="space-y-1">
                      {results.stocks.map((stock) => (
                        <div
                          key={stock.ticker}
                          className="p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between transition"
                        >
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-white font-mono">{stock.ticker}</span>
                              <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                {stock.name || stock.source}
                              </span>
                            </div>
                            <span className="text-[9px] uppercase px-1.5 py-0.2 bg-slate-800 text-slate-400 rounded">
                              {stock.source}
                            </span>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            <button
                              onClick={() => handleStockAction(stock.ticker, 'lookup')}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-[11px] font-semibold flex items-center space-x-1 transition"
                            >
                              <span>Lookup</span>
                            </button>
                            <button
                              onClick={() => handleStockAction(stock.ticker, 'statements')}
                              className="px-2 py-1 bg-indigo-600/80 hover:bg-indigo-600 text-white rounded text-[11px] font-semibold flex items-center space-x-1 transition"
                            >
                              <span>Statements</span>
                            </button>
                            <button
                              onClick={() => handleStockAction(stock.ticker, 'trade')}
                              className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-[11px] font-semibold flex items-center space-x-1 transition"
                            >
                              <span>Trade</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Matched Tabs / Pages */}
                {results.tabs.length > 0 && (
                  <div className="p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                      Pages & Views
                    </span>
                    <div className="space-y-0.5">
                      {results.tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleSelectTab(tab.id)}
                            className="w-full p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-left transition"
                          >
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4 text-blue-400" />
                              <span className="font-medium text-white">{tab.label}</span>
                            </div>
                            <span className="text-[10px] text-slate-400 flex items-center space-x-0.5">
                              <span>Jump</span>
                              <ArrowRight className="w-3 h-3" />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 3. Matched Sectors */}
                {results.sectorsList.length > 0 && (
                  <div className="p-2">
                    <span className="text-[10px] uppercase font-bold text-slate-400 px-2 py-1 block">
                      Tracked Sectors
                    </span>
                    <div className="space-y-0.5">
                      {results.sectorsList.map((sector) => (
                        <button
                          key={sector.id || sector.etf_ticker}
                          onClick={() => handleSelectTab('sectors')}
                          className="w-full p-2 rounded-lg hover:bg-slate-800 flex items-center justify-between text-left transition"
                        >
                          <div className="flex items-center space-x-2">
                            <Layers className="w-4 h-4 text-amber-400" />
                            <span className="font-medium text-white">{sector.name} ({sector.etf_ticker})</span>
                          </div>
                          <span className="text-[10px] text-slate-400">Sector View</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {!hasResults && (
                  <div className="p-4 text-center text-slate-400 text-xs">
                    No exact match for "{searchQuery}". Press Enter or click below to lookup ticker:
                    <div className="mt-2 flex justify-center space-x-2">
                      <button
                        onClick={() => handleStockAction(searchQuery.toUpperCase(), 'lookup')}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded font-semibold text-xs"
                      >
                        Lookup {searchQuery.toUpperCase()}
                      </button>
                      <button
                        onClick={() => handleStockAction(searchQuery.toUpperCase(), 'statements')}
                        className="px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-semibold text-xs"
                      >
                        Statements
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Portfolio Ticker Pill (Desktop) */}
          <div className="hidden xl:flex items-center space-x-4 bg-slate-800/90 px-3.5 py-1.5 rounded-xl border border-slate-700/70 text-xs flex-shrink-0">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Portfolio</span>
              <span className="font-mono font-bold text-emerald-400">
                ${portfolioValue != null ? Number(portfolioValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '500,000.00'}
              </span>
            </div>
            <div className="h-5 w-px bg-slate-700"></div>
            <div>
              <span className="text-[10px] text-slate-400 block">Cash Left</span>
              <span className="font-mono font-bold text-slate-200">
                ${cashRemaining != null ? Number(cashRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '500,000.00'}
              </span>
            </div>
          </div>

          {/* Action Buttons: Dark Mode Switch, Backup, Refresh & Mobile Menu Hamburger */}
          <div className="flex items-center space-x-2 flex-shrink-0">
            {/* Dark Mode Switch Toggle */}
            <button
              onClick={onToggleDarkMode}
              title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              aria-label={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
              className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition flex items-center justify-center min-w-[38px] min-h-[38px] shadow-sm group"
            >
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-blue-300 group-hover:-rotate-12 transition-transform" />
              )}
            </button>

            <button
              onClick={() => api.downloadFullBackup()}
              title="Download Complete System Database Backup (JSON)"
              className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition min-h-[38px]"
            >
              <Download className="w-3.5 h-3.5 text-blue-400" />
              <span>Backup</span>
            </button>

            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh live prices and data"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition disabled:opacity-50 min-w-[40px] min-h-[40px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
            </button>

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition min-w-[44px] min-h-[44px] flex items-center justify-center border border-slate-700"
              aria-label="Toggle Navigation Menu"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Desktop Sub-Nav Tab Strip with smooth horizontal scroll */}
      <div className="border-t border-slate-800/80 bg-slate-950/60 backdrop-blur-sm hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center space-x-1 overflow-x-auto py-1.5 scrollbar-none">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap relative ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>{tab.label}</span>
                  {tab.isNew && (
                    <span className={`text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full ${
                      isActive ? 'bg-blue-800 text-white' : 'bg-blue-500/20 text-blue-300 border border-blue-400/30'
                    }`}>
                      P4
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Drawer Navigation (Phone & Tablet Viewports) */}
      {isMobileMenuOpen && (
        <div className="lg:hidden border-t border-slate-800 bg-slate-900 px-4 pt-3 pb-6 space-y-4 animate-in slide-in-from-top duration-200 shadow-xl">
          
          {/* Mobile Portfolio Equity Strip */}
          <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Portfolio</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">
                ${portfolioValue != null ? Number(portfolioValue).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '500,000.00'}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Cash Left</span>
              <span className="font-mono font-bold text-slate-200 text-sm">
                ${cashRemaining != null ? Number(cashRemaining).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '500,000.00'}
              </span>
            </div>
          </div>

          {/* Full Tab Navigation with Accessible 44px Touch Targets */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelectTab(tab.id)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition min-h-[44px] ${
                    isActive
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </div>
                  {tab.isNew && (
                    <span className="text-[9px] uppercase font-extrabold px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30">
                      Phase 4
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Mobile Dark Mode Switch */}
          <div className="flex items-center justify-between p-3 bg-slate-800 rounded-xl border border-slate-700/60">
            <div className="flex items-center space-x-2.5">
              {isDarkMode ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-blue-300" />
              )}
              <span className="text-xs font-semibold text-slate-200">
                {isDarkMode ? "Dark Theme Active" : "Light Theme Active"}
              </span>
            </div>
            <button
              onClick={onToggleDarkMode}
              className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold transition"
            >
              Switch to {isDarkMode ? "Light" : "Dark"}
            </button>
          </div>

          <div className="pt-2 border-t border-slate-800 space-y-2">
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                api.downloadFullBackup();
              }}
              className="w-full py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold flex items-center justify-center space-x-2 border border-slate-700"
            >
              <Download className="w-4 h-4 text-blue-400" />
              <span>Export Full Database Backup (.json)</span>
            </button>
            <div className="text-center">
              <span className="text-[11px] text-slate-500">
                Wharton Investment Simulator • 4-Member Team Portal
              </span>
            </div>
          </div>

        </div>
      )}
    </header>
  );
}
