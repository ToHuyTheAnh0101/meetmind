import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Video, ArrowRight, Trash2, Copy, Check, Loader2 } from "lucide-react";

interface MeetingControlCenterProps {
  id: string | undefined;
  isNew: boolean;
  canEdit: boolean;
  isInstant: boolean;
  isDirty: boolean;
  theme: any;
  mutation: any;
  formData: any;
  copied: boolean;
  handleCopyLink: () => void;
  setShowDeleteConfirm: (val: boolean) => void;
  isCompleted?: boolean;
  canDelete?: boolean;
}

export const MeetingControlCenter: React.FC<MeetingControlCenterProps> = ({
  id,
  isNew,
  canEdit,
  isInstant,
  isDirty,
  theme,
  mutation,
  formData,
  copied,
  handleCopyLink,
  setShowDeleteConfirm,
  isCompleted = false,
  canDelete = false,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="rounded-[2.5rem] border border-white/80 bg-white/70 p-8 shadow-2xl backdrop-blur-xl"
    >
      <h3
        className={`text-lg font-black mb-8 flex items-center gap-3 transition-colors duration-1000 ${theme.colors.primary}`}
      >
        <div
          className={`h-1.5 w-1.5 rounded-full animate-pulse ${theme.colors.primary.replace(
            "text-",
            "bg-"
          )}`}
        />
        {t("meeting.control_center")}
      </h3>

      <div className="space-y-4">
        {!isNew && (
          <button
            disabled={isCompleted}
            onClick={() => {
              if (!isCompleted) {
                navigate(`/room/${id}`);
              }
            }}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl py-4 text-sm font-black shadow-xl transition group ${
              isCompleted
                ? "bg-slate-100 text-slate-500 border border-slate-200 cursor-not-allowed shadow-none hover:scale-100 active:scale-100"
                : "bg-slate-900 text-white hover:scale-[1.05] active:scale-95"
            }`}
          >
            <Video className={`h-5 w-5 ${isCompleted ? "text-slate-400" : "transition-transform group-hover:rotate-12"}`} />
            {isCompleted ? t("meeting.status.completed") : t("meeting.join_workspace")}
          </button>
        )}

        {canEdit && (
          <button
            disabled={
              mutation.isPending ||
              !formData.title ||
              (!formData.startTime && !isInstant)
            }
            onClick={() => mutation.mutate(formData)}
            className={`flex w-full items-center justify-center gap-3 rounded-2xl bg-gradient-to-br transition-all duration-500 py-4 text-sm font-black text-white shadow-xl hover:scale-[1.05] active:scale-95 disabled:opacity-50 disabled:grayscale disabled:hover:scale-100 ${theme.colors.textGradient
              .replace("from-", "from-")
              .replace("to-", "to-")} ${
              isDirty
                ? "animate-pulse shadow-[0_0_20px_rgba(34,211,238,0.4)]"
                : theme.period === "morning"
                ? "shadow-cyan-100"
                : theme.period === "afternoon"
                ? "shadow-orange-100"
                : "shadow-indigo-100"
            }`}
          >
            {mutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                {isNew
                  ? isInstant
                    ? t("meeting.launch_now")
                    : t("meeting.schedule_session")
                  : t("meeting.save_changes")}
                {isDirty && !isNew && (
                  <div className="h-2 w-2 rounded-full bg-white animate-bounce" />
                )}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        )}

        {!isNew && (
          <div className="pt-6 mt-4 border-t border-slate-100 space-y-4">
            <div className="flex items-center gap-3 bg-slate-50/50 border border-slate-200 rounded-2xl p-3 pl-4">
              <div className="flex-1 truncate">
                <p className="text-sm font-bold text-slate-400">
                  {t("meeting.invite_link")}
                </p>
                <p className="text-sm font-bold text-slate-600 truncate">
                  {window.location.origin}/room/{id}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="h-10 w-10 flex items-center justify-center rounded-xl bg-white shadow-sm text-cyan-600 transition hover:bg-cyan-50 active:scale-95"
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </button>
            </div>

            {canDelete && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex w-full items-center justify-center gap-2 pt-2 text-sm font-bold text-rose-400 hover:text-rose-600 transition"
              >
                <Trash2 className="h-4 w-4" />
                {t("meeting.destroy_workspace")}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
