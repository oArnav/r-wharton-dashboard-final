/**
 * Centralized API client for Wharton WInS Dashboard.
 * Phase 1, Phase 2, & Phase 3 Final methods.
 */

const API_BASE = '/api';

async function handleResponse(response) {
  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      if (errJson && errJson.error) {
        errorMsg = errJson.error;
      }
    } catch (e) {
      const errText = await response.text().catch(() => '');
      if (errText) errorMsg = errText;
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

export const api = {
  // Stock data fetcher & History
  async getStock(ticker, refresh = false) {
    const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(ticker)}?refresh=${refresh}`);
    return handleResponse(res);
  },

  async getStockHistory(ticker, period = '6mo') {
    const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(ticker)}/history?period=${period}`);
    return handleResponse(res);
  },

  // Trades & Portfolio
  async getTrades() {
    const res = await fetch(`${API_BASE}/trades`);
    return handleResponse(res);
  },

  async createTrade(tradeData) {
    const res = await fetch(`${API_BASE}/trades`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tradeData),
    });
    return handleResponse(res);
  },

  async closePosition(tradeId, exitData) {
    const res = await fetch(`${API_BASE}/trades/${tradeId}/close`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exitData),
    });
    return handleResponse(res);
  },

  async updateTradeIps(tradeId, ipsAlignment, ipsFitStatus) {
    const res = await fetch(`${API_BASE}/trades/${tradeId}/ips`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ips_alignment: ipsAlignment, ips_fit_status: ipsFitStatus }),
    });
    return handleResponse(res);
  },

  async deleteTrade(tradeId) {
    const res = await fetch(`${API_BASE}/trades/${tradeId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async getPortfolioSummary(riskFreeRate = null) {
    const query = riskFreeRate !== null ? `?risk_free_rate=${riskFreeRate}` : '';
    const res = await fetch(`${API_BASE}/portfolio/summary${query}`);
    return handleResponse(res);
  },

  // Client IPS
  async getIps() {
    const res = await fetch(`${API_BASE}/ips`);
    return handleResponse(res);
  },

  async updateIps(ipsData) {
    const res = await fetch(`${API_BASE}/ips`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ipsData),
    });
    return handleResponse(res);
  },

  // Tracked Sectors
  async getSectors() {
    const res = await fetch(`${API_BASE}/sectors`);
    return handleResponse(res);
  },

  async addSector(sectorData) {
    const res = await fetch(`${API_BASE}/sectors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sectorData),
    });
    return handleResponse(res);
  },

  async updateSector(sectorId, sectorData) {
    const res = await fetch(`${API_BASE}/sectors/${sectorId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sectorData),
    });
    return handleResponse(res);
  },

  async deleteSector(sectorId) {
    const res = await fetch(`${API_BASE}/sectors/${sectorId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Company Screener & Scorecard
  async getScreenerScorecard(tickers, weights) {
    const res = await fetch(`${API_BASE}/screener/scorecard`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers, weights }),
    });
    return handleResponse(res);
  },

  async saveScreenerNotes(ticker, notesData) {
    const res = await fetch(`${API_BASE}/screener/${encodeURIComponent(ticker)}/notes`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(notesData),
    });
    return handleResponse(res);
  },

  // Approved Stock List (Phase 3)
  async getApprovedStocks() {
    const res = await fetch(`${API_BASE}/approved-stocks`);
    return handleResponse(res);
  },

  async addApprovedStock(stockData) {
    const res = await fetch(`${API_BASE}/approved-stocks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stockData),
    });
    return handleResponse(res);
  },

  async bulkAddApprovedStocks(tickers, notes = 'Guidebook Bulk Import') {
    const res = await fetch(`${API_BASE}/approved-stocks/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tickers, notes }),
    });
    return handleResponse(res);
  },

  async deleteApprovedStock(ticker) {
    const res = await fetch(`${API_BASE}/approved-stocks/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  // Report Outline Skeleton (Phase 3)
  async getReportOutline() {
    const res = await fetch(`${API_BASE}/report-outline`);
    return handleResponse(res);
  },

  async updateReportSection(sectionId, content) {
    const res = await fetch(`${API_BASE}/report-outline/${encodeURIComponent(sectionId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    return handleResponse(res);
  },

  getExportReportUrl() {
    return `${API_BASE}/export/report-markdown`;
  },

  // Benchmark Comparison
  async getBenchmarkComparison(benchmark = '^GSPC', period = '6mo') {
    const res = await fetch(`${API_BASE}/benchmark?benchmark=${encodeURIComponent(benchmark)}&period=${period}`);
    return handleResponse(res);
  },

  // News Scanner
  async getNews(refresh = false) {
    const res = await fetch(`${API_BASE}/news?refresh=${refresh}`);
    return handleResponse(res);
  },

  async setNewsTag(articleUrl, tagData) {
    const res = await fetch(`${API_BASE}/news/tag`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ article_url: articleUrl, ...tagData }),
    });
    return handleResponse(res);
  },

  // AI Usage Logs
  async getAiLogs() {
    const res = await fetch(`${API_BASE}/ai-logs`);
    return handleResponse(res);
  },

  async createAiLog(logData) {
    const res = await fetch(`${API_BASE}/ai-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(logData),
    });
    return handleResponse(res);
  },

  getExportAiLogsUrl() {
    return `${API_BASE}/export/ai-logs-csv`;
  },

  // CSV Trade export URL
  getExportCsvUrl() {
    return `${API_BASE}/export/csv`;
  },

  // ============================================================
  // Phase 4 Methods: Statements, Watchlist, Feed, Compare
  // ============================================================

  async getFinancialStatements(ticker, period = 'annual', refresh = false) {
    const res = await fetch(`${API_BASE}/stock/${encodeURIComponent(ticker)}/statements?period=${period}&refresh=${refresh}`);
    return handleResponse(res);
  },

  async getWatchlist() {
    const res = await fetch(`${API_BASE}/watchlist`);
    return handleResponse(res);
  },

  async addWatchlistItem(watchData) {
    const res = await fetch(`${API_BASE}/watchlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(watchData),
    });
    return handleResponse(res);
  },

  async deleteWatchlistItem(ticker) {
    const res = await fetch(`${API_BASE}/watchlist/${encodeURIComponent(ticker)}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  async getActivityFeed(limit = 15) {
    const res = await fetch(`${API_BASE}/activity-feed?limit=${limit}`);
    return handleResponse(res);
  },

  async compareStocks(tickers) {
    const tickerList = Array.isArray(tickers) ? tickers.join(',') : tickers;
    const res = await fetch(`${API_BASE}/stocks/compare?tickers=${encodeURIComponent(tickerList)}`);
    return handleResponse(res);
  },

  // ============================================================
  // Phase 5 Methods: Audit Trail, Reconciliation, Deadlines, Backup
  // ============================================================

  async editTrade(tradeId, updatedData, editedBy = 'Arnav') {
    const res = await fetch(`${API_BASE}/trades/${tradeId}/edit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updatedData, edited_by: editedBy }),
    });
    return handleResponse(res);
  },

  async getTradeEdits(tradeId = null) {
    const url = tradeId ? `${API_BASE}/trades/${tradeId}/edits` : `${API_BASE}/trades/edits`;
    const res = await fetch(url);
    return handleResponse(res);
  },

  async addReconciliation(recData) {
    const res = await fetch(`${API_BASE}/reconciliation`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(recData),
    });
    return handleResponse(res);
  },

  async getReconciliationHistory(limit = 15) {
    const res = await fetch(`${API_BASE}/reconciliation?limit=${limit}`);
    return handleResponse(res);
  },

  async getDeadlines() {
    const res = await fetch(`${API_BASE}/deadlines`);
    return handleResponse(res);
  },

  async addDeadline(deadlineData) {
    const res = await fetch(`${API_BASE}/deadlines`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(deadlineData),
    });
    return handleResponse(res);
  },

  async deleteDeadline(deadlineId) {
    const res = await fetch(`${API_BASE}/deadlines/${deadlineId}`, {
      method: 'DELETE',
    });
    return handleResponse(res);
  },

  getFullBackupUrl() {
    return `${API_BASE}/backup/export`;
  },

  async downloadFullBackup() {
    const res = await fetch(`${API_BASE}/backup/export`);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wins_full_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  },
};
