// services/evacuation.service.ts
import type { ImageSourcePropType } from "react-native";

export type EvacuationCenterCategory = "school" | "evacuation_center";

export type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  category: EvacuationCenterCategory;
  distanceKm: number;
  capacity: { current: number; max: number };
  status: "open" | "full";
  facilities: string[];
  latitude: number;
  longitude: number;
  photo?: ImageSourcePropType;
};

// Every entry below is a real, named facility in Cordova, Cebu, with
// coordinates verified against OpenStreetMap building/POI data (queried via
// Nominatim and the Overpass API, both cross-checked against
// constants/cordovaBarangays.ts's PhilAtlas-sourced barangay boundaries) --
// not barangay centroids or invented placeholders. `distanceKm` is a
// straight-line placeholder from the municipal center; the app recomputes
// real distance from the user's live location at render time (see
// app/(tabs)/home.tsx and app/(tabs)/map.tsx). `capacity` is not backed by a
// live API yet, so current/max are estimates pending real data -- they don't
// affect location accuracy.
//
// One facility per barangay, all 13 covered:
//   Alegria, Bangbang, Buagsong, Catarman, Cogon, Dapitan, Day-as, Gabi,
//   Gilutongan, Ibabao, Pilipog, San Miguel -> a public elementary school
//   named and mapped in that barangay.
//   Poblacion -> Cordova Central Elementary School, Cordova Municipal Hall,
//   and Cordova Sports Complex (the municipality's designated command
//   center and largest public venue).
//   Day-as also gets Cordova National High School in addition to its
//   elementary school, since it's a real, separately-located campus there.
//
// "San Miguel Elementary School" is a real DepEd Cordova East District
// school (School ID 105111) but isn't traced as a distinct building in
// OpenStreetMap yet, so its coordinate is OSM's verified place node for
// Barangay San Miguel rather than a building outline -- flagged here rather
// than silently passed off as exact. Every other entry is a building-level
// coordinate.
const CENTERS: EvacuationCenter[] = [
  {
    id: "cordova-central-elementary",
    name: "Cordova Central Elementary School",
    address: "Manuel L. Quezon National Highway, Poblacion, Cordova, Cebu",
    category: "school",
    distanceKm: 0.3,
    capacity: { current: 280, max: 450 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2541979,
    longitude: 123.9500242,
  },
  {
    id: "cordova-national-high-school",
    name: "Cordova National High School",
    address: "Victorio Pacaldo Sr. Street, Day-as, Cordova, Cebu",
    category: "school",
    distanceKm: 0.6,
    capacity: { current: 340, max: 600 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2552507,
    longitude: 123.9441963,
  },
  {
    id: "cordova-municipal-hall",
    name: "Cordova Municipal Hall",
    address: "Martin Francisco Street, Poblacion, Cordova, Cebu",
    category: "evacuation_center",
    distanceKm: 0.1,
    capacity: { current: 150, max: 300 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2523257,
    longitude: 123.9497836,
  },
  {
    id: "cordova-sports-complex",
    name: "Cordova Sports Complex",
    address: "Martin Francisco Street, Poblacion, Cordova, Cebu",
    category: "evacuation_center",
    distanceKm: 0.2,
    capacity: { current: 320, max: 700 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
    latitude: 10.2506231,
    longitude: 123.9497523,
    photo: require("@/assets/images/complex.png"),
  },
  {
    id: "alegria-elementary",
    name: "Alegria Elementary School",
    address: "Victor Wahing Street, Alegria, Cordova, Cebu",
    category: "school",
    distanceKm: 1.7,
    capacity: { current: 210, max: 300 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2569616,
    longitude: 123.9604580,
  },
  {
    id: "bangbang-elementary",
    name: "Bangbang Elementary School",
    address: "Valeriano Inoc Street, Bangbang, Cordova, Cebu",
    category: "school",
    distanceKm: 1.1,
    capacity: { current: 170, max: 280 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2590618,
    longitude: 123.9444252,
  },
  {
    id: "buagsong-elementary",
    name: "Buagsong Elementary School",
    address: "Victorio Degamo Tirol Street, Buagsong, Cordova, Cebu",
    category: "school",
    distanceKm: 1.2,
    capacity: { current: 200, max: 320 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms"],
    latitude: 10.2490338,
    longitude: 123.9396082,
    photo: require("@/assets/images/buagsong.png"),
  },
  {
    id: "catarman-elementary",
    name: "Catarman Elementary School",
    address: "Filimon Nuñez Street, Catarman, Cordova, Cebu",
    category: "school",
    distanceKm: 0.9,
    capacity: { current: 180, max: 300 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2481715,
    longitude: 123.9460734,
  },
  {
    id: "cogon-elementary",
    name: "Cogon Elementary School",
    address: "Sergio Baguio Street, Cogon, Cordova, Cebu",
    category: "school",
    distanceKm: 1.9,
    capacity: { current: 150, max: 260 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2654046,
    longitude: 123.9511837,
  },
  {
    id: "day-as-elementary",
    name: "Day-as Elementary School",
    address: "Victorio Pacaldo Sr. Street, Day-as, Cordova, Cebu",
    category: "school",
    distanceKm: 0.6,
    capacity: { current: 190, max: 350 },
    status: "open",
    facilities: ["Water", "Restrooms", "Power"],
    latitude: 10.2543706,
    longitude: 123.9441505,
  },
  {
    id: "dapitan-barangay-hall",
    name: "Dapitan Barangay Hall",
    address: "Lilivian Berind Drive, Dapitan, Cordova, Cebu",
    category: "evacuation_center",
    distanceKm: 1.6,
    capacity: { current: 60, max: 150 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2662002,
    longitude: 123.9492707,
  },
  {
    id: "gabi-elementary",
    name: "Gabi Elementary School",
    address: "Dinagat Street, Gabi, Cordova, Cebu",
    category: "school",
    distanceKm: 1.8,
    capacity: { current: 220, max: 320 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2625845,
    longitude: 123.9614178,
  },
  {
    id: "gilutongan-elementary",
    name: "Gilutongan Elementary School",
    address: "Brgy. Gilutongan, Cordova, Cebu (Gilutongan Island)",
    category: "school",
    distanceKm: 5.6,
    capacity: { current: 80, max: 150 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2072150,
    longitude: 123.9883661,
  },
  {
    id: "ibabao-elementary",
    name: "Ibabao Elementary School",
    address: "Cordova Bypass Road, Ibabao, Cordova, Cebu",
    category: "school",
    distanceKm: 2.5,
    capacity: { current: 230, max: 380 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2717843,
    longitude: 123.9555953,
  },
  {
    id: "pilipog-elementary",
    name: "Pilipog Elementary School",
    address: "Manuel L. Quezon National Highway, Pilipog, Cordova, Cebu",
    category: "school",
    distanceKm: 2.1,
    capacity: { current: 160, max: 280 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2662362,
    longitude: 123.9461385,
  },
  {
    id: "san-miguel-elementary",
    name: "San Miguel Elementary School",
    // Not yet traced as a building in OpenStreetMap (confirmed real via
    // DepEd School ID 105111) -- see file header note. Coordinate is OSM's
    // verified place node for Barangay San Miguel itself, not this app's
    // own barangay-centroid estimate.
    address: "Brgy. San Miguel, Cordova, Cebu",
    category: "school",
    distanceKm: 1.9,
    capacity: { current: 190, max: 310 },
    status: "open",
    facilities: ["Water", "Restrooms"],
    latitude: 10.2626036,
    longitude: 123.9458152,
  },
];

const ALL_CENTERS: EvacuationCenter[] = CENTERS;

export async function getEvacuationCenters(): Promise<EvacuationCenter[]> {
  return ALL_CENTERS;
}

export async function getEvacuationCenterById(
  id: string,
): Promise<EvacuationCenter | undefined> {
  return ALL_CENTERS.find((c) => c.id === id);
}
