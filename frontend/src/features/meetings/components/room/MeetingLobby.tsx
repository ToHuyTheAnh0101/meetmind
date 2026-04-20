import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  VideoOff, 
  Mic, 
  MicOff, 
  Video, 
  Loader2,
  Lock,
  AlertCircle
} from 'lucide-react';
import { LocalVideoTrack } from 'livekit-client';
import { LocalUserChoices } from '@livekit/components-react';

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
}

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
}) => {
  return (
    <div className="relative min-h-screen flex flex-col bg-[#050505] overflow-hidden">
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-500/10 blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-indigo-500/10 blur-[150px]" />
      
      <header className="relative z-10 p-8">
        <button 
          onClick={onExit}
          className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-base font-bold"
        >
          <ArrowLeft className="h-4 w-4" />
          Exit Hub
        </button>
      </header>

      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-[85rem]">
          <div className="grid lg:grid-cols-[1.2fr,0.8fr] gap-16 items-center">
            <div className="relative group">
              <div className="relative aspect-video rounded-[3rem] overflow-hidden border-2 border-white/30 bg-black shadow-2xl shadow-cyan-500/10">
                {isCamOn && localVideoTrack ? (
                  <video 
                    ref={(node) => node && localVideoTrack.attach(node)} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover transform scale-x-[-1]" 
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0a0b] overflow-hidden">
                    {avatarUrl ? (
                      <div className="relative w-full h-full flex items-center justify-center">
                        <div className="absolute inset-0 bg-cyan-500/5 blur-3xl rounded-full scale-50" />
                        <img 
                          src={avatarUrl} 
                          alt="User Avatar" 
                          className="h-32 w-32 rounded-full border-4 border-white/5 shadow-2xl relative z-10 object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-white/5 flex items-center justify-center text-white/20">
                        <VideoOff className="h-10 w-10" />
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2 rounded-2xl bg-black/40 backdrop-blur-md border border-white/5">
                  <button 
                    onClick={() => setIsMicOn(!isMicOn)} 
                    className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${isMicOn ? 'bg-white/10 text-white' : 'bg-rose-500 text-white'}`}
                  >
                    {isMicOn ? <Mic /> : <MicOff />}
                  </button>
                  <button 
                    onClick={() => setIsCamOn(!isCamOn)} 
                    className={`h-12 w-12 rounded-xl flex items-center justify-center transition-all ${isCamOn ? 'bg-white/10 text-white' : 'bg-rose-500 text-white'}`}
                  >
                    {isCamOn ? <Video /> : <VideoOff />}
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              <h1 className="text-5xl font-black text-white tracking-tighter">
                Ready to <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400">Collaborate?</span>
              </h1>
              <div className="space-y-4">
                <input 
                  value={username} 
                  onChange={e => setUsername(e.target.value)} 
                  className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-5 px-8 text-xl text-white font-black placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all shadow-2xl" 
                  placeholder="Your Display Name" 
                />

                {requiresPassword && setPassword && (
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-cyan-400 transition-colors">
                      <Lock className="h-5 w-5" />
                    </div>
                    <input 
                      type="password"
                      value={password} 
                      onChange={e => setPassword(e.target.value)} 
                      className="w-full bg-white/10 border-2 border-white/20 rounded-2xl py-5 pl-14 pr-8 text-xl text-white font-bold placeholder:text-white/20 focus:outline-none focus:ring-4 focus:ring-cyan-500/20 transition-all shadow-2xl" 
                      placeholder="Meeting Password" 
                    />
                  </div>
                )}

                {error && (
                  <div className="flex items-center gap-2 px-6 py-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm font-bold animate-shake">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {error}
                  </div>
                )}

                <button 
                  onClick={() => onJoin({ username, videoEnabled: isCamOn, audioEnabled: isMicOn, videoDeviceId: '', audioDeviceId: '' })}
                  disabled={!username || isLoading}
                  className="w-full bg-white text-slate-950 py-4 rounded-2xl font-black transition-transform active:scale-95 disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'Enter Space'}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default MeetingLobby;
