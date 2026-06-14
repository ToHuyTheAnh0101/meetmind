import React, { useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { 
  Paperclip, 
  File, 
  FileText, 
  Image as ImageIcon, 
  Video as VideoIcon, 
  Music, 
  Archive, 
  Trash2, 
  Download, 
  UploadCloud, 
  Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import apiClient from "@/lib/apiClient";
import { showSuccessToast, showErrorToast } from "@/lib/toastUtils";

export interface Attachment {
  id: string;
  meetingId: string;
  uploadedByUserId: string;
  type: 'document' | 'audio' | 'link' | 'video' | 'image' | 'other';
  fileName: string;
  fileUrl: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

interface AttachmentManagerProps {
  meetingId: string;
  canUpload: boolean;
  isInRoom?: boolean;
}

// Utility to format bytes to human readable format
const formatBytes = (bytes?: number) => {
  if (!bytes) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

// Map file types to corresponding Lucide icons and colors
const getFileIconAndColor = (type: string, mime?: string) => {
  const mimeStr = mime?.toLowerCase() || "";
  if (type === "image" || mimeStr.startsWith("image/")) {
    return { icon: ImageIcon, color: "text-teal-400 bg-teal-500/10 border-teal-500/20" };
  }
  if (type === "video" || mimeStr.startsWith("video/")) {
    return { icon: VideoIcon, color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
  }
  if (type === "audio" || mimeStr.startsWith("audio/")) {
    return { icon: Music, color: "text-violet-400 bg-violet-500/10 border-violet-500/20" };
  }
  if (
    mimeStr.includes("zip") || 
    mimeStr.includes("rar") || 
    mimeStr.includes("tar") || 
    mimeStr.includes("gzip") || 
    mimeStr.includes("compressed")
  ) {
    return { icon: Archive, color: "text-amber-400 bg-amber-500/10 border-amber-500/20" };
  }
  if (
    type === "document" || 
    mimeStr.includes("pdf") || 
    mimeStr.includes("word") || 
    mimeStr.includes("excel") || 
    mimeStr.includes("powerpoint") || 
    mimeStr.includes("office") ||
    mimeStr.startsWith("text/")
  ) {
    return { icon: FileText, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" };
  }
  return { icon: File, color: "text-slate-400 bg-slate-500/10 border-slate-500/20" };
};

export const AttachmentManager: React.FC<AttachmentManagerProps> = ({
  meetingId,
  canUpload,
  isInRoom = false,
}) => {
  const { t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // 1. Fetch attachments
  const { data: attachments = [], refetch, isLoading } = useQuery<Attachment[]>({
    queryKey: ["attachments", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/attachments`);
      return res.data;
    },
    enabled: !!meetingId,
  });

  // 2. Upload file logic
  const handleUploadFile = async (file: File) => {
    // Limit size to 50MB
    const limit = 50 * 1024 * 1024;
    if (file.size > limit) {
      showErrorToast(t("meeting.attachments_manager.limit_error"));
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setUploadProgress(0);
    try {
      await apiClient.post(`/meetings/${meetingId}/attachments/upload`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        },
      });
      showSuccessToast(t("meeting.attachments_manager.upload_success"));
      refetch();
    } catch (err) {
      console.error("Attachment upload failed:", err);
      showErrorToast(t("meeting.attachments_manager.upload_failed"));
    } finally {
      setUploadProgress(null);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      void handleUploadFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      void handleUploadFile(files[0]);
    }
  };

  // 3. Download tệp bằng cách fetch blob kèm Token
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownload = async (item: Attachment) => {
    setDownloadingId(item.id);
    try {
      const response = await apiClient.get(`/meetings/${meetingId}/attachments/download/${item.id}`, {
        responseType: "blob",
      });

      const blob = new Blob([response.data as BlobPart], { type: item.mimeType || "application/octet-stream" });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", item.fileName || "download");
      document.body.appendChild(link);
      link.click();
      
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
      showErrorToast(t("meeting.attachments_manager.download_failed"));
    } finally {
      setDownloadingId(null);
    }
  };

  // 4. Delete attachment mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiClient.delete(`/meetings/${meetingId}/attachments/${id}`);
    },
    onSuccess: () => {
      showSuccessToast(t("meeting.attachments_manager.delete_success"));
      refetch();
    },
    onError: (err) => {
      console.error("Delete failed:", err);
      showErrorToast(t("meeting.attachments_manager.delete_failed"));
    },
  });

  const handleDelete = (id: string) => {
    if (window.confirm(t("meeting.attachments_manager.delete_confirm"))) {
      deleteMutation.mutate(id);
    }
  };

  // Theme Styling helpers based on whether component is inside LiveKit Room or outside in dashboard
  const boxBgClass = isInRoom 
    ? "bg-slate-900/20 border-white/10 text-white" 
    : "bg-white/40 border-slate-200 text-slate-800";
    
  const cardBgClass = isInRoom
    ? "bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10"
    : "bg-white/80 border-slate-100 hover:bg-white hover:border-slate-200 shadow-sm";

  const dropZoneBgClass = isDragging
    ? "border-cyan-500 bg-cyan-500/10"
    : isInRoom
      ? "border-white/10 hover:border-white/20 bg-white/5"
      : "border-slate-200 hover:border-cyan-500/40 bg-slate-50/50";

  return (
    <div className={`space-y-6 flex flex-col h-full ${isInRoom ? "overflow-hidden" : ""}`}>
      {/* 1. Drag & Drop File Upload Area */}
      {canUpload && (
        <div 
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-3xl p-6 text-center cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-3 ${dropZoneBgClass}`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={onFileChange} 
            className="hidden" 
          />
          
          <AnimatePresence mode="wait">
            {uploadProgress !== null ? (
              <motion.div 
                key="uploading"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="flex flex-col items-center gap-2.5 w-full max-w-[200px]"
              >
                <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
                <span className="text-xs font-black tracking-wide">
                  {t("meeting.attachments_manager.uploading", { progress: uploadProgress })}
                </span>
                <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div 
                    className="bg-cyan-500 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div 
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center gap-2"
              >
                <div className={`h-11 w-11 rounded-2xl flex items-center justify-center shrink-0 border ${isInRoom ? "bg-white/5 border-white/5" : "bg-white border-slate-100 shadow-sm"}`}>
                  <UploadCloud className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h4 className="text-[13px] font-black">{t("meeting.attachments_manager.drag_drop")}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">PDF, DOCX, ZIP, PNG, JPG... (Max 50MB)</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 2. Loading State */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2 flex-1">
          <Loader2 className="h-6 w-6 animate-spin text-cyan-500" />
          <span className="text-xs font-black">{t("meeting.attachments_manager.loading")}</span>
        </div>
      ) : attachments.length === 0 ? (
        /* Empty State */
        <div className={`py-12 flex flex-col items-center justify-center text-center px-6 rounded-3xl border ${boxBgClass} flex-1 justify-center`}>
          <div className={`h-14 w-14 rounded-2xl flex items-center justify-center mb-4 border ${isInRoom ? "bg-white/5 border-white/5" : "bg-slate-50 border-slate-100"}`}>
            <Paperclip className="h-6 w-6 text-slate-400" />
          </div>
          <h5 className="font-black text-sm mb-1">{t("meeting.attachments_manager.no_attachments")}</h5>
          <p className="text-slate-400 text-xs leading-relaxed max-w-[200px] mx-auto">
            {t("meeting.attachments_manager.no_attachments_desc")}
          </p>
        </div>
      ) : (
        /* Attachments List */
        <div className={`space-y-3 ${isInRoom ? "flex-1 overflow-y-auto pr-1.5 custom-scrollbar pb-10" : ""}`}>
          <div className="flex items-center justify-between mb-1 px-1">
            <span className="text-[10px] font-black text-slate-400">
              {t("meeting.attachments_manager.list_title", { count: attachments.length })}
            </span>
          </div>

          <div className="space-y-3">
            {attachments.map((item) => {
              const { icon: FileIcon, color: iconColors } = getFileIconAndColor(item.type, item.mimeType);
              const isDeleting = deleteMutation.isPending && deleteMutation.variables === item.id;
              const isDownloading = downloadingId === item.id;

              return (
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={item.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-300 flex items-center justify-between gap-3 group ${cardBgClass}`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`h-11 w-11 rounded-xl flex items-center justify-center border shrink-0 ${iconColors}`}>
                      <FileIcon className="h-5 w-5" />
                    </div>
                    
                    <div className="min-w-0">
                      <p className={`text-[13px] font-black truncate group-hover:text-cyan-500 transition-colors ${
                        isInRoom ? "text-slate-200" : "text-slate-800 dark:text-white"
                      }`} title={item.fileName}>
                        {item.fileName}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] font-bold text-slate-400">
                        <span>{formatBytes(item.fileSize)}</span>
                        <span>•</span>
                        <span>
                          {new Date(item.createdAt).toLocaleDateString([], {
                            day: "2-digit",
                            month: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* Download Button */}
                    <button
                      onClick={() => void handleDownload(item)}
                      disabled={isDownloading}
                      className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all border ${
                        isInRoom
                          ? "bg-white/5 border-white/5 text-slate-400 hover:text-white hover:bg-white/10"
                          : "bg-slate-50 border-slate-200/60 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      title={t("meeting.attachments_manager.download")}
                    >
                      {isDownloading ? (
                        <Loader2 className="h-4 w-4 animate-spin text-cyan-500" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </button>

                    {/* Delete Button - Only shown if authorized */}
                    {(canUpload || item.uploadedByUserId === apiClient.defaults.headers.common["userId"]) && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isDeleting}
                        className={`h-9 w-9 flex items-center justify-center rounded-xl transition-all border ${
                          isInRoom
                            ? "bg-rose-500/10 border-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white"
                            : "bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-600 hover:text-white"
                        }`}
                        title={t("meeting.attachments_manager.delete")}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin text-rose-500" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
