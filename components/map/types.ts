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
  // For a "label" marker, the always-visible pill text (e.g. "3 min") --
  // unrelated to Leaflet's tap-to-reveal popup text some other markers may
  // use `label` for.
  label?: string;
  // "logo" renders the riskq app logo instead of a colored pin -- used for
  // a responder's own position on the nav map. "label" renders an
  // always-visible text pill instead of a pin at all -- used for a route
  // alternative's duration, tappable via onMarkerPress like any other
  // marker to make that route the active one.
  icon?: "logo" | "label";
  // Adds a looping glow/pulse ring in the marker's own color -- for a live
  // incident (SOS or a citizen report) on a responder's map, so it reads as
  // "active right now" and draws the eye, the same radar-ping language
  // already used for a live GPS position (the blue dot / logo pin).
  pulse?: boolean;
  // Renders just the location glyph in the marker's own color, no circular
  // pin background -- for a citizen-facing marker that should read as
  // light/uncluttered (evacuation centers) rather than the filled-pin
  // convention used for a responder's incident markers.
  flat?: boolean;
};

// A plain number applies the same padding to all four sides (existing
// behavior, still the common case). An object lets a caller with
// asymmetric screen chrome -- e.g. a floating top card plus a bottom
// sheet of a different height -- fit both points into the space actually
// left visible between them, rather than treating one side's clearance
// as if it applied everywhere.
export type MapFitPadding = number | { top?: number; bottom?: number; left?: number; right?: number };

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
  fitToPoints: (points: MapLatLng[], padding?: MapFitPadding) => void;
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
