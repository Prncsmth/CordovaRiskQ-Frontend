// utils/trackResponders.ts
// Singular/plural wording for tracking an incident's responders, shared by
// the SOS screen, Report Details and the Track Responder(s) map so they
// always agree: one responder -> "Track Responder", two or more -> "Track
// Responders".

export function trackRespondersLabel(count: number): string {
  return count >= 2 ? "Track Responders" : "Track Responder";
}

export function respondersAssignedTitle(count: number): string {
  return count >= 2 ? "Responders Assigned" : "Responder Assigned";
}

// Header of the Track Responders map when tracking two or more -- how many
// are coming, e.g. "3 responders on the way", "3 responders · 1 arrived",
// "3 responders arrived".
export function respondersHeadline(statuses: string[]): string {
  const total = statuses.length;
  const arrived = statuses.filter((status) => status === "arrived").length;
  if (arrived === 0) return `${total} responders on the way`;
  if (arrived === total) return `${total} responders arrived`;
  return `${total} responders · ${arrived} arrived`;
}

// The responder the map focuses on (route, ETA, freshness): the one the
// user tapped, or the first to accept when they haven't picked one -- or
// when the picked one has since left the incident.
export function selectedResponder<T extends { responderId: string }>(
  responders: T[],
  selectedId: string | null,
): T | undefined {
  return responders.find((r) => r.responderId === selectedId) ?? responders[0];
}

// e.g. "Juan has been assigned and is on the way."
//      "Juan and Pedro are on the way."
//      "Juan and 2 other responders are on the way."
export function respondersAssignedMessage(names: string[]): string {
  const [first, second] = names.map((name) => name.trim() || "A responder");
  if (names.length <= 1) return `${first ?? "A responder"} has been assigned and is on the way.`;
  if (names.length === 2) return `${first} and ${second} are on the way.`;
  const others = names.length - 1;
  return `${first} and ${others} other responders are on the way.`;
}
