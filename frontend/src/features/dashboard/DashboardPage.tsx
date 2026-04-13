import React, { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import apiClient from '@/lib/apiClient'
import type { Meeting } from '@/types/api'

type CalendarCell = {
  date: Date
  key: string
  isCurrentMonth: boolean
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

const DashboardPage: React.FC = () => {
  const today = useMemo(() => new Date(), [])
  const [activeMonth, setActiveMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  )
  const [selectedDate, setSelectedDate] = useState(today)

  const { data: meetings = [], isLoading, isError } = useQuery({
    queryKey: ['meetings'],
    queryFn: async (): Promise<Meeting[]> => {
      const response = await apiClient.get('/meetings')
      return parseMeetingsPayload(response.data)
    },
  })

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

  const selectedMeetings = useMemo(
    () => meetingsByDate.get(toDateKey(selectedDate)) || [],
    [meetingsByDate, selectedDate],
  )

  const upcomingMeetings = useMemo(() => {
    const now = Date.now()
    return meetings
      .filter((meeting) => new Date(meeting.startTime).getTime() >= now)
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      )
      .slice(0, 6)
  }, [meetings])

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

  return (
    <div className="space-y-4 sm:space-y-6">
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-white/50 bg-white/80 p-4 shadow-xl backdrop-blur sm:rounded-3xl sm:p-6"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-cyan-700">
              Dashboard
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Meeting Calendar</h1>
            <p className="mt-1 text-sm text-slate-600 sm:text-base">
              Plan and track meetings by day.
            </p>
          </div>
        </motion.header>

        <div className="grid gap-4 lg:gap-6 xl:grid-cols-12">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl border border-white/50 bg-white/85 p-3 shadow-xl backdrop-blur sm:rounded-3xl sm:p-5 xl:col-span-8"
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
                    onClick={() => setSelectedDate(cell.date)}
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
              <p className="text-sm font-semibold text-slate-800 sm:text-base">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                })}
              </p>

              {isLoading && <p className="mt-3 text-sm text-slate-500">Loading meetings...</p>}
              {isError && (
                <p className="mt-3 text-sm text-rose-600">
                  Cannot load meetings now. Please refresh and try again.
                </p>
              )}

              {!isLoading && !isError && selectedMeetings.length === 0 && (
                <p className="mt-3 text-sm text-slate-500">No meetings scheduled for this date.</p>
              )}

              {!isLoading && !isError && selectedMeetings.length > 0 && (
                <ul className="mt-3 space-y-2">
                  {selectedMeetings.map((meeting) => (
                    <li
                      key={meeting.id}
                      className="rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <p className="font-semibold text-slate-900">{meeting.title}</p>
                      <div className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                        <Clock3 className="h-4 w-4" />
                        {new Date(meeting.startTime).toLocaleTimeString('en-US', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                          {meeting.status}
                        </span>
                      </div>
                      {meeting.description && (
                        <p className="mt-2 text-sm text-slate-600">{meeting.description}</p>
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
            <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-xl backdrop-blur sm:rounded-3xl sm:p-5">
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

            <div className="rounded-2xl border border-white/50 bg-white/85 p-4 shadow-xl backdrop-blur sm:rounded-3xl sm:p-5">
              <p className="inline-flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.15em] text-slate-600">
                <Users className="h-4 w-4" /> Upcoming Meetings
              </p>

              {upcomingMeetings.length === 0 && (
                <p className="mt-4 text-sm text-slate-500">No upcoming meetings in your timeline.</p>
              )}

              {upcomingMeetings.length > 0 && (
                <ul className="mt-4 space-y-3">
                  {upcomingMeetings.map((meeting) => (
                    <li key={meeting.id} className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="font-semibold text-slate-900">{meeting.title}</p>
                      <p className="mt-1 text-sm text-slate-600">
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
              )}
            </div>
          </motion.aside>
        </div>
    </div>
  )
}

export default DashboardPage
