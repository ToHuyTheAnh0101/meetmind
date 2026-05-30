export const FRIENDLY_VARIABLES_VI: { [key: string]: string } = {
  meeting_title: "Tiêu đề cuộc họp",
  meeting_date: "Ngày họp",
  summary: "Tóm tắt chung",
  action_items: "Các đầu việc",
  participants: "Người tham gia",
  task: "Nhiệm vụ",
  owner: "Thành viên",
  deadline: "Hạn chót"
};

export const FRIENDLY_VARIABLES_EN: { [key: string]: string } = {
  meeting_title: "Meeting Title",
  meeting_date: "Meeting Date",
  summary: "General Summary",
  action_items: "Action Items",
  participants: "Participants",
  task: "Task Name",
  owner: "Owner",
  deadline: "Deadline"
};

export const convertRawToFriendlyPlaceholders = (text: string, t: any): string => {
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

export const convertFriendlyToRawPlaceholders = (text: string, t: any): string => {
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
