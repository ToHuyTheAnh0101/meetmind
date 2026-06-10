import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Clock, CalendarClock, LogIn, LogOut } from "lucide-react";
import { Meeting } from "@/types/api";
import { formatDateTime, formatDuration } from "../../../utils/formatters";

interface TimelineSummaryCardProps {
  meetingStatus: Meeting | null | undefined;
  durationMs: number;
  isVi: boolean;
}

export const TimelineSummaryCard: React.FC<TimelineSummaryCardProps> = ({
  meetingStatus,
  durationMs,
  isVi,
}) => {
  const { t } = useTranslation();
  if (!meetingStatus) return null;

  const actualStartTime = (meetingStatus as any).actualStartTime;
  const actualEndTime = (meetingStatus as any).actualEndTime;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 }}
      className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-2xl backdrop-blur-xl"
    >
      <h4 className="text-xs font-black text-slate-400 tracking-wider mb-5 flex items-center gap-2">
        <Clock className="h-4 w-4 text-indigo-500" />
        {t("meeting.diary.timeline_title", "MỐC THỜI GIAN THỰC TẾ")}
      </h4>

      <div className="space-y-4">
        {/* Scheduled Start */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 border border-indigo-100">
            <CalendarClock className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
              {t("meeting.diary.scheduled_start", "Giờ lên lịch dự kiến")}
            </p>
            <p className="text-sm font-black text-slate-700 mt-0.5">
              {formatDateTime(meetingStatus.startTime, isVi)}
            </p>
          </div>
        </div>

        {/* Actual Start */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-100">
            <LogIn className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
              {t("meeting.diary.actual_start", "Bắt đầu thực tế")}
            </p>
            <p className="text-sm font-black text-slate-700 mt-0.5">
              {actualStartTime ? (
                formatDateTime(actualStartTime, isVi)
              ) : (
                <span className="text-slate-400 font-semibold italic">
                  {t("meeting.diary.not_started_yet", "Chưa bắt đầu")}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Actual End */}
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 border border-rose-100">
            <LogOut className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
              {t("meeting.diary.actual_end", "Kết thúc thực tế")}
            </p>
            <p className="text-sm font-black text-slate-700 mt-0.5">
              {actualEndTime ? (
                formatDateTime(actualEndTime, isVi)
              ) : meetingStatus.status === "ongoing" ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-600 border border-emerald-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {t("meeting.diary.live_status", "Đang diễn ra")}
                </span>
              ) : (
                <span className="text-slate-400 font-semibold italic">
                  {t("meeting.diary.not_ended_yet", "--")}
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Total Duration */}
        <div className="mt-2 pt-4 border-t border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-slate-400 tracking-wide uppercase">
              {t("meeting.diary.total_duration", "Tổng thời lượng")}
            </p>
            <p className="text-base font-black text-slate-800 mt-0.5">
              {actualStartTime ? (
                formatDuration(durationMs, isVi)
              ) : (
                <span className="text-slate-400 font-semibold italic">--</span>
              )}
            </p>
          </div>
          {meetingStatus.status === "ongoing" && actualStartTime && (
            <span className="text-[10px] font-bold text-slate-400 animate-pulse bg-slate-50 border border-slate-100 rounded-lg px-2 py-1">
              {t("meeting.diary.updating_live", "Cập nhật trực tiếp")}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
};
