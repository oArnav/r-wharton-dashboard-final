"""
Main application server for Wharton Investment Simulator (WInS) Dashboard.
Phase 3 Final: Trades, AI Logs, Client IPS, Sectors, Screener, Benchmark, News,
Approved Stock List, and Report Outline Skeleton.
"""

import os
import io
import csv
import json
import datetime
import logging
from typing import Optional

from starlette.applications import Starlette
from starlette.responses import JSONResponse, Response, PlainTextResponse
from starlette.routing import Route, Mount
from starlette.middleware import Middleware
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

import database as db
import stock_fetcher as fetcher
import calculator as calc
import rss_fetcher as rss

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wins_api")

# Initialize database schema
db.init_db()


# ============================================================
# API Handlers: Stock Fetcher & History
# ============================================================

async def get_stock(request):
    ticker = request.path_params.get("ticker", "").strip().upper()
    force_refresh = request.query_params.get("refresh", "false").lower() == "true"
    
    if not ticker:
        return JSONResponse({"error": "Ticker symbol is required."}, status_code=400)
    
    try:
        data = fetcher.fetch_stock_data(ticker, force_refresh=force_refresh)
        return JSONResponse(data)
    except ValueError as ve:
        return JSONResponse({"error": str(ve)}, status_code=404)
    except Exception as e:
        logger.error(f"Error fetching stock {ticker}: {e}")
        return JSONResponse({"error": f"Failed to fetch data for ticker '{ticker}'."}, status_code=500)


async def get_stock_history(request):
    ticker = request.path_params.get("ticker", "").strip().upper()
    period = request.query_params.get("period", "6mo")
    
    if not ticker:
        return JSONResponse({"error": "Ticker symbol is required."}, status_code=400)
    
    try:
        history = fetcher.fetch_stock_history(ticker, period=period)
        return JSONResponse(history)
    except Exception as e:
        logger.error(f"Error fetching history for {ticker}: {e}")
        return JSONResponse({"error": "Failed to fetch price history."}, status_code=500)


# ============================================================
# API Handlers: Trades & Portfolio
# ============================================================

async def list_trades(request):
    try:
        trades = db.get_all_trades()
        return JSONResponse(trades)
    except Exception as e:
        logger.error(f"Error retrieving trades: {e}")
        return JSONResponse({"error": "Failed to retrieve trades."}, status_code=500)


async def create_trade(request):
    try:
        data = await request.json()
        ticker = data.get("ticker", "").strip().upper()
        if not ticker:
            return JSONResponse({"error": "Ticker symbol is required."}, status_code=400)
        
        entry_price = float(data.get("entry_price", 0))
        quantity = float(data.get("quantity", 0))
        if entry_price <= 0 or quantity <= 0:
            return JSONResponse({"error": "Entry price and quantity must be positive numbers."}, status_code=400)
        
        entry_date = data.get("entry_date", "").strip()
        if not entry_date:
            return JSONResponse({"error": "Entry date is required."}, status_code=400)
        
        if not data.get("company_name") or not data.get("sector"):
            try:
                stock_info = fetcher.fetch_stock_data(ticker)
                if not data.get("company_name"):
                    data["company_name"] = stock_info.get("company_name", ticker)
                if not data.get("sector"):
                    data["sector"] = stock_info.get("sector", "Other")
            except Exception:
                pass

        trade_id = db.add_trade(data)
        new_trade = db.get_trade_by_id(trade_id)
        return JSONResponse(new_trade, status_code=201)
    except Exception as e:
        logger.error(f"Error creating trade: {e}")
        return JSONResponse({"error": f"Failed to create trade: {str(e)}"}, status_code=400)


async def close_position(request):
    try:
        trade_id = int(request.path_params.get("trade_id"))
        data = await request.json()
        
        exit_price = float(data.get("exit_price", 0))
        if exit_price <= 0:
            return JSONResponse({"error": "Exit price must be greater than 0."}, status_code=400)
        
        exit_date = data.get("exit_date", "").strip()
        if not exit_date:
            return JSONResponse({"error": "Exit date is required."}, status_code=400)

        updated_trade = db.close_trade(trade_id, data)
        if not updated_trade:
            return JSONResponse({"error": f"Trade with id {trade_id} not found."}, status_code=404)
        
        return JSONResponse(updated_trade)
    except ValueError as ve:
        return JSONResponse({"error": str(ve)}, status_code=400)
    except Exception as e:
        logger.error(f"Error closing trade: {e}")
        return JSONResponse({"error": "Failed to close trade."}, status_code=500)


