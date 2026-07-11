import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import apiClient from "@/lib/apiClient";

// Sub-components
import { SummaryShareDropdown } from "./SummaryShareDropdown";
import { SummaryContentSection } from "./SummaryContentSection";
import { SummaryChatbotSection } from "./SummaryChatbotSection";

// Custom API Hooks
import { useMeeting } from "../../../api/getMeeting";

interface MeetingSummaryTabProps {
  meetingId: string;
  canEdit: boolean;
  theme: any;
}

export const MeetingSummaryTab: React.FC<MeetingSummaryTabProps> = ({
  meetingId,
  canEdit,
  theme,
}) => {
  const { t } = useTranslation();
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

  // 1. Fetch meeting detail / status via custom hook
  const { data: meetingDetail } = useMeeting(meetingId);

  // 2. Fetch all AI Summaries for the meeting
  const {
    data: summaries,
    isLoading: isLoadingSummaries,
    refetch: refetchSummaries,
  } = useQuery<any[]>({
    queryKey: ["meeting-summaries", meetingId],
    queryFn: async () => {
      const res = await apiClient.get(`/meetings/${meetingId}/summaries`);
      return res.data;
    },
    refetchInterval: (query) => {
      const hasGenerating = query.state.data?.some(
        (s: any) => s.summaryText === "[GENERATING]"
      );
      return hasGenerating ? 3000 : false;
    },
  });

  // 3. Fetch all templates
  const { data: templates } = useQuery<any[]>({
    queryKey: ["summary-templates"],
    queryFn: async () => {
      const res = await apiClient.get("/summary-templates");
      return res.data;
    },
  });

  // 4. Generate/Regenerate AI Summary Mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async ({ templateId }: { templateId?: string }) => {
      const res = await apiClient.post(
        `/meetings/${meetingId}/summaries/generate`,
        { templateId: templateId || undefined }
      );
      return res.data;
    },
    onSuccess: () => {
      refetchSummaries();
    },
  });

  // 5. Update AI Summary Mutation
  const updateSummaryMutation = useMutation({
    mutationFn: async ({ summaryId, summaryText }: { summaryId: string; summaryText: string }) => {
      const res = await apiClient.put(
        `/meetings/${meetingId}/summaries/${summaryId}`,
        { summaryText }
      );
      return res.data;
    },
    onSuccess: () => {
      refetchSummaries();
    },
  });

  const isOngoing = meetingDetail?.status === "ongoing";
  const aiActivated = meetingDetail?.aiActivated === true;
  const hasTranscripts = meetingDetail?.hasTranscripts === true;

  const currentSummary = summaries?.[0];
  const summary = currentSummary?.summaryText;
  const isGenerating = generateSummaryMutation.isPending || summary === "[GENERATING]";

  // Sync template ID when current summary changes
  useEffect(() => {
    if (currentSummary?.templateId) {
      setSelectedTemplateId(currentSummary.templateId);
    } else {
      setSelectedTemplateId("");
    }
  }, [currentSummary]);

  const isAiActivatedButNoTranscripts =
    aiActivated && !hasTranscripts && !summary && meetingDetail?.status !== "ongoing";

  const handleGenerate = () => {
    if (summary && summary !== "[GENERATING]") {
      const confirmOverwrite = window.confirm(t("meeting.summary_tab.regenerate_confirm"));
      if (!confirmOverwrite) return;
    }
    generateSummaryMutation.mutate({ templateId: selectedTemplateId });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* LEFT COLUMN: AI SUMMARY VIEW */}
      <div className="lg:col-span-7 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2.5rem] border border-white/80 bg-white/70 p-5 sm:p-6 shadow-2xl backdrop-blur-xl min-h-[550px] flex flex-col"
        >
          {/* Header section */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-6 mb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-[1.25rem] bg-cyan-50/80 flex items-center justify-center text-cyan-600 shadow-inner">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-900 leading-tight">
                  {t("meeting.summary_tab.summary_card_title")}
                </h3>
              </div>
            </div>

            {/* Sharing & Access Control Group */}
            <SummaryShareDropdown
              meetingId={meetingId}
              canEdit={canEdit}
              theme={theme}
              meetingDetail={meetingDetail}
            />
          </div>

          {/* Summary Panel */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 flex flex-col justify-between min-w-0">
              <SummaryContentSection
                isLoadingSummaries={isLoadingSummaries}
                isOngoing={isOngoing}
                isAiActivatedButNoTranscripts={isAiActivatedButNoTranscripts}
                aiActivated={aiActivated}
                hasTranscripts={hasTranscripts}
                summary={summary}
                isGenerating={isGenerating}
                selectedTemplateId={selectedTemplateId}
                setSelectedTemplateId={setSelectedTemplateId}
                templates={templates}
                handleGenerate={handleGenerate}
                canEdit={canEdit}
                summaryId={currentSummary?.id}
                updateSummaryMutation={updateSummaryMutation}
                meetingDetail={meetingDetail}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* RIGHT COLUMN: Q&A CHATBOT VIEW */}
      <div className="lg:col-span-5 space-y-6">
        <SummaryChatbotSection
          meetingId={meetingId}
          aiActivated={aiActivated}
          meetingStatus={meetingDetail}
        />
      </div>
    </div>
  );
};
