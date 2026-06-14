import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, AlertCircle, ChevronDown, Check, Plus } from "lucide-react";
import { PREDEFINED_BLOCKS } from "../predefinedBlocks";
import { FRIENDLY_VARIABLES_VI } from "../utils/placeholderHelpers";

interface TemplateBlockEditorProps {
  editingSecName: string | null;
  setEditingSecName: (val: string | null) => void;
  secBuilderError: string | null;
  newSecBlockType: string;
  setNewSecBlockType: (val: string) => void;
  newSecLabel: string;
  setNewSecLabel: (val: string) => void;
  newSecPlaceholders: string;
  newSecAiInstructions: string;
  setNewSecAiInstructions: (val: string) => void;
  isNewSecBlockTypeOpen: boolean;
  setIsNewSecBlockTypeOpen: (val: boolean) => void;
  handleSelectPredefinedBlock: (block: any) => void;
  handleInsertPlaceholder: (placeholder: string) => void;
  handleAddOrUpdateSection: () => void;
  renderCompiledBlock: (blockType: string | undefined, label: string, placeholders: string | undefined, compact?: boolean) => React.ReactNode;
  selectedTemplate: any;
  setNewSecName: (val: string) => void;
  setNewSecDesc: (val: string) => void;
  setNewSecPlaceholders: (val: string | ((prev: string) => string)) => void;
}