async def update_trade_ips_handler(request):
    try:
        trade_id = int(request.path_params.get("trade_id"))
        data = await request.json()
        ips_alignment = data.get("ips_alignment", "").strip()
        ips_fit_status = data.get("ips_fit_status", "fit")

        updated = db.update_trade_ips(trade_id, ips_alignment, ips_fit_status)
        if not updated:
            return JSONResponse({"error": "Trade not found."}, status_code=404)
        return JSONResponse(updated)
    except Exception as e:
        logger.error(f"Error updating trade IPS: {e}")
        return JSONResponse({"error": "Failed to update trade IPS alignment."}, status_code=500)


async def delete_trade_handler(request):
    try:
        trade_id = int(request.path_params.get("trade_id"))
        deleted = db.delete_trade(trade_id)
        if not deleted:
            return JSONResponse({"error": "Trade not found."}, status_code=404)
        return JSONResponse({"success": True, "deleted_id": trade_id})
    except Exception as e:
        logger.error(f"Error deleting trade: {e}")
        return JSONResponse({"error": "Failed to delete trade."}, status_code=500)


async def edit_trade_handler(request):
    try:
        trade_id = int(request.path_params.get("trade_id"))
        data = await request.json()
        edited_by = data.get("edited_by", "Arnav")
        updated = db.update_trade_with_audit(trade_id, data, edited_by)
        if not updated:
            return JSONResponse({"error": "Trade not found."}, status_code=404)
        return JSONResponse(updated)
    except Exception as e:
        logger.error(f"Error editing trade {trade_id}: {e}")
        return JSONResponse({"error": f"Failed to edit trade: {str(e)}"}, status_code=400)


async def get_trade_edits_handler(request):
    try:
        trade_id_str = request.path_params.get("trade_id")
        trade_id = int(trade_id_str) if trade_id_str else None
        edits = db.get_trade_edits(trade_id)
        return JSONResponse(edits)
    except Exception as e:
        logger.error(f"Error getting trade edits: {e}")
        return JSONResponse({"error": "Failed to get trade edits."}, status_code=500)


async def get_portfolio_summary(request):
    try:
        rf_param = request.query_params.get("risk_free_rate")
        custom_rf = float(rf_param) / 100.0 if rf_param else None
        
        trades = db.get_all_trades()
        summary = calc.compute_portfolio_summary(trades, custom_risk_free_rate=custom_rf)
        
        # Attach approved stock list check
        approved_set = db.get_approved_tickers_set()
        open_trades = [t for t in summary.get("enriched_open_trades", [])]
        approved_count = sum(1 for t in open_trades if t["ticker"] in approved_set)
        summary["approved_list_stats"] = {
            "total_open": len(open_trades),
            "approved_count": approved_count,
            "unapproved_count": len(open_trades) - approved_count,
            "compliance_pct": round((approved_count / len(open_trades)) * 100.0, 1) if open_trades else 100.0
        }
        
        return JSONResponse(summary)
    except Exception as e:
        logger.error(f"Error computing portfolio summary: {e}")
        return JSONResponse({"error": f"Failed to compute summary: {str(e)}"}, status_code=500)


# ============================================================
# API Handlers: Client IPS
# ============================================================

async def get_ips_handler(request):
    try:
        ips_data = db.get_client_ips()
        return JSONResponse(ips_data)
    except Exception as e:
        logger.error(f"Error fetching IPS: {e}")
        return JSONResponse({"error": "Failed to fetch Client IPS."}, status_code=500)


async def update_ips_handler(request):
    try:
        data = await request.json()
        updated = db.update_client_ips(data)
        return JSONResponse(updated)
    except Exception as e:
        logger.error(f"Error updating IPS: {e}")
        return JSONResponse({"error": "Failed to update Client IPS."}, status_code=400)


# ============================================================
# API Handlers: Tracked Sectors
# ============================================================

async def list_sectors_handler(request):
    try:
        sectors = db.get_tracked_sectors()
        enriched = []
        for s in sectors:
            s_dict = dict(s)
            etf_ticker = s_dict.get("etf_ticker", "").strip().upper()
            etf_data = fetcher.fetch_sector_etf_data(etf_ticker) if etf_ticker else {}
            stance_eval = calc.evaluate_sector_stance(
                etf_data,
                s_dict.get("inflation_trend", "stable"),
                s_dict.get("rate_direction", "neutral"),
                s_dict.get("macro_notes", "")
            )
            s_dict["etf_metrics"] = etf_data
            s_dict["rules_eval"] = stance_eval
            enriched.append(s_dict)
        return JSONResponse(enriched)
    except Exception as e:
        logger.error(f"Error listing sectors: {e}")
        return JSONResponse({"error": "Failed to fetch sector metrics."}, status_code=500)


