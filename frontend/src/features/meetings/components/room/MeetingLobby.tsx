import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  VideoOff, 
  Mic, 
  MicOff, 
  Video, 
  Loader2,
  Lock,
  AlertCircle,
  Settings,
  Monitor,
  Info,
  ChevronDown
} from 'lucide-react';
import { LocalVideoTrack } from 'livekit-client';
import { LocalUserChoices, useMediaDevices } from '@livekit/components-react';

interface MeetingLobbyProps {
  username: string;
  setUsername: (name: string) => void;
  isMicOn: boolean;
  setIsMicOn: (on: boolean) => void;
  isCamOn: boolean;
  setIsCamOn: (on: boolean) => void;
  localVideoTrack: LocalVideoTrack | null;
  isLoading: boolean;
  onJoin: (choices: LocalUserChoices) => void;
  onExit: () => void;
  avatarUrl?: string | null;
  requiresPassword?: boolean;
  password?: string;
  setPassword?: (password: string) => void;
  error?: string | null;
  meetingTitle?: string;
  meetingDescription?: string;
  participantCount?: number;
  allowDisplayNameEdit?: boolean;
}

const AudioVisualizer = ({ isActive }: { isActive: boolean }) => {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!isActive) {
      setLevel(0);
      return;
    }
    
    // Simulate audio level for UI feedback
    const interval = setInterval(() => {
      setLevel(Math.random() * 60 + 10);
    }, 100);
    
    return () => clearInterval(interval);
  }, [isActive]);

  return (
    <div className="flex items-end gap-1 h-8 w-16">
      {[1, 2, 3, 4, 5].map((i) => (
        <motion.div
          key={i}
          animate={{ height: isActive ? `${level * (0.4 + Math.random() * 0.6)}%` : '10%' }}
          className="w-1.5 bg-cyan-500 rounded-full transition-all duration-75"
        />
      ))}
    </div>
  );
};

