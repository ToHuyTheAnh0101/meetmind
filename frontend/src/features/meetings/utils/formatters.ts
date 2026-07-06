import { MeetLog } from "../types";

export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString([], {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function formatTimeOnly(dateOrTs: string | number | Date): string {
  const d = new Date(dateOrTs);
  return d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(iso: string | null | undefined, isVi: boolean): string {
  if (!iso) return "--";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "--";
  const locale = isVi ? "vi-VN" : "en-US";
  const time = d.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  const date = d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
  return `${time} - ${date}`;
}

export function formatMeetingStartTime(iso: string, isVi: boolean): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso;
    const locale = isVi ? "vi-VN" : "en-US";
    return date.toLocaleString(locale, {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: isVi ? "long" : "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function formatDuration(ms: number, isVi: boolean): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return isVi
      ? `${hours} giờ ${minutes} phút ${seconds} giây`
      : `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return isVi
      ? `${minutes} phút ${seconds} giây`
      : `${minutes}m ${seconds}s`;
  }
  return isVi
    ? `${seconds} giây`
    : `${seconds}s`;
}

export function getUserDisplayName(log: MeetLog): string {
  const user = log.triggeredByUser;
  if (user) {
    const first = user.firstName || "";
    const last = user.lastName || "";
    const full = `${first} ${last}`.trim();
    if (full) return full;
    if (user.email) return user.email;
  }

  const meta = log.metadata;
  if (meta) {
    if (typeof meta.displayName === "string" && meta.displayName.trim()) {
      return meta.displayName;
    }
    if (typeof meta.email === "string" && meta.email.trim()) {
      return meta.email;
    }
  }

  return "Unknown";
}
