import React, { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { MessageSquare, Bot, User, Send } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import apiClient from "@/lib/apiClient";
import { getToken } from "@/lib/tokenStorage";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

interface SummaryChatbotSectionProps {
  meetingId: string;
  aiActivated: boolean;
  meetingStatus: any;
}

export const SummaryChatbotSection: React.FC<SummaryChatbotSectionProps> = ({
  meetingId,
  aiActivated,
  meetingStatus,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === "vi";
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const [chatInput, setChatInput] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: t("meeting.summary_tab.welcome_message"),
      timestamp: new Date(),
    },
  ]);

  // Load AI chat history from DB
  const { data: chatHistory, refetch: refetchChatHistory } = useQuery<any[]>({
    queryKey: ["ai-chat-history", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/chat/history`);
      return res.data;
    },
  });

  // Sync historical messages
  useEffect(() => {
    if (chatHistory) {
      const formattedHistory: Message[] = chatHistory.map((h) => ({
        id: h.id,
        role: h.messageType === "user" ? "user" : "assistant",
        content: h.content,
        timestamp: new Date(h.createdAt),
      }));

      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: t("meeting.summary_tab.welcome_message"),
          timestamp: new Date(),
        },
        ...formattedHistory,
      ]);
    }
  }, [chatHistory, isVi]);

  // Scroll to bottom of chat container when new messages arrive without scrolling parent page viewport
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages, isAiGenerating]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isAiGenerating) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsAiGenerating(true);

    const aiMessageId = `ai-${Date.now()}`;
    const aiMsg: Message = {
      id: aiMessageId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, aiMsg]);

    try {
      const token = getToken() || "";
      const apiBaseUrl = import.meta.env.VITE_API_URL || "http://localhost:3000";

      const response = await fetch(`${apiBaseUrl}/meetings/${meetingId}/chat/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: text }),
      });

      if (!response.ok) {
        throw new Error("Failed to connect to AI Stream");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let finished = false;
      let accumulatedText = "";

      while (!finished && reader) {
        const { value, done } = await reader.read();
        finished = done;
        if (value) {
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const dataStr = line.slice(6).trim();
              if (dataStr === "[DONE]") {
                finished = true;
                break;
              }
              try {
                const parsed = JSON.parse(dataStr);
                if (parsed.error) {
                  throw new Error(parsed.error);
                }
                if (parsed.text) {
                  accumulatedText += parsed.text;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === aiMessageId ? { ...msg, content: accumulatedText } : msg
                    )
                  );
                }
              } catch {
                // Ignore parsing errors for partial stream chunks
              }
            }
          }
        }
      }

      refetchChatHistory();
    } catch (error) {
      console.error("Streaming error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? { ...msg, content: t("meeting.summary_tab.error_connecting") }
            : msg
        )
      );
    } finally {
      setIsAiGenerating(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl h-[720px] flex flex-col"
    >
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-4">
        <div className="h-12 w-12 rounded-[1.25rem] bg-indigo-500/10 flex items-center justify-center text-indigo-600 shadow-inner">
          <MessageSquare className="h-6 w-6" />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-900 leading-tight">
            {t("meeting.summary_tab.chatbot_card_title")}
          </h3>
          <p className="text-xs font-bold text-slate-500 mt-0.5">
            {t("meeting.summary_tab.chatbot_agent_subtitle")}
          </p>
        </div>
      </div>

      {/* AI not activated warning banner in Q&A */}
      {!aiActivated && meetingStatus?.status !== "scheduled" && (
        <div className="mx-2 mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-start gap-2.5 shadow-sm animate-fade-in shrink-0">
          <Bot className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
          <span>{t("meeting.summary_tab.chatbot_no_ai_warning")}</span>
        </div>
      )}

      {/* Messages Area */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 custom-scrollbar"
      >
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 max-w-[85%] ${
              msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
            }`}
          >
            <div
              className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white"
                  : "bg-white border border-slate-200 text-slate-500"
              }`}
            >
              {msg.role === "user" ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4 text-indigo-500" />
              )}
            </div>
            <div
              className={`p-3.5 rounded-2xl text-[13px] leading-relaxed font-semibold shadow-sm ${
                msg.role === "user"
                  ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none"
                  : "bg-slate-100/80 text-slate-800 border border-slate-200/50 rounded-tl-none"
              }`}
            >
              {msg.role === "user" ? (
                <p className="whitespace-pre-line">{msg.content}</p>
              ) : (
                <MarkdownRenderer content={msg.content} />
              )}
              <span
                className={`block text-[10px] mt-1.5 text-right font-medium opacity-60 ${
                  msg.role === "user" ? "text-indigo-100" : "text-slate-400"
                }`}
              >
                {msg.timestamp.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        ))}

        {isAiGenerating && (
          <div className="flex gap-3 max-w-[85%] mr-auto items-center">
            <div className="h-9 w-9 rounded-xl bg-white border border-slate-200 text-slate-500 flex items-center justify-center shrink-0 shadow-sm">
              <Bot className="h-4 w-4 text-indigo-500" />
            </div>
            <div className="bg-slate-100/80 border border-slate-200/50 p-4 rounded-2xl rounded-tl-none flex gap-1 items-center shadow-sm">
              <span
                className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 rounded-full bg-slate-400 animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Input Panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(chatInput);
        }}
        className="relative flex items-center"
      >
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          disabled={isAiGenerating}
          placeholder={t("meeting.summary_tab.chat_placeholder")}
          className="w-full pl-5 pr-14 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-inner"
        />
        <button
          type="submit"
          disabled={!chatInput.trim() || isAiGenerating}
          className="absolute right-2 h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md shadow-indigo-100 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </motion.div>
  );
};
