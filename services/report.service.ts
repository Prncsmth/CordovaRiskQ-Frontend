// services/report.service.ts
import { apiGet, apiPost } from "./api";
import type { CategoryId } from "@/components/report/categories";
import { CATEGORY_LABELS } from "./incident.service";
import { formatDate } from "@/utils/formatter";

type IncidentApiRow = {
  id: string;
  category: string;
  locationLabel: string;
  status: string;
  createdAt: string;
};

export async function createReport(
  token: string,
  payload: {
    category: CategoryId;
    details: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
  },
) {
  const response = await apiPost<{ success: true; incident: IncidentApiRow }>(
    "/api/incidents",
    payload,
    token,
  );
  return { success: true, ref: response.incident.id.slice(0, 8).toUpperCase() };
}

export type ReportHistoryStatus = "reviewing" | "resolved" | "cancelled";

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: ReportHistoryStatus;
};

function toHistoryStatus(status: string): ReportHistoryStatus {
  if (status === "completed") return "resolved";
  if (status === "cancelled") return "cancelled";
  return "reviewing";
}

function toHistoryItem(row: IncidentApiRow): ReportHistoryItem {
  return {
    id: row.id,
    category: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    date: formatDate(row.createdAt),
    ref: row.id.slice(0, 8).toUpperCase(),
    status: toHistoryStatus(row.status),
  };
}

export async function getReportHistory(token: string): Promise<ReportHistoryItem[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents/mine",
    token,
  );
  return response.incidents.map(toHistoryItem);
}
