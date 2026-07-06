import React from "react";
import { useTranslation } from "react-i18next";
import { ChevronUp, ChevronDown, Edit3, X, Layers } from "lucide-react";
import { TemplateSectionDef } from "@/types/api";

interface TemplateActiveBlocksProps {
  formSections: TemplateSectionDef[];
  selectedTemplate: any;
  editingSecName: string | null;
  handleStartEditSection: (sec: TemplateSectionDef) => void;
  handleDeleteSection: (name: string) => void;
  moveSection: (index: number, direction: "up" | "down") => void;
}

export const TemplateActiveBlocks: React.FC<TemplateActiveBlocksProps> = ({
  formSections,
  selectedTemplate,
  editingSecName,
  handleStartEditSection,
  handleDeleteSection,
  moveSection,
}) => {
  const { t } = useTranslation();

  return (
    <div className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              {t("template.active_blocks_title")} ({formSections.length})
            </h3>
            <p className="text-xs font-medium text-slate-400">
              {t("template.active_blocks_subtitle")}
            </p>
          </div>
        </div>
      </div>

      {formSections.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
          <Layers className="h-10 w-10 stroke-1 text-slate-300" />
          <p className="mt-3 text-xs font-black text-slate-500">
            {t("template.active_blocks_empty")}
          </p>
          <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] text-center">
            {t("template.active_blocks_empty_desc")}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {formSections.map((sec, idx) => (
            <div
              key={sec.name}
              className={`flex items-center justify-between gap-4 rounded-2xl border bg-white/60 p-4 shadow-sm transition-all ${
                editingSecName === sec.name
                  ? "border-emerald-300 ring-2 ring-emerald-100"
                  : "border-slate-100 hover:border-cyan-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-[11px] font-black text-cyan-700">
                  {idx + 1}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-black text-slate-800">
                      {sec.label}
                    </p>
                  </div>
                  {sec.description && (
                    <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                      {sec.description}
                    </p>
                  )}
                </div>
              </div>

              {!selectedTemplate?.isSystem && (
                <div className="flex items-center gap-1.5">
                  {/* Reordering Up / Down buttons */}
                  <button
                    type="button"
                    onClick={() => moveSection(idx, "up")}
                    disabled={idx === 0}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition ${
                      idx === 0
                        ? "opacity-30 cursor-not-allowed border-transparent"
                        : "border-slate-100"
                    }`}
                    title={t("template.action_move_up")}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => moveSection(idx, "down")}
                    disabled={idx === formSections.length - 1}
                    className={`flex h-8 w-8 items-center justify-center rounded-lg border text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition ${
                      idx === formSections.length - 1
                        ? "opacity-30 cursor-not-allowed border-transparent"
                        : "border-slate-100"
                    }`}
                    title={t("template.action_move_down")}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStartEditSection(sec)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
                    title={t("template.action_edit_block")}
                  >
                    <Edit3 className="h-4 w-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteSection(sec.name)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition"
                    title={t("template.action_delete_block")}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
