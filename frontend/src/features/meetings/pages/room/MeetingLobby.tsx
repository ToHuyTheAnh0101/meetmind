import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Check,
  Sparkles
} from 'lucide-react';
import { LocalVideoTrack } from 'livekit-client';
import { LocalUserChoices, useMediaDevices } from '@livekit/components-react';

// --- Virtual Background Options ---
const VIRTUAL_BACKGROUNDS = [
  { 
    id: 'none', 
    label: 'Không có', 
    type: 'none', 
    url: '', 
    preview: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' 
  },
  { 
    id: 'blur', 
    label: 'Làm mờ', 
    type: 'blur', 
    url: '', 
    preview: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80&blur=10' 
  },
  {
    id: 'office',
    label: 'Văn phòng',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'livingroom',
    label: 'Phòng ấm',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'studio',
    label: 'Studio',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'space',
    label: 'Vũ trụ',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'gradient',
    label: 'Gradient',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'
  }
];

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
  allowDisplayNameEdit?: boolean;
  selectedVideoId: string;
  setSelectedVideoId: (id: string) => void;
  selectedAudioId: string;
  setSelectedAudioId: (id: string) => void;
  participants?: any[];
}

const AudioVisualizer = ({ isActive }: { isActive: boolean }) => {
  const [level, setLevel] = useState(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let fallbackInterval: NodeJS.Timeout | null = null;

    if (!isActive) {
      cleanup();
      setLevel(0);
      return;
    }

    async function startAudio() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContextClass) {
          throw new Error("Web Audio API not supported");
        }
        const audioContext = new AudioContextClass();
        audioContextRef.current = audioContext;

        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 64;
        analyserRef.current = analyser;
        source.connect(analyser);

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const checkVolume = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);

          let total = 0;
          for (let i = 0; i < bufferLength; i++) {
            total += dataArray[i];
          }
          const average = total / bufferLength;
          const percentage = Math.min((average / 128) * 100, 100);
          setLevel(percentage);

          animationFrameRef.current = requestAnimationFrame(checkVolume);
        };

        checkVolume();
      } catch (err) {
        console.warn("Failed to initialize real audio visualizer, falling back to simulation:", err);
        fallbackInterval = setInterval(() => {
          setLevel(Math.random() * 30 + 5);
        }, 150);
      }
    }

    startAudio();

    return () => {
      cleanup();
      if (fallbackInterval) {
        clearInterval(fallbackInterval);
      }
    };

    function cleanup() {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
      if (audioContextRef.current) {
        if (audioContextRef.current.state !== 'closed') {
          audioContextRef.current.close().catch(() => {});
        }
        audioContextRef.current = null;
      }
    }
  }, [isActive]);

  return (
    <div className="flex items-end gap-1 h-8 w-16">
      {[1, 2, 3, 4, 5].map((i) => {
        const multiplier = 0.4 + (i * 0.12);
        return (
          <motion.div
            key={i}
            animate={{ height: isActive ? `${Math.max(10, level * multiplier)}%` : '10%' }}
            className="w-1.5 bg-cyan-500 rounded-full transition-all duration-75"
          />
        );
      })}
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
  allowDisplayNameEdit = true,
  selectedVideoId,
  setSelectedVideoId,
  selectedAudioId,
  setSelectedAudioId,
  participants = [],
}) => {
  const { t } = useTranslation();
  const [showSettings, setShowSettings] = useState(false);
  
  const activeParticipants = useMemo(() => {
    return participants.filter((p) => p.isInMeeting);
  }, [participants]);
  
  // Device Selection (Using LiveKit hooks)
  const devices = useMediaDevices({ kind: 'videoinput' });
  const audioDevices = useMediaDevices({ kind: 'audioinput' });

  // Virtual Background State
  const [activeBgr, setActiveBgr] = useState<string>('none');

  useEffect(() => {
    const saved = localStorage.getItem('meetmind_virtual_bgr');
    if (saved) {
      setActiveBgr(saved);
    }
  }, []);

  useEffect(() => {
    if (devices && devices.length > 0 && !selectedVideoId) {
      const defaultDev = devices.find((d: MediaDeviceInfo) => d.deviceId === 'default') || devices[0];
      setSelectedVideoId(defaultDev.deviceId);
    }
  }, [devices, selectedVideoId, setSelectedVideoId]);

  useEffect(() => {
    if (audioDevices && audioDevices.length > 0 && !selectedAudioId) {
      const defaultDev = audioDevices.find((d: MediaDeviceInfo) => d.deviceId === 'default') || audioDevices[0];
      setSelectedAudioId(defaultDev.deviceId);
    }
  }, [audioDevices, selectedAudioId, setSelectedAudioId]);

  const handleSelectBgr = (id: string) => {
    setActiveBgr(id);
    localStorage.setItem('meetmind_virtual_bgr', id);
  };

  const selectedBg = VIRTUAL_BACKGROUNDS.find(bg => bg.id === activeBgr);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] overflow-y-auto overflow-x-hidden lg:overflow-hidden font-vietnam selection:bg-cyan-500/30">
      {/* Dynamic Animated Mesh Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-10%] left-[-5%] h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[120px] animate-mesh" />
        <div className="absolute bottom-[-10%] right-[-5%] h-[700px] w-[700px] rounded-full bg-indigo-600/10 blur-[150px] animate-mesh [animation-delay:2s]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-full w-full bg-[radial-gradient(circle_at_center,transparent_0%,#050505_80%)]" />
      </div>
      
      <header className="relative z-10 p-3 lg:p-4 flex items-center justify-between shrink-0">
        <button 
          onClick={onExit}
          className="flex items-center gap-3 text-white/60 hover:text-white transition-all group active:scale-95"
        >
          <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 group-hover:bg-white/10 transition-all">
            <ArrowLeft className="h-5 w-5" />
          </div>
          <span className="text-sm font-bold tracking-wide">{t('meeting.exit_hub')}</span>
        </button>

        <div className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur-md">
           <div className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.5)]" />
           <span className="text-xs font-bold text-emerald-400 tracking-wide">Hệ thống sẵn sàng</span>
        </div>
      </header>
      
      <main className="relative z-10 flex-1 flex items-center justify-center p-2 lg:p-4 overflow-y-auto overflow-x-hidden lg:overflow-hidden">
        <div className="w-full max-w-[85rem] grid lg:grid-cols-[1fr,360px] xl:grid-cols-[1fr,400px] gap-6 xl:gap-8 items-center origin-center lg:scale-[0.9] xl:scale-100 transition-transform">
          
          {/* Left: Professional Monitor Preview */}
          <div className="flex flex-col gap-6 self-center">
             <div className="relative group w-full">
                {/* Mirror Border Effect */}
                <div className="absolute -inset-1 bg-gradient-to-tr from-cyan-500/20 via-white/5 to-indigo-500/20 rounded-[2rem] blur-xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
                
                <div className="relative aspect-video rounded-[1.8rem] lg:rounded-[2.2rem] overflow-hidden border border-white/20 bg-[#0a0a0b] shadow-2xl">
                   {isCamOn && localVideoTrack ? (
                     <div className="relative w-full h-full">
                       {/* Camera Feed */}
                       <video 
                         ref={(node) => node && localVideoTrack.attach(node)} 
                         autoPlay 
                         playsInline 
                         className={`w-full h-full object-cover transform scale-x-[-1] transition-all duration-500 ${
                           activeBgr === 'blur' ? 'filter blur-[4px]' : ''
                         }`} 
                       />
                       
                       {/* Virtual Background simulated overlay when image is active */}
                       {selectedBg && selectedBg.type === 'image' && (
                         <div className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none transform scale-x-[-1]" style={{ backgroundImage: `url(${selectedBg.url})` }} />
                       )}
                     </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0b]">
                       <div className="relative">
                          <div className={`absolute inset-0 ${isCamOn ? 'bg-rose-500/20' : 'bg-cyan-500/20'} blur-[60px] rounded-full scale-150 animate-pulse`} />
                          {avatarUrl ? (
                            <img src={avatarUrl} className="h-40 w-40 rounded-full border-4 border-white/10 relative z-10 object-cover shadow-2xl" alt="" />
                          ) : (
                            <div className="h-32 w-32 rounded-full bg-white/5 flex items-center justify-center text-white/10 border-2 border-white/5 relative z-10">
                               <VideoOff className="h-16 w-16" />
                            </div>
                          )}
                       </div>
                    </div>
                  )}

                  {/* Top Right: Selected Virtual Background Badge */}
                  {isCamOn && selectedBg && selectedBg.id !== 'none' && (
                    <div className="absolute top-4 right-4 lg:top-6 lg:right-6 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600/90 text-white text-[10px] font-black tracking-wide border border-cyan-400 shadow-lg backdrop-blur-md">
                      <Sparkles size={10} />
                      <span>NỀN ẢO: {selectedBg.label.toUpperCase()}</span>
                    </div>
                  )}

                  {/* Overlays */}
                  <div className="absolute top-4 left-4 lg:top-6 lg:left-6 flex items-center gap-2 p-2 rounded-xl bg-black/40 backdrop-blur-xl border border-white/10">
                     <AudioVisualizer isActive={isMicOn} />
                     <div className="w-px h-4 bg-white/10" />
                     <span className="text-[10px] font-black text-white/60 tracking-wide">{isMicOn ? 'Mic Live' : 'Muted'}</span>
                  </div>

                  <div className="absolute bottom-4 lg:bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 p-2 lg:p-2.5 rounded-2xl bg-[#0f0f12]/95 backdrop-blur-2xl border border-white/10 shadow-2xl">
                    <button 
                      onClick={() => setIsMicOn(!isMicOn)} 
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isMicOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20'}`}
                    >
                      {isMicOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
                    </button>
                    <button 
                      onClick={() => setIsCamOn(!isCamOn)} 
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${isCamOn ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20'}`}
                    >
                      {isCamOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
                    </button>
                    <div className="w-px h-6 bg-white/10 mx-1" />
                    <button 
                      onClick={() => setShowSettings(!showSettings)}
                      className={`h-11 w-11 rounded-xl flex items-center justify-center transition-all active:scale-95 ${showSettings ? 'bg-cyan-500 text-white' : 'bg-white/5 text-white hover:bg-white/10'}`}
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                </div>
             </div>

             {/* Device Settings & Virtual Background Panel */}
             <AnimatePresence>
               {showSettings && (
                 <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-4"
                 >
                    {/* Cameras / Mics inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="glass-card p-3.5 rounded-[1.5rem] relative flex flex-col justify-center">
                         <label className="text-[9px] font-black text-cyan-400 block mb-1">Máy ảnh</label>
                         <select
                           value={selectedVideoId}
                           onChange={(e) => setSelectedVideoId(e.target.value)}
                           className="w-full bg-transparent text-xs text-white font-medium border-none outline-none cursor-pointer focus:ring-0 p-0"
                         >
                           {devices.length === 0 ? (
                             <option value="" className="bg-[#0a0a0b] text-white">Không tìm thấy Camera</option>
                           ) : (
                             devices.map((d: MediaDeviceInfo) => (
                               <option key={d.deviceId} value={d.deviceId} className="bg-[#0a0a0b] text-white">
                                 {d.label || `Camera ${d.deviceId.slice(0, 5)}`}
                               </option>
                             ))
                           )}
                         </select>
                      </div>
                      <div className="glass-card p-3.5 rounded-[1.5rem] relative flex flex-col justify-center">
                         <label className="text-[9px] font-black text-indigo-400 block mb-1">Microphone</label>
                         <select
                           value={selectedAudioId}
                           onChange={(e) => setSelectedAudioId(e.target.value)}
                           className="w-full bg-transparent text-xs text-white font-medium border-none outline-none cursor-pointer focus:ring-0 p-0"
                         >
                           {audioDevices.length === 0 ? (
                             <option value="" className="bg-[#0a0a0b] text-white">Không tìm thấy Mic</option>
                           ) : (
                             audioDevices.map((d: MediaDeviceInfo) => (
                               <option key={d.deviceId} value={d.deviceId} className="bg-[#0a0a0b] text-white">
                                 {d.label || `Mic ${d.deviceId.slice(0, 5)}`}
                               </option>
                             ))
                           )}
                         </select>
                      </div>
                    </div>

                    {/* Virtual Background Picker inside pre-join Lobby */}
                    <div className="glass-card p-4 rounded-[1.8rem] space-y-3">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
                        <span className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Cấu hình ảnh nền ảo</span>
                      </div>
                      
                      <div className="grid gap-2 grid-cols-4 sm:grid-cols-7">
                        {VIRTUAL_BACKGROUNDS.map((bg) => {
                          const isSelected = activeBgr === bg.id
                          return (
                            <button
                              key={bg.id}
                              onClick={() => handleSelectBgr(bg.id)}
                              className={`group relative h-12 rounded-xl border overflow-hidden transition-all duration-300 text-left outline-none flex flex-col justify-end ${
                                isSelected
                                  ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg'
                                  : 'border-white/10 hover:border-cyan-500/30'
                              }`}
                            >
                              {bg.type === 'blur' ? (
                                <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/20">
                                  <Sparkles size={12} />
                                </div>
                              ) : bg.type === 'none' ? (
                                <div className="absolute inset-0 bg-white/5 flex items-center justify-center text-white/20">
                                  <Video size={12} />
                                </div>
                              ) : (
                                <img
                                  src={bg.preview}
                                  alt=""
                                  className="absolute inset-0 h-full w-full object-cover"
                                />
                              )}

                              <div className="absolute inset-0 bg-black/40" />

                              {/* Selected check */}
                              {isSelected && (
                                <div className="absolute inset-0 bg-cyan-600/30 flex items-center justify-center text-white">
                                  <Check className="h-3.5 w-3.5" />
                                </div>
                              )}

                              <span className="relative z-10 px-1.5 py-0.5 text-[8px] font-black text-white/95 truncate w-full">
                                {bg.label}
                              </span>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Right: Meeting Passport Card */}
            <div className="flex flex-col gap-4">
             <div className="glass-card p-5 lg:p-6 rounded-[2rem] relative overflow-hidden bg-slate-950/80 border border-white/10 shadow-2xl backdrop-blur-2xl">
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

                   {activeParticipants.length > 0 && (
                      <div className="flex flex-col gap-3 py-5 border-y border-white/5 mb-6">
                         <span className="text-base font-medium text-slate-300">{t('meeting.already_joined')}</span>
                         <div className="flex -space-x-3">
                            {activeParticipants.slice(0, 3).map((p, idx) => {
                              const displayName = p.displayName || (p.user ? `${p.user.firstName} ${p.user.lastName}` : 'User');
                              const imgUrl = p.user?.picture || p.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=random&color=fff`;
                              return (
                                <div key={p.id || idx} className="h-10 w-10 rounded-full border-2 border-[#0a0a0b] bg-slate-800 flex items-center justify-center text-[10px] font-bold text-white overflow-hidden" title={displayName}>
                                   <img src={imgUrl} alt={displayName} className="h-full w-full object-cover" />
                                 </div>
                              );
                            })}
                            {activeParticipants.length > 3 && (
                              <div className="h-10 w-10 rounded-full border-2 border-[#0a0a0b] bg-cyan-500 flex items-center justify-center text-[10px] font-black text-white">
                                 +{activeParticipants.length - 3}
                              </div>
                            )}
                         </div>
                      </div>
                    )}

                   <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-400 ml-1 tracking-wider uppercase">{t('meeting.display_name')}</label>
                        <input 
                          value={username} 
                          onChange={e => setUsername(e.target.value)} 
                          readOnly={!allowDisplayNameEdit}
                          className={`w-full glass-input rounded-xl py-3 px-5 text-base text-white font-semibold placeholder:text-white/10 transition-all focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 ${!allowDisplayNameEdit ? 'opacity-70 cursor-not-allowed bg-white/5 border-white/5' : ''}`} 
                          placeholder={allowDisplayNameEdit ? "Nhập tên của bạn..." : "Tên đã được cố định"} 
                        />
                        {!allowDisplayNameEdit && (
                          <p className="text-xs font-bold text-slate-500 mt-2 px-2 italic">
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
                        onClick={() => onJoin({ username, videoEnabled: isCamOn, audioEnabled: isMicOn, videoDeviceId: selectedVideoId, audioDeviceId: selectedAudioId })}
                        disabled={!username || isLoading}
                        className="group relative w-full mt-4 active:scale-[0.98] transition-transform"
                      >
                         <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-indigo-600 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-1000 group-hover:duration-200" />
                         <div className="relative flex h-14 w-full items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 hover:from-cyan-400 hover:to-indigo-400 font-black text-white transition-all disabled:opacity-50 shadow-lg shadow-cyan-500/10">
                            {isLoading ? <Loader2 className="h-6 w-6 animate-spin text-white" /> : t('meeting.enter_space')}
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
