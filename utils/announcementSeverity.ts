// utils/announcementSeverity.ts
// How an announcement's severity looks in the app. The value comes from the
// backend's `priority` field (Information | Warning | Critical), set by the
// publishing admin -- never inferred from the text. Used by the Home /
// Dashboard banner and the announcement detail screen so both agree.
import type { Ionicons } from "@expo/vector-icons";

import type { ColorPalette } from "@/theme";

export type AnnouncementSeverity = "Information" | "Warning" | "Critical";

// An older backend sends Normal/Urgent -- the same mapping the backend
// uses: Normal is Information, Urgent is Warning (never Critical).
export function toSeverity(value: string | null | undefined): AnnouncementSeverity {
  if (value === "Information" || value === "Warning" || value === "Critical") return value;
  if (value === "Urgent") return "Warning";
  return "Information";
}

export type SeverityStyle = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  // Icon / label / accent color, and its light tint for badges.
  color: string;
  tint: string;
  // Critical only: a stronger card (red accent, two-line title).
  prominent: boolean;
};

export function severityStyle(severity: AnnouncementSeverity, COLORS: ColorPalette): SeverityStyle {
  switch (severity) {
    case "Critical":
      return {
        label: "CRITICAL ALERT",
        icon: "alert-circle",
        color: COLORS.danger,
        tint: `${COLORS.danger}1A`,
        prominent: true,
      };
    case "Warning":
      return {
        label: "Warning",
        icon: "warning-outline",
        color: COLORS.warning,
        tint: COLORS.warningBg,
        prominent: false,
      };
    default:
      return {
        label: "Information",
        icon: "information-circle-outline",
        color: COLORS.tide,
        tint: COLORS.tideTint,
        prominent: false,
      };
  }
}
