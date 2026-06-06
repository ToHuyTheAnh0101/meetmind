import React from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlignLeft,
  Calendar,
  Loader2,
  AlertCircle,
  Lock,
  Eye,
  EyeOff,
  Video,
  Shield,
  Users,
  MicOff,
  User,
  Bell,
  Sparkles,
  Paperclip,
} from "lucide-react";
import { MeetingAccessType } from "@/types/api";
import SettingToggle from "./SettingToggle";
import EmailTagInput from "./EmailTagInput";
import { AttachmentManager } from "./AttachmentManager";

interface MeetingGeneralFormProps {
  meetingId?: string;
  formData: {
    title: string;
    description: string;
    startTime: string;
    accessType: MeetingAccessType;
    waitingRoomEnabled: boolean;
    muteOnJoin: boolean;
    allowDisplayNameEdit: boolean;
    inviteeEmails: string[];
    reminderMinutes: number;
    password: string;
    templateId: string;
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      description: string;
      startTime: string;
      accessType: MeetingAccessType;
      waitingRoomEnabled: boolean;
      muteOnJoin: boolean;
      allowDisplayNameEdit: boolean;
      inviteeEmails: string[];
      reminderMinutes: number;
      password: string;
      templateId: string;
    }>
  >;
  canEdit: boolean;
  isNew: boolean;
  isInstant: boolean;
  setIsInstant: (val: boolean) => void;
  previewDefaultTitle: string | null;
  conflictContext: any;
  isCheckingConflict: boolean;
  templates: any[];
  isVi: boolean;
  showPassword: boolean;
  setShowPassword: (val: boolean) => void;
}

