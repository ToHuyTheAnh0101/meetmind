import React, { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogIn,
  LogOut,
  Monitor,
  MonitorOff,
  BarChart3,
  MessageCircleQuestion,
  Video,
  VideoOff,
  UserCheck,
  Shield,
  LayoutGrid,
  Sparkles,
  Bot,
  BotOff,
  FileText,
  Loader2,
  Clock,
  CalendarClock,
  ScrollText,
  Search,
} from "lucide-react";
import apiClient from "@/lib/apiClient";

// ─────────────────────────────────────────
// Types
// ─────────────────────────────────────────

interface MeetingDiaryTabProps {
  meetingId: string;
}

interface MeetingEvent {
  id: string;
  sessionId: string;
  type: string;
  triggeredByUserId: string;
  triggeredByUser?: {
    id: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    picture?: string;
  };
  metadata?: Record<string, unknown>;
  createdAt: string;
}

// ─────────────────────────────────────────
// Event Type Configuration Map
// ─────────────────────────────────────────

interface EventConfig {
  icon: React.ElementType;
  color: string; // Tailwind bg-* / text-* prefix
  bgGlow: string; // Tailwind ring/glow color
  labelVi: string;
  labelEn: string;
}

const EVENT_CONFIG: Record<string, EventConfig> = {
  user_joined: {
    icon: LogIn,
    color: "emerald",
    bgGlow: "emerald-400",
    labelVi: "Tham gia cuộc họp",
    labelEn: "Joined meeting",
  },
  user_left: {
    icon: LogOut,
    color: "rose",
    bgGlow: "rose-400",
    labelVi: "Rời khỏi cuộc họp",
    labelEn: "Left meeting",
  },
  screen_share_start: {
    icon: Monitor,
    color: "blue",
    bgGlow: "blue-400",
    labelVi: "Bắt đầu chia sẻ màn hình",
    labelEn: "Started screen sharing",
  },
  screen_share_end: {
    icon: MonitorOff,
    color: "slate",
    bgGlow: "slate-400",
    labelVi: "Dừng chia sẻ màn hình",
    labelEn: "Stopped screen sharing",
  },
  poll_started: {
    icon: BarChart3,
    color: "violet",
    bgGlow: "violet-400",
    labelVi: "Bắt đầu bình chọn",
    labelEn: "Poll started",
  },
  poll_ended: {
    icon: BarChart3,
    color: "slate",
    bgGlow: "slate-400",
    labelVi: "Kết thúc bình chọn",
    labelEn: "Poll ended",
  },
  qa_opened: {
    icon: MessageCircleQuestion,
    color: "amber",
    bgGlow: "amber-400",
    labelVi: "Mở phiên Hỏi & Đáp",
    labelEn: "Q&A session opened",
  },
  qa_closed: {
    icon: MessageCircleQuestion,
    color: "slate",
    bgGlow: "slate-400",
    labelVi: "Đóng phiên Hỏi & Đáp",
    labelEn: "Q&A session closed",
  },
  recording_started: {
    icon: Video,
    color: "red",
    bgGlow: "red-400",
    labelVi: "Bắt đầu ghi hình",
    labelEn: "Recording started",
  },
  recording_stopped: {
    icon: VideoOff,
    color: "slate",
    bgGlow: "slate-400",
    labelVi: "Dừng ghi hình",
    labelEn: "Recording stopped",
  },
  participant_admitted: {
    icon: UserCheck,
    color: "emerald",
    bgGlow: "emerald-400",
    labelVi: "Duyệt vào phòng",
    labelEn: "Admitted from lobby",
  },
  permissions_changed: {
    icon: Shield,
    color: "indigo",
    bgGlow: "indigo-400",
    labelVi: "Thay đổi quyền hạn",
    labelEn: "Permissions changed",
  },
  breakout_started: {
    icon: LayoutGrid,
    color: "cyan",
    bgGlow: "cyan-400",
    labelVi: "Bắt đầu chia phòng",
    labelEn: "Breakout rooms started",
  },
  breakout_ended: {
    icon: LayoutGrid,
    color: "slate",
    bgGlow: "slate-400",
    labelVi: "Kết thúc chia phòng",
    labelEn: "Breakout rooms ended",
  },
  ai_assistant_activated: {
    icon: Bot,
    color: "cyan",
    bgGlow: "cyan-400",
    labelVi: "Bật trợ lý AI ghi âm",
    labelEn: "AI assistant activated",
  },
  ai_assistant_deactivated: {
    icon: BotOff,
    color: "slate",
    bgGlow: "slate-400",
    labelVi: "Tắt trợ lý AI ghi âm",
    labelEn: "AI assistant deactivated",
  },
  ai_summary_generated: {
    icon: Sparkles,
    color: "amber",
    bgGlow: "amber-400",
    labelVi: "Tạo bản tóm tắt AI",
    labelEn: "AI summary generated",
  },
};

