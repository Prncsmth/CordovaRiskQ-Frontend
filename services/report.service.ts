// services/report.service.ts
import { apiPost } from "./api";
import type { CategoryId } from "@/components/report/categories";

type IncidentApiRow = { id: string };

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

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: "Resolved" | "Reviewing";
  statusColor: string;
  statusBg: string;
};

const HISTORY: ReportHistoryItem[] = [];

export async function getReportHistory(): Promise<ReportHistoryItem[]> {
  return HISTORY;
}