export const MeetingGeneralForm: React.FC<MeetingGeneralFormProps> = ({
  meetingId,
  formData,
  setFormData,
  canEdit,
  isNew,
  isInstant,
  setIsInstant,
  previewDefaultTitle,
  conflictContext,
  isCheckingConflict,
  templates,
  isVi,
  showPassword,
  setShowPassword,
}) => {
  const { t } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-[2.5rem] border border-white/80 bg-white/70 p-6 shadow-2xl backdrop-blur-xl sm:p-10"
    >
      {/* 1. SESSION SECTION */}
      <section className="space-y-6 pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-black text-slate-900 leading-tight tracking-tight">
              {t("meeting.session_info")}
            </h2>
            <p className="text-sm font-bold text-slate-500 mt-1">
              {t("meeting.session_info_subtitle")}
            </p>
          </div>
          {isNew && (
            <div className="flex p-1 rounded-xl bg-slate-100/80 border border-slate-200">
              <button
                onClick={() => {
                  setIsInstant(false);
                  if (!formData.startTime) {
                    const nextHour = new Date();
                    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                    const localISO = new Date(
                      nextHour.getTime() - nextHour.getTimezoneOffset() * 60000
                    )
                      .toISOString()
                      .slice(0, 16);
                    setFormData((prev) => ({ ...prev, startTime: localISO }));
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${
                  !isInstant
                    ? "bg-white shadow-sm text-indigo-600 border border-indigo-100"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t("meeting.schedule_session")}
              </button>
              <button
                onClick={() => setIsInstant(true)}
                className={`px-4 py-2 rounded-lg text-sm font-black transition-all ${
                  isInstant
                    ? "bg-white shadow-sm text-indigo-600 border border-indigo-100"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {t("dashboard.instant_meeting")}
              </button>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <label className="text-[14px] font-bold text-slate-500">
              {t("meeting.title")}
            </label>
            <input
              type="text"
              placeholder={t("meeting.title_example")}
              disabled={!canEdit}
              className={`w-full border-b-2 border-slate-200 bg-transparent py-2 text-xl font-black placeholder:text-slate-300 focus:outline-none transition-all focus:border-indigo-500 ${
                !canEdit ? "cursor-default" : ""
              }`}
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />

            {/* Default Title Preview */}
            {!formData.title && previewDefaultTitle && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-2 flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-r from-cyan-50 to-indigo-50 border border-cyan-100"
              >
                <div className="flex-1">
                  <p className="text-xs font-bold text-slate-400 mb-1">
                    {t("meeting.default_title_preview")}
                  </p>
                  <p className="text-sm font-bold text-cyan-700 italic">
                    {previewDefaultTitle}
                  </p>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, title: previewDefaultTitle })
                    }
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white text-cyan-600 hover:bg-cyan-50 font-bold text-xs transition-all whitespace-nowrap shadow-sm border border-cyan-100"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {isVi ? "Sử Dụng" : "Use"}
                  </button>
                )}
              </motion.div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[14px] font-bold text-slate-500">
              {t("meeting.description_agenda")}
            </label>
            <div className="relative">
              <AlignLeft className="absolute left-0 top-4 h-5 w-5 text-slate-300" />
              <textarea
                rows={4}
                placeholder={t("meeting.description_placeholder")}
                readOnly={!canEdit}
                className={`w-full border-b-2 border-slate-200 bg-transparent py-2 pl-10 text-base font-medium placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none transition-all resize-none ${
                  !canEdit ? "cursor-default" : ""
                }`}
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
          </div>

          {!isInstant && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="space-y-2"
            >
              <label className="text-[14px] font-bold text-slate-500">
                {t("meeting.start_time")}
              </label>
              <div className="relative">
                <Calendar className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                <input
                  type="datetime-local"
                  disabled={!canEdit}
                  min={new Date().toISOString().slice(0, 16)}
                  className={`w-full border-b-2 border-slate-200 bg-transparent py-2 pl-10 text-base font-medium focus:border-cyan-500 focus:outline-none transition-all ${
                    !canEdit ? "cursor-default" : ""
                  }`}
                  value={formData.startTime}
                  onChange={(e) =>
                    setFormData({ ...formData, startTime: e.target.value })
                  }
                />
              </div>

              {/* Timeline Conflict Context Preview */}
              <AnimatePresence>
                {isNew && (conflictContext || isCheckingConflict) && !isInstant && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-4 overflow-hidden rounded-2xl bg-slate-50/50 border border-slate-100 p-4"
                  >
                    {isCheckingConflict ? (
                      <div className="flex items-center justify-center py-2 gap-2 text-xs font-bold text-slate-400">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        <span>{t("meeting.checking_schedule")}</span>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-3">
                        {/* Conflict Warning */}
                        {conflictContext?.conflict && (
                          <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-2 rounded-xl border border-rose-100 animate-pulse">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span className="text-[11px] font-black tracking-tight">
                              {t("meeting.conflict_with", {
                                title: conflictContext.conflict.title,
                              })}
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between relative px-2">
                          {/* Dashed Connector Line */}
                          <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-slate-200 z-0" />

                          {/* Prev */}
                          <div className="relative z-10 bg-white shadow-sm border border-slate-100 p-2 rounded-xl text-center flex-1 max-w-[150px] min-h-[60px] flex flex-col justify-center">
                            <p className="text-[12px] font-black text-slate-400 leading-tight mb-1">
                              {t("meeting.timeline_before")}
                            </p>
                            <p className="text-sm font-black text-slate-600 truncate">
                              {conflictContext?.before
                                ? new Date(
                                    conflictContext.before.startTime
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "--:--"}
                            </p>
                          </div>

                          {/* Selected */}
                          <div
                            className={`relative z-10 p-2 rounded-xl text-center min-w-[120px] min-h-[60px] flex flex-col justify-center shadow-lg mx-2 ${
                              conflictContext?.conflict
                                ? "bg-rose-500 text-white"
                                : "bg-cyan-500 text-white"
                            }`}
                          >
                            <p className="text-[12px] font-black opacity-70 leading-tight mb-1">
                              {t("meeting.timeline_selected")}
                            </p>
                            <p className="text-sm font-black">
                              {new Date(
                                formData.startTime
                              ).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>

                          {/* Next */}
                          <div className="relative z-10 bg-white shadow-sm border border-slate-100 p-2 rounded-xl text-center flex-1 max-w-[150px] min-h-[60px] flex flex-col justify-center">
                            <p className="text-[12px] font-black text-slate-400 leading-tight mb-1">
                              {t("meeting.timeline_after")}
                            </p>
                            <p className="text-sm font-black text-slate-600 truncate">
                              {conflictContext?.after
                                ? new Date(
                                    conflictContext.after.startTime
                                  ).toLocaleTimeString([], {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "--:--"}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </section>

      {canEdit && (
        <>
          {/* 2. PRIVACY & PARTICIPANTS SECTION */}
          <section className="pt-10 space-y-8 border-t border-slate-100">
            <div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">
                {t("meeting.privacy_members")}
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-1">
                {t("meeting.access_control_desc")}
              </p>
            </div>

            {/* Password Protection */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-slate-400" />
                <label className="text-sm font-bold text-cyan-700">
                  {t("meeting.password_optional")}
                </label>
              </div>
              <div className="relative group">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={t("meeting.set_password")}
                  className="w-full h-11 pl-4 pr-12 rounded-xl bg-white/50 border border-slate-200 focus:bg-white focus:border-cyan-500 focus:outline-none transition-all text-sm font-bold text-slate-900 shadow-inner"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg hover:bg-slate-100/50 text-slate-400 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs font-medium text-slate-600 leading-tight">
                {t("meeting.leave_empty_password")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <label className="text-sm font-bold text-slate-500">
                  {t("meeting.access_mode")}
                </label>
                <div className="grid grid-cols-1 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, accessType: "public" })
                    }
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      formData.accessType === "public"
                        ? "bg-cyan-50 border-cyan-500 shadow-md shadow-cyan-100"
                        : "bg-white opacity-60 border-slate-200 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        formData.accessType === "public"
                          ? "bg-cyan-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Video className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black text-slate-900">
                        {t("meeting.anytime_link")}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500">
                        {t("meeting.public")}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, accessType: "invite_only" })
                    }
                    className={`p-4 rounded-xl border-2 transition-all flex items-center gap-4 ${
                      formData.accessType === "invite_only"
                        ? "bg-indigo-50 border-indigo-500 shadow-md shadow-indigo-100"
                        : "bg-white opacity-60 border-slate-200 hover:opacity-100"
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg ${
                        formData.accessType === "invite_only"
                          ? "bg-indigo-600 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black text-slate-900">
                        {t("meeting.guest_list_only")}
                      </h4>
                      <p className="text-[11px] font-bold text-slate-500">
                        {t("meeting.strict")}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-slate-500">
                    {t("meeting.guest_invitations")}
                  </label>
                  <p className="text-xs font-semibold text-slate-400 leading-tight">
                    {t("meeting.guest_invitations_desc")}
                  </p>
                </div>
                <EmailTagInput
                  emails={formData.inviteeEmails}
                  onChange={(emails) =>
                    setFormData({ ...formData, inviteeEmails: emails })
                  }
                />
              </div>
            </div>

            <SettingToggle
              label={t("meeting.enable_waiting_room")}
              description={t("meeting.waiting_room_desc")}
              enabled={formData.waitingRoomEnabled}
              onChange={(val) =>
                setFormData({ ...formData, waitingRoomEnabled: val })
              }
              icon={<Users className="h-4 w-4" />}
            />
          </section>

          {/* 3. SETTINGS & INTERACTION SECTION */}
          <section className="space-y-8 pt-10 border-t border-slate-100">
            <div>
              <h2 className="text-3xl font-black text-slate-900 leading-tight">
                {t("meeting.preferences")}
              </h2>
              <p className="text-sm font-bold text-slate-500 mt-1">
                {t("meeting.notify_before")}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-2xl bg-white/40 border border-slate-200 flex items-center justify-between">
                <SettingToggle
                  label={t("meeting.mute_on_entry")}
                  description={t("meeting.mute_on_entry_desc")}
                  enabled={formData.muteOnJoin}
                  onChange={(val) =>
                    setFormData({ ...formData, muteOnJoin: val })
                  }
                  icon={<MicOff className="h-4 w-4" />}
                  noBorder
                  className="w-full py-0"
                />
              </div>

              <div className="p-4 rounded-2xl bg-white/40 border border-slate-200 flex items-center justify-between">
                <SettingToggle
                  label={t("meeting.allow_display_name_edit")}
                  description={t("meeting.allow_display_name_edit_desc")}
                  enabled={formData.allowDisplayNameEdit}
                  onChange={(val) =>
                    setFormData({ ...formData, allowDisplayNameEdit: val })
                  }
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
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">
                      {t("meeting.reminders")}
                    </h4>
                    <p className="text-xs font-medium text-slate-500 leading-tight mt-1">
                      {t("meeting.notify_before")}
                    </p>
                  </div>
                </div>
                <select
                  value={formData.reminderMinutes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      reminderMinutes: parseInt(e.target.value),
                    })
                  }
                  className="w-28 bg-white/80 backdrop-blur-sm px-3 py-2 rounded-xl text-xs font-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all cursor-pointer hover:bg-white ml-8"
                >
                  <option value="0">{t("meeting.none")}</option>
                  <option value="5">5m</option>
                  <option value="15">15m</option>
                  <option value="30">30m</option>
                  <option value="60">1h</option>
                </select>
              </div>

              <div className="p-5 rounded-2xl bg-white/40 border border-slate-200 flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900 tracking-tight">
                      Mẫu tóm tắt AI
                    </h4>
                    <p className="text-xs font-medium text-slate-500 leading-tight mt-1">
                      Chọn mẫu cấu trúc tóm tắt cuộc họp
                    </p>
                  </div>
                </div>
                <select
                  value={formData.templateId}
                  onChange={(e) =>
                    setFormData({ ...formData, templateId: e.target.value })
                  }
                  className="w-full bg-white/80 backdrop-blur-sm px-4 py-3 rounded-xl text-xs font-black border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/5 transition-all cursor-pointer hover:bg-white"
                >
                  <option value="">-- Mẫu mặc định (Standard) --</option>
                  {templates.map((t: any) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </section>
        </>
      )}

      {/* 4. ATTACHMENTS & RESOURCES */}
      <section className="pt-10 space-y-8 border-t border-slate-100">
        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight mb-2">
            {t("meeting.attachments") || "Tài liệu đính kèm"}
          </h3>
          <p className="text-xs font-bold text-slate-500 mb-6">
            {isVi 
              ? "Tải lên và quản lý các tài liệu, tệp đính kèm chia sẻ trong cuộc họp"
              : "Upload and manage documents and shared files for this meeting"}
          </p>
          {meetingId ? (
            <AttachmentManager meetingId={meetingId} canUpload={canEdit} />
          ) : (
            <div className="relative group p-8 rounded-3xl border-2 border-dashed border-slate-200 transition-all text-center bg-slate-50/50">
              <div className="mx-auto h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mb-4 border border-slate-100">
                <Paperclip className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-black text-slate-800">
                {isVi ? "Vui lòng lưu cuộc họp trước" : "Please save the meeting first"}
              </h4>
              <p className="text-xs font-bold text-slate-400 mt-1 leading-relaxed max-w-[280px] mx-auto">
                {isVi 
                  ? "Bạn chỉ có thể tải lên tài liệu đính kèm sau khi cuộc họp đã được tạo và lưu thành công."
                  : "You can only upload attachments after the meeting has been created and successfully saved."}
              </p>
            </div>
          )}
        </div>
      </section>
    </motion.div>
  );
};
