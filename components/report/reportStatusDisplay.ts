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
      return { label: "Responder On The Way", color: COLORS.tide, bg: COLORS.tideTint };
    case "arrived":
      return { label: "Responder Arrived", color: COLORS.tide, bg: COLORS.tideTint };
    case "pending":
    default:
      return { label: "Pending Review", color: COLORS.warning, bg: COLORS.warningBg };
  }
}
