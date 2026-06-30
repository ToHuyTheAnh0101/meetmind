import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, Trash2, AlertCircle, Settings, Sparkles, History, BarChart2 } from "lucide-react";
import {
  useQuery,
  useMutation,
  useQueryClient,
  useInfiniteQuery,
} from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { Meeting, MeetingPermission, MeetingAccessType } from "@/types/api";
import { useTimeTheme } from "@/hooks/useTimeTheme";
import { useAuth } from "@/features/auth/AuthContext";
import {
  generateDefaultMeetingTitle,
  getOrganizerDisplayName,
} from "@/lib/meetingTitleHelper";

// --- Subcomponents ---
import { MeetingPollsQaTab } from "./polls_qa/MeetingPollsQaTab";
import { MeetingSummaryTab } from "./summary/MeetingSummaryTab";
import { MeetingDiaryTab } from "./diary/MeetingDiaryTab";
import { MeetingGeneralForm } from "./MeetingGeneralForm";
import { MeetingControlCenter } from "./permissions/MeetingControlCenter";
import { MeetingTeamPresence } from "./permissions/MeetingTeamPresence";

const MeetingDetailsPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === "vi";
  const theme = useTimeTheme();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const { user } = useAuth();
  const isNew = location.pathname === "/meetings/new";
  const [copied, setCopied] = useState(false);
  const [isInstant, setIsInstant] = useState(true);
  const [activeTab, setActiveTab] = useState<"general" | "polls_qa" | "summary" | "diary">("general");

  const [formData, setFormData] = useState<{
    title: string;
    description: string;
    startTime: string;
    accessType: MeetingAccessType;
    waitingRoomEnabled: boolean;
    muteOnJoin: boolean;
    allowDisplayNameEdit: boolean;
    inviteeEmails: string[];
    reminderMinutes: number;
    password: string;
    templateId: string;
  }>({
    title: "",
    description: "",
    startTime: "",
    accessType: "public",
    waitingRoomEnabled: false,
    muteOnJoin: false,
    allowDisplayNameEdit: true,
    inviteeEmails: [],
    reminderMinutes: 10,
    password: "",
    templateId: "",
  });

  // Compute default title preview based on startTime
  const previewDefaultTitle = React.useMemo(() => {
    try {
      const timeToUse = formData.startTime || new Date().toISOString();
      const startDate = new Date(timeToUse);
      const organizerName = user
        ? getOrganizerDisplayName(user.firstName, user.lastName)
        : "";
      return generateDefaultMeetingTitle(startDate, organizerName, i18n.language);
    } catch {
      return null;
    }
  }, [formData.startTime, user, i18n.language]);

  const [initialData, setInitialData] = useState<string>("");
  const [isDirty, setIsDirty] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [conflictContext, setConflictContext] = useState<any>(null);
  const [isCheckingConflict, setIsCheckingConflict] = useState(false);

  // Track if data has changed
  useEffect(() => {
    if (initialData) {
      const currentData = JSON.stringify({
        ...formData,
      });
      setIsDirty(currentData !== initialData);
    }
  }, [formData, initialData]);

  // Browser Warning on Unsaved Changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Real-time Conflict Check
  useEffect(() => {
    if (!formData.startTime || isInstant) {
      setConflictContext(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsCheckingConflict(true);
      try {
        const response = await apiClient.get("/meetings/check-conflict", {
          params: {
            time: new Date(formData.startTime).toISOString(),
            currentMeetingId: id,
          },
        });
        setConflictContext(response.data);
      } catch (error) {
        console.error("Failed to check conflict:", error);
      } finally {
        setIsCheckingConflict(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [formData.startTime, isInstant, id]);

  // 1. Fetch Meeting Details
  const { data: meeting, isLoading, isError, error: queryError } = useQuery({
    queryKey: ["meeting", id],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${id}`);
      return response.data as Meeting;
    },
    enabled: !!id && !isNew,
  });

  // Fetch available tóm tắt templates
  const { data: templates = [] } = useQuery<any[]>({
    queryKey: ["summary-templates"],
    queryFn: async () => {
      const response = await apiClient.get("/summary-templates");
      return response.data;
    },
  });

  const isCompleted = meeting?.status === "completed";
  const isOngoing = meeting?.status === "ongoing";
  const isOrganizer = isNew || (meeting && meeting.organizerId === user?.id);
  const isCoHost = React.useMemo(() => {
    if (!meeting || !user) return false;
    return meeting.participants?.find((p) => p.userId === user.id)?.permissions?.includes(MeetingPermission.CO_HOST);
  }, [meeting, user]);

  const canEdit = !!(isOrganizer || isCoHost);

  const tabConfig = [
    { id: "general" as const, label: t("meeting.permissions.tab_general"), icon: Settings },
    { id: "polls_qa" as const, label: isVi ? "Biểu quyết & Hỏi đáp" : "Polls & Q&A", icon: BarChart2 },
    { id: "summary" as const, label: t("meeting.permissions.tab_summary"), icon: Sparkles },
    { id: "diary" as const, label: t("meeting.permissions.tab_diary"), icon: History },
  ];

  // 2. Fetch Paginated Participants (Infinite Scroll)
  const {
    data: participantsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<any>({
    queryKey: ["participants", id],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/meetings/${id}/participants`, {
        params: { page: pageParam, limit: 10 },
      });
      return response.data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    enabled: !!id && !isNew,
  });

  const allParticipants = participantsData?.pages.flatMap((page: any) => page.items) || [];

  const filteredParticipants = allParticipants.filter((p) => {
    const fullName = `${p.user?.firstName} ${p.user?.lastName}`.toLowerCase();
    return fullName.includes(searchTerm.toLowerCase());
  });

  // 2. Initialize form data when meeting is loaded
  useEffect(() => {
    if (meeting && !isNew) {
      const start = new Date(meeting.startTime);
      const localISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);

      const loadedData = {
        title: meeting.title,
        description: meeting.description || "",
        startTime: localISO,
        accessType: meeting.accessType || "public",
        waitingRoomEnabled: !!meeting.waitingRoomEnabled,
        muteOnJoin: !!meeting.muteOnJoin,
        allowDisplayNameEdit: meeting.allowDisplayNameEdit ?? true,
        inviteeEmails: meeting.inviteeEmails || [],
        reminderMinutes: meeting.reminderMinutes || 10,
        password: meeting.password || "",
        templateId: meeting.templateId || "",
      };

      setFormData(loadedData);
      setInitialData(JSON.stringify(loadedData));
      setIsInstant(false);
    } else if (isNew) {
      setInitialData(JSON.stringify(formData));
      setIsInstant(true);
    }
  }, [meeting, isNew]);

  // Auto-fill title with default title for new meetings when preview is ready
  useEffect(() => {
    if (isNew && previewDefaultTitle) {
      setFormData((prev) => {
        if (prev.title !== previewDefaultTitle) {
          return { ...prev, title: previewDefaultTitle };
        }
        return prev;
      });
    }
  }, [isNew, previewDefaultTitle]);

  // 3. Create or Update Mutation
  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const start = isInstant ? new Date() : new Date(data.startTime);

      const payload = {
        title: data.title,
        description: data.description,
        startTime: start.toISOString(),
        accessType: data.accessType,
        waitingRoomEnabled: data.waitingRoomEnabled,
        muteOnJoin: data.muteOnJoin,
        allowDisplayNameEdit: data.allowDisplayNameEdit,
        inviteeEmails: data.inviteeEmails,
        reminderMinutes: data.reminderMinutes,
        password: data.password,
        templateId: data.templateId || null,
      };

      if (isNew) {
        return apiClient.post("/meetings", payload);
      } else {
        return apiClient.put(`/meetings/${id}`, payload);
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      queryClient.invalidateQueries({ queryKey: ["meeting", id] });

      const updatedFormData = { ...formData };
      setFormData(updatedFormData);
      setInitialData(JSON.stringify(updatedFormData));
      setIsDirty(false);

      if (isInstant && isNew) {
        navigate(`/room/${res.data.id}`);
      } else if (isNew) {
        navigate("/meetings");
      }
    },
  });

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      navigate("/meetings");
    },
  });

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteConfirm = () => {
    deleteMutation.mutate();
    setShowDeleteConfirm(false);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  };

  if (isLoading && !isNew) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-500" />
      </div>
    );
  }

  const isForbidden = (queryError as any)?.response?.status === 403;

  if (isForbidden && !isNew) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">
          {t("meeting.access_denied")}
        </h2>
        <p className="text-slate-500 mt-2">
          {isVi
            ? "Bạn không có quyền truy cập vào nội dung chi tiết của cuộc họp này."
            : "You do not have permission to view this meeting details."}
        </p>
        <button
          onClick={() => navigate("/meetings")}
          className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
        >
          {t("meeting.back_to_hub")}
        </button>
      </div>
    );
  }

  if (isError && !isNew) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">
          {t("meeting.not_found")}
        </h2>
        <p className="text-slate-500 mt-2">{t("meeting.not_found_desc")}</p>
        <button
          onClick={() => navigate("/meetings")}
          className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold"
        >
          {t("meeting.back_to_hub")}
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto space-y-6 pb-20 transition-all duration-300">
      {/* 1. CUSTOM DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[3rem] border border-white/40 bg-white/90 shadow-2xl backdrop-blur-2xl"
            >
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-rose-500/10 blur-[80px]" />

              <div className="relative z-10 flex flex-col items-center text-center p-10 sm:p-14">
                <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 shadow-inner">
                  <Trash2 className="h-10 w-10" />
                </div>

                <h2 className="text-3xl font-black tracking-tight text-slate-900">
                  {t("meeting.destroy_workspace")}?
                </h2>
                <div className="mt-5 flex flex-col gap-3">
                  <p className="text-slate-500 font-bold leading-relaxed">
                    {t("meeting.delete_confirm")}
                  </p>
                </div>

                <div className="mt-12 flex flex-col w-full gap-4">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteMutation.isPending}
                    className="flex h-16 w-full items-center justify-center rounded-2xl bg-rose-500 font-black text-white shadow-xl shadow-rose-200 transition hover:bg-rose-600 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? (
                      <Loader2 className="h-6 w-6 animate-spin" />
                    ) : isVi ? (
                      "Xác Nhận Xóa"
                    ) : (
                      "Confirm Delete"
                    )}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex h-16 w-full items-center justify-center rounded-2xl bg-slate-100 font-black text-slate-500 transition hover:bg-slate-200"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Page header: Back button + tabs always on same row */}
      <div className="flex items-center gap-3">
        {/* Back button — only for existing meetings */}
        {!isNew && (
          <button
            onClick={() => navigate("/meetings")}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>
          </button>
        )}

        {/* Tab bar — only show for existing meetings */}
        {!isNew && (
          <div className="flex-1 min-w-0 overflow-x-auto scrollbar-none">
            <div className="flex p-1 rounded-2xl bg-slate-100/50 border border-slate-300 backdrop-blur-sm w-full sm:w-fit">
              <div className="flex w-full sm:w-auto gap-1">
                {tabConfig.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      title={tab.label}
                      className={`relative flex items-center justify-center gap-2 px-3 py-2.5 sm:px-6 rounded-xl text-sm font-bold transition-all duration-300 flex-1 sm:flex-initial whitespace-nowrap min-w-0 ${
                        isActive
                          ? "text-indigo-600"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="tab-bg"
                          className="absolute inset-0 bg-white shadow-sm border border-slate-300 rounded-xl"
                        />
                      )}
                      <Icon className="h-4 w-4 flex-shrink-0 relative z-10" />
                      <span className="relative z-10 hidden sm:inline truncate">
                        {tab.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "general" ? (
          <motion.div
            key="general"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* LEFT: UNIFIED CONFIGURATION FORM */}
            <div className="lg:col-span-8">
              <div className="block lg:hidden mb-8">
                <MeetingControlCenter
                  id={id}
                  isNew={isNew}
                  canEdit={canEdit && !isCompleted}
                  isInstant={isInstant}
                  isDirty={isDirty}
                  theme={theme}
                  mutation={mutation}
                  formData={formData}
                  copied={copied}
                  handleCopyLink={handleCopyLink}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  isCompleted={isCompleted}
                  canDelete={!!isOrganizer && !isNew}
                />
              </div>

              <MeetingGeneralForm
                meetingId={id}
                formData={formData}
                setFormData={setFormData}
                canEdit={canEdit && !isCompleted}
                isOngoing={isOngoing}
                isNew={isNew}
                isInstant={isInstant}
                setIsInstant={setIsInstant}
                previewDefaultTitle={previewDefaultTitle}
                conflictContext={conflictContext}
                isCheckingConflict={isCheckingConflict}
                templates={templates}
                isVi={isVi}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
              />
            </div>

            {/* RIGHT: PERSISTENT ACTION SIDEBAR */}
            <div className="lg:col-span-4 lg:sticky lg:top-8">
              <div className="hidden lg:block mb-6">
                <MeetingControlCenter
                  id={id}
                  isNew={isNew}
                  canEdit={canEdit && !isCompleted}
                  isInstant={isInstant}
                  isDirty={isDirty}
                  theme={theme}
                  mutation={mutation}
                  formData={formData}
                  copied={copied}
                  handleCopyLink={handleCopyLink}
                  setShowDeleteConfirm={setShowDeleteConfirm}
                  isCompleted={isCompleted}
                  canDelete={!!isOrganizer && !isNew}
                />
              </div>

              <MeetingTeamPresence
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                filteredParticipants={filteredParticipants}
                handleScroll={handleScroll}
                isFetchingNextPage={isFetchingNextPage}
              />
            </div>
          </motion.div>
        ) : activeTab === "polls_qa" ? (
          <motion.div
            key="polls_qa"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <MeetingPollsQaTab meetingId={id!} canEdit={canEdit} />
          </motion.div>
        ) : activeTab === "summary" ? (
          <motion.div
            key="summary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MeetingSummaryTab meetingId={id!} canEdit={canEdit} theme={theme} />
          </motion.div>
        ) : (
          <motion.div
            key="diary"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <MeetingDiaryTab meetingId={id!} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MeetingDetailsPage;
