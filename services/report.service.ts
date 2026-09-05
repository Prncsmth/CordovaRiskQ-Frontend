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

export type ReportStatus =
  | "pending"
  | "assigned"
  | "on_the_way"
  | "arrived"
  | "resolved"
  | "cancelled";

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: ReportStatus;
};

function toReportStatus(status: string): ReportStatus {
  switch (status) {
    case "lobby":
      return "assigned";
    case "on_the_way":
      return "on_the_way";
    case "arrived":
      return "arrived";
    case "completed":
      return "resolved";
    case "cancelled":
      return "cancelled";
    default:
      return "pending";
  }
}

function toHistoryItem(row: IncidentApiRow): ReportHistoryItem {
  return {
    id: row.id,
    category: CATEGORY_LABELS[row.category] ?? row.category,
    location: row.locationLabel,
    date: formatDate(row.createdAt),
    ref: row.id.slice(0, 8).toUpperCase(),
    status: toReportStatus(row.status),
  };
}

export async function getReportHistory(token: string): Promise<ReportHistoryItem[]> {
  const response = await apiGet<{ success: true; incidents: IncidentApiRow[] }>(
    "/api/incidents/mine",
    token,
  );
  return response.incidents.map(toHistoryItem);
}

export type ReportDetail = {
  id: string;
  category: string;
  details: string | null;
  location: string;
  latitude: number | null;
  longitude: number | null;
  status: ReportStatus;
  ref: string;
  submittedDate: string;
  updatedDate: string;
};

type IncidentDetailApiRow = {
  id: string;
  category: string;
  details: string | null;
  locationLabel: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

export async function getReportDetailById(
  token: string,
  id: string,
): Promise<ReportDetail | undefined> {
  try {
    const response = await apiGet<{ success: true; incident: IncidentDetailApiRow }>(
      `/api/incidents/${id}`,
      token,
    );
    const row = response.incident;
    return {
      id: row.id,
      category: CATEGORY_LABELS[row.category] ?? row.category,
      details: row.details,
      location: row.locationLabel,
      latitude: row.latitude,
      longitude: row.longitude,
      status: toReportStatus(row.status),
      ref: row.id.slice(0, 8).toUpperCase(),
      submittedDate: formatDate(row.createdAt),
      updatedDate: formatDate(row.updatedAt),
    };
  } catch {
    return undefined;
  }
}
