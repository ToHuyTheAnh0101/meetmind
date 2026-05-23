import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  LiveKitRoom, 
  LocalUserChoices,
  LayoutContextProvider,
} from '@livekit/components-react'
import { LocalVideoTrack, createLocalVideoTrack } from 'livekit-client'
import '@livekit/components-styles'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import apiClient from '@/lib/apiClient'
import { useAuth } from '../auth/AuthContext'

// Sub-components
import MeetingLobby from './components/room/MeetingLobby'
import MeetingMainStage from './components/room/MeetingMainStage'
import MeetingSidebar from './components/room/MeetingSidebar'
import PollModal from './components/room/PollModal'
import QuestionDetailModal from './components/room/QuestionDetailModal'
import BreakoutManagementModal from './components/room/BreakoutManagementModal'
import ConfirmEndBreakoutModal from './components/room/ConfirmEndBreakoutModal'
import { useDataChannel, useLocalParticipant, useParticipants } from '@livekit/components-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'
import { showSuccessToast, showErrorToast } from '@/lib/toastUtils'

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

const DataHandler: React.FC<{ meetingId: string; onNotify: () => void }> = ({ meetingId, onNotify }) => {
  useDataChannel((msg) => {
    try {
      const data = JSON.parse(msg.payload instanceof Uint8Array ? new TextDecoder().decode(msg.payload) : msg.payload as string);
      if (data.type === 'POLL_CREATED' || data.type === 'POLL_UPDATED') {
        window.dispatchEvent(new CustomEvent('refresh-polls', { detail: { meetingId } }));
        if (data.type === 'POLL_CREATED') {
          onNotify();
        }
      }
      if (data.type === 'QA_UPDATED') {
        window.dispatchEvent(new CustomEvent('refresh-qa', { detail: { meetingId } }));
      }
      if (data.type === 'MEETING_UPDATED') {
        window.dispatchEvent(new CustomEvent('refresh-meeting', { detail: { meetingId } }));
      }
      if (data.type === 'BREAKOUT_STARTED') {
        window.dispatchEvent(new CustomEvent('breakout-started', { detail: data }));
      }
      if (data.type === 'BREAKOUT_ENDED') {
        window.dispatchEvent(new CustomEvent('breakout-ended', { detail: data }));
      }
    } catch (e) {
      console.error("Failed to parse data message", e);
    }
  });
  return null;
};

const BreakoutSignalHandler: React.FC = () => {
  const { localParticipant } = useLocalParticipant();
  
  useEffect(() => {
    const handleStart = (e: any) => {
      const rooms = e.detail;
      const assignments = rooms.flatMap((r: any) => 
        r.participants.map((p: any) => ({
          userId: p.userId,
          roomId: r.id,
          roomName: r.name
        }))
      );
      
      const payload = JSON.stringify({
        type: 'BREAKOUT_STARTED',
        assignments
      });
      
      localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
      
      // Manually trigger for the sender (Host)
      window.dispatchEvent(new CustomEvent('breakout-started', { detail: JSON.parse(payload) }));
    };

    const handleEnd = () => {
      const payload = JSON.stringify({ type: 'BREAKOUT_ENDED' });
      localParticipant.publishData(new TextEncoder().encode(payload), { reliable: true });
      
      // Manually trigger for the sender (Host)
      window.dispatchEvent(new CustomEvent('breakout-ended', { detail: JSON.parse(payload) }));
    };

    window.addEventListener('send-breakout-start-signal', handleStart);
    window.addEventListener('send-breakout-end-signal', handleEnd);
    return () => {
      window.removeEventListener('send-breakout-start-signal', handleStart);
      window.removeEventListener('send-breakout-end-signal', handleEnd);
    };
  }, [localParticipant]);

  return null;
};

