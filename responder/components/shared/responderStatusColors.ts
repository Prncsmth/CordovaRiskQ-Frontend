// components/responder/responderStatusColors.ts
// Shared color-per-roster-status mapping so "joined" (amber), "on the way"
// (blue), and "arrived" (green) mean the same thing everywhere a
// responder's roster status shows up -- TeamMemberRow's teammate chips and
// IncidentCard's own-status chip on the dashboard.
import type { ColorPalette } from "@/theme";
import type { ResponderStatus } from "@/responder/types/responder";

export function responderStatusColor(
  COLORS: ColorPalette,
  status: ResponderStatus,
): string {
  switch (status) {
    case "joined":
      return COLORS.warning;
    case "on_the_way":
      return COLORS.secondary;
    case "arrived":
      return COLORS.success;
  }
}
