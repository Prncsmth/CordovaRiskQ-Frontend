// components/map/types.ts
// Shared contract implemented by both map engines (LeafletMap for Expo Go,
// MapboxMap for dev/standalone/web builds) so screens can render <AppMap />
// without caring which one is mounted underneath.
export type MapLatLng = { latitude: number; longitude: number };

export type MapMarker = {
  id: string;
  latitude: number;
  longitude: number;
  color?: string;
  label?: string;
  // When set to "logo", the marker renders the riskq app logo instead of a
  // colored pin -- used for a responder's own position on the nav map.
  icon?: "logo";
  // Adds a looping glow/pulse ring in the marker's own color -- for a live
  // incident (SOS or a citizen report) on a responder's map, so it reads as
  // "active right now" and draws the eye, the same radar-ping language
  // already used for a live GPS position (the blue dot / logo pin).
  pulse?: boolean;
};

export type MapPolyline = {
  points: MapLatLng[];
  color?: string;
  dashed?: boolean;
  weight?: number;
};

export type MapUserLocation = MapLatLng & { accuracy?: number | null };

export type MapHandle = {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitToPoints: (points: MapLatLng[], padding?: number) => void;
};

export type MapEngineProps = {
  center: MapLatLng;
  zoom?: number;
  minZoom?: number;
  maxZoom?: number;
  markers?: MapMarker[];
  polylines?: MapPolyline[];
  userLocation?: MapUserLocation | null;
  // Defaults to true. MapboxMap renders its own native "you are here" blue
  // dot (via @rnmapbox/maps' UserLocation component, using the device's own
  // live GPS) whenever the map is interactive -- entirely independent of
  // the userLocation prop above, which only feeds LeafletMap's dot. Set to
  // false on a screen that shows the current device's position as its own
  // marker instead (e.g. the responder Live Map's RiskQ logo pin), so the
  // native blue dot doesn't also render underneath/alongside it.
  showUserLocationDot?: boolean;
  interactive?: boolean;
  showLayerSwitcher?: boolean;
  showCordovaBoundary?: boolean;
  // Pushes the layer-switcher button down by this many px -- for screens
  // where the map runs full-bleed under the status bar/notch instead of
  // starting below a header that already accounted for that inset.
  topInset?: number;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coords: MapLatLng) => void;
  onRegionChange?: (region: { latitude: number; longitude: number; zoom: number }) => void;
  onReady?: () => void;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};
