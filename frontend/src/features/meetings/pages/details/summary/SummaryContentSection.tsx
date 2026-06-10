import React from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Sparkles, Bot, FileText, RefreshCw } from "lucide-react";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface SummaryContentSectionProps {
  isLoadingSummaries: boolean;
  isOngoing: boolean;
  isAiActivatedButNoTranscripts: boolean;
  aiActivated: boolean;
  summary: string | undefined;
  isGenerating: boolean;
  selectedTemplateId: string;
  setSelectedTemplateId: (val: string) => void;
  templates: any[] | undefined;
  handleGenerate: () => void;
}

export const SummaryContentSection: React.FC<SummaryContentSectionProps> = ({
  isLoadingSummaries,
  isOngoing,
  isAiActivatedButNoTranscripts,
  aiActivated,
  summary,
  isGenerating,
  selectedTemplateId,
  setSelectedTemplateId,
  templates,
  handleGenerate,
}) => {
  const { t } = useTranslation();

  if (isLoadingSummaries) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        <span className="text-sm font-bold">{t("meeting.permissions.loading")}</span>
      </div>
    );
  }

  if (isOngoing) {
    return (
      <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center">
        <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-emerald-50/80 text-emerald-500 flex items-center justify-center mb-6 shadow-inner relative">
          <span className="animate-ping absolute inline-flex h-12 w-12 rounded-[1.25rem] bg-emerald-400/20 opacity-75"></span>
          <Sparkles className="h-8 w-8 text-emerald-500 animate-pulse" />
        </div>
        <h4 className="text-lg font-black text-slate-900">
          {t("meeting.summary_tab.ongoing_desc")}
        </h4>
        <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          {t("meeting.summary_tab.ongoing_detail")}
        </p>
      </div>
    );
  }

  if (isAiActivatedButNoTranscripts) {
    return (
      <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-cyan-50/80 text-cyan-500 flex items-center justify-center mb-6 shadow-inner">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
        </div>
        <h4 className="text-lg font-black text-slate-900">
          {t("meeting.summary_tab.processing_title")}
        </h4>
        <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          {t("meeting.summary_tab.processing_detail")}
        </p>
      </div>
    );
  }

  if (!aiActivated && !summary) {
    return (
      <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center animate-fade-in">
        <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-amber-50/80 text-amber-500 flex items-center justify-center mb-6 shadow-inner">
          <Bot className="h-8 w-8 text-amber-500" />
        </div>
        <h4 className="text-lg font-black text-slate-900">
          {t("meeting.summary_tab.ai_not_activated_title")}
        </h4>
        <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
          {t("meeting.summary_tab.ai_not_activated_detail")}
        </p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center">
        <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-6 shadow-inner relative">
          <Loader2 className="h-8 w-8 animate-spin text-cyan-500 absolute" />
          <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
        </div>
        <h4 className="text-lg font-black text-slate-800 animate-pulse">
          {t("meeting.summary_tab.completing_title")}
        </h4>
        <p className="text-xs font-bold text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
          {t("meeting.summary_tab.completing_detail")}
        </p>
      </div>
    );
  }

  if (summary) {
    return (
      <div className="flex-1 flex flex-col justify-between">
        {/* Template Config Row */}
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 mb-4 md:flex-row md:items-end md:justify-between">
          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <span className="text-[11px] font-black text-slate-400 tracking-wider">
              {t("meeting.summary_tab.template_label")}
            </span>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-500 transition-colors animate-fade-in min-w-[220px] max-w-[320px]"
            >
              <option value="">{t("meeting.summary_tab.default_template")}</option>
              {templates?.map((temp) => (
                <option key={temp.id} value={temp.id}>
                  {temp.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleGenerate}
              className="px-3.5 py-2 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all font-black text-xs gap-1.5 shadow-sm"
              title={t("meeting.summary_tab.generate_summary_btn")}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>{t("meeting.summary_tab.regenerate")}</span>
            </button>
          </div>
        </div>

        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
          <MarkdownRenderer content={summary} />
        </div>
      </div>
    );
  }

  return (
    <div className="text-center py-12 px-4 flex-1 flex flex-col justify-center">
      <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-slate-100/80 flex items-center justify-center text-slate-400 mb-6 shadow-inner">
        <FileText className="h-8 w-8" />
      </div>
      <h4 className="text-lg font-black text-slate-900">
        {t("meeting.summary_tab.no_summary_yet")}
      </h4>
      <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
        {t("meeting.summary_tab.empty_no_summary")}
      </p>

      {/* Template selector for empty state */}
      <div className="my-6 max-w-xs mx-auto flex flex-col items-stretch gap-2">
        <span className="text-[11px] font-black text-slate-400 tracking-wider shrink-0 text-left">
          {t("meeting.summary_tab.template_label")}
        </span>
        <select
          value={selectedTemplateId}
          onChange={(e) => setSelectedTemplateId(e.target.value)}
          className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-500 transition-colors w-full animate-fade-in"
        >
          <option value="">{t("meeting.summary_tab.default_template")}</option>
          {templates?.map((temp) => (
            <option key={temp.id} value={temp.id}>
              {temp.name}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleGenerate}
        className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:scale-[1.03] active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-cyan-100 transition-all flex items-center gap-3 mx-auto"
      >
        <Sparkles className="h-4 w-4" />
        <span>{t("meeting.summary_tab.generate_summary_btn")}</span>
      </button>
    </div>
  );
};
