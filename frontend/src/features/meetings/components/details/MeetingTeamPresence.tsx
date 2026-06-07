import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Search, Loader2, Users } from "lucide-react";
import { MeetingPermission } from "@/types/api";

interface MeetingTeamPresenceProps {
  searchTerm: string;
  setSearchTerm: (val: string) => void;
  filteredParticipants: any[];
  handleScroll: (e: React.UIEvent<HTMLDivElement>) => void;
  isFetchingNextPage: boolean;
}

export const MeetingTeamPresence: React.FC<MeetingTeamPresenceProps> = ({
  searchTerm,
  setSearchTerm,
  filteredParticipants,
  handleScroll,
  isFetchingNextPage,
}) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/80"
    >
      <div className="absolute top-0 right-0 p-6 opacity-[0.03] rotate-12">
        <Users className="h-32 w-32" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {t("meeting.team_presence")}
          </h3>
          <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">
            {filteredParticipants.length}
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm kiếm thành viên..."
            className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:border-slate-200 focus:bg-white transition-all outline-none text-slate-900"
          />
        </div>

        <div
          className="space-y-6 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar"
          onScroll={handleScroll}
        >
          {filteredParticipants.length > 0 ? (
            <>
              {filteredParticipants.map((p: any, idx: number) => (
                <div
                  key={p.id || idx}
                  className="flex items-center justify-between group"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative h-12 w-12 rounded-2xl border-2 border-white/80 overflow-hidden shadow-sm group-hover:border-slate-200 transition-colors bg-slate-100">
                      <img
                        src={
                          p.user?.picture ||
                          p.user?.profilePictureUrl ||
                          `https://ui-avatars.com/api/?name=${p.user?.firstName}+${p.user?.lastName}&background=random`
                        }
                        className="h-full w-full object-cover"
                        alt=""
                      />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">
                        {p.user?.firstName} {p.user?.lastName}
                      </p>
                      <p className="text-[11px] font-black text-slate-400">
                        {p.isOrganizer
                          ? t("meeting.host")
                          : p.permissions?.includes(MeetingPermission.CO_HOST)
                          ? t("meeting.permissions.list.co_host.label")
                          : t("meeting.member")}
                      </p>
                    </div>
                  </div>
                  <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                </div>
              ))}
              {isFetchingNextPage && (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              )}
            </>
          ) : (
            <div className="py-10 text-center">
              <p className="text-sm font-bold text-slate-400">
                Không tìm thấy thành viên
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
