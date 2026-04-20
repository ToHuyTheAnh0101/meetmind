import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { 
  CalendarDays, 
  ChevronLeft, 
  ChevronRight, 
  Clock3, 
  Users, 
  Plus,
  Zap,
  Loader2
} from 'lucide-react'

// Local components & Utilities
import apiClient from '@/lib/apiClient'
import type { Meeting } from '@/types/api'

// --- Types ---
type CalendarCell = {
  date: Date
  key: string
  isCurrentMonth: boolean
}

// --- Constants & Helpers ---
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

  if (
    typeof payload === 'object' &&
    payload !== null &&
    'data' in payload &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: Meeting[] }).data
  }

  return []
}

// --- Mock Data ---
const MOCK_MEETINGS: Meeting[] = [
  {
    id: 'mock-1',
    title: 'Product Strategy Sync',
    description: 'Alignment session for Q3 product roadmap and feature prioritization.',
    status: 'ongoing',
    startTime: new Date().toISOString(),
    participants: []
  },
  {
    id: 'mock-2',
    title: 'Design Review: MeetMind v2',
    description: 'Critique session for the new glassmorphism dashboard and meeting hub designs.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 3600000 * 2).toISOString(), // 2 hours from now
    participants: []
  },
  {
    id: 'mock-3',
    title: 'Frontend Architecture Sync',
    description: 'Discussing the implementation of Phase 2.3 components and Framer Motion integration.',
    status: 'completed',
    startTime: new Date(Date.now() - 3600000 * 5).toISOString(), // 5 hours ago
    participants: []
  },
  {
    id: 'mock-4',
    title: 'Client Demo: AI Recap',
    description: 'Presenting the new automated transcript summary features to key stakeholders.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
    participants: []
  },
  {
    id: 'mock-5',
    title: 'Weekly Team Standup',
    description: 'Recap of last week tasks and coordination for current sprint goals.',
    status: 'completed',
    startTime: new Date(Date.now() - 86400000).toISOString(), // Yesterday
    participants: []
  },
  {
    id: 'mock-6',
    title: 'Backend API Review',
    description: 'Reviewing the standardized pagination utility and DTO implementation.',
    status: 'ongoing',
    startTime: new Date().toISOString(),
    participants: []
  },
  {
    id: 'mock-13',
    title: 'AI Summary Research',
    description: 'Preparing for Phase 2.3 - AI integration for transcripts.',
    status: 'scheduled',
    startTime: new Date().toISOString(),
    participants: []
  },
  {
    id: 'mock-14',
    title: 'Database Schema Audit',
    description: 'Checking foreign keys and indexes for performance optimization.',
    status: 'scheduled',
    startTime: new Date().toISOString(),
    participants: []
  },
  {
    id: 'mock-15',
    title: 'User Interface Polish',
    description: 'Fine-tuning animations and border gradients for the premium feeling.',
    status: 'scheduled',
    startTime: new Date().toISOString(),
    participants: []
  },
  {
    id: 'mock-7',
    title: 'Sprint Planning',
    description: 'Setting objectives for the next two weeks of development.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 3600000 * 1).toISOString(), // 1 hour from now
    participants: []
  },
  {
    id: 'mock-8',
    title: 'QA testing sesssion',
    description: 'Verifying frontend pagination and sidebar refactor.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days later
    participants: []
  },
  {
    id: 'mock-9',
    title: 'Mobile App Discovery',
    description: 'Initial brainstorm for the mobile companion app of MeetMind.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000 * 4).toISOString(), // 4 days later
    participants: []
  },
  {
    id: 'mock-10',
    title: 'Marketing Sync',
    description: 'Preparing for the public beta launch and social media strategy.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days later
    participants: []
  },
  {
    id: 'mock-11',
    title: 'DevOps & Infra Review',
    description: 'Checking AWS deployment and LiveKit server scaling.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000 * 6).toISOString(), // 6 days later
    participants: []
  },
  {
    id: 'mock-12',
    title: 'Security Audit',
    description: 'Regular security checkup and JWT implementation review.',
    status: 'scheduled',
    startTime: new Date(Date.now() + 86400000 * 7).toISOString(), // 7 days later
    participants: []
  },
  {
    id: 'mock-past-1',
    title: 'Q1 Product Retrospective',
    description: 'Detailed analysis of Q1 performance, team velocity, and delivery highlights.',
    status: 'completed',
    startTime: new Date(Date.now() - 86400000 * 3).toISOString(), // 3 days ago
    participants: []
  }
]

