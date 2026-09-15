"""
Database module for Wharton Investment Simulator (WInS) Dashboard.
Phase 3 Final: Trades, AI Logs, Client IPS, Tracked Sectors, Screener Notes,
News Tags, Approved Stock List, and Report Outline Skeleton.
"""

import sqlite3
import os
import json
import datetime
import tempfile
import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("wins_database")

try:
    import supabase_client
except ImportError:
    try:
        from . import supabase_client
    except Exception:
        supabase_client = None

if os.environ.get("VERCEL") or os.environ.get("AWS_LAMBDA_FUNCTION_NAME"):
    DB_PATH = os.environ.get("WINS_DB_PATH", os.path.join(tempfile.gettempdir(), "wins_data.db"))
else:
    DB_PATH = os.environ.get("WINS_DB_PATH", os.path.join(os.path.dirname(os.path.abspath(__file__)), "wins_data.db"))


def use_supabase() -> bool:
    return bool(supabase_client and supabase_client.is_configured())


def get_connection() -> sqlite3.Connection:
    db_dir = os.path.dirname(DB_PATH)
    if db_dir and not os.path.exists(db_dir):
        try:
            os.makedirs(db_dir, exist_ok=True)
        except Exception:
            pass
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    try:
        conn.execute("PRAGMA journal_mode=WAL;")
    except Exception:
        pass
    try:
        conn.execute("PRAGMA busy_timeout=5000;")
    except Exception:
        pass
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database tables and runs schema migrations if needed."""
    try:
        _run_init_db()
    except Exception as e:
        logger.warning(f"SQLite initialization note (safe to ignore if using Supabase or read-only container): {e}")


def _run_init_db():
    conn = get_connection()
    cursor = conn.cursor()

    # 1. Table for Holdings and Trades
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trades (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            ticker TEXT NOT NULL,
            company_name TEXT NOT NULL,
            sector TEXT NOT NULL,
            entry_date TEXT NOT NULL,
            entry_price REAL NOT NULL,
            quantity REAL NOT NULL,
            position_size_pct REAL NOT NULL,
            rationale TEXT NOT NULL,
            exit_condition TEXT NOT NULL,
            status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
            exit_date TEXT,
            exit_price REAL,
            outcome_note TEXT,
            realized_pnl REAL,
            realized_pnl_pct REAL,
            ips_alignment TEXT DEFAULT '',
            ips_fit_status TEXT DEFAULT 'missing',
            logged_by TEXT DEFAULT 'Arnav',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("PRAGMA table_info(trades)")
    columns = [row["name"] for row in cursor.fetchall()]
    if "ips_alignment" not in columns:
        cursor.execute("ALTER TABLE trades ADD COLUMN ips_alignment TEXT DEFAULT ''")
    if "ips_fit_status" not in columns:
        cursor.execute("ALTER TABLE trades ADD COLUMN ips_fit_status TEXT DEFAULT 'missing'")
    if "logged_by" not in columns:
        cursor.execute("ALTER TABLE trades ADD COLUMN logged_by TEXT DEFAULT 'Arnav'")

    # 2. Table for AI Usage Log
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS ai_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT NOT NULL,
            team_member TEXT NOT NULL,
            what_was_asked TEXT NOT NULL,
            tool_used TEXT NOT NULL,
            category TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 3. Table for Client IPS
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS client_ips (
            id INTEGER PRIMARY KEY,
            objective TEXT NOT NULL,
            risk_tolerance TEXT NOT NULL,
            time_horizon TEXT NOT NULL,
            constraints TEXT NOT NULL,
            benchmark TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SELECT COUNT(*) as cnt FROM client_ips")
    if cursor.fetchone()["cnt"] == 0:
        cursor.execute("""
            INSERT INTO client_ips (id, objective, risk_tolerance, time_horizon, constraints, benchmark)
            VALUES (1, 'growth', 'moderate', '10 Weeks (Competition Duration)', 
                    'No leverage, max 20% single-position weight, preference for quality balance sheets with sustainable moat', 
                    'S&P 500 (^GSPC)')
        """)

    # 4. Table for Tracked Sectors & Macro Notes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tracked_sectors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            etf_ticker TEXT NOT NULL,
            inflation_trend TEXT DEFAULT 'stable',
            rate_direction TEXT DEFAULT 'neutral',
            macro_notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SELECT COUNT(*) as cnt FROM tracked_sectors")
    if cursor.fetchone()["cnt"] == 0:
        initial_sectors = [
            ("Technology", "XLK", "falling", "falling", "AI tailwinds, strong enterprise balance sheets, sensitive to rates"),
            ("Healthcare", "XLV", "stable", "neutral", "Defensive earnings, demographic tailwinds, GLP-1 drug innovation"),
            ("Financial Services", "XLF", "stable", "neutral", "Net interest income stable, credit quality resilient"),
            ("Energy", "XLE", "falling", "neutral", "OPEC discipline, capital return focus (dividends/buybacks)"),
            ("Consumer Discretionary", "XLY", "stable", "falling", "Resilient consumer spending, bifurcation in retail"),
            ("Industrials", "XLI", "stable", "neutral", "Reshoring infrastructure spending, aerospace recovery"),
            ("Communication Services", "XLC", "falling", "neutral", "Digital advertising rebound, streaming profitability"),
            ("Consumer Defensive", "XLP", "stable", "neutral", "Inflation protection, inelastic demand, steady dividend yield"),
            ("Utilities", "XLU", "stable", "falling", "Data center power demand catalyst, high dividend yields"),
            ("Real Estate", "XLRE", "falling", "falling", "Rate-sensitive, data center REITs strong"),
            ("Basic Materials", "XLB", "rising", "neutral", "Input cost inflation, critical minerals demand")
        ]
        cursor.executemany("""
            INSERT INTO tracked_sectors (name, etf_ticker, inflation_trend, rate_direction, macro_notes)
            VALUES (?, ?, ?, ?, ?)
        """, initial_sectors)

    # 5. Table for Company Screener Qualitative Notes
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS screener_notes (
            ticker TEXT PRIMARY KEY,
            moat_type TEXT DEFAULT 'none',
            esg_note TEXT DEFAULT '',
            business_model TEXT DEFAULT '',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 6. Table for News Articles & Manual Relevance Tags
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS news_tags (
            article_url TEXT PRIMARY KEY,
            headline TEXT NOT NULL,
            source TEXT DEFAULT '',
            published_date TEXT DEFAULT '',
            matched_keywords TEXT DEFAULT '',
            relevance_tag TEXT DEFAULT 'unreviewed',
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 7. Table for Approved Stock List (Phase 3)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS approved_stocks (
            ticker TEXT PRIMARY KEY,
            company_name TEXT DEFAULT '',
            sector TEXT DEFAULT '',
            notes TEXT DEFAULT '',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # Seed initial S&P approved stocks from Wharton WInS Guidebook if empty
    cursor.execute("SELECT COUNT(*) as cnt FROM approved_stocks")
    if cursor.fetchone()["cnt"] == 0:
        initial_approved = [
            ("AAPL", "Apple Inc.", "Technology", "WInS Guidebook S&P 500 Eligible"),
            ("MSFT", "Microsoft Corporation", "Technology", "WInS Guidebook S&P 500 Eligible"),
            ("NVDA", "NVIDIA Corporation", "Technology", "WInS Guidebook S&P 500 Eligible"),
            ("AMZN", "Amazon.com Inc.", "Consumer Cyclical", "WInS Guidebook S&P 500 Eligible"),
            ("GOOGL", "Alphabet Inc. (Class A)", "Communication Services", "WInS Guidebook S&P 500 Eligible"),
            ("META", "Meta Platforms Inc.", "Communication Services", "WInS Guidebook S&P 500 Eligible"),
            ("TSLA", "Tesla Inc.", "Consumer Cyclical", "WInS Guidebook S&P 500 Eligible"),
            ("BRK.B", "Berkshire Hathaway Inc.", "Financial Services", "WInS Guidebook S&P 500 Eligible"),
            ("UNH", "UnitedHealth Group Inc.", "Healthcare", "WInS Guidebook S&P 500 Eligible"),
            ("JNJ", "Johnson & Johnson", "Healthcare", "WInS Guidebook S&P 500 Eligible"),
            ("JPM", "JPMorgan Chase & Co.", "Financial Services", "WInS Guidebook S&P 500 Eligible"),
            ("V", "Visa Inc.", "Financial Services", "WInS Guidebook S&P 500 Eligible"),
            ("PG", "Procter & Gamble Company", "Consumer Defensive", "WInS Guidebook S&P 500 Eligible"),
            ("XOM", "Exxon Mobil Corporation", "Energy", "WInS Guidebook S&P 500 Eligible"),
            ("HD", "The Home Depot Inc.", "Consumer Cyclical", "WInS Guidebook S&P 500 Eligible"),
            ("MA", "Mastercard Inc.", "Financial Services", "WInS Guidebook S&P 500 Eligible"),
            ("COST", "Costco Wholesale Corporation", "Consumer Defensive", "WInS Guidebook S&P 500 Eligible"),
            ("ABBV", "AbbVie Inc.", "Healthcare", "WInS Guidebook S&P 500 Eligible"),
            ("MRK", "Merck & Co. Inc.", "Healthcare", "WInS Guidebook S&P 500 Eligible"),
            ("CVX", "Chevron Corporation", "Energy", "WInS Guidebook S&P 500 Eligible"),
            ("LLY", "Eli Lilly and Company", "Healthcare", "WInS Guidebook S&P 500 Eligible"),
            ("AVGO", "Broadcom Inc.", "Technology", "WInS Guidebook S&P 500 Eligible"),
            ("WMT", "Walmart Inc.", "Consumer Defensive", "WInS Guidebook S&P 500 Eligible"),
            ("BAC", "Bank of America Corporation", "Financial Services", "WInS Guidebook S&P 500 Eligible"),
            ("CRM", "Salesforce Inc.", "Technology", "WInS Guidebook S&P 500 Eligible")
        ]
        cursor.executemany("""
            INSERT OR IGNORE INTO approved_stocks (ticker, company_name, sector, notes)
            VALUES (?, ?, ?, ?)
        """, initial_approved)

    # 8. Table for Report Outline Skeleton (Phase 3)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS report_sections (
            section_id TEXT PRIMARY KEY,
            title TEXT NOT NULL,
            content TEXT DEFAULT '',
            order_idx INTEGER NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SELECT COUNT(*) as cnt FROM report_sections")
    if cursor.fetchone()["cnt"] == 0:
        initial_sections = [
            ("exec-summary", "1. Executive Summary", "", 1),
            ("client-ips", "2. Client Profile & IPS Alignment", "", 2),
            ("macro-sector", "3. Macroeconomic & Sector Analysis", "", 3),
            ("company-theses", "4. Company Analysis & Investment Theses", "", 4),
            ("trade-execution", "5. Trade Execution & Portfolio Construction", "", 5),
            ("benchmark-performance", "6. Performance & Benchmark Attribution", "", 6),
            ("lessons-learned", "7. Lessons Learned & Risk Management", "", 7),
            ("appendix-ai", "8. Appendix & AI Usage Disclosure", "", 8)
        ]
        cursor.executemany("""
            INSERT INTO report_sections (section_id, title, content, order_idx)
            VALUES (?, ?, ?, ?)
        """, initial_sections)

    # 9. Table for Watchlist (Phase 4)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            ticker TEXT PRIMARY KEY,
            notes TEXT DEFAULT '',
            target_price REAL DEFAULT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 10. Table for Trade Edits Audit History (Phase 5)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS trade_edits (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trade_id INTEGER NOT NULL,
            edited_by TEXT NOT NULL,
            field_changed TEXT NOT NULL,
            old_value TEXT,
            new_value TEXT,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (trade_id) REFERENCES trades(id) ON DELETE CASCADE
        )
    """)

    # 11. Table for Reconciliation Checks (Phase 5)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS reconciliation_checks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            checked_by TEXT NOT NULL,
            actual_cash REAL NOT NULL,
            actual_portfolio_value REAL NOT NULL,
            calculated_cash REAL NOT NULL,
            calculated_portfolio_value REAL NOT NULL,
            cash_discrepancy REAL NOT NULL,
            portfolio_discrepancy REAL NOT NULL,
            notes TEXT DEFAULT '',
            checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    # 12. Table for Team Deadlines & Milestones (Phase 5)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS team_deadlines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            deadline_date TEXT NOT NULL,
            description TEXT DEFAULT '',
            is_hard_deadline BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    cursor.execute("SELECT COUNT(*) as cnt FROM team_deadlines")
    if cursor.fetchone()["cnt"] == 0:
        initial_deadlines = [
            ("First Trade Execution Deadline", "2026-10-10 23:59:59", "Wharton WInS official deadline to execute the team's first holding", 1),
            ("Mid-Term Strategy & Sector Review", "2026-11-01 23:59:59", "Internal team milestone: rebalance sectors and verify client IPS alignment", 0),
            ("Final Investment Report Draft", "2026-11-28 23:59:59", "Internal team milestone: complete 8 standard report sections and compile exhibits", 0),
            ("Trading Window Final Close", "2026-12-05 23:59:59", "Wharton WInS official deadline: all virtual trading closes", 1)
        ]
        cursor.executemany("""
            INSERT INTO team_deadlines (title, deadline_date, description, is_hard_deadline)
            VALUES (?, ?, ?, ?)
        """, initial_deadlines)

    # 13. Table for Persistent Market Quote Fallback Cache (Phase 5)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS market_cache (
            ticker TEXT PRIMARY KEY,
            data_json TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)

    conn.commit()
    conn.close()


