export type Urgency = "high" | "medium" | "low";

export type IncidentStatus =
  | "pending"
  | "lobby"
  | "on_the_way"
  | "arrived"
  | "completed"
  | "cancelled";

export type ResponderStatus = "online" | "preparing" | "on_the_way";

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
  maxResponders: number;
  team: TeamMember[];
  etaMinutes?: number;
  responderCoords?: Coordinates;
  incidentCoords?: Coordinates;
}
