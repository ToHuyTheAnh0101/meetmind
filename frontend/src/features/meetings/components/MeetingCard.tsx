import React from 'react'
import { motion } from 'framer-motion'
import { Clock, ChevronRight, Calendar, MoreVertical } from 'lucide-react'
import type { Meeting, MeetingStatus } from '@/types/api'

interface MeetingCardProps {
  meeting: Meeting
  onClick?: (id: string) => void
}

const getStatusStyles = (status: MeetingStatus) => {
  switch (status) {
    case 'ongoing':
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        dot: 'bg-cyan-600',
        label: 'Ongoing',
        border: 'border-cyan-200'
      }
    case 'scheduled':
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        dot: 'bg-emerald-600',
        label: 'Scheduled',
        border: 'border-emerald-200'
      }
    case 'completed':
      return {
        bg: 'bg-slate-100',
        text: 'text-slate-600',
        dot: 'bg-slate-500',
        label: 'Completed',
        border: 'border-slate-200'
      }
    case 'cancelled':
      return {
        bg: 'bg-rose-50',
        text: 'text-rose-700',
        dot: 'bg-rose-600',
        label: 'Cancelled',
        border: 'border-rose-200'
      }
    default:
      return {
        bg: 'bg-slate-50',
        text: 'text-slate-600',
        dot: 'bg-slate-400',
        label: status,
        border: 'border-slate-200'
      }
  }
}

const MeetingCard: React.FC<MeetingCardProps> = ({ meeting, onClick }) => {
  const styles = getStatusStyles(meeting.status)
  const startTime = new Date(meeting.startTime)
  
  const timeStr = startTime.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })

  const dateStr = startTime.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: startTime.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
  })

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ y: -4 }}
      onClick={() => onClick?.(meeting.id)}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl sm:p-6"
    >
      {/* Background soft gradient on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-indigo-50/30 opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative flex h-full flex-col gap-4">
        {/* Header: Title & Status */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="line-clamp-1 text-lg font-bold text-slate-900 group-hover:text-cyan-700 transition-colors sm:text-xl">
              {meeting.title}
            </h3>
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-slate-400" />
                {dateStr}
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-slate-400" />
                {timeStr}
              </div>
            </div>
          </div>

          <div className={`flex items-center gap-1.5 rounded-full ${styles.bg} ${styles.text} ${styles.border} border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider`}>
            {meeting.status === 'ongoing' && (
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-600"></span>
              </span>
            )}
            {meeting.status !== 'ongoing' && <div className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />}
            {styles.label}
          </div>
        </div>

        {/* Description - Flexible space */}
        <div className="flex-1">
          {meeting.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
              {meeting.description}
            </p>
          )}
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-slate-100" />

        {/* Footer: Participants & Actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2 overflow-hidden">
              {meeting.participants?.slice(0, 3).map((p, idx) => (
                <div 
                  key={p.id || idx} 
                  className="inline-block h-8 w-8 rounded-full border-2 border-white bg-slate-100 shadow-sm transition-transform group-hover:translate-x-1"
                  style={{ zIndex: 3 - idx }}
                >
                  <img 
                    src={p.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${p.user?.firstName || 'User'}+${p.user?.lastName || ''}&background=random`} 
                    alt={p.user?.firstName || 'Participant'}
                    className="h-full w-full rounded-full object-cover"
                  />
                </div>
              ))}
              {(meeting.participants?.length || 0) > 3 && (
                <div className="relative z-0 flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-slate-100 text-[10px] font-bold text-slate-600 shadow-sm">
                  +{(meeting.participants?.length || 0) - 3}
                </div>
              )}
            </div>
            <span className="text-xs font-bold text-slate-500">
              {(meeting.participants?.length || 0)} participant{(meeting.participants?.length || 0) !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button 
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              onClick={(e) => {
                e.stopPropagation();
                // Toggle options menu
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            <motion.div
              whileHover={{ x: 3 }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-600 text-white shadow-lg shadow-cyan-100 group-hover:bg-indigo-600 group-hover:shadow-indigo-100 transition-all"
            >
              <ChevronRight className="h-5 w-5" />
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default MeetingCard
