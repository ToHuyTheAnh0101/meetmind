import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
  Check,
  X,
  Sparkles,
  ChevronUp,
  ChevronDown,
  FileText,
  HelpCircle,
} from "lucide-react";
import apiClient from "@/lib/apiClient";
import {
  SummaryTemplate,
  SummaryTemplatePurpose,
  TemplateSectionDef,
} from "@/types/api";
import MarkdownRenderer from "@/components/MarkdownRenderer";

// --- Helper for Purpose Styling ---
const getPurposeStyles = (purpose: SummaryTemplatePurpose, t: any) => {
  switch (purpose) {
    case "interview":
      return {
        bg: "bg-emerald-50/80 border-emerald-200 text-emerald-700",
        gradient: "from-emerald-500 to-teal-600",
        label: t("template.purpose_options.interview"),
      };
    case "report":
      return {
        bg: "bg-violet-50/80 border-violet-200 text-violet-700",
        gradient: "from-violet-500 to-purple-600",
        label: t("template.purpose_options.report"),
      };
    case "project_discussion":
      return {
        bg: "bg-cyan-50/80 border-cyan-200 text-cyan-700",
        gradient: "from-cyan-500 to-blue-600",
        label: t("template.purpose_options.project_discussion"),
      };
    case "team_meeting":
      return {
        bg: "bg-amber-50/80 border-amber-200 text-amber-700",
        gradient: "from-amber-500 to-orange-600",
        label: t("template.purpose_options.team_meeting"),
      };
    case "brainstorming":
      return {
        bg: "bg-yellow-50/80 border-yellow-200 text-yellow-800",
        gradient: "from-yellow-500 to-amber-500",
        label: t("template.purpose_options.brainstorming"),
      };
    case "training":
      return {
        bg: "bg-teal-50/80 border-teal-200 text-teal-800",
        gradient: "from-teal-500 to-emerald-600",
        label: t("template.purpose_options.training"),
      };
    case "retrospective":
      return {
        bg: "bg-rose-50/80 border-rose-200 text-rose-800",
        gradient: "from-fuchsia-500 to-rose-600",
        label: t("template.purpose_options.retrospective"),
      };
    case "sales_pitch":
      return {
        bg: "bg-sky-50/80 border-sky-200 text-sky-800",
        gradient: "from-sky-500 to-blue-600",
        label: t("template.purpose_options.sales_pitch"),
      };
    case "custom":
    default:
      return {
        bg: "bg-slate-50/80 border-slate-200 text-slate-700",
        gradient: "from-slate-500 to-slate-700",
        label: t("template.purpose_options.custom"),
      };
  }
};

const PREDEFINED_BLOCKS = [
  {
    type: "executive_summary",
    label: "Tóm tắt điều hành",
    description: "Tóm tắt ngắn gọn bối cảnh và mục tiêu chính của cuộc họp.",
    aiInstructions: "Tóm tắt ngắn gọn bối cảnh cuộc họp, mục tiêu và bầu không khí chính. Tập trung vào bức tranh toàn cảnh.",
    placeholders: "### **Tổng quan cuộc họp**\n- **Bối cảnh:** [AI tự động phân tích bối cảnh/lý do diễn ra cuộc họp]\n- **Nội dung chính:** [AI tự động tóm tắt các diễn biến và nội dung thảo luận trọng tâm]",
  },
  {
    type: "decisions",
    label: "Quyết định quan trọng",
    description: "Liệt kê các quyết định quan trọng đã được thống nhất.",
    aiInstructions: "Liệt kê tất cả các quyết định được chốt và thông qua bởi những người tham gia họp.",
    placeholders: "### **Quyết định đã chốt**\n- ✔ **Quyết định 1:** [AI tự động trích xuất nội dung quyết định 1 đã thống nhất]\n- ✔ **Quyết định 2:** [AI tự động trích xuất nội dung quyết định 2 đã thống nhất]",
  },
  {
    type: "roadblocks",
    label: "Khó khăn & Rào cản",
    description: "Liệt kê các khó khăn, thách thức cần tháo gỡ.",
    aiInstructions: "Trích xuất tất cả các khó khăn, thách thức, rào cản kỹ thuật hoặc tiến độ được các thành viên thảo luận hoặc phàn nàn trong cuộc họp.",
    placeholders: "### **Khó khăn & Rào cản**\n- 🚨 **Rào cản 1:** [AI tự động trích xuất rào cản/nút thắt cổ chai đang gặp phải]\n- 🚨 **Rào cản 2:** [AI tự động trích xuất rào cản/nút thắt cổ chai đang gặp phải]",
  },
  {
    type: "todo_table",
    label: "Bảng phân công nhiệm vụ",
    description: "Bảng lưới chi tiết phân công công việc.",
    aiInstructions: "Tạo một bảng Markdown chi tiết liệt kê Công việc, Người thực hiện, và Hạn chót.",
    placeholders: "| Công việc | Người thực hiện | Hạn chót |\n| --- | --- | --- |\n| {{task}} | {{owner}} | {{deadline}} |",
  },
  {
    type: "custom",
    label: "Khối tuỳ chỉnh",
    description: "Khối tự thiết kế tự do theo ý bạn.",
    aiInstructions: "",
    placeholders: "",
  }
];

