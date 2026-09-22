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

// Solid (not "-outline") icons -- matching the rest of the app's flat,
// no-circle-background icon treatment, a solid glyph shows far more of its
// own color than a thin outline stroke, so the type/urgency reads clearly
// at a glance now that there's no tinted circle behind it either.
const ICON_BY_TYPE: Record<NotificationType, IconName> = {
  announcement: "megaphone",
  incident_status: "document-text",
  tide_risk: "water",
  new_incident: "alert-circle",
  roster_update: "people",
  team_ring: "alarm",
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

// The icon prefers the report's category (same source as ReportHistoryCard
// so the two screens agree) when the text actually names one (e.g. "Your
// Flood report..."); a plain status update like "Report resolved" doesn't
// name a category, so it falls back to an icon for the STATUS itself
// (checkmark/car/flag/etc.) instead of the generic document icon -- every
// row should look like what actually happened, never just "notes."
function getIncidentStatusVisual(item: AppNotification): { icon: IconName; color: string } {
  const text = `${item.title} ${item.body}`.toLowerCase();
  const category = detectCategoryVisual(text);

  if (text.includes("resolved")) {
    return { icon: category?.icon ?? "checkmark-done", color: GREEN };
  }
  if (text.includes("cancelled") || text.includes("canceled")) {
    return { icon: category?.icon ?? "close-circle", color: RED };
  }
  if (text.includes("arrived")) {
    return { icon: category?.icon ?? "flag", color: GREEN };
  }
  if (text.includes("on the way") || text.includes("on_the_way") || text.includes("en route")) {
    // Matches the app's own responder-orange used on the Track Responder
    // screen (marker/route/icon all COLORS.secondary) -- en route is worth
    // a glance, not a "nothing to act on yet" gray.
    return { icon: category?.icon ?? "car", color: ORANGE };
  }
  if (text.includes("assigned")) {
    // A responder accepting the report is good news -- the report is
    // getting a response, same "this is working" tier as resolved/arrived.
    return { icon: category?.icon ?? "person-add", color: GREEN };
  }
  return { icon: category?.icon ?? ICON_BY_TYPE.incident_status, color: category?.color ?? GRAY };
}

// Every announcement is red regardless of urgency -- it's a broadcast from
// authorities, always worth a look, not just the ones that happen to use
// urgent-sounding wording. The icon still tells urgent apart from routine.
function getAnnouncementVisual(item: AppNotification): { icon: IconName; color: string } {
  const text = `${item.title} ${item.body}`.toLowerCase();
  const isUrgent =
    text.includes("urgent") ||
    text.includes("emergency") ||
    text.includes("immediate") ||
    text.includes("evacuate");
  return { icon: isUrgent ? "warning" : ICON_BY_TYPE.announcement, color: RED };
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
    icon: ICON_BY_TYPE[item.type] ?? "notifications",
    color: TYPE_COLOR[item.type] ?? GRAY,
  };
}

// Icon + color always reflect the notification's type/outcome, whether or
// not it's been read -- the icon itself renders bare (no circle background,
// same flat treatment as the rest of the app). `bg`/`border` are a tint of
// that same color for the card's own border and the "New" pill, a bit
// lighter once read, so they never mismatch the glyph color.
export function getNotificationReadDisplay(item: AppNotification, COLORS: ColorPalette) {
  const { icon, color } = getNotificationVisual(item);
  if (!item.read) {
    return { icon, color, bg: `${color}33`, border: color };
  }
  return { icon, color, bg: `${color}26`, border: COLORS.borderMuted };
}
