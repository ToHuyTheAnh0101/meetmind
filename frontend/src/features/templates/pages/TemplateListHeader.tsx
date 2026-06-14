import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, ChevronDown, Check } from "lucide-react";

interface TemplateListHeaderProps {
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedPurpose: string;
  setSelectedPurpose: (val: string) => void;
  isSearchVisible: boolean;
  setIsSearchVisible: (val: boolean) => void;
  isFilterPurposeOpen: boolean;
  setIsFilterPurposeOpen: (val: boolean) => void;
  handleOpenCreateForm: () => void;
}

export const TemplateListHeader: React.FC<TemplateListHeaderProps> = ({
  searchQuery,
  setSearchQuery,
  selectedPurpose,
  setSelectedPurpose,
  isSearchVisible,
  setIsSearchVisible,
  isFilterPurposeOpen,
  setIsFilterPurposeOpen,
  handleOpenCreateForm,
}) => {
  const { t } = useTranslation();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative rounded-[2.5rem] border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10 z-10"
    >
      {/* Decorative Blur Background Container */}
      <div className="absolute inset-0 rounded-[2.5rem] overflow-hidden pointer-events-none z-0">
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />
      </div>

      <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between z-10">
        <div className="max-w-xl">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
            {t("dashboard.template_list_title_prefix")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
              {t("dashboard.template_list_title_highlight")}
            </span>
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base">
            {t("dashboard.template_list_subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsSearchVisible(!isSearchVisible)}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 ${
              isSearchVisible
                ? "bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-100"
                : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-cyan-200 hover:text-cyan-600"
            }`}
          >
            <Search className="h-5 w-5" />
          </button>

          {/* Purpose Filter select */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFilterPurposeOpen(!isFilterPurposeOpen)}
              className="flex h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 min-w-[200px]"
            >
              <span className="flex items-center gap-2">
                {selectedPurpose === "all" && "📁 Tất cả danh mục"}
                {selectedPurpose === "interview" && `🎤 ${t("template.purpose_options.interview")}`}
                {selectedPurpose === "report" && `📊 ${t("template.purpose_options.report")}`}
                {selectedPurpose === "project_discussion" && `💻 ${t("template.purpose_options.project_discussion")}`}
                {selectedPurpose === "team_meeting" && `👥 ${t("template.purpose_options.team_meeting")}`}
                {selectedPurpose === "brainstorming" && `💡 ${t("template.purpose_options.brainstorming")}`}
                {selectedPurpose === "training" && `🎓 ${t("template.purpose_options.training")}`}
                {selectedPurpose === "retrospective" && `🔁 ${t("template.purpose_options.retrospective")}`}
                {selectedPurpose === "sales_pitch" && `🤝 ${t("template.purpose_options.sales_pitch")}`}
                {selectedPurpose === "custom" && `⚙️ ${t("template.purpose_options.custom")}`}
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isFilterPurposeOpen ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {isFilterPurposeOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsFilterPurposeOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                  >
                    <div className="max-h-72 overflow-y-auto space-y-0.5">
                      {[
                        { val: "all", label: "📁 Tất cả danh mục" },
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
                            setSelectedPurpose(opt.val);
                            setIsFilterPurposeOpen(false);
                          }}
                          className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                            selectedPurpose === opt.val
                              ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                              : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                          }`}
                        >
                          <span>{opt.label}</span>
                          {selectedPurpose === opt.val && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleOpenCreateForm}
            className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
          >
            <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
            <span>{t("dashboard.new_template")}</span>
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isSearchVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="mt-8 flex items-center gap-4 pt-4">
              <div className="relative flex-1">
                <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/50" />
                <input
                  type="text"
                  placeholder={t("template.search_placeholder")}
                  className="h-14 w-full rounded-2xl border border-slate-200 bg-white/50 pl-14 pr-6 text-base font-bold placeholder:text-slate-400 focus:border-cyan-400 focus:ring-0 focus:bg-white backdrop-blur-sm transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
};
