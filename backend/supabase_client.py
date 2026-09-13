"""
Supabase REST API Client for Wharton Investment Simulator (WInS).
Provides persistent cloud database access across all 4 team members.
Uses PostgREST over HTTPS via requests — zero native binary dependencies.
"""

import os
import json
import logging
from typing import List, Dict, Any, Optional

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

import requests

logger = logging.getLogger("wins_supabase")

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = (
    os.environ.get("SUPABASE_SERVICE_KEY")
    or os.environ.get("SUPABASE_KEY")
    or os.environ.get("SUPABASE_ANON_KEY", "")
).strip()


def is_configured() -> bool:
    """Returns True if Supabase credentials are set in environment."""
    return bool(SUPABASE_URL and SUPABASE_KEY)


def get_headers() -> Dict[str, str]:
    return {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {SUPABASE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "return=representation",
    }


def _url(endpoint: str) -> str:
    ep = endpoint.lstrip("/")
    return f"{SUPABASE_URL}/rest/v1/{ep}"


# ==============================================================================
# Trades
# ==============================================================================

def get_all_trades() -> List[Dict[str, Any]]:
    res = requests.get(_url("trades?select=*&order=id.desc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def get_trade_by_id(trade_id: int) -> Optional[Dict[str, Any]]:
    res = requests.get(_url(f"trades?id=eq.{trade_id}&select=*"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    data = res.json()
    return data[0] if data else None


def add_trade(trade_data: Dict[str, Any]) -> int:
    res = requests.post(_url("trades"), json=trade_data, headers=get_headers(), timeout=10)
    res.raise_for_status()
    created = res.json()
    return created[0]["id"]


def update_trade(trade_id: int, updated_fields: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    res = requests.patch(_url(f"trades?id=eq.{trade_id}"), json=updated_fields, headers=get_headers(), timeout=10)
    res.raise_for_status()
    data = res.json()
    return data[0] if data else None


def delete_trade(trade_id: int) -> bool:
    res = requests.delete(_url(f"trades?id=eq.{trade_id}"), headers=get_headers(), timeout=10)
    return res.status_code in (200, 204)


# ==============================================================================
# Trade Edits Audit
# ==============================================================================

def add_trade_edit(trade_id: int, edited_by: str, field_changed: str, old_val: str, new_val: str):
    payload = {
        "trade_id": trade_id,
        "edited_by": edited_by,
        "field_changed": field_changed,
        "old_value": str(old_val),
        "new_value": str(new_val)
    }
    res = requests.post(_url("trade_edits"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()


def get_trade_edits(trade_id: Optional[int] = None) -> List[Dict[str, Any]]:
    query = f"trade_edits?trade_id=eq.{trade_id}&select=*&order=id.desc" if trade_id else "trade_edits?select=*&order=id.desc"
    res = requests.get(_url(query), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


# ==============================================================================
# Client IPS
# ==============================================================================

def get_client_ips() -> Dict[str, Any]:
    res = requests.get(_url("client_ips?id=eq.1&select=*"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    data = res.json()
    return data[0] if data else {
        "id": 1,
        "objective": "growth",
        "risk_tolerance": "moderate",
        "time_horizon": "10 Weeks",
        "constraints": "No leverage, max 20% single position weight",
        "benchmark": "S&P 500 (^GSPC)"
    }


def update_client_ips(ips_data: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "objective": ips_data.get("objective", "growth"),
        "risk_tolerance": ips_data.get("risk_tolerance", "moderate"),
        "time_horizon": ips_data.get("time_horizon", "10 Weeks"),
        "constraints": ips_data.get("constraints", ""),
        "benchmark": ips_data.get("benchmark", "S&P 500 (^GSPC)")
    }
    res = requests.patch(_url("client_ips?id=eq.1"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()
    data = res.json()
    return data[0] if data else ips_data


# ==============================================================================
# Tracked Sectors
# ==============================================================================

def get_tracked_sectors() -> List[Dict[str, Any]]:
    res = requests.get(_url("tracked_sectors?select=*&order=id.asc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def add_tracked_sector(sector_data: Dict[str, Any]) -> int:
    payload = {
        "name": sector_data["name"].strip(),
        "etf_ticker": sector_data["etf_ticker"].strip().upper(),
        "inflation_trend": sector_data.get("inflation_trend", "stable"),
        "rate_direction": sector_data.get("rate_direction", "neutral"),
        "macro_notes": sector_data.get("macro_notes", "")
    }
    res = requests.post(_url("tracked_sectors"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()
    created = res.json()
    return created[0]["id"]


def update_tracked_sector(sector_id: int, sector_data: Dict[str, Any]) -> bool:
    payload = {
        "name": sector_data["name"].strip(),
        "etf_ticker": sector_data["etf_ticker"].strip().upper(),
        "inflation_trend": sector_data.get("inflation_trend", "stable"),
        "rate_direction": sector_data.get("rate_direction", "neutral"),
        "macro_notes": sector_data.get("macro_notes", "")
    }
    res = requests.patch(_url(f"tracked_sectors?id=eq.{sector_id}"), json=payload, headers=get_headers(), timeout=10)
    return res.status_code in (200, 204)


def delete_tracked_sector(sector_id: int) -> bool:
    res = requests.delete(_url(f"tracked_sectors?id=eq.{sector_id}"), headers=get_headers(), timeout=10)
    return res.status_code in (200, 204)


# ==============================================================================
# Approved Stocks
# ==============================================================================

def get_all_approved_stocks() -> List[Dict[str, Any]]:
    res = requests.get(_url("approved_stocks?select=*&order=ticker.asc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def add_approved_stock(stock_data: Dict[str, Any]) -> Dict[str, Any]:
    ticker = stock_data["ticker"].strip().upper()
    payload = {
        "ticker": ticker,
        "company_name": stock_data.get("company_name", ticker),
        "sector": stock_data.get("sector", "Other"),
        "notes": stock_data.get("notes", "Wharton WInS Approved")
    }
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    res = requests.post(_url("approved_stocks"), json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    rows = res.json()
    return rows[0] if rows else payload


def bulk_add_approved_stocks(ticker_list: List[str], default_notes: str = "Batch Imported") -> int:
    stocks = [
        {"ticker": sym.strip().upper(), "company_name": sym.strip().upper(), "sector": "Other", "notes": default_notes}
        for sym in ticker_list if sym.strip()
    ]
    if not stocks:
        return 0
    headers = get_headers()
    headers["Prefer"] = "resolution=ignore-duplicates"
    res = requests.post(_url("approved_stocks"), json=stocks, headers=headers, timeout=15)
    return len(stocks) if res.status_code in (200, 201) else 0


def delete_approved_stock(ticker: str) -> bool:
    res = requests.delete(_url(f"approved_stocks?ticker=eq.{ticker}"), headers=get_headers(), timeout=10)
    return res.status_code in (200, 204)


# ==============================================================================
# AI Usage Logs
# ==============================================================================

def get_all_ai_logs() -> List[Dict[str, Any]]:
    res = requests.get(_url("ai_logs?select=*&order=id.desc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def add_ai_log(log_data: Dict[str, Any]) -> int:
    payload = {
        "date": log_data["date"],
        "team_member": log_data["team_member"],
        "what_was_asked": log_data["what_was_asked"],
        "tool_used": log_data["tool_used"],
        "category": log_data["category"]
    }
    res = requests.post(_url("ai_logs"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()
    created = res.json()
    return created[0]["id"]


# ==============================================================================
# Report Outline
# ==============================================================================

def get_all_report_sections() -> List[Dict[str, Any]]:
    res = requests.get(_url("report_sections?select=*&order=order_idx.asc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def update_report_section(section_id: str, content: str) -> Optional[Dict[str, Any]]:
    payload = {"content": content}
    res = requests.patch(_url(f"report_sections?section_id=eq.{section_id}"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()
    data = res.json()
    return data[0] if data else None


# ==============================================================================
# Watchlist
# ==============================================================================

def get_all_watchlist() -> List[Dict[str, Any]]:
    res = requests.get(_url("watchlist?select=*&order=created_at.desc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def add_watchlist_item(data: Dict[str, Any]) -> Dict[str, Any]:
    ticker = data["ticker"].strip().upper()
    notes = data.get("notes", "").strip()
    target_price = data.get("target_price")
    if target_price is not None:
        try:
            target_price = float(target_price)
        except (ValueError, TypeError):
            target_price = None

    payload = {
        "ticker": ticker,
        "notes": notes,
        "target_price": target_price
    }
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    res = requests.post(_url("watchlist"), json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    rows = res.json()
    return rows[0] if rows else payload


def delete_watchlist_item(ticker: str) -> bool:
    res = requests.delete(_url(f"watchlist?ticker=eq.{ticker}"), headers=get_headers(), timeout=10)
    return res.status_code in (200, 204)


# ==============================================================================
# Team Deadlines
# ==============================================================================

def get_team_deadlines() -> List[Dict[str, Any]]:
    res = requests.get(_url("team_deadlines?select=*&order=deadline_date.asc"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def add_team_deadline(title: str, deadline_date: str, description: str = "", is_hard_deadline: bool = False) -> Dict[str, Any]:
    payload = {
        "title": title.strip(),
        "deadline_date": deadline_date.strip(),
        "description": description.strip(),
        "is_hard_deadline": 1 if is_hard_deadline else 0
    }
    res = requests.post(_url("team_deadlines"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()
    created = res.json()
    return created[0] if created else payload


def delete_team_deadline(deadline_id: int) -> bool:
    res = requests.delete(_url(f"team_deadlines?id=eq.{deadline_id}"), headers=get_headers(), timeout=10)
    return res.status_code in (200, 204)


# ==============================================================================
# Simulator Reconciliation Checks
# ==============================================================================

def get_reconciliation_history(limit: int = 15) -> List[Dict[str, Any]]:
    res = requests.get(_url(f"reconciliation_checks?select=*&order=id.desc&limit={limit}"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return res.json()


def add_reconciliation_check(
    checked_by: str,
    actual_cash: float,
    actual_portfolio_value: float,
    calculated_cash: float,
    calculated_portfolio_value: float,
    notes: str = ""
) -> Dict[str, Any]:
    cash_gap = round(actual_cash - calculated_cash, 2)
    port_gap = round(actual_portfolio_value - calculated_portfolio_value, 2)
    payload = {
        "checked_by": checked_by,
        "actual_cash": actual_cash,
        "actual_portfolio_value": actual_portfolio_value,
        "calculated_cash": calculated_cash,
        "calculated_portfolio_value": calculated_portfolio_value,
        "cash_discrepancy": cash_gap,
        "portfolio_discrepancy": port_gap,
        "notes": notes.strip()
    }
    res = requests.post(_url("reconciliation_checks"), json=payload, headers=get_headers(), timeout=10)
    res.raise_for_status()
    created = res.json()
    return created[0] if created else payload


# ==============================================================================
# Screener Notes & News Tags
# ==============================================================================

def get_all_screener_notes() -> Dict[str, Dict[str, Any]]:
    res = requests.get(_url("screener_notes?select=*"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return {row["ticker"]: row for row in res.json()}


def save_screener_note(ticker: str, data: Dict[str, Any]) -> Dict[str, Any]:
    sym = ticker.strip().upper()
    payload = {
        "ticker": sym,
        "moat_type": data.get("moat_type", "none"),
        "esg_note": data.get("esg_note", ""),
        "business_model": data.get("business_model", "")
    }
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    res = requests.post(_url("screener_notes"), json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    rows = res.json()
    return rows[0] if rows else payload


def get_news_tags() -> Dict[str, Dict[str, Any]]:
    res = requests.get(_url("news_tags?select=*"), headers=get_headers(), timeout=10)
    res.raise_for_status()
    return {row["article_url"]: row for row in res.json()}


def set_news_tag(article_url: str, data: Dict[str, Any]) -> Dict[str, Any]:
    payload = {
        "article_url": article_url,
        "headline": data.get("headline", ""),
        "source": data.get("source", ""),
        "published_date": data.get("published_date", ""),
        "matched_keywords": data.get("matched_keywords", ""),
        "relevance_tag": data.get("relevance_tag", "relevant")
    }
    headers = get_headers()
    headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    res = requests.post(_url("news_tags"), json=payload, headers=headers, timeout=10)
    res.raise_for_status()
    rows = res.json()
    return rows[0] if rows else payload


# ==============================================================================
# Persistent Market Cache
# ==============================================================================

def save_market_cache(ticker: str, data: Dict[str, Any]):
    try:
        payload = {
            "ticker": ticker.upper(),
            "data_json": json.dumps(data)
        }
        headers = get_headers()
        headers["Prefer"] = "resolution=merge-duplicates"
        requests.post(_url("market_cache"), json=payload, headers=headers, timeout=5)
    except Exception as e:
        logger.error(f"Failed to persist market cache to Supabase for {ticker}: {e}")


def get_market_cache(ticker: str) -> Optional[Dict[str, Any]]:
    try:
        res = requests.get(_url(f"market_cache?ticker=eq.{ticker.upper()}&select=*"), headers=get_headers(), timeout=5)
        if res.status_code == 200:
            rows = res.json()
            if rows and rows[0].get("data_json"):
                parsed = json.loads(rows[0]["data_json"])
                parsed["cached_at_supabase"] = str(rows[0].get("updated_at"))
                return parsed
    except Exception:
        pass
    return None
