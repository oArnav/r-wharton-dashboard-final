import React, { useState, useEffect } from 'react';
import {
  FileText, Download, Save, CheckCircle2, AlertCircle,
  Loader2, Info, FileSpreadsheet, Sparkles
} from 'lucide-react';
import { api } from '../services/api';

export default function ReportOutline() {
  const [sections, setSections] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [savingSection, setSavingSection] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchOutline = async () => {
    setIsLoading(true);
    try {
      const data = await api.getReportOutline();
      setSections(data);
      const initialDrafts = {};
      data.forEach((s) => {
        initialDrafts[s.section_id] = s.content || '';
      });
      setDrafts(initialDrafts);
    } catch (err) {
      console.error('Failed to load report outline:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchOutline();
  }, []);

  const handleContentChange = (sectionId, value) => {
    setDrafts((prev) => ({
      ...prev,
      [sectionId]: value
    }));
  };

  const handleSaveSection = async (sectionId) => {
    setSavingSection(sectionId);
    try {
      await api.updateReportSection(sectionId, drafts[sectionId] || '');
      setSaveSuccess(`Section saved to database.`);
      setTimeout(() => setSaveSuccess(''), 2500);
    } catch (err) {
      console.error('Error saving section:', err);
    } finally {
      setSavingSection(null);
    }
  };

  const wordCount = (text) => {
    if (!text || !text.trim()) return 0;
    return text.trim().split(/\s+/).length;
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold uppercase px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Competition Deliverable
            </span>
            <span className="text-xs text-slate-400">• Final Report Skeleton (8 Standard Sections)</span>
          </div>
          <h1 className="text-xl font-bold text-slate-900 mt-1 tracking-tight">Final Competition Report Outline</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Draft and structure the team's investment report directly. All writing is human-authored (Zero AI generation).
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <a
            href={api.getExportReportUrl()}
            download="wins_final_report_outline.md"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span>Download Outline (.md)</span>
          </a>
        </div>
      </div>

      {saveSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {/* Zero AI Disclaimer Banner */}
      <div className="p-3.5 bg-slate-100/80 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start space-x-2.5">
        <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <strong className="text-slate-800">Academic Integrity & Wharton WInS Guidelines: </strong>
          This editor does not generate synthetic text. It provides an organizational drafting workbench for Arnav, Jaivish, Harsimar, and Nairit to consolidate theses, risk analysis, and trade post-mortems for export into Google Docs or Word.
        </div>
      </div>

      {/* Sections List */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500 text-sm flex items-center justify-center space-x-2">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span>Loading report outline...</span>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section) => {
            const isSaving = savingSection === section.section_id;
            const currentContent = drafts[section.section_id] || '';
            const words = wordCount(currentContent);

            return (
              <div key={section.section_id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                
                {/* Section Header */}
                <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-blue-600 flex-shrink-0" />
                    <h3 className="font-bold text-slate-900 text-sm">{section.title}</h3>
                  </div>

                  <div className="flex items-center space-x-3 text-xs">
                    <span className="font-mono text-slate-500 text-[11px]">{words} Words</span>
                    <button
                      onClick={() => handleSaveSection(section.section_id)}
                      disabled={isSaving}
                      className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded border border-slate-300 font-semibold flex items-center space-x-1 transition disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3 text-blue-600" />}
                      <span>Save Draft</span>
                    </button>
                  </div>
                </div>

                {/* Text Area */}
                <div className="p-4">
                  <textarea
                    rows={currentContent.length > 200 ? 6 : 4}
                    value={currentContent}
                    onChange={(e) => handleContentChange(section.section_id, e.target.value)}
                    placeholder={`Draft notes, evidence, key ratios, and arguments for ${section.title}...`}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs leading-relaxed focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans"
                  />
                  <div className="mt-1 flex justify-between text-[11px] text-slate-400">
                    <span>Draft stored locally in shared SQLite database</span>
                    {section.updated_at && (
                      <span>Last saved: {section.updated_at}</span>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
