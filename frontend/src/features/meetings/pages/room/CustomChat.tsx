import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '@livekit/components-react';
import { MessageSquare, Send } from 'lucide-react';
import apiClient from '@/lib/apiClient';

interface SavedMessage {
  id: string;
  message: string;
  timestamp: number;
  from?: {
    identity?: string;
    name?: string;
    metadata?: string;
    isLocal: boolean;
  };
}

interface DbChatMessage {
  id: string;
  message: string;
  senderUserId: string;
  senderName?: string;
  senderAvatar?: string;
  createdAt: string;
}

interface CustomChatProps {
  meetingId: string;
  isInBreakout?: boolean;
}

const CustomChat: React.FC<CustomChatProps> = ({ meetingId, isInBreakout }) => {
  const { t } = useTranslation();
  const { chatMessages, send } = useChat();
  const [input, setInput] = useState('');
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Merged list: DB history + LiveKit realtime
  const [messages, setMessages] = useState<SavedMessage[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Load message history from DB on mount or when meetingId changes
  const loadHistory = useCallback(async () => {
    if (!meetingId) return;
    setIsLoadingHistory(true);
    try {
      const params: Record<string, string> = {};
      if (isInBreakout) {
        // The backend derives breakoutRoomId from the participant assignment
        params.breakoutRoomId = 'current';
      }
      const res = await apiClient.get(`/meetings/${meetingId}/chat-messages`, { params });
      const dbMessages: DbChatMessage[] = res.data;

      const historical: SavedMessage[] = dbMessages.map((m) => ({
        id: `db_${m.id}`,
        message: m.message,
        timestamp: new Date(m.createdAt).getTime(),
        from: {
          identity: m.senderUserId,
          name: m.senderName,
          metadata: m.senderAvatar ? JSON.stringify({ avatar: m.senderAvatar }) : undefined,
          isLocal: false, // History messages are never "local" in rendering
        },
      }));

      setMessages(historical);
    } catch (err) {
      console.error('[CustomChat] Failed to load history from DB', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [meetingId, isInBreakout]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Synchronize new LiveKit realtime messages (merge, dedup)
  useEffect(() => {
    if (chatMessages.length === 0) return;

    setMessages((prev) => {
      const incoming: SavedMessage[] = chatMessages.map((msg) => ({
        id: msg.id,
        message: msg.message,
        timestamp: msg.timestamp,
        from: msg.from
          ? {
              identity: msg.from.identity,
              name: msg.from.name,
              metadata: msg.from.metadata,
              isLocal: msg.from.isLocal,
            }
          : undefined,
      }));

      const merged = [...prev];
      incoming.forEach((msg) => {
        if (!merged.some((m) => m.id === msg.id)) {
          merged.push(msg);
        }
      });

      merged.sort((a, b) => a.timestamp - b.timestamp);
      return merged;
    });
  }, [chatMessages]);

  useEffect(() => {
    lastMessageRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed) return;

    setInput('');

    // 1. Broadcast via LiveKit data channel (realtime for all connected participants)
    await send(trimmed);

    // 2. Persist to DB (async, fire-and-forget)
    apiClient
      .post(`/meetings/${meetingId}/chat-messages`, { 
        message: trimmed,
        breakoutRoomId: isInBreakout ? 'current' : undefined,
      })
      .catch((err) => console.error('[CustomChat] Failed to save message to DB', err));
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
        {isLoadingHistory ? (
          <div className="h-full flex items-center justify-center text-slate-500 text-sm">
            {t('meeting.loading_chat_history', 'Đang tải lịch sử tin nhắn...')}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3">
            <div className="p-5 rounded-full bg-white/5 mb-2 border border-white/10">
              <MessageSquare className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-[17px] font-bold text-slate-500">{t('meeting.no_messages')}</p>
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isSelf = msg.from?.isLocal;

            let avatarUrl = null;
            if (msg.from?.metadata) {
              try {
                const meta = JSON.parse(msg.from.metadata);
                avatarUrl = meta.avatar;
              } catch (e) {
                console.error('Failed to parse metadata', e);
              }
            }

            const initials = msg.from?.identity?.charAt(0).toUpperCase() || '?';

            return (
              <div key={msg.id || idx} className={`flex gap-3 ${isSelf ? 'flex-row-reverse' : 'flex-row'}`}>
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center text-[10px] font-bold shrink-0 overflow-hidden ${
                    isSelf
                      ? 'bg-cyan-600 text-white shadow-[0_0_15px_rgba(8,145,178,0.3)]'
                      : 'bg-white/10 text-slate-200 border border-white/10'
                  }`}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className={`max-w-[85%] flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-3 mb-2 px-1">
                    <span className="text-sm font-bold text-white">
                      {msg.from?.name || msg.from?.identity}
                    </span>
                    <span className="text-[10px] font-medium text-slate-500">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div
                    className={`px-4 py-3 rounded-[1.25rem] text-[14px] leading-relaxed shadow-sm ${
                      isSelf
                        ? 'bg-cyan-600 text-white'
                        : 'bg-white/5 border border-white/5 text-slate-200'
                    }`}
                  >
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
        <div className="relative flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2.5 focus-within:border-cyan-500/40 focus-within:bg-white/[0.08] transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('meeting.send_placeholder')}
            rows={1}
            className="flex-1 bg-transparent border-none text-[14px] text-white placeholder:text-slate-500 focus:outline-none focus:ring-0 resize-none max-h-32 py-1.5 pl-2 custom-scrollbar"
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