const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // --- Friendly Variables Mapping ---
  const FRIENDLY_VARIABLES_VI: { [key: string]: string } = useMemo(() => ({
    meeting_title: "Tiêu đề cuộc họp",
    meeting_date: "Ngày họp",
    summary: "Tóm tắt chung",
    action_items: "Các đầu việc",
    participants: "Người tham gia",
    task: "Nhiệm vụ",
    owner: "Thành viên",
    deadline: "Hạn chót"
  }), []);

  const FRIENDLY_VARIABLES_EN: { [key: string]: string } = useMemo(() => ({
    meeting_title: "Meeting Title",
    meeting_date: "Meeting Date",
    summary: "General Summary",
    action_items: "Action Items",
    participants: "Participants",
    task: "Task Name",
    owner: "Owner",
    deadline: "Deadline"
  }), []);

  const convertRawToFriendlyPlaceholders = (text: string): string => {
    if (!text) return "";
    let res = text;
    const keys = ["meeting_title", "meeting_date", "summary", "action_items", "participants", "task", "owner", "deadline"];
    keys.forEach((key) => {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      const label = t(`template.variable_labels.${key}`) || FRIENDLY_VARIABLES_VI[key];
      res = res.replace(regex, `[${label}]`);
    });
    return res;
  };

  const convertFriendlyToRawPlaceholders = (text: string): string => {
    if (!text) return "";
    let res = text;
    const keys = ["meeting_title", "meeting_date", "summary", "action_items", "participants", "task", "owner", "deadline"];
    keys.forEach((key) => {
      const labelVi = FRIENDLY_VARIABLES_VI[key];
      const labelEn = FRIENDLY_VARIABLES_EN[key];
      const labelCurrent = t(`template.variable_labels.${key}`);
      
      const escapedVi = labelVi.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const escapedEn = labelEn.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      
      res = res.replace(new RegExp(`\\[${escapedVi}\\]`, 'g'), `{{${key}}}`);
      res = res.replace(new RegExp(`\\[${escapedEn}\\]`, 'g'), `{{${key}}}`);
      
      if (labelCurrent) {
        const escapedCurrent = labelCurrent.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        res = res.replace(new RegExp(`\\[${escapedCurrent}\\]`, 'g'), `{{${key}}}`);
      }
    });
    return res;
  };

  // --- Unified Real-Time Preview Renderer ---
  const renderCompiledBlock = (_blockType: string | undefined, _label: string, placeholders: string | undefined) => {
    // 1. If placeholders is empty or only whitespace, render a clean, premium empty state
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
  const [view, setView] = useState<"list" | "details" | "form">("list");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [formMode, setFormMode] = useState<"new" | "edit">("new");

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedPurpose, setSelectedPurpose] = useState<string>("all");
  const [isSearchVisible, setIsSearchVisible] = useState(false);

  // Form State
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formPurpose, setFormPurpose] = useState<SummaryTemplatePurpose>(
    SummaryTemplatePurpose.CUSTOM,
  );
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
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: Partial<SummaryTemplate>;
    }) => {
      const res = await apiClient.patch(`/summary-templates/${id}`, data);
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
      await apiClient.delete(`/summary-templates/${id}`);
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
            placeholders: convertFriendlyToRawPlaceholders(newSecPlaceholders.trim()) || undefined,
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
        placeholders: convertFriendlyToRawPlaceholders(newSecPlaceholders.trim()) || undefined,
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

  const handleEditSection = (sec: TemplateSectionDef) => {
    setEditingSecName(sec.name);
    setNewSecName(sec.name);
    setNewSecLabel(sec.label);
    setNewSecDesc(sec.description || "");
    setNewSecBlockType(sec.blockType || "custom");
    setNewSecAiInstructions(sec.aiInstructions || "");
    setNewSecPlaceholders(convertRawToFriendlyPlaceholders(sec.placeholders || ""));
  };

  const handleRemoveSection = (name: string) => {
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

  const handleSelectPredefinedBlock = (block: typeof PREDEFINED_BLOCKS[0]) => {
    setNewSecBlockType(block.type);
    setNewSecLabel(block.label);
    setNewSecAiInstructions(block.aiInstructions);
    setNewSecPlaceholders(convertRawToFriendlyPlaceholders(block.placeholders || ""));

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
                  {t("dashboard.template_list_title_prefix")}{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-indigo-600">
                    {t("dashboard.template_list_title_highlight")}
                  </span>
                </h1>
                <p className="mt-1.5 text-sm font-medium text-slate-500 sm:text-base">
                  {t("dashboard.template_list_subtitle")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setIsSearchVisible(!isSearchVisible)}
                  className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition-all duration-300 ${
                    isSearchVisible
                      ? "bg-cyan-600 border-cyan-600 text-white shadow-lg shadow-cyan-100"
                      : "border-slate-200 bg-white text-slate-600 shadow-sm hover:border-cyan-200 hover:text-cyan-600"
                  }`}
                >
                  <Search className="h-5 w-5" />
                </button>

                {/* Purpose Filter select */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFilterPurposeOpen(!isFilterPurposeOpen)}
                    className="flex h-12 items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 shadow-sm transition hover:bg-slate-50 min-w-[200px]"
                  >
                    <span className="flex items-center gap-2">
                      {selectedPurpose === "all" && "📁 Tất cả danh mục"}
                      {selectedPurpose === "interview" && `🎤 ${t("template.purpose_options.interview")}`}
                      {selectedPurpose === "report" && `📊 ${t("template.purpose_options.report")}`}
                      {selectedPurpose === "project_discussion" && `💻 ${t("template.purpose_options.project_discussion")}`}
                      {selectedPurpose === "team_meeting" && `👥 ${t("template.purpose_options.team_meeting")}`}
                      {selectedPurpose === "brainstorming" && `💡 ${t("template.purpose_options.brainstorming")}`}
                      {selectedPurpose === "training" && `🎓 ${t("template.purpose_options.training")}`}
                      {selectedPurpose === "retrospective" && `🔁 ${t("template.purpose_options.retrospective")}`}
                      {selectedPurpose === "sales_pitch" && `🤝 ${t("template.purpose_options.sales_pitch")}`}
                      {selectedPurpose === "custom" && `⚙️ ${t("template.purpose_options.custom")}`}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isFilterPurposeOpen ? "rotate-180" : ""}`} />
                  </button>

                  <AnimatePresence>
                    {isFilterPurposeOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setIsFilterPurposeOpen(false)} />
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          transition={{ duration: 0.15 }}
                          className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                        >
                          <div className="max-h-72 overflow-y-auto space-y-0.5">
                            {[
                              { val: "all", label: "📁 Tất cả danh mục" },
                              { val: "interview", label: `🎤 ${t("template.purpose_options.interview")}` },
                              { val: "report", label: `📊 ${t("template.purpose_options.report")}` },
                              { val: "project_discussion", label: `💻 ${t("template.purpose_options.project_discussion")}` },
                              { val: "team_meeting", label: `👥 ${t("template.purpose_options.team_meeting")}` },
                              { val: "brainstorming", label: `💡 ${t("template.purpose_options.brainstorming")}` },
                              { val: "training", label: `🎓 ${t("template.purpose_options.training")}` },
                              { val: "retrospective", label: `🔁 ${t("template.purpose_options.retrospective")}` },
                              { val: "sales_pitch", label: `🤝 ${t("template.purpose_options.sales_pitch")}` },
                              { val: "custom", label: `⚙️ ${t("template.purpose_options.custom")}` },
                            ].map((opt) => (
                              <button
                                key={opt.val}
                                type="button"
                                onClick={() => {
                                  setSelectedPurpose(opt.val);
                                  setIsFilterPurposeOpen(false);
                                }}
                                className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                                  selectedPurpose === opt.val
                                    ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                }`}
                              >
                                <span>{opt.label}</span>
                                {selectedPurpose === opt.val && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <button
                  onClick={handleOpenCreateForm}
                  className="flex h-12 items-center gap-2 rounded-2xl bg-gradient-to-br from-cyan-600 to-indigo-600 px-6 text-sm font-black text-white shadow-xl shadow-indigo-100 transition hover:scale-[1.05] active:scale-95 group"
                >
                  <Plus className="h-5 w-5 transition-transform group-hover:rotate-90" />
                  <span>{t("dashboard.new_template")}</span>
                </button>
              </div>
            </div>

            <AnimatePresence>
              {isSearchVisible && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-8 flex items-center gap-4 pt-4">
                    <div className="relative flex-1">
                      <Search className="absolute left-6 top-1/2 h-5 w-5 -translate-y-1/2 text-cyan-500/50" />
                      <input
                        type="text"
                        placeholder={t("template.search_placeholder")}
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
                {filteredTemplates.map((tpl, index) => {
                  const styles = getPurposeStyles(tpl.purpose, t);
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
                      <div
                        className={`absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r ${styles.gradient}`}
                      />

                      <div className="relative flex h-full flex-col justify-between gap-4 pt-2">
                        {/* Header: Title & Badges */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-bold ${styles.bg}`}
                            >
                              {styles.label}
                            </span>

                            <span
                              className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                tpl.isSystem
                                  ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
                                  : "bg-slate-100 text-slate-700 border border-slate-200"
                              }`}
                            >
                              {tpl.isSystem
                                ? t("template.is_system")
                                : t("template.is_custom")}
                            </span>
                          </div>

                          <h3 className="line-clamp-1 text-lg font-black text-slate-900 group-hover:text-cyan-700 transition-colors">
                            {tpl.name}
                          </h3>
                        </div>

                        {/* Description */}
                        <div className="flex-1">
                          <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
                            {tpl.description || "Không có mô tả cho mẫu này."}
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
                  );
                })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* VIEW: DETAILS */}


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
            {/* Left Column: Form & Block Builder Config (col-span-1) */}
            <div className="xl:col-span-1 space-y-6">
              {/* Card 1: Basic Information */}
              <div className="relative z-20 rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-5">
                <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-black text-slate-800">
                    {t("template.basic_info_card_title")}
                  </h3>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-700 tracking-wide flex items-center gap-1">
                      <span>{t("template.field_template_name")}</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder={t("template.field_template_name_placeholder")}
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold placeholder:text-slate-400 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 outline-none transition-all shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:col-span-1 relative">
                    <label className="text-xs font-black text-slate-700 tracking-wide">
                      {t("template.field_template_purpose")}
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsFormPurposeOpen(!isFormPurposeOpen)}
                      className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        {formPurpose === "interview" && `🎤 ${t("template.purpose_options.interview")}`}
                        {formPurpose === "report" && `📊 ${t("template.purpose_options.report")}`}
                        {formPurpose === "project_discussion" && `💻 ${t("template.purpose_options.project_discussion")}`}
                        {formPurpose === "team_meeting" && `👥 ${t("template.purpose_options.team_meeting")}`}
                        {formPurpose === "brainstorming" && `💡 ${t("template.purpose_options.brainstorming")}`}
                        {formPurpose === "training" && `🎓 ${t("template.purpose_options.training")}`}
                        {formPurpose === "retrospective" && `🔁 ${t("template.purpose_options.retrospective")}`}
                        {formPurpose === "sales_pitch" && `🤝 ${t("template.purpose_options.sales_pitch")}`}
                        {formPurpose === "custom" && `⚙️ ${t("template.purpose_options.custom")}`}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isFormPurposeOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isFormPurposeOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsFormPurposeOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-full origin-top-left rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                          >
                            <div className="max-h-60 overflow-y-auto space-y-0.5">
                              {[
                                { val: "interview", label: `🎤 ${t("template.purpose_options.interview")}` },
                                { val: "report", label: `📊 ${t("template.purpose_options.report")}` },
                                { val: "project_discussion", label: `💻 ${t("template.purpose_options.project_discussion")}` },
                                { val: "team_meeting", label: `👥 ${t("template.purpose_options.team_meeting")}` },
                                { val: "brainstorming", label: `💡 ${t("template.purpose_options.brainstorming")}` },
                                { val: "training", label: `🎓 ${t("template.purpose_options.training")}` },
                                { val: "retrospective", label: `🔁 ${t("template.purpose_options.retrospective")}` },
                                { val: "sales_pitch", label: `🤝 ${t("template.purpose_options.sales_pitch")}` },
                                { val: "custom", label: `⚙️ ${t("template.purpose_options.custom")}` },
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    setFormPurpose(opt.val as SummaryTemplatePurpose);
                                    setIsFormPurposeOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                                    formPurpose === opt.val
                                      ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {formPurpose === opt.val && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1.5 sm:col-span-1 relative">
                    <label className="text-xs font-black text-slate-700 tracking-wide flex items-center gap-1">
                      <span>{t("template.field_template_style")}</span>
                      <HelpCircle className="h-3.5 w-3.5 text-slate-400" />
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsFormStyleOpen(!isFormStyleOpen)}
                      className="flex h-11 w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        {formStyle === "detailed" && t("template.style_options.detailed")}
                        {formStyle === "concise" && t("template.style_options.concise")}
                        {formStyle === "formal" && t("template.style_options.formal")}
                        {formStyle === "bullet_points" && t("template.style_options.bullet_points")}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isFormStyleOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isFormStyleOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsFormStyleOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-full origin-top-left rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                          >
                            <div className="space-y-0.5">
                              {[
                                { val: "detailed", label: t("template.style_options.detailed") },
                                { val: "concise", label: t("template.style_options.concise") },
                                { val: "formal", label: t("template.style_options.formal") },
                                { val: "bullet_points", label: t("template.style_options.bullet_points") },
                              ].map((opt) => (
                                <button
                                  key={opt.val}
                                  type="button"
                                  onClick={() => {
                                    setFormStyle(opt.val as any);
                                    setIsFormStyleOpen(false);
                                  }}
                                  className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                                    formStyle === opt.val
                                      ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                  }`}
                                >
                                  <span>{opt.label}</span>
                                  {formStyle === opt.val && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-black text-slate-700 tracking-wide">
                      {t("template.field_template_desc")}
                    </label>
                    <textarea
                      value={formDesc}
                      onChange={(e) => setFormDesc(e.target.value)}
                      placeholder={t("template.field_template_desc_placeholder")}
                      rows={2}
                      className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none shadow-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Card 4: Inline Block Editor — ẩn với template hệ thống */}
              {!selectedTemplate?.isSystem && (<div className="relative z-10 rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-5">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        {editingSecName
                          ? t("template.block_builder_edit_title")
                          : t("template.block_builder_title")}
                      </h3>
                      <p className="text-xs font-medium text-slate-400">
                        {editingSecName
                          ? t("template.block_builder_edit_subtitle")
                          : t("template.block_builder_subtitle")}
                      </p>
                    </div>
                  </div>

                  {editingSecName && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSecName(null);
                        setNewSecName("");
                        setNewSecLabel("");
                        setNewSecDesc("");
                        setNewSecBlockType("custom");
                        setNewSecAiInstructions("");
                        setNewSecPlaceholders("");
                      }}
                      className="text-xs font-bold text-slate-400 hover:text-slate-600 transition"
                    >
                      {t("template.btn_cancel_edit")}
                    </button>
                  )}
                </div>

                {secBuilderError && (
                  <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-3 text-xs font-bold text-rose-600 border border-rose-100 animate-in fade-in slide-in-from-top-1">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{secBuilderError}</span>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Premium Block Type Selection Dropdown */}
                  <div className="space-y-1.5 relative">
                    <label className="text-xs font-black text-slate-700 tracking-wide flex items-center gap-1">
                      <span>Loại khối nội dung</span>
                      <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewSecBlockTypeOpen(!isNewSecBlockTypeOpen)}
                      className="flex h-10 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 shadow-sm transition hover:bg-slate-50"
                    >
                      <span className="flex items-center gap-2">
                        {(() => {
                          const currentBlock = PREDEFINED_BLOCKS.find(b => b.type === newSecBlockType);
                          if (currentBlock) {
                            let emoji = "⚙️";
                            if (currentBlock.type === "executive_summary") emoji = "⚡";
                            if (currentBlock.type === "decisions") emoji = "✔";
                             if (currentBlock.type === "roadblocks") emoji = "🚨";
                            if (currentBlock.type === "todo_table") emoji = "📊";
                            return `${emoji} ${currentBlock.label}`;
                          }
                          return "⚙️ Khối tuỳ chỉnh";
                        })()}
                      </span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isNewSecBlockTypeOpen ? "rotate-180" : ""}`} />
                    </button>

                    <AnimatePresence>
                      {isNewSecBlockTypeOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsNewSecBlockTypeOpen(false)} />
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            transition={{ duration: 0.15 }}
                            className="absolute left-0 mt-2 w-full origin-top-left rounded-2xl border border-slate-100 bg-white/95 p-1.5 shadow-2xl backdrop-blur-xl z-50 focus:outline-none"
                          >
                            <div className="max-h-60 overflow-y-auto space-y-0.5">
                              {PREDEFINED_BLOCKS.map((block) => {
                                let emoji = "⚙️";
                                if (block.type === "executive_summary") emoji = "⚡";
                                if (block.type === "decisions") emoji = "✔";
                                if (block.type === "roadblocks") emoji = "🚨";
                                if (block.type === "todo_table") emoji = "📊";

                                return (
                                  <button
                                    key={block.type}
                                    type="button"
                                    onClick={() => {
                                      handleSelectPredefinedBlock(block);
                                      setIsNewSecBlockTypeOpen(false);
                                    }}
                                    className={`w-full flex items-center justify-between text-left px-3.5 py-2.5 rounded-xl text-xs font-black transition ${
                                      newSecBlockType === block.type
                                        ? "bg-cyan-50 text-cyan-700 border-cyan-100"
                                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-800"
                                    }`}
                                  >
                                    <div className="flex flex-col">
                                      <span className="font-extrabold text-[12px]">{emoji} {block.label}</span>
                                      {block.description && (
                                        <span className="text-[10px] font-medium text-slate-400 mt-0.5">{block.description}</span>
                                      )}
                                    </div>
                                    {newSecBlockType === block.type && <Check className="h-3.5 w-3.5 text-cyan-600 shrink-0" />}
                                  </button>
                                );
                              })}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 tracking-wide">
                      {t("template.field_block_label")}
                    </label>
                    <input
                      type="text"
                      value={newSecLabel}
                      onChange={(e) => setNewSecLabel(e.target.value)}
                      placeholder={t("template.field_block_label_placeholder")}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition shadow-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-700 tracking-wide flex items-center justify-between">
                      <span>{t("template.field_block_placeholders")}</span>
                    </label>
                    <textarea
                      value={newSecPlaceholders}
                      onChange={(e) => setNewSecPlaceholders(e.target.value)}
                      placeholder={t("template.field_block_placeholders_placeholder")}
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs font-mono font-semibold placeholder:text-slate-400 focus:border-cyan-400 outline-none transition resize-none shadow-sm"
                    />

                    {/* Clickable Placeholders Drawer Helpers */}
                    <div className="space-y-1.5 pt-1.5">
                      <p className="text-xs font-black text-slate-700 tracking-wide">
                        {t("template.helper_variables_title")}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { val: "{{meeting_title}}", key: "meeting_title" },
                          { val: "{{meeting_date}}", key: "meeting_date" },
                          { val: "{{summary}}", key: "summary" },
                          { val: "{{action_items}}", key: "action_items" },
                          { val: "{{participants}}", key: "participants" },
                          { val: "{{task}}", key: "task" },
                          { val: "{{owner}}", key: "owner" },
                          { val: "{{deadline}}", key: "deadline" },
                        ].map((item) => {
                          const friendlyLabel = t(`template.variable_labels.${item.key}`) || FRIENDLY_VARIABLES_VI[item.key];
                          const insertText = `[${friendlyLabel}]`;
                          return (
                            <button
                              key={item.val}
                              type="button"
                              onClick={() => handleInsertPlaceholder(insertText)}
                              className="inline-flex items-center rounded-lg bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 hover:border-indigo-200 text-[10px] font-black text-indigo-700 px-3 py-1 shadow-sm active:scale-95 transition-all gap-1"
                              title={`Nhấp để thêm ${insertText}`}
                            >
                              <span>✨ {friendlyLabel}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Integrated Visual Block Preview Panel */}
                  <div className="space-y-2 pt-2 border-t border-slate-100">
                    <p className="text-xs font-black text-slate-700 tracking-wide">
                      Bản xem trước của riêng khối này (Live Block Preview):
                    </p>
                    <div className="rounded-2xl border border-slate-100 bg-slate-50/30 p-4 shadow-inner min-h-[90px] flex flex-col justify-center transition-all duration-300">
                      {(!newSecLabel.trim() && !newSecPlaceholders.trim()) ? (
                        <div className="flex flex-col items-center justify-center text-slate-400 text-xs font-semibold py-4 transition-all duration-300">
                          <Sparkles className="h-5 w-5 text-slate-300 animate-pulse mb-1.5" />
                          <span>Bản xem trước khối sẽ xuất hiện tại đây khi bạn nhập dữ liệu...</span>
                        </div>
                      ) : (
                        renderCompiledBlock(newSecBlockType, newSecLabel, newSecPlaceholders)
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleAddOrUpdateSection}
                    className="flex h-10 items-center gap-2 rounded-xl bg-slate-900 px-5 text-xs font-black text-white hover:bg-slate-800 active:scale-95 shadow-md transition-all"
                  >
                    {editingSecName ? (
                      <>
                        <Check className="h-4 w-4" />
                        <span>{t("template.btn_update_block")}</span>
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        <span>{t("template.btn_add_block")}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>)}

              {/* Card 5: Active Blocks List */}
              <div className="rounded-3xl border border-white/50 bg-white/70 p-6 shadow-xl backdrop-blur-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-50 text-cyan-600">
                      <Layers className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-slate-800">
                        {t("template.active_blocks_title")} ({formSections.length})
                      </h3>
                      <p className="text-xs font-medium text-slate-400">
                        {t("template.active_blocks_subtitle")}
                      </p>
                    </div>
                  </div>
                </div>

                {formSections.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <Layers className="h-10 w-10 stroke-1 text-slate-300" />
                    <p className="mt-3 text-xs font-black text-slate-500">
                      {t("template.active_blocks_empty")}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 max-w-[280px] text-center">
                      {t("template.active_blocks_empty_desc")}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {formSections.map((sec, idx) => (
                      <div
                        key={sec.name}
                        className={`flex items-center justify-between gap-4 rounded-2xl border bg-white/60 p-4 shadow-sm transition-all ${
                          editingSecName === sec.name
                            ? "border-emerald-300 ring-2 ring-emerald-100"
                            : "border-slate-100 hover:border-cyan-100"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-50 text-[11px] font-black text-cyan-700">
                            {sec.order}
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-black text-slate-800">
                                {sec.label}
                              </p>
                            </div>
                            {sec.description && (
                              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                                {sec.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {!selectedTemplate?.isSystem && (
                          <div className="flex items-center gap-1.5">
                            {/* Reordering Up / Down buttons */}
                            <button
                              type="button"
                              onClick={() => moveSection(idx, "up")}
                              disabled={idx === 0}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition ${
                                idx === 0
                                  ? "opacity-30 cursor-not-allowed border-transparent"
                                  : "border-slate-100"
                              }`}
                              title={t("template.action_move_up")}
                            >
                              <ChevronUp className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => moveSection(idx, "down")}
                              disabled={idx === formSections.length - 1}
                              className={`flex h-8 w-8 items-center justify-center rounded-lg border text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition ${
                                idx === formSections.length - 1
                                  ? "opacity-30 cursor-not-allowed border-transparent"
                                  : "border-slate-100"
                              }`}
                              title={t("template.action_move_down")}
                            >
                              <ChevronDown className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleEditSection(sec)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 text-slate-400 hover:bg-slate-50 hover:text-slate-700 transition"
                              title={t("template.action_edit_block")}
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleRemoveSection(sec.name)}
                              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition"
                              title={t("template.action_delete_block")}
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Notion-style Real-time Live Document Preview (col-span-1) */}
            <div className="xl:col-span-1 sticky top-6">
              <div className="rounded-3xl border border-white/60 bg-white/80 shadow-2xl backdrop-blur-md overflow-hidden flex flex-col max-h-[85vh]">
                {/* Visual Header */}
                <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-cyan-300">
                      <Sparkles className="h-5 w-5 animate-pulse" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-wide">
                        {t("template.preview_title")}
                      </h4>
                      <p className="text-[11px] font-medium text-slate-300">
                        {t("template.preview_subtitle")}
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full bg-cyan-500/15 border border-cyan-400/20 px-2.5 py-0.5 text-[10px] font-black text-cyan-300">
                    {t("template.preview_live_badge")}
                  </div>
                </div>

                {/* Notion Document Body Container */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-white font-serif">
                  {/* Notion Page Metadata Mockup */}
                  <div className="border-b border-slate-100 pb-5 font-sans space-y-4">
                    <h1 className="text-xl sm:text-2xl font-bold text-slate-900 font-sans tracking-tight">
                      📝 {formName.trim() || "Tiêu đề cuộc họp (Demo)"}
                    </h1>

                    <div className="grid gap-2 text-sm font-semibold text-slate-500 pt-1">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs w-28">📅 {t("template.preview_date_label")}</span>
                        <span className="text-slate-800">26/05/2026</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-xs w-28">⚙️ {t("template.preview_template_label")}</span>
                        <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium shadow-sm ${getPurposeStyles(formPurpose, t).bg}`}>
                          {getPurposeStyles(formPurpose, t).label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Render of Active Blocks */}
                  {formSections.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3 font-sans">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 text-slate-300 border border-slate-100">
                        <Layers className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-black text-slate-400">
                        {t("template.preview_empty_title")}
                      </p>
                      <p className="text-xs text-slate-400 max-w-[240px]">
                        {t("template.preview_empty_desc")}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {formSections.map((sec) => (
                        <div key={sec.name} className="space-y-3 group/block border-l-2 border-transparent hover:border-cyan-200 pl-3 -ml-3 transition-all rounded-r">
                          {/* Block Display Header */}
                          <div className="flex items-center gap-2 font-sans text-[15px] text-slate-800 font-bold border-b border-slate-100 pb-1 w-full">
                            <span>{sec.label}</span>
                          </div>

                          {/* Block Content Compiled Mockup */}
                          <div className="text-[15px] leading-relaxed text-slate-700">
                            {renderCompiledBlock(sec.blockType, sec.label, sec.placeholders)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default TemplatesPage;
