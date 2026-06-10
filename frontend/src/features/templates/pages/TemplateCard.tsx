import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ChevronRight, Layers } from "lucide-react";
import { SummaryTemplate } from "@/types/api";
import { getPurposeStyles } from "../utils/purposeStyles";

interface TemplateCardProps {
  template: SummaryTemplate;
  index: number;
  onClick: () => void;
}

export const TemplateCard: React.FC<TemplateCardProps> = ({
  template,
  index,
  onClick,
}) => {
  const { t } = useTranslation();
  const styles = getPurposeStyles(template.purpose, t);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
      whileHover={{ y: -4 }}
      onClick={onClick}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl sm:p-6"
    >
      {/* Gradient border accent */}
      <div
        className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${styles.gradient}`}
      />

      <div className="relative flex h-full flex-col justify-between gap-4 pt-2">
        {/* Header: Title & Badges */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${styles.bg}`}
            >
              {styles.label}
            </span>

            <span
              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                template.isSystem
                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              }`}
            >
              {template.isSystem
                ? t("template.is_system")
                : t("template.is_custom")}
            </span>
          </div>

          <h3 className="line-clamp-1 text-lg font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
            {template.name}
          </h3>
        </div>

        {/* Description */}
        <div className="flex-1">
          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
            {template.description || "Không có mô tả cho mẫu này."}
          </p>
        </div>

        {/* Footer: Sections Count */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
            <Layers className="h-4 w-4 text-slate-400" />
            <span>{template.sections?.length || 0} mục tóm tắt</span>
          </div>

          <motion.div
            whileHover={{ x: 3 }}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm shadow-slate-100"
          >
            <ChevronRight className="h-4 w-4" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};
