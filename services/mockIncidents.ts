import type { Incident } from "@/types/responder";

// Placeholder data for the responder flow until this is wired to the
// real incidents API. Coordinates are approximate points around
// Cordova, Cebu.
export const mockIncidents: Incident[] = [
  {
    id: "SOS-2024-0517",
    type: "Medical Emergency",
    location: "Poblacion, Cordova",
    urgency: "high",
    distanceKm: 1.4,
    status: "pending",
    maxResponders: 5,
    etaMinutes: 6,
    responderCoords: { latitude: 10.2436, longitude: 123.9487 },
    incidentCoords: { latitude: 10.253, longitude: 123.9494 },
    team: [
      { id: "1", name: "Mark Santos", status: "on_the_way" },
      { id: "2", name: "Jane Flores", status: "on_the_way" },
      { id: "3", name: "Michael Reyes", status: "preparing" },
      { id: "4", name: "Pedro Cruz", status: "online", isCaptain: true },
    ],
  },
  {
    id: "SOS-2024-0518",
    type: "Fire Report",
    location: "Alegria, Cordova",
    urgency: "medium",
    distanceKm: 3.2,
    status: "pending",
    maxResponders: 4,
    etaMinutes: 11,
    responderCoords: { latitude: 10.2436, longitude: 123.9487 },
    incidentCoords: { latitude: 10.2612, longitude: 123.9558 },
    team: [
      { id: "5", name: "Liza Bautista", status: "preparing", isCaptain: true },
    ],
  },
  {
    id: "SOS-2024-0519",
    type: "Flood Assistance",
    location: "Day-as, Cordova",
    urgency: "low",
    distanceKm: 5.6,
    status: "pending",
    maxResponders: 6,
    etaMinutes: 18,
    responderCoords: { latitude: 10.2436, longitude: 123.9487 },
    incidentCoords: { latitude: 10.2478, longitude: 123.972 },
    team: [{ id: "6", name: "Ramon Dela Cruz", status: "online", isCaptain: true }],
  },
];

export function getIncidentById(id: string | undefined): Incident | undefined {
  if (!id) return undefined;
  return mockIncidents.find((incident) => incident.id === id);
}
