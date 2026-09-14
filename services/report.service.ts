// services/report.service.ts
import { File } from "expo-file-system";

import { API_BASE_URL, apiGet, apiPost, type ApiError } from "./api";
import { CATEGORY_LABELS, type CategoryId } from "@/components/report/categories";
import { formatDate } from "@/utils/formatter";

type IncidentApiRow = {
  id: string;
  category: string;
  locationLabel: string;
  status: string;
  createdAt: string;
};

export function photoFileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function guessPhotoMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

// Contract assumed pending backend confirmation — see
// docs/superpowers/specs/2026-09-12-report-photo-evidence-design.md.
// Until the backend implements this route, calls here fail (404/network
// error), which correctly drives the "upload failed" UI path rather than
// silently pretending success.
export async function uploadReportPhoto(
  token: string,
  uri: string,
  fileName: string,
): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append("photo", {
    uri,
    name: fileName,
    type: guessPhotoMimeType(fileName),
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/incidents/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Photo upload failed with status ${response.status}`);
  }

  const data = (await response.json()) as { success: true; photoUrl: string };
  return { photoUrl: data.photoUrl };
}

export async function createReport(
  token: string,
  payload: {
    category: CategoryId;
    details: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
    reporterLatitude: number;
    reporterLongitude: number;
    photoUrl?: string;
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
  categoryId: string;
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
    categoryId: row.category,
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
  } catch (err) {
    // Only a real 404 means "no such report" -- a network/server failure
    // should propagate so the screen can distinguish and offer a retry
    // instead of silently looking like the report doesn't exist.
    if ((err as Partial<ApiError>)?.status === 404) {
      return undefined;
    }
    throw err;
  }
}
