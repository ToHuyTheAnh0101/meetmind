import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import {
  Calendar,
  Layers,
  Check,
  Video,
  Globe,
  Lock,
  Cpu
} from 'lucide-react'
import { useAuth } from '@/features/auth/AuthContext'
import apiClient from '@/lib/apiClient'

// --- Virtual Background Options ---
const VIRTUAL_BACKGROUNDS = [
  { 
    id: 'none', 
    type: 'none', 
    url: '', 
    preview: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80' 
  },
  { 
    id: 'blur', 
    type: 'blur', 
    url: '', 
    preview: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80&blur=10' 
  },
  {
    id: 'office',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'livingroom',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'studio',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'space',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?auto=format&fit=crop&w=150&q=80'
  },
  {
    id: 'gradient',
    type: 'image',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
    preview: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80'
  }
]

const ProfilePage: React.FC = () => {
  const { t } = useTranslation()
  const { user } = useAuth()
  
  const displayName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Unknown User'
  const email = user?.email || 'N/A'
  const avatarUrl = user?.picture || user?.profilePictureUrl || ''
  
  // Timezone auto-detect
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone

  // Browser Info auto-detect
  const [browserInfo, setBrowserInfo] = useState('')
  useEffect(() => {
    const ua = navigator.userAgent
    let M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || []
    if (/trident/i.test(M[1])) {
      setBrowserInfo('IE')
    } else if (M[1] === 'Chrome') {
      const temp = ua.match(/\b(OPR|Edge)\/(\d+)/)
      if (temp != null) setBrowserInfo(temp.slice(1).join(' ').replace('OPR', 'Opera'))
      else setBrowserInfo('Google Chrome')
    } else {
      setBrowserInfo(M[1] || 'Trình duyệt Web')
    }
  }, [])

  // Virtual Background state
  const [activeBgr, setActiveBgr] = useState<string>('none')

  useEffect(() => {
    const saved = localStorage.getItem('meetmind_virtual_bgr')
    if (saved) {
      setActiveBgr(saved)
    }
  }, [])

  const handleSelectBgr = (id: string) => {
    setActiveBgr(id)
    localStorage.setItem('meetmind_virtual_bgr', id)
  }

  // --- Quick Stats Queries (Meetings & Templates count) ---
  const { data: meetings = [] } = useQuery({
    queryKey: ['meetings-count'],
    queryFn: async () => {
      const res = await apiClient.get('/meetings')
      return res.data.items || res.data
    }
  })

  const { data: templates = [] } = useQuery({
    queryKey: ['templates-count'],
    queryFn: async () => {
      const res = await apiClient.get('/summary-templates')
      return res.data
    }
  })

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Page Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2.5rem] border border-white/40 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8"
      >
        <div className="absolute -right-8 -top-8 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />
        <div className="absolute -left-8 -bottom-8 h-48 w-48 rounded-full bg-indigo-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900">
              {t('profile.title_prefix')}{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                {t('profile.title_highlight')}
              </span>
            </h1>
            <p className="mt-1 text-sm font-medium text-slate-500">
              {t('profile.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start rounded-2xl border border-white/50 bg-emerald-50/90 px-4 py-2 text-xs font-bold text-emerald-800 shadow-sm">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{t('profile.google_active')}</span>
          </div>
        </div>
      </motion.header>

      {/* Main Grid Content */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Grid: Avatar & Core Account Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-1 flex flex-col gap-6"
        >
          {/* Glassmorphic Profile Card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm flex flex-col items-center text-center">
            {/* Glowing Avatar border */}
            <div className="relative group">
              <div className="absolute -inset-1.5 bg-gradient-to-tr from-cyan-400 via-indigo-400 to-teal-400 rounded-full blur opacity-70 group-hover:opacity-100 transition duration-700 animate-spin-slow" />
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="relative h-28 w-28 rounded-full object-cover border-4 border-white shadow-2xl"
                />
              ) : (
                <div className="relative h-28 w-28 rounded-full bg-cyan-100 flex items-center justify-center text-4xl font-black text-cyan-700 border-4 border-white shadow-2xl">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-800 leading-tight">
              {displayName}
            </h2>
            <p className="text-sm font-semibold text-slate-400 mt-1">{email}</p>

            <div className="mt-6 w-full h-px bg-slate-100" />

            {/* Timezone Info */}
            <div className="mt-5 w-full flex items-center gap-3 bg-white/50 rounded-2xl p-4 border border-slate-100 text-left">
              <div className="h-9 w-9 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Globe className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('profile.timezone_label')}</p>
                <p className="text-xs font-black text-slate-700 mt-0.5">{userTimezone}</p>
              </div>
            </div>

            {/* OAuth provider */}
            <div className="mt-3 w-full flex items-center gap-3 bg-white/50 rounded-2xl p-4 border border-slate-100 text-left">
              <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="leading-tight">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('profile.auth_method_label')}</p>
                <p className="text-xs font-black text-slate-700 mt-0.5">{t('profile.google_oauth')}</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Grid: Stats & Background Selector */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="md:col-span-2 flex flex-col gap-6"
        >
          {/* Top: Stats & Connection widget */}
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Stat 1: Meetings */}
            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 shadow-lg backdrop-blur-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600 shrink-0">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('profile.meetings_count')}</p>
                <p className="text-lg font-black text-slate-800 mt-0.5">{meetings.length || 0}</p>
              </div>
            </div>

            {/* Stat 2: Templates */}
            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 shadow-lg backdrop-blur-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
                <Layers className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('profile.templates_count')}</p>
                <p className="text-lg font-black text-slate-800 mt-0.5">{templates.length || 0}</p>
              </div>
            </div>

            {/* Stat 3: Browser detected */}
            <div className="rounded-2xl border border-white/50 bg-white/70 p-4 shadow-lg backdrop-blur-sm flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-teal-50 flex items-center justify-center text-teal-600 shrink-0">
                <Cpu className="h-5 w-5" />
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t('profile.browser_label')}</p>
                <p className="text-sm font-black text-slate-800 mt-0.5 truncate">{browserInfo}</p>
              </div>
            </div>
          </div>

          {/* Bottom: Virtual Background Selector */}
          <div className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-cyan-50 flex items-center justify-center text-cyan-600">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-800">{t('profile.bgr_config_title')}</h3>
                <p className="text-xs font-medium text-slate-500">{t('profile.bgr_config_subtitle')}</p>
              </div>
            </div>

            {/* Preview Grid */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
              {VIRTUAL_BACKGROUNDS.map((bg) => {
                const isSelected = activeBgr === bg.id
                return (
                  <button
                    key={bg.id}
                    onClick={() => handleSelectBgr(bg.id)}
                    className={`group relative h-24 rounded-2xl border overflow-hidden transition-all duration-300 text-left outline-none flex flex-col justify-end ${
                      isSelected
                        ? 'border-cyan-500 ring-4 ring-cyan-100 shadow-lg'
                        : 'border-slate-200 hover:border-cyan-300 shadow-sm'
                    }`}
                  >
                    {/* Background Preview Image */}
                    {bg.type === 'blur' ? (
                      <div className="absolute inset-0 bg-slate-900 flex items-center justify-center text-white/40">
                        <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center bg-white/5 backdrop-blur-md">
                          <Sparkles className="h-4 w-4" />
                        </div>
                      </div>
                    ) : bg.type === 'none' ? (
                      <div className="absolute inset-0 bg-slate-100 flex items-center justify-center text-slate-400">
                        <div className="h-8 w-8 rounded-full border border-slate-200 flex items-center justify-center bg-white">
                          <Video className="h-4 w-4" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={bg.preview}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    )}

                    {/* Dark gradient bottom mask */}
                    <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/60 to-transparent" />

                    {/* Selected Check overlay */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-md">
                        <Check className="h-3 w-3" />
                      </div>
                    )}

                    <span className="relative z-10 px-3 py-1.5 text-[10px] font-black text-white truncate w-full">
                      {t(`profile.bgr_${bg.id}`)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

// Sparkles local icon component
const Sparkles = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="m5 3 1 2.5L8.5 6 6 7 5 9.5 4 7 1.5 6 4 5.5Z" />
    <path d="m19 17 1 2.5 2.5.5-2.5 1-1 2.5-1-2.5-2.5-1 2.5-1Z" />
  </svg>
)

export default ProfilePage
