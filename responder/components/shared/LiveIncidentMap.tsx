// components/responder/LiveIncidentMap.tsx
// The responder-to-incident live map -- markers, route polyline (or a
// straight-line fallback), and fit-to-points wiring -- shared by
// OnTheWayView (embedded) and app/responder/navigate.tsx (full-screen).
// Ref/onReady pass straight through to AppMap so callers keep driving
// their own locate button and fitToPoints call exactly as before.
import React, { forwardRef } from "react";
import type { StyleProp, ViewStyle } from "react-native";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import type { Route } from "@/services/directions.service";
import type { Coordinates } from "@/services/location.service";
import { useThemeColors } from "@/theme";

const LiveIncidentMap = forwardRef<
  MapHandle,
  {
    style?: StyleProp<ViewStyle>;
    responderCoords: Coordinates;
    incidentCoords: Coordinates;
    midpoint: Coordinates;
    color: string;
    route: Route | null;
    onReady?: () => void;
  }
>(function LiveIncidentMap(
  { style, responderCoords, incidentCoords, midpoint, color, route, onReady },
  ref,
) {
  const COLORS = useThemeColors();

  return (
    <AppMap
      ref={ref}
      style={style}
      center={midpoint}
      zoom={14}
      showLayerSwitcher
      markers={[
        { id: "responder", ...responderCoords, color: COLORS.secondary, icon: "logo" },
        { id: "incident", ...incidentCoords, color },
      ]}
      polylines={[
        {
          points: route ? route.coordinates : [responderCoords, incidentCoords],
          color: COLORS.secondary,
          dashed: false,
          weight: 4,
        },
      ]}
      onReady={onReady}
    />
  );
});

export default LiveIncidentMap;
