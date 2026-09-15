"""
RSS News Fetcher Module for Wharton Investment Simulator (WInS).
Pulls live headlines from free financial RSS feeds (Yahoo Finance, Google News Business)
without requiring any API keys.
Filters articles by keyword matching against portfolio holdings and tracked sectors.
Integrates with SQLite news_tags table for manual thesis relevance tagging.
"""

import urllib.request
import xml.etree.ElementTree as ET
import re
import html
import time
import logging
from typing import List, Dict, Any, Set, Optional
import database as db

logger = logging.getLogger(__name__)

# List of reliable free RSS feeds
RSS_FEEDS = [
    {"source": "Yahoo Finance", "url": "https://finance.yahoo.com/news/rssindex"},
    {"source": "Google News Markets", "url": "https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=en-US&gl=US&ceid=US:en"},
]

_NEWS_CACHE = {
    "timestamp": 0,
    "articles": []
}
NEWS_CACHE_TTL = 300  # 5 minutes cache


def clean_html(raw_html: str) -> str:
    """Removes HTML tags and decodes entities."""
    clean = re.sub(r"<[^>]+>", "", raw_html)
    return html.unescape(clean).strip()


def fetch_raw_rss(feed_url: str, source_name: str) -> List[Dict[str, Any]]:
    """Fetches and parses a single RSS feed."""
    articles = []
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    try:
        req = urllib.request.Request(feed_url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            xml_data = response.read()
            root = ET.fromstring(xml_data)

            # RSS 2.0 structure: <rss><channel><item>...
            for item in root.findall(".//item"):
                title_elem = item.find("title")
                link_elem = item.find("link")
                pub_elem = item.find("pubDate")
                desc_elem = item.find("description")

                title = clean_html(title_elem.text) if title_elem is not None and title_elem.text else ""
                link = link_elem.text.strip() if link_elem is not None and link_elem.text else ""
                pub_date = pub_elem.text.strip() if pub_elem is not None and pub_elem.text else ""
                description = clean_html(desc_elem.text) if desc_elem is not None and desc_elem.text else ""

                if title and link:
                    articles.append({
                        "headline": title,
                        "article_url": link,
                        "source": source_name,
                        "published_date": pub_date,
                        "description": description[:200]
                    })
    except Exception as e:
        logger.warning(f"Error fetching RSS feed {feed_url}: {e}")
    return articles


def get_news_headlines(
    keywords: Optional[List[str]] = None,
    force_refresh: bool = False
) -> List[Dict[str, Any]]:
    """
    Fetches headlines from RSS feeds and filters them by matching keywords.
    Attaches manual relevance tags from database.
    """
    now = time.time()
    raw_articles = []

    if not force_refresh and _NEWS_CACHE["articles"] and (now - _NEWS_CACHE["timestamp"] < NEWS_CACHE_TTL):
        raw_articles = _NEWS_CACHE["articles"]
    else:
        for feed in RSS_FEEDS:
            feed_articles = fetch_raw_rss(feed["url"], feed["source"])
            raw_articles.extend(feed_articles)
        
        # Deduplicate by URL
        seen_urls = set()
        deduped = []
        for a in raw_articles:
            if a["article_url"] not in seen_urls:
                seen_urls.add(a["article_url"])
                deduped.append(a)
        raw_articles = deduped
        _NEWS_CACHE["timestamp"] = now
        _NEWS_CACHE["articles"] = raw_articles

    # Retrieve existing manual tags from DB
    saved_tags = db.get_news_tags()

    # Build search terms
    search_terms: Set[str] = set()
    if keywords:
        for kw in keywords:
            if kw and len(kw.strip()) >= 2:
                search_terms.add(kw.strip().lower())

    results = []
    for art in raw_articles:
        text_to_search = f"{art['headline']} {art.get('description', '')}".lower()
        matched_kws = []

        if search_terms:
            for term in search_terms:
                # Word boundary search for short tickers (like AAPL or AI)
                pattern = r"\b" + re.escape(term) + r"\b"
                if re.search(pattern, text_to_search, re.IGNORECASE):
                    matched_kws.append(term.upper())

        # If keywords specified and none matched, skip article unless already saved/tagged by user
        url = art["article_url"]
        is_saved = url in saved_tags
        if search_terms and not matched_kws and not is_saved:
            continue

        tag_info = saved_tags.get(url, {})
        relevance = tag_info.get("relevance_tag", "unreviewed")

        results.append({
            "headline": art["headline"],
            "article_url": url,
            "source": art["source"],
            "published_date": art["published_date"],
            "matched_keywords": ", ".join(matched_kws) if matched_kws else tag_info.get("matched_keywords", "General Market"),
            "relevance_tag": relevance
        })

    return results[:60]  # Return top 60 relevant headlines
