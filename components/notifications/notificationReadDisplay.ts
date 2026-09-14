import type { Ionicons } from "@expo/vector-icons";

import { getCategoryVisual } from "@/components/report/categories";
import type { AppNotification, NotificationType } from "@/services/notification.service";
import type { ColorPalette } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

// A vivid, clearly-readable palette for notification icons specifically --
// the app's own COLORS.danger/warning/success/tide are dark, muted brand
// tones (built for text/borders on a white card), which is why every icon
// read as roughly the same weight regardless of type, and an earlier
// pastel-tinted pass made red/green/etc. too washed-out to register at a
// glance. These stay fixed regardless of the app's light/dark theme, same
// reasoning as the map's USER_LOCATION_BLUE.
const RED = "#EF4444"; // urgent / SOS / cancelled
const ORANGE = "#F97316"; // routine announcement / caution
const GREEN = "#22C55E"; // resolved / arrived
const GRAY = "#9CA3AF"; // in progress, nothing to act on yet

const ICON_BY_TYPE: Record<NotificationType, IconName> = {
  announcement: "megaphone-outline",
  incident_status: "document-text-outline",
  tide_risk: "water-outline",
  new_incident: "alert-circle-outline",
  roster_update: "people-outline",
  team_ring: "alarm-outline",
};

// AppNotification has no structured category field, only free-text
// title/body -- sniff for the same category vocabulary as
// components/report/categories.ts (Flood/Fire/Medical Emergency/Road
// Accident/Other/SOS Alert) so the icon matches what the report is
// actually about, the same way ReportHistoryCard's icon does, instead of
// one generic document icon for every status update.
function detectCategoryVisual(text: string): { icon: IconName; color: string } | null {
  if (text.includes("flood")) return getCategoryVisual("flood");
  if (text.includes("fire")) return getCategoryVisual("fire");
  if (text.includes("medical")) return getCategoryVisual("medical");
  if (text.includes("road accident") || text.includes("accident")) {
    return getCategoryVisual("road-accident");
  }
  if (text.includes("sos")) return getCategoryVisual("sos");
  if (text.includes("other")) return getCategoryVisual("other");
  return null;
}

// The icon reflects the report's category (same source as ReportHistoryCard
// so the two screens agree); the color reflects the lifecycle status
// sniffed from the text (see services/report.service.ts's toReportStatus
// for the actual status vocabulary) -- so "which report" and "what
// happened to it" are both visible at a glance instead of collapsing into
// one generic icon.
function getIncidentStatusVisual(item: AppNotification): { icon: IconName; color: string } {
  const text = `${item.title} ${item.body}`.toLowerCase();
  const category = detectCategoryVisual(text);
  const icon = category?.icon ?? ICON_BY_TYPE.incident_status;

  if (text.includes("resolved")) return { icon, color: GREEN };
  if (text.includes("cancelled") || text.includes("canceled")) return { icon, color: RED };
  if (text.includes("arrived")) return { icon, color: GREEN };
  if (text.includes("on the way") || text.includes("on_the_way") || text.includes("en route")) {
    return { icon, color: GRAY };
  }
  if (text.includes("assigned")) return { icon, color: GRAY };
  return { icon, color: category?.color ?? GRAY };
}

// A normal announcement still gets orange (worth a glance), a genuinely
// urgent one (typhoon/evacuate-type language) gets red -- same binary as
// SOS/incident alerts below, not a three-way split.
function getAnnouncementVisual(item: AppNotification): { icon: IconName; color: string } {
  const text = `${item.title} ${item.body}`.toLowerCase();
  if (
    text.includes("urgent") ||
    text.includes("emergency") ||
    text.includes("immediate") ||
    text.includes("evacuate")
  ) {
    return { icon: "warning-outline", color: RED };
  }
  return { icon: ICON_BY_TYPE.announcement, color: ORANGE };
}

function getNotificationVisual(item: AppNotification): { icon: IconName; color: string } {
  if (item.type === "incident_status") {
    return getIncidentStatusVisual(item);
  }
  if (item.type === "announcement") {
    return getAnnouncementVisual(item);
  }
  if (item.type === "new_incident") {
    // A new report a responder needs to act on -- shows which kind of
    // emergency it is (same category icon as everywhere else) but always
    // stays red/urgent regardless of category, since "a new one just came
    // in" is the urgent part, not the category itself.
    const category = detectCategoryVisual(`${item.title} ${item.body}`.toLowerCase());
    return { icon: category?.icon ?? ICON_BY_TYPE.new_incident, color: RED };
  }

  // team_ring is "an SOS needs a responder right now" -- red, same as an
  // urgent announcement. roster_update is routine team scheduling, no
  // urgency to signal.
  const TYPE_COLOR: Record<NotificationType, string> = {
    announcement: ORANGE,
    incident_status: GRAY,
    tide_risk: ORANGE,
    new_incident: RED,
    roster_update: GRAY,
    team_ring: RED,
  };
  return {
    icon: ICON_BY_TYPE[item.type] ?? "notifications-outline",
    color: TYPE_COLOR[item.type] ?? GRAY,
  };
}

// Icon + color always reflect the notification's type/outcome, whether or
// not it's been read. The icon circle's background is always a tint of
// that same color too -- just a bit lighter once read -- so it never
// mismatches the glyph color by falling back to plain gray, and stays
// clearly visible as a highlight rather than a barely-there wash.
export function getNotificationReadDisplay(item: AppNotification, COLORS: ColorPalette) {
  const { icon, color } = getNotificationVisual(item);
  if (!item.read) {
    return { icon, color, bg: `${color}33`, border: color };
  }
  return { icon, color, bg: `${color}26`, border: COLORS.borderMuted };
}
