import { APP_TIMEZONE, formatDate, parseDate } from "@/lib/format";

export const THREAD_POLL_MS = 4500;
export const INBOX_POLL_MS = 15000;

export function messageDayKey(value: string) {
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function messageDayLabel(value: string, now = new Date()) {
  const key = messageDayKey(value);
  if (!key) return null;
  if (key === messageDayKey(now.toISOString())) return "Today";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (key === messageDayKey(yesterday.toISOString())) return "Yesterday";
  return formatDate(value);
}

export function isOutgoingMessage(authorLabel: string | null | undefined, viewerLabel: string | null | undefined) {
  const author = authorLabel?.trim() ?? "";
  const viewer = viewerLabel?.trim() ?? "";
  if (!author || !viewer) return false;
  return author === viewer;
}

export function groupMessagesByDay<T extends { created_at: string }>(posts: T[]) {
  const groups: Array<{ key: string; label: string; posts: T[] }> = [];
  for (const post of posts) {
    const key = messageDayKey(post.created_at) || "unknown";
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.posts.push(post);
    } else {
      groups.push({ key, label: messageDayLabel(post.created_at) || key, posts: [post] });
    }
  }
  return groups;
}

export function isNearBottom(scroller: HTMLElement, threshold = 96) {
  return scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight <= threshold;
}
