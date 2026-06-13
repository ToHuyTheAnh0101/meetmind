import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MeetLog } from "../../../types";

interface StatsCardProps {
  logs: MeetLog[];
}

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
      dotBg: "bg-rose-505",
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
      iconBg: "bg-red-505",
      border: "border-red-200",
      dotBg: "bg-red-505",
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
      text: "text-slate-550",
      iconBg: "bg-slate-400",
      border: "border-slate-200",
      dotBg: "bg-slate-400",
      badgeBg: "bg-slate-50",
      badgeText: "text-slate-600",
    },
  };
  return map[color] || map.slate;
}

export const StatsCard: React.FC<StatsCardProps> = ({ logs }) => {
  const { t } = useTranslation();

  if (logs.length === 0) return null;

  const joinCount = logs.filter((l) => l.type === "user_joined").length;
  const leaveCount = logs.filter((l) => l.type === "user_left").length;
  const admitCount = logs.filter((l) => l.type === "participant_admitted").length;
  const aiCount = logs.filter(
    (l) => l.type === "ai_assistant_activated" || l.type === "ai_summary_generated"
  ).length;

  const stats = [
    {
      label: t("meeting.diary.joins"),
      value: joinCount,
      color: "emerald",
    },
    {
      label: t("meeting.diary.leaves"),
      value: leaveCount,
      color: "rose",
    },
    {
      label: t("meeting.diary.admitted"),
      value: admitCount,
      color: "cyan",
    },
    {
      label: t("meeting.diary.ai_events"),
      value: aiCount,
      color: "amber",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-[2.5rem] border border-white/80 bg-white/70 p-5 shadow-2xl backdrop-blur-xl"
    >
      <h4 className="text-xs font-black text-slate-400 tracking-wider mb-4">
        {t("meeting.diary.stats_title")}
      </h4>

      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => {
          const colors = getColorClasses(stat.color);
          return (
            <div
              key={stat.label}
              className={`p-3 rounded-2xl ${colors.bg} border ${colors.border} text-center`}
            >
              <p className={`text-2xl font-black ${colors.text}`}>{stat.value}</p>
              <p className="text-[12px] font-extrabold text-slate-500 mt-1">
                {stat.label}
              </p>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};
