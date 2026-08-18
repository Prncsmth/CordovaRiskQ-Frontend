// services/evacuation.service.ts
import { CORDOVA_BARANGAYS, CORDOVA_CENTER } from "@/constants/cordovaBarangays";
import { haversineDistanceKm } from "@/utils/distance";

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

// One elementary school gym per barangay — the standard, always-available
// evacuation venue in Philippine municipalities. Fallback distanceKm is
// computed from the municipal center since these aren't hand-picked like
// the named centers above.
const BARANGAY_SCHOOL_GYMS: EvacuationCenter[] = CORDOVA_BARANGAYS.map(
  (barangay) => ({
    id: `${barangay.id}-elementary-school-gym`,
    name: `${barangay.name} Elementary School Gym`,
    address: `Barangay ${barangay.name}, Cordova, Cebu`,
    distanceKm: haversineDistanceKm(CORDOVA_CENTER, barangay),
    capacity: { current: 0, max: 300 },
    status: "open",
    facilities: ["Water", "Restrooms", "Power"],
    latitude: barangay.latitude,
    longitude: barangay.longitude,
  }),
);

const ALL_CENTERS: EvacuationCenter[] = [...CENTERS, ...BARANGAY_SCHOOL_GYMS];

export async function getEvacuationCenters(): Promise<EvacuationCenter[]> {
  return ALL_CENTERS;
}

export async function getEvacuationCenterById(
  id: string,
): Promise<EvacuationCenter | undefined> {
  return ALL_CENTERS.find((c) => c.id === id);
}
