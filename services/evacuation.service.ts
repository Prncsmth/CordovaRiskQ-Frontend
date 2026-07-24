// services/evacuation.service.ts
export type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  capacity: { current: number; max: number };
  status: "open" | "full";
  facilities: string[];
};

const CENTERS: EvacuationCenter[] = [
  {
    id: "kagawasan-elementary",
    name: "Kagawasan Elementary School",
    address: "Brgy. Poblacion, Cordova, Cebu",
    distanceKm: 1.2,
    capacity: { current: 300, max: 450 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
  },
  {
    id: "cordova-municipal-gym",
    name: "Cordova Municipal Gym",
    address: "Poblacion, Cordova, Cebu",
    distanceKm: 2.4,
    capacity: { current: 180, max: 500 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
  },
  {
    id: "barangay-day-care",
    name: "Barangay Day Care Center",
    address: "Day-as, Cordova, Cebu",
    distanceKm: 3.1,
    capacity: { current: 120, max: 120 },
    status: "full",
    facilities: ["Water", "Restrooms"],
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
