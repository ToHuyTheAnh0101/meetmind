import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Layers, ChevronUp, ChevronDown, Edit3, X } from "lucide-react";
import { TemplateSectionDef, SummaryTemplatePurpose } from "@/types/api";
import { getPurposeStyles } from "../utils/purposeStyles";

interface TemplateNotionPreviewProps {
  formName: string;
  formPurpose: SummaryTemplatePurpose;
  formSections: TemplateSectionDef[];
  renderCompiledBlock: (
    blockType: string | undefined,
    label: string,
    placeholders: string | undefined,
    compact?: boolean
  ) => React.ReactNode;
  selectedTemplate: any;
  editingSecName: string | null;
  handleStartEditSection: (sec: TemplateSectionDef) => void;
  handleDeleteSection: (name: string) => void;
  moveSection: (index: number, direction: "up" | "down") => void;
}

export const TemplateNotionPreview: React.FC<TemplateNotionPreviewProps> = ({
  formName,
  formPurpose,
  formSections,
  renderCompiledBlock,
  selectedTemplate,
  editingSecName,
  handleStartEditSection,
  handleDeleteSection,
  moveSection,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"structure" | "document">("structure");

  return (
    <div>
      <div className="rounded-3xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col max-h-[85vh]">
        {/* Visual Header */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
              <Sparkles className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-black tracking-wide">
                {t("template.preview_title")}
              </h4>
              <p className="text-[11px] font-medium text-slate-300">
                {t("template.preview_subtitle")}
              </p>
            </div>
          </div>

          <div className="rounded-full bg-cyan-500/15 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-black text-cyan-300">
            {t("template.preview_live_badge")}
          </div>
        </div>

        {/* Mobile Tabs Switch */}
        <div className="flex border-b border-slate-100 bg-slate-50 p-1 md:hidden">
          <button
            type="button"
            onClick={() => setActiveTab("structure")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
              activeTab === "structure"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t("template.active_blocks_title")} ({formSections.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("document")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all text-center ${
              activeTab === "document"
                ? "bg-white text-indigo-600 shadow-sm border border-slate-200"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t("template.preview_title")}
          </button>
        </div>

        {/* Side-by-side Layout: Sidebar structure vs Preview Document */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[480px]">
          {/* Left Sidebar: Outline / Structure */}
          <div className={`w-full md:w-64 border-r border-slate-100 bg-slate-50/50 flex flex-col overflow-hidden ${
            activeTab === "structure" ? "flex" : "hidden md:flex"
          }`}>
            <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-600" />
              <span className="text-xs font-black text-slate-700 tracking-wide">
                {t("template.active_blocks_title")} ({formSections.length})
              </span>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {formSections.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 border border-dashed border-slate-200 rounded-xl m-2">
                  <Layers className="h-6 w-6 stroke-1 text-slate-300" />
                  <p className="mt-2 text-[10px] font-black text-slate-500 text-center px-2">
                    {t("template.active_blocks_empty")}
                  </p>
                </div>
              ) : (
                formSections.map((sec, idx) => (
                  <div
                    key={sec.name}
                    className={`group flex flex-col gap-1.5 rounded-xl border p-3 shadow-sm transition-all ${
                      editingSecName === sec.name
                        ? "border-emerald-400 bg-emerald-50/80 ring-2 ring-emerald-100/50"
                        : "border-slate-100 hover:border-cyan-200 bg-white"
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-cyan-50 text-[10px] font-black text-cyan-700">
                        {idx + 1}
                      </div>
                      <p className="text-xs font-black text-slate-700 truncate" title={sec.label}>
                        {sec.label}
                      </p>
                    </div>

                    {!selectedTemplate?.isSystem && (
                      <div className="flex items-center justify-end gap-1 border-t border-slate-100/50 pt-2">
                        <button
                          type="button"
                          onClick={() => moveSection(idx, "up")}
                          disabled={idx === 0}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition ${
                            idx === 0 ? "opacity-30 cursor-not-allowed border-transparent" : "border-slate-100"
                          }`}
                          title={t("template.action_move_up")}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveSection(idx, "down")}
                          disabled={idx === formSections.length - 1}
                          className={`flex h-5 w-5 items-center justify-center rounded border text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition ${
                            idx === formSections.length - 1 ? "opacity-30 cursor-not-allowed border-transparent" : "border-slate-100"
                          }`}
                          title={t("template.action_move_down")}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEditSection(sec)}
                          className="flex h-5 w-5 items-center justify-center rounded border border-slate-100 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                          title={t("template.action_edit_block")}
                        >
                          <Edit3 className="h-3 w-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteSection(sec.name)}
                          className="flex h-5 w-5 items-center justify-center rounded text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition"
                          title={t("template.action_delete_block")}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Notion Document Body Container */}
          <div className={`p-6 overflow-y-auto space-y-6 flex-1 bg-white font-serif min-h-[450px] ${
            activeTab === "document" ? "block" : "hidden md:block"
          }`}>
            {/* Notion Page Metadata Mockup */}
            <div className="border-b border-slate-100 pb-5 font-sans space-y-4">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight">
                📝 {formName.trim() || "Tiêu đề cuộc họp (Demo)"}
              </h1>

              <div className="grid gap-2 text-sm font-semibold text-slate-500 pt-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs w-28">
                    📅 {t("template.preview_date_label")}
                  </span>
                  <span className="text-slate-800">26/05/2026</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-xs w-28">
                    ⚙️ {t("template.preview_template_label")}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm ${
                      getPurposeStyles(formPurpose, t).bg
                    }`}
                  >
                    {getPurposeStyles(formPurpose, t).label}
                  </span>
                </div>
              </div>
            </div>

            {/* Dynamic Render of Active Blocks */}
            {formSections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center space-y-3 font-sans">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 border border-slate-100">
                  <Layers className="h-6 w-6" />
                </div>
                <p className="text-sm font-black text-slate-400">
                  {t("template.preview_empty_title")}
                </p>
                <p className="text-xs text-slate-400 max-w-[240px]">
                  {t("template.preview_empty_desc")}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {formSections.map((sec) => (
                  <div
                    key={sec.name}
                    className="space-y-3 group/block border-l-2 border-transparent hover:border-cyan-200 pl-3 -ml-3 transition-all rounded-r"
                  >
                    {/* Block Display Header */}
                    <div className="flex items-center gap-2 font-sans text-[15px] text-slate-800 font-bold border-b border-slate-100 pb-1 w-full">
                      <span>{sec.label}</span>
                    </div>

                    {/* Block Content Compiled Mockup */}
                    <div className="text-[15px] leading-relaxed text-slate-700">
                      {renderCompiledBlock(sec.blockType, sec.label, sec.placeholders)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

