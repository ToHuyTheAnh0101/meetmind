import React, { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
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
  EyeOff
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/apiClient'
import type { Meeting } from '@/types/api'
import SettingToggle from './components/details/SettingToggle'
import EmailTagInput from './components/details/EmailTagInput'

const MeetingDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  
  const isNew = location.pathname === '/meetings/new'
  const [copied, setCopied] = useState(false)
  const [isInstant, setIsInstant] = useState(false)
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    accessType: 'public',
    waitingRoomEnabled: false,
    muteOnJoin: false,
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
  
  const [showPassword, setShowPassword] = useState(false)

  // 1. Fetch Meeting Details (if not new)
  const { data: meeting, isLoading, isError } = useQuery({
    queryKey: ['meeting', id],
    queryFn: async () => {
      const response = await apiClient.get(`/meetings/${id}`)
      return response.data as Meeting
    },
    enabled: !!id && !isNew
  })

  // 2. Initialize form data when meeting is loaded
  useEffect(() => {
    if (meeting && !isNew) {
      const start = new Date(meeting.startTime)
      const localISO = new Date(start.getTime() - start.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
      
      setFormData({
        title: meeting.title,
        description: meeting.description || '',
        startTime: localISO,
        accessType: meeting.accessType || 'public',
        waitingRoomEnabled: !!meeting.waitingRoomEnabled,
        muteOnJoin: !!meeting.muteOnJoin,
        inviteeEmails: meeting.inviteeEmails || [],
        reminderMinutes: meeting.reminderMinutes || 10,
        password: '' // Keep empty as hashed password won't be sent from server
      })
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
      
      if (isInstant && isNew) {
        navigate(`/room/${res.data.id}`)
      } else {
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

  if (isLoading && !isNew) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
      </div>
    )
  }

  if (isError && !isNew) {
    return (
      <div className="flex h-[70vh] flex-col items-center justify-center text-center">
        <AlertCircle className="h-16 w-16 text-rose-500 mb-4" />
        <h2 className="text-2xl font-black text-slate-900">Meeting not found</h2>
        <p className="text-slate-500 mt-2">The session you are looking for might have been deleted or moved.</p>
        <button onClick={() => navigate('/meetings')} className="mt-6 px-6 py-2 bg-slate-900 text-white rounded-xl font-bold">Back to Hub</button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-20">
      <button 
        onClick={() => navigate('/meetings')}
        className="group flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ChevronLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" />
        <span className="text-sm font-black uppercase tracking-widest">Back to Hub</span>
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
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Session Information</h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Basic foundational details</p>
                </div>
                {isNew && (
                  <div className="flex p-1 rounded-xl bg-slate-100/80 border border-slate-200">
                    <button 
                      onClick={() => setIsInstant(false)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isInstant ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Schedule
                    </button>
                    <button 
                      onClick={() => setIsInstant(true)}
                      className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isInstant ? 'bg-cyan-600 shadow-sm text-white' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Instant
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">Meeting Title</label>
                  <input
                    type="text"
                    placeholder="e.g., Q3 Roadmap Strategy"
                    className="w-full border-b-2 border-slate-200 bg-transparent py-4 text-2xl font-black placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none transition-all"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Description & Agenda</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-0 top-4 h-5 w-5 text-slate-300" />
                    <textarea
                      rows={4}
                      placeholder="Provide a brief overview of what will be discussed..."
                      className="w-full border-b-2 border-slate-200 bg-transparent py-4 pl-10 text-base font-medium placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none transition-all resize-none"
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
                    <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Start Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input
                        type="datetime-local"
                        className="w-full border-b-2 border-slate-200 bg-transparent py-4 pl-10 text-sm font-bold focus:border-cyan-500 focus:outline-none transition-all uppercase"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
            </section>

            {/* 2. PRIVACY & PARTICIPANTS SECTION */}
            <section className="space-y-8 py-10">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Privacy & People</h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Control access and guest invitations</p>
               </div>
 
               {/* Password Protection */}
               <div className="space-y-3">
                  <div className="flex items-center gap-2">
                     <Lock className="h-4 w-4 text-slate-400" />
                     <label className="text-[11px] font-bold uppercase tracking-widest text-cyan-700">Meeting Password (Optional)</label>
                  </div>
                  <div className="relative group">
                     <input
                       type={showPassword ? "text" : "password"}
                       placeholder="Set an entry password..."
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
                  <p className="text-[10px] font-medium text-slate-400 leading-tight">
                     Leave empty if you don't want to require a password.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                     <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Access Mode</label>
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
                              <h4 className="text-xs font-black text-slate-900">Anytime Link</h4>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Public</p>
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
                              <h4 className="text-xs font-black text-slate-900">Guest List Only</h4>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Strict</p>
                           </div>
                        </button>
                     </div>
 

                  </div>

                  <div className="space-y-4">
                     <label className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Guest Invitations</label>
                     <EmailTagInput 
                        emails={formData.inviteeEmails}
                        onChange={(emails) => setFormData({ ...formData, inviteeEmails: emails })}
                     />
                  </div>
               </div>

               <SettingToggle 
                  label="Enable Waiting Room"
                  description="Participants must be approved by host before joining."
                  enabled={formData.waitingRoomEnabled}
                  onChange={(val) => setFormData({ ...formData, waitingRoomEnabled: val })}
                  icon={<Users className="h-4 w-4" />}
               />
            </section>

            {/* 3. SETTINGS & INTERACTION SECTION */}
            <section className="space-y-8 pt-10">
               <div>
                  <h2 className="text-2xl font-black text-slate-900 leading-tight">Meeting Preferences</h2>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest mt-1">Fine-tune the session dynamics</p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <SettingToggle 
                    label="Mute on Entry"
                    description="Enter with microphone disabled."
                    enabled={formData.muteOnJoin}
                    onChange={(val) => setFormData({ ...formData, muteOnJoin: val })}
                    icon={<Bell className="h-4 w-4" />}
                  />

                  <div className="p-4 rounded-2xl bg-white/40 border border-slate-200 flex items-center justify-between">
                     <div>
                        <h4 className="text-sm font-black text-slate-900 tracking-tight">Reminders</h4>
                        <p className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5">Notification before start.</p>
                     </div>
                     <select 
                        value={formData.reminderMinutes}
                        onChange={(e) => setFormData({ ...formData, reminderMinutes: parseInt(e.target.value) })}
                        className="bg-white px-3 py-2 rounded-xl text-[11px] font-black border border-slate-300 focus:outline-none"
                     >
                        <option value="0">None</option>
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
                  <h4 className="text-sm font-black text-slate-900">Attachments & Resources</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Coming Soon: Link documents here</p>
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
             <h3 className="text-[11px] font-bold uppercase tracking-widest text-cyan-700 mb-8 flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-cyan-500 animate-pulse" />
                Control Center
             </h3>
             
             <div className="space-y-4">
                {!isNew && (
                  <button 
                    onClick={() => navigate(`/room/${id}`)}
                    className="flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-900 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl transition hover:scale-[1.05] active:scale-95 group"
                  >
                    <Video className="h-5 w-5 transition-transform group-hover:rotate-12" />
                    Join Workspace
                  </button>
                )}

                <button 
                  disabled={mutation.isPending || !formData.title || (!formData.startTime && !isInstant)}
                  onClick={() => mutation.mutate(formData)}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 py-4 text-xs font-black uppercase tracking-[0.2em] text-white shadow-xl shadow-cyan-100 transition hover:scale-[1.05] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <>
                      {isNew ? (isInstant ? 'Launch Now' : 'Schedule Session') : 'Save Changes'}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </button>

                {!isNew && (
                  <div className="pt-6 mt-4 border-t border-slate-100 space-y-4">
                    <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-200 rounded-2xl p-3 pl-4">
                        <div className="flex-1 truncate">
                           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invite Link</p>
                           <p className="text-[10px] font-bold text-slate-600 truncate">{window.location.origin}/room/{id}</p>
                        </div>
                        <button 
                          onClick={handleCopyLink}
                          className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-cyan-600 transition hover:bg-cyan-50 active:scale-95"
                        >
                          {copied ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                        </button>
                    </div>

                    <button 
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this meeting? This action cannot be undone.')) {
                          deleteMutation.mutate()
                        }
                      }}
                      className="flex w-full items-center justify-center gap-2 pt-2 text-[11px] font-bold uppercase tracking-widest text-rose-400 hover:text-rose-600 transition"
                    >
                       <Trash2 className="h-4 w-4" />
                       Destroy Workspace
                    </button>
                  </div>
                )}
             </div>
          </motion.div>

          {!isNew && meeting?.participants && (
             <motion.div 
               initial={{ opacity: 0, x: 20 }}
               animate={{ opacity: 1, x: 0 }}
               transition={{ delay: 0.1 }}
               className="rounded-[2.5rem] border border-white/40 bg-white/30 p-8 shadow-xl backdrop-blur-md"
             >
                <div className="flex items-center justify-between mb-8">
                   <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Team Presence</h3>
                   <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-black">{meeting.participants.length}</span>
                </div>
                
                <div className="space-y-5 max-h-[320px] overflow-y-auto pr-2 custom-scrollbar">
                   {meeting.participants.map((p, idx) => (
                      <div key={p.id || idx} className="flex items-center gap-4 group">
                         <div className="relative h-10 w-10 rounded-full border-2 border-white/80 overflow-hidden shadow-md group-hover:border-cyan-200 transition-colors">
                            <img 
                              src={p.user?.profilePictureUrl || `https://ui-avatars.com/api/?name=${p.user?.firstName}+${p.user?.lastName}&background=random`} 
                              className="h-full w-full object-cover" 
                              alt="" 
                            />
                         </div>
                         <div>
                            <p className="text-sm font-black text-slate-900">{p.user?.firstName} {p.user?.lastName}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{p.isOrganizer ? 'Host' : 'Member'}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </motion.div>
          )}
        </div>
      </div>
    </div>
  )
}

export default MeetingDetailsPage
