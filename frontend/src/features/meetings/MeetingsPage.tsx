import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter
} from 'lucide-react'

// Local components
import MeetingList from './components/MeetingList'

const MeetingsPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  return (
    <div className="space-y-6">
      {/* Unified Header section */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
      >
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-xl">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              {t('dashboard.list_title_prefix')} <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">{t('dashboard.list_title_highlight')}</span>
            </h1>
            <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base">
              {t('dashboard.list_subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 ${
                isSearchVisible 
                  ? 'bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-100' 
                  : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-cyan-200 hover:text-cyan-600'
              }`}
            >
              <Search className="h-5 w-5" />
            </button>

            <button className="hidden h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 sm:flex">
              <Filter className="h-4 w-4" /> {t('meeting.filters')}
            </button>

            <button 
              onClick={() => navigate('/meetings/new')}
              className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
            >
              <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
              <span>{t('dashboard.new_meeting')}</span>
            </button>
          </div>
        </div>

        <AnimatePresence>
          {isSearchVisible && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-8 flex items-center gap-4 pt-4">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/50" />
                  <input 
                    type="text" 
                    placeholder={t('meeting.search_placeholder')}
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white/50 pl-14 pr-6 text-base font-bold placeholder:text-slate-400 focus:border-cyan-400 focus:ring-0 focus:bg-white backdrop-blur-sm transition-all outline-none"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.header>

      {/* Main Content Area - Always List now */}
      <div className="min-h-[500px]">
        <MeetingList searchQuery={searchQuery} />
      </div>
    </div>
  )
}

export default MeetingsPage
