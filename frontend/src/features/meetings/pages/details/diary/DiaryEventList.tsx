import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
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
  Clock,
} from "lucide-react";
import { MeetingEvent, EventConfig } from "../../../types";
import { getUserDisplayName, formatTime } from "../../../utils/formatters";

interface DiaryEventListProps {
  groupedEvents: { date: string; events: MeetingEvent[] }[];
  isVi: boolean;
  templates: any[];
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
      dotBg: "bg-blue-505",
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

const renderMetadataItem = (key: string, value: unknown, t: any, templates: any[]) => {
  const displayKey = t(`meeting.diary.metadata.${key}`, key);
  let displayValue = typeof value === "object" ? JSON.stringify(value) : String(value);

  if (key === "templateId") {
    if (displayValue === "default") {
      displayValue = t("meeting.diary.metadata.default", "Default");
    } else {
      const template = templates.find((temp: any) => temp.id === displayValue);
      if (template) {
        displayValue = template.name;
      }
    }
  }

  return { key: displayKey, value: displayValue };
};

export const DiaryEventList: React.FC<DiaryEventListProps> = ({
  groupedEvents,
  isVi,
  templates,
}) => {
  const { t } = useTranslation();

  return (
    <>
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
              const config = EVENT_CONFIG[event.type] || DEFAULT_EVENT_CONFIG;
              const colors = getColorClasses(config.color);
              const userName = getUserDisplayName(event);
              const label = isVi ? config.labelVi : config.labelEn;
              const meta = event.metadata;
              const avatarUrl =
                event.triggeredByUser?.picture ||
                (meta?.avatar as string) ||
                (meta?.picture as string);

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
                  <div className="p-3.5 rounded-2xl bg-white/80 border border-slate-100 transition-all duration-200 group-hover:shadow-md group-hover:scale-[1.005]">
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
                            <span className={`text-[10px] font-black ${colors.text}`}>
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
                          .filter(
                            ([key]) =>
                              key !== "displayName" &&
                              key !== "email" &&
                              key !== "avatar" &&
                              key !== "picture" &&
                              key !== "timestamp"
                          )
                          .map(([key, value]) => {
                            const prettified = renderMetadataItem(
                              key,
                              value,
                              t,
                              templates
                            );
                            return (
                              <span
                                key={key}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/60 text-[10px] font-bold text-slate-500 border border-slate-100"
                              >
                                <span className="text-slate-400">
                                  {prettified.key}:
                                </span>
                                <span className="text-slate-600">
                                  {prettified.value}
                                </span>
                              </span>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      ))}
    </>
  );
};
