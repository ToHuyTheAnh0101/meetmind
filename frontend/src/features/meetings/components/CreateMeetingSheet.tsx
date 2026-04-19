import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, Clock, AlignLeft, Users, Sparkles, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/lib/apiClient'

interface CreateMeetingSheetProps {
  isOpen: boolean
  onClose: () => void
}

const CreateMeetingSheet: React.FC<CreateMeetingSheetProps> = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    duration: '60'
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Calculate endTime based on startTime and duration
      const start = new Date(data.startTime)
      const end = new Date(start.getTime() + parseInt(data.duration) * 60000)
      
      return apiClient.post('/meetings', {
        title: data.title,
        description: data.description,
        startTime: data.startTime,
        endTime: end.toISOString()
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] })
      onClose()
      setFormData({ title: '', description: '', startTime: '', duration: '60' })
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title || !formData.startTime) return
    createMutation.mutate(formData)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-[2px]"
          />

          {/* Sheet */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-lg flex-col border-l border-white/20 bg-white/90 shadow-2xl backdrop-blur-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 p-6">
              <div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900">Schedule <span className="text-cyan-600">Meeting</span></h2>
                <p className="mt-1 text-sm font-medium text-slate-500">Plan your next collaborative session.</p>
              </div>
              <button 
                onClick={onClose}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition hover:bg-slate-100 hover:text-slate-900"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-8">
              <div className="space-y-8">
                {/* Title Input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-700">Meeting Title</label>
                  <div className="relative group">
                    <Sparkles className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-cyan-500 transition-colors" />
                    <input
                      required
                      type="text"
                      placeholder="e.g., Weekly Sync or Project Kickoff"
                      className="w-full border-b-2 border-slate-100 bg-transparent py-3 pl-8 text-xl font-bold placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none transition-all"
                      value={formData.title}
                      onChange={e => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Agenda / Description</label>
                  <div className="relative">
                    <AlignLeft className="absolute left-0 top-3 h-5 w-5 text-slate-300" />
                    <textarea
                      rows={3}
                      placeholder="What should we cover in this meeting?"
                      className="w-full border-b-2 border-slate-100 bg-transparent py-3 pl-8 text-sm font-medium placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none transition-all resize-none"
                      value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Date and Time */}
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Start Date & Time</label>
                    <div className="relative">
                      <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <input
                        required
                        type="datetime-local"
                        className="w-full border-b-2 border-slate-100 bg-transparent py-3 pl-8 text-sm font-bold focus:border-cyan-500 focus:outline-none transition-all"
                        value={formData.startTime}
                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Duration (min)</label>
                    <div className="relative">
                      <Clock className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                      <select
                        className="w-full border-b-2 border-slate-100 bg-transparent py-3 pl-8 text-sm font-bold focus:border-cyan-500 focus:outline-none transition-all appearance-none cursor-pointer"
                        value={formData.duration}
                        onChange={e => setFormData({ ...formData, duration: e.target.value })}
                      >
                        <option value="15">15 Minutes</option>
                        <option value="30">30 Minutes</option>
                        <option value="60">1 Hour</option>
                        <option value="90">1.5 Hours</option>
                        <option value="120">2 Hours</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Participants (Placeholder for now) */}
                <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 p-6">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Participants</h4>
                      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Internal & External Guests</p>
                    </div>
                    <button type="button" className="ml-auto rounded-xl bg-white px-4 py-2 text-xs font-black text-cyan-600 shadow-sm border border-slate-100 hover:bg-slate-50">
                      INVITE
                    </button>
                  </div>
                  <p className="mt-4 text-[11px] text-slate-400 font-medium italic">
                    You can invite participants by email after the meeting is created in Phase 2.3.
                  </p>
                </div>
              </div>
            </form>

            {/* Footer */}
            <div className="border-t border-slate-100 p-8">
              <button
                type="submit"
                disabled={createMutation.isPending || !formData.title || !formData.startTime}
                onClick={handleSubmit}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 py-4 text-sm font-black uppercase tracking-[0.15em] text-white shadow-xl shadow-indigo-200 transition hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100"
              >
                {createMutation.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>Schedule Session</>
                )}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default CreateMeetingSheet