async def add_sector_handler(request):
    try:
        data = await request.json()
        sec_id = db.add_tracked_sector(data)
        return JSONResponse({"id": sec_id, "status": "created"}, status_code=201)
    except Exception as e:
        logger.error(f"Error adding sector: {e}")
        return JSONResponse({"error": "Failed to add tracked sector."}, status_code=400)


async def update_sector_handler(request):
    try:
        sector_id = int(request.path_params.get("sector_id"))
        data = await request.json()
        updated = db.update_tracked_sector(sector_id, data)
        if not updated:
            return JSONResponse({"error": "Sector not found."}, status_code=404)
        return JSONResponse({"success": True, "id": sector_id})
    except Exception as e:
        logger.error(f"Error updating sector: {e}")
        return JSONResponse({"error": "Failed to update sector."}, status_code=400)


async def delete_sector_handler(request):
    try:
        sector_id = int(request.path_params.get("sector_id"))
        deleted = db.delete_tracked_sector(sector_id)
        if not deleted:
            return JSONResponse({"error": "Sector not found."}, status_code=404)
        return JSONResponse({"success": True, "id": sector_id})
    except Exception as e:
        logger.error(f"Error deleting sector: {e}")
        return JSONResponse({"error": "Failed to delete sector."}, status_code=500)


# ============================================================
# API Handlers: Company Screener & Scorecard
# ============================================================

async def get_screener_scorecard(request):
    try:
        body = await request.json()
        tickers = body.get("tickers", [])
        weights = body.get("weights", {"roe": 25, "margin": 20, "pe": 20, "debt": 15, "growth": 20})

        if not tickers:
            trades = db.get_all_trades()
            tickers = list(set(t["ticker"].strip().upper() for t in trades if t.get("status") == "open"))
            if not tickers:
                tickers = ["AAPL", "MSFT", "NVDA", "AMZN", "GOOGL"]

        qual_notes = db.get_all_screener_notes()
        approved_set = db.get_approved_tickers_set()
        results = []

        for sym in tickers:
            s_clean = sym.strip().upper()
            if not s_clean:
                continue
            try:
                stock_data = fetcher.fetch_stock_data(s_clean)
                scorecard = calc.calculate_company_scorecard(stock_data, weights)
                
                q_note = qual_notes.get(s_clean, {
                    "moat_type": "none",
                    "esg_note": "",
                    "business_model": ""
                })

                stock_entry = dict(stock_data)
                stock_entry["scorecard"] = scorecard
                stock_entry["composite_score"] = scorecard["composite_score"]
                stock_entry["moat_type"] = q_note.get("moat_type", "none")
                stock_entry["esg_note"] = q_note.get("esg_note", "")
                stock_entry["business_model"] = q_note.get("business_model", "")
                stock_entry["is_approved"] = s_clean in approved_set
                results.append(stock_entry)
            except Exception as e:
                logger.warning(f"Could not fetch screener data for {s_clean}: {e}")

        results.sort(key=lambda x: x.get("composite_score", 0), reverse=True)
        return JSONResponse(results)
    except Exception as e:
        logger.error(f"Error computing screener scorecard: {e}")
        return JSONResponse({"error": "Failed to compute company scorecard."}, status_code=500)


async def save_screener_notes_handler(request):
    try:
        ticker = request.path_params.get("ticker", "").strip().upper()
        data = await request.json()
        saved = db.save_screener_note(ticker, data)
        return JSONResponse(saved)
    except Exception as e:
        logger.error(f"Error saving screener notes for {ticker}: {e}")
        return JSONResponse({"error": "Failed to save qualitative notes."}, status_code=500)


# ============================================================
# API Handlers: Approved Stock List (Phase 3)
# ============================================================

async def list_approved_stocks_handler(request):
    """GET /api/approved-stocks"""
    try:
        stocks = db.get_all_approved_stocks()
        return JSONResponse(stocks)
    except Exception as e:
        logger.error(f"Error fetching approved stocks: {e}")
        return JSONResponse({"error": "Failed to fetch approved stocks."}, status_code=500)


async def add_approved_stock_handler(request):
    """POST /api/approved-stocks"""
    try:
        data = await request.json()
        if not data.get("ticker"):
            return JSONResponse({"error": "Ticker is required."}, status_code=400)
        saved = db.add_approved_stock(data)
        return JSONResponse(saved, status_code=201)
    except Exception as e:
        logger.error(f"Error adding approved stock: {e}")
        return JSONResponse({"error": "Failed to add approved stock."}, status_code=400)


