import React, { useState, useMemo } from 'react';
import {
  BrainCircuit, Plus, Search, Filter, Calendar, User,
  CheckCircle2, AlertCircle, Loader2, Sparkles, FileSpreadsheet,
  ArrowUpDown
} from 'lucide-react';
import { api } from '../services/api';

const TEAM_MEMBERS = ['Arnav', 'Jaivish', 'Harsimar', 'Nairit'];

const CATEGORIES = [
  { id: 'Explain Concept', label: 'Explain Concept', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { id: 'Fix Writing', label: 'Fix Writing', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { id: 'Build Template', label: 'Build Template', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { id: 'Brainstorm', label: 'Brainstorm', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { id: 'Counter-Argument', label: 'Counter-Argument', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { id: 'Study Quiz', label: 'Study Quiz', color: 'bg-purple-50 text-purple-700 border-purple-200' },
];

export default function AIUsageLog({ logs = [], onLogAdded }) {
  const today = new Date().toISOString().split('T')[0];

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [date, setDate] = useState(today);
  const [teamMember, setTeamMember] = useState('Arnav');
  const [whatWasAsked, setWhatWasAsked] = useState('');
  const [toolUsed, setToolUsed] = useState('Claude 3.5 Sonnet');
  const [category, setCategory] = useState('Explain Concept');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [memberFilter, setMemberFilter] = useState('all');
  
  // Sorting state: date, team_member, category
  const [sortField, setSortField] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc'); // 'asc' | 'desc'

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedLogs = useMemo(() => {
    return logs
      .filter((log) => {
        if (categoryFilter !== 'all' && log.category !== categoryFilter) return false;
        if (memberFilter !== 'all' && log.team_member !== memberFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchMember = log.team_member?.toLowerCase().includes(q);
          const matchTool = log.tool_used?.toLowerCase().includes(q);
          const matchAsked = log.what_was_asked?.toLowerCase().includes(q);
          if (!matchMember && !matchTool && !matchAsked) return false;
        }
        return true;
      })
      .sort((a, b) => {
        let valA = a[sortField] || '';
        let valB = b[sortField] || '';
        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
  }, [logs, categoryFilter, memberFilter, searchQuery, sortField, sortDirection]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!teamMember.trim()) {
      setError('Please select a team member.');
      return;
    }
    if (!toolUsed.trim()) {
      setError('Please specify the AI tool used (e.g. Claude, ChatGPT).');
      return;
    }
    if (!whatWasAsked.trim()) {
      setError('Please specify what was asked / prompt description.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onLogAdded({
        date,
        team_member: teamMember.trim(),
        tool_used: toolUsed.trim(),
        category,
        what_was_asked: whatWasAsked.trim(),
      });
      setWhatWasAsked('');
      setIsFormOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to save AI usage entry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCategoryBadge = (catName) => {
    const cat = CATEGORIES.find((c) => c.id.toLowerCase() === (catName || '').toLowerCase());
    return cat ? cat.color : 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              WInS Compliance
            </span>
            <span className="text-xs text-slate-400">• Generative AI Interaction Audit Trail</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">AI Tool Usage & Disclosure Log</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log all AI usage across Arnav, Jaivish, Harsimar, and Nairit for official competition appendix disclosure.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* CSV Export Button */}
          <a
            href={api.getExportAiLogsUrl()}
            download="wins_ai_usage_log.csv"
            className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-300"
            title="Download full AI usage history as CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setIsFormOpen(!isFormOpen)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>{isFormOpen ? 'Hide Form' : 'Log AI Usage'}</span>
          </button>
        </div>
      </div>

      {/* Add Entry Collapsible Form */}
      {isFormOpen && (
        <div className="bg-white rounded-xl border border-purple-200 shadow-md p-6 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 mb-4 text-purple-900 font-bold text-sm">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Record New AI Interaction</span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              {/* Date */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Date *</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              {/* Team Member Dropdown */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Team Member *</label>
                <select
                  value={teamMember}
                  onChange={(e) => setTeamMember(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-semibold"
                  required
                >
                  {TEAM_MEMBERS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Tool Used */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">AI Tool *</label>
                <input
                  type="text"
                  placeholder="e.g. Claude, ChatGPT, Gemini, Perplexity"
                  value={toolUsed}
                  onChange={(e) => setToolUsed(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  required
                />
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-white font-medium"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* What Was Asked */}
            <div>
              <label className="block font-semibold text-slate-700 uppercase tracking-wider mb-1">
                What was asked / Prompt & Purpose *
              </label>
              <textarea
                rows="3"
                value={whatWasAsked}
                onChange={(e) => setWhatWasAsked(e.target.value)}
                placeholder="Describe what query was submitted to the AI and how the output was used by the team..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-semibold flex items-center space-x-1.5 transition shadow-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <span>Save Log Entry</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search prompt, tool, or content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Member filter */}
          <select
            value={memberFilter}
            onChange={(e) => setMemberFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Members</option>
            {TEAM_MEMBERS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg bg-white"
          >
            <option value="all">All Categories ({logs.length})</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* AI Log Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {filteredAndSortedLogs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('date')}>
                    <div className="flex items-center space-x-1">
                      <span>Date</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('team_member')}>
                    <div className="flex items-center space-x-1">
                      <span>Team Member</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">AI Tool</th>
                  <th className="py-3 px-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('category')}>
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      <ArrowUpDown className="w-3 h-3 text-slate-400" />
                    </div>
                  </th>
                  <th className="py-3 px-4">Prompt Context & Deliverable Application</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredAndSortedLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {log.date}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.team_member}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-800 whitespace-nowrap font-medium">
                      {log.tool_used}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${getCategoryBadge(log.category)}`}>
                        {log.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 leading-relaxed max-w-xl">
                      {log.what_was_asked}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500 text-sm">
            <BrainCircuit className="w-12 h-12 mx-auto mb-2 text-slate-300" />
            <p className="font-medium text-slate-700">No AI usage log entries found.</p>
            <p className="text-xs text-slate-400 mt-1">Keep your team compliant by logging prompts and AI assistance.</p>
          </div>
        )}
      </div>

    </div>
  );
}
