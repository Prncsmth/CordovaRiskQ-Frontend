// services/evacuation.service.ts
import { CORDOVA_BARANGAYS, CORDOVA_CENTER } from "@/constants/cordovaBarangays";
import { haversineDistanceKm } from "@/utils/distance";
import type { ImageSourcePropType } from "react-native";

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
  photo?: ImageSourcePropType;
};

// Coordinates are approximate points around Cordova, Cebu (same approach as
// services/mockIncidents.ts) until these centers are backed by a real API.
//
// The public elementary school entries below are real, named schools
// (cross-checked against DepEd/PhilAtlas records) placed near their
// barangay's centroid from constants/cordovaBarangays.ts -- exact building
// coordinates and live capacity aren't available yet. Dapitan and
// Gilutongan barangays are intentionally omitted: no verifiable school name
// was found for either (Gilutongan in particular is a small offshore
// island), so nothing was invented for them.
const CENTERS: EvacuationCenter[] = [
  {
    id: "cordova-central-elementary",
    name: "Cordova Central Elementary School",
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
  {
    id: "cordova-sports-complex",
    name: "Cordova Sports Complex",
    address: "Poblacion, Cordova, Cebu",
    distanceKm: 1.0,
    capacity: { current: 300, max: 700 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2505,
    longitude: 123.9515,
    photo: require("@/assets/images/complex.png"),
  },
  {
    id: "alegria-elementary",
    name: "Alegria Elementary School",
    address: "Brgy. Alegria, Cordova, Cebu",
    distanceKm: 2.1,
    capacity: { current: 220, max: 300 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2572,
    longitude: 123.9612,
  },
  {
    id: "bangbang-elementary",
    name: "Bangbang Elementary School",
    address: "Brgy. Bangbang, Cordova, Cebu",
    distanceKm: 1.8,
    capacity: { current: 180, max: 280 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2588,
    longitude: 123.9445,
  },
  {
    id: "buagsong-elementary",
    name: "Buagsong Elementary School",
    address: "Brgy. Buagsong, Cordova, Cebu",
    distanceKm: 1.5,
    capacity: { current: 210, max: 320 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms"],
    latitude: 10.2507,
    longitude: 123.9403,
    photo: require("@/assets/images/buagsong.png"),
  },
  {
    id: "catarman-elementary",
    name: "Catarman Elementary School",
    address: "Brgy. Catarman, Cordova, Cebu",
    distanceKm: 1.3,
    capacity: { current: 190, max: 300 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2485,
    longitude: 123.9483,
  },
  {
    id: "cogon-elementary",
    name: "Cogon Elementary School",
    address: "Brgy. Cogon, Cordova, Cebu",
    distanceKm: 2.6,
    capacity: { current: 160, max: 260 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2647,
    longitude: 123.9518,
  },
  {
    id: "day-as-elementary",
    name: "Day-as Elementary School",
    address: "Brgy. Day-as, Cordova, Cebu",
    distanceKm: 3.4,
    capacity: { current: 200, max: 350 },
    status: "open",
    facilities: ["Water", "Restrooms", "Power"],
    latitude: 10.2554,
    longitude: 123.9355,
  },
  {
    id: "cordova-national-high-school",
    name: "Cordova National High School",
    address: "Brgy. Day-as, Cordova, Cebu",
    distanceKm: 3.5,
    capacity: { current: 350, max: 600 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.256,
    longitude: 123.9365,
  },
  {
    id: "gabi-elementary",
    name: "Gabi Elementary School",
    address: "Brgy. Gabi, Cordova, Cebu",
    distanceKm: 2.2,
    capacity: { current: 230, max: 320 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2626,
    longitude: 123.9606,
  },
  {
    id: "gabi-evacuation-center",
    name: "Gabi Evacuation Center",
    address: "Brgy. Gabi, Cordova, Cebu",
    distanceKm: 2.3,
    capacity: { current: 90, max: 150 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2631,
    longitude: 123.9598,
  },
  {
    id: "ibabao-elementary",
    name: "Ibabao Elementary School",
    address: "Brgy. Ibabao, Cordova, Cebu",
    distanceKm: 3.1,
    capacity: { current: 240, max: 380 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2707,
    longitude: 123.9473,
  },
  {
    id: "pilipog-elementary",
    name: "Pilipog Elementary School",
    address: "Brgy. Pilipog, Cordova, Cebu",
    distanceKm: 2.7,
    capacity: { current: 170, max: 280 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2666,
    longitude: 123.9428,
  },
  {
    id: "san-miguel-elementary",
    name: "San Miguel Elementary School",
    address: "Brgy. San Miguel, Cordova, Cebu",
    distanceKm: 2.4,
    capacity: { current: 200, max: 310 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2623,
    longitude: 123.9453,
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
