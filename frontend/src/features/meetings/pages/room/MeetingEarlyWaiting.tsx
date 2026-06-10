import React from "react";
import { motion } from "framer-motion";
import { Calendar, Clock, RefreshCw, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "react-hot-toast";

interface MeetingEarlyWaitingProps {
  countdownText: string;
  formattedStartTime: string;
  isLoading: boolean;
  onCheckAgain: () => void;
  onBackToDashboard: () => void;
}

const MeetingEarlyWaiting: React.FC<MeetingEarlyWaitingProps> = ({
  countdownText,
  formattedStartTime,
  isLoading,
  onCheckAgain,
  onBackToDashboard,
}) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6 text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl overflow-hidden rounded-[3.5rem] border border-white/10 bg-[#0a0a0b]/80 p-12 text-center shadow-2xl backdrop-blur-2xl"
      >
        {/* Ambient glows */}
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-[100px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-[100px]" />

        <div className="relative z-10 flex flex-col items-center">
          {/* Clock Icon Container */}
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 border border-white/10 relative">
            <div className="absolute inset-0 rounded-[2.5rem] border-2 border-cyan-500/20 animate-pulse" />
            <Clock className="h-10 w-10 text-cyan-400" />
          </div>

          {/* Title & Subtitle */}
          <h1 className="text-4xl font-black tracking-tight text-white mb-3">
            {t("meeting.not_started.title")}
          </h1>
          <p className="text-slate-400 font-medium leading-relaxed max-w-md mx-auto mb-8">
            {t("meeting.not_started.subtitle")}
          </p>

          {/* Countdown block */}
          <div className="w-full rounded-3xl bg-white/5 border border-white/5 p-6 mb-8 backdrop-blur-md">
            <span className="text-[12px] uppercase tracking-widest font-black text-cyan-400 block mb-2">
              {t("meeting.not_started.starts_in", { duration: "" }).replace(/:/g, "").trim()}
            </span>
            <div className="text-5xl font-mono font-black tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-indigo-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.3)]">
              {countdownText}
            </div>
          </div>

          {/* Scheduled time */}
          <div className="flex items-center gap-3 px-6 py-4.5 rounded-2xl bg-white/5 border border-white/5 mb-10 w-full justify-center">
            <Calendar className="h-5 w-5 text-indigo-400 shrink-0" />
            <span className="text-sm font-semibold text-slate-300">
              {t("meeting.not_started.scheduled_time", { time: formattedStartTime })}
            </span>
          </div>

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full">
            <button
              onClick={() => {
                onCheckAgain();
                toast.success(t("common.loading") || "Loading...");
              }}
              disabled={isLoading}
              className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 px-8 py-4 text-sm font-black text-white transition-all shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/20 active:scale-95 disabled:opacity-50 w-full sm:w-auto"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              {t("meeting.not_started.check_again")}
            </button>
            <button
              onClick={onBackToDashboard}
              className="flex items-center justify-center gap-2 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 px-8 py-4 text-sm font-black text-slate-300 hover:text-white transition-all active:scale-95 w-full sm:w-auto"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("meeting.not_started.back_to_dashboard")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MeetingEarlyWaiting;
