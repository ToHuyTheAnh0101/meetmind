import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Trash2,
  Check,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Inbox,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import {
  SummaryTemplate,
  SummaryTemplatePurpose,
  TemplateSectionDef,
} from "@/types/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";

// --- Custom Subcomponents ---
import { TemplateCard } from "./components/TemplateCard";
import { TemplateListHeader } from "./components/TemplateListHeader";
import { TemplateFormBasicInfo } from "./components/TemplateFormBasicInfo";
import { TemplateBlockEditor } from "./components/TemplateBlockEditor";
import { TemplateActiveBlocks } from "./components/TemplateActiveBlocks";
import { TemplateNotionPreview } from "./components/TemplateNotionPreview";

// --- Predefined Blocks and Utility Helpers ---
import { PREDEFINED_BLOCKS } from "./predefinedBlocks";
import {
  convertRawToFriendlyPlaceholders,
  convertFriendlyToRawPlaceholders,
} from "./utils/placeholderHelpers";

const TemplatesPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === "vi";
  const queryClient = useQueryClient();

  // --- Unified Real-Time Preview Renderer ---
  const renderCompiledBlock = (_blockType: string | undefined, _label: string, placeholders: string | undefined) => {
    if (!placeholders || !placeholders.trim()) {
      return (
        <div className="flex items-center gap-2 text-slate-400 font-sans text-[11px] font-medium animate-in fade-in duration-200 py-2.5 bg-slate-50/50 border border-dashed border-slate-200 rounded-xl px-3.5">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse shrink-0" />
          <span>Chưa có cấu trúc hiển thị...</span>
        </div>
      );
    }
    return <MarkdownRenderer content={placeholders} highlightVariables={true} />;
  };

  // Page States
  const [view, setView] = useState<"list" | "form">("list");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [formMode, setFormMode] = useState<"new" | "edit">("new");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("all");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPurpose, setFormPurpose] = useState<SummaryTemplatePurpose>(SummaryTemplatePurpose.CUSTOM);
  const [formSections, setFormSections] = useState<TemplateSectionDef[]>([]);
  const [formStyle, setFormStyle] = useState<"concise" | "formal" | "detailed" | "bullet_points">("detailed");
  const [formGlobalRules, setFormGlobalRules] = useState("");

  // Dropdown UI States
  const [isFilterPurposeOpen, setIsFilterPurposeOpen] = useState(false);
  const [isFormPurposeOpen, setIsFormPurposeOpen] = useState(false);
  const [isFormStyleOpen, setIsFormStyleOpen] = useState(false);
  const [isNewSecBlockTypeOpen, setIsNewSecBlockTypeOpen] = useState(false);

  // Inline Section Builder State
  const [newSecName, setNewSecName] = useState("");
  const [newSecLabel, setNewSecLabel] = useState("");
  const [newSecDesc, setNewSecDesc] = useState("");
  const [newSecBlockType, setNewSecBlockType] = useState("custom");
  const [newSecAiInstructions, setNewSecAiInstructions] = useState("");
  const [newSecPlaceholders, setNewSecPlaceholders] = useState("");
  const [secBuilderError, setSecBuilderError] = useState<string | null>(null);
  const [editingSecName, setEditingSecName] = useState<string | null>(null);

  // Notification Banner State
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Trigger banner utility
  const triggerBanner = (type: "success" | "error", message: string) => {
    setBanner({ type, message });
    setTimeout(() => setBanner(null), 4000);
  };

  // --- API Queries & Mutations ---
  const {
    data: templates = [],
    isLoading,
    isError,
    refetch,
  } = useQuery<SummaryTemplate[]>({
    queryKey: ["summary-templates"],
    queryFn: async () => {
      const res = await apiClient.get("/summary-templates");
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (newTemplate: Partial<SummaryTemplate>) => {
      const res = await apiClient.post("/summary-templates", newTemplate);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary-templates"] });
      triggerBanner("success", t("template.creation_success"));
      setView("list");
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message;
      triggerBanner("error", errMsg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SummaryTemplate> }) => {
      const res = await apiClient.put(`/summary-templates/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary-templates"] });
      triggerBanner("success", t("template.update_success"));
      setView("list");
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message;
      triggerBanner("error", errMsg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete(`/summary-templates/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["summary-templates"] });
      triggerBanner("success", t("template.deletion_success"));
      setView("list");
    },
    onError: (err: any) => {
      const errMsg = err.response?.data?.message || err.message;
      triggerBanner("error", errMsg);
    },
  });

  // --- Handlers ---
  const handleOpenDetails = (id: string) => {
    const template = templates.find((t) => t.id === id);
    if (template) {
      handleOpenEditForm(template);
    }
  };

  const handleOpenCreateForm = () => {
    setFormMode("new");
    setFormName("");
    setFormDesc("");
    setFormPurpose(SummaryTemplatePurpose.CUSTOM);
    setFormSections([]);
    setFormStyle("detailed");
    setFormGlobalRules("");
    setNewSecName("");
    setNewSecLabel("");
    setNewSecDesc("");
    setNewSecBlockType("custom");
    setNewSecAiInstructions("");
    setNewSecPlaceholders("");
    setSecBuilderError(null);
    setEditingSecName(null);
    setView("form");
  };

  const handleOpenEditForm = (template: SummaryTemplate) => {
    setFormMode("edit");
    setSelectedTemplateId(template.id);
    setFormName(template.name);
    setFormDesc(template.description || "");
    setFormPurpose(template.purpose);
    setFormSections([...template.sections].sort((a, b) => a.order - b.order));
    setFormStyle((template.summaryStyle as any) || "detailed");
    setFormGlobalRules(template.globalRules || "");
    setNewSecName("");
    setNewSecLabel("");
    setNewSecDesc("");
    setNewSecBlockType("custom");
    setNewSecAiInstructions("");
    setNewSecPlaceholders("");
    setSecBuilderError(null);
    setEditingSecName(null);
    setView("form");
  };

  const handleSelectPredefinedBlock = (block: typeof PREDEFINED_BLOCKS[0]) => {
    setNewSecBlockType(block.type);
    setNewSecLabel(block.label);
    setNewSecAiInstructions(block.aiInstructions);
    setNewSecPlaceholders(convertRawToFriendlyPlaceholders(block.placeholders || "", t));

    // Auto-generate a unique machine key based on block type
    let suffix = 1;
    let proposedKey = block.type === "custom" ? "custom_block" : block.type;
    while (formSections.some((sec) => sec.name === proposedKey)) {
      proposedKey = `${block.type === "custom" ? "custom_block" : block.type}_${suffix}`;
      suffix++;
    }
    setNewSecName(proposedKey);
    setNewSecDesc(block.description);
    setEditingSecName(null);
  };

  const handleInsertPlaceholder = (placeholder: string) => {
    setNewSecPlaceholders((prev) => {
      if (!prev) return placeholder;
      return /\s$/.test(prev) ? prev + placeholder : prev + " " + placeholder;
    });
  };

  const handleAddOrUpdateSection = () => {
    setSecBuilderError(null);
    if (!newSecLabel.trim()) {
      setSecBuilderError(t("template.error_label_required"));
      return;
    }

    let machineKey = editingSecName || newSecName.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    if (!machineKey) {
      machineKey = newSecLabel
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "_")
        .replace(/_+/g, "_");
    }

    if (!machineKey) {
      machineKey = "section";
    }

    // Ensure uniqueness for new sections
    if (!editingSecName) {
      let suffix = 1;
      let proposedKey = machineKey;
      while (formSections.some((sec) => sec.name === proposedKey)) {
        proposedKey = `${machineKey}_${suffix}`;
        suffix++;
      }
      machineKey = proposedKey;
    }

    if (editingSecName) {
      // Update existing
      const updated = formSections.map((sec) => {
        if (sec.name === editingSecName) {
          return {
            ...sec,
            name: machineKey,
            label: newSecLabel.trim(),
            description: newSecDesc.trim() || undefined,
            blockType: newSecBlockType,
            aiInstructions: newSecAiInstructions.trim() || undefined,
            placeholders: convertFriendlyToRawPlaceholders(newSecPlaceholders.trim(), t) || undefined,
          };
        }
        return sec;
      });
      setFormSections(updated);
      setEditingSecName(null);
    } else {
      // Add new
      const newSection: TemplateSectionDef = {
        name: machineKey,
        label: newSecLabel.trim(),
        description: newSecDesc.trim() || undefined,
        blockType: newSecBlockType,
        aiInstructions: newSecAiInstructions.trim() || undefined,
        placeholders: convertFriendlyToRawPlaceholders(newSecPlaceholders.trim(), t) || undefined,
        order: formSections.length + 1,
      };
      setFormSections([...formSections, newSection]);
    }

    // Reset inline form
    setNewSecName("");
    setNewSecLabel("");
    setNewSecDesc("");
    setNewSecBlockType("custom");
    setNewSecAiInstructions("");
    setNewSecPlaceholders("");
  };

  const handleStartEditSection = (sec: TemplateSectionDef) => {
    setEditingSecName(sec.name);
    setNewSecName(sec.name);
    setNewSecLabel(sec.label);
    setNewSecDesc(sec.description || "");
    setNewSecBlockType(sec.blockType || "custom");
    setNewSecAiInstructions(sec.aiInstructions || "");
    setNewSecPlaceholders(convertRawToFriendlyPlaceholders(sec.placeholders || "", t));
  };

  const handleDeleteSection = (name: string) => {
    const updated = formSections
      .filter((sec) => sec.name !== name)
      .map((sec, idx) => ({ ...sec, order: idx + 1 }));
    setFormSections(updated);
    if (editingSecName === name) {
      setEditingSecName(null);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...formSections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    // Swap sections
    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    // Recalculate orders
    const updated = newSections.map((sec, idx) => ({
      ...sec,
      order: idx + 1,
    }));
    setFormSections(updated);
  };

  const handleSaveTemplate = () => {
    if (!formName.trim()) {
      triggerBanner("error", t("template.error_template_name_required"));
      return;
    }
    if (formSections.length === 0) {
      triggerBanner("error", t("template.error_sections_required"));
      return;
    }

    const payload = {
      name: formName.trim(),
      description: formDesc.trim() || undefined,
      purpose: formPurpose,
      sections: formSections,
      summaryStyle: formStyle,
      globalRules: formGlobalRules.trim() || undefined,
    };

    if (formMode === "new") {
      createMutation.mutate(payload);
    } else if (selectedTemplateId) {
      updateMutation.mutate({ id: selectedTemplateId, data: payload });
    }
  };

  const handleDeleteTemplate = (id: string) => {
    if (window.confirm(t("template.delete_confirm"))) {
      deleteMutation.mutate(id);
    }
  };

  // --- Filters ---
  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description &&
          template.description
            .toLowerCase()
            .includes(searchQuery.toLowerCase()));

      const matchesPurpose =
        selectedPurpose === "all" || template.purpose === selectedPurpose;

      return matchesSearch && matchesPurpose;
    });
  }, [templates, searchQuery, selectedPurpose]);

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) return null;
    return templates.find((t) => t.id === selectedTemplateId) || null;
  }, [templates, selectedTemplateId]);

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
              banner.type === "success"
                ? "border-emerald-200 bg-emerald-50/95 text-emerald-800"
                : "border-rose-200 bg-rose-50/95 text-rose-800"
            }`}
          >
            {banner.type === "success" ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <p className="text-sm font-bold">{banner.message}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW: LIST */}
      {view === "list" && (
        <div className="space-y-6">
          <TemplateListHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedPurpose={selectedPurpose}
            setSelectedPurpose={setSelectedPurpose}
            isSearchVisible={isSearchVisible}
            setIsSearchVisible={setIsSearchVisible}
            isFilterPurposeOpen={isFilterPurposeOpen}
            setIsFilterPurposeOpen={setIsFilterPurposeOpen}
            handleOpenCreateForm={handleOpenCreateForm}
          />

          {isLoading ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-white/50 bg-white/50 py-20 backdrop-blur-sm">
              <Loader2 className="h-10 w-10 animate-spin text-cyan-600" />
              <p className="mt-4 font-bold text-slate-900">
                Đang tải danh sách mẫu cuộc họp...
              </p>
            </div>
          ) : isError ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-rose-100 bg-rose-50/50 py-20 backdrop-blur-sm">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">
                Không thể kết nối máy chủ
              </h3>
              <button
                onClick={() => refetch()}
                className="mt-6 rounded-xl bg-rose-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-rose-200 transition hover:bg-rose-700 active:scale-95"
              >
                {t("meeting.retry")}
              </button>
            </div>
          ) : filteredTemplates.length === 0 ? (
            <div className="flex min-h-[400px] flex-col items-center justify-center rounded-3xl border border-slate-100 bg-white/50 py-20 backdrop-blur-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-50 text-slate-300">
                <Inbox className="h-10 w-10" />
              </div>
              <h3 className="mt-6 text-xl font-bold text-slate-900">
                {searchQuery
                  ? t("template.no_matches")
                  : t("template.empty_hub")}
              </h3>
              <p className="mt-2 text-center text-sm text-slate-500 max-w-xs">
                {searchQuery
                  ? `Không tìm thấy kết quả nào khớp với "${searchQuery}"`
                  : t("template.empty_hub_desc")}
              </p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {filteredTemplates.map((tpl, index) => (
                  <TemplateCard
                    key={tpl.id}
                    template={tpl}
                    index={index}
                    onClick={() => handleOpenDetails(tpl.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* VIEW: FORM (NEW & EDIT) */}
      {view === "form" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6 w-full max-w-[1600px] mx-auto px-4"
        >
          {/* Form Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setView("list")}
                className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500 hover:text-slate-900 transition-all hover:bg-slate-50 active:scale-95 shadow-sm"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                  {formMode === "new"
                    ? t("template.template_designer_title")
                    : t("template.template_designer_edit_title")}
                </h2>
                <p className="text-sm font-semibold text-slate-500 mt-0.5">
                  {t("template.template_designer_subtitle")}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {formMode === "edit" && selectedTemplate && !selectedTemplate.isSystem && (
                <button
                  type="button"
                  onClick={() => handleDeleteTemplate(selectedTemplate.id)}
                  className="flex h-12 items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-5 text-sm font-black text-rose-600 hover:bg-rose-100/50 hover:text-rose-700 transition active:scale-95 shadow-sm"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Xóa mẫu</span>
                </button>
              )}

              {selectedTemplate?.isSystem ? (
                <div className="flex h-12 items-center gap-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 px-5 text-sm font-black text-amber-600 select-none shadow-sm">
                  <span>Mẫu hệ thống (Chỉ xem)</span>
                </div>
              ) : (
                <button
                  onClick={handleSaveTemplate}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-r from-cyan-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-cyan-100 hover:scale-[1.03] active:scale-95 transition-all"
                >
                  <Check className="h-5 w-5" />
                  <span>{t("template.save")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
            {/* Left Column: Form, Block Editor & Active Blocks List */}
            <div className="xl:col-span-1 space-y-6">
              <TemplateFormBasicInfo
                formName={formName}
                setFormName={setFormName}
                formPurpose={formPurpose}
                setFormPurpose={setFormPurpose}
                formStyle={formStyle}
                setFormStyle={setFormStyle}
                formDesc={formDesc}
                setFormDesc={setFormDesc}
                formGlobalRules={formGlobalRules}
                setFormGlobalRules={setFormGlobalRules}
                isFormPurposeOpen={isFormPurposeOpen}
                setIsFormPurposeOpen={setIsFormPurposeOpen}
                isFormStyleOpen={isFormStyleOpen}
                setIsFormStyleOpen={setIsFormStyleOpen}
                isVi={isVi}
                isSystem={!!selectedTemplate?.isSystem}
              />

              <TemplateBlockEditor
                editingSecName={editingSecName}
                setEditingSecName={setEditingSecName}
                secBuilderError={secBuilderError}
                newSecBlockType={newSecBlockType}
                setNewSecBlockType={setNewSecBlockType}
                newSecLabel={newSecLabel}
                setNewSecLabel={setNewSecLabel}
                newSecPlaceholders={newSecPlaceholders}
                newSecAiInstructions={newSecAiInstructions}
                setNewSecAiInstructions={setNewSecAiInstructions}
                isNewSecBlockTypeOpen={isNewSecBlockTypeOpen}
                setIsNewSecBlockTypeOpen={setIsNewSecBlockTypeOpen}
                handleSelectPredefinedBlock={handleSelectPredefinedBlock}
                handleInsertPlaceholder={handleInsertPlaceholder}
                handleAddOrUpdateSection={handleAddOrUpdateSection}
                renderCompiledBlock={renderCompiledBlock}
                selectedTemplate={selectedTemplate}
                setNewSecName={setNewSecName}
                setNewSecDesc={setNewSecDesc}
                setNewSecPlaceholders={setNewSecPlaceholders}
              />

              <TemplateActiveBlocks
                formSections={formSections}
                selectedTemplate={selectedTemplate}
                editingSecName={editingSecName}
                handleStartEditSection={handleStartEditSection}
                handleDeleteSection={handleDeleteSection}
                moveSection={moveSection}
              />
            </div>

            {/* Right Column: Notion-style Realtime Preview */}
            <div className="xl:col-span-1">
              <TemplateNotionPreview
                formName={formName}
                formPurpose={formPurpose}
                formSections={formSections}
                renderCompiledBlock={renderCompiledBlock}
              />
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TemplatesPage;
