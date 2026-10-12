// utils/sosFailure.ts
// Why an SOS couldn't be sent, and what to tell the citizen. Before this,
// every failure -- no GPS, no connection, a server error -- showed the
// geofence's "only available within Cordova" message, with no way to call
// for help. Now only a real geofence block says that; the rest offer a
// one-tap call to MDRRMO and the hotlines, plus Try Again.
//
// Try Again is safe: POST /sos is idempotent per user on the backend (a
// per-user advisory lock + "return the active SOS if there is one"), so a
// retry after a timeout returns the SOS that already got through instead
// of creating a second incident.
//
// "not-dispatched" is the exception: the backend saved the alert but its
// linked incident failed, so no responder was paged (the response comes
// back with incidentId null). The backend's dedupe looks for that incident,
// so a retry would add a second alert -- no Try Again there, only calls.
import { FALLBACK_HOTLINES } from "@/constants/hotlines";
import type { Hotline } from "@/services/contacts.service";
import { toTelUrl } from "@/utils/callResponder";

export type SosFailureReason = "no-location" | "send-failed" | "timed-out" | "not-dispatched";

// Only the network send is capped -- not GPS, not the whole flow.
export const SOS_SEND_TIMEOUT_MS = 20_000;

export class SosSendTimeoutError extends Error {
  constructor() {
    super("SOS request timed out");
    this.name = "SosSendTimeoutError";
  }
}

// The request itself can't be aborted (services/api.ts has no signal), so
// it may still finish after this gives up -- the timeout copy says so, and
// the backend's idempotency keeps a retry from duplicating it.
export function withSosSendTimeout<T>(request: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new SosSendTimeoutError()), timeoutMs);
    request.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

// The backend's requireSosInsideCordova answers 403; anything else that
// stops the send (network, timeout, 5xx) is not a geofence block.
export function classifySosSendError(error: unknown): "outside" | "send-failed" | "timed-out" {
  if (error instanceof SosSendTimeoutError) return "timed-out";
  const status = (error as { status?: unknown } | null)?.status;
  if (status === 403) return "outside";
  return "send-failed";
}

// Calls need cellular voice service and signal, not mobile data -- worded
// as "may", never as a promise.
const CALL_NOTE = "A phone call may still go through without mobile data if you have signal.";

export function sosFailureCopy(reason: SosFailureReason): { title: string; message: string } {
  if (reason === "no-location") {
    return {
      title: "Couldn't Get Your Location",
      message: `We couldn't pinpoint where you are, so your SOS wasn't sent. ${CALL_NOTE}`,
    };
  }
  if (reason === "not-dispatched") {
    return {
      title: "Couldn't Send Your SOS",
      message: `Your alert reached us, but responders couldn't be notified. Please call for help now. ${CALL_NOTE}`,
    };
  }
  if (reason === "timed-out") {
    return {
      title: "Couldn't Send Your SOS",
      message: `Your connection is too slow to confirm. Your SOS may have reached responders -- Try Again checks without sending a second one. ${CALL_NOTE}`,
    };
  }
  return {
    title: "Couldn't Send Your SOS",
    message: `We couldn't reach the server. ${CALL_NOTE}`,
  };
}

const MDRRMO_HOTLINE_ID = "mdrrmo";

function hotlineNumber(hotlines: Hotline[], id: string): string | null {
  return hotlines.find((h) => h.id === id)?.number.trim() || null;
}

// The admin-managed hotline when it's loaded, else the same shared
// fallback the Contacts screen uses (constants/hotlines.ts).
export function mdrrmoNumber(hotlines: Hotline[]): string | null {
  return (
    hotlineNumber(hotlines, MDRRMO_HOTLINE_ID) ??
    hotlineNumber(FALLBACK_HOTLINES, MDRRMO_HOTLINE_ID)
  );
}

// What the failure modal offers: the MDRRMO call whenever there's a
// dialable number, and the hotline list always. Try Again for every
// failure except "not-dispatched" (see the note at the top).
export function sosFailureActions(
  reason: SosFailureReason,
  hotlines: Hotline[],
): { callTelUrl: string | null; canRetry: boolean; showsHotlines: true } {
  return {
    callTelUrl: toTelUrl(mdrrmoNumber(hotlines)),
    canRetry: reason !== "not-dispatched",
    showsHotlines: true,
  };
}