const DEFAULT_EVENT_CONFIG: EventConfig = {
  icon: Clock,
  color: "slate",
  bgGlow: "slate-400",
  labelVi: "Sự kiện",
  labelEn: "Event",
};

// ─────────────────────────────────────────
// Color utility – dynamic Tailwind classes
// ─────────────────────────────────────────

function getColorClasses(color: string) {
  const map: Record<
    string,
    {
      bg: string;
      text: string;
      iconBg: string;
      border: string;
      dotBg: string;
      badgeBg: string;
      badgeText: string;
    }
  > = {
    emerald: {
      bg: "bg-emerald-500/10",
      text: "text-emerald-600",
      iconBg: "bg-emerald-500",
      border: "border-emerald-200",
      dotBg: "bg-emerald-500",
      badgeBg: "bg-emerald-50",
      badgeText: "text-emerald-700",
    },
    rose: {
      bg: "bg-rose-500/10",
      text: "text-rose-600",
      iconBg: "bg-rose-500",
      border: "border-rose-200",
      dotBg: "bg-rose-500",
      badgeBg: "bg-rose-50",
      badgeText: "text-rose-700",
    },
    blue: {
      bg: "bg-blue-500/10",
      text: "text-blue-600",
      iconBg: "bg-blue-500",
      border: "border-blue-200",
      dotBg: "bg-blue-500",
      badgeBg: "bg-blue-50",
      badgeText: "text-blue-700",
    },
    violet: {
      bg: "bg-violet-500/10",
      text: "text-violet-600",
      iconBg: "bg-violet-500",
      border: "border-violet-200",
      dotBg: "bg-violet-500",
      badgeBg: "bg-violet-50",
      badgeText: "text-violet-700",
    },
    amber: {
      bg: "bg-amber-500/10",
      text: "text-amber-600",
      iconBg: "bg-amber-500",
      border: "border-amber-200",
      dotBg: "bg-amber-500",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
    },
    red: {
      bg: "bg-red-500/10",
      text: "text-red-600",
      iconBg: "bg-red-500",
      border: "border-red-200",
      dotBg: "bg-red-500",
      badgeBg: "bg-red-50",
      badgeText: "text-red-700",
    },
    cyan: {
      bg: "bg-cyan-500/10",
      text: "text-cyan-600",
      iconBg: "bg-cyan-500",
      border: "border-cyan-200",
      dotBg: "bg-cyan-500",
      badgeBg: "bg-cyan-50",
      badgeText: "text-cyan-700",
    },
    indigo: {
      bg: "bg-indigo-500/10",
      text: "text-indigo-600",
      iconBg: "bg-indigo-500",
      border: "border-indigo-200",
      dotBg: "bg-indigo-500",
      badgeBg: "bg-indigo-50",
      badgeText: "text-indigo-700",
    },
    slate: {
      bg: "bg-slate-500/10",
      text: "text-slate-500",
      iconBg: "bg-slate-400",
      border: "border-slate-200",
      dotBg: "bg-slate-400",
      badgeBg: "bg-slate-50",
      badgeText: "text-slate-600",
    },
  };
  return map[color] || map.slate;
}

// ─────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────

