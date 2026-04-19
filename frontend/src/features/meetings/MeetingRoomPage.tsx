import React, { useState, useEffect } from 'react'
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

import apiClient from '@/lib/apiClient'
import { useAuth } from '../auth/AuthContext'

// Sub-components
import MeetingLobby from './components/room/MeetingLobby'
import MeetingMainStage from './components/room/MeetingMainStage'
import MeetingSidebar from './components/room/MeetingSidebar'

interface JoinResponse {
  meetingId: string
  token: string
  liveKitUrl: string
  participants: any[]
}

const MeetingRoomPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user } = useAuth()
  
  const [preJoinChoices, setPreJoinChoices] = useState<LocalUserChoices | undefined>(undefined)
  const [joinData, setJoinData] = useState<JoinResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Custom Lobby State
  const [username, setUsername] = useState(user ? `${user.firstName} ${user.lastName}` : '')
  const [isMicOn, setIsMicOn] = useState(true)
  const [isCamOn, setIsCamOn] = useState(true)
  const [localVideoTrack, setLocalVideoTrack] = useState<LocalVideoTrack | null>(null)

  // Room UI State
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const [activeTab, setActiveTab] = useState<'chat' | 'participants'>('participants')

  // Initialize camera preview
  useEffect(() => {
    let track: LocalVideoTrack | null = null
    
    if (isCamOn) {
      const startPreview = async () => {
        try {
          track = await createLocalVideoTrack()
          setLocalVideoTrack(track)
        } catch (e) {
          console.error("Failed to start preview", e)
        }
      }
      startPreview()
    }

    return () => {
      if (track) {
        track.stop()
      }
      setLocalVideoTrack(null)
    }
  }, [isCamOn])

  const handlePreJoinSubmit = async (choices: LocalUserChoices) => {
    setIsLoading(true)
    try {
      const response = await apiClient.post(`/meetings/${id}/join`)
      setJoinData(response.data)
      setPreJoinChoices(choices)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join')
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleSidebar = (tab: 'chat' | 'participants') => {
    if (isSidebarOpen && activeTab === tab) {
      setIsSidebarOpen(false)
    } else {
      setIsSidebarOpen(true)
      setActiveTab(tab)
    }
  }

  if (error) {
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
          <h2 className="mt-8 text-2xl font-black tracking-tight">Access Denied</h2>
          <p className="mt-4 text-slate-400 font-medium leading-relaxed">{error}</p>
          <button 
            onClick={() => navigate('/')}
            className="mt-10 flex items-center gap-2 rounded-2xl bg-white px-8 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-slate-200 active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
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
        avatarUrl={user?.profilePictureUrl || null}
      />
    )
  }

  return (
    <div className="h-screen w-screen bg-[#020202] overflow-hidden font-sans lk-premium-theme flex text-white">
      <LiveKitRoom
        video={preJoinChoices.videoEnabled}
        audio={preJoinChoices.audioEnabled}
        token={joinData.token}
        serverUrl={joinData.liveKitUrl}
        onDisconnected={() => navigate('/')}
        data-lk-theme="default"
        className="flex-1 flex overflow-hidden lg:flex-row flex-col"
      >
        <LayoutContextProvider>
          <MeetingMainStage 
            meetingId={id || ''}
            isSidebarOpen={isSidebarOpen}
            activeTab={activeTab}
            onToggleSidebar={handleToggleSidebar}
            onEndSession={() => navigate('/')}
          />

          <MeetingSidebar 
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
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
