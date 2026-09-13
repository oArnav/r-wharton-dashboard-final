import React, { useState, useEffect, useMemo } from 'react';
import {
  Newspaper, RefreshCw, ExternalLink, Check, X,
  Search, Filter, Tag, CheckCircle2, AlertCircle, Loader2
} from 'lucide-react';
import { api } from '../services/api';

export default function NewsScanner() {
  const [news, setNews] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('all'); // 'all' | 'relevant' | 'not-relevant' | 'unreviewed'
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchNews = async (refresh = false) => {
    setIsLoading(true);
    try {
      const data = await api.getNews(refresh);
      setNews(data);
    } catch (err) {
      console.error('Failed to load news:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

  const handleTagArticle = async (article, newTag) => {
    try {
      await api.setNewsTag(article.article_url, {
        headline: article.headline,
        source: article.source,
        published_date: article.published_date,
        matched_keywords: article.matched_keywords,
        relevance_tag: newTag
      });
      // Update local state
      setNews((prev) =>
        prev.map((item) =>
          item.article_url === article.article_url ? { ...item, relevance_tag: newTag } : item
        )
      );
      setActionSuccess(`Marked as ${newTag === 'relevant' ? 'Relevant to thesis' : 'Not relevant'}`);
      setTimeout(() => setActionSuccess(''), 2500);
    } catch (err) {
      console.error('Error tagging article:', err);
    }
  };

  const filteredNews = useMemo(() => {
    return news.filter((item) => {
      if (tagFilter !== 'all' && item.relevance_tag !== tagFilter) return false;
      if (searchFilter.trim()) {
        const q = searchFilter.toLowerCase();
        const matchHead = item.headline?.toLowerCase().includes(q);
        const matchSrc = item.source?.toLowerCase().includes(q);
        const matchKws = item.matched_keywords?.toLowerCase().includes(q);
        if (!matchHead && !matchSrc && !matchKws) return false;
      }
      return true;
    });
  }, [news, tagFilter, searchFilter]);

  const relevantCount = news.filter((n) => n.relevance_tag === 'relevant').length;

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Free RSS Feeds
            </span>
            <span className="text-xs text-slate-400">• Holdings & Sector Matcher</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Market News & Thesis Relevance Scanner</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Aggregates live business headlines matched to current holdings and tracked sectors. Manually tag articles relevant to your thesis.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => fetchNews(true)}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition disabled:opacity-50 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh RSS Feeds</span>
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search headlines, tickers, sources..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setTagFilter('all')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              tagFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({news.length})
          </button>
          <button
            onClick={() => setTagFilter('relevant')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              tagFilter === 'relevant' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Relevant to Thesis ({relevantCount})
          </button>
          <button
            onClick={() => setTagFilter('unreviewed')}
            className={`px-3 py-1.5 rounded-md font-medium transition ${
              tagFilter === 'unreviewed' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Unreviewed
          </button>
        </div>

      </div>

      {/* News List */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            <span>Scanning RSS feeds for portfolio keywords...</span>
          </div>
        ) : filteredNews.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {filteredNews.map((article, idx) => {
              const isRelevant = article.relevance_tag === 'relevant';
              const isNotRelevant = article.relevance_tag === 'not-relevant';

              return (
                <div
                  key={article.article_url || idx}
                  className="p-4 hover:bg-slate-50/80 transition flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5 flex-1 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                        {article.source}
                      </span>
                      {article.matched_keywords && (
                        <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-mono font-semibold border border-blue-200">
                          {article.matched_keywords}
                        </span>
                      )}
                      <span className="text-slate-400 text-[11px]">{article.published_date}</span>
                    </div>

                    <a
                      href={article.article_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-slate-900 hover:text-blue-600 text-sm block leading-snug group flex items-baseline space-x-1"
                    >
                      <span>{article.headline}</span>
                      <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition inline text-blue-600" />
                    </a>
                  </div>

                  {/* Manual Tagging Buttons */}
                  <div className="flex items-center space-x-2 self-start md:self-center flex-shrink-0">
                    <button
                      onClick={() => handleTagArticle(article, 'relevant')}
                      className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition border text-xs ${
                        isRelevant
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                      title="Mark as relevant to team thesis"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Relevant to Thesis</span>
                    </button>

                    <button
                      onClick={() => handleTagArticle(article, 'not-relevant')}
                      className={`px-3 py-1.5 rounded-lg font-semibold flex items-center space-x-1 transition border text-xs ${
                        isNotRelevant
                          ? 'bg-slate-800 text-white border-slate-800 shadow-sm'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-200'
                      }`}
                      title="Mark as not relevant"
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Not Relevant</span>
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm">
            <Newspaper className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-700">No headlines found matching your criteria.</p>
            <p className="text-xs text-slate-400 mt-1">Try broadening your search or refresh the feeds.</p>
          </div>
        )}
      </div>

    </div>
  );
}
