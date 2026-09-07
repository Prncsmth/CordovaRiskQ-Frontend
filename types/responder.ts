export type Urgency = "high" | "medium" | "low";

export type IncidentStatus =
  | "pending"
  | "lobby"
  | "on_the_way"
  | "arrived"
  | "completed"
  | "cancelled";

// A responder's own status on one incident's roster. "pending" and "left"
// are frontend-only conveniences: "pending" means no IncidentResponder row
// exists yet (haven't joined or declined); the backend never returns
// "left" for `myStatus` on a fresh load since there's no UI path back to
// this screen after leaving, but it's modeled here for completeness since
// the backend accepts it as a roster transition target.
export type MyResponderStatus =
  | "pending"
  | "declined"
  | "joined"
  | "on_the_way"
  | "arrived"
  | "left";

// A status as it appears in another responder's roster entry -- only ever
// one of the three "currently helping" states; declined/left responders
// never appear in `Incident.team`.
export type ResponderStatus = "joined" | "on_the_way" | "arrived";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TeamMember {
  id: string;
  name: string;
  status: ResponderStatus;
  isCaptain?: boolean;
}

export interface Incident {
  id: string;
  type: string;
  location: string;
  urgency: Urgency;
  distanceKm?: number;
  status: IncidentStatus;
  team: TeamMember[];
  myStatus: MyResponderStatus;
  etaMinutes?: number;
  responderCoords?: Coordinates;
  incidentCoords?: Coordinates;
}
