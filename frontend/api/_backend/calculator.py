"""
Calculator Layer for Wharton Investment Simulator (WInS).
Computes all per-holding, portfolio-level, sector rules-based scoring,
company screener scorecards, and benchmark comparison time series.
Strictly rules-based and mathematical — zero AI fabrication or black-box guessing.
"""

from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from stock_fetcher import (
    fetch_stock_data,
    fetch_risk_free_rate,
    fetch_historical_closes,
    fetch_sector_etf_data,
)

STARTING_CAPITAL = 500000.0


def compute_holding_metrics(trade: Dict[str, Any], live_stock: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Computes holding-level values:
    - Current Market Price & Value
    - Unrealized P&L ($ and %)
    - Realized P&L ($ and %)
    - Current Position Size %
    - Per-stock Valuation & Financial Health ratios
    - IPS Alignment and Fit Status
    """
    entry_price = float(trade.get("entry_price") or 0.0)
    quantity = float(trade.get("quantity") or 0.0)
    cost_basis = round(entry_price * quantity, 2)
    status = trade.get("status", "open")

    result = dict(trade)
    result["cost_basis"] = cost_basis

    # IPS Traceability checks
    ips_alignment = (trade.get("ips_alignment") or "").strip()
    ips_fit_status = trade.get("ips_fit_status") or ("missing" if not ips_alignment else "fit")
    result["ips_alignment"] = ips_alignment
    result["ips_fit_status"] = ips_fit_status
    result["has_ips_issue"] = (ips_fit_status == "unclear" or not ips_alignment or ips_fit_status == "missing")

    if status == "closed":
        exit_price = float(trade.get("exit_price") or 0.0)
        exit_value = round(exit_price * quantity, 2)
        realized_pnl = round((exit_price - entry_price) * quantity, 2)
        realized_pnl_pct = round(((exit_price - entry_price) / entry_price) * 100.0, 2) if entry_price > 0 else 0.0
        
        result["current_price"] = exit_price
        result["market_value"] = exit_value
        result["realized_pnl"] = realized_pnl
        result["realized_pnl_pct"] = realized_pnl_pct
        result["unrealized_pnl"] = 0.0
        result["unrealized_pnl_pct"] = 0.0
        result["is_winner"] = realized_pnl > 0
    else:
        # Open position
        current_price = entry_price
        if live_stock and live_stock.get("current_price"):
            current_price = float(live_stock["current_price"])

        market_value = round(current_price * quantity, 2)
        unrealized_pnl = round((current_price - entry_price) * quantity, 2)
        unrealized_pnl_pct = round(((current_price - entry_price) / entry_price) * 100.0, 2) if entry_price > 0 else 0.0

        result["current_price"] = round(current_price, 2)
        result["market_value"] = market_value
        result["unrealized_pnl"] = unrealized_pnl
        result["unrealized_pnl_pct"] = unrealized_pnl_pct
        result["realized_pnl"] = 0.0
        result["realized_pnl_pct"] = 0.0
        result["is_winner"] = unrealized_pnl > 0

    if live_stock:
        result["pe_ratio"] = live_stock.get("pe_ratio")
        result["pb_ratio"] = live_stock.get("pb_ratio")
        result["peg_ratio"] = live_stock.get("peg_ratio")
        result["ev_ebitda"] = live_stock.get("ev_ebitda")
        result["gross_margin"] = live_stock.get("gross_margin")
        result["operating_margin"] = live_stock.get("operating_margin")
        result["net_margin"] = live_stock.get("net_margin")
        result["roe"] = live_stock.get("roe")
        result["roa"] = live_stock.get("roa")
        result["debt_to_equity"] = live_stock.get("debt_to_equity")
        result["current_ratio"] = live_stock.get("current_ratio")
        result["beta"] = live_stock.get("beta")
        result["dividend_yield"] = live_stock.get("dividend_yield")
        result["fifty_two_week_high"] = live_stock.get("fifty_two_week_high")
        result["fifty_two_week_low"] = live_stock.get("fifty_two_week_low")
        result["fifty_day_ma"] = live_stock.get("fifty_day_ma")
        result["two_hundred_day_ma"] = live_stock.get("two_hundred_day_ma")
        result["revenue_growth_yoy"] = live_stock.get("revenue_growth_yoy")
        result["eps_growth_yoy"] = live_stock.get("eps_growth_yoy")

    return result


def compute_portfolio_summary(trades: List[Dict[str, Any]], custom_risk_free_rate: Optional[float] = None) -> Dict[str, Any]:
    """
    Computes portfolio-level aggregated metrics including IPS traceability compliance.
    """
    open_trades = [t for t in trades if t.get("status") == "open"]
    closed_trades = [t for t in trades if t.get("status") == "closed"]

    open_tickers = list(set(t["ticker"].strip().upper() for t in open_trades if t.get("ticker")))
    live_data_map: Dict[str, Dict[str, Any]] = {}

    for ticker in open_tickers:
        try:
            live_data_map[ticker] = fetch_stock_data(ticker)
        except Exception:
            live_data_map[ticker] = {}

    enriched_open_trades = [
        compute_holding_metrics(t, live_data_map.get(t["ticker"].strip().upper()))
        for t in open_trades
    ]
    enriched_closed_trades = [
        compute_holding_metrics(t)
        for t in closed_trades
    ]

    total_open_cost = sum(t["cost_basis"] for t in enriched_open_trades)
    total_realized_pnl = sum(t["realized_pnl"] for t in enriched_closed_trades)
    cash_remaining = round(STARTING_CAPITAL - total_open_cost + total_realized_pnl, 2)

    total_open_market_value = round(sum(t["market_value"] for t in enriched_open_trades), 2)
    total_unrealized_pnl = round(sum(t["unrealized_pnl"] for t in enriched_open_trades), 2)

    total_portfolio_value = round(cash_remaining + total_open_market_value, 2)
    total_pnl = round(total_portfolio_value - STARTING_CAPITAL, 2)
    total_pnl_pct = round((total_pnl / STARTING_CAPITAL) * 100.0, 2)

    closed_count = len(enriched_closed_trades)
    winning_trades = sum(1 for t in enriched_closed_trades if t.get("is_winner", False))
    win_rate = round((winning_trades / closed_count) * 100.0, 1) if closed_count > 0 else 0.0

    # Sector Breakdown
    sector_totals: Dict[str, float] = {}
    for t in enriched_open_trades:
        raw_sec = t.get("sector")
        sec = raw_sec.strip() if raw_sec and isinstance(raw_sec, str) and raw_sec.strip() else "Other"
        sector_totals[sec] = sector_totals.get(sec, 0.0) + t["market_value"]

    allocations = []
    for sec, val in sector_totals.items():
        pct = round((val / total_portfolio_value) * 100.0, 2) if total_portfolio_value > 0 else 0.0
        allocations.append({
            "sector": sec,
            "value": round(val, 2),
            "percentage": pct
        })

    cash_pct = round((cash_remaining / total_portfolio_value) * 100.0, 2) if total_portfolio_value > 0 else 100.0
    allocations.append({
        "sector": "Cash",
        "value": cash_remaining,
        "percentage": max(0.0, cash_pct)
    })
    allocations.sort(key=lambda x: x["value"], reverse=True)

    # Risk Metrics
    weighted_equity_beta: Optional[float] = None
    portfolio_beta: Optional[float] = None
    if total_open_market_value > 0:
        beta_sum = 0.0
        valid_beta_val = 0.0
        for t in enriched_open_trades:
            beta = t.get("beta")
            if beta is not None and not np.isnan(beta):
                beta_sum += float(beta) * t["market_value"]
                valid_beta_val += t["market_value"]
        
        if valid_beta_val > 0:
            weighted_equity_beta = round(beta_sum / valid_beta_val, 2)
            portfolio_beta = round(beta_sum / total_portfolio_value, 2) if total_portfolio_value > 0 else weighted_equity_beta

    rf_rate = custom_risk_free_rate if custom_risk_free_rate is not None else fetch_risk_free_rate()

    daily_std: Optional[float] = None
    annualized_std: Optional[float] = None
    weekly_std: Optional[float] = None
    max_drawdown: Optional[float] = None
    sharpe_ratio: Optional[float] = None

    if open_tickers and total_open_market_value > 0:
        try:
            hist_df = fetch_historical_closes(open_tickers, period="6mo")
            if not hist_df.empty and len(hist_df) > 10:
                daily_rets = hist_df.pct_change().dropna()
                weights = {}
                for t in enriched_open_trades:
                    sym = t["ticker"].strip().upper()
                    if sym in daily_rets.columns:
                        weights[sym] = weights.get(sym, 0.0) + t["market_value"]
                
                w_sum = sum(weights.values())
                if w_sum > 0 and len(weights) > 0:
                    weight_series = pd.Series({k: v / w_sum for k, v in weights.items()})
                    common_cols = [c for c in daily_rets.columns if c in weight_series.index]
                    if common_cols:
                        port_daily_rets = (daily_rets[common_cols] * weight_series[common_cols]).sum(axis=1)

                        daily_vol = float(port_daily_rets.std())
                        daily_std = round(daily_vol, 4)
                        ann_vol = daily_vol * np.sqrt(252)
                        annualized_std = round(ann_vol, 4)
                        weekly_std = round(daily_vol * np.sqrt(5), 4)

                        cum_returns = (1.0 + port_daily_rets).cumprod()
                        peak = cum_returns.cummax()
                        dd = (cum_returns - peak) / peak
                        max_drawdown = round(float(dd.min()) * 100.0, 2)

                        mean_ann_return = float(port_daily_rets.mean()) * 252
                        if ann_vol > 0:
                            sharpe = (mean_ann_return - rf_rate) / ann_vol
                            sharpe_ratio = round(sharpe, 2)
        except Exception:
            pass

    # 5. IPS Traceability Summary
    total_open_count = len(enriched_open_trades)
    ips_documented_count = sum(1 for t in enriched_open_trades if t.get("ips_alignment") and t.get("ips_fit_status") == "fit")
    ips_unclear_count = sum(1 for t in enriched_open_trades if t.get("ips_fit_status") == "unclear")
    ips_missing_count = sum(1 for t in enriched_open_trades if not t.get("ips_alignment") or t.get("ips_fit_status") == "missing")
    ips_compliance_pct = round((ips_documented_count / total_open_count) * 100.0, 1) if total_open_count > 0 else 100.0

    return {
        "starting_capital": STARTING_CAPITAL,
        "total_portfolio_value": total_portfolio_value,
        "total_pnl": total_pnl,
        "total_pnl_pct": total_pnl_pct,
        "realized_pnl": total_realized_pnl,
        "unrealized_pnl": total_unrealized_pnl,
        "cash_remaining": cash_remaining,
        "cash_percentage": max(0.0, cash_pct),
        "total_invested_value": total_open_market_value,
        "open_positions_count": total_open_count,
        "closed_positions_count": closed_count,
        "win_rate": win_rate,
        "sector_allocations": allocations,
        "risk_metrics": {
            "risk_free_rate": round(rf_rate * 100.0, 2),
            "weighted_equity_beta": weighted_equity_beta,
            "portfolio_beta": portfolio_beta,
            "annualized_volatility_pct": round(annualized_std * 100.0, 2) if annualized_std is not None else None,
            "weekly_volatility_pct": round(weekly_std * 100.0, 2) if weekly_std is not None else None,
            "daily_std": daily_std,
            "max_drawdown_pct": max_drawdown,
            "sharpe_ratio": sharpe_ratio
        },
        "ips_traceability": {
            "documented_count": ips_documented_count,
            "unclear_count": ips_unclear_count,
            "missing_count": ips_missing_count,
            "compliance_pct": ips_compliance_pct
        },
        "enriched_open_trades": enriched_open_trades,
        "enriched_closed_trades": enriched_closed_trades
    }


# ============================================================
# Sector Rules-Based Scoring Function
# ============================================================

def evaluate_sector_stance(etf_data: Dict[str, Any], inflation_trend: str, rate_direction: str, macro_notes: str) -> Dict[str, Any]:
    """
    Evaluates sector stance (favorable / neutral / unfavorable) based on
    transparent rules, NOT AI:
    Rule factors:
    1. Technical: ETF price relative to 50-day moving average.
    2. Macro: Rate direction and inflation trend impact.
       - Falling rates/inflation benefit Growth/Rate-sensitive sectors (Tech, RE, Utilities).
       - Rising inflation benefits Energy/Materials.
    """
    is_above_50ma = etf_data.get("is_above_50ma")
    score_points = 0
    reasons = []

    # 1. Technical momentum
    if is_above_50ma is True:
        score_points += 1
        reasons.append("ETF price trading above 50-day MA (bullish momentum)")
    elif is_above_50ma is False:
        score_points -= 1
        reasons.append("ETF price trading below 50-day MA (bearish momentum)")
    else:
        reasons.append("50-day MA data unavailable")

    # 2. Macro rate direction
    rate = (rate_direction or "neutral").lower()
    if rate == "falling":
        score_points += 1
        reasons.append("Easing interest rates reduce borrowing costs")
    elif rate == "rising":
        score_points -= 1
        reasons.append("Rising rate environment compresses valuation multiples")
    else:
        reasons.append("Neutral interest rate backdrop")

    # 3. Inflation trend
    infl = (inflation_trend or "stable").lower()
    if infl == "falling":
        score_points += 1
        reasons.append("Decelerating inflation protects consumer purchasing power")
    elif infl == "rising":
        score_points -= 1
        reasons.append("Input cost inflation may pressure operating margins")
    else:
        reasons.append("Stable inflation environment")

    # Final rules classification
    if score_points >= 2:
        stance = "favorable"
    elif score_points <= -1:
        stance = "unfavorable"
    else:
        stance = "neutral"

    return {
        "stance": stance,
        "score_points": score_points,
        "rationale": "; ".join(reasons)
    }


# ============================================================
# Company Screener Customizable Weighted Scorecard
# ============================================================

def calculate_company_scorecard(
    company_data: Dict[str, Any],
    weights: Dict[str, float]
) -> Dict[str, Any]:
    """
    Calculates a transparent weighted composite score (0-100) for a company
    using user-configured weights:
    - ROE (higher = better)
    - Net Margin (higher = better)
    - P/E (reasonable valuation, 10-25 scored highest)
    - Debt-to-Equity (lower = safer)
    - YoY Growth (higher = better)
    """
    w_roe = float(weights.get("roe", 25))
    w_margin = float(weights.get("margin", 20))
    w_pe = float(weights.get("pe", 20))
    w_debt = float(weights.get("debt", 15))
    w_growth = float(weights.get("growth", 20))

    total_weight = w_roe + w_margin + w_pe + w_debt + w_growth
    if total_weight <= 0:
        total_weight = 100.0

    # Sub-score calculations (0 to 100)
    
    # 1. ROE Score: target 20%+ for 100, 0% = 20, negative = 0
    roe = company_data.get("roe")
    if roe is not None:
        roe_pct = roe * 100.0
        roe_score = max(0.0, min(100.0, (roe_pct / 25.0) * 100.0)) if roe_pct > 0 else 0.0
    else:
        roe_score = 50.0

    # 2. Net Margin Score: target 25%+ for 100
    margin = company_data.get("net_margin")
    if margin is not None:
        margin_pct = margin * 100.0
        margin_score = max(0.0, min(100.0, (margin_pct / 25.0) * 100.0)) if margin_pct > 0 else 0.0
    else:
        margin_score = 50.0

    # 3. P/E Score: 15-20 optimal. Higher P/E penalized; negative P/E = 0
    pe = company_data.get("pe_ratio")
    if pe is not None:
        if pe <= 0:
            pe_score = 10.0  # Unprofitable
        elif pe < 15:
            pe_score = 90.0  # Value territory
        elif pe <= 25:
            pe_score = 100.0  # Sweet spot
        elif pe <= 40:
            pe_score = 70.0
        elif pe <= 60:
            pe_score = 45.0
        else:
            pe_score = 25.0  # Rich valuation
    else:
        pe_score = 50.0

    # 4. Debt-to-Equity Score: < 50% = 100, > 200% = 20
    de = company_data.get("debt_to_equity")
    if de is not None:
        if de <= 50:
            debt_score = 100.0
        elif de <= 100:
            debt_score = 80.0
        elif de <= 150:
            debt_score = 60.0
        elif de <= 200:
            debt_score = 40.0
        else:
            debt_score = 20.0
    else:
        debt_score = 50.0

    # 5. Growth Score (YoY Revenue + EPS Growth average)
    rev_g = company_data.get("revenue_growth_yoy") or 0.0
    eps_g = company_data.get("eps_growth_yoy") or 0.0
    avg_growth_pct = ((rev_g + eps_g) / 2.0) * 100.0
    growth_score = max(0.0, min(100.0, 50.0 + (avg_growth_pct * 2.5)))

    # Composite weighted score
    composite_score = (
        (roe_score * w_roe) +
        (margin_score * w_margin) +
        (pe_score * w_pe) +
        (debt_score * w_debt) +
        (growth_score * w_growth)
    ) / total_weight

    return {
        "composite_score": round(composite_score, 1),
        "sub_scores": {
            "roe": round(roe_score, 1),
            "margin": round(margin_score, 1),
            "pe": round(pe_score, 1),
            "debt": round(debt_score, 1),
            "growth": round(growth_score, 1)
        }
    }


# ============================================================
# Benchmark vs Portfolio Performance Time Series
# ============================================================

def compute_benchmark_comparison(
    trades: List[Dict[str, Any]],
    benchmark_ticker: str = "^GSPC",
    period: str = "6mo"
) -> List[Dict[str, Any]]:
    """
    Computes a historical time series comparing Portfolio cumulative return %
    versus S&P 500 benchmark cumulative return %.
    """
    open_trades = [t for t in trades if t.get("status") == "open"]
    tickers = list(set([t["ticker"].strip().upper() for t in open_trades if t.get("ticker")] + [benchmark_ticker]))

    try:
        closes = fetch_historical_closes(tickers, period=period)
        if closes.empty or len(closes) < 5 or benchmark_ticker not in closes.columns:
            return []

        # Benchmark normalized cumulative return %
        bm_series = closes[benchmark_ticker]
        bm_base = bm_series.iloc[0]
        bm_cum_ret = ((bm_series - bm_base) / bm_base) * 100.0

        # Portfolio daily market value
        port_values = []
        for idx, row in closes.iterrows():
            date_str = idx.strftime("%Y-%m-%d")
            # Calculate open market value on this date
            mkt_val = 0.0
            for t in open_trades:
                sym = t["ticker"].strip().upper()
                qty = float(t.get("quantity", 0))
                price = row.get(sym)
                if price is not None and not np.isnan(price):
                    mkt_val += price * qty
                else:
                    mkt_val += float(t.get("entry_price", 0)) * qty

            # Closed trades realized P&L
            closed_pnl = sum(float(ct.get("realized_pnl", 0)) for ct in trades if ct.get("status") == "closed")
            total_open_cost = sum(float(ot.get("entry_price", 0)) * float(ot.get("quantity", 0)) for ot in open_trades)
            cash = STARTING_CAPITAL - total_open_cost + closed_pnl
            total_port_val = cash + mkt_val
            port_cum_ret = ((total_port_val - STARTING_CAPITAL) / STARTING_CAPITAL) * 100.0

            bm_ret_val = bm_cum_ret.loc[idx]

            port_values.append({
                "date": date_str,
                "portfolio_value": round(total_port_val, 2),
                "portfolio_return_pct": round(port_cum_ret, 2),
                "benchmark_return_pct": round(float(bm_ret_val), 2) if not np.isnan(bm_ret_val) else 0.0
            })

        return port_values
    except Exception:
        return []
