"""
Automated Verification Test Suite for WInS Phase 1 & Phase 2 backend.
"""

import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Use an isolated test database so tests never pollute production data
test_db_file = os.path.join(tempfile.gettempdir(), f"wins_test_{os.getpid()}.db")
os.environ["WINS_DB_PATH"] = test_db_file

import database as db
import calculator as calc
import stock_fetcher as fetcher
import rss_fetcher as rss


def run_tests():
    print("1. Initializing DB & Migrations...")
    db.init_db()

    print("2. Testing Client IPS...")
    ips = db.get_client_ips()
    print(f"Current IPS Objective: {ips['objective']}, Benchmark: {ips['benchmark']}")
    assert ips["objective"] in ["growth", "income", "capital preservation", "mixed"]

    updated_ips = db.update_client_ips({
        "objective": "growth",
        "risk_tolerance": "moderate",
        "time_horizon": "10 Weeks",
        "constraints": "No leverage, ESG screened, max 20% single position weight",
        "benchmark": "S&P 500 (^GSPC)"
    })
    assert "ESG screened" in updated_ips["constraints"]

    print("3. Testing Tracked Sectors & Rules-based Stance...")
    sectors = db.get_tracked_sectors()
    print(f"Total Tracked Sectors in DB: {len(sectors)}")
    assert len(sectors) >= 10

    # Test ETF data fetch for XLK
    xlk_metrics = fetcher.fetch_sector_etf_data("XLK")
    print(f"XLK ETF Price: ${xlk_metrics.get('current_price')}, Above 50MA: {xlk_metrics.get('is_above_50ma')}")
    
    # Test rules-based stance evaluation
    stance = calc.evaluate_sector_stance(xlk_metrics, "falling", "falling", "AI tailwinds")
    print(f"XLK Stance: {stance['stance'].upper()} — {stance['rationale']}")
    assert stance["stance"] in ["favorable", "neutral", "unfavorable"]

    print("4. Testing Company Screener Scorecard...")
    apple_data = fetcher.fetch_stock_data("AAPL")
    weights = {"roe": 25, "margin": 20, "pe": 20, "debt": 15, "growth": 20}
    scorecard = calc.calculate_company_scorecard(apple_data, weights)
    print(f"AAPL Composite Score: {scorecard['composite_score']}/100, Sub-scores: {scorecard['sub_scores']}")
    assert 0 <= scorecard["composite_score"] <= 100

    # Qualitative notes save
    db.save_screener_note("AAPL", {
        "moat_type": "brand",
        "esg_note": "Carbon neutral corporate operations, high renewable usage",
        "business_model": "Integrated hardware, software ecosystem and recurring high-margin services"
    })
    notes = db.get_all_screener_notes()
    assert notes["AAPL"]["moat_type"] == "brand"

    print("5. Testing Stock Price History...")
    hist = fetcher.fetch_stock_history("AAPL", period="3mo")
    print(f"AAPL History Data Points: {len(hist)}")
    assert len(hist) > 10

    print("6. Testing Trade with IPS Alignment...")
    trade_id = db.add_trade({
        "ticker": "AAPL",
        "company_name": "Apple Inc.",
        "sector": "Technology",
        "entry_date": "2026-09-01",
        "entry_price": 220.0,
        "quantity": 50,
        "rationale": "High ROE and free cash flow generation",
        "exit_condition": "Trailing stop at 8%",
        "ips_alignment": "Fits client growth mandate and ESG clean balance sheet requirements",
        "ips_fit_status": "fit"
    })
    trade = db.get_trade_by_id(trade_id)
    assert trade["ips_alignment"] != ""
    assert trade["ips_fit_status"] == "fit"

    print("7. Testing Portfolio Summary & IPS Traceability...")
    summary = calc.compute_portfolio_summary(db.get_all_trades())
    print(f"IPS Compliance %: {summary['ips_traceability']['compliance_pct']}%")
    print(f"Documented Count: {summary['ips_traceability']['documented_count']}")

    print("8. Testing RSS News Fetcher...")
    news = rss.get_news_headlines(keywords=["AAPL", "Technology"])
    print(f"Fetched {len(news)} relevant headlines.")

    print("\n--- PHASE 3 TESTS ---")
    print("9. Testing Approved Stock List & Bulk Add...")
    initial_approved = db.get_all_approved_stocks()
    approved_set = db.get_approved_tickers_set()
    print(f"Initial approved stocks count: {len(initial_approved)}")
    assert len(initial_approved) > 0, "Seed approved stocks should be present"
    assert "AAPL" in approved_set, "AAPL should be approved"

    # Add single approved stock
    db.add_approved_stock({
        "ticker": "TESTTICKER",
        "company_name": "Test Corp",
        "sector": "Technology",
        "notes": "Special Committee Approval"
    })
    assert "TESTTICKER" in db.get_approved_tickers_set(), "TESTTICKER should be approved"

    # Bulk add approved stocks
    batch = ["DIS", "NKE", "COST", "CRM", "INTC"]
    added_count = db.bulk_add_approved_stocks(batch, "Wharton Guidebook Batch Add")
    print(f"Bulk add added count: {added_count}")
    updated_set = db.get_approved_tickers_set()
    for sym in batch:
        assert sym in updated_set, f"{sym} should now be in approved list"

    # Cleanup test ticker
    deleted = db.delete_approved_stock("TESTTICKER")
    assert deleted is True
    assert "TESTTICKER" not in db.get_approved_tickers_set()

    print("10. Testing Report Outline Skeleton (8 Standard Sections)...")
    sections = db.get_all_report_sections()
    print(f"Report sections count: {len(sections)}")
    assert len(sections) == 8, f"Expected 8 standard sections, got {len(sections)}"
    expected_ids = [
        "exec-summary", "client-ips", "macro-sector",
        "company-theses", "trade-execution", "benchmark-performance",
        "lessons-learned", "appendix-ai"
    ]
    actual_ids = [s["section_id"] for s in sections]
    for expected_id in expected_ids:
        assert expected_id in actual_ids, f"Section {expected_id} missing from report outline"

    # Update section content
    test_content = "This is a team-authored investment thesis draft written by Arnav and Jaivish. Zero AI generation."
    updated_sec = db.update_report_section("exec-summary", test_content)
    assert updated_sec["content"] == test_content
    # Verify retrieval
    refetched = db.get_all_report_sections()
    exec_sec = next(s for s in refetched if s["section_id"] == "exec-summary")
    assert exec_sec["content"] == test_content
    
    # Test markdown report compilation
    full_md = db.get_report_full_markdown()
    assert "# Wharton Investment Simulator" in full_md
    assert "Executive Summary" in full_md
    assert test_content in full_md
    print("Report Outline auto-save and full markdown generation verified.")

    print("11. Testing AI Usage Log with Competition Roster & Categories...")
    valid_members = ["Arnav", "Jaivish", "Harsimar", "Nairit"]
    valid_categories = [
        "Explain Concept", "Fix Writing", "Build Template",
        "Brainstorm", "Counter-Argument", "Study Quiz"
    ]
    ai_entry = {
        "date": "2026-09-13",
        "team_member": "Arnav",
        "what_was_asked": "Clarify difference between operating margin and EBITDA margin for financial sector",
        "tool_used": "Claude 3.5 Sonnet",
        "category": "Explain Concept"
    }
    assert ai_entry["team_member"] in valid_members
    assert ai_entry["category"] in valid_categories
    db.add_ai_log(ai_entry)
    logs = db.get_all_ai_logs()
    assert any(l["team_member"] == "Arnav" and l["category"] == "Explain Concept" for l in logs)
    print("AI Usage Log entry recorded successfully.")

    print("\n--- PHASE 4 TESTS ---")
    print("12. Testing Financial Statements Fetcher (Annual & Quarterly)...")
    statements_annual = fetcher.fetch_financial_statements("AAPL", period_type="annual")
    assert statements_annual["ticker"] == "AAPL"
    assert statements_annual["period_type"] == "annual"
    assert "fetch_date" in statements_annual
    assert len(statements_annual["income_statement"]["periods"]) > 0
    assert len(statements_annual["income_statement"]["line_items"]) > 0
    assert len(statements_annual["balance_sheet"]["periods"]) > 0
    assert len(statements_annual["cash_flow"]["periods"]) > 0
    print(f"Annual statements fetched: {len(statements_annual['income_statement']['periods'])} periods, {len(statements_annual['income_statement']['line_items'])} IS line items.")

    statements_quarterly = fetcher.fetch_financial_statements("AAPL", period_type="quarterly")
    assert statements_quarterly["period_type"] == "quarterly"
    assert len(statements_quarterly["income_statement"]["periods"]) > 0
    print(f"Quarterly statements fetched: {len(statements_quarterly['income_statement']['periods'])} periods.")

    print("13. Testing Watchlist Storage & CRUD...")
    db.add_watchlist_item({
        "ticker": "NVDA",
        "notes": "AI datacenter market leader, tracking for pullback entry below $110",
        "target_price": 110.0
    })
    watchlist_items = db.get_all_watchlist()
    assert any(w["ticker"] == "NVDA" for w in watchlist_items)
    nvda_item = next(w for w in watchlist_items if w["ticker"] == "NVDA")
    assert nvda_item["target_price"] == 110.0

    deleted_watch = db.delete_watchlist_item("NVDA")
    assert deleted_watch is True
    assert not any(w["ticker"] == "NVDA" for w in db.get_all_watchlist())
    print("Watchlist CRUD operations verified.")

    print("14. Testing Activity Feed Aggregation...")
    feed = db.get_recent_activity(limit=10)
    assert len(feed) > 0, "Activity feed should contain events from trades/notes/logs"
    first_event = feed[0]
    assert "id" in first_event
    assert "title" in first_event
    assert "timestamp" in first_event
    assert "relative_time" in first_event
    print(f"Activity feed returned {len(feed)} events. Most recent: '{first_event['title']}' ({first_event['relative_time']})")

    print("\n--- PHASE 5 TESTS ---")
    print("15. Testing Trade Attribution & Edit Audit Trail...")
    trade_id = db.add_trade({
        "ticker": "MSFT",
        "company_name": "Microsoft Corp",
        "sector": "Technology",
        "entry_date": "2026-09-13",
        "entry_price": 420.00,
        "quantity": 50,
        "rationale": "Cloud & AI margin resilience",
        "exit_condition": "P/E > 40 or cloud slowdown",
        "ips_alignment": "Quality large-cap growth",
        "ips_fit_status": "fit",
        "logged_by": "Nairit"
    })
    created = db.get_trade_by_id(trade_id)
    assert created["logged_by"] == "Nairit"

    # Edit the trade
    updated = db.update_trade_with_audit(trade_id, {
        "quantity": 60,
        "rationale": "Updated: Azure revenue acceleration"
    }, edited_by="Jaivish")
    assert updated["quantity"] == 60
    assert updated["rationale"] == "Updated: Azure revenue acceleration"

    edits = db.get_trade_edits(trade_id)
    assert len(edits) >= 2, "Should record edits for quantity and rationale"
    assert any(e["field_changed"] == "quantity" and e["edited_by"] == "Jaivish" for e in edits)
    print(f"Trade edit audit verified: {len(edits)} field changes logged for Trade #{trade_id}.")

    print("16. Testing WInS Reconciliation Check...")
    rec = db.add_reconciliation_check(
        checked_by="Arnav",
        actual_cash=485000.0,
        actual_portfolio_value=502500.0,
        calculated_cash=484750.0,
        calculated_portfolio_value=502500.0,
        notes="Checked against WInS trade blotter"
    )
    assert rec["cash_discrepancy"] == 250.0
    assert rec["portfolio_discrepancy"] == 0.0
    recs = db.get_reconciliation_history(5)
    assert len(recs) >= 1
    print(f"Reconciliation verified. Cash gap: ${rec['cash_discrepancy']}, Port gap: ${rec['portfolio_discrepancy']}")

    print("17. Testing Team Deadlines & Milestones...")
    deadlines = db.get_team_deadlines()
    assert len(deadlines) >= 4, "Should have default deadlines seeded"
    first_trade_deadline = next((d for d in deadlines if "First Trade" in d["title"]), None)
    assert first_trade_deadline is not None
    assert first_trade_deadline["is_hard_deadline"] == 1

    custom_dl = db.add_team_deadline("Q3 Earnings Season Review", "2026-10-25 23:59:59", "Analyze tech megacap earnings", False)
    assert custom_dl["id"] is not None
    deleted_dl = db.delete_team_deadline(custom_dl["id"])
    assert deleted_dl is True
    print("Team deadlines verified.")

    print("18. Testing Full Database Backup Export...")
    backup = db.export_full_database_backup()
    assert "metadata" in backup
    assert "tables" in backup
    assert "trades" in backup["tables"]
    assert "reconciliation_checks" in backup["tables"]
    assert "team_deadlines" in backup["tables"]
    assert backup["metadata"]["table_record_counts"]["trades"] > 0
    print(f"Full database backup verified. Exported {len(backup['tables'])} tables.")

    print("\n[SUCCESS] ALL PHASE 1, PHASE 2, PHASE 3, PHASE 4, AND PHASE 5 TESTS PASSED!")

    # Clean up isolated test database
    try:
        if os.path.exists(test_db_file):
            os.remove(test_db_file)
    except Exception:
        pass


if __name__ == "__main__":
    run_tests()
