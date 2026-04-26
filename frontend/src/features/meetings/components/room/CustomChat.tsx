import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '@livekit/components-react';
import { MessageSquare, Send } from 'lucide-react';

const CustomChat: React.FC = () => {
  const { t } = useTranslation();
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
          <div className="h-full flex flex-col items-center justify-center text-slate-300 space-y-3">
             <div className="p-5 rounded-full bg-slate-50 mb-2 border border-slate-200">
                <MessageSquare className="h-8 w-8" />
             </div>
             <p className="text-[18px] font-bold text-slate-500">{t('meeting.no_messages')}</p>
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
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden ${isSelf ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600 border border-slate-300'}`}>
                   {avatarUrl ? (
                     <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                   ) : (
                     initials
                   )}
                </div>
                <div className={`max-w-[85%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                   <div className="flex items-center gap-3 mb-2 px-1">
                      <span className="text-sm font-bold text-slate-950">{msg.from?.name || msg.from?.identity}</span>
                      <span className="text-[10px] font-medium text-slate-500">{formatTime(msg.timestamp)}</span>
                   </div>
                  <div className={`px-4 py-3 rounded-[1.25rem] text-[14px] leading-relaxed shadow-sm ${isSelf ? 'bg-cyan-600 text-white' : 'bg-slate-50 border border-slate-300 text-slate-950'}`}>
                    {msg.message}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={lastMessageRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 pb-12 bg-transparent">
        <div className="relative flex items-center gap-2 bg-slate-50 border border-slate-300 rounded-2xl p-2.5 focus-within:border-cyan-500/40 transition-all shadow-sm">
          <textarea 
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('meeting.send_placeholder')}
            rows={1}
            className="flex-1 bg-transparent border-none text-[14px] text-slate-950 placeholder:text-slate-400 focus:outline-none focus:ring-0 resize-none max-h-32 py-1.5 pl-2 custom-scrollbar"
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim()}
            className="flex-shrink-0 h-9 w-9 rounded-xl bg-cyan-600 text-white flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-20 shadow-md"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default CustomChat;
