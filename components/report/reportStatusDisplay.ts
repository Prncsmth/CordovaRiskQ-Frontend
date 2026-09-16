import type { ReportStatus } from "@/services/report.service";
import type { ColorPalette } from "@/theme";

export function getReportStatusDisplay(status: ReportStatus, COLORS: ColorPalette) {
  switch (status) {
    case "resolved":
      return { label: "Resolved", color: COLORS.success, bg: COLORS.successBg };
    case "cancelled":
      return { label: "Cancelled", color: COLORS.textTertiary, bg: COLORS.borderMuted };
    case "assigned":
      return { label: "Responder Assigned", color: COLORS.tide, bg: COLORS.tideTint };
    case "on_the_way":
      // Matches the responder-orange used on the Track Responder screen and
      // the "Responder en route" notification icon (COLORS.secondary), not
      // the tide teal used for the other assigned/arrived states.
      return { label: "Responder On The Way", color: COLORS.secondary, bg: `${COLORS.secondary}1A` };
    case "arrived":
      return { label: "Responder Arrived", color: COLORS.tide, bg: COLORS.tideTint };
    case "pending":
    default:
      return { label: "Pending Review", color: COLORS.warning, bg: COLORS.warningBg };
  }
}