async def bulk_add_approved_stocks_handler(request):
    """POST /api/approved-stocks/bulk - Body: { "tickers": ["AAPL", "MSFT", ...], "notes": "..." }"""
    try:
        data = await request.json()
        tickers = data.get("tickers", [])
        notes = data.get("notes", "Batch Added via Guidebook")
        if not tickers:
            return JSONResponse({"error": "No tickers provided."}, status_code=400)
        
        count = db.bulk_add_approved_stocks(tickers, default_notes=notes)
        return JSONResponse({"added_count": count, "success": True})
    except Exception as e:
        logger.error(f"Error bulk adding approved stocks: {e}")
        return JSONResponse({"error": "Failed to bulk add stocks."}, status_code=400)


async def delete_approved_stock_handler(request):
    """DELETE /api/approved-stocks/{ticker}"""
    try:
        ticker = request.path_params.get("ticker", "").strip().upper()
        deleted = db.delete_approved_stock(ticker)
        if not deleted:
            return JSONResponse({"error": "Stock not found."}, status_code=404)
        return JSONResponse({"success": True, "ticker": ticker})
    except Exception as e:
        logger.error(f"Error deleting approved stock {ticker}: {e}")
        return JSONResponse({"error": "Failed to delete stock."}, status_code=500)


# ============================================================
# API Handlers: Report Outline Skeleton (Phase 3)
# ============================================================

async def list_report_sections_handler(request):
    """GET /api/report-outline"""
    try:
        sections = db.get_all_report_sections()
        return JSONResponse(sections)
    except Exception as e:
        logger.error(f"Error fetching report sections: {e}")
        return JSONResponse({"error": "Failed to fetch report sections."}, status_code=500)


async def update_report_section_handler(request):
    """PUT /api/report-outline/{section_id} - Body: { "content": "..." }"""
    try:
        sec_id = request.path_params.get("section_id")
        data = await request.json()
        content = data.get("content", "")
        updated = db.update_report_section(sec_id, content)
        if not updated:
            return JSONResponse({"error": "Section not found."}, status_code=404)
        return JSONResponse(updated)
    except Exception as e:
        logger.error(f"Error updating report section {sec_id}: {e}")
        return JSONResponse({"error": "Failed to update report section."}, status_code=400)


async def export_report_markdown_handler(request):
    """GET /api/export/report-markdown"""
    try:
        md_content = db.get_report_full_markdown()
        return Response(
            content=md_content,
            media_type="text/markdown",
            headers={"Content-Disposition": "attachment; filename=wins_final_report_outline.md"}
        )
    except Exception as e:
        logger.error(f"Error exporting report markdown: {e}")
        return JSONResponse({"error": "Failed to export report markdown."}, status_code=500)


# ============================================================
# API Handlers: Benchmark & Risk
# ============================================================

async def get_benchmark_comparison_handler(request):
    try:
        benchmark = request.query_params.get("benchmark", "^GSPC")
        period = request.query_params.get("period", "6mo")
        trades = db.get_all_trades()
        series = calc.compute_benchmark_comparison(trades, benchmark_ticker=benchmark, period=period)
        return JSONResponse(series)
    except Exception as e:
        logger.error(f"Error computing benchmark comparison: {e}")
        return JSONResponse([], status_code=200)


# ============================================================
# API Handlers: News Scanner
# ============================================================

async def get_news_handler(request):
    try:
        force = request.query_params.get("refresh", "false").lower() == "true"
        trades = db.get_all_trades()
        open_trades = [t for t in trades if t.get("status") == "open"]
        sectors = db.get_tracked_sectors()

        keywords = []
        for t in open_trades:
            keywords.append(t["ticker"])
            if t.get("company_name"):
                keywords.append(t["company_name"])
        for s in sectors:
            keywords.append(s["name"])

        articles = rss.get_news_headlines(keywords=keywords, force_refresh=force)
        return JSONResponse(articles)
    except Exception as e:
        logger.error(f"Error fetching news: {e}")
        return JSONResponse([], status_code=200)


async def set_news_tag_handler(request):
    try:
        data = await request.json()
        article_url = data.get("article_url", "").strip()
        if not article_url:
            return JSONResponse({"error": "article_url is required."}, status_code=400)
        
        saved = db.set_news_tag(article_url, data)
        return JSONResponse(saved)
    except Exception as e:
        logger.error(f"Error setting news tag: {e}")
        return JSONResponse({"error": "Failed to set news tag."}, status_code=500)


# ============================================================
# API Handlers: AI Usage Log & CSV Exports
# ============================================================

VALID_AI_MEMBERS = {"Arnav", "Jaivish", "Harsimar", "Nairit"}

