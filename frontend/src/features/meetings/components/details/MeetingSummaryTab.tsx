import React, { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Sparkles,
  MessageSquare,
  Send,
  RefreshCw,
  Loader2,
  Bot,
  User,
  FileText
} from 'lucide-react'
import apiClient from '@/lib/apiClient'

interface MeetingSummaryTabProps {
  meetingId: string
}

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export const MeetingSummaryTab: React.FC<MeetingSummaryTabProps> = ({ meetingId }) => {
  const { t } = useTranslation()
  const chatEndRef = useRef<HTMLDivElement>(null)
  
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: t('common.save') === 'Lưu'
        ? 'Xin chào! Tôi là Trợ lý AI của MeetMind. Bạn có câu hỏi nào về nội dung hay kết quả của cuộc họp này không?'
        : 'Hello! I am the MeetMind AI Assistant. Do you have any questions about the content or outcomes of this meeting?',
      timestamp: new Date()
    }
  ])

  // 1. Fetch AI Summary from DB
  const { data: summaryData, isLoading: isLoadingSummary, refetch: refetchSummary } = useQuery<any>({
    queryKey: ['meeting-summary', meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/summaries/overall`)
      return res.data
    }
  })

  // 2. Generate/Regenerate AI Summary Mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post(`/meetings/${meetingId}/summaries/generate`)
      return res.data
    },
    onSuccess: () => {
      refetchSummary()
    }
  })

  // 3. Chat Q&A Mutation
  const chatMutation = useMutation({
    mutationFn: async (question: string) => {
      const res = await apiClient.post(`/meetings/${meetingId}/chat`, { question })
      return res.data
    },
    onSuccess: (data) => {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          content: data.answer,
          timestamp: new Date()
        }
      ])
    },
    onError: () => {
      setMessages(prev => [
        ...prev,
        {
          id: `ai-err-${Date.now()}`,
          role: 'assistant',
          content: t('common.save') === 'Lưu'
            ? 'Rất tiếc, đã có lỗi xảy ra khi kết nối tới Trợ lý AI. Vui lòng thử lại!'
            : 'Sorry, an error occurred while connecting to the AI Assistant. Please try again!',
          timestamp: new Date()
        }
      ])
    }
  })

  // Scroll to bottom of chat when new message arrives
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, chatMutation.isPending])

  const handleSendMessage = (text: string) => {
    if (!text.trim() || chatMutation.isPending) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMsg])
    setChatInput('')

    // Trigger API call
    chatMutation.mutate(text)
  }

  const handlePresetQuestion = (questionKey: string) => {
    const questionText = t(`meeting.summary_tab.${questionKey}`)
    handleSendMessage(questionText)
  }

  // A simple markdown-like renderer to render structured paragraphs beautifully
  const renderSummaryContent = (text: string) => {
    if (!text) return null

    // Split text into lines to look for headers or bullet points
    const lines = text.split('\n')
    return (
      <div className="space-y-4 text-slate-700 leading-relaxed font-medium">
        {lines.map((line, idx) => {
          // Check for main headers (e.g. ## or **)
          if (line.startsWith('###') || line.startsWith('**') || line.match(/^\d+\./)) {
            const cleanLine = line.replace(/^[#*\d.\s]+/, '').replace(/\*\*$/, '')
            return (
              <h4 key={idx} className="text-base font-black text-slate-900 mt-6 mb-2 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-500" />
                {cleanLine}
              </h4>
            )
          }
          // Check for bullet points
          if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
            const cleanLine = line.replace(/^[-*\s]+/, '')
            return (
              <div key={idx} className="flex gap-2 pl-4 items-start py-1">
                <span className="text-cyan-500 text-sm mt-0.5">•</span>
                <span className="text-sm font-semibold text-slate-600">{cleanLine}</span>
              </div>
            )
          }
          // Normal line
          if (line.trim() === '') return null
          return (
            <p key={idx} className="text-sm text-slate-600 pl-4">
              {line}
            </p>
          )
        })}
      </div>
    )
  }

  const summary = summaryData?.summaryText

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: AI SUMMARY VIEW */}
      <div className="lg:col-span-6 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 sm:p-8 shadow-2xl backdrop-blur-xl min-h-[500px] flex flex-col"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-6 mb-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[1.25rem] bg-cyan-500/10 flex items-center justify-center text-cyan-600 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {t('meeting.summary_tab.summary_card_title')}
                </h3>
                <p className="text-xs font-bold text-slate-500 mt-0.5">
                  Powered by Gemini 2.0 Flash
                </p>
              </div>
            </div>
            {summary && (
              <button
                disabled={generateSummaryMutation.isPending}
                onClick={() => generateSummaryMutation.mutate()}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-50 border border-slate-200 text-slate-500 hover:bg-slate-100 transition-colors disabled:opacity-50"
                title={t('meeting.summary_tab.generate_summary_btn')}
              >
                {generateSummaryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </button>
            )}
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {isLoadingSummary ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <span className="text-sm font-bold">{t('meeting.permissions.loading')}</span>
              </div>
            ) : summary ? (
              <div className="space-y-4 max-h-[550px] overflow-y-auto pr-2 custom-scrollbar">
                {renderSummaryContent(summary)}
              </div>
            ) : (
              <div className="text-center py-16 px-4">
                <div className="mx-auto h-16 w-16 rounded-[1.5rem] bg-slate-100/80 flex items-center justify-center text-slate-400 mb-6 shadow-inner">
                  <FileText className="h-8 w-8" />
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  {t('meeting.summary_tab.no_summary_yet')}
                </h4>
                <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm mx-auto leading-relaxed">
                  {t('common.save') === 'Lưu'
                    ? 'Nhấp vào nút bên dưới để sử dụng AI phân tích cuộc họp và trích xuất các quyết định chính, công việc cần làm.'
                    : 'Click the button below to analyze the meeting audio/transcript to extract key decisions and action items.'}
                </p>
                <button
                  onClick={() => generateSummaryMutation.mutate()}
                  disabled={generateSummaryMutation.isPending}
                  className="mt-8 px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-indigo-500 hover:scale-[1.03] active:scale-95 text-white font-black text-sm rounded-2xl shadow-lg shadow-cyan-100 transition-all flex items-center gap-3 mx-auto disabled:opacity-50"
                >
                  {generateSummaryMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>{t('meeting.summary_tab.generating')}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      <span>{t('meeting.summary_tab.generate_summary_btn')}</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Q&A CHATBOT VIEW */}
      <div className="lg:col-span-6 space-y-6">
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
                {t('meeting.summary_tab.chatbot_card_title')}
              </h3>
              <p className="text-xs font-bold text-slate-500 mt-0.5">
                AI Agent is ready to answer
              </p>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto pr-2 mb-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
              >
                <div
                  className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-tr from-cyan-500 to-indigo-500 text-white'
                      : 'bg-white border border-slate-200 text-slate-500'
                  }`}
                >
                  {msg.role === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-indigo-500" />}
                </div>
                <div
                  className={`p-3.5 rounded-2xl text-sm leading-relaxed font-semibold shadow-sm ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white rounded-tr-none'
                      : 'bg-slate-100/80 text-slate-800 border border-slate-200/50 rounded-tl-none'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                  <span
                    className={`block text-[10px] mt-1.5 text-right font-medium opacity-60 ${
                      msg.role === 'user' ? 'text-indigo-100' : 'text-slate-400'
                    }`}
                  >
                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="h-2 w-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick Preset Buttons */}
          <div className="mb-4">
            <p className="text-[11px] font-black text-slate-400 uppercase tracking-wider mb-2">
              {t('meeting.summary_tab.suggested_questions')}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => handlePresetQuestion('preset_q1')}
                disabled={chatMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors text-left"
              >
                {t('meeting.summary_tab.preset_q1')}
              </button>
              <button
                onClick={() => handlePresetQuestion('preset_q2')}
                disabled={chatMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors text-left"
              >
                {t('meeting.summary_tab.preset_q2')}
              </button>
              <button
                onClick={() => handlePresetQuestion('preset_q3')}
                disabled={chatMutation.isPending}
                className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-slate-800 transition-colors text-left"
              >
                {t('meeting.summary_tab.preset_q3')}
              </button>
            </div>
          </div>

          {/* Input Panel */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage(chatInput)
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={chatMutation.isPending}
              placeholder={t('meeting.summary_tab.chat_placeholder')}
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
  )
}
