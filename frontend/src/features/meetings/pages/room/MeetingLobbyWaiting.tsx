import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

interface MeetingLobbyWaitingProps {
  onCancel: () => void;
}

const UsersIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="lucide lucide-users"
  >
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

const MeetingLobbyWaiting: React.FC<MeetingLobbyWaitingProps> = ({ onCancel }) => {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-xl overflow-hidden rounded-[3.5rem] border border-white/20 bg-[#0a0a0b] p-12 text-center shadow-2xl"
      >
        <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
        
        <div className="relative z-10 flex flex-col items-center">
          <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 border border-white/10 relative">
            <div className="absolute inset-0 rounded-[2.5rem] border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
            <UsersIcon />
          </div>
          <h1 className="text-4xl font-black tracking-tight text-white mb-4">
            {t("meeting.permission_pending")}
          </h1>
          <p className="text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
            {t("meeting.host_notified")}
            <br />
            <span className="text-white font-bold">
              {t("meeting.stay_on_page")}
            </span>{" "}
            {t("meeting.securing_entry")}
          </p>
          <div className="mt-12 flex flex-col items-center gap-6">
            <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
              <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
              <span className="text-[14px] font-black text-cyan-400">
                {t("meeting.requesting_admittance")}
              </span>
            </div>
            <button
              onClick={onCancel}
              className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
            >
              {t("meeting.cancel_request")}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default MeetingLobbyWaiting;
