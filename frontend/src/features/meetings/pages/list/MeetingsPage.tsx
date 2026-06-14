import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Search, Filter } from "lucide-react";
import { useDebounce } from "@/hooks/useDebounce";

// Local components
import MeetingList from "./MeetingList";

const MeetingsPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isFiltersVisible, setIsFiltersVisible] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("");

  // Debounce the search query to prevent excessive API requests
  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  return (
    <div className="space-y-6">
      {/* Unified Header section */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
      >
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t("dashboard.list_title_prefix")}{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                {t("dashboard.list_title_highlight")}
              </span>
            </h1>
            <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base">
              {t("dashboard.list_subtitle")}
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

            <button
              onClick={() => setIsFiltersVisible(!isFiltersVisible)}
              className={`flex h-12 items-center gap-2 rounded-2xl border px-5 text-sm font-black transition-all duration-300 ${
                isFiltersVisible
                  ? "bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100"
                  : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-indigo-200 hover:text-indigo-600"
              }`}
            >
              <Filter className="h-4 w-4" /> {t("meeting.filters")}
            </button>

            <button
              onClick={() => navigate("/meetings/new")}
              className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
            >
              <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
              <span>{t("dashboard.new_meeting")}</span>
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
              <div className="mt-5 flex items-center gap-4 pt-2">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/50" />
                  <input
                    type="text"
                    placeholder={t("meeting.search_placeholder")}
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-white/50 pl-14 pr-6 text-base font-bold placeholder:text-slate-400 focus:border-cyan-400 focus:ring-0 focus:bg-white backdrop-blur-sm transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsible Filter Panel inside Header */}
        <AnimatePresence>
          {isFiltersVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 border-t border-slate-100/60 pt-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-slate-800">
                    {t("meeting.filters")}
                  </span>
                  {selectedStatus && (
                    <button
                      onClick={() => setSelectedStatus("")}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition"
                    >
                      {t("meeting.filters") === "Filters"
                        ? "Clear filter"
                        : "Xóa bộ lọc"}
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    {
                      value: "",
                      label:
                        t("meeting.filters") === "Filters" ? "All" : "Tất cả",
                    },
                    {
                      value: "ongoing",
                      label: t("meeting.status.ongoing"),
                      activeClass:
                        "bg-cyan-600 text-white border-cyan-600 shadow-md shadow-cyan-100",
                      normalClass:
                        "border-cyan-200 text-cyan-700 hover:bg-cyan-50/50 bg-white/80",
                    },
                    {
                      value: "scheduled",
                      label: t("meeting.status.scheduled"),
                      activeClass:
                        "bg-amber-600 text-white border-amber-600 shadow-md shadow-amber-100",
                      normalClass:
                        "border-amber-200 text-amber-700 hover:bg-amber-50/50 bg-white/80",
                    },
                    {
                      value: "completed",
                      label: t("meeting.status.completed"),
                      activeClass:
                        "bg-emerald-600 text-white border-emerald-600 shadow-md shadow-emerald-100",
                      normalClass:
                        "border-emerald-200 text-emerald-700 hover:bg-emerald-50/50 bg-white/80",
                    },
                    {
                      value: "cancelled",
                      label: t("meeting.status.canceled"),
                      activeClass:
                        "bg-rose-600 text-white border-rose-600 shadow-md shadow-rose-100",
                      normalClass:
                        "border-rose-200 text-rose-700 hover:bg-rose-50/50 bg-white/80",
                    },
                  ].map((opt) => {
                    const isSelected = selectedStatus === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setSelectedStatus(opt.value)}
                        className={`rounded-xl border px-4 py-2.5 text-xs font-bold transition-all shadow-sm ${
                          isSelected
                            ? opt.activeClass ||
                              "bg-slate-900 text-white border-slate-900 shadow-md"
                            : opt.normalClass ||
                              "border-slate-200 text-slate-600 hover:border-slate-300 bg-white"
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Content Area - Always List now */}
      <div className="min-h-[500px]">
        <MeetingList
          searchQuery={debouncedSearchQuery}
          status={selectedStatus}
        />
      </div>
    </div>
  );
};

export default MeetingsPage;
