// responder/components/incident-detail/incidentDetailsText.ts
// What the citizen wrote about the incident, for the responder's pop-up and
// incident screens -- so they know the situation before accepting. Never
// blank: an SOS is usually sent with one tap and no text, and a report's
// description is optional.
import type { Incident } from "@/responder/types/responder";

export function incidentDetailsText(incident: Pick<Incident, "details" | "categoryId">): {
  text: string;
  // False when it's the fallback line, so screens can style it as muted.
  provided: boolean;
} {
  const details = incident.details?.trim();
  if (details) return { text: details, provided: true };
  return {
    text:
      incident.categoryId === "sos"
        ? "SOS alert sent with no details. Call the reporter once you accept."
        : "The reporter didn't add details.",
    provided: false,
  };
}