async def list_ai_logs(request):
    try:
        logs = db.get_all_ai_logs()
        return JSONResponse(logs)
    except Exception as e:
        logger.error(f"Error fetching AI logs: {e}")
        return JSONResponse({"error": "Failed to fetch AI usage logs."}, status_code=500)


async def create_ai_log(request):
    try:
        data = await request.json()
        date = data.get("date", "").strip()
        team_member = data.get("team_member", "").strip()
        what_was_asked = data.get("what_was_asked", "").strip()
        tool_used = data.get("tool_used", "").strip()
        category = data.get("category", "").strip()

        if not (date and team_member and what_was_asked and tool_used and category):
            return JSONResponse({"error": "All fields are required."}, status_code=400)

        log_id = db.add_ai_log({
            "date": date,
            "team_member": team_member,
            "what_was_asked": what_was_asked,
            "tool_used": tool_used,
            "category": category
        })
        return JSONResponse({"id": log_id, "status": "created"}, status_code=201)
    except Exception as e:
        logger.error(f"Error adding AI log: {e}")
        return JSONResponse({"error": "Failed to add AI usage log."}, status_code=400)


async def export_ai_logs_csv(request):
    """GET /api/export/ai-logs-csv"""
    try:
        logs = db.get_all_ai_logs()
        output = io.StringIO()
        fieldnames = ["id", "date", "team_member", "tool_used", "category", "what_was_asked", "created_at"]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for l in logs:
            row = {k: l.get(k, "") for k in fieldnames}
            writer.writerow(row)

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=wins_ai_usage_log.csv"}
        )
    except Exception as e:
        logger.error(f"Error exporting AI logs CSV: {e}")
        return JSONResponse({"error": "Failed to export AI logs CSV."}, status_code=500)


async def export_csv(request):
    try:
        trades = db.get_all_trades()
        output = io.StringIO()
        fieldnames = [
            "id", "ticker", "company_name", "sector", "status",
            "entry_date", "entry_price", "quantity", "cost_basis",
            "position_size_pct", "exit_date", "exit_price",
            "realized_pnl", "realized_pnl_pct", "rationale",
            "exit_condition", "ips_alignment", "ips_fit_status",
            "outcome_note", "created_at"
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for t in trades:
            t_copy = dict(t)
            cost_basis = round(float(t_copy.get("entry_price", 0)) * float(t_copy.get("quantity", 0)), 2)
            t_copy["cost_basis"] = cost_basis
            row = {k: t_copy.get(k, "") for k in fieldnames}
            writer.writerow(row)

        csv_content = output.getvalue()
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=wins_trade_log.csv"}
        )
    except Exception as e:
        logger.error(f"Error exporting CSV: {e}")
        return JSONResponse({"error": "Failed to export CSV."}, status_code=500)


async def health_check(request):
    return JSONResponse({"status": "ok", "app": "Wharton WInS Investment Dashboard", "version": "4.0.0-final"})


# ============================================================
# Phase 4 API Handlers: Statements, Watchlist, Feed, Compare
# ============================================================

async def get_financial_statements_handler(request):
    ticker = request.path_params.get("ticker", "").strip().upper()
    period_type = request.query_params.get("period", "annual").lower()
    force_refresh = request.query_params.get("refresh", "false").lower() == "true"

    if not ticker:
        return JSONResponse({"error": "Ticker symbol is required."}, status_code=400)

    try:
        data = fetcher.fetch_financial_statements(ticker, period_type=period_type, force_refresh=force_refresh)
        return JSONResponse(data)
    except ValueError as ve:
        return JSONResponse({"error": str(ve)}, status_code=404)
    except Exception as e:
        logger.error(f"Error fetching statements for {ticker}: {e}")
        return JSONResponse({"error": f"Failed to fetch statements for '{ticker}': {e}"}, status_code=500)


async def list_watchlist_handler(request):
    try:
        items = db.get_all_watchlist()
        augmented = []
        for item in items:
            sym = item["ticker"]
            item_dict = dict(item)
            try:
                live = fetcher.fetch_stock_data(sym)
                item_dict.update({
                    "company_name": live.get("company_name", sym),
                    "sector": live.get("sector", "Other"),
                    "current_price": live.get("current_price"),
                    "pe_ratio": live.get("pe_ratio"),
                    "fifty_two_week_high": live.get("fifty_two_week_high"),
                    "fifty_two_week_low": live.get("fifty_two_week_low"),
                    "market_cap": live.get("market_cap"),
                    "beta": live.get("beta")
                })
            except Exception:
                item_dict.update({
                    "company_name": sym,
                    "sector": "Other",
                    "current_price": None
                })
            augmented.append(item_dict)
        return JSONResponse(augmented)
    except Exception as e:
        logger.error(f"Error retrieving watchlist: {e}")
        return JSONResponse({"error": "Failed to retrieve watchlist."}, status_code=500)


