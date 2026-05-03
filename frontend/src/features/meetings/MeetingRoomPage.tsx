import React, { useState, useEffect, useMemo } from 'react'
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

interface JoinResponse {
  meetingId: string
  organizerId: string
  token: string
  liveKitUrl: string
  participants: any[]
  status?: string
}

const MeetingRoomPage: React.FC = () => {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
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
    organizerId: string;
  } | null>(null)

  // Custom Lobby State
  const [username, setUsername] = useState(user ? `${user.firstName} ${user.lastName}` : '')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null)
  const [isWaitingInLobby, setIsWaitingInLobby] = useState(false)

  // Room UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'roster' | 'lobby' | 'settings'>('roster')

  // Icons used in Lobby
  const UsersIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-users"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  );

  // Polling for admittance if in lobby
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isWaitingInLobby && id) {
      interval = setInterval(async () => {
        try {
          const response = await apiClient.post<JoinResponse>(`/meetings/${id}/join`, { password }, { _skipLogout: true } as any);
          if (response.data.status === 'admitted') {
            setIsWaitingInLobby(false);
            setJoinData(response.data as JoinResponse);
          }
        } catch (error) {
          console.error("Polling for admittance failed", error);
        }
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isWaitingInLobby, id, password]);

  // Fetch Meeting Details for Lobby
  useEffect(() => {
    if (id) {
      apiClient.get(`/meetings/${id}/public`).then(res => {
        setMeetingDetails({
          title: res.data.title,
          description: res.data.description,
          participantCount: res.data.participantCount || 0,
          allowDisplayNameEdit: res.data.allowDisplayNameEdit ?? true,
          organizerId: res.data.organizerId
        })
        if (res.data.hasPassword) {
          setRequiresPassword(true)
        }
      }).catch(err => console.error("Failed to fetch meeting details", err))
    }
  }, [id])

  // Initialize camera preview
  useEffect(() => {
    let activeTrack: LocalVideoTrack | null = null

    if (isCamOn && !joinData) {
      const startPreview = async () => {
        try {
          activeTrack = await createLocalVideoTrack()
          setLocalVideoTrack(activeTrack)
        } catch (e) {
          console.error("Failed to start preview", e)
        }
      }
      startPreview()
    }

    return () => {
      if (activeTrack) {
        activeTrack.stop()
      }
      setLocalVideoTrack(null)
    }
  }, [isCamOn, !!joinData])

  const handlePreJoinSubmit = async (choices: LocalUserChoices) => {
    setIsLoading(true)
    try {
      const response = await apiClient.post<any>(`/meetings/${id}/join`, { 
        password,
        displayName: choices.username 
      }, { _skipLogout: true } as any)
      
      if (response.data.status === 'waiting') {
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
  }

  const handleToggleSidebar = (tab: 'chat' | 'roster' | 'lobby' | 'settings') => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false)
    } else {
      setIsSidebarOpen(true)
      setActiveTab(tab)
    }
  }

  const isPasswordError = requiresPassword && (
    error?.toLowerCase().includes('password') || 
    error === t('meeting.invalid_password')
  )

  const isOrganizer = useMemo(() => {
    if (joinData && user) return joinData.organizerId === user.id
    if (meetingDetails && user) return meetingDetails.organizerId === user.id
    return false
  }, [joinData, meetingDetails, user])

  const handleEndSession = async () => {
    try {
      await apiClient.post(`/meetings/${id}/end`)
      navigate('/')
    } catch (err) {
      console.error("Failed to end meeting", err)
      navigate('/') // Fallback
    }
  }

  const handleLeaveSession = async () => {
    try {
      await apiClient.post(`/meetings/${id}/leave`)
    } catch (err) {
      console.error("Failed to call leave API", err)
    }
    navigate('/')
  }

  // Handle explicit tab close or navigation
  useEffect(() => {
    if (joinData && id) {
      const handleUnload = () => {
        // Use sendBeacon for more reliability on close if needed, but simple fetch might work for navigation
        apiClient.post(`/meetings/${id}/leave`).catch(() => {});
      }
      
      window.addEventListener('beforeunload', handleUnload);
      return () => {
        handleUnload(); // Call on unmount
        window.removeEventListener('beforeunload', handleUnload);
      }
    }
  }, [joinData, id]);

  if (isWaitingInLobby) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505] p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative w-full max-w-xl overflow-hidden rounded-[3.5rem] border border-white/20 bg-[#0a0a0b] p-12 text-center shadow-2xl"
        >
          {/* Ambient Background */}
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
               
               <button 
                  onClick={() => setIsWaitingInLobby(false)}
                  className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
               >
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
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex max-w-md flex-col items-center rounded-[2.5rem] border border-white/10 bg-white/5 p-12 text-center backdrop-blur-xl"
        >
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/20 text-rose-500">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="mt-8 text-2xl font-black tracking-tight">{t('meeting.access_denied')}</h2>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-10 flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 active:scale-95"
          >
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
        video={preJoinChoices.videoEnabled}
        audio={preJoinChoices.audioEnabled}
        token={joinData.token}
        serverUrl={joinData.liveKitUrl}
        onDisconnected={() => navigate('/')}
        data-lk-theme="default"
        className="w-full h-full flex overflow-hidden lg:flex-row flex-col"
      >
        <LayoutContextProvider>
           <div className="flex-1 h-full min-w-0 overflow-hidden flex flex-col relative transition-all duration-500 ease-in-out">
            <MeetingMainStage 
              meetingId={id || ''}
              isSidebarOpen={isSidebarOpen}
              isOrganizer={isOrganizer}
              activeTab={activeTab}
              onToggleSidebar={handleToggleSidebar}
              onEndSession={handleEndSession}
              onLeaveSession={handleLeaveSession}
            />
          </div>

          <MeetingSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            meetingId={joinData.meetingId}
            organizerId={joinData.organizerId}
            isOrganizer={isOrganizer}
          />
        </LayoutContextProvider>
      </LiveKitRoom>

      {/* Global CSS Overrides */}
      <style dangerouslySetInnerHTML={{ __html: `
        .lk-premium-theme .lk-control-bar {
          background: transparent !important;
          border: none !important;
          width: auto !important;
          margin: 0 !important;
          gap: 0.5rem !important;
        }
        .lk-premium-theme .lk-button {
          height: 40px !important;
          width: 40px !important;
          border-radius: 0.75rem !important;
          background: rgba(255, 255, 255, 0.05) !important;
          border: 1px solid rgba(255, 255, 255, 0.05) !important;
          padding: 0 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          transition: all 0.2s !important;
        }
        .lk-premium-theme .lk-button:hover {
          background: rgba(255, 255, 255, 0.1) !important;
          transform: translateY(-2px);
        }
        .lk-premium-theme .lk-button[data-lk-active="true"] {
          background: rgba(34, 211, 238, 0.1) !important;
          color: #22d3ee !important;
          border-color: rgba(34, 211, 238, 0.2) !important;
        }
        .lk-premium-theme .lk-disconnect-button {
          background: #ef4444 !important;
        }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.1); border-radius: 10px; }
      `}} />
    </div>
  )
}

export default MeetingRoomPage
