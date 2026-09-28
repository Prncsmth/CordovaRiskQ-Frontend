export function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleDateString();
}

export function formatTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

// "Sep 28, 2026 · 3:27 PM" -- an announcement is a dated broadcast (see
// NotificationRow.tsx's announcement branch and AdvisoryBanner.tsx), so it
// always shows a complete, unambiguous date instead of a relative "2h ago"
// that goes stale, or a short date that drops the year.
export function formatShortDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  const datePart = date.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const timePart = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return `${datePart} · ${timePart}`;
}

export function formatRelativeTime(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  const diffMinutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return formatDate(date);
}
