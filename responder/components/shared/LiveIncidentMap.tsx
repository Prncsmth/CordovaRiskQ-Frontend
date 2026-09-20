// components/responder/LiveIncidentMap.tsx
// The responder-to-incident live map -- markers, route polyline(s) (or a
// straight-line fallback), and fit-to-points wiring -- shared by
// OnTheWayView (embedded) and responder/screens/NavigateScreen.tsx
// (full-screen). Ref/onReady pass straight through to AppMap so callers
// keep driving their own locate button and fitToPoints call exactly as
// before.
//
// Route-alternative rendering (dimmed non-selected routes + tappable
// duration pills) is shared with app/evacuation-detail/navigate.tsx via
// utils/routeVisuals.ts -- see there for the actual logic. A caller that
// only ever has one route (OnTheWayView) sees no pills and no dimming,
// identical to the single-route behavior this replaced.
import React, { forwardRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import type { Route } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";
import { buildRouteVisuals, routeIndexFromMarkerId } from "@/utils/routeVisuals";
import { useThemeColors } from "@/theme";

const LiveIncidentMap = forwardRef<
  MapHandle,
  {
    style?: StyleProp<ViewStyle>;
    responderCoords: Coordinates;
    incidentCoords: Coordinates;
    midpoint: Coordinates;
    color: string;
    routes: Route[];
    selectedRouteIndex: number;
    onSelectRoute?: (index: number) => void;
    onReady?: () => void;
  }
>(function LiveIncidentMap(
  {
    style,
    responderCoords,
    incidentCoords,
    midpoint,
    color,
    routes,
    selectedRouteIndex,
    onSelectRoute,
    onReady,
  },
  ref,
) {
  const COLORS = useThemeColors();

  const { polylines, labelMarkers } = buildRouteVisuals(routes, selectedRouteIndex, COLORS.secondary, [
    responderCoords,
    incidentCoords,
  ]);

  return (
    <AppMap
      ref={ref}
      style={style}
      center={midpoint}
      zoom={14}
      showLayerSwitcher
      showUserLocationDot={false}
      markers={[
        { id: "responder", ...responderCoords, color: COLORS.secondary, icon: "logo" },
        { id: "incident", ...incidentCoords, color, pulse: true },
        ...labelMarkers,
      ]}
      polylines={polylines}
      onMarkerPress={(id) => {
        const index = routeIndexFromMarkerId(id);
        if (index !== null) onSelectRoute?.(index);
      }}
      onReady={onReady}
    />
  );
});

export default LiveIncidentMap;