async def add_watchlist_handler(request):
    try:
        data = await request.json()
        ticker = data.get("ticker", "").strip().upper()
        if not ticker:
            return JSONResponse({"error": "Ticker symbol is required."}, status_code=400)
        added = db.add_watchlist_item(data)
        return JSONResponse(added, status_code=201)
    except Exception as e:
        logger.error(f"Error adding to watchlist: {e}")
        return JSONResponse({"error": "Failed to add to watchlist."}, status_code=500)


async def delete_watchlist_handler(request):
    ticker = request.path_params.get("ticker", "").strip().upper()
    if not ticker:
        return JSONResponse({"error": "Ticker symbol is required."}, status_code=400)
    try:
        deleted = db.delete_watchlist_item(ticker)
        return JSONResponse({"ticker": ticker, "deleted": deleted})
    except Exception as e:
        logger.error(f"Error deleting watchlist item {ticker}: {e}")
        return JSONResponse({"error": "Failed to delete watchlist item."}, status_code=500)


async def get_activity_feed_handler(request):
    try:
        limit = int(request.query_params.get("limit", 15))
        feed = db.get_recent_activity(limit=limit)
        return JSONResponse(feed)
    except Exception as e:
        logger.error(f"Error fetching activity feed: {e}")
        return JSONResponse({"error": "Failed to fetch activity feed."}, status_code=500)


async def compare_stocks_handler(request):
    tickers_param = request.query_params.get("tickers", "").strip()
    if not tickers_param:
        return JSONResponse({"error": "Please provide comma-separated tickers (e.g. ?tickers=AAPL,MSFT)."}, status_code=400)

    tickers = [t.strip().upper() for t in tickers_param.split(",") if t.strip()]
    if len(tickers) < 2 or len(tickers) > 4:
        return JSONResponse({"error": "Please provide 2 to 4 tickers to compare."}, status_code=400)

    results = []
    screener_notes = db.get_all_screener_notes()
    approved_set = db.get_approved_tickers_set()

    for sym in tickers:
        try:
            stock_data = fetcher.fetch_stock_data(sym)
            notes = screener_notes.get(sym, {})
            results.append({
                "ticker": sym,
                "company_name": stock_data.get("company_name", sym),
                "sector": stock_data.get("sector", "Other"),
                "current_price": stock_data.get("current_price"),
                "pe_ratio": stock_data.get("pe_ratio"),
                "forward_pe": stock_data.get("forward_pe"),
                "pb_ratio": stock_data.get("pb_ratio"),
                "ev_ebitda": stock_data.get("ev_ebitda"),
                "gross_margin": stock_data.get("gross_margin"),
                "operating_margin": stock_data.get("operating_margin"),
                "net_margin": stock_data.get("net_margin"),
                "roe": stock_data.get("roe"),
                "roa": stock_data.get("roa"),
                "debt_to_equity": stock_data.get("debt_to_equity"),
                "current_ratio": stock_data.get("current_ratio"),
                "beta": stock_data.get("beta"),
                "market_cap": stock_data.get("market_cap"),
                "fifty_two_week_high": stock_data.get("fifty_two_week_high"),
                "fifty_two_week_low": stock_data.get("fifty_two_week_low"),
                "moat_type": notes.get("moat_type", "none"),
                "business_model": notes.get("business_model", ""),
                "is_approved": sym in approved_set
            })
        except Exception as e:
            results.append({
                "ticker": sym,
                "company_name": sym,
                "error": str(e)
            })

    return JSONResponse({"tickers": tickers, "comparison": results})


# ============================================================
# Phase 5: Trade Edits, Reconciliation, Deadlines & Backup Handlers
# ============================================================

async def edit_trade_handler(request):
    try:
        trade_id = int(request.path_params.get("trade_id"))
        data = await request.json()
        edited_by = data.get("edited_by") or "Arnav"
        updated = db.update_trade_with_audit(trade_id, data, edited_by)
        if not updated:
            return JSONResponse({"error": f"Trade {trade_id} not found."}, status_code=404)
        return JSONResponse(updated)
    except Exception as e:
        logger.error(f"Error editing trade {trade_id}: {e}")
        return JSONResponse({"error": f"Failed to edit trade: {str(e)}"}, status_code=400)


