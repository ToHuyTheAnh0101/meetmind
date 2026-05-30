import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, ChevronDown, Check, HelpCircle } from "lucide-react";
import { SummaryTemplatePurpose } from "@/types/api";

interface TemplateFormBasicInfoProps {
  formName: string;
  setFormName: (val: string) => void;
  formPurpose: SummaryTemplatePurpose;
  setFormPurpose: (val: SummaryTemplatePurpose) => void;
  formStyle: "detailed" | "concise" | "formal" | "bullet_points";
  setFormStyle: (val: "detailed" | "concise" | "formal" | "bullet_points") => void;
  formDesc: string;
  setFormDesc: (val: string) => void;
  formGlobalRules: string;
  setFormGlobalRules: (val: string) => void;
  isFormPurposeOpen: boolean;
  setIsFormPurposeOpen: (val: boolean) => void;
  isFormStyleOpen: boolean;
  setIsFormStyleOpen: (val: boolean) => void;
  isVi: boolean;
  isSystem?: boolean;
}

export const TemplateFormBasicInfo: React.FC<TemplateFormBasicInfoProps> = ({
  formName,
  setFormName,
  formPurpose,
  setFormPurpose,
  formStyle,
  setFormStyle,
  formDesc,
  setFormDesc,
  formGlobalRules,
  setFormGlobalRules,
  isFormPurposeOpen,
  setIsFormPurposeOpen,
  isFormStyleOpen,
  setIsFormStyleOpen,
  isVi,
  isSystem = false,
}) => {
  const { t } = useTranslation();

  return (
    <div className="relative z-20 rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-5">
      <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
          <FileText className="h-5 w-5" />
        </div>
        <h3 className="text-base font-black text-slate-800">
          {t("template.basic_info_card_title")}
        </h3>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-black text-slate-700 tracking-wide flex items-center gap-1">
            <span>{t("template.field_template_name")}</span>
            {!isSystem && <span className="text-rose-500">*</span>}
          </label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            disabled={isSystem}
            placeholder={t("template.field_template_name_placeholder")}
            className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
        </div>

        <div className="space-y-1.5 sm:col-span-1 relative">
          <label className="text-xs font-black text-slate-700 tracking-wide">
            {t("template.field_template_purpose")}
          </label>
          <button
            type="button"
            onClick={() => !isSystem && setIsFormPurposeOpen(!isFormPurposeOpen)}
            disabled={isSystem}
            className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              {formPurpose === "interview" && `🎤 ${t("template.purpose_options.interview")}`}
              {formPurpose === "report" && `📊 ${t("template.purpose_options.report")}`}
              {formPurpose === "project_discussion" && `💻 ${t("template.purpose_options.project_discussion")}`}
              {formPurpose === "team_meeting" && `👥 ${t("template.purpose_options.team_meeting")}`}
              {formPurpose === "brainstorming" && `💡 ${t("template.purpose_options.brainstorming")}`}
              {formPurpose === "training" && `🎓 ${t("template.purpose_options.training")}`}
              {formPurpose === "retrospective" && `🔁 ${t("template.purpose_options.retrospective")}`}
              {formPurpose === "sales_pitch" && `🤝 ${t("template.purpose_options.sales_pitch")}`}
              {formPurpose === "custom" && `⚙️ ${t("template.purpose_options.custom")}`}
            </span>
            {!isSystem && (
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isFormPurposeOpen ? "rotate-180" : ""}`} />
            )}
          </button>

          <AnimatePresence>
            {isFormPurposeOpen && !isSystem && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFormPurposeOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-full origin-top-left rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                >
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {[
                      { val: "interview", label: `🎤 ${t("template.purpose_options.interview")}` },
                      { val: "report", label: `📊 ${t("template.purpose_options.report")}` },
                      { val: "project_discussion", label: `💻 ${t("template.purpose_options.project_discussion")}` },
                      { val: "team_meeting", label: `👥 ${t("template.purpose_options.team_meeting")}` },
                      { val: "brainstorming", label: `💡 ${t("template.purpose_options.brainstorming")}` },
                      { val: "training", label: `🎓 ${t("template.purpose_options.training")}` },
                      { val: "retrospective", label: `🔁 ${t("template.purpose_options.retrospective")}` },
                      { val: "sales_pitch", label: `🤝 ${t("template.purpose_options.sales_pitch")}` },
                      { val: "custom", label: `⚙️ ${t("template.purpose_options.custom")}` },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setFormPurpose(opt.val as SummaryTemplatePurpose);
                          setIsFormPurposeOpen(false);
                        }}
                        className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                          formPurpose === opt.val
                            ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {formPurpose === opt.val && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1.5 sm:col-span-1 relative">
          <label className="text-xs font-black text-slate-700 tracking-wide flex items-center gap-1">
            <span>{t("template.field_template_style")}</span>
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
          </label>
          <button
            type="button"
            onClick={() => !isSystem && setIsFormStyleOpen(!isFormStyleOpen)}
            disabled={isSystem}
            className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          >
            <span className="flex items-center gap-2">
              {formStyle === "detailed" && t("template.style_options.detailed")}
              {formStyle === "concise" && t("template.style_options.concise")}
              {formStyle === "formal" && t("template.style_options.formal")}
              {formStyle === "bullet_points" && t("template.style_options.bullet_points")}
            </span>
            {!isSystem && (
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isFormStyleOpen ? "rotate-180" : ""}`} />
            )}
          </button>

          <AnimatePresence>
            {isFormStyleOpen && !isSystem && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsFormStyleOpen(false)} />
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 mt-2 w-full origin-top-left rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                >
                  <div className="space-y-0.5">
                    {[
                      { val: "detailed", label: t("template.style_options.detailed") },
                      { val: "concise", label: t("template.style_options.concise") },
                      { val: "formal", label: t("template.style_options.formal") },
                      { val: "bullet_points", label: t("template.style_options.bullet_points") },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => {
                          setFormStyle(opt.val as any);
                          setIsFormStyleOpen(false);
                        }}
                        className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                          formStyle === opt.val
                            ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                      >
                        <span>{opt.label}</span>
                        {formStyle === opt.val && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>

        <div className="space-y-1.5 sm:col-span-2">
          <label className="text-xs font-black text-slate-700 tracking-wide">
            {t("template.field_template_desc")}
          </label>
          <textarea
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            disabled={isSystem}
            placeholder={t("template.field_template_desc_placeholder")}
            rows={2}
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none shadow-sm disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed"
          />
        </div>

        {!isSystem && (
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-black text-slate-700 tracking-wide">
              {isVi ? "Quy tắc phân tích toàn cục (Global Rules)" : "Global Analysis Rules"}
            </label>
            <textarea
              value={formGlobalRules}
              onChange={(e) => setFormGlobalRules(e.target.value)}
              placeholder={isVi 
                ? "Các chỉ dẫn áp dụng cho toàn bộ bản tóm tắt (ví dụ: Không dùng từ quá trang trọng, tập trung vào người phụ trách...)" 
                : "Guidelines or rules applied to the entire summary (e.g. Focus on action items, keep tone formal...)"
              }
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none shadow-sm"
            />
          </div>
        )}
      </div>
    </div>
  );
};
