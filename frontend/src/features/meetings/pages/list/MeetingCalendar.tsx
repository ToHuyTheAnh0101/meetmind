import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock, Users } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import type { Meeting } from '@/types/api'

interface MeetingCalendarProps {
  onMeetingClick?: (id: string) => void
  onScheduleClick?: () => void
}

const WEEK_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const toDateKey = (date: Date) => {
  const y = date.getFullYear()
  const m = `${date.getMonth() + 1}`.padStart(2, '0')
  const d = `${date.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${d}`
}

const parseMeetingsPayload = (payload: unknown): Meeting[] => {
  if (Array.isArray(payload)) {
    return payload as Meeting[]
  }
  if (typeof payload === 'object' && payload !== null && 'data' in payload && Array.isArray((payload as any).data)) {
    return (payload as any).data
  }
  return []
}

const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'mock-1',
    title: 'Product Strategy Sync',
    status: 'ongoing',
    startTime: new Date().toISOString(),
    participants: [
      { id: 'u1', user: { firstName: 'Alex', lastName: 'Chen' } },
      { id: 'u2', user: { firstName: 'Sarah', lastName: 'Miller' } },
      { id: 'u3', user: { firstName: 'John', lastName: 'Doe' } }
    ] as any
  },
  {
    id: 'mock-2',
    title: 'Design Review: MeetMind v2',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000).toISOString(),
    participants: [
      { id: 'u4', user: { firstName: 'Emma', lastName: 'Wilson' } },
      { id: 'u1', user: { firstName: 'Alex', lastName: 'Chen' } }
    ] as any
  },
  {
    id: 'mock-3',
    title: 'Frontend Architecture Sync',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000 * 5).toISOString(),
    participants: [
      { id: 'u5', user: { firstName: 'David', lastName: 'Lee' } }
    ] as any
  }
]