async def get_trade_edits_handler(request):
    try:
        trade_id_str = request.path_params.get("trade_id")
        trade_id = int(trade_id_str) if trade_id_str else None
        edits = db.get_trade_edits(trade_id)
        return JSONResponse(edits)
    except Exception as e:
        logger.error(f"Error fetching trade edits: {e}")
        return JSONResponse({"error": "Failed to fetch trade edits."}, status_code=500)


async def add_reconciliation_handler(request):
    try:
        data = await request.json()
        checked_by = data.get("checked_by") or "Arnav"
        actual_cash = float(data.get("actual_cash", 0))
        actual_portfolio_value = float(data.get("actual_portfolio_value", 0))
        calculated_cash = float(data.get("calculated_cash", 0))
        calculated_portfolio_value = float(data.get("calculated_portfolio_value", 0))
        notes = data.get("notes", "")

        rec = db.add_reconciliation_check(
            checked_by=checked_by,
            actual_cash=actual_cash,
            actual_portfolio_value=actual_portfolio_value,
            calculated_cash=calculated_cash,
            calculated_portfolio_value=calculated_portfolio_value,
            notes=notes
        )
        return JSONResponse(rec, status_code=201)
    except Exception as e:
        logger.error(f"Error saving reconciliation: {e}")
        return JSONResponse({"error": f"Failed to record reconciliation: {str(e)}"}, status_code=400)


async def get_reconciliation_handler(request):
    try:
        limit = int(request.query_params.get("limit", 15))
        history = db.get_reconciliation_history(limit)
        return JSONResponse(history)
    except Exception as e:
        logger.error(f"Error fetching reconciliations: {e}")
        return JSONResponse({"error": "Failed to fetch reconciliation history."}, status_code=500)


async def get_deadlines_handler(request):
    try:
        deadlines = db.get_team_deadlines()
        return JSONResponse(deadlines)
    except Exception as e:
        logger.error(f"Error fetching deadlines: {e}")
        return JSONResponse({"error": "Failed to fetch deadlines."}, status_code=500)


async def add_deadline_handler(request):
    try:
        data = await request.json()
        title = data.get("title", "").strip()
        if not title:
            return JSONResponse({"error": "Title is required."}, status_code=400)
        deadline_date = data.get("deadline_date", "").strip()
        if not deadline_date:
            return JSONResponse({"error": "Deadline date is required."}, status_code=400)
        desc = data.get("description", "")
        is_hard = bool(data.get("is_hard_deadline", False))

        item = db.add_team_deadline(title, deadline_date, desc, is_hard)
        return JSONResponse(item, status_code=201)
    except Exception as e:
        logger.error(f"Error adding deadline: {e}")
        return JSONResponse({"error": f"Failed to add deadline: {str(e)}"}, status_code=400)


async def delete_deadline_handler(request):
    try:
        d_id = int(request.path_params.get("id"))
        success = db.delete_team_deadline(d_id)
        if not success:
            return JSONResponse({"error": "Deadline not found."}, status_code=404)
        return JSONResponse({"success": True, "deleted_id": d_id})
    except Exception as e:
        logger.error(f"Error deleting deadline: {e}")
        return JSONResponse({"error": "Failed to delete deadline."}, status_code=500)