function getUserDisplayName(event: MeetingEvent): string {
  const user = event.triggeredByUser;
  if (user) {
    const first = user.firstName || "";
    const last = user.lastName || "";
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (user.email) return user.email;
  }

  const meta = event.metadata;
  if (meta) {
    if (typeof meta.displayName === "string" && meta.displayName.trim()) {
      return meta.displayName;
    }
    if (typeof meta.email === "string" && meta.email.trim()) {
      return meta.email;
    }
  }

  return "Unknown";
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─────────────────────────────────────────
// Component
// ─────────────────────────────────────────

export const MeetingDiaryTab: React.FC<MeetingDiaryTabProps> = ({
  meetingId,
}) => {
  const { i18n } = useTranslation();
  const isVi = i18n.language === "vi";

  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [visibleCount, setVisibleCount] = useState(15);

  // 1. Fetch sessions
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<any[]>({
    queryKey: ["meeting-sessions", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/sessions`);
      return res.data;
    },
  });

  // Sort sessions: latest first
  const sortedSessions = useMemo(() => {
    if (!sessions) return [];
    return [...sessions].sort(
      (a, b) =>
        new Date(b.createdAt || b.actualStartTime).getTime() -
        new Date(a.createdAt || a.actualStartTime).getTime(),
    );
  }, [sessions]);

  // Sync selectedSessionId with the latest session
  useEffect(() => {
    if (sortedSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sortedSessions[0].id);
    }
  }, [sortedSessions, selectedSessionId]);

  // 2. Fetch events for selected session
  const { data: events, isLoading: isLoadingEvents } = useQuery<MeetingEvent[]>(
    {
      queryKey: ["meeting-events", meetingId, selectedSessionId],
      queryFn: async () => {
        const res = await apiClient.get(`/meetings/${meetingId}/events`, {
          params: { sessionId: selectedSessionId },
        });
        return res.data;
      },
      enabled: !!selectedSessionId,
    },
  );

  // Filter events based on search term
  const filteredEvents = useMemo(() => {
    if (!events) return [];

    return events.filter((event) => {
      const config = EVENT_CONFIG[event.type] || DEFAULT_EVENT_CONFIG;
      const label = isVi ? config.labelVi : config.labelEn;
      const userName = getUserDisplayName(event).toLowerCase();

      // Search term match
      const matchesSearch =
        userName.includes(searchTerm.toLowerCase()) ||
        label.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(event.metadata || {}).toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [events, searchTerm, isVi]);

  // Sort events chronologically (oldest first for timeline top-to-bottom)
  const sortedEvents = useMemo(() => {
    return [...filteredEvents].sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    );
  }, [filteredEvents]);

  // Sliced events for pagination
  const paginatedEvents = useMemo(() => {
    return sortedEvents.slice(0, visibleCount);
  }, [sortedEvents, visibleCount]);

  // Group events by date for clearer visual separation
  const groupedEvents = useMemo(() => {
    const groups: { date: string; events: MeetingEvent[] }[] = [];
    let currentDate = "";

    for (const event of paginatedEvents) {
      const date = formatDate(event.createdAt);
      if (date !== currentDate) {
        currentDate = date;
        groups.push({ date, events: [event] });
      } else {
        groups[groups.length - 1].events.push(event);
      }
    }

    return groups;
  }, [paginatedEvents]);

  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);
  const isSelectedSessionOngoing = selectedSession?.status === "ongoing";

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
                  {isVi ? "Nhật Ký Cuộc Họp" : "Meeting Timeline"}
                </h3>
                <p className="text-xs font-bold text-slate-400 mt-0.5">
                  {isVi
                    ? "Dòng thời gian hoạt động trong phiên"
                    : "Chronological activity log for the session"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Search Input */}
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder={isVi ? "Tìm sự kiện, tên..." : "Search events, names..."}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setVisibleCount(15); // Reset pagination on search
                  }}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 outline-none focus:border-indigo-300 focus:bg-white transition-all placeholder:text-slate-400 shadow-inner"
                />
              </div>

              {isSelectedSessionOngoing && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 shrink-0">
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                  </span>
                  <span className="text-xs font-black text-emerald-700">
                    {isVi ? "Đang diễn ra" : "Live"}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Timeline Content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {isLoadingEvents || isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
                <p className="text-sm font-bold">
                  {isVi ? "Đang tải nhật ký..." : "Loading timeline..."}
                </p>
              </div>
            ) : sortedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 rounded-[2rem] bg-slate-100 flex items-center justify-center text-slate-300 mb-6">
                  <CalendarClock className="h-10 w-10" />
                </div>
                <p className="text-lg font-black text-slate-400">
                  {isVi ? "Chưa có hoạt động nào" : "No activity yet"}
                </p>
                <p className="text-sm font-bold text-slate-300 mt-2 max-w-sm">
                  {isVi
                    ? "Khi cuộc họp diễn ra, các sự kiện sẽ được ghi nhận tại đây."
                    : "Events will be logged here as the meeting progresses."}
                </p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedSessionId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="relative"
                >
                  {groupedEvents.map((group, groupIdx) => (
                    <div key={group.date} className="mb-8 last:mb-0">
                      {/* Date Header */}
                      <div className="flex items-center gap-3 mb-5">
                        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent" />
                        <span className="text-[11px] font-black text-slate-400 tracking-widest uppercase px-3 py-1 rounded-full bg-slate-50 border border-slate-200">
                          {group.date}
                        </span>
                        <div className="h-px flex-1 bg-gradient-to-l from-slate-200 to-transparent" />
                      </div>

                      {/* Event Items */}
                      <div className="space-y-4">
                        {group.events.map((event, eventIdx) => {
                          const config =
                            EVENT_CONFIG[event.type] || DEFAULT_EVENT_CONFIG;
                          const colors = getColorClasses(config.color);
                          const userName = getUserDisplayName(event);
                          const label = isVi ? config.labelVi : config.labelEn;
                          const meta = event.metadata;
                          const avatarUrl = event.triggeredByUser?.picture || (meta?.avatar as string) || (meta?.picture as string);

                          return (
                            <motion.div
                              key={event.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{
                                delay: groupIdx * 0.05 + eventIdx * 0.03,
                                duration: 0.3,
                              }}
                              className="pb-4 last:pb-0 group"
                            >
                              {/* Event Content Card */}
                              <div
                                className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.005]"
                              >
                                <div className="flex items-center justify-between gap-3 flex-wrap">
                                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                                    {/* User Avatar */}
                                    {avatarUrl ? (
                                      <img
                                        src={avatarUrl}
                                        alt={userName}
                                        className="h-6 w-6 rounded-lg object-cover ring-2 ring-white shadow-sm shrink-0"
                                      />
                                    ) : (
                                      <div
                                        className={`h-6 w-6 rounded-lg ${colors.iconBg}/20 flex items-center justify-center shrink-0`}
                                      >
                                        <span
                                          className={`text-[10px] font-black ${colors.text}`}
                                        >
                                          {userName.charAt(0).toUpperCase()}
                                        </span>
                                      </div>
                                    )}

                                    <span className="text-sm font-black text-slate-800 truncate">
                                      {userName}
                                    </span>

                                    {/* Event Badge */}
                                    <span
                                      className={`px-2 py-0.5 rounded-lg text-[11px] font-bold ${colors.badgeBg} ${colors.badgeText} border ${colors.border}`}
                                    >
                                      {label}
                                    </span>
                                  </div>

                                  {/* Timestamp */}
                                  <span className="text-[11px] font-bold text-slate-400 whitespace-nowrap shrink-0">
                                    {formatTime(event.createdAt)}
                                  </span>
                                </div>

                                {/* Metadata Details */}
                                {meta && Object.keys(meta).length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1.5">
                                    {Object.entries(meta)
                                      .filter(([key]) => key !== "displayName" && key !== "email" && key !== "avatar" && key !== "picture" && key !== "timestamp")
                                      .map(([key, value]) => (
                                        <span
                                          key={key}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/60 text-[10px] font-bold text-slate-500 border border-slate-100"
                                        >
                                          <span className="text-slate-400">
                                            {key}:
                                          </span>
                                          <span className="text-slate-600">
                                            {typeof value === "object"
                                              ? JSON.stringify(value)
                                              : String(value)}
                                          </span>
                                        </span>
                                      ),
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  {/* Load More Button */}
                  {sortedEvents.length > visibleCount && (
                    <div className="mt-8 flex items-center justify-center">
                      <button
                        onClick={() => setVisibleCount((prev) => prev + 15)}
                        className="px-5 py-2.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:scale-[1.02] active:scale-95 text-xs font-black rounded-xl transition-all shadow-sm flex items-center gap-2"
                      >
                        <Clock className="h-3.5 w-3.5 text-indigo-500" />
                        <span>
                          {isVi
                            ? `Xem thêm sự kiện (còn ${sortedEvents.length - visibleCount})`
                            : `Load more events (${sortedEvents.length - visibleCount} left)`}
                        </span>
                      </button>
                    </div>
                  )}

                  {/* Event Count Footer */}
                  <div className="mt-6 flex items-center justify-center">
                    <span className="text-[11px] font-bold text-slate-300 tracking-wider">
                      {sortedEvents.length}{" "}
                      {isVi
                        ? sortedEvents.length === 1
                          ? "sự kiện"
                          : "sự kiện"
                        : sortedEvents.length === 1
                          ? "event"
                          : "events"}
                    </span>
                  </div>
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: SESSION PICKER */}
      <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/70 p-5 shadow-2xl backdrop-blur-xl"
        >
          {/* Session Header */}
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="h-10 w-10 rounded-[1rem] bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-sm font-black text-slate-900">
                {isVi ? "Lịch sử phiên họp" : "Sessions History"}
              </h4>
              <p className="text-[10px] font-bold text-slate-400">
                {isVi
                  ? "Chọn phiên để xem nhật ký"
                  : "Select a session to view its diary"}
              </p>
            </div>
          </div>

          {/* Session List */}
          <div className="space-y-2 max-h-[480px] overflow-y-auto custom-scrollbar">
            {isLoadingSessions ? (
              <div className="flex flex-col items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />
                <p className="text-xs font-bold">
                  {isVi ? "Đang tải..." : "Loading..."}
                </p>
              </div>
            ) : sortedSessions.length === 0 ? (
              <div className="text-xs font-bold text-slate-400 py-6 text-center">
                {isVi ? "Không có phiên họp" : "No sessions found"}
              </div>
            ) : (
              sortedSessions.map((session, idx) => {
                const isSelected = selectedSessionId === session.id;
                const dateStr = session.actualStartTime
                  ? new Date(session.actualStartTime).toLocaleDateString([], {
                      day: "2-digit",
                      month: "2-digit",
                    })
                  : "";
                const timeStr = session.actualStartTime
                  ? new Date(session.actualStartTime).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "";
                const isOngoing = session.status === "ongoing";

                return (
                  <button
                    key={session.id}
                    onClick={() => setSelectedSessionId(session.id)}
                    className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 border ${
                      isSelected
                        ? "bg-gradient-to-r from-indigo-500/10 to-cyan-500/10 border-indigo-500/20 text-slate-900 shadow-sm"
                        : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                    }`}
                  >
                    <div
                      className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? "bg-indigo-500 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <FileText className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-black truncate">
                          {isVi
                            ? `Phiên #${sortedSessions.length - idx}`
                            : `Session #${sortedSessions.length - idx}`}
                        </p>
                        {isOngoing && (
                          <span className="flex h-2 w-2 relative shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                        {dateStr} {timeStr}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </motion.div>

        {/* Stats Card */}
        {sortedEvents.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-[2.5rem] border border-white/80 bg-white/70 p-5 shadow-2xl backdrop-blur-xl"
          >
            <h4 className="text-xs font-black text-slate-400 tracking-wider mb-4">
              {isVi ? "Thống kê phiên" : "Session Stats"}
            </h4>

            <div className="grid grid-cols-2 gap-3">
              {(() => {
                const joinCount = sortedEvents.filter(
                  (e) => e.type === "user_joined",
                ).length;
                const leaveCount = sortedEvents.filter(
                  (e) => e.type === "user_left",
                ).length;
                const admitCount = sortedEvents.filter(
                  (e) => e.type === "participant_admitted",
                ).length;
                const aiCount = sortedEvents.filter(
                  (e) =>
                    e.type === "ai_assistant_activated" ||
                    e.type === "ai_summary_generated",
                ).length;

                const stats = [
                  {
                    label: isVi ? "Tham gia" : "Joins",
                    value: joinCount,
                    color: "emerald",
                  },
                  {
                    label: isVi ? "Rời đi" : "Leaves",
                    value: leaveCount,
                    color: "rose",
                  },
                  {
                    label: isVi ? "Duyệt vào" : "Admitted",
                    value: admitCount,
                    color: "cyan",
                  },
                  {
                    label: isVi ? "Hoạt động AI" : "AI Events",
                    value: aiCount,
                    color: "amber",
                  },
                ];

                return stats.map((stat) => {
                  const colors = getColorClasses(stat.color);
                  return (
                    <div
                      key={stat.label}
                      className={`p-3 rounded-2xl ${colors.bg} border ${colors.border} text-center`}
                    >
                      <p className={`text-2xl font-black ${colors.text}`}>
                        {stat.value}
                      </p>
                      <p className="text-[12px] font-extrabold text-slate-500 mt-1">
                        {stat.label}
                      </p>
                    </div>
                  );
                });
              })()}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
