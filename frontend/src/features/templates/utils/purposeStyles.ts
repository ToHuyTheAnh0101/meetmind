import { SummaryTemplatePurpose } from "@/types/api";

export interface PurposeStyles {
  bg: string;
  gradient: string;
  label: string;
}

export const getPurposeStyles = (purpose: SummaryTemplatePurpose, t: any): PurposeStyles => {
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
