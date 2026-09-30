// services/support.service.ts
// Wraps POST /api/support-requests -- the Contact Support form. Each request
// is stored on the backend and shows up in the admin portal's Support
// Requests page (CordovaRiskQ- Admin), instead of opening the device's mail app.
import { apiPost } from "./api";

export type SupportTopic = "App issue" | "Report help" | "Account" | "Other";

export type SupportRequestInput = {
  topic: SupportTopic;
  subject?: string;
  message: string;
};

export async function sendSupportRequest(
  token: string,
  input: SupportRequestInput,
): Promise<void> {
  await apiPost<{ success: true }>(
    "/api/support-requests",
    {
      topic: input.topic,
      // The backend treats an absent subject as "none"; an empty string
      // would be stored as-is.
      ...(input.subject ? { subject: input.subject } : {}),
      message: input.message,
    },
    token,
  );
}
