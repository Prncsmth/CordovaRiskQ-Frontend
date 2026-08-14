// constants/cordovaBarangays.ts
// Reference data for Cordova, Cebu — used to restrict the map view to the
// municipality and to power barangay search. Coordinates sourced from
// PhilAtlas (https://www.philatlas.com/visayas/r07/cebu/cordova.html).

export type Barangay = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
};

export const CORDOVA_BARANGAYS: Barangay[] = [
  { id: "alegria", name: "Alegria", latitude: 10.2572, longitude: 123.9612 },
  { id: "bangbang", name: "Bangbang", latitude: 10.2588, longitude: 123.9445 },
  { id: "buagsong", name: "Buagsong", latitude: 10.2507, longitude: 123.9403 },
  { id: "catarman", name: "Catarman", latitude: 10.2485, longitude: 123.9483 },
  { id: "cogon", name: "Cogon", latitude: 10.2647, longitude: 123.9518 },
  { id: "dapitan", name: "Dapitan", latitude: 10.2663, longitude: 123.9490 },
  { id: "day-as", name: "Day-as", latitude: 10.2554, longitude: 123.9355 },
  { id: "gabi", name: "Gabi", latitude: 10.2626, longitude: 123.9606 },
  { id: "gilutongan", name: "Gilutongan", latitude: 10.2036, longitude: 123.9886 },
  { id: "ibabao", name: "Ibabao", latitude: 10.2707, longitude: 123.9473 },
  { id: "pilipog", name: "Pilipog", latitude: 10.2666, longitude: 123.9428 },
  { id: "poblacion", name: "Poblacion", latitude: 10.2525, longitude: 123.9502 },
  { id: "san-miguel", name: "San Miguel", latitude: 10.2623, longitude: 123.9453 },
];

// Municipal center of Cordova, Cebu.
export const CORDOVA_CENTER = { latitude: 10.2515, longitude: 123.9499 };

// Padded box covering all 13 barangays (including outlying Gilutongan
// Island), used to keep the map camera locked to Cordova.
export const CORDOVA_BOUNDS = {
  ne: [124.01, 10.29] as [number, number],
  sw: [123.915, 10.18] as [number, number],
};
