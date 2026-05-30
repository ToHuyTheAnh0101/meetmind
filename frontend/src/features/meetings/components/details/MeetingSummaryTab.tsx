import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles,
  MessageSquare,
  Send,
  RefreshCw,
  Loader2,
  Bot,
  User,
  FileText,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface MeetingSummaryTabProps {
  meetingId: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export const MeetingSummaryTab: React.FC<MeetingSummaryTabProps> = ({
  meetingId,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === "vi";
  const chatEndRef = useRef<HTMLDivElement>(null);

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: isVi
        ? "Xin chào! Tôi là Trợ lý AI của MeetMind. Bạn có câu hỏi nào về nội dung hay kết quả của cuộc họp này không?"
        : "Hello! I am the MeetMind AI Assistant. Do you have any questions about the content or outcomes of this meeting?",
      timestamp: new Date(),
    },
  ]);

  // 1. Fetch all AI Summaries for the meeting
  const {
    data: summaries,
    isLoading: isLoadingSummaries,
    refetch: refetchSummaries,
  } = useQuery<any[]>({
    queryKey: ["meeting-summaries", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/summaries`);
      return res.data;
    },
    refetchInterval: (query) => {
      // Tiếp tục polling 3s/lần nếu có bản tóm tắt nào đang trong trạng thái [GENERATING]
      const hasGenerating = query.state.data?.some(
        (s: any) => s.summaryText === "[GENERATING]",
      );
      return hasGenerating ? 3000 : false;
    },
  });

  // 2. Fetch all Sessions for the meeting
  const { data: sessions, isLoading: isLoadingSessions } = useQuery<any[]>({
    queryKey: ["meeting-sessions", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/sessions`);
      return res.data;
    },
    refetchInterval: (query) => {
      const data = query.state.data as any[];
      if (!data) return false;

      // Kích hoạt Polling khi cuộc họp/phiên đang diễn ra (ongoing) hoặc đang biên dịch âm thanh (processing/summarizing)
      const hasOngoing = data.some((s: any) => s.status === "ongoing");
      const hasProcessing = data.some((s: any) => s.aiActivated === true && !s.hasTranscripts);

      // Chỉ poll nếu phiên họp chưa hoàn thành hoặc chưa có bản dịch xong
      if (hasOngoing || hasProcessing) {
        return 4000; // Polling thông minh mỗi 4 giây
      }

      return false; // Dừng lập tức khi chuyển sang completed và có đầy đủ transcripts
    },
  });

  // Tự động đồng bộ và làm mới danh sách tóm tắt khi dữ liệu phiên họp thay đổi (ví dụ kết thúc họp hoặc dịch xong)
  useEffect(() => {
    if (sessions) {
      refetchSummaries();
    }
  }, [sessions, refetchSummaries]);

  // 3. Fetch all templates
  const { data: templates } = useQuery<any[]>({
    queryKey: ["summary-templates"],
    queryFn: async () => {
      const res = await apiClient.get("/summary-templates");
      return res.data;
    },
  });

  // 4. Generate/Regenerate AI Summary Mutation (moved up to fix hoisting issue)
  const generateSummaryMutation = useMutation({
    mutationFn: async ({
      sessionId,
      templateId,
    }: {
      sessionId: string;
      templateId?: string;
    }) => {
      const res = await apiClient.post(
        `/meetings/${meetingId}/summaries/generate`,
        {
          sessionId,
          templateId: templateId || undefined,
        },
      );
      return res.data;
    },
    onSuccess: () => {
      refetchSummaries();
    },
  });

  // 5. Chat Q&A Mutation
  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiClient.post(`/meetings/${meetingId}/chat`, {
        question,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: "assistant",
          content: data.answer,
          timestamp: new Date(),
        },
      ]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: "assistant",
          content: isVi
            ? "Rất tiếc, đã có lỗi xảy ra khi kết nối tới Trợ lý AI. Vui lòng thử lại!"
            : "Sorry, an error occurred while connecting to the AI Assistant. Please try again!",
          timestamp: new Date(),
        },
      ]);
    },
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // Sort sessions: latest first
  const sortedSessions = sessions
    ? [...sessions].sort(
        (a, b) =>
          new Date(b.createdAt || b.actualStartTime).getTime() -
          new Date(a.createdAt || a.actualStartTime).getTime(),
      )
    : [];

  // Sync selectedSessionId with the latest session if none is selected
  useEffect(() => {
    if (sortedSessions.length > 0 && !selectedSessionId) {
      setSelectedSessionId(sortedSessions[0].id);
    }
  }, [sortedSessions, selectedSessionId]);

  // Determine current summary based on selected session
  const currentSummary = summaries?.find(
    (s) => s.sessionId === selectedSessionId,
  );

  const summary = currentSummary?.summaryText;

  const isGenerating =
    generateSummaryMutation.isPending || summary === "[GENERATING]";

  // Sync template ID when current summary changes
  useEffect(() => {
    if (currentSummary?.templateId) {
      setSelectedTemplateId(currentSummary.templateId);
    } else {
      setSelectedTemplateId("");
    }
  }, [currentSummary]);

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, chatMutation.isPending]);

  const handleSendMessage = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return;

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");

    // Trigger API call
    chatMutation.mutate(text);
  };

  const handlePresetQuestion = (questionKey: string) => {
    const questionText = t(`meeting.summary_tab.${questionKey}`);
    handleSendMessage(questionText);
  };

  const selectedSession = sessions?.find((s) => s.id === selectedSessionId);
  const isSelectedSessionOngoing = selectedSession?.status === "ongoing";

  // AI was activated (recording started) but Whisper hasn't saved any transcript yet
  const isAiActivatedButNoTranscripts =
    selectedSession?.aiActivated === true && !selectedSession?.hasTranscripts && !summary;

  const handleGenerate = () => {
    if (!selectedSessionId) return;
    generateSummaryMutation.mutate({
      sessionId: selectedSessionId,
      templateId: selectedTemplateId,
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: AI SUMMARY VIEW */}
      <div className="lg:col-span-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/70 p-5 sm:p-6 shadow-2xl backdrop-blur-xl min-h-[550px] flex flex-col"
        >
          {/* Header section */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[1.25rem] bg-cyan-500/10 flex items-center justify-center text-cyan-600 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {t("meeting.summary_tab.summary_card_title")}
                </h3>
              </div>
            </div>
          </div>

          {/* Nested Split Pane Layout */}
          <div className="flex-1 flex flex-col md:flex-row gap-6">
            {/* Sidebar list of session history */}
            <div className="w-full md:w-48 shrink-0 md:border-r md:border-slate-100 md:pr-3 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-y-auto md:max-h-[480px] pb-2 md:pb-0 custom-scrollbar">
              <div className="hidden md:block">
                <h4 className="text-xs font-black text-slate-400 tracking-wider mb-3">
                  {isVi ? "Lịch sử phiên họp" : "Sessions History"}
                </h4>
              </div>

              {/* Session list items */}
              {isLoadingSessions ? (
                <div className="hidden md:flex flex-col items-center justify-center py-6 text-slate-400 gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                </div>
              ) : sortedSessions.length === 0 ? (
                <div className="text-xs font-bold text-slate-400 py-4">
                  {isVi ? "Không có phiên họp" : "No sessions found"}
                </div>
              ) : (
                sortedSessions.map((session, idx) => {
                  const isSelected = selectedSessionId === session.id;
                  const dateStr = session.actualStartTime
                    ? new Date(session.actualStartTime).toLocaleDateString([], {
                        day: "2-digit",
                        month: "2-digit",
                      })
                    : "";
                  const timeStr = session.actualStartTime
                    ? new Date(session.actualStartTime).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "";
                  const isOngoing = session.status === "ongoing";

                  return (
                    <button
                      key={session.id}
                      onClick={() => setSelectedSessionId(session.id)}
                      className={`w-full p-3 rounded-2xl text-left transition-all flex items-center gap-3 border shrink-0 md:shrink ${
                        isSelected
                          ? "bg-gradient-to-r from-cyan-500/10 to-indigo-500/10 border-cyan-500/20 text-slate-900 shadow-sm"
                          : "bg-transparent border-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                      }`}
                      style={{ minWidth: "160px" }}
                    >
                      <div
                        className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isSelected
                            ? "bg-indigo-500 text-white"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        <FileText className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-xs font-black truncate">
                            {isVi
                              ? `Phiên #${sortedSessions.length - idx}`
                              : `Session #${sortedSessions.length - idx}`}
                          </p>
                          {isOngoing && (
                            <span className="flex h-2 w-2 relative shrink-0">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                          {dateStr} {timeStr}
                        </p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>

            {/* Detail Summary Panel */}
            <div className="flex-1 flex flex-col justify-between min-w-0">
              {isLoadingSummaries || isLoadingSessions ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                  <span className="text-sm font-bold">
                    {t("meeting.permissions.loading")}
                  </span>
                </div>
              ) : isSelectedSessionOngoing ? (
                /* Ongoing session prenote */
                <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center">
                  <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-emerald-50/80 text-emerald-500 flex items-center justify-center mb-6 shadow-inner relative">
                    <span className="animate-ping absolute inline-flex h-12 w-12 rounded-[1.25rem] bg-emerald-400/20 opacity-75"></span>
                    <Sparkles className="h-8 w-8 text-emerald-500 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    {isVi
                      ? "Phiên họp đang diễn ra"
                      : "Session is ongoing"}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    {isVi
                      ? "Phiên họp hiện tại đang diễn ra và hội thoại đang được dịch thoại trực tiếp. Bản tóm tắt AI sẽ sẵn sàng khi phiên họp kết thúc."
                      : "The current session is active and conversation is being transcribed live. The AI summary will be available immediately after the session ends."}
                  </p>
                </div>
              ) : isAiActivatedButNoTranscripts ? (
                /* AI was activated but Whisper is still processing */
                <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center animate-fade-in">
                  <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-cyan-50/80 text-cyan-500 flex items-center justify-center mb-6 shadow-inner relative">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    {isVi
                      ? "Đang xử lý bản ghi âm..."
                      : "Processing recording..."}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    {isVi
                      ? "Trợ lý AI đang dịch thuật nội dung cuộc họp. Vui lòng đợi trong giây lát."
                      : "AI assistant is transcribing the meeting content. Please wait a moment."}
                  </p>
                </div>
              ) : selectedSession && !selectedSession.hasTranscripts && !summary ? (
                /* No transcripts and no summary state (AI not activated) */
                <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center animate-fade-in">
                  <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-amber-50/80 text-amber-500 flex items-center justify-center mb-6 shadow-inner">
                    <Bot className="h-8 w-8 text-amber-500" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    {isVi
                      ? "Trợ lý AI không được kích hoạt"
                      : "AI Assistant was not activated"}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    {isVi
                      ? "Phiên họp này không kích hoạt tính năng ghi âm và dịch thuật thoại trực tiếp, nên không có dữ liệu hội thoại cuộc họp để tiến hành tóm tắt."
                      : "This session did not activate the live recording and translation feature, so there is no conversation data to generate a summary."}
                  </p>
                </div>
              ) : isGenerating ? (
                /* Dynamic Premium Generating State with rotating sparkles and pulsed text */
                <div className="text-center py-16 px-4 flex-1 flex flex-col justify-center">
                  <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-cyan-500/10 text-cyan-600 flex items-center justify-center mb-6 shadow-inner relative">
                    <Loader2 className="h-8 w-8 animate-spin text-cyan-500 absolute" />
                    <Sparkles className="h-5 w-5 text-indigo-500 animate-pulse" />
                  </div>
                  <h4 className="text-lg font-black text-slate-800 animate-pulse">
                    {isVi
                      ? "Đang hoàn thiện bản tóm tắt cuộc họp..."
                      : "Completing the meeting summary..."}
                  </h4>
                  <p className="text-xs font-bold text-slate-400 mt-2 max-w-sm mx-auto leading-relaxed">
                    {isVi
                      ? "Trợ lý AI MeetMind đang tổng hợp tất cả các luồng ghi âm và dịch thoại để trích xuất các ý chính."
                      : "MeetMind AI Assistant is aggregating all recording tracks and transcript streams to extract key highlights."}
                  </p>
                </div>
              ) : summary ? (
                /* Displaying actual summary and template configuration */
                <div className="flex-1 flex flex-col justify-between">
                  {/* Template Config Row */}
                  <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 mb-4 md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                      <span className="text-[11px] font-black text-slate-400 tracking-wider">
                        {isVi
                          ? "Mẫu tóm tắt:"
                          : "Template:"}
                      </span>
                      <select
                        value={selectedTemplateId}
                        onChange={(e) => setSelectedTemplateId(e.target.value)}
                        className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-500 transition-colors animate-fade-in min-w-[220px] max-w-[320px]"
                      >
                        <option value="">
                          {isVi
                            ? "Mẫu mặc định"
                            : "Default Template"}
                        </option>
                        {templates?.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Compact Regenerate Button */}
                    <button
                      onClick={handleGenerate}
                      className="px-3.5 py-2 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-all font-black text-xs gap-1.5 shadow-sm"
                      title={t("meeting.summary_tab.generate_summary_btn")}
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      <span>
                        {isVi ? "Tạo lại" : "Regenerate"}
                      </span>
                    </button>
                  </div>

                  <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1 custom-scrollbar">
                    <MarkdownRenderer content={summary} />
                  </div>
                </div>
              ) : (
                /* No summary yet state */
                <div className="text-center py-12 px-4 flex-1 flex flex-col justify-center">
                  <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-slate-100/80 flex items-center justify-center text-slate-400 mb-6 shadow-inner">
                    <FileText className="h-8 w-8" />
                  </div>
                  <h4 className="text-lg font-black text-slate-900">
                    {t("meeting.summary_tab.no_summary_yet")}
                  </h4>
                  <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                    {isVi
                      ? "Chọn mẫu tóm tắt và nhấp nút khởi tạo bên dưới để bắt đầu phân tích cuộc họp."
                      : "Choose a template and click the generate button below to begin analyzing the meeting."}
                  </p>

                  {/* Template selector for empty state */}
                  <div className="my-6 max-w-xs mx-auto flex flex-col items-stretch gap-2">
                    <span className="text-[11px] font-black text-slate-400 tracking-wider shrink-0 text-left">
                      {isVi ? "Mẫu:" : "Template:"}
                    </span>
                    <select
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                      className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 outline-none focus:border-cyan-500 transition-colors w-full animate-fade-in"
                    >
                      <option value="">
                        {isVi
                          ? "Mẫu mặc định"
                          : "Default Template"}
                      </option>
                      {templates?.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={handleGenerate}
                    className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:scale-[1.03] active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-cyan-100 transition-all flex items-center gap-3 mx-auto"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{t("meeting.summary_tab.generate_summary_btn")}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Q&A CHATBOT VIEW */}
      <div className="lg:col-span-4 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl h-[600px] flex flex-col"
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
                AI Agent is ready to answer
              </p>
            </div>
          </div>

          {/* AI not activated warning banner in Q&A */}
          {selectedSession && !selectedSession.hasTranscripts && (
            <div className="mx-2 mb-4 p-3 rounded-2xl bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-800 flex items-start gap-2.5 shadow-sm animate-fade-in shrink-0">
              <Bot className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
              <span>
                {isVi
                  ? "Lưu ý: Phiên họp này không được kích hoạt trợ lý AI. Hỏi đáp có thể không tìm thấy dữ liệu hội thoại cho phiên này."
                  : "Note: AI assistant was not activated for this session. Chat Q&A may not find any conversation history."}
              </span>
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
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
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed font-semibold shadow-sm ${
                    msg.role === "user"
                      ? "bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none"
                      : "bg-slate-100/80 text-slate-800 border border-slate-200/50 rounded-tl-none"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
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

            {chatMutation.isPending && (
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

            <div ref={chatEndRef} />
          </div>

          {/* Quick Preset Buttons */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
              {t("meeting.summary_tab.suggested_questions")}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePresetQuestion("preset_q1")}
                disabled={chatMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors text-left"
              >
                {t("meeting.summary_tab.preset_q1")}
              </button>
              <button
                onClick={() => handlePresetQuestion("preset_q2")}
                disabled={chatMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors text-left"
              >
                {t("meeting.summary_tab.preset_q2")}
              </button>
              <button
                onClick={() => handlePresetQuestion("preset_q3")}
                disabled={chatMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors text-left"
              >
                {t("meeting.summary_tab.preset_q3")}
              </button>
            </div>
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
              disabled={chatMutation.isPending}
              placeholder={t("meeting.summary_tab.chat_placeholder")}
              className="w-full pl-5 pr-14 py-4 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-200 focus:bg-white text-sm font-semibold outline-none transition-all placeholder:text-slate-400 text-slate-900 shadow-inner"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatMutation.isPending}
              className="absolute right-2 h-11 w-11 flex items-center justify-center rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-md shadow-indigo-100 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-40 disabled:scale-100 disabled:shadow-none"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};
