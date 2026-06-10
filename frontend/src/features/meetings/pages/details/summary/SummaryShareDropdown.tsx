import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, X, Trash2, Loader2 } from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";

interface SummaryShareDropdownProps {
  meetingId: string;
  canEdit: boolean;
  theme: any;
  meetingDetail: any;
}

const getEmailColor = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 70%, 93%)`;
};

const getEmailTextColor = (email: string) => {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = email.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  return `hsl(${h}, 80%, 35%)`;
};

export const SummaryShareDropdown: React.FC<SummaryShareDropdownProps> = ({
  meetingId,
  canEdit,
  theme,
  meetingDetail,
}) => {
  const { t } = useTranslation();
  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const [dropdownMode, setDropdownMode] = useState<"list" | "share">("list");
  const [shareEmailInput, setShareEmailInput] = useState("");
  const [shareError, setShareError] = useState("");
  const [shareSearchQuery, setShareSearchQuery] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close share dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsShareDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Reset query on close
  useEffect(() => {
    if (!isShareDropdownOpen) {
      setShareSearchQuery("");
      setShareEmailInput("");
      setShareError("");
    }
  }, [isShareDropdownOpen]);

  // Fetch meeting shares
  const { data: shareData, refetch: refetchShares } = useQuery<{
    defaultEmails: Array<{ email: string; firstName: string | null; lastName: string | null; avatarUrl: string | null }>;
    sharedShares: Array<{ id: string; email: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; createdAt?: string }>;
  }>({
    queryKey: ["meeting-shares", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/shares`);
      return res.data;
    },
  });

  // Add share mutation
  const addShareMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiClient.post(`/meetings/${meetingId}/shares`, { email });
      return res.data;
    },
    onSuccess: () => {
      setShareEmailInput("");
      setShareError("");
      refetchShares();
    },
    onError: (err: any) => {
      const errMsg = err?.response?.data?.message || err?.message || "Error sharing access";
      setShareError(errMsg);
    },
  });

  // Remove share mutation
  const removeShareMutation = useMutation({
    mutationFn: async (shareIdOrEmail: string) => {
      await apiClient.delete(`/meetings/${meetingId}/shares/${shareIdOrEmail}`);
    },
    onSuccess: () => {
      refetchShares();
    },
    onError: (err: any) => {
      console.error("Failed to revoke access:", err);
    },
  });

  const getEmailRole = (email: string) => {
    const normalizedEmail = email.toLowerCase().trim();
    if (normalizedEmail === meetingDetail?.organizer?.email?.toLowerCase().trim()) {
      return {
        text: t("meeting.summary_tab.roles.organizer"),
        badge: "bg-cyan-50 text-cyan-700 border border-cyan-100",
      };
    }
    const isParticipant = (meetingDetail?.participants || []).some(
      (p: any) => p.user?.email?.toLowerCase().trim() === normalizedEmail
    );
    if (isParticipant) {
      return {
        text: t("meeting.summary_tab.roles.joined"),
        badge: "bg-emerald-50 text-emerald-700 border border-emerald-100",
      };
    }
    const isInvitee = (meetingDetail?.inviteeEmails || [])
      .map((e: string) => e.toLowerCase().trim())
      .includes(normalizedEmail);
    if (isInvitee) {
      return {
        text: t("meeting.summary_tab.roles.invited"),
        badge: "bg-amber-50 text-amber-700 border border-amber-100",
      };
    }
    return {
      text: t("meeting.summary_tab.roles.member"),
      badge: "bg-slate-100 text-slate-600 border border-slate-200",
    };
  };

  const peopleCount = shareData
    ? shareData.defaultEmails.length + shareData.sharedShares.length
    : 0;

  return (
    <div className="flex items-center gap-3 relative self-end sm:self-auto" ref={dropdownRef}>
      {/* Dropdown Button showing Users Icon & Count */}
      <button
        onClick={() => {
          if (isShareDropdownOpen && dropdownMode === "list") {
            setIsShareDropdownOpen(false);
          } else {
            setDropdownMode("list");
            setIsShareDropdownOpen(true);
          }
        }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 transition-all font-bold text-xs shadow-sm hover:border-slate-300"
        title={t("meeting.summary_tab.access_list")}
      >
        <Users className="h-4 w-4 text-slate-500" />
        <span className="text-slate-800">
          {t("meeting.summary_tab.people_count", { count: peopleCount })}
        </span>
      </button>

      {/* Share Button (Only if canEdit is true) */}
      {canEdit && (
        <button
          onClick={() => {
            if (isShareDropdownOpen && dropdownMode === "share") {
              setIsShareDropdownOpen(false);
            } else {
              setDropdownMode("share");
              setIsShareDropdownOpen(true);
            }
          }}
          className={`px-3 py-2 flex items-center justify-center rounded-xl text-white bg-gradient-to-r ${theme?.colors?.bgGradient || "from-cyan-500 to-indigo-500"} hover:scale-[1.03] active:scale-95 transition-all font-black text-xs gap-1.5 shadow-md shadow-indigo-100`}
        >
          <Plus className="h-4 w-4" />
          <span>{t("meeting.summary_tab.share")}</span>
        </button>
      )}

      {/* Unified Share & Access List Dropdown */}
      <AnimatePresence>
        {isShareDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 rounded-[1.5rem] border border-slate-100 bg-white p-4 shadow-2xl z-50 overflow-hidden"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-3">
              <h4 className="text-xs font-black text-slate-800 tracking-wider">
                {dropdownMode === "share"
                  ? t("meeting.summary_tab.share_access")
                  : t("meeting.summary_tab.session_access")}
              </h4>
              <button
                onClick={() => setIsShareDropdownOpen(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Search Input (Only show in 'list' mode) */}
            {dropdownMode === "list" && (
              <div className="mb-3">
                <input
                  type="text"
                  value={shareSearchQuery}
                  onChange={(e) => setShareSearchQuery(e.target.value)}
                  placeholder={t("meeting.summary_tab.search_email")}
                  className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-colors bg-slate-50 font-bold shadow-inner"
                />
              </div>
            )}

            {/* Add share form (Only if canEdit is true and mode is share) */}
            {canEdit && dropdownMode === "share" && (
              <div className="mb-4 space-y-1.5 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-1.5">
                  <input
                    type="email"
                    value={shareEmailInput}
                    onChange={(e) => setShareEmailInput(e.target.value)}
                    placeholder={t("meeting.summary_tab.enter_email")}
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-xl outline-none focus:border-cyan-500 transition-colors bg-slate-50 font-bold"
                  />
                  <button
                    onClick={() => {
                      if (shareEmailInput.trim()) {
                        addShareMutation.mutate(shareEmailInput.trim());
                      }
                    }}
                    disabled={addShareMutation.isPending || !shareEmailInput.trim()}
                    className={`px-3 py-2 rounded-xl text-white font-black text-xs bg-gradient-to-r ${theme?.colors?.bgGradient || "from-cyan-500 to-indigo-500"} disabled:opacity-50 flex items-center justify-center shrink-0 min-w-[60px]`}
                  >
                    {addShareMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      t("meeting.summary_tab.add")
                    )}
                  </button>
                </div>
                {shareError && (
                  <p className="text-[10px] font-bold text-rose-500 leading-tight mt-1">
                    {shareError}
                  </p>
                )}
              </div>
            )}

            {/* List of people with access */}
            <div className="max-h-60 overflow-y-auto space-y-2 custom-scrollbar pr-1">
              {/* Default Access List (Only show in 'list' mode) */}
              {dropdownMode === "list" &&
                (shareData?.defaultEmails || [])
                  .filter((item) => item.email.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                  .map((item) => {
                    const role = getEmailRole(item.email);
                    const emailColor = getEmailColor(item.email);
                    const emailTextColor = getEmailTextColor(item.email);
                    const hasName = !!(item.firstName || item.lastName);
                    const displayName = hasName
                      ? `${item.firstName || ""} ${item.lastName || ""}`.trim()
                      : item.email;

                    return (
                      <div key={item.email} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {item.avatarUrl ? (
                            <img
                              src={item.avatarUrl}
                              alt={displayName}
                              className="h-8 w-8 rounded-full object-cover shadow-sm shrink-0"
                            />
                          ) : (
                            <div
                              className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-sm"
                              style={{ backgroundColor: emailColor, color: emailTextColor }}
                            >
                              {hasName
                                ? (item.firstName || item.lastName || "?").charAt(0)
                                : item.email.charAt(0)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-xs font-bold text-slate-700 truncate">{displayName}</span>
                              <span className={`inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${role.badge}`}>
                                {role.text}
                              </span>
                            </div>
                            {hasName && (
                              <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{item.email}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

              {/* Explicitly Shared List */}
              {(shareData?.sharedShares || [])
                .filter((share) => share.email.toLowerCase().includes(shareSearchQuery.toLowerCase()))
                .map((share) => {
                  const emailColor = getEmailColor(share.email);
                  const emailTextColor = getEmailTextColor(share.email);
                  const hasName = !!(share.firstName || share.lastName);
                  const displayName = hasName
                    ? `${share.firstName || ""} ${share.lastName || ""}`.trim()
                    : share.email;

                  return (
                    <div key={share.id} className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {share.avatarUrl ? (
                          <img
                            src={share.avatarUrl}
                            alt={displayName}
                            className="h-8 w-8 rounded-full object-cover shadow-sm shrink-0"
                          />
                        ) : (
                          <div
                            className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-black uppercase shrink-0 shadow-sm"
                            style={{ backgroundColor: emailColor, color: emailTextColor }}
                          >
                            {hasName
                              ? (share.firstName || share.lastName || "?").charAt(0)
                              : share.email.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-bold text-slate-700 truncate">{displayName}</span>
                            <span className="inline-block text-[9px] font-black px-1.5 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                              {t("meeting.summary_tab.shared")}
                            </span>
                          </div>
                          {hasName && (
                            <p className="text-[10px] font-bold text-slate-400 mt-0.5 truncate">{share.email}</p>
                          )}
                        </div>
                      </div>
                      {canEdit && (
                        <button
                          onClick={() => removeShareMutation.mutate(share.id)}
                          className="text-slate-400 hover:text-rose-500 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                          title={t("meeting.summary_tab.revoke_access")}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}

              {dropdownMode === "share" &&
                (shareData?.sharedShares || []).filter((share) =>
                  share.email.toLowerCase().includes(shareSearchQuery.toLowerCase())
                ).length === 0 && (
                  <p className="text-[10px] font-bold text-slate-400 text-center py-4">
                    {t("meeting.summary_tab.not_shared")}
                  </p>
                )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
