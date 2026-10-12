// services/report.service.ts
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";

import { API_BASE_URL, apiDelete, apiGet, apiPost, type ApiError } from "./api";
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

export function guessPhotoMimeType(fileName: string): string {
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

// A phone camera photo is 3-6 MB; shrunk to at most 1280 px on its long
// edge as a JPEG it's ~150-350 KB -- still clear enough for a responder to
// see the scene, but quick to send on mobile data and light on the user's
// data plan. Best-effort: if shrinking fails, the original is sent (the
// backend still caps its size).
export const PHOTO_MAX_EDGE_PX = 1280;
export const PHOTO_JPEG_QUALITY = 0.6;

export async function shrinkReportPhoto(
  uri: string,
  fileName: string,
  maxEdgePx: number = PHOTO_MAX_EDGE_PX,
): Promise<{ uri: string; fileName: string }> {
  // Native image memory is freed as soon as the JPEG is written, not left
  // for the garbage collector -- a full-size photo is tens of MB decoded.
  const toRelease: { release?: () => void }[] = [];
  try {
    const context = ImageManipulator.manipulate(uri);
    toRelease.push(context);
    let image = await context.renderAsync();
    toRelease.push(image);
    const longEdge = Math.max(image.width, image.height);
    if (longEdge > maxEdgePx) {
      context.resize(image.width >= image.height ? { width: maxEdgePx } : { height: maxEdgePx });
      image = await context.renderAsync();
      toRelease.push(image);
    }
    const saved = await image.saveAsync({ format: SaveFormat.JPEG, compress: PHOTO_JPEG_QUALITY });
    const baseName = fileName.replace(/\.[^.]+$/, "") || "photo";
    return { uri: saved.uri, fileName: `${baseName}.jpg` };
  } catch {
    return { uri, fileName };
  } finally {
    for (const ref of toRelease) {
      try {
        ref.release?.();
      } catch {
        // already released
      }
    }
  }
}

// An upload on a weak signal must not hold an emergency report hostage:
// past this, it's treated as failed and the user can send the report
// without the photo (services/reportPhoto.ts).
export const PHOTO_UPLOAD_TIMEOUT_MS = 30_000;

export async function postPhotoWithTimeout(
  url: string,
  token: string,
  body: FormData,
  timeoutMs: number = PHOTO_UPLOAD_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body,
      signal: controller.signal,
    });
  } catch (error) {
    if (controller.signal.aborted) throw new Error("Photo upload timed out");
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/incidents/photo (multipart, field "photo") uploads to the
// backend's Cloudinary account and answers { success, photoUrl }; the
// report then carries that photoUrl. Any failure throws, which drives the
// "submit without photo?" prompt (services/reportPhoto.ts) instead of
// pretending the photo was attached.
export async function uploadReportPhoto(
  token: string,
  uri: string,
  fileName: string,
): Promise<{ photoUrl: string }> {
  const photo = await shrinkReportPhoto(uri, fileName);
  const formData = new FormData();
  formData.append("photo", {
    uri: photo.uri,
    name: photo.fileName,
    type: guessPhotoMimeType(photo.fileName),
  } as unknown as Blob);

  const response = await postPhotoWithTimeout(`${API_BASE_URL}/api/incidents/photo`, token, formData);

  if (!response.ok) {
    throw new Error(`Photo upload failed with status ${response.status}`);
  }

  const data = (await response.json()) as { success?: boolean; photoUrl?: string };
  // No URL back means nothing was attached -- fail rather than send the
  // report as if it had a photo.
  if (!data.photoUrl) throw new Error("Photo upload returned no photo");
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
    markedUrgent?: boolean;
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

// Contract assumed pending backend confirmation, same situation as
// deleteNotification in notification.service.ts: no DELETE
// /api/incidents/:id route exists on the backend yet, so calls here will
// fail (404/network error) until it's added. The UI only removes a report
// locally once this actually succeeds -- see app/(tabs)/report-history.tsx.
export async function deleteReport(token: string, id: string): Promise<void> {
  await apiDelete(`/api/incidents/${id}`, token);
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
  // How many responders are currently helping -- decides "Track Responder"
  // vs "Track Responders".
  respondersCount: number;
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
  respondersCount?: number;
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
      respondersCount: row.respondersCount ?? 0,
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
