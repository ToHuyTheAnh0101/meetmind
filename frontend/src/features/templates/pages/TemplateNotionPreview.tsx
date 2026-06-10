import React from "react";
import { useTranslation } from "react-i18next";
import { Sparkles, Layers } from "lucide-react";
import { TemplateSectionDef, SummaryTemplatePurpose } from "@/types/api";
import { getPurposeStyles } from "../utils/purposeStyles";

interface TemplateNotionPreviewProps {
  formName: string;
  formPurpose: SummaryTemplatePurpose;
  formSections: TemplateSectionDef[];
  renderCompiledBlock: (
    blockType: string | undefined,
    label: string,
    placeholders: string | undefined
  ) => React.ReactNode;
}

export const TemplateNotionPreview: React.FC<TemplateNotionPreviewProps> = ({
  formName,
  formPurpose,
  formSections,
  renderCompiledBlock,
}) => {
  const { t } = useTranslation();

  return (
    <div className="sticky top-6">
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

        {/* Notion Document Body Container */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white font-serif">
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
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 font-sans">
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
  );
};