const DashboardPage: React.FC = () => {
  const navigate = useNavigate()
  const today = useMemo(() => new Date(), [])
  const [activeMonth, setActiveMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(today)
  const [isCreatingInstant, setIsCreatingInstant] = useState(false)
  
  // Pagination States
  const [dailyPage, setDailyPage] = useState(1)
  const [upcomingPage, setUpcomingPage] = useState(1)
  const ITEMS_PER_PAGE = 5

  const { data: apiMeetings = [], isLoading, isError } = useQuery({
    queryKey: ['meetings'],
    queryFn: async (): Promise<Meeting[]> => {
      const response = await apiClient.get('/meetings')
      return parseMeetingsPayload(response.data)
    },
  })

  // Combine API data with mock data if needed for visualization
  const meetings = apiMeetings.length > 0 ? apiMeetings : MOCK_MEETINGS

  const meetingsByDate = useMemo(() => {
    const grouped = new Map<string, Meeting[]>()

    meetings.forEach((meeting) => {
      const dateKey = toDateKey(new Date(meeting.startTime))
      const existing = grouped.get(dateKey) || []
      existing.push(meeting)
      grouped.set(dateKey, existing)
    })

    grouped.forEach((items) => {
      items.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
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

    const cells: CalendarCell[] = []

    for (let i = 0; i < startWeekDay; i += 1) {
      const date = new Date(year, month - 1, daysInPrevMonth - startWeekDay + i + 1)
      cells.push({ date, key: toDateKey(date), isCurrentMonth: false })
    }

    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = new Date(year, month, day)
      cells.push({ date, key: toDateKey(date), isCurrentMonth: true })
    }

    const trailing = 42 - cells.length
    for (let i = 1; i <= trailing; i += 1) {
      const date = new Date(year, month + 1, i)
      cells.push({ date, key: toDateKey(date), isCurrentMonth: false })
    }

    return cells
  }, [activeMonth])

  // Reset daily page when selecting a new date
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date)
    setDailyPage(1)
  }

  // --- Daily Meetings Pagination ---
  const allSelectedMeetings = useMemo(
    () => meetingsByDate.get(toDateKey(selectedDate)) || [],
    [meetingsByDate, selectedDate],
  )
  
  const dailyTotalPages = Math.ceil(allSelectedMeetings.length / ITEMS_PER_PAGE)
  const paginatedSelectedMeetings = useMemo(
    () => allSelectedMeetings.slice((dailyPage - 1) * ITEMS_PER_PAGE, dailyPage * ITEMS_PER_PAGE),
    [allSelectedMeetings, dailyPage]
  )

  // --- Upcoming Meetings Pagination ---
  const allUpcomingMeetings = useMemo(() => {
    const now = Date.now()
    return meetings
      .filter((meeting) => new Date(meeting.startTime).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
  }, [meetings])

  const upcomingTotalPages = Math.ceil(allUpcomingMeetings.length / ITEMS_PER_PAGE)
  const paginatedUpcomingMeetings = useMemo(
    () => allUpcomingMeetings.slice((upcomingPage - 1) * ITEMS_PER_PAGE, upcomingPage * ITEMS_PER_PAGE),
    [allUpcomingMeetings, upcomingPage]
  )

  const statusCount = useMemo(() => {
    return meetings.reduce(
      (acc, meeting) => {
        acc.total += 1
        acc[meeting.status] = (acc[meeting.status] || 0) + 1
        return acc
      },
      { total: 0, scheduled: 0, ongoing: 0, completed: 0, cancelled: 0 } as Record<string, number>,
    )
  }, [meetings])

  const monthLabel = activeMonth.toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
  })

  // Pagination Control Component
  const PaginationControls = ({ current, total, onPageChange }: { current: number, total: number, onPageChange: (p: number) => void }) => {
    if (total <= 1) return null
    return (
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          Page {current} of {total}
        </p>
        <div className="flex items-center gap-1">
          <button
            disabled={current === 1}
            onClick={() => onPageChange(current - 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            disabled={current === total}
            onClick={() => onPageChange(current + 1)}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    )
  }

  const handleInstantMeeting = async () => {
    setIsCreatingInstant(true)
    try {
      const res = await apiClient.post('/meetings', {
        title: `Instant Session - ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
        description: 'Quick collaboration session initialized from dashboard.',
        startTime: new Date().toISOString()
      })
      navigate(`/meetings/${res.data.id}/manage`)
    } catch (err) {
      console.error('Failed to create instant meeting:', err)
    } finally {
      setIsCreatingInstant(false)
    }
  }

  return (
    <div className="space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
        >
          <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl">
              <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Dashboard <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">Overview</span>
              </h1>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={handleInstantMeeting}
                disabled={isCreatingInstant}
                className="flex h-12 items-center gap-2 rounded-2xl border border-cyan-200 bg-cyan-50 px-6 text-xs font-black uppercase tracking-widest text-cyan-700 transition hover:bg-cyan-100 active:scale-95 disabled:opacity-50"
              >
                {isCreatingInstant ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Zap className="h-5 w-5 text-cyan-500 fill-cyan-500" />
                )}
                <span>Instant Meeting</span>
              </button>

              <button 
                onClick={() => navigate('/meetings/new')}
                className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
              >
                <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                <span>New Meeting</span>
              </button>
            </div>
          </div>
        </motion.header>

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-12">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-[2rem] border border-white/50 bg-white/85 p-3 shadow-xl backdrop-blur sm:rounded-[2.5rem] sm:p-7 xl:col-span-8"
          >
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="inline-flex items-center gap-2 self-start rounded-full bg-cyan-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-700 sm:text-xs">
                <CalendarDays className="h-4 w-4" /> Calendar View
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  onClick={() =>
                    setActiveMonth(
                      new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1),
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <p className="min-w-32 text-center text-base font-semibold text-slate-900 sm:min-w-40 sm:text-lg">
                  {monthLabel}
                </p>
                <button
                  onClick={() =>
                    setActiveMonth(
                      new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1),
                    )
                  }
                  className="rounded-lg border border-slate-200 bg-white p-2 text-slate-700 transition hover:bg-slate-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500 sm:gap-2 sm:text-xs sm:tracking-[0.14em]">
              {WEEK_DAYS.map((day) => (
                <div key={day} className="py-1.5 sm:py-2">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
              {calendarCells.map((cell) => {
                const meetingsOnDay = meetingsByDate.get(cell.key)?.length || 0
                const isSelected = cell.key === toDateKey(selectedDate)
                const isToday = cell.key === toDateKey(today)

                return (
                  <button
                    key={cell.key}
                    onClick={() => handleDateSelect(cell.date)}
                    className={[
                      'relative min-h-16 rounded-lg border p-1.5 text-left transition sm:min-h-20 sm:rounded-xl sm:p-2 lg:min-h-24',
                      cell.isCurrentMonth
                        ? 'border-slate-200 bg-white hover:border-cyan-300'
                        : 'border-slate-100 bg-slate-50 text-slate-400',
                      isSelected ? 'ring-2 ring-cyan-400' : '',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold sm:h-7 sm:w-7 sm:text-sm',
                        isToday ? 'bg-amber-300 text-slate-900' : 'text-slate-700',
                      ].join(' ')}
                    >
                      {cell.date.getDate()}
                    </span>

                    {meetingsOnDay > 0 && (
                      <>
                        <div className="absolute right-1.5 top-1.5 h-2.5 w-2.5 rounded-full bg-cyan-600 sm:hidden" />
                        <div className="absolute bottom-1.5 left-1.5 hidden rounded-full bg-cyan-600 px-2 py-0.5 text-xs font-semibold text-white sm:block">
                          {meetingsOnDay} meeting{meetingsOnDay > 1 ? 's' : ''}
                        </div>
                      </>
                    )}
                  </button>
                )
              })}
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 sm:mt-6 sm:p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-semibold text-slate-800 sm:text-base lg:text-lg">
                  {selectedDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
                {dailyTotalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <span className="hidden text-[10px] font-bold uppercase tracking-wider text-slate-400 sm:inline-block">
                      Page {dailyPage} / {dailyTotalPages}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={dailyPage === 1}
                        onClick={() => setDailyPage(dailyPage - 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                      <button
                        disabled={dailyPage === dailyTotalPages}
                        onClick={() => setDailyPage(dailyPage + 1)}
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-30"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {isLoading && <p className="mt-3 text-sm text-slate-500">Loading meetings...</p>}
              {isError && (
                <p className="mt-3 text-sm text-rose-600">
                  Cannot load meetings now. Please refresh and try again.
                </p>
              )}

              {!isLoading && !isError && allSelectedMeetings.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">No meetings scheduled for this date.</p>
              )}

              {!isLoading && !isError && allSelectedMeetings.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {paginatedSelectedMeetings.map((meeting) => (
                    <li
                      key={meeting.id}
                      onClick={() => navigate(`/meetings/${meeting.id}/manage`)}
                      className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-bold text-slate-900 group-hover:text-cyan-700">{meeting.title}</p>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                          <Clock3 className="h-3.5 w-3.5 text-cyan-500" />
                          <span className="font-semibold text-slate-700">
                            {new Date(meeting.startTime).toLocaleTimeString('en-US', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                            {meeting.status}
                          </span>
                        </div>
                      </div>
                      {meeting.description && (
                        <p className="mt-2 text-xs leading-relaxed text-slate-500">
                          {meeting.description}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.section>

          <motion.aside
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="space-y-4 xl:col-span-4"
          >
            <div className="rounded-3xl border border-white/50 bg-white/85 p-5 shadow-xl backdrop-blur sm:p-6">
              <p className="text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">
                Snapshot
              </p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-cyan-50 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-cyan-700">Total</p>
                  <p className="mt-1 text-2xl font-bold text-cyan-800">{statusCount.total}</p>
                </div>
                <div className="rounded-xl bg-emerald-50 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-emerald-700">Scheduled</p>
                  <p className="mt-1 text-2xl font-bold text-emerald-800">{statusCount.scheduled}</p>
                </div>
                <div className="rounded-xl bg-indigo-50 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-indigo-700">Ongoing</p>
                  <p className="mt-1 text-2xl font-bold text-indigo-800">{statusCount.ongoing}</p>
                </div>
                <div className="rounded-xl bg-rose-50 p-3">
                  <p className="text-xs uppercase tracking-[0.1em] text-rose-700">Completed</p>
                  <p className="mt-1 text-2xl font-bold text-rose-800">{statusCount.completed}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-white/50 bg-white/85 p-5 shadow-xl backdrop-blur sm:p-6">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">
                <Users className="h-4 w-4" /> Upcoming Meetings
              </p>

              {allUpcomingMeetings.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">No upcoming meetings in your timeline.</p>
              )}

              {allUpcomingMeetings.length > 0 && (
                <>
                  <div className="mt-4 min-h-[440px]">
                    <ul className="space-y-3">
                      {paginatedUpcomingMeetings.map((meeting) => (
                        <li 
                          key={meeting.id} 
                          onClick={() => navigate(`/meetings/${meeting.id}/manage`)}
                          className="flex h-[76px] cursor-pointer flex-col justify-center rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-cyan-200 hover:shadow-md"
                        >
                          <p className="truncate font-bold text-slate-900">{meeting.title}</p>
                          <p className="mt-1 text-xs font-semibold text-slate-500">
                            {new Date(meeting.startTime).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <PaginationControls current={upcomingPage} total={upcomingTotalPages} onPageChange={setUpcomingPage} />
                </>
              )}
            </div>
          </motion.aside>
        </div>
    </div>
  )
}

export default DashboardPage
