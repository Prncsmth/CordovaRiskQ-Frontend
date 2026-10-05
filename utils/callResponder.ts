// utils/callResponder.ts
// The single "Call Responder" action on the Track Responder(s) screen. It
// only ever dials the PRIMARY responder (the first-accepted active one,
// chosen by the backend -- see TrackingSnapshot.primaryMobile), never one per
// responder, and the number is never shown as text.

// Same dialing rule as the Contacts screen (app/contacts/index.tsx): keep
// "+" and digits only. Null when there's nothing dialable, so the button
// shows "No contact number" instead of opening an empty dialer.
export function toTelUrl(mobile: string | null | undefined): string | null {
  const dialable = (mobile ?? "").replace(/[^+\d]/g, "");
  const digits = dialable.replace(/\D/g, "");
  return digits.length >= 7 ? `tel:${dialable}` : null;
}

export type CallResponderAction =
  | { kind: "call"; telUrl: string }
  // No usable number for the primary responder: the button is shown
  // disabled and the emergency hotline is offered instead.
  | { kind: "unavailable" };

export function callResponderAction(primaryMobile: string | null | undefined): CallResponderAction {
  const telUrl = toTelUrl(primaryMobile);
  return telUrl ? { kind: "call", telUrl } : { kind: "unavailable" };
}
