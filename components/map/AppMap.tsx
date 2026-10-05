// components/map/AppMap.tsx
// Picks the map engine at runtime: Leaflet (WebView) inside Expo Go, since
// the native Mapbox module cannot load there at all, and Mapbox everywhere
// else (dev client, standalone builds, web) for the native experience.
// Both engines implement the same MapEngineProps/MapHandle contract (see
// types.ts), so callers never need to know which one is mounted.
import Constants, { ExecutionEnvironment } from "expo-constants";
import React, { forwardRef, memo } from "react";

import LeafletMap from "./LeafletMap";
import MapboxMap from "./MapboxMap";
import type { MapEngineProps, MapHandle } from "./types";

export const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

const AppMap = forwardRef<MapHandle, MapEngineProps>(function AppMap(props, ref) {
  const Engine = isExpoGo ? LeafletMap : MapboxMap;
  return <Engine {...props} ref={ref} />;
});

// Memoized: a screen that re-renders for something unrelated to the map (a
// 1 s "Updated Xs ago" clock, say) doesn't re-render the whole map, as long
// as it passes stable markers/polylines/callbacks.
export default memo(AppMap);

export type {
  MapEngineProps,
  MapFitPadding,
  MapHandle,
  MapLatLng,
  MapMarker,
  MapPolyline,
  MapUserLocation,
} from "./types";
