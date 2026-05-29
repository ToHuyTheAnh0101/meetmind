import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

interface MarkdownRendererProps {
  content: string;
  highlightVariables?: boolean;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  highlightVariables = false,
}) => {
  const { t } = useTranslation();

  // Friendly Variables Mapping
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

  // Helper to format inline styles (bold, code, and variable highlighting if enabled)
  const formatInlineStyles = (text: string) => {
    if (!text) return "";

    // 1. If highlighting is enabled, split by both bold tags, raw variable tags {{...}} and friendly variables [...]
    let parts: string[];
    if (highlightVariables) {
      parts = text.split(/(\*\*[^*]+\*\*|\{\{[a-zA-Z0-9_]+\}\}|\[[^\]]+\])/g);
    } else {
      parts = text.split(/(\*\*[^*]+\*\*)/g);
    }

    return parts.map((part, idx) => {
      // Bold Formatting
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-slate-800">
            {formatInlineStyles(part.slice(2, -2))}
          </strong>
        );
      }

      // Variable Highlighting (Only if enabled)
      if (highlightVariables) {
        let varName: string | null = null;
        const matchRaw = part.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
        if (matchRaw) {
          varName = matchRaw[1];
        } else {
          const matchFriendly = part.match(/^\[([^\]]+)\]$/);
          if (matchFriendly) {
            const friendlyName = matchFriendly[1];
            const foundKey = Object.keys(FRIENDLY_VARIABLES_VI).find(key => 
              FRIENDLY_VARIABLES_VI[key] === friendlyName || 
              FRIENDLY_VARIABLES_EN[key] === friendlyName ||
              t(`template.variable_labels.${key}`) === friendlyName
            );
            if (foundKey) varName = foundKey;
          }
        }

        if (varName) {
          let label = varName;
          let colorClasses = "bg-slate-100 text-slate-600 border-slate-200";
          
          if (varName === "meeting_title") {
            colorClasses = "bg-cyan-50 text-cyan-700 border-cyan-200 ring-cyan-100";
            label = t("template.variable_labels.meeting_title") || "Tiêu đề";
          } else if (varName === "meeting_date") {
            colorClasses = "bg-violet-50 text-violet-700 border-violet-200 ring-violet-100";
            label = t("template.variable_labels.meeting_date") || "Ngày họp";
          } else if (varName === "summary") {
            colorClasses = "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100";
            label = t("template.variable_labels.summary") || "Tóm tắt";
          } else if (varName === "action_items") {
            colorClasses = "bg-rose-50 text-rose-700 border-rose-200 ring-rose-100";
            label = t("template.variable_labels.action_items") || "Các đầu việc";
          } else if (varName === "participants") {
            colorClasses = "bg-teal-50 text-teal-700 border-teal-200 ring-teal-100";
            label = t("template.variable_labels.participants") || "Người tham gia";
          } else if (varName === "task") {
            colorClasses = "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100";
            label = t("template.variable_labels.task") || "Nhiệm vụ";
          } else if (varName === "owner") {
            colorClasses = "bg-indigo-50 text-indigo-700 border-indigo-200 ring-indigo-100";
            label = t("template.variable_labels.owner") || "Thành viên";
          } else if (varName === "deadline") {
            colorClasses = "bg-rose-50 text-rose-700 border-rose-200 ring-rose-100";
            label = t("template.variable_labels.deadline") || "Hạn chót";
          }

          return (
            <span
              key={idx}
              className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[10px] font-black shadow-sm mx-0.5 ${colorClasses}`}
            >
              {label}
            </span>
          );
        }
      }

      // Inline Code Formatting (`code`)
      const codeParts = part.split(/(`[^`]+`)/g);
      return codeParts.map((subPart, subIdx) => {
        if (subPart.startsWith("`") && subPart.endsWith("`")) {
          return (
            <code
              key={`${idx}-${subIdx}`}
              className="bg-slate-100/80 border border-slate-200 text-slate-700 px-1.5 py-0.5 rounded-lg font-mono text-[11px] font-semibold"
            >
              {subPart.slice(1, -1)}
            </code>
          );
        }
        return subPart;
      });
    });
  };

  const renderTable = (rows: string[][], tableIdx: number) => {
    if (rows.length === 0) return null;
    
    const cleanRows = rows.filter(row => {
      const joined = row.join("");
      return !joined.includes("---") && !joined.includes(":::") && joined.trim().length > 0;
    });

    if (cleanRows.length === 0) return null;

    const headers = cleanRows[0];
    const dataRows = cleanRows.slice(1);

    return (
      <div key={`table-${tableIdx}`} className="my-4 overflow-x-auto rounded-2xl border border-slate-100 bg-white/70 p-0.5 shadow-md animate-in fade-in duration-300">
        <table className="min-w-full divide-y divide-slate-100 text-left text-[12px] font-sans">
          <thead className="bg-slate-50/80 text-slate-500 font-black">
            <tr>
              {headers.map((h, i) => (
                <th key={i} className="px-4 py-2.5 whitespace-nowrap">
                  {formatInlineStyles(h || `Cột ${i + 1}`)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-55 text-slate-600 font-semibold">
            {dataRows.length > 0 ? (
              dataRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                  {headers.map((_, colIdx) => (
                    <td key={colIdx} className="px-4 py-2.5">
                      {formatInlineStyles(row[colIdx] || "")}
                    </td>
                  ))}
                </tr>
              ))
            ) : highlightVariables ? (
              // Empty template row with variables placeholder badges (Only in design mode)
              <tr className="bg-white">
                {headers.map((h, colIdx) => {
                  let prefillValue = "[Nội dung]";
                  const headerLower = h.toLowerCase();
                  if (headerLower.includes("nhiệm vụ") || headerLower.includes("công việc") || headerLower.includes("task")) {
                    prefillValue = "[Nhiệm vụ]";
                  } else if (headerLower.includes("người") || headerLower.includes("ai") || headerLower.includes("phụ trách") || headerLower.includes("owner") || headerLower.includes("nhận") || headerLower.includes("thành viên")) {
                    prefillValue = "[Thành viên]";
                  } else if (headerLower.includes("hạn") || headerLower.includes("deadline") || headerLower.includes("ngày") || headerLower.includes("chót")) {
                    prefillValue = "[Hạn chót]";
                  }
                  return (
                    <td key={colIdx} className="px-4 py-2.5 text-slate-400 font-sans font-medium">
                      {formatInlineStyles(prefillValue)}
                    </td>
                  );
                })}
              </tr>
            ) : (
              <tr>
                <td colSpan={headers.length} className="px-4 py-4 text-center text-slate-400 font-sans font-medium">
                  {t("template.no_data") || "Không có dữ liệu"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    );
  };

  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  
  let currentTableRows: string[][] = [];
  let isInsideTable = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Table Parser
    if (trimmed.startsWith("|")) {
      isInsideTable = true;
      let cells = line.split("|").map(c => c.trim());
      if (line.startsWith("|")) cells.shift();
      if (line.endsWith("|") && cells[cells.length - 1] === "") cells.pop();
      currentTableRows.push(cells);
      continue;
    } else if (isInsideTable) {
      elements.push(renderTable(currentTableRows, i));
      currentTableRows = [];
      isInsideTable = false;
    }

    if (!trimmed) {
      elements.push(<div key={i} className="h-2" />);
      continue;
    }

    // 2. Headers Parser (# to ######)
    const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headerMatch) {
      const level = headerMatch[1].length;
      const headingContent = headerMatch[2];
      const sizeClass = 
        level === 1 ? "text-xl font-extrabold text-slate-900 mt-6 mb-3" :
        level === 2 ? "text-lg font-extrabold text-slate-800 mt-5 mb-2.5" :
        level === 3 ? "text-base font-black text-slate-900 mt-4 mb-2 flex items-center gap-2" :
        "text-sm font-black text-slate-700 mt-3 mb-1.5";
      
      elements.push(
        <div key={i} className={`${sizeClass} font-sans`}>
          {level === 3 && (
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-500 shrink-0" />
          )}
          {formatInlineStyles(headingContent)}
        </div>
      );
      continue;
    }

    // 3. Lists Parser (Checklists, Bullet points & Ordered lists)
    const todoMatch = line.match(/^(\s*)[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (todoMatch) {
      const indent = todoMatch[1].length;
      const isChecked = todoMatch[2].toLowerCase() === "x";
      const todoContent = todoMatch[3];
      const plClass = indent >= 4 ? "pl-10" : indent >= 2 ? "pl-7" : "pl-4";
      elements.push(
        <div key={i} className={`flex items-center gap-2.5 text-sm font-semibold text-slate-700 ${plClass} py-0.5 animate-in slide-in-from-left-1 duration-150`}>
          <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-all ${
            isChecked 
              ? "bg-cyan-500 border-cyan-500 text-white" 
              : "border-slate-300 bg-white hover:border-cyan-500 shadow-sm"
          }`}>
            {isChecked && (
              <svg className="h-2.5 w-2.5 stroke-current stroke-[3] fill-none" viewBox="0 0 24 24">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            )}
          </span>
          <span className={`leading-relaxed font-sans ${isChecked ? "text-slate-400 line-through font-medium" : ""}`}>
            {formatInlineStyles(todoContent)}
          </span>
        </div>
      );
      continue;
    }

    const listMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (listMatch) {
      const indent = listMatch[1].length;
      const listContent = listMatch[2];
      const plClass = indent >= 4 ? "pl-10" : indent >= 2 ? "pl-7" : "pl-4";
      
      elements.push(
        <div key={i} className={`flex items-start text-sm font-semibold text-slate-700 ${plClass} py-0.5 animate-in slide-in-from-left-1 duration-150`}>
          <span className="leading-relaxed font-sans">{formatInlineStyles(listContent)}</span>
        </div>
      );
      continue;
    }

    const numListMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (numListMatch) {
      const indent = numListMatch[1].length;
      const listContent = numListMatch[2];
      const number = line.match(/^\s*(\d+)\./)?.[1] || "1";
      const plClass = indent >= 4 ? "pl-10" : indent >= 2 ? "pl-7" : "pl-4";
      elements.push(
        <div key={i} className={`flex items-start gap-2 text-sm font-semibold text-slate-700 ${plClass} py-0.5 animate-in slide-in-from-left-1 duration-150`}>
          <span className="text-cyan-500 font-black shrink-0 text-xs mt-0.5">{number}.</span>
          <span className="leading-relaxed font-sans">{formatInlineStyles(listContent)}</span>
        </div>
      );
      continue;
    }

    // 4. Paragraph Fallback
    elements.push(
      <p key={i} className="text-sm text-slate-600 pl-4 leading-relaxed font-medium font-sans">
        {formatInlineStyles(line)}
      </p>
    );
  }

  // Handle remaining table rows if at end of file
  if (isInsideTable && currentTableRows.length > 0) {
    elements.push(renderTable(currentTableRows, lines.length));
  }

  return (
    <div className="space-y-3 text-slate-700 leading-relaxed font-medium font-sans">
      {elements}
    </div>
  );
};

export default MarkdownRenderer;
