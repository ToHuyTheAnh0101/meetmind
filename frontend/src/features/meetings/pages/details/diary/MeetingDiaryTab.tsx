import React, { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollText, Search, Loader2, CalendarClock } from "lucide-react";
import apiClient from "@/lib/apiClient";

// Sub-components
import { TimelineSummaryCard } from "./TimelineSummaryCard";
import { StatsCard } from "./StatsCard";
import { DiaryLogList } from "./DiaryLogList";
import { DiaryPagination } from "./DiaryPagination";

// Custom API Hooks & Utils
import { useMeeting } from "../../../api/getMeeting";
import { useMeetLogs } from "../../../api/getMeetLogs";
import { MeetLog } from "../../../types";
import { formatDate } from "../../../utils/formatters";

interface MeetingDiaryTabProps {
  meetingId: string;
}

export const MeetingDiaryTab: React.FC<MeetingDiaryTabProps> = ({ meetingId }) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === "vi";

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  // 1. Fetch meeting status (via custom hook)
  const { data: meetingStatus } = useMeeting(meetingId);

  // Fetch available templates (for resolving templateId to name in DiaryEventList)
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["summary-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/summary-templates");
      return response.data;
    },
  });

  const isOngoing = meetingStatus?.status === "ongoing";

  // 2. Fetch logs (via custom hook)
  const { data: logs, isLoading: isLoadingLogs } = useMeetLogs(meetingId);

  // Local ticker for ongoing meeting duration
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    if (meetingStatus?.status !== "ongoing") return;
    const timer = setInterval(() => {
      setNow(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, [meetingStatus?.status]);

  const durationMs = useMemo(() => {
    if (!meetingStatus?.actualStartTime) return 0;
    const start = new Date(meetingStatus.actualStartTime).getTime();
    if (isNaN(start)) return 0;

    const end = meetingStatus.actualEndTime
      ? new Date(meetingStatus.actualEndTime).getTime()
      : meetingStatus.status === "ongoing"
      ? now.getTime()
      : null;

    if (!end || isNaN(end)) return 0;
    return end - start;
  }, [meetingStatus?.actualStartTime, meetingStatus?.actualEndTime, meetingStatus?.status, now]);

  // Event translation maps for search matching
  const EVENT_LABEL_MAP: Record<string, { vi: string; en: string }> = {
    user_joined: { vi: "Tham gia cuộc họp", en: "Joined meeting" },
    user_left: { vi: "Rời khỏi cuộc họp", en: "Left meeting" },
    screen_share_start: { vi: "Bắt đầu chia sẻ màn hình", en: "Started screen sharing" },
    screen_share_end: { vi: "Dừng chia sẻ màn hình", en: "Stopped screen sharing" },
    poll_started: { vi: "Bắt đầu bình chọn", en: "Poll started" },
    poll_ended: { vi: "Kết thúc bình chọn", en: "Poll ended" },
    qa_opened: { vi: "Mở phiên Hỏi & Đáp", en: "Q&A session opened" },
    qa_closed: { vi: "Đóng phiên Hỏi & Đáp", en: "Q&A session closed" },
    recording_started: { vi: "Bắt đầu ghi hình", en: "Recording started" },
    recording_stopped: { vi: "Dừng ghi hình", en: "Recording stopped" },
    participant_admitted: { vi: "Duyệt vào phòng", en: "Admitted from lobby" },
    permissions_changed: { vi: "Thay đổi quyền hạn", en: "Permissions changed" },
    breakout_started: { vi: "Bắt đầu chia phòng", en: "Breakout rooms started" },
    breakout_ended: { vi: "Kết thúc chia phòng", en: "Breakout rooms ended" },
    ai_assistant_activated: { vi: "Bật trợ lý AI ghi âm", en: "AI assistant activated" },
    ai_assistant_deactivated: { vi: "Tắt trợ lý AI ghi âm", en: "AI assistant deactivated" },
    ai_summary_generated: { vi: "Tạo bản tóm tắt AI", en: "AI summary generated" },
    meeting_ended: { vi: "Kết thúc cuộc họp", en: "Meeting ended" },
  };

  // Filter logs based on search term
  const filteredLogs = useMemo(() => {
    if (!logs) return [];

    return logs.filter((log) => {
      const config = EVENT_LABEL_MAP[log.type];
      const label = config ? (isVi ? config.vi : config.en) : (isVi ? "Sự kiện" : "Log");

      const triggeredByUser = log.triggeredByUser;
      let userName = "Unknown";
      if (triggeredByUser) {
        const first = triggeredByUser.firstName || "";
        const last = triggeredByUser.lastName || "";
        const full = `${first} ${last}`.trim();
        if (full) userName = full;
        else if (triggeredByUser.email) userName = triggeredByUser.email;
      } else if (log.metadata) {
        if (typeof log.metadata.displayName === "string" && log.metadata.displayName.trim()) {
          userName = log.metadata.displayName;
        } else if (typeof log.metadata.email === "string" && log.metadata.email.trim()) {
          userName = log.metadata.email;
        }
      }
      userName = userName.toLowerCase();

      const matchesSearch =
        userName.includes(searchTerm.toLowerCase()) ||
        label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.metadata || {}).toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [logs, searchTerm, isVi]);

  // Sort logs reverse chronologically (newest first)
  const sortedLogs = useMemo(() => {
    return [...filteredLogs].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [filteredLogs]);

  const totalPages = Math.ceil(sortedLogs.length / pageSize);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Sliced logs for pagination
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedLogs.slice(startIndex, startIndex + pageSize);
  }, [sortedLogs, currentPage]);

  // Group logs by date
  const groupedLogs = useMemo(() => {
    const groups: { date: string; logs: MeetLog[] }[] = [];
    let currentDate = "";

    for (const log of paginatedLogs) {
      const date = formatDate(log.createdAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, logs: [log] });
      } else {
        groups[groups.length - 1].logs.push(log);
      }
    }

    return groups;
  }, [paginatedLogs]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: TIMELINE */}
      <div className="lg:col-span-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/70 p-5 sm:p-6 shadow-2xl backdrop-blur-xl min-h-[550px] flex flex-col"
        >
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6 mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[1.25rem] bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
                <ScrollText className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {t("meeting.diary.title")}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  {t("meeting.diary.subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={t("meeting.diary.search_placeholder")}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1); // Reset pagination on search
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all placeholder:text-slate-400 shadow-inner"
                />
              </div>

              {isOngoing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shrink-0">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-black text-emerald-700">
                    {t("meeting.diary.live")}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingLogs ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-sm font-bold">
                  {t("meeting.diary.loading")}
                </p>
              </div>
            ) : sortedLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
                  <CalendarClock className="h-10 w-10" />
                </div>
                <p className="text-lg font-black text-slate-400">
                  {t("meeting.diary.no_activity")}
                </p>
                <p className="text-sm font-bold text-slate-300 mt-2 max-w-sm">
                  {t("meeting.diary.no_activity_desc")}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={meetingId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  <DiaryLogList
                    groupedLogs={groupedLogs}
                    isVi={isVi}
                    templates={templates}
                  />

                  <DiaryPagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                  />

                  {/* Log Count Footer */}
                  <div className="mt-6 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-slate-300 tracking-wider">
                      {t("meeting.diary.event_count", { count: sortedLogs.length })}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: STATS & TIMELINE */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <TimelineSummaryCard
          meetingStatus={meetingStatus}
          durationMs={durationMs}
          isVi={isVi}
        />

        <StatsCard logs={sortedLogs} />
      </div>
    </div>
  );
};
