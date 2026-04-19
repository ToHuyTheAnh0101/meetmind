import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@livekit/components-react';
import { MessageSquare, Send } from 'lucide-react';

const CustomChat: React.FC = () => {
  const { chatMessages, send } = useChat();
  const [input, setInput] = useState('');
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    if (input.trim()) {
      await send(input);
      setInput('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (ts: number) => {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Messages List */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {chatMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-50">
             <MessageSquare className="h-10 w-10" />
             <p className="text-xs font-bold uppercase tracking-widest">No messages yet</p>
          </div>
        ) : (
          chatMessages.map((msg, idx) => {
            const isSelf = msg.from?.isLocal;
            
            // Extract avatar from metadata
            let avatarUrl = null;
            if (msg.from?.metadata) {
              try {
                const meta = JSON.parse(msg.from.metadata);
                avatarUrl = meta.avatar;
              } catch (e) {
                console.error("Failed to parse metadata", e);
              }
            }

            const initials = msg.from?.identity?.charAt(0).toUpperCase() || '?';
            
            return (
              <div key={msg.id || idx} className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-black shrink-0 overflow-hidden ${isSelf ? 'bg-cyan-500 text-white' : 'bg-white/10 text-slate-300'}`}>
                   {avatarUrl ? (
                     <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                   ) : (
                     initials
                   )}
                </div>
                <div className={`max-w-[80%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                   <div className="flex items-center gap-3 mb-2 px-1">
                      <span className="text-lg font-black text-white">{msg.from?.name || msg.from?.identity}</span>
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{formatTime(msg.timestamp)}</span>
                   </div>
                  <div className={`px-5 py-3.5 rounded-[1.25rem] text-[15px] leading-relaxed border-2 ${isSelf ? 'bg-cyan-500/25 text-white border-cyan-500/50 shadow-lg shadow-cyan-500/10' : 'bg-white/10 text-white border-white/30 shadow-xl'}`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={lastMessageRef} />
      </div>

      {/* Input Area - Redesigned as a floating bubble without top border */}
      <div className="px-6 pb-12 bg-transparent">
        <div className="relative flex items-end gap-2 bg-[#1a1a1b] border-2 border-white/20 rounded-[1.75rem] p-3 focus-within:border-cyan-500/40 transition-all shadow-2xl">
          <textarea 
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Send a message..."
            rows={1}
            className="flex-1 bg-transparent border-none text-[15px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 resize-none max-h-32 py-1.5 pl-2 custom-scrollbar"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 h-10 w-10 rounded-full bg-cyan-500 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-30 disabled:grayscale disabled:scale-100"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomChat;
