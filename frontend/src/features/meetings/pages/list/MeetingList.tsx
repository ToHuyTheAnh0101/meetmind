import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Inbox, Loader2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import apiClient from '@/lib/apiClient'
import type { Meeting, PaginatedResponse } from '@/types/api'
import MeetingCard from './MeetingCard'

// --- Interfaces ---
interface MeetingListProps {
  searchQuery: string
  status: string
}

// --- Helper Functions ---
const parsePaginatedPayload = (payload: unknown): PaginatedResponse<Meeting> | null => {
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'items' in payload &&
    'meta' in payload
  ) {
    return payload as PaginatedResponse<Meeting>
  }
  return null
}

// --- Component ---
const MeetingList: React.FC<MeetingListProps> = ({ searchQuery, status }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [page, setPage] = useState(1)
  const LIMIT = 8

  // Reset page to 1 when filters or search query changes
  React.useEffect(() => {
    setPage(1)
  }, [searchQuery, status])

  const { data: apiResponse, isLoading, isError, refetch } = useQuery({
    queryKey: ['meetings', page, searchQuery, status],
    queryFn: async (): Promise<PaginatedResponse<Meeting> | null> => {
      const response = await apiClient.get('/meetings', {
        params: {
          page,
          limit: LIMIT,
          search: searchQuery || undefined,
          status: status || undefined,
        },
      })
      return parsePaginatedPayload(response.data)
    },
  })

  const { items, totalPages } = useMemo(() => {
    if (apiResponse) {
      return {
        items: apiResponse.items,
        totalPages: apiResponse.meta.totalPages,
      }
    }
    return {
      items: [],
      totalPages: 0,
    }
  }, [apiResponse])

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-white/50 bg-white/50 py-20 backdrop-blur-sm">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
        <p className="mt-4 font-bold text-slate-900">{t('meeting.fetching_meetings')}</p>
        <p className="mt-1 text-sm text-slate-500">{t('meeting.sync_hub')}</p>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/50 py-20 backdrop-blur-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h3 className="mt-4 text-lg font-bold text-slate-900">{t('meeting.load_error')}</h3>
        <p className="mt-1 text-center text-sm text-slate-500">
          {t('meeting.server_problem')}
        </p>
        <button 
          onClick={() => refetch()}
          className="mt-6 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
        >
          {t('meeting.retry')}
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white/50 py-20 backdrop-blur-sm">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
          <Inbox className="h-10 w-10" />
        </div>
        <h3 className="mt-6 text-xl font-bold text-slate-900">
          {searchQuery ? t('meeting.no_matches') : t('meeting.empty_hub')}
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500 max-w-xs">
          {searchQuery 
            ? t('meeting.no_matches_desc', { query: searchQuery })
            : t('meeting.empty_hub_desc')}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-white/50 bg-white/30 px-5 py-3 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-cyan-500 animate-pulse" />
            <p className="text-sm font-bold text-cyan-700">
              {t('dashboard.meetings')} {t('meeting.page')} {page} <span className="text-slate-400">/ {totalPages}</span>
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              disabled={page === 1}
              onClick={() => {
                setPage(prev => prev - 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
            >
              <ChevronLeft className="h-5 w-5 transition-transform group-active:-translate-x-1" />
            </button>
            <button
              disabled={page === totalPages}
              onClick={() => {
                setPage(prev => prev + 1)
                window.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              className="group flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-cyan-300 hover:text-cyan-600 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
            >
              <ChevronRight className="h-5 w-5 transition-transform group-active:translate-x-1" />
            </button>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2">
        <AnimatePresence mode="popLayout">
          {items.map((meeting, index) => (
            <motion.div
              key={meeting.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="h-full"
            >
              <MeetingCard 
                meeting={meeting} 
                onClick={(id) => navigate(`/meetings/${id}/manage`)}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}

export default MeetingList
