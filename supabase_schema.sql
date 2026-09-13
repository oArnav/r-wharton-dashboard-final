-- ==============================================================================
-- Wharton Investment Simulator (WInS) — Supabase PostgreSQL Schema & Migrations
-- Team: Arnav, Jaivish, Harsimar, Nairit ($500,000 Portfolio)
-- Run this script in the Supabase SQL Editor (https://app.supabase.com)
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Trades & Holdings Table
CREATE TABLE IF NOT EXISTS trades (
    id BIGSERIAL PRIMARY KEY,
    ticker TEXT NOT NULL,
    company_name TEXT NOT NULL,
    sector TEXT NOT NULL,
    entry_date TEXT NOT NULL DEFAULT CURRENT_DATE,
    entry_price NUMERIC(12, 4) NOT NULL,
    quantity NUMERIC(12, 4) NOT NULL,
    position_size_pct NUMERIC(6, 2) NOT NULL,
    rationale TEXT NOT NULL,
    exit_condition TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    exit_date TEXT,
    exit_price NUMERIC(12, 4),
    outcome_note TEXT,
    realized_pnl NUMERIC(12, 2),
    realized_pnl_pct NUMERIC(8, 2),
    ips_alignment TEXT DEFAULT '',
    ips_fit_status TEXT DEFAULT 'missing',
    logged_by TEXT DEFAULT 'Arnav',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Trade Edits Audit Trail
CREATE TABLE IF NOT EXISTS trade_edits (
    id BIGSERIAL PRIMARY KEY,
    trade_id BIGINT NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
    edited_by TEXT NOT NULL DEFAULT 'Arnav',
    field_changed TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Simulator Reconciliation Checks
CREATE TABLE IF NOT EXISTS reconciliation_checks (
    id BIGSERIAL PRIMARY KEY,
    checked_by TEXT NOT NULL DEFAULT 'Arnav',
    actual_cash NUMERIC(12, 2) NOT NULL,
    actual_portfolio_value NUMERIC(12, 2) NOT NULL,
    calculated_cash NUMERIC(12, 2) NOT NULL,
    calculated_portfolio_value NUMERIC(12, 2) NOT NULL,
    cash_discrepancy NUMERIC(12, 2) NOT NULL,
    portfolio_discrepancy NUMERIC(12, 2) NOT NULL,
    notes TEXT DEFAULT '',
    checked_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Team Deadlines & Milestones
CREATE TABLE IF NOT EXISTS team_deadlines (
    id BIGSERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    deadline_date TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_hard_deadline INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI Usage Log
CREATE TABLE IF NOT EXISTS ai_logs (
    id BIGSERIAL PRIMARY KEY,
    date TEXT NOT NULL DEFAULT CURRENT_DATE,
    team_member TEXT NOT NULL,
    what_was_asked TEXT NOT NULL,
    tool_used TEXT NOT NULL,
    category TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Client IPS
CREATE TABLE IF NOT EXISTS client_ips (
    id INT PRIMARY KEY DEFAULT 1,
    objective TEXT NOT NULL,
    risk_tolerance TEXT NOT NULL,
    time_horizon TEXT NOT NULL,
    constraints TEXT NOT NULL,
    benchmark TEXT NOT NULL DEFAULT 'S&P 500 (^GSPC)',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Tracked Sectors & Macro Notes
CREATE TABLE IF NOT EXISTS tracked_sectors (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    etf_ticker TEXT NOT NULL,
    inflation_trend TEXT DEFAULT 'stable',
    rate_direction TEXT DEFAULT 'neutral',
    macro_notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Company Screener Notes
CREATE TABLE IF NOT EXISTS screener_notes (
    ticker TEXT PRIMARY KEY,
    moat_type TEXT DEFAULT 'none',
    esg_note TEXT DEFAULT '',
    business_model TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. News Article Relevance Tags
CREATE TABLE IF NOT EXISTS news_tags (
    article_url TEXT PRIMARY KEY,
    headline TEXT NOT NULL,
    source TEXT DEFAULT '',
    published_date TEXT DEFAULT '',
    matched_keywords TEXT DEFAULT '',
    relevance_tag TEXT DEFAULT 'unreviewed',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Approved Stock List
CREATE TABLE IF NOT EXISTS approved_stocks (
    ticker TEXT PRIMARY KEY,
    company_name TEXT DEFAULT '',
    sector TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Report Outline Sections
CREATE TABLE IF NOT EXISTS report_sections (
    section_id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    order_idx INT NOT NULL,
    content TEXT DEFAULT '',
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Watchlist Pipeline
CREATE TABLE IF NOT EXISTS watchlist (
    ticker TEXT PRIMARY KEY,
    notes TEXT DEFAULT '',
    target_price NUMERIC(12, 2) DEFAULT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Market Quote Cache
CREATE TABLE IF NOT EXISTS market_cache (
    ticker TEXT PRIMARY KEY,
    data_json TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- Public read & write for authenticated team members / anon key for dashboard
-- ==============================================================================
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_edits ENABLE ROW LEVEL SECURITY;
ALTER TABLE reconciliation_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_ips ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracked_sectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE screener_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE approved_stocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_cache ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Public Full Access trades" ON trades;
    CREATE POLICY "Public Full Access trades" ON trades FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access trade_edits" ON trade_edits;
    CREATE POLICY "Public Full Access trade_edits" ON trade_edits FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access reconciliation_checks" ON reconciliation_checks;
    CREATE POLICY "Public Full Access reconciliation_checks" ON reconciliation_checks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access team_deadlines" ON team_deadlines;
    CREATE POLICY "Public Full Access team_deadlines" ON team_deadlines FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access ai_logs" ON ai_logs;
    CREATE POLICY "Public Full Access ai_logs" ON ai_logs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access client_ips" ON client_ips;
    CREATE POLICY "Public Full Access client_ips" ON client_ips FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access tracked_sectors" ON tracked_sectors;
    CREATE POLICY "Public Full Access tracked_sectors" ON tracked_sectors FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access screener_notes" ON screener_notes;
    CREATE POLICY "Public Full Access screener_notes" ON screener_notes FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access news_tags" ON news_tags;
    CREATE POLICY "Public Full Access news_tags" ON news_tags FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access approved_stocks" ON approved_stocks;
    CREATE POLICY "Public Full Access approved_stocks" ON approved_stocks FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access report_sections" ON report_sections;
    CREATE POLICY "Public Full Access report_sections" ON report_sections FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access watchlist" ON watchlist;
    CREATE POLICY "Public Full Access watchlist" ON watchlist FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public Full Access market_cache" ON market_cache;
    CREATE POLICY "Public Full Access market_cache" ON market_cache FOR ALL USING (true) WITH CHECK (true);
END $$;

-- ==============================================================================
-- Official Competition Seed Data
-- ==============================================================================

-- Seed Client IPS
INSERT INTO client_ips (id, objective, risk_tolerance, time_horizon, constraints, benchmark)
VALUES (1, 'growth', 'moderate', '10 Weeks', 'No leverage, max 20% single position weight', 'S&P 500 (^GSPC)')
ON CONFLICT (id) DO NOTHING;

-- Seed Tracked Sectors
INSERT INTO tracked_sectors (name, etf_ticker, inflation_trend, rate_direction, macro_notes) VALUES
('Technology', 'XLK', 'falling', 'falling', 'High growth potential, generative AI tailwinds, resilient balance sheets'),
('Healthcare', 'XLV', 'stable', 'neutral', 'Defensive revenue, aging demographics, steady pharma demand'),
('Financials', 'XLF', 'stable', 'falling', 'Rate cut impacts net interest margins; investment banking rebound'),
('Consumer Discretionary', 'XLY', 'falling', 'neutral', 'Selective consumer spending; watch retail sentiment and real wage trends'),
('Communication Services', 'XLC', 'stable', 'neutral', 'Digital advertising recovery and streaming profitability focus'),
('Industrials', 'XLI', 'stable', 'neutral', 'Infrastructure spending and aerospace supply chain normalization'),
('Consumer Staples', 'XLP', 'falling', 'neutral', 'Defensive dividend cushion with pricing power stability'),
('Energy', 'XLE', 'rising', 'neutral', 'OPEC+ discipline, geopolitical risk premium, high free cash flow'),
('Utilities', 'XLU', 'falling', 'falling', 'Bond proxy benefiting from rate cuts; growing data center power demand'),
('Real Estate', 'XLRE', 'falling', 'falling', 'Interest rate sensitive; potential recovery in premium logistics'),
('Materials', 'XLB', 'stable', 'neutral', 'Commodity price cycles and global manufacturing demand')
ON CONFLICT (name) DO NOTHING;

-- Seed Official Competition Deadlines
INSERT INTO team_deadlines (title, deadline_date, description, is_hard_deadline) VALUES
('First Trade Execution Deadline', '2026-10-10 23:59:59', 'Wharton WInS rule: at least one trade must be executed by this date.', 1),
('Mid-Competition Strategy Review', '2026-11-01 23:59:59', 'Team internal milestone: evaluate sector performance and rebalance.', 0),
('Final Trading Review & Cash Optimization', '2026-11-28 23:59:59', 'Team internal milestone: prepare positions for closing and report metrics.', 0),
('Trading Window Final Close', '2026-12-05 23:59:59', 'Wharton WInS official deadline: all virtual trading closes.', 1)
ON CONFLICT DO NOTHING;

-- Seed Approved Stock List
INSERT INTO approved_stocks (ticker, company_name, sector, notes) VALUES
('AAPL', 'Apple Inc.', 'Technology', 'WInS Guidebook S&P 500 Eligible'),
('MSFT', 'Microsoft Corporation', 'Technology', 'WInS Guidebook S&P 500 Eligible'),
('NVDA', 'NVIDIA Corporation', 'Technology', 'WInS Guidebook S&P 500 Eligible'),
('AMZN', 'Amazon.com Inc.', 'Consumer Cyclical', 'WInS Guidebook S&P 500 Eligible'),
('GOOGL', 'Alphabet Inc. (Class A)', 'Communication Services', 'WInS Guidebook S&P 500 Eligible'),
('META', 'Meta Platforms Inc.', 'Communication Services', 'WInS Guidebook S&P 500 Eligible'),
('TSLA', 'Tesla Inc.', 'Consumer Cyclical', 'WInS Guidebook S&P 500 Eligible'),
('BRK.B', 'Berkshire Hathaway Inc.', 'Financial Services', 'WInS Guidebook S&P 500 Eligible'),
('UNH', 'UnitedHealth Group Inc.', 'Healthcare', 'WInS Guidebook S&P 500 Eligible'),
('JNJ', 'Johnson & Johnson', 'Healthcare', 'WInS Guidebook S&P 500 Eligible'),
('JPM', 'JPMorgan Chase & Co.', 'Financial Services', 'WInS Guidebook S&P 500 Eligible'),
('V', 'Visa Inc.', 'Financial Services', 'WInS Guidebook S&P 500 Eligible'),
('PG', 'Procter & Gamble Company', 'Consumer Defensive', 'WInS Guidebook S&P 500 Eligible'),
('XOM', 'Exxon Mobil Corporation', 'Energy', 'WInS Guidebook S&P 500 Eligible'),
('HD', 'The Home Depot Inc.', 'Consumer Cyclical', 'WInS Guidebook S&P 500 Eligible'),
('MA', 'Mastercard Inc.', 'Financial Services', 'WInS Guidebook S&P 500 Eligible'),
('COST', 'Costco Wholesale Corporation', 'Consumer Defensive', 'WInS Guidebook S&P 500 Eligible'),
('ABBV', 'AbbVie Inc.', 'Healthcare', 'WInS Guidebook S&P 500 Eligible'),
('MRK', 'Merck & Co. Inc.', 'Healthcare', 'WInS Guidebook S&P 500 Eligible'),
('CVX', 'Chevron Corporation', 'Energy', 'WInS Guidebook S&P 500 Eligible'),
('LLY', 'Eli Lilly and Company', 'Healthcare', 'WInS Guidebook S&P 500 Eligible'),
('AVGO', 'Broadcom Inc.', 'Technology', 'WInS Guidebook S&P 500 Eligible'),
('WMT', 'Walmart Inc.', 'Consumer Defensive', 'WInS Guidebook S&P 500 Eligible'),
('BAC', 'Bank of America Corporation', 'Financial Services', 'WInS Guidebook S&P 500 Eligible'),
('CRM', 'Salesforce Inc.', 'Technology', 'WInS Guidebook S&P 500 Eligible')
ON CONFLICT (ticker) DO NOTHING;

-- Seed Standard Report Outline Sections
INSERT INTO report_sections (section_id, title, content, order_idx) VALUES
('exec-summary', '1. Executive Summary', '', 1),
('client-ips', '2. Client Profile & IPS Alignment', '', 2),
('macro-sector', '3. Macroeconomic & Sector Analysis', '', 3),
('company-theses', '4. Company Analysis & Investment Theses', '', 4),
('trade-execution', '5. Trade Execution & Portfolio Construction', '', 5),
('benchmark-performance', '6. Performance & Benchmark Attribution', '', 6),
('lessons-learned', '7. Lessons Learned & Risk Management', '', 7),
('appendix-ai', '8. Appendix & AI Usage Disclosure', '', 8)
ON CONFLICT (section_id) DO NOTHING;