async def backup_export_handler(request):
    try:
        backup = db.export_full_database_backup()
        content = json.dumps(backup, indent=2)
        filename = f"wins_full_backup_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
        return Response(
            content,
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except Exception as e:
        logger.error(f"Error exporting full backup: {e}")
        return JSONResponse({"error": f"Failed to generate backup: {str(e)}"}, status_code=500)


# ============================================================
# Routes Setup
# ============================================================

routes = [
    Route("/api", health_check, methods=["GET"]),
    Route("/api/", health_check, methods=["GET"]),
    Route("/api/health", health_check, methods=["GET"]),
    
    # Stock, History & Financial Statements
    Route("/api/stock/{ticker}", get_stock, methods=["GET"]),
    Route("/api/stock/{ticker}/history", get_stock_history, methods=["GET"]),
    Route("/api/stock/{ticker}/statements", get_financial_statements_handler, methods=["GET"]),
    Route("/api/stocks/{ticker}/financial-statements", get_financial_statements_handler, methods=["GET"]),

    # Watchlist (Phase 4)
    Route("/api/watchlist", list_watchlist_handler, methods=["GET"]),
    Route("/api/watchlist", add_watchlist_handler, methods=["POST"]),
    Route("/api/watchlist/{ticker}", delete_watchlist_handler, methods=["DELETE"]),

    # Compare View (Phase 4)
    Route("/api/stocks/compare", compare_stocks_handler, methods=["GET"]),

    # Activity Feed (Phase 4)
    Route("/api/activity-feed", get_activity_feed_handler, methods=["GET"]),

    # Trades & Portfolio
    Route("/api/trades", list_trades, methods=["GET"]),
    Route("/api/trades", create_trade, methods=["POST"]),
    Route("/api/trades/{trade_id:int}/close", close_position, methods=["PUT"]),
    Route("/api/trades/{trade_id:int}/ips", update_trade_ips_handler, methods=["PUT"]),
    Route("/api/trades/{trade_id:int}/edit", edit_trade_handler, methods=["POST", "PUT"]),
    Route("/api/trades/{trade_id:int}/edits", get_trade_edits_handler, methods=["GET"]),
    Route("/api/trades/edits", get_trade_edits_handler, methods=["GET"]),
    Route("/api/trades/{trade_id:int}", delete_trade_handler, methods=["DELETE"]),
    Route("/api/portfolio/summary", get_portfolio_summary, methods=["GET"]),

    # Reconciliation Checks (Phase 5)
    Route("/api/reconciliation", get_reconciliation_handler, methods=["GET"]),
    Route("/api/reconciliation", add_reconciliation_handler, methods=["POST"]),

    # Team Deadlines (Phase 5)
    Route("/api/deadlines", get_deadlines_handler, methods=["GET"]),
    Route("/api/deadlines", add_deadline_handler, methods=["POST"]),
    Route("/api/deadlines/{id:int}", delete_deadline_handler, methods=["DELETE"]),

    # Full Database Backup (Phase 5)
    Route("/api/backup/export", backup_export_handler, methods=["GET"]),

    # Client IPS
    Route("/api/ips", get_ips_handler, methods=["GET"]),
    Route("/api/ips", update_ips_handler, methods=["PUT"]),

    # Tracked Sectors
    Route("/api/sectors", list_sectors_handler, methods=["GET"]),
    Route("/api/sectors", add_sector_handler, methods=["POST"]),
    Route("/api/sectors/{sector_id:int}", update_sector_handler, methods=["PUT"]),
    Route("/api/sectors/{sector_id:int}", delete_sector_handler, methods=["DELETE"]),

    # Company Screener & Scorecard
    Route("/api/screener/scorecard", get_screener_scorecard, methods=["POST"]),
    Route("/api/screener/{ticker}/notes", save_screener_notes_handler, methods=["PUT"]),

    # Approved Stock List (Phase 3)
    Route("/api/approved-stocks", list_approved_stocks_handler, methods=["GET"]),
    Route("/api/approved-stocks", add_approved_stock_handler, methods=["POST"]),
    Route("/api/approved-stocks/bulk", bulk_add_approved_stocks_handler, methods=["POST"]),
    Route("/api/approved-stocks/{ticker}", delete_approved_stock_handler, methods=["DELETE"]),

    # Report Outline Skeleton (Phase 3)
    Route("/api/report-outline", list_report_sections_handler, methods=["GET"]),
    Route("/api/report-outline/{section_id}", update_report_section_handler, methods=["PUT"]),
    Route("/api/export/report-markdown", export_report_markdown_handler, methods=["GET"]),

    # Benchmark Comparison
    Route("/api/benchmark", get_benchmark_comparison_handler, methods=["GET"]),

    # News Scanner
    Route("/api/news", get_news_handler, methods=["GET"]),
    Route("/api/news/tag", set_news_tag_handler, methods=["POST"]),

    # AI Logs & CSV Exports
    Route("/api/ai-logs", list_ai_logs, methods=["GET"]),
    Route("/api/ai-logs", create_ai_log, methods=["POST"]),
    Route("/api/export/ai-logs-csv", export_ai_logs_csv, methods=["GET"]),
    Route("/api/export/csv", export_csv, methods=["GET"]),
]

dist_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "dist")
if os.path.exists(dist_dir):
    routes.append(Mount("/", app=StaticFiles(directory=dist_dir, html=True), name="static"))

class VercelPathNormalizationMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            headers = dict(scope.get("headers", []))
            matched_path = headers.get(b"x-matched-path", b"").decode("utf-8")
            if matched_path and matched_path.startswith("/api"):
                scope["path"] = matched_path
            elif b"x-forwarded-uri" in headers:
                fwd = headers.get(b"x-forwarded-uri", b"").decode("utf-8").split("?")[0]
                if fwd.startswith("/api"):
                    scope["path"] = fwd
        await self.app(scope, receive, send)


middleware = [
    Middleware(VercelPathNormalizationMiddleware),
    Middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )
]

app = Starlette(debug=True, routes=routes, middleware=middleware)

if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("PORT", 8000))
    print(f"[STARTING] WInS Investment Dashboard API (Phase 5 Production) on http://localhost:{port}")
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
