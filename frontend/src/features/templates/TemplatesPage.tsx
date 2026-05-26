import React, { useState, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  ArrowLeft,
  Trash2,
  Edit3,
  Layers,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Inbox,
  ChevronRight,
  Code,
  Check,
  X,
  Sparkles
} from 'lucide-react'
import apiClient from '@/lib/apiClient'
import { SummaryTemplate, SummaryTemplatePurpose, TemplateSectionDef } from '@/types/api'

// --- Helper for Purpose Styling ---
const getPurposeStyles = (purpose: SummaryTemplatePurpose, t: any) => {
  switch (purpose) {
    case 'interview':
      return {
        bg: 'bg-emerald-50/80 border-emerald-200 text-emerald-700',
        gradient: 'from-emerald-500 to-teal-600',
        label: t('template.purpose_options.interview')
      }
    case 'report':
      return {
        bg: 'bg-violet-50/80 border-violet-200 text-violet-700',
        gradient: 'from-violet-500 to-purple-600',
        label: t('template.purpose_options.report')
      }
    case 'project_discussion':
      return {
        bg: 'bg-cyan-50/80 border-cyan-200 text-cyan-700',
        gradient: 'from-cyan-500 to-blue-600',
        label: t('template.purpose_options.project_discussion')
      }
    case 'team_meeting':
      return {
        bg: 'bg-amber-50/80 border-amber-200 text-amber-700',
        gradient: 'from-amber-500 to-orange-600',
        label: t('template.purpose_options.team_meeting')
      }
    case 'custom':
    default:
      return {
        bg: 'bg-slate-50/80 border-slate-200 text-slate-700',
        gradient: 'from-slate-500 to-slate-700',
        label: t('template.purpose_options.custom')
      }
  }
}

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  
  // Page States
  const [view, setView] = useState<'list' | 'details' | 'form'>('list')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null)
  const [formMode, setFormMode] = useState<'new' | 'edit'>('new')
  
  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPurpose, setSelectedPurpose] = useState<string>('all')
  const [isSearchVisible, setIsSearchVisible] = useState(false)
  
  // Form State
  const [formName, setFormName] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formPurpose, setFormPurpose] = useState<SummaryTemplatePurpose>(SummaryTemplatePurpose.CUSTOM)
  const [formSections, setFormSections] = useState<TemplateSectionDef[]>([])
  
  // Inline Section Builder State
  const [newSecName, setNewSecName] = useState('')
  const [newSecLabel, setNewSecLabel] = useState('')
  const [newSecDesc, setNewSecDesc] = useState('')
  const [secBuilderError, setSecBuilderError] = useState<string | null>(null)
  
  // Notification Banner State
  const [banner, setBanner] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Trigger banner utility
  const triggerBanner = (type: 'success' | 'error', message: string) => {
    setBanner({ type, message })
    setTimeout(() => setBanner(null), 4000)
  }

  // --- API Queries & Mutations ---
  const { data: templates = [], isLoading, isError, refetch } = useQuery<SummaryTemplate[]>({
    queryKey: ['summary-templates'],
    queryFn: async () => {
      const res = await apiClient.get('/summary-templates')
      return res.data
    }
  })

  const createMutation = useMutation({
    mutationFn: async (newTemplate: Partial<SummaryTemplate>) => {
      const res = await apiClient.post('/summary-templates', newTemplate)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary-templates'] })
      triggerBanner('success', t('template.creation_success'))
      setView('list')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message
      triggerBanner('error', errMsg)
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SummaryTemplate> }) => {
      const res = await apiClient.patch(`/summary-templates/${id}`, data)
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary-templates'] })
      triggerBanner('success', t('template.update_success'))
      setView('list')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message
      triggerBanner('error', errMsg)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.delete(`/summary-templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['summary-templates'] })
      triggerBanner('success', t('template.deletion_success'))
      setView('list')
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message
      triggerBanner('error', errMsg)
    }
  })

  // --- Handlers ---
  const handleOpenDetails = (id: string) => {
    setSelectedTemplateId(id)
    setView('details')
  }

  const handleOpenCreateForm = () => {
    setFormMode('new')
    setFormName('')
    setFormDesc('')
    setFormPurpose(SummaryTemplatePurpose.CUSTOM)
    setFormSections([])
    setNewSecName('')
    setNewSecLabel('')
    setNewSecDesc('')
    setSecBuilderError(null)
    setView('form')
  }

  const handleOpenEditForm = (template: SummaryTemplate) => {
    setFormMode('edit')
    setSelectedTemplateId(template.id)
    setFormName(template.name)
    setFormDesc(template.description || '')
    setFormPurpose(template.purpose)
    setFormSections([...template.sections].sort((a, b) => a.order - b.order))
    setNewSecName('')
    setNewSecLabel('')
    setNewSecDesc('')
    setSecBuilderError(null)
    setView('form')
  }

  const handleAddSection = () => {
    setSecBuilderError(null)
    const machineKey = newSecName.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_')
    
    if (!machineKey) {
      setSecBuilderError('Section Code (Machine Key) is required')
      return
    }
    if (!newSecLabel.trim()) {
      setSecBuilderError('Display Label is required')
      return
    }
    if (formSections.some(sec => sec.name === machineKey)) {
      setSecBuilderError('A section with this machine key already exists')
      return
    }

    const newSection: TemplateSectionDef = {
      name: machineKey,
      label: newSecLabel.trim(),
      description: newSecDesc.trim() || undefined,
      order: formSections.length + 1
    }

    setFormSections([...formSections, newSection])
    setNewSecName('')
    setNewSecLabel('')
    setNewSecDesc('')
  }

  const handleRemoveSection = (name: string) => {
    const updated = formSections
      .filter(sec => sec.name !== name)
      .map((sec, idx) => ({ ...sec, order: idx + 1 }))
    setFormSections(updated)
  }

  const handleSaveTemplate = () => {
    if (!formName.trim()) {
      triggerBanner('error', 'Template Name is required')
      return
    }
    if (formSections.length === 0) {
      triggerBanner('error', 'At least one summary section is required')
      return
    }

    const payload = {
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      purpose: formPurpose,
      sections: formSections
    }

    if (formMode === 'new') {
      createMutation.mutate(payload)
    } else if (selectedTemplateId) {
      updateMutation.mutate({ id: selectedTemplateId, data: payload })
    }
  }

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm(t('template.delete_confirm'))) {
      deleteMutation.mutate(id)
    }
  }

  // --- Filters ---
  const filteredTemplates = useMemo(() => {
    return templates.filter(template => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description && template.description.toLowerCase().includes(searchQuery.toLowerCase()))
      
      const matchesPurpose =
        selectedPurpose === 'all' || template.purpose === selectedPurpose
        
      return matchesSearch && matchesPurpose
    })
  }, [templates, searchQuery, selectedPurpose])

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null
    return templates.find(t => t.id === selectedTemplateId) || null
  }, [templates, selectedTemplateId])

  return (
    <div className="space-y-6">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {banner && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className={`fixed left-1/2 top-6 z-50 flex -translate-x-1/2 items-center gap-3 rounded-2xl border px-6 py-3.5 shadow-2xl backdrop-blur-xl transition-all ${
              banner.type === 'success'
                ? 'border-emerald-200 bg-emerald-50/95 text-emerald-800'
                : 'border-rose-200 bg-rose-50/95 text-rose-800'
            }`}
          >
            {banner.type === 'success' ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <p className="text-sm font-bold">{banner.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW: LIST */}
      {view === 'list' && (
        <div className="space-y-6">
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
                  {t('dashboard.template_list_title_prefix')}{' '}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                    {t('dashboard.template_list_title_highlight')}
                  </span>
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base">
                  {t('dashboard.template_list_subtitle')}
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

                {/* Purpose Filter select */}
                <div className="relative">
                  <select
                    value={selectedPurpose}
                    onChange={(e) => setSelectedPurpose(e.target.value)}
                    className="h-12 rounded-2xl border border-slate-200 bg-white px-4 pr-10 text-sm font-black text-slate-600 shadow-sm outline-none transition hover:bg-slate-50 cursor-pointer appearance-none"
                  >
                    <option value="all">📁 Tất cả danh mục</option>
                    <option value="interview">🎤 {t('template.purpose_options.interview')}</option>
                    <option value="report">📊 {t('template.purpose_options.report')}</option>
                    <option value="project_discussion">💻 {t('template.purpose_options.project_discussion')}</option>
                    <option value="team_meeting">👥 {t('template.purpose_options.team_meeting')}</option>
                    <option value="custom">⚙️ {t('template.purpose_options.custom')}</option>
                  </select>
                  <div className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                </div>

                <button
                  onClick={handleOpenCreateForm}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
                >
                  <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                  <span>{t('dashboard.new_template')}</span>
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
                        placeholder={t('template.search_placeholder')}
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

          {/* Grid View */}
          {isLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-white/50 bg-white/50 py-20 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
              <p className="mt-4 font-bold text-slate-900">Đang tải danh sách mẫu cuộc họp...</p>
            </div>
          ) : isError ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/50 py-20 backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Không thể kết nối máy chủ</h3>
              <button
                onClick={() => refetch()}
                className="mt-6 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
              >
                {t('meeting.retry')}
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white/50 py-20 backdrop-blur-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                <Inbox className="h-10 w-10" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                {searchQuery ? t('template.no_matches') : t('template.empty_hub')}
              </h3>
              <p className="mt-2 text-center text-sm text-slate-500 max-w-xs">
                {searchQuery
                  ? `Không tìm thấy kết quả nào khớp với "${searchQuery}"`
                  : t('template.empty_hub_desc')}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredTemplates.map((tpl, index) => {
                  const styles = getPurposeStyles(tpl.purpose, t)
                  return (
                    <motion.div
                      key={tpl.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2, delay: index * 0.03 }}
                      whileHover={{ y: -4 }}
                      onClick={() => handleOpenDetails(tpl.id)}
                      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-3xl border border-white/50 bg-white/80 p-5 shadow-lg backdrop-blur-sm transition-all hover:bg-white hover:shadow-xl sm:p-6"
                    >
                      {/* Gradient border accent */}
                      <div className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${styles.gradient}`} />

                      <div className="relative flex h-full flex-col justify-between gap-4 pt-2">
                        {/* Header: Title & Badges */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${styles.bg}`}>
                              {styles.label}
                            </span>
                            
                            <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              tpl.isSystem 
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' 
                                : 'bg-slate-100 text-slate-700 border border-slate-200'
                            }`}>
                              {tpl.isSystem ? t('template.is_system') : t('template.is_custom')}
                            </span>
                          </div>

                          <h3 className="line-clamp-1 text-lg font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                            {tpl.name}
                          </h3>
                        </div>

                        {/* Description */}
                        <div className="flex-1">
                          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                            {tpl.description || 'Không có mô tả cho mẫu này.'}
                          </p>
                        </div>

                        {/* Footer: Sections Count */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-4">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-400">
                            <Layers className="h-4 w-4 text-slate-400" />
                            <span>{tpl.sections?.length || 0} mục tóm tắt</span>
                          </div>
                          
                          <motion.div
                            whileHover={{ x: 3 }}
                            className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-50 text-slate-400 group-hover:bg-cyan-600 group-hover:text-white transition-all shadow-sm shadow-slate-100"
                          >
                            <ChevronRight className="h-4 w-4" />
                          </motion.div>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* VIEW: DETAILS */}
      {view === 'details' && selectedTemplate && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="space-y-6"
        >
          {/* Back button */}
          <button
            onClick={() => setView('list')}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-all active:scale-95"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại danh sách</span>
          </button>

          {/* Premium Header card */}
          <div className="relative overflow-hidden rounded-3xl border border-white/50 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
            <div className={`absolute top-0 inset-x-0 h-2 bg-gradient-to-r ${getPurposeStyles(selectedTemplate.purpose, t).gradient}`} />

            <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between pt-2">
              <div className="space-y-3 max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${getPurposeStyles(selectedTemplate.purpose, t).bg}`}>
                    {getPurposeStyles(selectedTemplate.purpose, t).label}
                  </span>
                  
                  <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-bold ${
                    selectedTemplate.isSystem 
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                      : 'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {selectedTemplate.isSystem ? 'Mẫu hệ thống' : 'Mẫu cá nhân'}
                  </span>
                </div>

                <h2 className="text-2xl font-black text-slate-900 sm:text-3xl">
                  {selectedTemplate.name}
                </h2>
                
                <p className="text-sm font-medium text-slate-500 leading-relaxed sm:text-base">
                  {selectedTemplate.description || 'Không có mô tả cho mẫu này.'}
                </p>
              </div>

              {/* Actions */}
              {!selectedTemplate.isSystem && (
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => handleOpenEditForm(selectedTemplate)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-800"
                  >
                    <Edit3 className="h-4 w-4" />
                    <span>Sửa mẫu</span>
                  </button>

                  <button
                    onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                    className="flex h-11 items-center gap-2 rounded-xl border border-rose-100 bg-rose-50 px-4 text-sm font-bold text-rose-600 shadow-sm transition hover:bg-rose-100/50 hover:text-rose-700"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Xóa mẫu</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Sections List */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
              <Layers className="h-5 w-5 text-cyan-600" />
              <span>Các phần nội dung cần tóm tắt ({selectedTemplate.sections?.length || 0})</span>
            </h3>

            <div className="grid gap-4">
              {[...selectedTemplate.sections]
                .sort((a, b) => a.order - b.order)
                .map((sec) => (
                  <motion.div
                    key={sec.name}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row sm:items-start gap-4 rounded-2xl border border-white/50 bg-white/60 p-5 shadow-md backdrop-blur-sm"
                  >
                    {/* Vertical line accent & Order index */}
                    <div className="flex items-center gap-3 sm:flex-col sm:items-center">
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 font-black text-xs text-cyan-700 ring-2 ring-cyan-100">
                        {sec.order}
                      </div>
                      <div className="hidden sm:block h-8 w-0.5 bg-slate-100" />
                    </div>

                    <div className="flex-1 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-3">
                        <h4 className="text-base font-bold text-slate-800">
                          {sec.label}
                        </h4>
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-mono font-semibold text-slate-500 border border-slate-200">
                          <Code className="h-3 w-3" />
                          {sec.name}
                        </span>
                      </div>
                      
                      <p className="text-sm font-medium text-slate-500">
                        {sec.description || 'Không có hướng dẫn chi tiết.'}
                      </p>
                    </div>
                  </motion.div>
                ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* VIEW: FORM (NEW & EDIT) */}
      {view === 'form' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 max-w-4xl mx-auto"
        >
          {/* Form Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setView(formMode === 'edit' ? 'details' : 'list')}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition shadow-sm active:scale-95"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  {formMode === 'new' ? 'Tạo Mẫu Tóm Tắt Mới' : 'Cập Nhật Mẫu Tóm Tắt'}
                </h2>
                <p className="text-xs font-medium text-slate-500">
                  Thiết kế cấu trúc để AI tự động phân tích dữ liệu cuộc họp.
                </p>
              </div>
            </div>

            <button
              onClick={handleSaveTemplate}
              className="flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-sm font-bold text-white shadow-lg shadow-cyan-100 transition hover:bg-cyan-700 active:scale-95"
            >
              <Check className="h-4 w-4" />
              <span>{t('template.save')}</span>
            </button>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {/* Left Inputs Card */}
            <div className="md:col-span-1 space-y-4">
              <div className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Thông tin mẫu
                </h3>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">{t('template.name')}</label>
                  <input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="v.d. Mẫu họp kỹ thuật"
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">{t('template.description')}</label>
                  <textarea
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="Mẫu này dùng để tóm tắt các cuộc họp..."
                    rows={3}
                    className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-slate-700">{t('template.purpose')}</label>
                  <select
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value as SummaryTemplatePurpose)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none transition cursor-pointer"
                  >
                    <option value="interview">🎤 {t('template.purpose_options.interview')}</option>
                    <option value="report">📊 {t('template.purpose_options.report')}</option>
                    <option value="project_discussion">💻 {t('template.purpose_options.project_discussion')}</option>
                    <option value="team_meeting">👥 {t('template.purpose_options.team_meeting')}</option>
                    <option value="custom">⚙️ {t('template.purpose_options.custom')}</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Right Sections Builder Card */}
            <div className="md:col-span-2 space-y-6">
              {/* Sections list display */}
              <div className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-sm space-y-4">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider">
                  Cấu trúc các mục tóm tắt ({formSections.length})
                </h3>

                {formSections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                    <Layers className="h-8 w-8 stroke-1" />
                    <p className="mt-2 text-xs font-bold">Chưa có phần nào được định nghĩa.</p>
                    <p className="text-[10px] text-slate-400">Vui lòng sử dụng biểu mẫu phía dưới để thêm mới.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formSections.map((sec) => (
                      <div
                        key={sec.name}
                        className="flex items-center justify-between gap-4 rounded-xl border border-slate-100 bg-white/50 p-3 shadow-sm"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-[10px] font-black text-cyan-700">
                            {sec.order}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-bold text-slate-800">{sec.label}</p>
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500">
                                {sec.name}
                              </span>
                            </div>
                            {sec.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {sec.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <button
                          onClick={() => handleRemoveSection(sec.name)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add New Section subform */}
              <div className="rounded-2xl border border-white/50 bg-white/70 p-5 shadow-lg backdrop-blur-sm space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-600" />
                  <h3 className="text-sm font-black text-slate-800">Định nghĩa mục tóm tắt mới</h3>
                </div>

                {secBuilderError && (
                  <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100">
                    <AlertCircle className="h-4 w-4" />
                    <span>{secBuilderError}</span>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600">Tên hiển thị (v.d. Quyết định chính)</label>
                    <input
                      type="text"
                      value={newSecLabel}
                      onChange={(e) => {
                        setNewSecLabel(e.target.value)
                        // Auto populate machine key if empty
                        if (!newSecName) {
                          setNewSecName(
                            e.target.value
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, '_')
                              .replace(/_+/g, '_')
                              .substring(0, 30)
                          )
                        }
                      }}
                      placeholder="Các quyết định đã thống nhất"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-black text-slate-600 flex items-center gap-1">
                      <span>Mã phần (Machine Key)</span>
                      <span className="font-mono text-[9px] text-slate-400">(chỉ chữ thường & gạch dưới)</span>
                    </label>
                    <input
                      type="text"
                      value={newSecName}
                      onChange={(e) => setNewSecName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_'))}
                      placeholder="key_decisions"
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-mono font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-black text-slate-600">Mô tả / Hướng dẫn phân tích cho AI</label>
                  <input
                    type="text"
                    value={newSecDesc}
                    onChange={(e) => setNewSecDesc(e.target.value)}
                    placeholder="v.d. Liệt kê toàn bộ các quyết định chính được chốt bởi ban quản trị..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleAddSection}
                    className="flex h-9 items-center gap-2 rounded-xl bg-slate-900 px-4 text-xs font-bold text-white shadow-md shadow-slate-200 transition hover:bg-slate-800 active:scale-95"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Thêm mục này</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  )
}

export default TemplatesPage
