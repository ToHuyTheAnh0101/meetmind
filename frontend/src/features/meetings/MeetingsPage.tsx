import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Plus, 
  Search, 
  Filter,
  LayoutGrid
} from 'lucide-react'

// Local components
import MeetingList from './components/MeetingList'
import CreateMeetingSheet from './components/CreateMeetingSheet'

const MeetingsPage: React.FC = () => {
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreateSheetOpen, setIsCreateSheetOpen] = useState(false)

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
            <div className="inline-flex items-center gap-2 rounded-full bg-cyan-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700 sm:text-xs">
              <LayoutGrid className="h-4 w-4" /> Management Portal
            </div>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
              Meetings <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">Hub</span>
            </h1>
            <p className="mt-2 text-sm font-medium text-slate-500 sm:text-base">
              Coordinate and manage your collaborative sessions in one unified workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setIsSearchVisible(!isSearchVisible)}
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 ${
                isSearchVisible 
                  ? 'bg-slate-900 border-slate-900 text-white' 
                  : 'border-slate-200 bg-white text-slate-600 shadow-sm hover:border-cyan-200 hover:text-cyan-600'
              }`}
            >
              <Search className="h-5 w-5" />
            </button>

            <button className="hidden h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black uppercase tracking-widest text-slate-600 shadow-sm transition hover:bg-slate-50 sm:flex">
              <Filter className="h-4 w-4" /> Filters
            </button>

            <button 
              onClick={() => setIsCreateSheetOpen(true)}
              className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-xs font-black uppercase tracking-widest text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
            >
              <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
              <span>New Meeting</span>
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
              <div className="mt-8 flex items-center gap-4 border-t border-slate-100 pt-8">
                <div className="relative flex-1">
                  <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Search by title or description..."
                    className="h-14 w-full rounded-[1.25rem] border-none bg-slate-50 pl-14 pr-6 text-base font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-cyan-500/20 shadow-inner transition-all"
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

      <CreateMeetingSheet 
        isOpen={isCreateSheetOpen} 
        onClose={() => setIsCreateSheetOpen(false)} 
      />
    </div>
  )
}

export default MeetingsPage