# ============================================================
# Trades Data Access
# ============================================================

def get_all_trades() -> List[Dict[str, Any]]:
    if use_supabase():
        try:
            return supabase_client.get_all_trades()
        except Exception as e:
            logger.error(f"Error querying Supabase for trades: {e}. Falling back to local storage.")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM trades ORDER BY id DESC")
        rows = cursor.fetchall()
        conn.close()
        return [dict(row) for row in rows]
    except Exception as e:
        logger.error(f"Error querying SQLite for trades: {e}")
        return []


def get_trade_by_id(trade_id: int) -> Optional[Dict[str, Any]]:
    if use_supabase():
        try:
            return supabase_client.get_trade_by_id(trade_id)
        except Exception as e:
            logger.error(f"Error querying Supabase for trade {trade_id}: {e}")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM trades WHERE id = ?", (trade_id,))
        row = cursor.fetchone()
        conn.close()
        return dict(row) if row else None
    except Exception as e:
        logger.error(f"Error querying SQLite for trade {trade_id}: {e}")
        return None


def add_trade(trade_data: Dict[str, Any]) -> int:
    ticker = trade_data["ticker"].strip().upper()
    company_name = trade_data.get("company_name", ticker)
    sector = (trade_data.get("sector") or "Other").strip()
    entry_date = trade_data["entry_date"]
    entry_price = float(trade_data["entry_price"])
    quantity = float(trade_data["quantity"])
    logged_by = trade_data.get("logged_by") or "Arnav"
    
    total_cost = entry_price * quantity
    position_size_pct = trade_data.get("position_size_pct")
    if position_size_pct is None:
        position_size_pct = round((total_cost / 500000.0) * 100.0, 2)
    else:
        position_size_pct = float(position_size_pct)

    ips_alignment = trade_data.get("ips_alignment", "").strip()
    ips_fit_status = trade_data.get("ips_fit_status", "missing" if not ips_alignment else "fit")

    if use_supabase():
        return supabase_client.add_trade({
            "ticker": ticker,
            "company_name": company_name,
            "sector": sector,
            "entry_date": entry_date,
            "entry_price": entry_price,
            "quantity": quantity,
            "position_size_pct": position_size_pct,
            "rationale": trade_data.get("rationale", ""),
            "exit_condition": trade_data.get("exit_condition", ""),
            "status": "open",
            "ips_alignment": ips_alignment,
            "ips_fit_status": ips_fit_status,
            "logged_by": logged_by
        })

    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
        INSERT INTO trades (
            ticker, company_name, sector, entry_date, entry_price, quantity,
            position_size_pct, rationale, exit_condition, status,
            exit_date, exit_price, outcome_note, realized_pnl, realized_pnl_pct,
            ips_alignment, ips_fit_status, logged_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', NULL, NULL, NULL, NULL, NULL, ?, ?, ?)
    """, (
        ticker,
        company_name,
        sector,
        entry_date,
        entry_price,
        quantity,
        position_size_pct,
        trade_data.get("rationale", ""),
        trade_data.get("exit_condition", ""),
        ips_alignment,
        ips_fit_status,
        logged_by
    ))
    
    trade_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return trade_id


def update_trade_with_audit(trade_id: int, updated_fields: Dict[str, Any], edited_by: str) -> Optional[Dict[str, Any]]:
    """
    Updates a trade record and logs every field modification in trade_edits audit table.
    Preserves full transparency for team pair-programming and competition review.
    """
    if use_supabase():
        current = supabase_client.get_trade_by_id(trade_id)
        if not current:
            return None

        tracked_fields = [
            "entry_date", "entry_price", "quantity", "rationale",
            "exit_condition", "ips_alignment", "ips_fit_status",
            "exit_date", "exit_price", "outcome_note"
        ]

        for field in tracked_fields:
            if field in updated_fields:
                new_val = updated_fields[field]
                old_val = current.get(field)
                old_str = "" if old_val is None else str(old_val).strip()
                new_str = "" if new_val is None else str(new_val).strip()
                if old_str != new_str:
                    supabase_client.add_trade_edit(trade_id, edited_by, field, old_str, new_str)

        new_entry_price = float(updated_fields.get("entry_price", current["entry_price"]))
        new_quantity = float(updated_fields.get("quantity", current["quantity"]))
        new_pos_pct = round(((new_entry_price * new_quantity) / 500000.0) * 100.0, 2)

        new_exit_price = updated_fields.get("exit_price", current.get("exit_price"))
        realized_pnl = current.get("realized_pnl")
        realized_pnl_pct = current.get("realized_pnl_pct")
        if current.get("status") == "closed" and new_exit_price is not None:
            p_exit = float(new_exit_price)
            realized_pnl = round((p_exit - new_entry_price) * new_quantity, 2)
            realized_pnl_pct = round(((p_exit - new_entry_price) / new_entry_price) * 100.0, 2) if new_entry_price > 0 else 0.0

        patch = {
            "entry_date": updated_fields.get("entry_date", current["entry_date"]),
            "entry_price": new_entry_price,
            "quantity": new_quantity,
            "position_size_pct": new_pos_pct,
            "rationale": updated_fields.get("rationale", current.get("rationale", "")),
            "exit_condition": updated_fields.get("exit_condition", current.get("exit_condition", "")),
            "ips_alignment": updated_fields.get("ips_alignment", current.get("ips_alignment", "")),
            "ips_fit_status": updated_fields.get("ips_fit_status", current.get("ips_fit_status", "missing")),
            "exit_date": updated_fields.get("exit_date", current.get("exit_date")),
            "exit_price": new_exit_price,
            "outcome_note": updated_fields.get("outcome_note", current.get("outcome_note")),
            "realized_pnl": realized_pnl,
            "realized_pnl_pct": realized_pnl_pct
        }
        return supabase_client.update_trade(trade_id, patch)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trades WHERE id = ?", (trade_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    current = dict(row)
    tracked_fields = [
        "entry_date", "entry_price", "quantity", "rationale",
        "exit_condition", "ips_alignment", "ips_fit_status",
        "exit_date", "exit_price", "outcome_note"
    ]

    for field in tracked_fields:
        if field in updated_fields:
            new_val = updated_fields[field]
            old_val = current.get(field)
            old_str = "" if old_val is None else str(old_val).strip()
            new_str = "" if new_val is None else str(new_val).strip()
            if old_str != new_str:
                cursor.execute("""
                    INSERT INTO trade_edits (trade_id, edited_by, field_changed, old_value, new_value)
                    VALUES (?, ?, ?, ?, ?)
                """, (trade_id, edited_by, field, old_str, new_str))

    new_entry_price = float(updated_fields.get("entry_price", current["entry_price"]))
    new_quantity = float(updated_fields.get("quantity", current["quantity"]))
    new_pos_pct = round(((new_entry_price * new_quantity) / 500000.0) * 100.0, 2)

    new_exit_price = updated_fields.get("exit_price", current.get("exit_price"))
    realized_pnl = current.get("realized_pnl")
    realized_pnl_pct = current.get("realized_pnl_pct")
    if current.get("status") == "closed" and new_exit_price is not None:
        p_exit = float(new_exit_price)
        realized_pnl = round((p_exit - new_entry_price) * new_quantity, 2)
        realized_pnl_pct = round(((p_exit - new_entry_price) / new_entry_price) * 100.0, 2) if new_entry_price > 0 else 0.0

    cursor.execute("""
        UPDATE trades
        SET entry_date = ?,
            entry_price = ?,
            quantity = ?,
            position_size_pct = ?,
            rationale = ?,
            exit_condition = ?,
            ips_alignment = ?,
            ips_fit_status = ?,
            exit_date = ?,
            exit_price = ?,
            outcome_note = ?,
            realized_pnl = ?,
            realized_pnl_pct = ?
        WHERE id = ?
    """, (
        updated_fields.get("entry_date", current["entry_date"]),
        new_entry_price,
        new_quantity,
        new_pos_pct,
        updated_fields.get("rationale", current.get("rationale", "")),
        updated_fields.get("exit_condition", current.get("exit_condition", "")),
        updated_fields.get("ips_alignment", current.get("ips_alignment", "")),
        updated_fields.get("ips_fit_status", current.get("ips_fit_status", "missing")),
        updated_fields.get("exit_date", current.get("exit_date")),
        new_exit_price,
        updated_fields.get("outcome_note", current.get("outcome_note")),
        realized_pnl,
        realized_pnl_pct,
        trade_id
    ))
    conn.commit()

    cursor.execute("SELECT * FROM trades WHERE id = ?", (trade_id,))
    updated_row = cursor.fetchone()
    conn.close()
    return dict(updated_row) if updated_row else None


def get_trade_edits(trade_id: Optional[int] = None) -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_trade_edits(trade_id)
    conn = get_connection()
    cursor = conn.cursor()
    if trade_id is not None:
        cursor.execute("SELECT * FROM trade_edits WHERE trade_id = ? ORDER BY id DESC", (trade_id,))
    else:
        cursor.execute("SELECT * FROM trade_edits ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def close_trade(trade_id: int, exit_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    if use_supabase():
        trade = supabase_client.get_trade_by_id(trade_id)
        if not trade:
            return None
        entry_price = float(trade["entry_price"])
        quantity = float(trade["quantity"])
        exit_price = float(exit_data["exit_price"])
        exit_date = exit_data["exit_date"]
        outcome_note = exit_data.get("outcome_note", "")

        realized_pnl = round((exit_price - entry_price) * quantity, 2)
        realized_pnl_pct = round(((exit_price - entry_price) / entry_price) * 100.0, 2) if entry_price > 0 else 0.0

        patch = {
            "status": "closed",
            "exit_date": exit_date,
            "exit_price": exit_price,
            "outcome_note": outcome_note,
            "realized_pnl": realized_pnl,
            "realized_pnl_pct": realized_pnl_pct
        }
        return supabase_client.update_trade(trade_id, patch)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM trades WHERE id = ?", (trade_id,))
    trade = cursor.fetchone()
    if not trade:
        conn.close()
        return None
    
    trade_dict = dict(trade)
    entry_price = float(trade_dict["entry_price"])
    quantity = float(trade_dict["quantity"])
    exit_price = float(exit_data["exit_price"])
    exit_date = exit_data["exit_date"]
    outcome_note = exit_data.get("outcome_note", "")

    realized_pnl = round((exit_price - entry_price) * quantity, 2)
    realized_pnl_pct = round(((exit_price - entry_price) / entry_price) * 100.0, 2) if entry_price > 0 else 0.0

    cursor.execute("""
        UPDATE trades
        SET status = 'closed',
            exit_date = ?,
            exit_price = ?,
            outcome_note = ?,
            realized_pnl = ?,
            realized_pnl_pct = ?
        WHERE id = ?
    """, (
        exit_date,
        exit_price,
        outcome_note,
        realized_pnl,
        realized_pnl_pct,
        trade_id
    ))
    
    conn.commit()
    conn.close()
    return get_trade_by_id(trade_id)


def update_trade_ips(trade_id: int, ips_alignment: str, ips_fit_status: str) -> Optional[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.update_trade(trade_id, {
            "ips_alignment": ips_alignment,
            "ips_fit_status": ips_fit_status
        })

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE trades
        SET ips_alignment = ?,
            ips_fit_status = ?
        WHERE id = ?
    """, (ips_alignment, ips_fit_status, trade_id))
    conn.commit()
    conn.close()
    return get_trade_by_id(trade_id)


