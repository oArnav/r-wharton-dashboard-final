# Wharton Investment Simulator (WInS) — Investment Dashboard
### Institutional Portfolio Governance & Competition Management Platform (Phases 1–5 Complete)

A full-stack, institutional-grade web dashboard designed for a 4-person student team (**Arnav**, **Jaivish**, **Harsimar**, **Nairit**) competing in the **Wharton Investment Simulator (WInS)** managing a shared **$500,000 virtual portfolio**.

---

## 🌟 Core Architectural Principles

- **Zero AI Fabrication**: All financial metrics, multiples, ratios, and benchmark comparisons are strictly derived from real-time market data fetched via `yfinance` or entered manually by the team.
- **Zero AI Investment Recommendations**: No synthetic buy/sell recommendations, black-box scores, or automated trading. All scoring engines (Sector Favorability Stance, Nairit's Screener Scorecard) are transparent, mathematical, and user-configurable.
- **Zero AI Commentary on Financial Statements**: Financial statements display raw SEC filings without synthesized text or fake projections, stamped with the exact fetch timestamp.
- **Zero AI Report Drafting**: The final report skeleton provides an organizational drafting workbench for team members. All theses, risk analysis, and post-mortems are human-written.
- **Single Shared SQLite Database (`wins_data.db`)**: All 4 team members share synchronized data across all modules with automated SQLite schema migrations.
- **SQLite Concurrency (WAL Mode)**: Configured with `PRAGMA journal_mode=WAL;` and `PRAGMA busy_timeout=5000;` ensuring lock-free concurrent reads and writes across all 4 team members.
- **100% Manual Execution Pricing**: In compliance with Wharton WInS order-book mechanics, execution prices are entered manually with Yahoo Finance quotes shown solely as read-only reference data.
- **Full Revision Audit Trail & Reconciliation Check**: Every trade edit is tracked with old vs new values, timestamps, and member attribution; official WInS cash/equity reconciliations are logged with exact gap calculations.
- **Single-Click Database Backup**: Complete 12-table database dump downloadable in one click as a structured JSON file.

---

## 📁 Complete Project Architecture

```
wharton-wins-dashboard/
├── backend/
│   ├── database.py         # SQLite schema & CRUD (Trades, AI logs, IPS, Sectors, Screener, News, Approved Stocks, Report, Watchlist, Activity Feed)
│   ├── stock_fetcher.py    # yfinance fetcher (fundamentals, statements, price history, ETF proxies) with 15-min cache
│   ├── calculator.py       # Risk metrics (Sharpe, Beta, Drawdown, Volatility), Sector Stance & Scorecards
│   ├── rss_fetcher.py      # Free RSS financial news scanner matching holdings & sectors
│   ├── main.py             # Starlette ASGI REST API server & static file host (unified deployment)
│   ├── requirements.txt    # Python dependencies
│   ├── test_backend.py     # Automated backend verification test suite (Phases 1, 2, 3 & 4)
│   └── wins_data.db        # Shared SQLite database file
│
├── frontend/
│   ├── index.html          # HTML entry
│   ├── package.json        # React 18, Vite, Tailwind CSS, Lucide, Recharts
│   ├── vite.config.js      # Dev server with /api proxy to backend
│   ├── tailwind.config.js  # Custom Wharton institutional styling
│   ├── vercel.json         # Vercel deployment configuration
│   └── src/
│       ├── main.jsx        # React root mount
│       ├── App.jsx         # Dashboard orchestrator & tab routing
│       ├── index.css       # Global styles & custom scrollbars
│       ├── services/
│       │   └── api.js      # Centralized HTTP client for all API endpoints
│       └── components/
│           ├── Navbar.jsx              # Persistent Quick-Jump search ('/' shortcut), mobile drawer, portfolio pill
│           ├── HomeDashboard.jsx       # Countdown timers, live Activity Feed, & 11-module Launchpad
│           ├── TimePeriodFilter.jsx    # [PHASE 4] 1W / 1M / 3M / YTD / All client-side time-series filter
│           ├── FinancialStatements.jsx # [PHASE 4] Raw Income Statement, Balance Sheet, Cash Flow with key/all line items & CSV
│           ├── Watchlist.jsx           # [PHASE 4] Prospective ticker pipeline with target prices & 1-click Convert to Trade
│           ├── CompanyCompare.jsx      # [PHASE 4] 2–4 ticker peer fundamentals matrix with best-in-class green highlights
│           ├── PortfolioOverview.jsx   # Top metrics, Portfolio Value chart with time filters, sector donut & risk summary
│           ├── ClientIPSBanner.jsx     # Prominent Client IPS banner & edit modal
│           ├── TradeLog.jsx            # Trade table with Wharton approval badges, IPS fit & CSV export
│           ├── ApprovedStockList.jsx   # Wharton guidebook approved ticker manager with bulk paste
│           ├── CompanyScreener.jsx     # Quantitative scorecard, Nairit's weights, moat analysis & status
│           ├── SectorDashboard.jsx     # 11 S&P 500 sectors, ETF price momentum & rules-based stance
│           ├── BenchmarkRiskView.jsx   # Portfolio vs S&P 500 (^GSPC) chart with time filters, Sharpe, Beta, Drawdown
│           ├── ReportOutline.jsx       # 8 standard report sections with auto-save & markdown export
│           ├── NewsScanner.jsx         # RSS headlines with thesis relevance tagging
│           ├── StockLookup.jsx         # Real-time fundamentals, time filters, & link to financial statements
│           ├── AIUsageLog.jsx          # Member dropdown, standardized categories & CSV export
│           ├── AddTradeModal.jsx       # Trade entry modal with approval check & IPS fit
│           ├── ClosePositionModal.jsx  # Close position modal with realized P&L preview
│           └── MetricsCard.jsx         # Reusable KPI card
│
├── render.yaml             # Render unified free deployment configuration
├── start_backend.bat       # Windows one-click script to launch backend
├── start_frontend.bat      # Windows one-click script to launch frontend
└── README.md               # Complete platform documentation
```

---

## ⏱️ Competition Timeline & Governance

- **October 10, 2026**: First Trade Execution Deadline.
- **December 5, 2026**: Competition Trading Closes.
- Real-time countdown clocks are prominently displayed on the **Home Command Center** to keep the team synchronized.

---

## 🚀 Setup & Local Run Instructions

### Prerequisites
- **Python 3.10+** (with `starlette`, `uvicorn`, `yfinance`, `pandas`, `numpy`, `requests`)
- **Node.js 18+** & `npm`

---

### Step 1: Start Backend Server

Open a terminal or PowerShell in `backend/`:

```powershell
cd backend
py main.py
```
The API server starts at **`http://localhost:8000`**.  
The database `wins_data.db` initializes automatically with all pre-seeded tables, eligible tickers, and watchlist pipeline.

To run the automated verification test suite:
```powershell
py test_backend.py
```

---

### Step 2: Start Frontend Development Server

In a second terminal:

```powershell
cd frontend
cmd.exe /c npm install
cmd.exe /c npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🏆 Complete Module Breakdown

### 1. Home Command Center & Live Activity Feed (`HomeDashboard.jsx`)
- **Real-Time Countdown Clocks**: Tracks time remaining until the **October 10 First Trade Deadline** and **December 5 Competition Close**.
- **Portfolio Snapshot**: Live total equity, dollar return, percentage return, and cash reserves from the $500,000 baseline.
- **Client IPS Profile**: High-level objective, risk profile, and benchmark.
- **WInS Governance Gauge**: Client IPS alignment compliance percentage and Approved Stock count.
- **[PHASE 4] Live Activity Feed**: Reverse-chronological audit log of recent team actions across trades, watchlist entries, IPS modifications, screener notes, and news tags with relative timestamps ("2m ago", "1h ago", "Yesterday").
- **Institutional Navigation Launchpad**: 11 quick-access cards linking directly to each module.

### 2. Watchlist Pipeline (`Watchlist.jsx` & `watchlist` table) [PHASE 4]
- **Prospective Stock Pipeline**: Separate from active holdings to monitor ideas before capital commitment.
- **Automated Market Pull**: Fetches live price, 52-week high/low range, and trailing P/E.
- **Target Price & Upside Calculation**: Calculates % upside/downside vs current market price.
- **Thesis Tracking**: Dedicated text notes capturing why the stock is being monitored.
- **1-Click "Convert to Trade"**: Pre-fills the Trade Execution modal with the ticker and current price.

### 3. Raw Financial Statement Fetcher (`FinancialStatements.jsx`) [PHASE 4]
- **Three Core Statements**: Full raw Income Statement (`.income_stmt`), Balance Sheet (`.balance_sheet`), and Cash Flow Statement (`.cashflow`) via `yfinance`.
- **Annual vs. Quarterly**: Toggle between full fiscal years and trailing quarterly reports.
- **Key Items vs. Full Detail**: Toggle between key items preset (Revenue, Gross Profit, Operating Income, Net Income, Operating Cash Flow, Total Assets, Long-Term Debt, Free Cash Flow) and 40+ accounting line items.
- **Search & Line-Item Filter**: Instant text filter to isolate specific lines.
- **Compact vs. Full Numbers**: Switch between `$1.2B / $350M` and `$1,200,000,000`.
- **Strict Compliance & Integrity**: Stamped with explicit fetch date (`"Fetched: Sep 13, 2026 — Yahoo Finance / SEC filings"`), zero synthetic AI commentary, and CSV export.

### 4. Peer Comparison Matrix (`CompanyCompare.jsx`) [PHASE 4]
- **Side-by-Side Fundamentals**: Compare 2 to 4 tickers side-by-side.
- **Industry Presets**: One-click quick load for Big Tech (`AAPL, MSFT, GOOGL`), Semis (`NVDA, AMD, INTC`), Payments (`V, MA, PYPL`), and Mega-Cap Diversified.
- **10 Core Metrics**: P/E, P/S, EV/EBITDA, Gross Margin, Operating Margin, Net Margin, ROE, Debt/Equity, Beta, and 52W Range Position.
- **Best-in-Class Highlighting**: Cells dynamically highlighted in emerald green for the top metric in each category.
- **Wharton Rule Check**: Displays non-blocking warning badges if any ticker is not on the Approved Stock list.

### 5. Time-Period Filters on Performance Charts (`TimePeriodFilter.jsx`) [PHASE 4]
- **Standardized Intervals**: `1W / 1M / 3M / YTD / All` buttons across all time-series charts.
- **Zero Re-fetch Latency**: Fast client-side slicing (`sliceDataByPeriod`) of historical daily prices.
- **Integrated Across**:
  - Benchmark & Risk chart (Portfolio cumulative return vs S&P 500)
  - Portfolio Overview (Portfolio Equity Value over time)
  - Stock Fundamentals Lookup (Individual price history and 50/200 MAs)

### 6. Persistent Quick-Jump Search & Mobile Navigation (`Navbar.jsx`) [PHASE 4]
- **Global Keyboard Shortcut**: Press `/` anywhere in the app to instantly focus the search bar.
- **Dynamic Categorized Autocomplete**:
  - Direct Company Actions: Instant buttons for **Lookup**, **Statements**, or **Trade**
  - Pages / Views: One-click jump to any module
  - Tracked Sectors: Direct jump to sector rotation analysis
- **Mobile Responsive Drawer**: Accessible hamburger menu with 44px minimum touch targets and mobile equity summary.

### 7. Approved Stock List Tracker (`ApprovedStockList.jsx` & `approved_stocks` table)
- **Wharton Guidebook Universe**: Directory of tickers permitted for trading under Wharton WInS competition rules. Pre-seeded with top S&P 500 equities.
- **Bulk Paste Import**: Paste lists of tickers separated by commas, spaces, or newlines with batch notes.
- **Single-Ticker CRUD**: Add, edit, or remove approved securities.
- **Cross-Reference Integration**:
  - **Trade Log**: Displays a green **Approved** badge or an amber **⚠️ Non-Whitelisted Ticker** warning.
  - **Company Screener**: Displays approval badges and allows filtering by approval status.
  - **Add Trade Modal**: Shows a non-blocking confirmation warning if the team attempts to enter an unapproved ticker.

### 8. Report Outline Skeleton (`ReportOutline.jsx` & `report_sections` table)
- **8 Standard Competition Sections**:
  1. *Executive Summary*
  2. *Client Profile & Investment Policy Statement (IPS) Alignment*
  3. *Macroeconomic & Sector Analysis*
  4. *Company Analysis & Investment Theses*
  5. *Trade Execution & Portfolio Construction*
  6. *Performance & Benchmark Attribution*
  7. *Lessons Learned & Risk Management*
  8. *Appendix & AI Usage Disclosure*
- **Academic Integrity Guard**: Plain text drafting workbench with **zero AI text generation**.
- **Auto-Save**: Saves section drafts directly to the shared SQLite database with live word counters.
- **Markdown Export**: One-click download of the complete document as `wins_final_report_outline.md`.

### 9. AI Usage Log & Compliance (`AIUsageLog.jsx` & `ai_logs` table)
- **Team Roster Dropdown**: Restricted to team members: **Arnav**, **Jaivish**, **Harsimar**, and **Nairit**.
- **Standardized Categories**:
  - *Explain Concept*
  - *Fix Writing*
  - *Build Template*
  - *Brainstorm*
  - *Counter-Argument*
  - *Study Quiz*
- **Multi-Column Sorting**: Sort logs by date, team member, or category.
- **WInS CSV Export**: One-click export of the AI disclosure log ready for competition submission.

### 10. Client IPS Module (`ClientIPSBanner.jsx` & `client_ips` table)
- Prominently positioned at the top of the Portfolio Overview.
- Tracks: Objective (`growth`, `income`, `capital preservation`, `mixed`), Risk Tolerance (`conservative`, `moderate`, `aggressive`), Time Horizon, Constraints, and Benchmark (default: `S&P 500 (^GSPC)`).

### 11. Sector Dashboard (`SectorDashboard.jsx` & `tracked_sectors` table)
- Tracks 11 S&P 500 sectors via official SPDR ETFs (`XLK`, `XLV`, `XLE`, `XLF`, etc.).
- Live 50-day and 200-day moving averages and price performance (1M, 3M, YTD).
- **Rules-Based Stance Engine**: Evaluates price momentum against user-defined inflation trends and interest rate expectations to assign **Favorable**, **Neutral**, or **Unfavorable** ratings.

### 12. Company Screener & Scorecard (`CompanyScreener.jsx`)
- Computes valuation, profitability, balance sheet, and growth ratios.
- **Nairit's Weighting Engine**: Interactive sliders allow customizing weights for ROE, Net Margin, P/E, Debt-to-Equity, and Growth to compute a normalized 0-100 composite score.
- Qualitative fields: Moat Classification, ESG notes, and business model summary.
- Export screener results to CSV.

### 13. Benchmark & Risk Engine (`BenchmarkRiskView.jsx`)
- Interactive Recharts comparison chart of portfolio cumulative return vs S&P 500 (`^GSPC`) with `1W / 1M / 3M / YTD / All` filters.
- Institutional risk calculations:
  - **Sharpe Ratio** (using live 3-month T-bill yield `^IRX` or custom risk-free rate)
  - **Portfolio Beta** (weighted average of active holdings)
  - **Max Drawdown**
  - **Annualized Volatility**

### 14. Trade Log & Execution (`TradeLog.jsx` & `trades` table)
- Comprehensive trade ledger for open and closed positions.
- Tracks entry/exit dates, prices, quantities, position sizing % of $500k base, rationales, exit criteria, and realized P&L.
- Includes IPS alignment notes, fit status badges, Wharton approved badges, and full CSV export.

### 15. Free RSS News Scanner (`NewsScanner.jsx` & `rss_fetcher.py`)
- Pulls live financial headlines from Yahoo Finance and Google News RSS feeds without API keys.
- Automatically matches headlines against active portfolio holdings and tracked sectors.
- Manual tagging for thesis relevance.

---

## ☁️ Persistent Shared Cloud Database (Supabase)

To enable all 4 team members (**Arnav**, **Jaivish**, **Harsimar**, **Nairit**) to see and edit the exact same live portfolio, trades, and notes from any phone, laptop, or browser without syncing files:

### 1. Create Free Supabase Project
1. Go to [https://supabase.com](https://supabase.com) and create a free project named `wharton-wins`.
2. Navigate to **SQL Editor** in the left sidebar.
3. Open `supabase_schema.sql` from this repository, copy the entire SQL script, paste it into the Supabase SQL Editor, and click **Run**.
   - This creates all 13 tables (`trades`, `trade_edits`, `reconciliation_checks`, `team_deadlines`, `ai_logs`, `client_ips`, `tracked_sectors`, `screener_notes`, `news_tags`, `approved_stocks`, `report_sections`, `watchlist`, `market_cache`).
   - Seeds the official Client IPS, 11 tracked sectors, 28 approved stocks, competition deadlines, and report sections.
   - Configures public Row Level Security (RLS) policies.

### 2. Configure Environment Variables
In your Supabase project dashboard under **Project Settings > API**:
- Copy **Project URL** -> `SUPABASE_URL`
- Copy **anon public API key** -> `SUPABASE_KEY` (or service_role key -> `SUPABASE_SERVICE_KEY`)

Create a `.env` file in the project root (see `.env.example`):
```bash
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-supabase-anon-key
```

> **Dual-Engine Architecture**: If `SUPABASE_URL` and `SUPABASE_KEY` are provided, the dashboard automatically routes all reads and writes to Supabase cloud. If omitted, it seamlessly falls back to the local SQLite database (`backend/wins_data.db`).

---

## 🌐 Production Deployment

### Option A: Vercel Monorepo Deployment (Recommended)
The repository includes a ready-to-deploy `vercel.json` and serverless Python ASGI gateway `api/index.py`.

1. Push your repository to GitHub:
   ```bash
   git remote add origin https://github.com/<YOUR_USERNAME>/wharton-wins-dashboard.git
   git push -u origin main
   ```
2. Log into [Vercel](https://vercel.com) and click **Add New Project**.
3. Import your `wharton-wins-dashboard` GitHub repository.
4. In the **Environment Variables** section, add:
   - `SUPABASE_URL`
   - `SUPABASE_KEY`
5. Click **Deploy**. Vercel will:
   - Build the React production bundle into `frontend/dist`.
   - Deploy `api/index.py` as a serverless ASGI function routing all `/api/*` requests.
   - Serve your dashboard on a fast, global CDN URL (`https://your-app.vercel.app`).

### Option B: Render Unified Full-Stack
1. Import your GitHub repository to [Render](https://render.com).
2. Select **Web Service** or use the included `render.yaml`.
3. Add `SUPABASE_URL` and `SUPABASE_KEY` in Render environment variables.
4. Render builds the React app and serves both static assets and API from Starlette on a free URL.

---

## 📱 Non-Technical Team Quickstart Guide

For team members (**Jaivish**, **Harsimar**, **Nairit**):
1. **Open the live URL**: Navigate to the team's deployed Vercel link on any browser or mobile phone.
2. **Review Client Mandate**: View the Client IPS at the top of the Portfolio Overview to confirm required risk and constraints before taking action.
3. **Log a Trade**:
   - Navigate to **Trade Log** tab -> Click **+ Enter New Trade**.
   - Select your name from the **Executed By** dropdown.
   - Enter ticker, quantity, and actual manual execution price from the Wharton simulator.
   - Document your investment rationale and exit conditions.
   - Save. All team members will immediately see the updated portfolio value, cash balance, and exposure.
4. **Log AI Usage**:
   - Navigate to **AI Usage Log** tab -> Click **+ Log AI Usage**.
   - Select your name, tool used, category, and what prompt was tested.
5. **WInS Simulator Reconciliation**:
   - Compare the dashboard's calculated cash and portfolio values with the official Wharton WInS simulator portal.
   - Click **Run Audit Reconciliation** to document zero discrepancies.

---

## 👥 Team Roster
- **Arnav** (Lead / Architecture)
- **Jaivish** (Portfolio Strategy & Trading)
- **Harsimar** (Macro Analysis & Sector Research)
- **Nairit** (Security Selection & Quantitative Screening)

