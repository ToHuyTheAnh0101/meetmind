import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  LiveKitRoom,
  LocalUserChoices,
  LayoutContextProvider,
  RoomAudioRenderer,
} from "@livekit/components-react";
import { LocalVideoTrack, createLocalVideoTrack } from "livekit-client";
import "@livekit/components-styles";
import { motion } from "framer-motion";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";

import apiClient from "@/lib/apiClient";
import { useAuth } from "@/features/auth/AuthContext";

// Sub-components
import MeetingLobby from "./MeetingLobby";
import MeetingMainStage from "./MeetingMainStage";
import MeetingSidebar from "./MeetingSidebar";
import PollModal from "./PollModal";
import QuestionDetailModal from "./QuestionDetailModal";
import ConfirmEndBreakoutModal from "./ConfirmEndBreakoutModal";
import MeetingEarlyWaiting from "./MeetingEarlyWaiting";
import MeetingLobbyWaiting from "./MeetingLobbyWaiting";

// Modular extracted handlers
import DataHandler from "./DataHandler";
import BreakoutSignalHandler from "./BreakoutSignalHandler";
import BreakoutModalWrapper from "./BreakoutModalWrapper";
import { useBreakoutRoom } from "./useBreakoutRoom";

import { useQueryClient } from "@tanstack/react-query";
import { MeetingPermission, ParticipantStatus } from "@/types/api";
import {
  useMeetingParticipants,
  useMeetingQuestions,
  meetingRoomKeys,
} from "@/features/meetings/api/roomQueries";
import { checkIsOrganizer, hasMeetingPermission } from "@/lib/permissions";
import { formatMeetingStartTime } from "@/features/meetings/utils/formatters";
import { MeetingModalType, MeetingSidebarTab, RoomMeetingDetails } from "@/features/meetings/types";
import { Toaster, toast } from "react-hot-toast";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";
import { useSSE } from "@/hooks/useSSE";
import { useCustomEvent, emitCustomEvent, MeetingEvents } from "@/hooks/useCustomEvent";

interface JoinResponse {
  meetingId: string;
  organizerId: string;
  token: string;
  liveKitUrl: string;
  participants: any[];
  status?: string;
  isBreakoutRoom?: boolean;
  room?: string;
}

type SidebarTab = `${MeetingSidebarTab}`;
type ActiveModalType = MeetingModalType | null;