export const TemplateBlockEditor: React.FC<TemplateBlockEditorProps> = ({
  editingSecName,
  setEditingSecName,
  secBuilderError,
  newSecBlockType,
  setNewSecBlockType,
  setIsNewSecBlockTypeOpen,
  newSecLabel,
  setNewSecLabel,
  newSecPlaceholders,
  newSecAiInstructions,
  setNewSecAiInstructions,
  isNewSecBlockTypeOpen,
  handleSelectPredefinedBlock,
  handleInsertPlaceholder,
  handleAddOrUpdateSection,
  renderCompiledBlock,
  selectedTemplate,
  setNewSecName,
  setNewSecDesc,
  setNewSecPlaceholders,
}) => {
  const { t } = useTranslation();

  if (selectedTemplate?.isSystem) return null;

  return (
    <div className="relative z-10 rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Sparkles className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-800">
              {editingSecName
                ? t("template.block_builder_edit_title")
                : t("template.block_builder_title")}
            </h3>
            <p className="text-xs font-medium text-slate-400">
              {editingSecName
                ? t("template.block_builder_edit_subtitle")
                : t("template.block_builder_subtitle")}
            </p>
          </div>
        </div>
      </div>

      {secBuilderError && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100 animate-in fade-in slide-in-from-top-1">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{secBuilderError}</span>
        </div>
      )}

      <div className="space-y-4">
        {/* Premium Block Type Selection Dropdown */}
        <div className="space-y-1.5 relative">
          <label className="text-xs font-black text-slate-700 tracking-wide flex items-center gap-1">
            <span>Loại khối nội dung</span>
            <span className="text-rose-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setIsNewSecBlockTypeOpen(!isNewSecBlockTypeOpen)}
            className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
          >
            <span className="flex items-center gap-2">
              {(() => {
                const currentBlock = PREDEFINED_BLOCKS.find(b => b.type === newSecBlockType);
                if (currentBlock) {
                  let emoji = "⚙️";
                  if (currentBlock.type === "executive_summary") emoji = "⚡";
                  if (currentBlock.type === "decisions") emoji = "✔";
                  if (currentBlock.type === "roadblocks") emoji = "🚨";
                  if (currentBlock.type === "todo_table") emoji = "📊";
                  return `${emoji} ${currentBlock.label}`;
                }
                return "⚙️ Khối tuỳ chỉnh";
              })()}
            </span>
            <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isNewSecBlockTypeOpen ? "rotate-180" : ""}`} />
          </button>

          <AnimatePresence>
            {isNewSecBlockTypeOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsNewSecBlockTypeOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-full origin-top-left rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                >
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {PREDEFINED_BLOCKS.map((block) => {
                      let emoji = "⚙️";
                      if (block.type === "executive_summary") emoji = "⚡";
                      if (block.type === "decisions") emoji = "✔";
                      if (block.type === "roadblocks") emoji = "🚨";
                      if (block.type === "todo_table") emoji = "📊";

                      return (
                        <button
                          key={block.type}
                          type="button"
                          onClick={() => {
                            handleSelectPredefinedBlock(block);
                            setIsNewSecBlockTypeOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                            newSecBlockType === block.type
                              ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-extrabold text-[12px]">{emoji} {block.label}</span>
                            {block.description && (
                              <span className="text-[10px] font-medium text-slate-400 mt-0.5">{block.description}</span>
                            )}
                          </div>
                          {newSecBlockType === block.type && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 tracking-wide">
            {t("template.field_block_label")}
          </label>
          <input
            type="text"
            value={newSecLabel}
            onChange={(e) => setNewSecLabel(e.target.value)}
            placeholder={t("template.field_block_label_placeholder")}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition shadow-sm"
          />
        </div>

        {/* AI Instructions Input Box */}
        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 tracking-wide">
            {t("template.field_block_ai_instructions")}
          </label>
          <textarea
            value={newSecAiInstructions}
            onChange={(e) => setNewSecAiInstructions(e.target.value)}
            placeholder={t("template.field_block_ai_instructions_placeholder")}
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none shadow-sm"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-black text-slate-700 tracking-wide flex items-center justify-between">
            <span>{t("template.field_block_placeholders")}</span>
          </label>
          <textarea
            value={newSecPlaceholders}
            onChange={(e) => setNewSecPlaceholders(e.target.value)}
            placeholder={t("template.field_block_placeholders_placeholder")}
            rows={3}
            className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none shadow-sm"
          />

          {/* Clickable Placeholders Drawer Helpers */}
          <div className="space-y-1.5 pt-1.5">
            <p className="text-xs font-black text-slate-700 tracking-wide">
              {t("template.helper_variables_title")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                { val: "{{meeting_title}}", key: "meeting_title" },
                { val: "{{meeting_date}}", key: "meeting_date" },
                { val: "{{summary}}", key: "summary" },
                { val: "{{action_items}}", key: "action_items" },
                { val: "{{participants}}", key: "participants" },
                { val: "{{task}}", key: "task" },
                { val: "{{owner}}", key: "owner" },
                { val: "{{deadline}}", key: "deadline" },
              ].map((item) => {
                const friendlyLabel = t(`template.variable_labels.${item.key}`) || FRIENDLY_VARIABLES_VI[item.key];
                const insertText = `[${friendlyLabel}]`;
                return (
                  <button
                    key={item.val}
                    type="button"
                    onClick={() => handleInsertPlaceholder(insertText)}
                    className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 text-[10px] font-black text-indigo-700 px-3 py-1 shadow-sm active:scale-95 transition-all gap-1"
                    title={`Nhấp để thêm ${insertText}`}
                  >
                    <span>✨ {friendlyLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Integrated Visual Block Preview Panel */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          <p className="text-xs font-black text-slate-700 tracking-wide">
            Bản xem trước của riêng khối này (Live Block Preview):
          </p>
          <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 shadow-inner min-h-[90px] flex flex-col justify-center transition-all duration-300">
            {(!newSecLabel.trim() && !newSecPlaceholders.trim()) ? (
              <div className="flex flex-col items-center justify-center text-slate-400 text-xs font-semibold py-4 transition-all duration-300">
                <Sparkles className="h-5 w-5 text-slate-300 animate-pulse mb-1.5" />
                <span>Bản xem trước khối sẽ xuất hiện tại đây khi bạn nhập dữ liệu...</span>
              </div>
            ) : (
              renderCompiledBlock(newSecBlockType, newSecLabel, newSecPlaceholders, true)
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {editingSecName && (
          <button
            type="button"
            onClick={() => {
              setEditingSecName(null);
              setNewSecName("");
              setNewSecLabel("");
              setNewSecDesc("");
              setNewSecBlockType("custom");
              setNewSecAiInstructions("");
              setNewSecPlaceholders("");
            }}
            className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-500 hover:bg-slate-50 hover:text-slate-800 active:scale-95 shadow-sm transition-all"
          >
            {t("template.btn_cancel_edit")}
          </button>
        )}

        <button
          type="button"
          onClick={handleAddOrUpdateSection}
          className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 shadow-md transition-all"
        >
          {editingSecName ? (
            <>
              <Check className="h-4 w-4" />
              <span>{t("template.btn_update_block")}</span>
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              <span>{t("template.btn_add_block")}</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
