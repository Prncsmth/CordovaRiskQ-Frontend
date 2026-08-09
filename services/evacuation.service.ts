// services/evacuation.service.ts
export type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  capacity: { current: number; max: number };
  status: "open" | "full";
  facilities: string[];
  latitude: number;
  longitude: number;
};

// Coordinates are approximate points around Cordova, Cebu (same approach as
// services/mockIncidents.ts) until these centers are backed by a real API.
const CENTERS: EvacuationCenter[] = [
  {
    id: "kagawasan-elementary",
    name: "Kagawasan Elementary School",
    address: "Brgy. Poblacion, Cordova, Cebu",
    distanceKm: 1.2,
    capacity: { current: 300, max: 450 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2531,
    longitude: 123.9497,
  },
  {
    id: "cordova-municipal-gym",
    name: "Cordova Municipal Gym",
    address: "Poblacion, Cordova, Cebu",
    distanceKm: 2.4,
    capacity: { current: 180, max: 500 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2489,
    longitude: 123.9506,
  },
  {
    id: "barangay-day-care",
    name: "Barangay Day Care Center",
    address: "Day-as, Cordova, Cebu",
    distanceKm: 3.1,
    capacity: { current: 120, max: 120 },
    status: "full",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2478,
    longitude: 123.972,
  },
];

export async function getEvacuationCenters(): Promise<EvacuationCenter[]> {
  return CENTERS;
}

export async function getEvacuationCenterById(
  id: string,
): Promise<EvacuationCenter | undefined> {
  return CENTERS.find((c) => c.id === id);
}