def delete_trade(trade_id: int) -> bool:
    if use_supabase():
        return supabase_client.delete_trade(trade_id)

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM trades WHERE id = ?", (trade_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ============================================================
# Client IPS Data Access
# ============================================================

def get_client_ips() -> Dict[str, Any]:
    if use_supabase():
        try:
            return supabase_client.get_client_ips()
        except Exception as e:
            logger.warning(f"Supabase client_ips query note: {e}")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM client_ips WHERE id = 1")
        row = cursor.fetchone()
        conn.close()
        if row:
            return dict(row)
    except Exception:
        pass
    return {
        "id": 1,
        "objective": "growth",
        "risk_tolerance": "moderate",
        "time_horizon": "10 Weeks",
        "constraints": "No leverage, max 20% single position weight",
        "benchmark": "S&P 500 (^GSPC)"
    }


def update_client_ips(data: Dict[str, Any]) -> Dict[str, Any]:
    if use_supabase():
        return supabase_client.update_client_ips(data)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE client_ips
        SET objective = ?,
            risk_tolerance = ?,
            time_horizon = ?,
            constraints = ?,
            benchmark = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = 1
    """, (
        data.get("objective", "growth"),
        data.get("risk_tolerance", "moderate"),
        data.get("time_horizon", "10 Weeks"),
        data.get("constraints", ""),
        data.get("benchmark", "S&P 500 (^GSPC)")
    ))
    conn.commit()
    conn.close()
    return get_client_ips()


# ============================================================
# Tracked Sectors Data Access
# ============================================================

def get_tracked_sectors() -> List[Dict[str, Any]]:
    if use_supabase():
        try:
            return supabase_client.get_tracked_sectors()
        except Exception as e:
            logger.warning(f"Supabase tracked_sectors query note: {e}")
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM tracked_sectors ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()
        if rows:
            return [dict(row) for row in rows]
    except Exception:
        pass
    return [
        {"id": 1, "name": "Technology", "etf_ticker": "XLK", "inflation_trend": "falling", "rate_direction": "falling", "macro_notes": "AI tailwinds"},
        {"id": 2, "name": "Healthcare", "etf_ticker": "XLV", "inflation_trend": "stable", "rate_direction": "neutral", "macro_notes": "Defensive earnings"},
        {"id": 3, "name": "Financial Services", "etf_ticker": "XLF", "inflation_trend": "stable", "rate_direction": "neutral", "macro_notes": "Net interest income stable"},
        {"id": 4, "name": "Energy", "etf_ticker": "XLE", "inflation_trend": "falling", "rate_direction": "neutral", "macro_notes": "Capital return focus"},
        {"id": 5, "name": "Consumer Discretionary", "etf_ticker": "XLY", "inflation_trend": "stable", "rate_direction": "falling", "macro_notes": "Resilient spending"},
    ]


def add_tracked_sector(data: Dict[str, Any]) -> int:
    if use_supabase():
        return supabase_client.add_tracked_sector(data)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO tracked_sectors (name, etf_ticker, inflation_trend, rate_direction, macro_notes)
        VALUES (?, ?, ?, ?, ?)
    """, (
        data["name"].strip(),
        data["etf_ticker"].strip().upper(),
        data.get("inflation_trend", "stable"),
        data.get("rate_direction", "neutral"),
        data.get("macro_notes", "")
    ))
    sec_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return sec_id


