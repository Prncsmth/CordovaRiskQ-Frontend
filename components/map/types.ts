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
  interactive?: boolean;
  showLayerSwitcher?: boolean;
  onMarkerPress?: (id: string) => void;
  onMapPress?: (coords: MapLatLng) => void;
  onRegionChange?: (region: { latitude: number; longitude: number; zoom: number }) => void;
  onReady?: () => void;
  style?: import("react-native").StyleProp<import("react-native").ViewStyle>;
};