const BreakoutModalWrapper: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  meetingId: string;
  organizerId: string;
}> = ({ isOpen, onClose, meetingId, organizerId }) => {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useParticipants();

  return (
    <BreakoutManagementModal 
      isOpen={isOpen} 
      onClose={onClose} 
      meetingId={meetingId} 
      participants={[
        {
          id: localParticipant.identity,
          userId: localParticipant.identity,
          displayName: localParticipant.name || localParticipant.identity,
          metadata: localParticipant.metadata,
          isOrganizer: localParticipant.identity === organizerId
        },
        ...remoteParticipants.map((p: any) => ({
          id: p.identity,
          userId: p.identity,
          displayName: p.name || p.identity,
          metadata: p.metadata,
          isOrganizer: p.identity === organizerId
        }))
      ]}
      onStart={async (roomsData) => {
        try {
          // 1. Setup rooms on backend
          await apiClient.post(`/meetings/${meetingId}/breakout-rooms/setup`, {
            rooms: roomsData.map(r => ({
              name: r.name,
              assignments: r.participants.map((p: any) => ({ userId: p.userId }))
            }))
          });

          // 2. Start breakout on backend
          await apiClient.post(`/meetings/${meetingId}/breakout-rooms/start`);

          // 3. Dispatch signal to participants
          window.dispatchEvent(new CustomEvent('send-breakout-start-signal', { detail: roomsData }));
          
          onClose();
        } catch (err) {
          console.error("Failed to start breakout", err);
          showErrorToast("Không thể khởi động phòng họp nhỏ");
        }
      }}
    />
  );
};

const MeetingRoomPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
   const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  
  // State
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined)
  const [joinData, setJoinData] = useState<JoinResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [requiresPassword, setRequiresPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [meetingDetails, setMeetingDetails] = useState<{ 
    title: string; 
    description: string; 
    participantCount: number;
    allowDisplayNameEdit: boolean;
    isQaEnabled: boolean;
    isAnonymousAllowed: boolean;
    organizerId: string;
  } | null>(null)

  const [username, setUsername] = useState(user ? `${user.firstName} ${user.lastName}` : '')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null)
  const [isWaitingInLobby, setIsWaitingInLobby] = useState(false)

  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'roster' | 'lobby' | 'settings' | 'polls' | 'qa' | 'permissions'>('roster')
  const [isPollModalOpen, setIsPollModalOpen] = useState(false)
  const [hasUnreadPolls, setHasUnreadPolls] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null)
  const [isBreakoutModalOpen, setIsBreakoutModalOpen] = useState(false)
  const [isConfirmEndOpen, setIsConfirmEndOpen] = useState(false)
  const [originalJoinData, setOriginalJoinData] = useState<JoinResponse | null>(null)

  // Lưu lại joinData gốc để quay lại phòng chính sau khi breakout kết thúc
  useEffect(() => {
    if (joinData && !originalJoinData && !joinData.token.includes('breakout')) {
      setOriginalJoinData(joinData);
    }
  }, [joinData, originalJoinData]);


  // Derived Values
  const organizerId = useMemo(() => {
    return joinData?.organizerId || meetingDetails?.organizerId || '';
  }, [joinData, meetingDetails]);

  const isOrganizer = useMemo(() => {
    if (user && organizerId) return organizerId === user.id;
    return false;
  }, [organizerId, user]);

  const canManagePolls = useMemo(() => {
    if (!joinData || !user) return false;
    const p = joinData.participants.find((part: any) => part.id === user.id || part.userId === user.id);
    return p?.isOrganizer || p?.permissions?.includes('manage_polls') || p?.permissions?.includes('co_host');
  }, [joinData, user]);

  const canManageQA = useMemo(() => {
    if (!joinData || !user) return false;
    const p = joinData.participants.find((part: any) => part.id === user.id || part.userId === user.id);
    return p?.isOrganizer || p?.permissions?.includes('manage_qa') || p?.permissions?.includes('co_host');
  }, [joinData, user]);

  const isCoHost = useMemo(() => {
    if (!joinData || !user) return false;
    const p = joinData.participants.find((part: any) => part.id === user.id || part.userId === user.id);
    return p?.permissions?.includes('co_host');
  }, [joinData, user]);

  const isPasswordError = useMemo(() => {
    return requiresPassword && (
      error?.toLowerCase().includes('password') || 
      error === t('meeting.invalid_password')
    );
  }, [requiresPassword, error, t]);

  // Queries
  const { data: allQuestions = [] } = useQuery<any[]>({
    queryKey: ['questions', id],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${id}/qa`);
      return res.data;
    },
    enabled: !!id && (isQuestionModalOpen || activeTab === 'qa')
  });

  const selectedQuestion = useMemo(() => 
    allQuestions.find(q => q.id === selectedQuestionId) || null,
    [allQuestions, selectedQuestionId]
  );

  // Callbacks
  const fetchMeetingDetails = useCallback(() => {
    if (!id) return;
    apiClient.get(`/meetings/${id}/public`).then(res => {
      setMeetingDetails({
        title: res.data.title,
        description: res.data.description,
        participantCount: res.data.participantCount || 0,
        allowDisplayNameEdit: res.data.allowDisplayNameEdit ?? true,
        isQaEnabled: res.data.isQaEnabled ?? true,
        isAnonymousAllowed: res.data.isAnonymousAllowed ?? true,
        organizerId: res.data.organizerId
      })
      if (res.data.hasPassword) {
        setRequiresPassword(true)
      }
    }).catch(err => console.error("Failed to fetch meeting details", err))
  }, [id]);

  const handleOpenQuestionModal = useCallback((question: any) => {
    setSelectedQuestionId(question.id);
    setIsQuestionModalOpen(true);
  }, []);

  const handleCloseQuestionModal = useCallback(() => {
    setIsQuestionModalOpen(false);
    setSelectedQuestionId(null);
  }, []);

  const handleToggleSidebar = useCallback((tab: 'chat' | 'roster' | 'lobby' | 'settings' | 'polls' | 'permissions' | 'qa') => {
    setIsSidebarOpen(prevOpen => {
      if (prevOpen && activeTab === tab) return false;
      setActiveTab(tab as any);
      if (tab === 'polls') setHasUnreadPolls(false);
      return true;
    });
  }, [activeTab]);

  const handleCloseSidebar = useCallback(() => setIsSidebarOpen(false), []);
  const handleOpenPollModal = useCallback(() => setIsPollModalOpen(true), []);
  const handleClosePollModal = useCallback(() => setIsPollModalOpen(false), []);
  const handleOpenBreakoutModal = useCallback(() => setIsBreakoutModalOpen(true), []);
  const handleCloseBreakoutModal = useCallback(() => setIsBreakoutModalOpen(false), []);

  const handleEndSession = useCallback(async () => {
    try {
      await apiClient.post(`/meetings/${id}/end`)
      navigate('/')
    } catch (err) {
      console.error("Failed to end meeting", err)
      navigate('/')
    }
  }, [id, navigate]);

  const handleLeaveSession = useCallback(async () => {
    try {
      await apiClient.post(`/meetings/${id}/leave`)
    } catch (err) {
      console.error("Failed to call leave API", err)
    }
    navigate('/')
  }, [id, navigate]);

  const handlePreJoinSubmit = useCallback(async (choices: LocalUserChoices) => {
    setIsLoading(true)
    if (localVideoTrack) {
      localVideoTrack.stop();
      setLocalVideoTrack(null);
    }
    try {
      const response = await apiClient.post<any>(`/meetings/${id}/join`, { 
        password,
        displayName: choices.username 
      }, { _skipLogout: true } as any)
      
      if (response.data.status === 'waiting' || response.data.status === 'pending') {
        setIsWaitingInLobby(true);
        setPreJoinChoices(choices);
        return;
      }

      setJoinData(response.data)
      setPreJoinChoices(choices)
      setError(null)
    } catch (err: any) {
      if (err.response?.status === 401 || err.response?.data?.message?.includes('password')) {
        setRequiresPassword(true)
        setError(t('meeting.invalid_password'))
      } else {
        setError(err.response?.data?.message || t('meeting.load_error'))
      }
    } finally {
      setIsLoading(false)
    }
  }, [id, password, t, localVideoTrack]);
 
  const handleBreakoutStarted = useCallback(async (e?: any) => {
    console.log("[BREAKOUT] Signal received:", e?.detail || "Manual/Mount check");
    // Đợi 1.5 giây để chắc chắn Backend đã commit xong các bản ghi participants
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    try {
      const resp = await apiClient.get(`/meetings/${id}/breakout-rooms/my-token`);
      if (resp.data && resp.data.token) {
          setJoinData((prev: any) => ({
            ...prev!,
            token: resp.data.token,
            room: resp.data.roomName,
            isBreakoutRoom: true
          }));
          showSuccessToast(`Đang chuyển sang ${resp.data.roomName}...`, '🚪');
        } else {
          console.log("[BREAKOUT] No token returned for this user. Staying in current room.");
        }
    } catch (err) {
      console.error("Failed to join breakout room", err);
    }
  }, [id]);

  const handleBreakoutEnded = useCallback(async () => {
    console.log("[BREAKOUT] End signal received.");
    showSuccessToast("Quay lại phòng chính", '🏠');
    
    if (originalJoinData) {
      setJoinData(originalJoinData);
    } else {
      try {
        const res = await apiClient.post(`/meetings/${id}/join`);
        setJoinData((prev: any) => prev ? { ...prev, token: res.data.token, isBreakoutRoom: false } : res.data);
      } catch (err) {
        console.error("Failed to return to main room", err);
      }
    }
  }, [id, originalJoinData]);

  // Effects
  useEffect(() => {
    fetchMeetingDetails();
  }, [fetchMeetingDetails]);

   useEffect(() => {
    const handleRefreshMeeting = (e: any) => {
      if (e.detail?.meetingId === id) fetchMeetingDetails();
    };
    const handleRefreshQA = (e: any) => {
      if (e.detail?.meetingId === id) {
        queryClient.invalidateQueries({ queryKey: ['questions', id] });
      }
    };
    const handleRefreshPolls = (e: any) => {
      if (e.detail?.meetingId === id) {
        queryClient.invalidateQueries({ queryKey: ['polls', id] });
      }
    };
    window.addEventListener('refresh-meeting', handleRefreshMeeting);
    window.addEventListener('refresh-qa', handleRefreshQA);
    window.addEventListener('refresh-polls', handleRefreshPolls);
    window.addEventListener('breakout-started', handleBreakoutStarted);
    window.addEventListener('breakout-ended', handleBreakoutEnded);

    // Check breakout on mount
    handleBreakoutStarted();
    return () => {
      window.removeEventListener('refresh-meeting', handleRefreshMeeting);
      window.removeEventListener('refresh-qa', handleRefreshQA);
      window.removeEventListener('refresh-polls', handleRefreshPolls);
      window.removeEventListener('breakout-started', handleBreakoutStarted);
      window.removeEventListener('breakout-ended', handleBreakoutEnded);
    };
  }, [id, fetchMeetingDetails, queryClient, handleBreakoutStarted, handleBreakoutEnded]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    const isInBreakout = joinData?.isBreakoutRoom;
    
    if (isInBreakout && id) {
      interval = setInterval(async () => {
        try {
          const resp = await apiClient.get(`/meetings/${id}/breakout-rooms/my-token`);
          // Nếu không còn token breakout (phòng đã đóng), tự động quay về
          if (!resp.data || !resp.data.token) {
            console.log("[BREAKOUT] Room no longer active (from poll). Returning to main.");
            handleBreakoutEnded();
          }
        } catch (err) {
          console.error("Polling breakout status failed", err);
          // Nếu lỗi 404 hoặc lỗi không tìm thấy phòng, cũng quay về
          handleBreakoutEnded();
        }
      }, 5000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [id, joinData?.token, handleBreakoutEnded]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaitingInLobby && id) {
      interval = setInterval(async () => {
        try {
          const response = await apiClient.post<JoinResponse>(`/meetings/${id}/join`, { password }, { _skipLogout: true } as any);
          if (response.data.status === 'admitted' || response.data.status === 'active') {
            setIsWaitingInLobby(false);
            setJoinData(response.data);
          }
        } catch (err) {
          console.error("Polling for admittance failed", err);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isWaitingInLobby, id, password]);

  useEffect(() => {
    let activeTrack: LocalVideoTrack | null = null;
    let isMounted = true;
    const startPreview = async () => {
      if (isCamOn && !joinData) {
        try {
          const track = await createLocalVideoTrack();
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
    }
  }, [isCamOn, !!joinData]);

  useEffect(() => {
    if (joinData && id) {
      const handleUnload = () => {
        apiClient.post(`/meetings/${id}/leave`).catch(() => {});
      }
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        handleUnload();
        window.removeEventListener('beforeunload', handleUnload);
      }
    }
  }, [joinData, id]);

  // UI Components
  const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );

  // Early Returns
  if (isWaitingInLobby) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="relative w-full max-w-xl overflow-hidden rounded-[3.5rem] border border-white/20 bg-[#0a0a0b] p-12 text-center shadow-2xl">
          <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-[100px]" />
          <div className="absolute -right-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-[100px]" />
          <div className="relative z-10 flex flex-col items-center">
            <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-white/5 border border-white/10 relative">
               <div className="absolute inset-0 rounded-[2.5rem] border-2 border-cyan-500/20 border-t-cyan-500 animate-spin" />
               <UsersIcon />
            </div>
            <h1 className="text-4xl font-black tracking-tight text-white mb-4">{t('meeting.permission_pending')}</h1>
            <p className="text-slate-400 font-medium leading-relaxed max-w-md mx-auto">
              {t('meeting.host_notified')} 
              <br />
              <span className="text-white font-bold">{t('meeting.stay_on_page')}</span> {t('meeting.securing_entry')}
            </p>
            <div className="mt-12 flex flex-col items-center gap-6">
               <div className="flex items-center gap-3 px-6 py-3 rounded-2xl bg-white/5 border border-white/10">
                  <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
                  <span className="text-[14px] font-black text-cyan-400">{t('meeting.requesting_admittance')}</span>
               </div>
               <button onClick={() => setIsWaitingInLobby(false)} className="text-sm font-bold text-slate-500 hover:text-white transition-colors">
                  {t('meeting.cancel_request')}
               </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (error && !isPasswordError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 p-6 text-white">
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex max-w-md flex-col items-center rounded-[2.5rem] border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="mt-8 text-2xl font-black tracking-tight">{t('meeting.access_denied')}</h2>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed">{error}</p>
          <button onClick={() => navigate('/')} className="mt-10 flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 active:scale-95">
            <ArrowLeft className="h-4 w-4" />
            {t('dashboard.back_to_dashboard')}
          </button>
        </motion.div>
      </div>
    )
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
        onExit={() => navigate('/')}
        avatarUrl={user?.picture || user?.profilePictureUrl || null}
        requiresPassword={requiresPassword && !isOrganizer}
        password={password}
        setPassword={setPassword}
        error={isPasswordError ? error : null} 
        meetingTitle={meetingDetails?.title}
        meetingDescription={meetingDetails?.description}
        participantCount={meetingDetails?.participantCount}
        allowDisplayNameEdit={meetingDetails?.allowDisplayNameEdit}
      />
    )
  }

  return (
    <div className="h-screen w-screen bg-[#020202] overflow-hidden font-sans lk-premium-theme flex items-center justify-center text-white">
      <LiveKitRoom
        key={joinData.token}
        video={preJoinChoices.videoEnabled}
        audio={preJoinChoices.audioEnabled}
        token={joinData.token}
        serverUrl={joinData.liveKitUrl}
        onDisconnected={() => navigate('/')}
        onError={(e) => setError(e.message)}
        data-lk-theme="default"
        className="w-full h-full flex overflow-hidden lg:flex-row flex-col"
      >
        <DataHandler meetingId={id!} onNotify={() => {
          if (activeTab !== 'polls' || !isSidebarOpen) setHasUnreadPolls(true);
        }} />
        <BreakoutSignalHandler />
        <LayoutContextProvider>
           <motion.div layout className="flex-1 h-full min-w-0 overflow-hidden flex flex-col relative">
            <MeetingMainStage 
              meetingId={id || ''}
              isSidebarOpen={isSidebarOpen}
              isOrganizer={isOrganizer}
              activeTab={activeTab as any}
              hasUnreadPolls={hasUnreadPolls}
              onToggleSidebar={handleToggleSidebar}
              onEndSession={handleEndSession}
              onLeaveSession={handleLeaveSession}
              onReturnToMain={handleBreakoutEnded}
              isInBreakout={joinData.token.includes('breakout')}
            />
          </motion.div>
          <MeetingSidebar 
            isOpen={isSidebarOpen}
            onClose={handleCloseSidebar}
            activeTab={activeTab}
            hasUnreadPolls={hasUnreadPolls}
            setActiveTab={(tab: any) => {
              setActiveTab(tab);
              setIsSidebarOpen(true);
              if (tab === 'polls') setHasUnreadPolls(false);
            }}
            meetingId={joinData.meetingId}
            userId={user?.id || ''}
            organizerId={joinData.organizerId}
            isOrganizer={isOrganizer}
            isCoHost={isCoHost}
            canManagePolls={canManagePolls}
            canManageQA={canManageQA}
            onOpenCreateModal={handleOpenPollModal}
            onOpenQuestionModal={handleOpenQuestionModal}
            onOpenBreakoutModal={handleOpenBreakoutModal}
            onOpenConfirmEndModal={() => setIsConfirmEndOpen(true)}
            onReturnToMain={handleBreakoutEnded}
            isInBreakout={!!joinData?.isBreakoutRoom}
          />
        </LayoutContextProvider>
        <PollModal isOpen={isPollModalOpen} onClose={handleClosePollModal} meetingId={joinData.meetingId} />
        <BreakoutModalWrapper 
          isOpen={isBreakoutModalOpen} 
          onClose={handleCloseBreakoutModal} 
          meetingId={id || ''} 
          organizerId={joinData.organizerId}
        />
        <QuestionDetailModal 
          isOpen={isQuestionModalOpen} 
          onClose={handleCloseQuestionModal} 
          question={selectedQuestion} 
          userId={user?.id || ''} 
          meetingId={id || ''} 
          isOrganizer={isOrganizer}
          isCoHost={isCoHost}
        />
        <ConfirmEndBreakoutModal
          isOpen={isConfirmEndOpen}
          onClose={() => setIsConfirmEndOpen(false)}
          onConfirm={async () => {
            try {
              await apiClient.post(`/meetings/${id}/breakout-rooms/end`);
              window.dispatchEvent(new CustomEvent('send-breakout-end-signal'));
              showSuccessToast("Đã kết thúc thảo luận nhóm", '🏠');
            } catch (err) {
              console.error("Failed to end breakout", err);
              showErrorToast("Không thể kết thúc chia phòng");
            }
          }}
          title="Kết thúc thảo luận"
          message="Bạn có chắc chắn muốn kết thúc tất cả các phòng thảo luận và thu hồi mọi người về phòng chính ngay bây giờ không?"
        />
      </LiveKitRoom>
      <style dangerouslySetInnerHTML={{ __html: `
        .lk-premium-theme .lk-control-bar { background: transparent !important; border: none !important; width: auto !important; margin: 0 !important; gap: 0.5rem !important; }
        .lk-premium-theme .lk-button { height: 40px !important; width: 40px !important; border-radius: 0.75rem !important; background: rgba(255, 255, 255, 0.05) !important; border: 1px solid rgba(255, 255, 255, 0.05) !important; padding: 0 !important; display: flex !important; align-items: center !important; justify-content: center !important; transition: all 0.2s !important; }
        .lk-premium-theme .lk-button:hover { background: rgba(255, 255, 255, 0.1) !important; transform: translateY(-2px); }
        .lk-premium-theme .lk-button[data-lk-active="true"] { background: rgba(34, 211, 238, 0.1) !important; color: #22d3ee !important; border-color: rgba(34, 211, 238, 0.2) !important; }
        .lk-premium-theme .lk-disconnect-button { background: #ef4444 !important; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}} />
      <Toaster position="top-center" reverseOrder={false} />
    </div>
  )
}

export default MeetingRoomPage
