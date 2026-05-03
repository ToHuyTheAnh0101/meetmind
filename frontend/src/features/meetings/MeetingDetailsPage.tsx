import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  ChevronLeft, 
  Calendar, 
  AlignLeft, 
  Loader2, 
  Copy, 
  Check, 
  Video, 
  Trash2,
  AlertCircle,
  Shield,
  Users,
  Bell,
  Paperclip,
  ArrowRight,
  Lock,
  Eye,
  EyeOff,
  Search,
  User,
  MicOff
} from 'lucide-react'
import { 
  useQuery, 
  useMutation, 
  useQueryClient, 
  useInfiniteQuery 
} from '@tanstack/react-query'
import apiClient from '@/lib/apiClient'
import type { Meeting } from '@/types/api'
import SettingToggle from './components/details/SettingToggle'
import EmailTagInput from './components/details/EmailTagInput'
import { useTimeTheme } from '@/hooks/useTimeTheme'

const MeetingDetailsPage: React.FC = () => {
  const { t } = useTranslation()
  const theme = useTimeTheme()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const isNew = location.pathname === '/meetings/new'
  const [copied, setCopied] = useState(false)
  const [isInstant, setIsInstant] = useState(true)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    accessType: 'public',
    waitingRoomEnabled: false,
    muteOnJoin: false,
    allowDisplayNameEdit: true,
    inviteeEmails: [
      'alex.rivera@company.com', 'beatrice.smith@tech.io', 'charlie.davis@venture.net',
      'diana.prince@global.org', 'ethan.hunt@mission.com', 'fiona.gallagher@innovate.co',
      'george.clooney@star.me', 'hannah.montana@pop.tv', 'ian.mckellen@wizard.uk',
      'julia.roberts@actor.com', 'kevin.hart@comedy.us', 'lara.croft@tomb.net',
      'michael.scott@dunder.com', 'nina.simone@jazz.org', 'oscar.wilde@literature.com',
      'peter.parker@spider.me', 'quentin.tarantino@film.co', 'rachel.green@friends.tv',
      'steve.jobs@apple.me', 'tony.stark@stark.id'
    ],
    reminderMinutes: 10,
    password: ''
  })
  
  const [initialData, setInitialData] = useState<string>('')
  const [isDirty, setIsDirty] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  // Track if data has changed
  useEffect(() => {
    if (initialData) {
      const currentData = JSON.stringify({
        ...formData
      })
      setIsDirty(currentData !== initialData)
    }
  }, [formData, initialData])

  // Browser Warning on Unsaved Changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // 1. Fetch Meeting Details
  const { data: meeting, isLoading, isError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${id}`)
      return response.data as Meeting
    },
    enabled: !!id && !isNew
  })

  // 2. Fetch Paginated Participants (Infinite Scroll)
  const {
    data: participantsData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useInfiniteQuery<any>({
    queryKey: ['participants', id],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await apiClient.get(`/meetings/${id}/participants`, {
        params: { page: pageParam, limit: 10 }
      })
      return response.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1
      }
      return undefined
    },
    enabled: !!id && !isNew
  })

  const allParticipants = participantsData?.pages.flatMap((page: any) => page.items) || []
  
  const filteredParticipants = allParticipants.filter(p => {
    const fullName = `${p.user?.firstName} ${p.user?.lastName}`.toLowerCase()
    return fullName.includes(searchTerm.toLowerCase())
  })

  // 2. Initialize form data when meeting is loaded
  useEffect(() => {
    if (meeting && !isNew) {
      const start = new Date(meeting.startTime)
      const localISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      
      const loadedData = {
        title: meeting.title,
        description: meeting.description || '',
        startTime: localISO,
        accessType: meeting.accessType || 'public',
        waitingRoomEnabled: !!meeting.waitingRoomEnabled,
        muteOnJoin: !!meeting.muteOnJoin,
        allowDisplayNameEdit: meeting.allowDisplayNameEdit ?? true,
        inviteeEmails: meeting.inviteeEmails || [],
        reminderMinutes: meeting.reminderMinutes || 10,
        password: meeting.password || ''
      }
      
      setFormData(loadedData)
      setInitialData(JSON.stringify(loadedData))
      setIsInstant(false)
    } else if (isNew) {
      setInitialData(JSON.stringify(formData))
      setIsInstant(true)
    }
  }, [meeting, isNew])

  // 3. Create or Update Mutation
  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const start = isInstant ? new Date() : new Date(data.startTime)
      
      const payload = {
        title: data.title,
        description: data.description,
        startTime: start.toISOString(),
        accessType: data.accessType,
        waitingRoomEnabled: data.waitingRoomEnabled,
        muteOnJoin: data.muteOnJoin,
        allowDisplayNameEdit: data.allowDisplayNameEdit,
        inviteeEmails: data.inviteeEmails,
        reminderMinutes: data.reminderMinutes,
        password: data.password
      }
      
      if (isNew) {
        return apiClient.post('/meetings', payload)
      } else {
        return apiClient.put(`/meetings/${id}`, payload)
      }
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      queryClient.invalidateQueries({ queryKey: ['meeting', id] })
      
      // Update initialData with current formData to clear isDirty
      const updatedFormData = { ...formData }
      setFormData(updatedFormData)
      setInitialData(JSON.stringify(updatedFormData))
      setIsDirty(false)

      if (isInstant && isNew) {
        navigate(`/room/${res.data.id}`)
      } else if (isNew) {
        navigate('/meetings')
      }
    }
  })

  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: async () => apiClient.delete(`/meetings/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      navigate('/meetings')
    }
  })

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteConfirm = () => {
    deleteMutation.mutate()
    setShowDeleteConfirm(false)
  }

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    if (scrollHeight - scrollTop <= clientHeight + 50 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }

  if (isLoading && !isNew) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className={`h-10 w-10 animate-spin ${theme.colors.primary}`} />
      </div>
    )
  }

  if (isError && !isNew) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">{t('meeting.not_found')}</h2>
        <p className="text-slate-500 mt-2">{t('meeting.not_found_desc')}</p>
        <button onClick={() => navigate('/meetings')} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">{t('meeting.back_to_hub')}</button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      {/* 1. CUSTOM DELETE CONFIRMATION MODAL */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 sm:p-12">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg overflow-hidden rounded-[3rem] border border-white/40 bg-white/90 shadow-2xl backdrop-blur-2xl"
            >
              <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-rose-500/10 blur-[80px]" />
              
              <div className="relative z-10 flex flex-col items-center text-center p-10 sm:p-14">
                <div className="mb-8 flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-rose-500/10 text-rose-500 shadow-inner">
                  <Trash2 className="h-10 w-10" />
                </div>
                
                <h2 className="text-3xl font-black tracking-tight text-slate-900">{t('meeting.destroy_workspace')}?</h2>
                <div className="mt-5 flex flex-col gap-3">
                  <p className="text-slate-500 font-bold leading-relaxed">
                    {t('meeting.delete_confirm')}
                  </p>
                </div>

                <div className="mt-12 flex flex-col w-full gap-4">
                  <button
                    onClick={handleDeleteConfirm}
                    disabled={deleteMutation.isPending}
                    className="flex h-16 w-full items-center justify-center rounded-2xl bg-rose-500 font-black text-white shadow-xl shadow-rose-200 transition hover:bg-rose-600 hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                  >
                    {deleteMutation.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : t('common.save') === 'Lưu' ? 'Xác Nhận Xóa' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex h-16 w-full items-center justify-center rounded-2xl bg-slate-100 font-black text-slate-500 transition hover:bg-slate-200"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <button 
        onClick={() => navigate('/meetings')}
        className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-black">{t('meeting.back_to_hub')}</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT: UNIFIED CONFIGURATION FORM */}
        <div className="lg:col-span-8 space-y-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[2.5rem] border border-white/80 bg-white/70 p-8 shadow-2xl backdrop-blur-xl sm:p-12"
          >
            {/* 1. SESSION SECTION */}
            <section className="space-y-6 pb-10">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{t('meeting.session_info')}</h2>
                </div>
                {isNew && (
                  <div className="flex p-1 rounded-xl bg-slate-100/80 border border-slate-200">
                    <button 
                      onClick={() => setIsInstant(false)}
                       className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${!isInstant ? 'bg-sky-50 shadow-sm text-sky-700 border border-sky-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t('meeting.schedule_session')}
                    </button>
                    <button 
                      onClick={() => setIsInstant(true)}
                       className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${isInstant ? 'bg-cyan-50 shadow-sm text-cyan-700 border border-cyan-200/50' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      {t('dashboard.instant_meeting')}
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-cyan-700">{t('meeting.title')}</label>
                  <input
                    type="text"
                    placeholder={t('meeting.title_example')}
                    className={`w-full border-b-2 border-slate-200 bg-transparent py-2 text-xl font-black placeholder:text-slate-300 focus:outline-none transition-all focus:border-${theme.colors.primary.split('-')[1]}-500`}
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-slate-500">{t('meeting.description_agenda')}</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-0 top-4 h-5 w-5 text-slate-300" />
                    <textarea
                      rows={4}
                      placeholder={t('meeting.description_placeholder')}
                      className="w-full border-b-2 border-slate-200 bg-transparent py-2 pl-10 text-base font-medium placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none transition-all resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {!isInstant && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-2"
                  >
                    <label className="text-sm font-bold text-slate-500">{t('meeting.start_time')}</label>
                    <div className="relative">
                      <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input
                        type="datetime-local"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-2 pl-10 text-base font-medium focus:border-cyan-500 focus:outline-none transition-all"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            {/* 2. PRIVACY & PARTICIPANTS SECTION */}
            <section className="pt-10 space-y-8">
              <div>
                <h2 className="text-3xl font-black text-slate-900 leading-tight">{t('meeting.privacy_members')}</h2>
                <p className="text-sm font-bold text-slate-500 mt-1">{t('meeting.access_control_desc')}</p>
              </div>
 
               {/* Password Protection */}
               <div className="space-y-3">
                  <div className="flex items-center gap-2">
                     <Lock className="h-4 w-4 text-slate-400" />
                     <label className="text-sm font-bold text-cyan-700">{t('meeting.password_optional')}</label>
                  </div>
                  <div className="relative group">
                     <input
                       type={showPassword ? "text" : "password"}
                       placeholder={t('meeting.set_password')}
                       className="w-full h-11 pl-4 pr-12 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-none transition-all text-sm font-bold text-slate-900 shadow-inner"
                       value={formData.password}
                       onChange={e => setFormData({ ...formData, password: e.target.value })}
                     />
                     <button
                       type="button"
                       onClick={() => setShowPassword(!showPassword)}
                       className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100/50 text-slate-400 transition-colors"
                     >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                     </button>
                  </div>
                  <p className="text-xs font-medium text-slate-600 leading-tight">
                     {t('meeting.leave_empty_password')}
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <label className="text-sm font-bold text-slate-500">{t('meeting.access_mode')}</label>
                     <div className="grid grid-cols-1 gap-3">
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, accessType: 'public' })}
                        className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${formData.accessType === 'public' ? 'bg-cyan-50 border-cyan-500 shadow-md shadow-cyan-100' : 'bg-white opacity-60 border-slate-200 hover:opacity-100'}`}
                        >
                           <div className={`p-2 rounded-lg ${formData.accessType === 'public' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Video className="h-4 w-4" />
                           </div>
                           <div className="text-left">
                              <h4 className="text-sm font-black text-slate-900">{t('meeting.anytime_link')}</h4>
                              <p className="text-[11px] font-bold text-slate-500">{t('meeting.public')}</p>
                           </div>
                        </button>

                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, accessType: 'invite_only' })}
                          className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${formData.accessType === 'invite_only' ? 'bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-100' : 'bg-white opacity-60 border-slate-200 hover:opacity-100'}`}
                        >
                           <div className={`p-2 rounded-lg ${formData.accessType === 'invite_only' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                              <Shield className="h-4 w-4" />
                           </div>
                           <div className="text-left">
                              <h4 className="text-sm font-black text-slate-900">{t('meeting.guest_list_only')}</h4>
                              <p className="text-[11px] font-bold text-slate-500">{t('meeting.strict')}</p>
                           </div>
                        </button>
                     </div>
 

                  </div>

                  <div className="space-y-4">
                     <label className="text-sm font-bold text-slate-500">{t('meeting.guest_invitations')}</label>
                     <EmailTagInput 
                        emails={formData.inviteeEmails}
                        onChange={(emails) => setFormData({ ...formData, inviteeEmails: emails })}
                     />
                  </div>
               </div>

               <SettingToggle 
                  label={t('meeting.enable_waiting_room')}
                  description={t('meeting.waiting_room_desc')}
                  enabled={formData.waitingRoomEnabled}
                  onChange={(val) => setFormData({ ...formData, waitingRoomEnabled: val })}
                  icon={<Users className="h-4 w-4" />}
               />
            </section>

            {/* 3. SETTINGS & INTERACTION SECTION */}
            <section className="space-y-8 pt-10">
               <div>
                  <h2 className="text-3xl font-black text-slate-900 leading-tight">{t('meeting.preferences')}</h2>
                  <p className="text-sm font-bold text-slate-500 mt-1">{t('meeting.notify_before')}</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="p-4 rounded-2xl bg-white/40 border border-slate-200 flex items-center justify-between">
                     <SettingToggle 
                        label={t('meeting.mute_on_entry')}
                        description={t('meeting.mute_on_entry_desc')}
                        enabled={formData.muteOnJoin}
                        onChange={(val) => setFormData({ ...formData, muteOnJoin: val })}
                        icon={<MicOff className="h-4 w-4" />}
                        noBorder
                        className="w-full py-0"
                     />
                   </div>

                   <div className="p-4 rounded-2xl bg-white/40 border border-slate-200 flex items-center justify-between">
                     <SettingToggle 
                        label={t('meeting.allow_display_name_edit')}
                        description={t('meeting.allow_display_name_edit_desc')}
                        enabled={formData.allowDisplayNameEdit}
                        onChange={(val) => setFormData({ ...formData, allowDisplayNameEdit: val })}
                        icon={<User className="h-4 w-4" />}
                        noBorder
                        className="w-full py-0"
                     />
                   </div>

                  <div className="p-4 rounded-2xl bg-white/40 border border-slate-200 flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400">
                           <Bell className="h-4 w-4" />
                        </div>
                        <div>
                           <h4 className="text-sm font-black text-slate-900 tracking-tight">{t('meeting.reminders')}</h4>
                           <p className="text-xs font-medium text-slate-500 leading-tight mt-1">{t('meeting.notify_before')}</p>
                        </div>
                     </div>
                     <select 
                        value={formData.reminderMinutes}
                        onChange={(e) => setFormData({ ...formData, reminderMinutes: parseInt(e.target.value) })}
                        className="bg-white/80 backdrop-blur-sm px-4 py-2 rounded-xl text-xs font-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all cursor-pointer hover:bg-white ml-8"
                     >
                        <option value="0">{t('meeting.none')}</option>
                        <option value="5">5m</option>
                        <option value="15">15m</option>
                        <option value="30">30m</option>
                        <option value="60">1h</option>
                     </select>
                  </div>
               </div>

               <div className="relative group p-8 rounded-3xl border-2 border-dashed border-slate-200 hover:border-cyan-200 transition-all text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4">
                     <Paperclip className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-slate-900">{t('meeting.attachments')}</h4>
                  <p className="text-xs font-bold text-slate-500 mt-1">{t('meeting.coming_soon')}</p>
               </div>
            </section>
          </motion.div>
        </div>

        {/* RIGHT: PERSISTENT ACTION SIDEBAR */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-8">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="rounded-[2.5rem] border border-white/80 bg-white/70 p-8 shadow-2xl backdrop-blur-xl"
          >
             <h3 className={`text-lg font-black mb-8 flex items-center gap-3 transition-colors duration-1000 ${theme.colors.primary}`}>
                <div className={`h-1.5 w-1.5 rounded-full animate-pulse ${theme.colors.primary.replace('text-', 'bg-')}`} />
                {t('meeting.control_center')}
             </h3>
             
             <div className="space-y-4">
                {!isNew && (
                  <>
                    <button 
                      disabled={meeting?.status === 'completed'}
                      onClick={() => navigate(`/room/${id}`)}
                      className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-black text-white shadow-xl transition group ${meeting?.status === 'completed' ? 'bg-slate-400 cursor-not-allowed opacity-70' : 'bg-slate-900 hover:scale-[1.05] active:scale-95'}`}
                    >
                      <Video className="h-5 w-5 transition-transform group-hover:rotate-12" />
                      {meeting?.status === 'completed' ? t('meeting.status.completed') : t('meeting.join_workspace')}
                    </button>
                    {meeting?.status === 'completed' && (
                       <p className="text-xs font-bold text-rose-500 text-center mt-2 px-4 leading-relaxed">
                          {t('meeting.meeting_ended_note')}
                       </p>
                    )}
                  </>
                )}

                <button 
                  disabled={mutation.isPending || !formData.title || (!formData.startTime && !isInstant)}
                  onClick={() => mutation.mutate(formData)}
                  className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br transition-all duration-500 py-4 text-sm font-black text-white shadow-xl hover:scale-[1.05] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 ${theme.colors.textGradient.replace('from-', 'from-').replace('to-', 'to-')} ${isDirty ? 'animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.4)]' : theme.period === 'morning' ? 'shadow-cyan-100' : theme.period === 'afternoon' ? 'shadow-orange-100' : 'shadow-indigo-100'}`}
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isNew ? (isInstant ? t('meeting.launch_now') : t('meeting.schedule_session')) : t('meeting.save_changes')}
                      {isDirty && !isNew && <div className="h-2 w-2 rounded-full bg-white animate-bounce" />}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {!isNew && (
                  <div className="pt-6 mt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-200 rounded-2xl p-3 pl-4">
                        <div className="flex-1 truncate">
                           <p className="text-sm font-bold text-slate-400">{t('meeting.invite_link')}</p>
                           <p className="text-sm font-bold text-slate-600 truncate">{window.location.origin}/room/{id}</p>
                        </div>
                        <button 
                          onClick={handleCopyLink}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-cyan-600 transition hover:bg-cyan-50 active:scale-95"
                        >
                          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                        </button>
                    </div>

                    <button 
                      onClick={() => setShowDeleteConfirm(true)}
                      className="flex w-full items-center justify-center gap-2 pt-2 text-sm font-bold text-rose-400 hover:text-rose-600 transition"
                    >
                       <Trash2 className="h-4 w-4" />
                       {t('meeting.destroy_workspace')}
                    </button>
                  </div>
                )}
             </div>
          </motion.div>

          {!isNew && meeting?.participants && (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-8 rounded-[2.5rem] relative overflow-hidden bg-white/70 backdrop-blur-xl border border-white/80"
            >
               <div className="absolute top-0 right-0 p-6 opacity-[0.03] rotate-12">
                  <Users className="h-32 w-32" />
               </div>

               <div className="relative z-10">
                  <div className="flex items-center justify-between mb-6">
                     <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('meeting.team_presence')}</h3>
                     <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-xs font-black">{filteredParticipants.length}</span>
                  </div>
                  
                  {/* Search Bar */}
                  <div className="relative mb-6">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input 
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm thành viên..."
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border-2 border-transparent rounded-2xl text-sm font-bold placeholder:text-slate-400 focus:border-slate-200 focus:bg-white transition-all outline-none"
                    />
                  </div>

                  <div className="space-y-6 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar" onScroll={handleScroll}>
                    {filteredParticipants.length > 0 ? (
                      <>
                        {filteredParticipants.map((p, idx) => (
                          <div key={p.id || idx} className="flex items-center justify-between group">
                             <div className="flex items-center gap-4">
                                <div className="relative h-12 w-12 rounded-2xl border-2 border-white/80 overflow-hidden shadow-sm group-hover:border-slate-200 transition-colors bg-slate-100">
                                   <img 
                                     src={p.user?.picture || p.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${p.user?.firstName}+${p.user?.lastName}&background=random`} 
                                     className="h-full w-full object-cover"
                                     alt=""
                                   />
                                </div>
                                <div>
                                   <p className="text-sm font-black text-slate-900">{p.user?.firstName} {p.user?.lastName}</p>
                                   <p className="text-[10px] font-black text-slate-400">
                                     {p.isOrganizer ? 'Chủ phòng' : 'Thành viên'}
                                  </p>
                                </div>
                             </div>
                             <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" />
                          </div>
                        ))}
                        {isFetchingNextPage && (
                           <div className="flex justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                           </div>
                        )}
                      </>
                    ) : (
                      <div className="py-10 text-center">
                        <p className="text-sm font-bold text-slate-400">Không tìm thấy thành viên</p>
                      </div>
                    )}
                  </div>
               </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MeetingDetailsPage
