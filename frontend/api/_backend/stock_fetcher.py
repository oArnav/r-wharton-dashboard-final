"""
Stock Data Fetcher Module for Wharton Investment Simulator (WInS).
Fetches real-time / recent financial metrics using yfinance.
Caches results for 15 minutes (900 seconds) to avoid redundant requests.
Gracefully handles invalid tickers without fabricating any data.
Includes price history for charts, sector ETF proxies, and benchmark tracking.
"""

import time
import datetime
import logging
from typing import Dict, Any, Optional, List, Tuple
import yfinance as yf
import pandas as pd
import numpy as np
from database import save_market_cache, get_market_cache

logger = logging.getLogger(__name__)

# In-memory cache: { ticker: { "timestamp": float, "data": dict } }
_CACHE: Dict[str, Dict[str, Any]] = {}
_HISTORY_CACHE: Dict[Tuple[str, str], Dict[str, Any]] = {}
CACHE_TTL_SECONDS = 900  # 15 minutes


def _safe_float(val: Any) -> Optional[float]:
    """Safely converts value to float or returns None."""
    if val is None:
        return None
    try:
        f = float(val)
        return None if (np.isnan(f) or np.isinf(f)) else f
    except (ValueError, TypeError):
        return None


def fetch_stock_data(ticker: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches real-time and fundamental financial data for a stock ticker.
    Results are cached for 15 minutes.
    If yfinance fetch fails, gracefully falls back to previous successfully cached data
    with clear 'fetch failed, showing cached data from [time]' notification.
    """
    symbol = ticker.strip().upper()
    now = time.time()
    now_iso = datetime.datetime.fromtimestamp(now).strftime("%b %d, %Y %I:%M %p")

    # Check memory cache
    if not force_refresh and symbol in _CACHE:
        cached_entry = _CACHE[symbol]
        if now - cached_entry["timestamp"] < CACHE_TTL_SECONDS:
            return cached_entry["data"]

    try:
        stock = yf.Ticker(symbol)
        info = stock.info

        if not info or len(info) <= 2:
            raise ValueError(f"No financial data available for symbol '{symbol}'.")

        # Resolve current price with fallbacks
        current_price = (
            _safe_float(info.get("currentPrice"))
            or _safe_float(info.get("regularMarketPrice"))
            or _safe_float(info.get("previousClose"))
            or _safe_float(info.get("ask"))
            or _safe_float(info.get("bid"))
        )

        if current_price is None:
            try:
                fast = stock.fast_info
                current_price = _safe_float(getattr(fast, "last_price", None))
            except Exception:
                pass

        if current_price is None:
            try:
                hist = stock.history(period="5d")
                if not hist.empty:
                    current_price = _safe_float(hist["Close"].iloc[-1])
            except Exception:
                pass

        if current_price is None or current_price <= 0:
            raise ValueError(f"Could not resolve a valid market price for '{symbol}'. Verify the ticker.")

        company_name = info.get("shortName") or info.get("longName") or symbol
        sector = info.get("sector") or "Other"
        industry = info.get("industry") or "Other"

        data = {
            "ticker": symbol,
            "company_name": company_name,
            "sector": sector,
            "industry": industry,
            "currency": info.get("currency", "USD"),
            "current_price": round(current_price, 2),
            "pe_ratio": _safe_float(info.get("trailingPE")) or _safe_float(info.get("forwardPE")),
            "forward_pe": _safe_float(info.get("forwardPE")),
            "trailing_pe": _safe_float(info.get("trailingPE")),
            "pb_ratio": _safe_float(info.get("priceToBook")),
            "peg_ratio": _safe_float(info.get("pegRatio")),
            "ev_ebitda": _safe_float(info.get("enterpriseToEbitda")),
            "market_cap": _safe_float(info.get("marketCap")),
            "eps": _safe_float(info.get("trailingEps")) or _safe_float(info.get("forwardEps")),
            "forward_eps": _safe_float(info.get("forwardEps")),
            "revenue_ttm": _safe_float(info.get("totalRevenue")),
            
            # Profitability & Margins
            "gross_margin": _safe_float(info.get("grossMargins")),
            "operating_margin": _safe_float(info.get("operatingMargins")),
            "net_margin": _safe_float(info.get("profitMargins")),
            "roe": _safe_float(info.get("returnOnEquity")),
            "roa": _safe_float(info.get("returnOnAssets")),
            
            # Balance Sheet & Solvency
            "debt_to_equity": _safe_float(info.get("debtToEquity")),
            "current_ratio": _safe_float(info.get("currentRatio")),
            "beta": _safe_float(info.get("beta")),
            
            # Technicals & Ranges
            "fifty_two_week_high": _safe_float(info.get("fiftyTwoWeekHigh")),
            "fifty_two_week_low": _safe_float(info.get("fiftyTwoWeekLow")),
            "fifty_day_ma": _safe_float(info.get("fiftyDayAverage")),
            "two_hundred_day_ma": _safe_float(info.get("twoHundredDayAverage")),
            "dividend_yield": _safe_float(info.get("dividendYield")),
            
            # Growth Rates
            "revenue_growth_yoy": _safe_float(info.get("revenueGrowth")),
            "eps_growth_yoy": _safe_float(info.get("earningsGrowth")),
            
            "cached_at": now,
            "last_updated": now_iso,
            "is_stale": False,
            "fetch_failed": False,
            "source": "yfinance"
        }

        _CACHE[symbol] = {
            "timestamp": now,
            "data": data
        }

        # Persist to SQLite market_cache for restart survivability
        save_market_cache(symbol, data)

        return data

    except Exception as e:
        logger.warning(f"Error fetching live data for ticker {symbol}: {e}")
        # Graceful fallback: check in-memory cache or database cache
        fallback: Optional[Dict[str, Any]] = None
        if symbol in _CACHE:
            fallback = dict(_CACHE[symbol]["data"])
        else:
            fallback = get_market_cache(symbol)

        if fallback:
            time_label = fallback.get("last_updated") or fallback.get("cached_at_db") or "prior session"
            fallback["is_stale"] = True
            fallback["fetch_failed"] = True
            fallback["status_message"] = f"Live fetch failed ({str(e)}). Showing cached market data from {time_label}."
            return fallback

        raise ValueError(f"Failed to fetch market data for '{symbol}' and no cached data is available: {str(e)}")


def fetch_stock_history(ticker: str, period: str = "6mo") -> List[Dict[str, Any]]:
    """
    Fetches historical daily close prices and rolling moving averages for a stock ticker.
    Used for price charts in Stock Lookup.
    Guarantees:
    - Zero NaNs or Infs (100% JSON compliant)
    - Fast in-memory caching to eliminate Yahoo rate limits
    - Graceful fallback across periods and ticker dot-normalization (BRK.B -> BRK-B)
    """
    symbol = ticker.strip().upper()
    if not symbol:
        return []

    yf_symbol = symbol.replace(".", "-")
    now = time.time()

    # Check in-memory history cache
    cache_key = (symbol, period)
    if cache_key in _HISTORY_CACHE:
        cached_entry = _HISTORY_CACHE[cache_key]
        if now - cached_entry["timestamp"] < CACHE_TTL_SECONDS and cached_entry.get("data"):
            return cached_entry["data"]

    try:
        stock = yf.Ticker(yf_symbol)
        df = stock.history(period=period)
        
        # If requested period is empty (e.g. 5y), fallback to 2y or 1y
        if df.empty and period in ["5y", "2y"]:
            for fb_period in ["2y", "1y", "6mo"]:
                df = stock.history(period=fb_period)
                if not df.empty:
                    break

        if df.empty:
            # Check if any other period is cached for this symbol
            for (s, _), entry in _HISTORY_CACHE.items():
                if s == symbol and entry.get("data"):
                    return entry["data"]
            return []

        # Sanitize DataFrame: drop any rows without Close
        df = df.dropna(subset=["Close"])
        if df.empty:
            return []

        # Rolling moving averages
        df["50_MA"] = df["Close"].rolling(window=50, min_periods=1).mean()
        df["200_MA"] = df["Close"].rolling(window=200, min_periods=1).mean()

        points = []
        for index, row in df.iterrows():
            close_val = _safe_float(row.get("Close"))
            # Skip invalid or non-positive price rows
            if close_val is None or close_val <= 0:
                continue

            date_str = index.strftime("%Y-%m-%d")
            ma50_val = _safe_float(row.get("50_MA"))
            ma200_val = _safe_float(row.get("200_MA"))
            
            # Safe volume integer
            vol_raw = row.get("Volume", 0)
            try:
                vol = int(vol_raw) if not (isinstance(vol_raw, float) and (np.isnan(vol_raw) or np.isinf(vol_raw))) else 0
            except Exception:
                vol = 0

            points.append({
                "date": date_str,
                "price": round(close_val, 2),
                "ma50": round(ma50_val, 2) if ma50_val is not None else None,
                "ma200": round(ma200_val, 2) if ma200_val is not None else None,
                "volume": vol
            })

        if points:
            _HISTORY_CACHE[cache_key] = {"timestamp": now, "data": points}

        return points
    except Exception as e:
        logger.error(f"Error fetching history for {symbol}: {e}")
        # Fallback to cached history if available
        for (s, _), entry in _HISTORY_CACHE.items():
            if s == symbol and entry.get("data"):
                return entry["data"]
        return []


def fetch_sector_etf_data(etf_ticker: str) -> Dict[str, Any]:
    """
    Fetches real-time price and performance metrics for a sector proxy ETF (e.g. XLK, XLV).
    """
    symbol = etf_ticker.strip().upper()
    try:
        stock = yf.Ticker(symbol)
        info = stock.info
        hist = stock.history(period="1y")

        current_price = _safe_float(info.get("regularMarketPrice") or info.get("currentPrice"))
        if current_price is None and not hist.empty:
            current_price = float(hist["Close"].iloc[-1])

        ma50 = _safe_float(info.get("fiftyDayAverage"))
        ma200 = _safe_float(info.get("twoHundredDayAverage"))

        # Calculate returns from history if available
        ret_1m = None
        ret_3m = None
        ret_ytd = None
        if not hist.empty and len(hist) > 20:
            last_close = hist["Close"].iloc[-1]
            if len(hist) >= 22:
                ret_1m = round(((last_close - hist["Close"].iloc[-22]) / hist["Close"].iloc[-22]) * 100, 2)
            if len(hist) >= 65:
                ret_3m = round(((last_close - hist["Close"].iloc[-65]) / hist["Close"].iloc[-65]) * 100, 2)
            
            # YTD: since start of current year
            curr_year = hist.index[-1].year
            ytd_hist = hist[hist.index.year == curr_year]
            if not ytd_hist.empty:
                ytd_start = ytd_hist["Close"].iloc[0]
                ret_ytd = round(((last_close - ytd_start) / ytd_start) * 100, 2)

        return {
            "etf_ticker": symbol,
            "current_price": round(current_price, 2) if current_price else None,
            "fifty_day_ma": round(ma50, 2) if ma50 else None,
            "two_hundred_day_ma": round(ma200, 2) if ma200 else None,
            "is_above_50ma": (current_price > ma50) if (current_price and ma50) else None,
            "is_above_200ma": (current_price > ma200) if (current_price and ma200) else None,
            "return_1m_pct": ret_1m,
            "return_3m_pct": ret_3m,
            "return_ytd_pct": ret_ytd,
        }
    except Exception as e:
        logger.warning(f"Error fetching sector ETF {symbol}: {e}")
        return {
            "etf_ticker": symbol,
            "current_price": None,
            "fifty_day_ma": None,
            "two_hundred_day_ma": None,
            "is_above_50ma": None,
            "is_above_200ma": None,
            "return_1m_pct": None,
            "return_3m_pct": None,
            "return_ytd_pct": None,
        }


def fetch_risk_free_rate() -> float:
    """
    Fetches 13-week (3-month) US Treasury Bill rate (^IRX).
    Returns rate as a decimal (e.g., 0.045 for 4.5%).
    """
    try:
        tbill = yf.Ticker("^IRX")
        info = tbill.info
        rate = _safe_float(info.get("regularMarketPrice")) or _safe_float(info.get("previousClose"))
        if rate is not None and rate > 0:
            return round(rate / 100.0, 4)
    except Exception as e:
        logger.warning(f"Could not fetch ^IRX, using default 4.5%: {e}")
    return 0.045


def fetch_historical_closes(tickers: List[str], period: str = "6mo") -> pd.DataFrame:
    """
    Fetches historical daily close prices for a list of tickers.
    Safely normalizes dot tickers (e.g. BRK.B -> BRK-B) and cleans NaNs.
    """
    valid_tickers = [t.strip().upper() for t in tickers if t.strip()]
    if not valid_tickers:
        return pd.DataFrame()

    # Map dot tickers (e.g. BRK.B -> BRK-B for Yahoo Finance)
    yf_to_orig = {t.replace(".", "-"): t for t in valid_tickers}
    download_tickers = list(yf_to_orig.keys())

    try:
        data = yf.download(download_tickers, period=period, progress=False)
        if "Close" in data:
            closes = data["Close"]
        else:
            closes = data
        if isinstance(closes, pd.Series):
            closes = closes.to_frame(name=download_tickers[0])
        
        # Rename columns back to original tickers
        closes = closes.rename(columns=yf_to_orig)
        closes = closes.dropna(how="all").ffill().bfill()
        return closes
    except Exception as e:
        logger.error(f"Error downloading historical data for {valid_tickers}: {e}")
        return pd.DataFrame()


# ============================================================
# Financial Statements Fetcher (Phase 4)
# ============================================================

_STATEMENTS_CACHE: Dict[str, Dict[str, Any]] = {}

def _format_statement_df(df: Optional[pd.DataFrame], key_keywords: List[str]) -> Dict[str, Any]:
    if df is None or df.empty:
        return {"periods": [], "line_items": []}

    periods = [c.strftime('%Y-%m-%d') if hasattr(c, 'strftime') else str(c)[:10] for c in df.columns]
    line_items = []

    for i in range(len(df.index)):
        item_name = str(df.index[i])
        row_vals = df.iloc[i]
        values = {}
        period_values = []
        for col_idx in range(len(df.columns)):
            date_str = periods[col_idx]
            raw_val = row_vals.iloc[col_idx] if hasattr(row_vals, "iloc") else row_vals[col_idx]
            val_f = _safe_float(raw_val)
            values[date_str] = val_f
            period_values.append(val_f)

        is_key = any(k.lower() in item_name.lower() for k in key_keywords)
        line_items.append({
            "name": item_name,
            "values": values,
            "period_values": period_values,
            "is_key": is_key
        })

    return {
        "periods": periods,
        "line_items": line_items
    }


def fetch_financial_statements(ticker: str, period_type: str = "annual", force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetches raw financial statements (Income Statement, Balance Sheet, Cash Flow)
    via yfinance (.income_stmt, .balance_sheet, .cashflow or their quarterly counterparts).
    Returns formatted, read-only data labeled with exact fetch timestamp.
    """
    symbol = ticker.strip().upper()
    is_quarterly = period_type.lower() == "quarterly"
    cache_key = f"{symbol}_{'quarterly' if is_quarterly else 'annual'}"
    now = time.time()

    if not force_refresh and cache_key in _STATEMENTS_CACHE:
        entry = _STATEMENTS_CACHE[cache_key]
        if now - entry["timestamp"] < CACHE_TTL_SECONDS:
            return entry["data"]

    try:
        stock = yf.Ticker(symbol)
        income_df = stock.quarterly_income_stmt if is_quarterly else stock.income_stmt
        balance_df = stock.quarterly_balance_sheet if is_quarterly else stock.balance_sheet
        cashflow_df = stock.quarterly_cashflow if is_quarterly else stock.cashflow

        # Key line items for quick-filtering
        is_keys = ["Revenue", "Gross Profit", "Operating Income", "Net Income", "EBITDA", "EPS", "Cost Of Revenue", "Pretax Income"]
        bs_keys = ["Cash", "Current Assets", "Total Assets", "Current Liabilities", "Total Liabilities", "Debt", "Stockholders Equity", "Working Capital", "Retained Earnings"]
        cf_keys = ["Operating Cash Flow", "Investing Cash Flow", "Financing Cash Flow", "Capital Expenditure", "Free Cash Flow", "Dividends Paid"]

        income_stmt = _format_statement_df(income_df, is_keys)
        balance_sheet = _format_statement_df(balance_df, bs_keys)
        cash_flow = _format_statement_df(cashflow_df, cf_keys)

        # Meta info
        company_name = symbol
        sector = "Other"
        try:
            info = stock.info
            company_name = info.get("shortName") or info.get("longName") or symbol
            sector = info.get("sector") or "Other"
        except Exception:
            pass

        import datetime
        fetch_date = datetime.datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")

        result = {
            "ticker": symbol,
            "company_name": company_name,
            "sector": sector,
            "period_type": "quarterly" if is_quarterly else "annual",
            "fetch_date": fetch_date,
            "income_statement": income_stmt,
            "balance_sheet": balance_sheet,
            "cash_flow": cash_flow
        }

        _STATEMENTS_CACHE[cache_key] = {
            "timestamp": now,
            "data": result
        }

        return result
    except Exception as e:
        logger.error(f"Error fetching financial statements for {symbol}: {e}")
        if cache_key in _STATEMENTS_CACHE:
            fallback = dict(_STATEMENTS_CACHE[cache_key]["data"])
            fallback["is_stale"] = True
            fallback["fetch_failed"] = True
            fallback["status_message"] = f"Live fetch failed ({str(e)}). Showing cached filings from {fallback.get('fetch_date')}."
            return fallback
        raise ValueError(f"Could not retrieve financial statements for '{symbol}' and no cached statements exist: {e}")