def update_tracked_sector(sector_id: int, data: Dict[str, Any]) -> bool:
    if use_supabase():
        return supabase_client.update_tracked_sector(sector_id, data)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE tracked_sectors
        SET name = ?,
            etf_ticker = ?,
            inflation_trend = ?,
            rate_direction = ?,
            macro_notes = ?
        WHERE id = ?
    """, (
        data["name"].strip(),
        data["etf_ticker"].strip().upper(),
        data.get("inflation_trend", "stable"),
        data.get("rate_direction", "neutral"),
        data.get("macro_notes", ""),
        sector_id
    ))
    updated = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def delete_tracked_sector(sector_id: int) -> bool:
    if use_supabase():
        return supabase_client.delete_tracked_sector(sector_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM tracked_sectors WHERE id = ?", (sector_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ============================================================
# Screener Qualitative Notes Data Access
# ============================================================

def get_all_screener_notes() -> Dict[str, Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_all_screener_notes()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM screener_notes")
    rows = cursor.fetchall()
    conn.close()
    return {row["ticker"]: dict(row) for row in rows}


def save_screener_note(ticker: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if use_supabase():
        return supabase_client.save_screener_note(ticker, data)
    sym = ticker.strip().upper()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO screener_notes (ticker, moat_type, esg_note, business_model, updated_at)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(ticker) DO UPDATE SET
            moat_type = excluded.moat_type,
            esg_note = excluded.esg_note,
            business_model = excluded.business_model,
            updated_at = CURRENT_TIMESTAMP
    """, (
        sym,
        data.get("moat_type", "none"),
        data.get("esg_note", ""),
        data.get("business_model", "")
    ))
    conn.commit()
    cursor.execute("SELECT * FROM screener_notes WHERE ticker = ?", (sym,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


# ============================================================
# News Relevance Tags Data Access
# ============================================================

def get_news_tags() -> Dict[str, Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_news_tags()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM news_tags")
    rows = cursor.fetchall()
    conn.close()
    return {row["article_url"]: dict(row) for row in rows}


def set_news_tag(article_url: str, data: Dict[str, Any]) -> Dict[str, Any]:
    if use_supabase():
        return supabase_client.set_news_tag(article_url, data)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO news_tags (article_url, headline, source, published_date, matched_keywords, relevance_tag, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(article_url) DO UPDATE SET
            relevance_tag = excluded.relevance_tag,
            updated_at = CURRENT_TIMESTAMP
    """, (
        article_url,
        data.get("headline", ""),
        data.get("source", ""),
        data.get("published_date", ""),
        data.get("matched_keywords", ""),
        data.get("relevance_tag", "relevant")
    ))
    conn.commit()
    cursor.execute("SELECT * FROM news_tags WHERE article_url = ?", (article_url,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


# ============================================================
# Approved Stock List Data Access (Phase 3)
# ============================================================

def get_all_approved_stocks() -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_all_approved_stocks()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM approved_stocks ORDER BY ticker ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def get_approved_tickers_set() -> set:
    if use_supabase():
        stocks = supabase_client.get_all_approved_stocks()
        return set(s["ticker"] for s in stocks)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT ticker FROM approved_stocks")
    rows = cursor.fetchall()
    conn.close()
    return set(row["ticker"] for row in rows)


def add_approved_stock(data: Dict[str, Any]) -> Dict[str, Any]:
    if use_supabase():
        return supabase_client.add_approved_stock(data)
    ticker = data["ticker"].strip().upper()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO approved_stocks (ticker, company_name, sector, notes)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(ticker) DO UPDATE SET
            company_name = excluded.company_name,
            sector = excluded.sector,
            notes = excluded.notes
    """, (
        ticker,
        data.get("company_name", ticker),
        data.get("sector", "Other"),
        data.get("notes", "Wharton WInS Approved")
    ))
    conn.commit()
    cursor.execute("SELECT * FROM approved_stocks WHERE ticker = ?", (ticker,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


def bulk_add_approved_stocks(ticker_list: List[str], default_notes: str = "Batch Imported") -> int:
    if use_supabase():
        return supabase_client.bulk_add_approved_stocks(ticker_list, default_notes)
    conn = get_connection()
    cursor = conn.cursor()
    count = 0
    for sym in ticker_list:
        clean = sym.strip().upper()
        if clean:
            cursor.execute("""
                INSERT OR IGNORE INTO approved_stocks (ticker, company_name, sector, notes)
                VALUES (?, ?, 'Other', ?)
            """, (clean, clean, default_notes))
            count += cursor.rowcount
    conn.commit()
    conn.close()
    return count


def delete_approved_stock(ticker: str) -> bool:
    if use_supabase():
        return supabase_client.delete_approved_stock(ticker.strip().upper())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM approved_stocks WHERE ticker = ?", (ticker.strip().upper(),))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ============================================================
# Report Outline Skeleton Data Access (Phase 3)
# ============================================================

def get_all_report_sections() -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_all_report_sections()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM report_sections ORDER BY order_idx ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def update_report_section(section_id: str, content: str) -> Optional[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.update_report_section(section_id, content)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        UPDATE report_sections
        SET content = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE section_id = ?
    """, (content, section_id))
    conn.commit()
    cursor.execute("SELECT * FROM report_sections WHERE section_id = ?", (section_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_report_full_markdown() -> str:
    sections = get_all_report_sections()
    ips = get_client_ips()
    md_lines = [
        "# Wharton Investment Simulator (WInS) — Final Investment Report",
        "**Team Virtual Capital**: $500,000  ",
        f"**Client Objective**: {ips.get('objective', '').title()} | **Risk Tolerance**: {ips.get('risk_tolerance', '').title()} | **Benchmark**: {ips.get('benchmark', 'S&P 500')}  ",
        f"**Mandated Constraints**: {ips.get('constraints', 'None')}  \n",
        "---\n"
    ]
    for s in sections:
        md_lines.append(f"## {s['title']}\n")
        body = s.get("content", "").strip()
        if body:
            md_lines.append(f"{body}\n")
        else:
            md_lines.append("*[No content drafted yet for this section]*\n")
        md_lines.append("\n---\n")
    return "\n".join(md_lines)


# ============================================================
# AI Usage Logs Data Access
# ============================================================

def get_all_ai_logs() -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_all_ai_logs()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM ai_logs ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_ai_log(log_data: Dict[str, Any]) -> int:
    if use_supabase():
        return supabase_client.add_ai_log(log_data)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO ai_logs (date, team_member, what_was_asked, tool_used, category)
        VALUES (?, ?, ?, ?, ?)
    """, (
        log_data["date"],
        log_data["team_member"],
        log_data["what_was_asked"],
        log_data["tool_used"],
        log_data["category"]
    ))
    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


# ============================================================
# Watchlist Data Access (Phase 4)
# ============================================================

def get_all_watchlist() -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_all_watchlist()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM watchlist ORDER BY created_at DESC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(row) for row in rows]


def add_watchlist_item(data: Dict[str, Any]) -> Dict[str, Any]:
    if use_supabase():
        return supabase_client.add_watchlist_item(data)
    ticker = data["ticker"].strip().upper()
    notes = data.get("notes", "").strip()
    target_price = data.get("target_price")
    if target_price is not None:
        try:
            target_price = float(target_price)
        except (ValueError, TypeError):
            target_price = None

    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO watchlist (ticker, notes, target_price, created_at)
        VALUES (?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(ticker) DO UPDATE SET
            notes = excluded.notes,
            target_price = excluded.target_price,
            created_at = CURRENT_TIMESTAMP
    """, (ticker, notes, target_price))
    conn.commit()
    cursor.execute("SELECT * FROM watchlist WHERE ticker = ?", (ticker,))
    row = cursor.fetchone()
    conn.close()
    return dict(row)


def delete_watchlist_item(ticker: str) -> bool:
    if use_supabase():
        return supabase_client.delete_watchlist_item(ticker.strip().upper())
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM watchlist WHERE ticker = ?", (ticker.strip().upper(),))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return deleted


# ============================================================
# Activity Feed Data Aggregation (Phase 4)
# ============================================================

def _format_relative_time(ts_str: Optional[str]) -> str:
    if not ts_str:
        return "Recently"
    try:
        clean_ts = ts_str.replace("T", " ").split(".")[0]
        dt = datetime.datetime.strptime(clean_ts, "%Y-%m-%d %H:%M:%S")
        now = datetime.datetime.utcnow()
        diff = now - dt
        seconds = int(diff.total_seconds())
        if seconds < 0:
            return "Just now"
        if seconds < 60:
            return "Just now"
        minutes = seconds // 60
        if minutes < 60:
            return f"{minutes}m ago"
        hours = minutes // 60
        if hours < 24:
            return f"{hours}h ago"
        days = hours // 24
        if days == 1:
            return "Yesterday"
        if days < 7:
            return f"{days}d ago"
        return dt.strftime("%b %d")
    except Exception:
        return str(ts_str)[:10]


def get_recent_activity(limit: int = 15) -> List[Dict[str, Any]]:
    """
    Synthesizes a reverse-chronological activity feed across existing database tables:
    trades, watchlist, screener_notes, client_ips, news_tags, approved_stocks, and ai_logs.
    """
    conn = get_connection()
    cursor = conn.cursor()
    events = []

    # 1. Trades
    try:
        cursor.execute("SELECT id, ticker, company_name, entry_price, quantity, status, realized_pnl, created_at FROM trades ORDER BY created_at DESC LIMIT 15")
        for row in cursor.fetchall():
            is_open = row["status"] == "open"
            desc = (
                f"Entered {row['quantity']} shs at ${row['entry_price']:.2f}"
                if is_open
                else f"Closed position (P&L: ${row['realized_pnl']:.2f})"
            )
            events.append({
                "id": f"trade_{row['id']}",
                "type": "trade",
                "title": f"{'Trade Executed' if is_open else 'Position Closed'}: {row['ticker']}",
                "description": desc,
                "timestamp": row["created_at"] or "2026-09-01 00:00:00",
                "badge": "Trade Log",
                "color": "blue" if is_open else "emerald"
            })
    except Exception:
        pass

    # 2. Watchlist
    try:
        cursor.execute("SELECT ticker, notes, created_at FROM watchlist ORDER BY created_at DESC LIMIT 15")
        for row in cursor.fetchall():
            events.append({
                "id": f"watch_{row['ticker']}",
                "type": "watchlist",
                "title": f"Watchlist: Added {row['ticker']}",
                "description": row["notes"] if row["notes"] else "Added to prospective research watchlist",
                "timestamp": row["created_at"] or "2026-09-01 00:00:00",
                "badge": "Watchlist",
                "color": "indigo"
            })
    except Exception:
        pass

    # 3. Screener Notes
    try:
        cursor.execute("SELECT ticker, moat_type, updated_at FROM screener_notes ORDER BY updated_at DESC LIMIT 15")
        for row in cursor.fetchall():
            events.append({
                "id": f"screener_{row['ticker']}",
                "type": "screener",
                "title": f"Screener: Evaluated {row['ticker']}",
                "description": f"Assigned '{row['moat_type']}' moat & qualitative notes",
                "timestamp": row["updated_at"] or "2026-09-01 00:00:00",
                "badge": "Screener",
                "color": "purple"
            })
    except Exception:
        pass

    # 4. Client IPS Updates
    try:
        cursor.execute("SELECT objective, risk_tolerance, benchmark, updated_at FROM client_ips WHERE updated_at IS NOT NULL")
        for row in cursor.fetchall():
            events.append({
                "id": "ips_update",
                "type": "ips",
                "title": "Client IPS Mandate Updated",
                "description": f"Objective: {row['objective'].title()} | Risk: {row['risk_tolerance'].title()}",
                "timestamp": row["updated_at"] or "2026-09-01 00:00:00",
                "badge": "Client IPS",
                "color": "amber"
            })
    except Exception:
        pass

    # 5. News Tagged Relevant
    try:
        cursor.execute("SELECT headline, source, relevance_tag, updated_at FROM news_tags WHERE relevance_tag = 'relevant' ORDER BY updated_at DESC LIMIT 15")
        for row in cursor.fetchall():
            headline = row["headline"][:70] + "..." if len(row["headline"]) > 70 else row["headline"]
            events.append({
                "id": f"news_{abs(hash(row['headline']))}",
                "type": "news",
                "title": "News Tagged Relevant",
                "description": headline,
                "timestamp": row["updated_at"] or "2026-09-01 00:00:00",
                "badge": "News Scanner",
                "color": "cyan"
            })
    except Exception:
        pass

    # 6. Approved Stocks
    try:
        cursor.execute("SELECT ticker, company_name, created_at FROM approved_stocks ORDER BY created_at DESC LIMIT 15")
        for row in cursor.fetchall():
            events.append({
                "id": f"approved_{row['ticker']}",
                "type": "approved",
                "title": f"Approved List: {row['ticker']}",
                "description": f"{row['company_name']} verified under competition rules",
                "timestamp": row["created_at"] or "2026-09-01 00:00:00",
                "badge": "Wharton List",
                "color": "emerald"
            })
    except Exception:
        pass

    # 7. AI Logs
    try:
        cursor.execute("SELECT id, team_member, category, what_was_asked, created_at FROM ai_logs ORDER BY id DESC LIMIT 15")
        for row in cursor.fetchall():
            prompt = row["what_was_asked"][:60] + "..." if len(row["what_was_asked"]) > 60 else row["what_was_asked"]
            events.append({
                "id": f"ailog_{row['id']}",
                "type": "ai_log",
                "title": f"AI Log: {row['team_member']}",
                "description": f"[{row['category']}] {prompt}",
                "timestamp": row["created_at"] or "2026-09-01 00:00:00",
                "badge": "AI Log",
                "color": "slate"
            })
    except Exception:
        pass

    # 8. Trade Edits (Phase 5)
    try:
        cursor.execute("SELECT trade_id, edited_by, field_changed, timestamp FROM trade_edits ORDER BY id DESC LIMIT 15")
        for row in cursor.fetchall():
            events.append({
                "id": f"edit_{row['trade_id']}_{abs(hash(str(row['timestamp'])))}",
                "type": "trade_edit",
                "title": f"Trade #{row['trade_id']} Edited",
                "description": f"{row['edited_by']} updated {row['field_changed']}",
                "timestamp": row["timestamp"] or "2026-09-01 00:00:00",
                "badge": "Audit Log",
                "color": "indigo"
            })
    except Exception:
        pass

    # 9. Reconciliation Checks (Phase 5)
    try:
        cursor.execute("SELECT checked_by, cash_discrepancy, portfolio_discrepancy, checked_at FROM reconciliation_checks ORDER BY id DESC LIMIT 15")
        for row in cursor.fetchall():
            gap_str = f"Cash Gap: ${row['cash_discrepancy']:+,.2f} | Port Gap: ${row['portfolio_discrepancy']:+,.2f}"
            events.append({
                "id": f"rec_{abs(hash(str(row['checked_at'])))}",
                "type": "reconciliation",
                "title": f"WInS Audit: {row['checked_by']}",
                "description": gap_str,
                "timestamp": row["checked_at"] or "2026-09-01 00:00:00",
                "badge": "Reconciliation",
                "color": "amber"
            })
    except Exception:
        pass

    conn.close()

    # Sort descending by timestamp
    events.sort(key=lambda x: str(x.get("timestamp") or ""), reverse=True)

    # Attach relative_time and slice limit
    sliced = events[:limit]
    for ev in sliced:
        ev["relative_time"] = _format_relative_time(ev.get("timestamp"))

    return sliced


# ============================================================
# Phase 5: Manual WInS Reconciliation Checks
# ============================================================

def add_reconciliation_check(
    checked_by: str,
    actual_cash: float,
    actual_portfolio_value: float,
    calculated_cash: float,
    calculated_portfolio_value: float,
    notes: str = ""
) -> Dict[str, Any]:
    """
    Records a manual reconciliation audit comparing the dashboard calculated figures
    against the actual live numbers reported inside the official Wharton WInS simulator portal.
    """
    if use_supabase():
        return supabase_client.add_reconciliation_check(
            checked_by, actual_cash, actual_portfolio_value,
            calculated_cash, calculated_portfolio_value, notes
        )
    conn = get_connection()
    cursor = conn.cursor()
    cash_gap = round(actual_cash - calculated_cash, 2)
    port_gap = round(actual_portfolio_value - calculated_portfolio_value, 2)

    cursor.execute("""
        INSERT INTO reconciliation_checks (
            checked_by, actual_cash, actual_portfolio_value,
            calculated_cash, calculated_portfolio_value,
            cash_discrepancy, portfolio_discrepancy, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        checked_by,
        actual_cash,
        actual_portfolio_value,
        calculated_cash,
        calculated_portfolio_value,
        cash_gap,
        port_gap,
        notes.strip()
    ))
    rec_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM reconciliation_checks WHERE id = ?", (rec_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row


def get_reconciliation_history(limit: int = 15) -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_reconciliation_history(limit)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reconciliation_checks ORDER BY id DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# ============================================================
# Phase 5: Team Deadlines & Milestones
# ============================================================

def get_team_deadlines() -> List[Dict[str, Any]]:
    if use_supabase():
        return supabase_client.get_team_deadlines()
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM team_deadlines ORDER BY deadline_date ASC")
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def add_team_deadline(title: str, deadline_date: str, description: str = "", is_hard_deadline: bool = False) -> Dict[str, Any]:
    if use_supabase():
        return supabase_client.add_team_deadline(title, deadline_date, description, is_hard_deadline)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO team_deadlines (title, deadline_date, description, is_hard_deadline)
        VALUES (?, ?, ?, ?)
    """, (title.strip(), deadline_date.strip(), description.strip(), 1 if is_hard_deadline else 0))
    d_id = cursor.lastrowid
    conn.commit()
    cursor.execute("SELECT * FROM team_deadlines WHERE id = ?", (d_id,))
    row = dict(cursor.fetchone())
    conn.close()
    return row


def delete_team_deadline(deadline_id: int) -> bool:
    if use_supabase():
        return supabase_client.delete_team_deadline(deadline_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM team_deadlines WHERE id = ?", (deadline_id,))
    affected = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return affected


# ============================================================
# Phase 5: Persistent Market Cache Fallback
# ============================================================

def save_market_cache(ticker: str, data: Dict[str, Any]):
    """Persists fetched stock data in SQLite/Supabase so server restarts retain cached fallback quotes."""
    if use_supabase():
        supabase_client.save_market_cache(ticker, data)
    try:
        conn = get_connection()
        cursor = conn.cursor()
        data_json = json.dumps(data)
        cursor.execute("""
            INSERT INTO market_cache (ticker, data_json, updated_at)
            VALUES (?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(ticker) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP
        """, (ticker.upper(), data_json))
        conn.commit()
        conn.close()
    except Exception as e:
        pass


def get_market_cache(ticker: str) -> Optional[Dict[str, Any]]:
    if use_supabase():
        cached = supabase_client.get_market_cache(ticker)
        if cached:
            return cached
    try:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT data_json, updated_at FROM market_cache WHERE ticker = ?", (ticker.upper(),))
        row = cursor.fetchone()
        conn.close()
        if row and row["data_json"]:
            data = json.loads(row["data_json"])
            data["cached_at_db"] = str(row["updated_at"])
            return data
    except Exception:
        pass
    return None


# ============================================================
# Phase 5: Full Database Backup Export
# ============================================================

def export_full_database_backup() -> Dict[str, Any]:
    """
    Exports the entire team dataset into a single structured JSON payload.
    Provides complete portability independent of cloud hosting platform.
    """
    conn = get_connection()
    cursor = conn.cursor()

    tables = [
        "trades", "trade_edits", "ai_logs", "client_ips",
        "tracked_sectors", "screener_notes", "news_tags",
        "approved_stocks", "report_sections", "watchlist",
        "reconciliation_checks", "team_deadlines"
    ]

    backup_data: Dict[str, Any] = {
        "metadata": {
            "application": "Wharton Investment Simulator (WInS) Portfolio Management Platform",
            "backup_version": "5.0-production-polish",
            "backup_timestamp": datetime.datetime.utcnow().isoformat() + "Z",
            "team_roster": ["Arnav", "Jaivish", "Harsimar", "Nairit"],
            "virtual_fund_baseline": 500000.0,
            "architecture": "Single synchronized SQLite database (wins_data.db) + zero AI fabrication"
        },
        "tables": {}
    }

    table_counts = {}
    for table_name in tables:
        try:
            cursor.execute(f"SELECT * FROM {table_name}")
            rows = [dict(r) for r in cursor.fetchall()]
            backup_data["tables"][table_name] = rows
            table_counts[table_name] = len(rows)
        except Exception as e:
            backup_data["tables"][table_name] = []
            table_counts[table_name] = 0

    backup_data["metadata"]["table_record_counts"] = table_counts
    conn.close()
    return backup_data