const MeetingCalendar: React.FC<MeetingCalendarProps> = ({ onMeetingClick, onScheduleClick }) => {
  const { t, i18n } = useTranslation()
  const today = useMemo(() => new Date(), [])
  const [activeMonth, setActiveMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDate, setSelectedDate] = useState(today)

  const { data: apiMeetings = [] } = useQuery({
    queryKey: ['meetings'],
    queryFn: async (): Promise<Meeting[]> => {
      const response = await apiClient.get('/meetings')
      return parseMeetingsPayload(response.data)
    },
  })

  const meetings = apiMeetings.length > 0 ? apiMeetings : MOCK_MEETINGS

  const meetingsByDate = useMemo(() => {
    const grouped = new Map<string, Meeting[]>()
    meetings.forEach((meeting) => {
      const dateKey = toDateKey(new Date(meeting.startTime))
      const existing = grouped.get(dateKey) || []
      existing.push(meeting)
      grouped.set(dateKey, existing)
    })
    return grouped
  }, [meetings])

  const calendarCells = useMemo(() => {
    const year = activeMonth.getFullYear()
    const month = activeMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const startWeekDay = firstDay.getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const daysInPrevMonth = new Date(year, month, 0).getDate()

    const cells: { date: Date; key: string; isCurrentMonth: boolean }[] = []

    for (let i = 0; i < startWeekDay; i++) {
      const date = new Date(year, month - 1, daysInPrevMonth - startWeekDay + i + 1)
      cells.push({ date, key: toDateKey(date), isCurrentMonth: false })
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day)
      cells.push({ date, key: toDateKey(date), isCurrentMonth: true })
    }

    const trailing = 42 - cells.length
    for (let i = 1; i <= trailing; i++) {
      const date = new Date(year, month + 1, i)
      cells.push({ date, key: toDateKey(date), isCurrentMonth: false })
    }

    return cells
  }, [activeMonth])

  const selectedDateMeetings = useMemo(
    () => meetingsByDate.get(toDateKey(selectedDate)) || [],
    [meetingsByDate, selectedDate]
  )

  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1 overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-4 shadow-xl backdrop-blur-sm sm:p-6 lg:p-8">
        <div className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 items-center gap-1 rounded-2xl bg-slate-100 p-1">
              <button 
                onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white hover:shadow-sm text-slate-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <div className="px-4 text-sm font-black text-slate-900 min-w-[140px] text-center">
                {activeMonth.toLocaleString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { month: 'long', year: 'numeric' })}
              </div>
              <button 
                onClick={() => setActiveMonth(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1))}
                className="flex h-10 w-10 items-center justify-center rounded-xl transition hover:bg-white hover:shadow-sm text-slate-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
            <button 
              onClick={() => {
                setActiveMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setSelectedDate(today)
              }}
              className="px-4 py-2 text-xs font-bold text-cyan-600 hover:text-cyan-700 transition"
            >
              {t('meeting.today')}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px overflow-hidden rounded-2xl border border-slate-200 bg-slate-200 shadow-inner">
          {WEEK_DAYS.map(day => (
            <div key={day} className="bg-slate-50 py-3 text-center text-[11px] font-bold text-slate-400 sm:text-xs">
              {t(`calendar.days.${day.toLowerCase()}`)}
            </div>
          ))}
          {calendarCells.map(cell => {
            const dateMeetings = meetingsByDate.get(cell.key) || []
            const isSelected = cell.key === toDateKey(selectedDate)
            const isToday = cell.key === toDateKey(today)
            
            return (
              <button
                key={cell.key}
                onClick={() => setSelectedDate(cell.date)}
                className={`group relative flex min-h-[80px] flex-col p-2 text-left transition-all sm:min-h-[110px] sm:p-3 ${
                  cell.isCurrentMonth ? 'bg-white hover:bg-slate-50' : 'bg-slate-50/50 text-slate-400'
                } ${isSelected ? 'ring-2 ring-inset ring-cyan-500 z-10' : ''}`}
              >
                <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold sm:h-8 sm:w-8 sm:text-sm ${
                  isToday ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200' : isSelected ? 'bg-slate-900 text-white' : 'text-slate-900'
                }`}>
                  {cell.date.getDate()}
                </span>

                <div className="mt-2 space-y-1 overflow-hidden">
                  {dateMeetings.slice(0, 2).map(m => (
                    <div 
                      key={m.id} 
                      className={`truncate rounded-lg px-2 py-1 text-[10px] font-bold sm:text-xs ${
                        m.status === 'ongoing' ? 'bg-cyan-100 text-cyan-700' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {m.title}
                    </div>
                  ))}
                  {dateMeetings.length > 2 && (
                    <div className="px-2 text-[9px] font-black text-slate-400 sm:text-[10px]">
                      + {dateMeetings.length - 2} {t('meeting.more')}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="w-full lg:w-[380px]">
        <motion.div 
          key={toDateKey(selectedDate)}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex h-full flex-col rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm"
        >
          <div className="mb-6">
            <p className="text-[11px] font-bold text-slate-400">{t('meeting.selected_date')}</p>
            <h4 className="mt-1 text-xl font-black text-slate-900">
              {selectedDate.toLocaleDateString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
            </h4>
          </div>

          <div className="flex-1 space-y-4">
            {selectedDateMeetings.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center py-10 text-center opacity-40">
                <CalendarIcon className="h-10 w-10 text-slate-300" />
                <p className="mt-3 text-sm font-bold text-slate-500">{t('meeting.no_events')}</p>
              </div>
            ) : (
              selectedDateMeetings.map(meeting => (
                <button
                  key={meeting.id}
                  onClick={() => onMeetingClick?.(meeting.id)}
                  className="w-full text-left group overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 transition hover:border-cyan-200 hover:shadow-md active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between">
                    <p className="line-clamp-1 text-sm font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                      {meeting.title}
                    </p>
                    <div className={`h-2 w-2 rounded-full ${meeting.status === 'ongoing' ? 'bg-cyan-500 animate-pulse' : 'bg-slate-300'}`} />
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-[10px] font-bold text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(meeting.startTime).toLocaleTimeString(i18n.language === 'vi' ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {meeting.participants?.length || 0}
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>

          <button 
            onClick={onScheduleClick}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-900 py-4 text-xs font-black text-white transition hover:bg-slate-800 active:scale-95"
          >
            <Plus className="h-4 w-4" /> {t('meeting.schedule_new')}
          </button>
        </motion.div>
      </div>
    </div>
  )
}

const Plus: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
  </svg>
)

export default MeetingCalendar
