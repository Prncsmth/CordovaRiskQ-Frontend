import type { Ionicons } from "@expo/vector-icons";

import type { AppNotification, NotificationType } from "@/services/notification.service";
import type { ColorPalette } from "@/theme";

type IconName = keyof typeof Ionicons.glyphMap;

const ICON_BY_TYPE: Record<NotificationType, IconName> = {
  announcement: "megaphone-outline",
  incident_status: "document-text-outline",
  tide_risk: "water-outline",
  new_incident: "alert-circle-outline",
  roster_update: "people-outline",
  team_ring: "alarm-outline",
};

// incident_status notifications carry no structured status field, only
// free-text title/body -- sniff for the report lifecycle keywords (see
// services/report.service.ts's toReportStatus for the actual status
// vocabulary) so the icon and color both reflect what actually happened
// instead of every status update looking like a generic document.
function getIncidentStatusVisual(
  item: AppNotification,
  COLORS: ColorPalette,
): { icon: IconName; color: string } {
  const text = `${item.title} ${item.body}`.toLowerCase();
  if (text.includes("resolved")) {
    return { icon: "checkmark-done-outline", color: COLORS.success };
  }
  if (text.includes("cancelled") || text.includes("canceled")) {
    return { icon: "close-circle-outline", color: COLORS.danger };
  }
  if (text.includes("arrived")) {
    return { icon: "flag-outline", color: COLORS.tide };
  }
  if (text.includes("on the way") || text.includes("on_the_way") || text.includes("en route")) {
    return { icon: "car-outline", color: COLORS.tide };
  }
  if (text.includes("assigned")) {
    return { icon: "person-add-outline", color: COLORS.tide };
  }
  return { icon: ICON_BY_TYPE.incident_status, color: COLORS.tide };
}

function getNotificationVisual(
  item: AppNotification,
  COLORS: ColorPalette,
): { icon: IconName; color: string } {
  if (item.type === "incident_status") {
    return getIncidentStatusVisual(item, COLORS);
  }

  const TYPE_COLOR: Record<NotificationType, string> = {
    announcement: COLORS.tide,
    incident_status: COLORS.tide,
    tide_risk: COLORS.warning,
    new_incident: COLORS.danger,
    roster_update: COLORS.tide,
    team_ring: COLORS.warning,
  };
  return {
    icon: ICON_BY_TYPE[item.type] ?? "notifications-outline",
    color: TYPE_COLOR[item.type] ?? COLORS.tide,
  };
}

// Icon + color always reflect the notification's type/outcome, whether or
// not it's been read. The icon circle's background is always a tint of
// that same color too -- just lighter once read -- so it never mismatches
// the glyph color by falling back to plain gray.
export function getNotificationReadDisplay(item: AppNotification, COLORS: ColorPalette) {
  const { icon, color } = getNotificationVisual(item, COLORS);
  if (!item.read) {
    return { icon, color, bg: `${color}1A`, border: color };
  }
  return { icon, color, bg: `${color}0D`, border: COLORS.borderMuted };
}