const MeetingLobby: React.FC<MeetingLobbyProps> = ({
  username,
  setUsername,
  isMicOn,
  setIsMicOn,
  isCamOn,
  setIsCamOn,
  localVideoTrack,
  isLoading,
  onJoin,
  onExit,
  avatarUrl,
  requiresPassword,
  password = '',
  setPassword,
  error,
  meetingTitle = "Chiến lược lộ trình Q3",
  meetingDescription = "Thảo luận về kế hoạch phát triển sản phẩm cho quý tới và thống nhất các mục tiêu quan trọng.",
  participantCount = 3,
  allowDisplayNameEdit = true
}) => {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  
  // Device Selection (Using LiveKit hooks)
  const devices = useMediaDevices({ kind: 'videoinput' });
  const audioDevices = useMediaDevices({ kind: 'audioinput' });

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] overflow-hidden font-vietnam selection:bg-cyan-500/30">
      {/* Dynamic Animated Mesh Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-5%] h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[120px] animate-mesh" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[700px] w-[700px] rounded-full bg-indigo-600/10 blur-[150px] animate-mesh [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(circle_at_center,transparent_0%,#050505_80%)]" />
      </div>
      
      <header className="relative z-10 p-3 lg:p-4 flex items-center justify-between">
        <button 
          onClick={onExit}
          className="flex items-center gap-3 text-white/50 hover:text-white transition-all group"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold tracking-wide">{t('meeting.exit_hub')}</span>
        </button>

        <div className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md">
           <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
           <span className="text-xs font-bold text-slate-300 tracking-wide">Hệ thống sẵn sàng</span>
        </div>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-2 lg:p-4 overflow-hidden">
        <div className="w-full max-w-[85rem] grid lg:grid-cols-[1fr,360px] xl:grid-cols-[1fr,400px] gap-6 xl:gap-8 items-center origin-center lg:scale-[0.9] xl:scale-100 transition-transform">
          
          {/* Left: Professional Monitor Preview */}
          <div className="flex flex-col gap-6 self-center">
             <div className="relative group w-full">
                {/* Mirror Border Effect */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500/20 via-white/5 to-indigo-500/20 rounded-[2.5rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative aspect-video rounded-[3rem] overflow-hidden border border-white/20 bg-[#0a0a0b] shadow-2xl">
                  {isCamOn && localVideoTrack ? (
                    <video 
                      ref={(node) => node && localVideoTrack.attach(node)} 
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover transform scale-x-[-1]" 
                    />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0b]">
                       <div className="relative">
                          <div className="absolute inset-0 bg-cyan-500/20 blur-[60px] rounded-full scale-150 animate-pulse" />
                          {avatarUrl ? (
                            <img src={avatarUrl} className="h-40 w-40 rounded-full border-4 border-white/10 relative z-10 object-cover shadow-2xl" alt="" />
                          ) : (
                            <div className="h-32 w-32 rounded-full bg-white/5 flex items-center justify-center text-white/10 border-2 border-white/5 relative z-10">
                               <VideoOff className="h-16 w-16" />
                            </div>
                          )}
                       </div>
                       <p className="mt-8 text-white/40 font-bold tracking-wide text-xs">Máy ảnh đang tắt</p>
                    </div>
                  )}

                  {/* Overlays */}
                  <div className="absolute top-6 left-6 flex items-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10">
                     <AudioVisualizer isActive={isMicOn} />
                     <div className="w-px h-4 bg-white/10" />
                     <span className="text-[10px] font-black text-white/60 tracking-wide">{isMicOn ? 'Mic Live' : 'Muted'}</span>
                  </div>

                  <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2.5 rounded-2xl bg-black/60 backdrop-blur-2xl border border-white/20 shadow-2xl">
                    <button 
                      onClick={() => setIsMicOn(!isMicOn)} 
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20'}`}
                    >
                      {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button 
                      onClick={() => setIsCamOn(!isCamOn)} 
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20'}`}
                    >
                      {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all ${showSettings ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                </div>
             </div>

             {/* Device Settings Panel (Inline) */}
             <AnimatePresence>
               {showSettings && (
                 <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="grid grid-cols-2 gap-3"
                 >
                    <div className="glass-card p-3.5 rounded-[1.5rem]">
                       <label className="text-[9px] font-black text-cyan-400 block mb-1.5">Máy ảnh</label>
                       <div className="flex items-center justify-between text-xs text-white font-medium">
                          <span className="truncate">{devices.find((d: MediaDeviceInfo) => d.deviceId === 'default')?.label || 'Camera'}</span>
                          <ChevronDown className="h-3 w-3 text-white/40 ml-1" />
                       </div>
                    </div>
                    <div className="glass-card p-3.5 rounded-[1.5rem]">
                       <label className="text-[9px] font-black text-indigo-400 block mb-1.5">Microphone</label>
                       <div className="flex items-center justify-between text-xs text-white font-medium">
                          <span className="truncate">{audioDevices.find((d: MediaDeviceInfo) => d.deviceId === 'default')?.label || 'Mic'}</span>
                          <ChevronDown className="h-3 w-3 text-white/40 ml-1" />
                       </div>
                    </div>
                 </motion.div>
               )}
             </AnimatePresence>
          </div>

          {/* Right: Meeting Passport Card */}
          <div className="flex flex-col gap-4">
             <div className="glass-card p-5 lg:p-6 rounded-[2rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-5">
                   <Monitor className="h-24 w-24" />
                </div>
                
                <div className="relative z-10">
                   <div className="flex items-center gap-3 mb-6">
                      <div className="h-10 w-10 rounded-xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                         <Info className="h-5 w-5" />
                      </div>
                      <h2 className="text-2xl font-black text-white tracking-tight">{meetingTitle}</h2>
                   </div>
                   
                   <p className="text-slate-400 text-sm font-medium leading-relaxed mb-6">
                      {meetingDescription}
                   </p>

                   <div className="flex flex-col gap-3 py-5 border-y border-white/5 mb-6">
                      <span className="text-base font-medium text-slate-300">{t('meeting.already_joined')}</span>
                      <div className="flex -space-x-3">
                         {[1, 2, 3].map(i => (
                           <div key={i} className="h-10 w-10 rounded-full border-2 border-[#0a0a0b] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden">
                              <img src={`https://i.pravatar.cc/100?img=${i+10}`} alt="" />
                           </div>
                         ))}
                         <div className="h-10 w-10 rounded-full border-2 border-[#0a0a0b] bg-cyan-500 flex items-center justify-center text-[10px] font-black text-white">
                            +{participantCount}
                         </div>
                      </div>
                   </div>

                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-400 ml-1">{t('meeting.display_name')}</label>
                        <input 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          readOnly={!allowDisplayNameEdit}
                          className={`w-full glass-input rounded-xl py-3 px-5 text-base text-white font-semibold placeholder:text-white/10 transition-all ${!allowDisplayNameEdit ? 'opacity-70 cursor-not-allowed bg-white/5 border-white/5' : ''}`} 
                          placeholder={allowDisplayNameEdit ? "Nhập tên của bạn..." : "Tên đã được cố định"} 
                        />
                        {!allowDisplayNameEdit && (
                          <p className="text-sm font-bold text-slate-500 mt-3 px-2 italic">
                            Chủ phòng đã khóa tính năng đổi tên cho cuộc họp này.
                          </p>
                        )}
                      </div>

                      {requiresPassword && setPassword && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-rose-400/80 ml-1">{t('meeting.security_code')}</label>
                          <div className="relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20">
                              <Lock className="h-5 w-5" />
                            </div>
                            <input 
                              type="password"
                              value={password} 
                              onChange={e => setPassword(e.target.value)} 
                              className="w-full glass-input rounded-xl py-3 pl-12 pr-6 text-base text-white font-bold placeholder:text-white/10" 
                              placeholder="Mã bảo mật..." 
                            />
                          </div>
                        </div>
                      )}

                      {error && (
                        <div className="flex items-center gap-3 px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold animate-shake">
                          <AlertCircle className="h-4 w-4 shrink-0" />
                          {error}
                        </div>
                      )}

                      <button 
                        onClick={() => onJoin({ username, videoEnabled: isCamOn, audioEnabled: isMicOn, videoDeviceId: '', audioDeviceId: '' })}
                        disabled={!username || isLoading}
                        className="group relative w-full mt-4"
                      >
                         <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200" />
                         <div className="relative flex h-14 w-full items-center justify-center rounded-xl bg-white font-black text-slate-950 transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50">
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : t('meeting.enter_space')}
                         </div>
                      </button>
                   </div>
                </div>
             </div>
             
          </div>
        </div>
      </main>
    </div>
  );
};

export default MeetingLobby;