const MeetingRoomPage: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Custom Breakout Room Hook
  const {
    joinData,
    setJoinData,
    handleBreakoutEnded,
    handleJoinBreakoutAsHost,
    isInBreakout,
    handleConnected,
  } = useBreakoutRoom(id, user?.id);

  // State
  const [preJoinChoices, setPreJoinChoices] = useState<
    LocalUserChoices | undefined
  >(undefined);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [meetingDetails, setMeetingDetails] = useState<RoomMeetingDetails | null>(null);

  const [countdownText, setCountdownText] = useState<string>("");
  const [isEarly, setIsEarly] = useState<boolean>(false);
  const [selectedVideoId, setSelectedVideoId] = useState<string>("");
  const [selectedAudioId, setSelectedAudioId] = useState<string>("");

  const [username, setUsername] = useState(
    user ? `${user.firstName} ${user.lastName}` : "",
  );
  const [isMicOn, setIsMicOn] = useState(true);
  const [isCamOn, setIsCamOn] = useState(true);
  const [localVideoTrack, setLocalVideoTrack] =
    useState<LocalVideoTrack | null>(null);
  const [isWaitingInLobby, setIsWaitingInLobby] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== "undefined" ? window.innerWidth >= 1024 : true);
  const [activeTab, setActiveTab] = useState<SidebarTab>(MeetingSidebarTab.ROSTER);
  const [activeModal, setActiveModal] = useState<ActiveModalType>(null);
  const [hasUnreadPolls, setHasUnreadPolls] = useState(false);
  const [hasUnreadQA, setHasUnreadQA] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
    null,
  );

  // Refs to track active tab and sidebar state without causing useEffect triggers
  const activeTabRef = useRef(activeTab);
  const isSidebarOpenRef = useRef(isSidebarOpen);

  // --- 1. Queries & Network Hooks ---
  // Fetch participants to detect waiting users in the lobby and show live lobby avatars
  const { data: participantsData } = useMeetingParticipants(id || "");

  // Queries
  const { data: allQuestions = [] } = useMeetingQuestions(
    id || "",
    false,
    undefined,
    { enabled: !!id && (activeModal === MeetingModalType.QUESTION || activeTab === MeetingSidebarTab.QA) }
  );

  // --- 2. Derived Values (useMemo) ---
  const organizerId = useMemo(() => {
    return joinData?.organizerId || meetingDetails?.organizerId || "";
  }, [joinData, meetingDetails]);

  const isOrganizer = useMemo(() => {
    return checkIsOrganizer(user?.id, organizerId);
  }, [organizerId, user?.id]);

  const currentParticipant = useMemo(() => {
    if (!participantsData?.items || !user) return null;
    return participantsData.items.find(
      (part: any) => part.userId === user.id || part.user?.id === user.id,
    );
  }, [participantsData, user]);

  const isCoHost = useMemo(() => {
    const p = currentParticipant;
    return p?.permissions?.includes(MeetingPermission.CO_HOST) || false;
  }, [currentParticipant]);

  const canManagePolls = useMemo(() => {
    if (!user?.id) return false;
    return hasMeetingPermission(
      user.id,
      organizerId,
      currentParticipant?.permissions,
      MeetingPermission.MANAGE_POLLS
    );
  }, [organizerId, user?.id, currentParticipant?.permissions]);

  const canManageQA = useMemo(() => {
    if (!user?.id) return false;
    return hasMeetingPermission(
      user.id,
      organizerId,
      currentParticipant?.permissions,
      MeetingPermission.MANAGE_QA
    );
  }, [organizerId, user?.id, currentParticipant?.permissions]);

  const isPasswordError = useMemo(() => {
    return (
      requiresPassword &&
      (error?.toLowerCase().includes("password") ||
        error === t("meeting.invalid_password"))
    );
  }, [requiresPassword, error, t]);

  const formattedStartTime = useMemo(() => {
    const isVi = t("meeting.not_started.title").includes("chưa");
    return formatMeetingStartTime(meetingDetails?.startTime || "", isVi);
  }, [meetingDetails?.startTime, t]);

  const hasWaitingLobby = useMemo(() => {
    if (!participantsData?.items) return false;
    return participantsData.items.some((p: any) => p.status === ParticipantStatus.WAITING);
  }, [participantsData]);

  const selectedQuestion = useMemo(
    () => allQuestions.find((q) => q.id === selectedQuestionId) || null,
    [allQuestions, selectedQuestionId],
  );

  // --- 3. Callbacks & Event Handlers (useCallback) ---
  const fetchMeetingDetails = useCallback(() => {
    if (!id) return;
    apiClient
      .get(`/meetings/${id}/public`)
      .then((res) => {
        setMeetingDetails({
          title: res.data.title,
          description: res.data.description,
          participantCount: res.data.participantCount || 0,
          allowDisplayNameEdit: res.data.allowDisplayNameEdit ?? true,
          isQaEnabled: res.data.isQaEnabled ?? true,
          organizerId: res.data.organizerId,
          status: res.data.status,
          startTime: res.data.startTime,
          muteOnJoin: res.data.muteOnJoin ?? false,
        });
        if (res.data.hasPassword) {
          setRequiresPassword(true);
        }
        const isUserOrganizer = checkIsOrganizer(user?.id, res.data.organizerId);
        if (res.data.muteOnJoin && !isUserOrganizer) {
          setIsMicOn(false);
        }
      })
      .catch((err) => console.error("Failed to fetch meeting details", err));
  }, [id, user?.id, setIsMicOn]);

  const handleOpenModal = useCallback((type: ActiveModalType, questionId?: string) => {
    setActiveModal(type);
    if (type === MeetingModalType.QUESTION && questionId) {
      setSelectedQuestionId(questionId);
    }
  }, []);

  const handleCloseModal = useCallback(() => {
    setActiveModal(null);
    setSelectedQuestionId(null);
  }, []);

  const handleToggleSidebar = useCallback(
    (tab: SidebarTab) => {
      setIsSidebarOpen((prevOpen) => {
        if (prevOpen && activeTab === tab) return false;
        setActiveTab(tab);
        if (tab === MeetingSidebarTab.POLLS) setHasUnreadPolls(false);
        if (tab === MeetingSidebarTab.QA) setHasUnreadQA(false);
        return true;
      });
    },
    [activeTab],
  );

  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);

  const handleEndSession = useCallback(async () => {
    const summaryToastId = toast.loading(
      "Đang kết thúc phòng và gửi bản ghi âm cho AI tóm tắt...",
      {
        style: {
          background: "#111115",
          color: "#fff",
          border: "1px solid rgba(255, 255, 255, 0.1)",
          borderRadius: "1rem",
        },
      },
    );

    try {
      await apiClient.post(`/meetings/${id}/end`);

      // Silently trigger background AI summary generation
      apiClient
        .post(`/meetings/${id}/summaries/generate`)
        .then(() => {
          showSuccessToast("AI đã tóm tắt cuộc họp thành công!");
        })
        .catch((err) => {
          console.error("AI summary generation error:", err);
        });

      toast.dismiss(summaryToastId);
      navigate("/");
    } catch (err) {
      console.error("Failed to end meeting", err);
      toast.dismiss(summaryToastId);
      navigate("/");
    }
  }, [id, navigate]);

  const handleLeaveSession = useCallback(async () => {
    try {
      await apiClient.post(`/meetings/${id}/leave`);
    } catch (err) {
      console.error("Failed to call leave API", err);
    }
    navigate("/");
  }, [id, navigate]);

  const handlePreJoinSubmit = useCallback(
    async (choices: LocalUserChoices) => {
      setIsLoading(true);
      if (localVideoTrack) {
        localVideoTrack.stop();
        setLocalVideoTrack(null);
      }
      try {
        const response = await apiClient.post<any>(
          `/meetings/${id}/join`,
          {
            password,
            displayName: choices.username,
          },
          { _skipLogout: true } as any,
        );

        if (
          response.data.status === ParticipantStatus.WAITING ||
          response.data.status === ParticipantStatus.PENDING
        ) {
          setIsWaitingInLobby(true);
          setPreJoinChoices(choices);
          return;
        }

        setJoinData(response.data);
        setPreJoinChoices(choices);
        setError(null);
      } catch (err: any) {
        const msg: string = err.response?.data?.message || "";
        // If the meeting is already completed, redirect to the details/summary page
        if (
          err.response?.status === 400 &&
          (msg.toLowerCase().includes("completed") ||
            msg.toLowerCase().includes("already completed"))
        ) {
          navigate(`/meetings/${id}?tab=summary`, { replace: true });
          return;
        }
        if (
          err.response?.status === 401 ||
          msg.toLowerCase().includes("password")
        ) {
          setRequiresPassword(true);
          setError(t("meeting.invalid_password"));
        } else if (
          err.response?.status === 403 &&
          msg.toLowerCase().includes("not invited")
        ) {
          setError(t("meeting.not_invited"));
        } else {
          setError(msg || t("meeting.load_error"));
        }
      } finally {
        setIsLoading(false);
      }
    },
    [id, password, t, localVideoTrack],
  );

  const handleRefreshMeeting = useCallback((detail: any) => {
    if (detail?.meetingId === id) {
      fetchMeetingDetails();
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.participants(id || "") });
    }
  }, [id, fetchMeetingDetails, queryClient]);

  const handleRefreshQA = useCallback((detail: any) => {
    if (detail?.meetingId === id) {
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.questions(id || "") });
      if (activeTabRef.current !== MeetingSidebarTab.QA || !isSidebarOpenRef.current) {
        setHasUnreadQA(true);
      }
    }
  }, [id, queryClient]);

  const handleRefreshPolls = useCallback((detail: any) => {
    if (detail?.meetingId === id) {
      queryClient.invalidateQueries({ queryKey: meetingRoomKeys.polls(id || "") });
      if (activeTabRef.current !== MeetingSidebarTab.POLLS || !isSidebarOpenRef.current) {
        setHasUnreadPolls(true);
      }
    }
  }, [id, queryClient]);

  const checkAndJoin = useCallback(async () => {
    try {
      const response = await apiClient.post<JoinResponse>(
        `/meetings/${id}/join`,
        { password },
        { _skipLogout: true } as any,
      );
      if (
        response.data.status === ParticipantStatus.ADMITTED ||
        response.data.status === ParticipantStatus.ACTIVE
      ) {
        setIsWaitingInLobby(false);
        setJoinData(response.data);
      }
    } catch (err) {
      console.error("Failed to automatically join after SSE admittance notification", err);
    }
  }, [id, password]);

  // --- 4. Side Effects & Event Listeners (useEffect, useSSE, useCustomEvent) ---
  useEffect(() => {
    activeTabRef.current = activeTab;
  }, [activeTab]);

  useEffect(() => {
    isSidebarOpenRef.current = isSidebarOpen;
  }, [isSidebarOpen]);

  useEffect(() => {
    fetchMeetingDetails();
  }, [fetchMeetingDetails]);

  // Countdown timer for scheduled meetings that haven't started yet (> 10 mins early)
  useEffect(() => {
    if (!meetingDetails?.startTime || meetingDetails.status !== "scheduled" || isOrganizer) {
      setIsEarly(false);
      return;
    }

    const startMs = new Date(meetingDetails.startTime).getTime();

    const checkTime = () => {
      const now = Date.now();
      const diff = startMs - now;

      if (diff > 10 * 60 * 1000) {
        setIsEarly(true);
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        const pad = (n: number) => String(n).padStart(2, "0");
        setCountdownText(`${pad(hours)}:${pad(minutes)}:${pad(seconds)}`);
      } else {
        setIsEarly(false);
        if (diff <= 0) {
          fetchMeetingDetails();
        }
      }
    };

    checkTime();
    const interval = setInterval(checkTime, 1000);
    return () => clearInterval(interval);
  }, [meetingDetails?.startTime, meetingDetails?.status, isOrganizer, fetchMeetingDetails]);

  useEffect(() => {
    let activeTrack: LocalVideoTrack | null = null;
    let isMounted = true;
    const startPreview = async () => {
      if (isCamOn && !joinData) {
        try {
          const track = await createLocalVideoTrack(
            selectedVideoId ? { deviceId: selectedVideoId } : undefined
          );
          if (!isMounted || joinData) {
            track.stop();
            return;
          }
          activeTrack = track;
          setLocalVideoTrack(activeTrack);
        } catch (e) {
          console.error("Failed to start preview", e);
        }
      }
    };
    startPreview();
    return () => {
      isMounted = false;
      if (activeTrack) activeTrack.stop();
      setLocalVideoTrack(null);
    };
  }, [isCamOn, !!joinData, selectedVideoId]);

  useEffect(() => {
    if (id) {
      const handleUnload = () => {
        apiClient.post(`/meetings/${id}/leave`).catch(() => {});
      };
      window.addEventListener("beforeunload", handleUnload);
      return () => {
        handleUnload();
        window.removeEventListener("beforeunload", handleUnload);
      };
    }
  }, [id]);

  // Listen to Server-Sent Events (SSE) for lobby updates (for Host/Co-host)
  useSSE(
    (id && (isOrganizer || isCoHost)) ? `/meetings/${id}/lobby/sse` : null,
    (data: any) => {
      if (data.type === "lobby_updated") {
        queryClient.invalidateQueries({ queryKey: meetingRoomKeys.participants(id || "") });
      }
    }
  );

  // SSE for waiting status admittance
  useSSE(
    (isWaitingInLobby && id) ? `/meetings/${id}/participants/status-sse` : null,
    (data: any) => {
      if (data.type === "status_updated") {
        if (data.status === ParticipantStatus.ADMITTED) {
          checkAndJoin();
        }
      }
    }
  );

  // Custom Event Listeners
  useCustomEvent(MeetingEvents.REFRESH_MEETING, handleRefreshMeeting);
  useCustomEvent(MeetingEvents.REFRESH_QA, handleRefreshQA);
  useCustomEvent(MeetingEvents.REFRESH_POLLS, handleRefreshPolls);

  // Early Returns
  if (isEarly && meetingDetails) {
    return (
      <MeetingEarlyWaiting
        countdownText={countdownText}
        formattedStartTime={formattedStartTime}
        isLoading={isLoading}
        onCheckAgain={fetchMeetingDetails}
        onBackToDashboard={() => navigate("/")}
      />
    );
  }

  if (isWaitingInLobby) {
    return (
      <MeetingLobbyWaiting
        onCancel={async () => {
          try {
            await apiClient.post(`/meetings/${id}/leave`);
          } catch (err) {
            console.error("Failed to cancel waiting request", err);
          }
          setIsWaitingInLobby(false);
        }}
      />
    );
  }

  if (error && !isPasswordError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex max-w-md flex-col items-center rounded-[2.5rem] border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="mt-8 text-2xl font-black tracking-tight">
            {t("meeting.access_denied")}
          </h2>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed">
            {error}
          </p>
          <button
            onClick={() => navigate("/")}
            className="mt-10 flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("dashboard.back_to_dashboard")}
          </button>
        </motion.div>
      </div>
    );
  }

  if (!joinData || !preJoinChoices) {
    return (
      <MeetingLobby
        username={username}
        setUsername={setUsername}
        isMicOn={isMicOn}
        setIsMicOn={setIsMicOn}
        isCamOn={isCamOn}
        setIsCamOn={setIsCamOn}
        localVideoTrack={localVideoTrack}
        isLoading={isLoading}
        onJoin={handlePreJoinSubmit}
        onExit={() => navigate(`/meetings/${id}/manage`)}
        avatarUrl={user?.picture || user?.profilePictureUrl || null}
        requiresPassword={requiresPassword && !isOrganizer}
        password={password}
        setPassword={setPassword}
        error={isPasswordError ? error : null}
        meetingTitle={meetingDetails?.title}
        meetingDescription={meetingDetails?.description}
        allowDisplayNameEdit={meetingDetails?.allowDisplayNameEdit}
        selectedVideoId={selectedVideoId}
        setSelectedVideoId={setSelectedVideoId}
        selectedAudioId={selectedAudioId}
        setSelectedAudioId={setSelectedAudioId}
        participants={(participantsData?.items || []).filter((p: any) => p.userId !== user?.id)}
      />
    );
  }

  return (
    <div className="h-screen w-screen bg-[#020202] overflow-hidden font-sans lk-premium-theme flex items-center justify-center text-white">
      <LiveKitRoom
        key={joinData.token}
        video={preJoinChoices.videoEnabled}
        audio={
          meetingDetails?.muteOnJoin && !isOrganizer
            ? false
            : preJoinChoices.audioEnabled
        }
        token={joinData.token}
        serverUrl={joinData.liveKitUrl}
        onDisconnected={() => {
          if (isInBreakout) {
            handleBreakoutEnded();
          } else {
            navigate("/");
          }
        }}
        onConnected={handleConnected}
        onError={(e) => {
          const errMsg = e.message || "";
          if (errMsg.includes("Client initiated disconnect")) {
            return;
          }

          const isDeviceOrTrackError =
            errMsg.toLowerCase().includes("video source") ||
            errMsg.toLowerCase().includes("audio source") ||
            errMsg.toLowerCase().includes("track") ||
            errMsg.toLowerCase().includes("device") ||
            errMsg.toLowerCase().includes("permission") ||
            errMsg.toLowerCase().includes("media");

          if (isDeviceOrTrackError) {
            showErrorToast(
              t("meeting.device_start_failed", { message: errMsg }),
            );
            return;
          }

          setError(errMsg);
        }}
        options={{
          adaptiveStream: true,
          dynacast: true,
        }}
        data-lk-theme="default"
        className="w-full h-full flex overflow-hidden relative lg:flex-row flex-row"
      >
        <RoomAudioRenderer />
        <DataHandler meetingId={id!} />
        <BreakoutSignalHandler />
        <LayoutContextProvider>
          <motion.div
            layout
            className="flex-1 h-full min-w-0 overflow-hidden flex flex-col relative z-10"
          >
            <MeetingMainStage
              meetingId={id || ""}
              isOrganizer={isOrganizer}
              activeTab={activeTab as any}
              hasUnreadPolls={hasUnreadPolls}
              hasUnreadQA={hasUnreadQA}
              hasWaitingLobby={hasWaitingLobby}
              onToggleSidebar={handleToggleSidebar}
              onEndSession={handleEndSession}
              onLeaveSession={handleLeaveSession}
              onReturnToMain={handleBreakoutEnded}
              isInBreakout={isInBreakout}
            />
          </motion.div>
          <MeetingSidebar
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
            activeTab={activeTab}
            hasUnreadPolls={hasUnreadPolls}
            hasUnreadQA={hasUnreadQA}
            hasWaitingLobby={hasWaitingLobby}
            setActiveTab={(tab: SidebarTab) => {
              setActiveTab(tab);
              setIsSidebarOpen(true);
              if (tab === MeetingSidebarTab.POLLS) setHasUnreadPolls(false);
              if (tab === MeetingSidebarTab.QA) setHasUnreadQA(false);
            }}
            meetingId={joinData.meetingId}
            userId={user?.id || ""}
            organizerId={joinData.organizerId}
            isOrganizer={isOrganizer}
            isCoHost={isCoHost}
            canManagePolls={canManagePolls}
            canManageQA={canManageQA}
            onOpenCreateModal={() => handleOpenModal(MeetingModalType.POLL)}
            onOpenQuestionModal={(q) => handleOpenModal(MeetingModalType.QUESTION, q.id)}
            onOpenBreakoutModal={() => handleOpenModal(MeetingModalType.BREAKOUT)}
            onOpenConfirmEndModal={() => handleOpenModal(MeetingModalType.CONFIRM_END)}
            onJoinBreakoutAsHost={handleJoinBreakoutAsHost}
            currentRoomName={joinData?.room}
            isInBreakout={isInBreakout}
            breakoutRoomId={joinData?.breakoutRoomId}
          />
        </LayoutContextProvider>
        <PollModal
          isOpen={activeModal === MeetingModalType.POLL}
          onClose={handleCloseModal}
          meetingId={joinData.meetingId}
          isInBreakout={isInBreakout}
          breakoutRoomId={joinData?.breakoutRoomId}
        />
        <BreakoutModalWrapper
          isOpen={activeModal === MeetingModalType.BREAKOUT}
          onClose={handleCloseModal}
          meetingId={id || ""}
          organizerId={joinData.organizerId}
        />
        <QuestionDetailModal
          isOpen={activeModal === MeetingModalType.QUESTION}
          onClose={handleCloseModal}
          question={selectedQuestion}
          userId={user?.id || ""}
          meetingId={id || ""}
          isOrganizer={isOrganizer}
          isCoHost={isCoHost}
        />
        <ConfirmEndBreakoutModal
          isOpen={activeModal === MeetingModalType.CONFIRM_END}
          onClose={handleCloseModal}
          onConfirm={async () => {
            try {
              await apiClient.post(`/meetings/${id}/breakout-rooms/end`);
              emitCustomEvent(MeetingEvents.SEND_BREAKOUT_END_SIGNAL);
              showSuccessToast(t('meeting.end_breakout_success', 'Đã kết thúc thảo luận nhóm'), "🏠");
              handleCloseModal();
            } catch (err) {
              console.error("Failed to end breakout", err);
              showErrorToast(t('meeting.end_breakout_failed', 'Không thể kết thúc chia phòng'));
            }
          }}
          title={t('meeting.end_breakout_title', 'Kết thúc thảo luận')}
          message={t('meeting.end_breakout_message', 'Bạn có chắc chắn muốn kết thúc tất cả các phòng thảo luận và thu hồi mọi người về phòng chính ngay bây giờ không?')}
        />
      </LiveKitRoom>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .lk-premium-theme .lk-control-bar { background: transparent !important; border: none !important; width: auto !important; margin: 0 !important; gap: 0.5rem !important; }
        .lk-premium-theme .lk-button { height: 40px !important; width: 40px !important; border-radius: 0.75rem !important; background: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.05) !important; padding: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s !important; }
        .lk-premium-theme .lk-button:hover { background: rgba(255, 255, 255, 0.1) !important; transform: translateY(-2px); }
        .lk-premium-theme .lk-button[data-lk-active="true"] { background: rgba(34, 211, 238, 0.1) !important; color: #22d3ee !important; border-color: rgba(34, 211, 238, 0.2) !important; }
        .lk-premium-theme .lk-disconnect-button { background: #ef4444 !important; }
        .lk-premium-theme .lk-focus-toggle-button { display: none !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `,
        }}
      />
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  );
};

export default MeetingRoomPage;
