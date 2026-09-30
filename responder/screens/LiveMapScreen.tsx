// responder/screens/LiveMapScreen.tsx
// Live Monitoring Map -- the "Live Map" tab in the responder bottom nav
// (app/responder/(tabs)/live-map.tsx). Shows every active incident
// getIncidents() already returns (same source DashboardScreen's list uses,
// no separate/duplicate fetch) as map markers, plus the responder's own
// GPS position. Tapping a marker always opens the existing incident detail
// flow (app/responder/[id].tsx) -- never a direct shortcut into
// app/responder/navigate.tsx, since that screen's "Arrive" action assumes
// the responder has already joined and is on_the_way on that incident;
// jumping there straight from an arbitrary marker would let a responder
// mark themselves arrived on an incident they never joined. The detail
// screen's own OnTheWayView already surfaces the real "Navigate" button
// once that's actually true, so this screen doesn't need to duplicate it.
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useFocusEffect, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AppMap, { type MapHandle } from "@/components/map/AppMap";
import LocateButton from "@/components/map/LocateButton";
import ZoomControls from "@/components/map/ZoomControls";
import type { MapMarker } from "@/components/map/types";
import { CATEGORY_LABELS, getCategoryVisual } from "@/components/report/categories";
import { useAuth } from "@/context/AuthContext";
import { useTabBarHeight } from "@/context/TabBarHeightContext";
import IncidentMapLegend from "@/responder/components/shared/IncidentMapLegend";
import NearestIncidentButton from "@/responder/components/shared/NearestIncidentButton";
import { getIncidents } from "@/responder/services/incident.service";
import type { Incident } from "@/responder/types/responder";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";

// Same 12s cadence DashboardScreen's own incident poll uses -- keeping the
// two screens in sync rather than inventing a different refresh rate.
const POLL_INTERVAL_MS = 12000;
// Matches the citizen map screen's own zoom bounds (app/(tabs)/map.tsx) --
// same "how close/far can you get" feel on both maps.
const MIN_ZOOM = 12;
const MAX_ZOOM = 18;

export default function LiveMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { token } = useAuth();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const tabBarHeight = useTabBarHeight();
  const mapRef = useRef<MapHandle>(null);
  // Tracks the marker count the camera was last fitted to, not just
  // whether it's ever been fitted -- so a brand-new incident (a fresh SOS,
  // say) that comes in on a later poll still pulls it into view instead of
  // being silently plotted somewhere off-screen forever after the first fit.
  const lastFittedCountRef = useRef(0);

  const [mapReady, setMapReady] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [responderCoords, setResponderCoords] = useState<Coordinates | undefined>();
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [showNearestOnly, setShowNearestOnly] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(15);

  const loadIncidents = useCallback(
    async (coords?: Coordinates) => {
      if (!token) return;
      const data = await getIncidents(token, coords);
      setIncidents(data);
    },
    [token],
  );

  useFocusEffect(
    useCallback(() => {
      if (!token) return;
      let cancelled = false;
      // A plain closure variable, not React state -- read fresh by every
      // poll() call below (including from the interval) without needing to
      // be a dependency, the same pattern DashboardScreen's own poll loop
      // uses. One GPS fix per focus session is enough (refreshed again on
      // refocus), not re-fetched every 12s tick.
      let responderLocation: Coordinates | undefined;

      async function poll() {
        try {
          await loadIncidents(responderLocation);
          if (!cancelled) setLoadError(false);
        } catch {
          // Keep showing the last-known markers; the next tick retries.
          if (!cancelled) setLoadError(true);
        } finally {
          if (!cancelled) setHasLoadedOnce(true);
        }
      }

      getCurrentLocation().then((fix) => {
        if (cancelled) return;
        responderLocation = fix;
        setResponderCoords(fix);
        poll();
      });

      const interval = setInterval(poll, POLL_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(interval);
      };
    }, [token, loadIncidents]),
  );

  // Unlikely to collide with a real incident id (a UUID/Mongo id), so it's
  // safe as a sentinel onMarkerPress checks for below.
  const SELF_MARKER_ID = "__responder_self__";

  // The single closest incident/SOS to the responder's current position --
  // powers NearestIncidentButton's "show only this one" toggle. Only
  // incidents with both a coordinate and a computed distance (itself
  // dependent on the responder's GPS fix having resolved) are eligible.
  const nearestIncident = incidents
    .filter(
      (incident): incident is Incident & { distanceKm: number } =>
        incident.incidentCoords != null && incident.distanceKm != null,
    )
    .sort((a, b) => a.distanceKm - b.distanceKm)[0];

  // Colored by category (flood/fire/medical/road-accident/other/sos) --
  // the same identity color used everywhere else a report's category shows
  // up (ReportHistoryCard, notifications), not by urgency. Lets a
  // responder tell what kind of incident a pin is from the map alone.
  // The nearest-only toggle and a legend category filter are mutually
  // exclusive views over the same list -- selecting one clears the other
  // (see handleToggleNearest/handleSelectCategory) -- so at most one of
  // them narrows what's shown here.
  const visibleIncidents = selectedCategory
    ? incidents.filter((incident) => incident.categoryId === selectedCategory)
    : showNearestOnly && nearestIncident
      ? [nearestIncident]
      : incidents;

  const incidentMarkers: MapMarker[] = visibleIncidents
    .filter((incident) => incident.incidentCoords)
    .map((incident) => ({
      id: incident.id,
      latitude: incident.incidentCoords!.latitude,
      longitude: incident.incidentCoords!.longitude,
      color: getCategoryVisual(incident.categoryId).color,
      // Bare icon, no circular pin background -- same flat treatment as the
      // citizen map's evacuation markers, instead of a busier filled pin.
      flat: true,
      // Every active incident on this map is "live right now" -- SOS and
      // regular reports alike -- so all of them glow, not just SOS.
      pulse: true,
    }));

  // The responder's own position renders as the RiskQ logo pin (same
  // "icon: logo" convention LiveIncidentMap/NavigateScreen already use for
  // a responder), not the blue "you are here" dot -- that dot is the
  // citizen-facing convention (MapboxMap's animated UserLocation), and
  // this map is responder-facing.
  const markers: MapMarker[] = responderCoords
    ? [
        ...incidentMarkers,
        {
          id: SELF_MARKER_ID,
          latitude: responderCoords.latitude,
          longitude: responderCoords.longitude,
          icon: "logo",
          // Same responder-orange used for this marker everywhere else
          // (LiveIncidentMap, the Track Responder screen's route/marker).
          color: COLORS.secondary,
        },
      ]
    : incidentMarkers;

  // Fits the map to every marker whenever the marker count grows -- not on
  // every poll tick (a re-fit on an unchanged set would feel jittery), but
  // specifically when it grows, so a brand-new incident (a fresh SOS
  // reported while this screen is already open) always pulls the camera
  // out to include it instead of silently landing off-screen forever. A
  // one-time-only fit was tried first and was wrong: a responder who
  // opened this screen before a new SOS came in would never see it appear,
  // even though its marker existed and rendered correctly.
  //
  // This can't just live in the map's onReady callback either: onReady
  // fires once, as soon as the native map finishes loading its own
  // tiles/style -- which routinely happens BEFORE getCurrentLocation() +
  // the incidents poll above have actually resolved (that chain is a real
  // GPS fix plus a network round-trip). Watching markers.length directly
  // (gated by mapReady rather than driving off it) fixes the fit
  // regardless of which finishes first.
  useEffect(() => {
    if (!mapReady || markers.length === 0) return;
    if (markers.length <= lastFittedCountRef.current) return;
    lastFittedCountRef.current = markers.length;
    if (markers.length === 1) {
      // A single point (just the responder's own position, no active
      // incidents yet) has no real bounds to fit -- fitToPoints on a
      // zero-area box makes Mapbox zoom out much further than intended,
      // which is why the map kept looking zoomed out by default even after
      // bumping the static initial zoom above. Fly straight to it at the
      // same fixed "clear" zoom handleLocate uses instead.
      mapRef.current?.flyTo(markers[0].latitude, markers[0].longitude, 15);
    } else {
      mapRef.current?.fitToPoints(markers, insets.top + 120);
    }
    // markers is a new array literal every render (incidentMarkers/markers
    // above aren't memoized) -- depending on the array itself would re-run
    // this effect on every render, for no benefit, since the count check
    // above already limits the real work to genuine growth. markers.length
    // is the actual meaningful signal; the effect body still reads the
    // latest markers value from this render's closure when it fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapReady, markers.length, insets.top]);

  const handleLocate = () => {
    if (!responderCoords) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.flyTo(responderCoords.latitude, responderCoords.longitude, 15);
  };

  const handleZoomIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.zoomIn();
    setZoomLevel((current) => Math.min(current + 1, MAX_ZOOM));
  };

  const handleZoomOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    mapRef.current?.zoomOut();
    setZoomLevel((current) => Math.max(current - 1, MIN_ZOOM));
  };

  const handleToggleNearest = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedCategory(null);
    setShowNearestOnly((prev) => {
      const next = !prev;
      if (next && nearestIncident?.incidentCoords) {
        mapRef.current?.flyTo(
          nearestIncident.incidentCoords.latitude,
          nearestIncident.incidentCoords.longitude,
          15,
        );
      }
      return next;
    });
  };

  const handleSelectCategory = (category: string | null) => {
    setShowNearestOnly(false);
    setSelectedCategory(category);
    if (!category) return;

    const matches = incidents
      .filter((incident) => incident.categoryId === category)
      .map((incident) => incident.incidentCoords)
      .filter((coords): coords is NonNullable<typeof coords> => coords != null);

    if (matches.length === 1) {
      mapRef.current?.flyTo(matches[0].latitude, matches[0].longitude, 15);
    } else if (matches.length > 1) {
      mapRef.current?.fitToPoints(matches, insets.top + 120);
    }
  };

  const defaultCenter = responderCoords ?? { latitude: 10.2531, longitude: 123.9494 };

  return (
    <View style={styles.screen}>
      <AppMap
        ref={mapRef}
        style={styles.map}
        center={defaultCenter}
        // Matches handleLocate's own flyTo zoom below -- the file's existing
        // definition of "clear enough to read Cordova without zooming in" --
        // instead of a wider default that only tightens once fitToPoints
        // fires (which never happens with zero active incidents).
        zoom={15}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        showLayerSwitcher
        showUserLocationDot={false}
        topInset={insets.top}
        markers={markers}
        onMarkerPress={(id) => {
          if (id === SELF_MARKER_ID) return;
          router.push(`/responder/${id}`);
        }}
        onRegionChange={(region) => setZoomLevel(region.zoom)}
        onReady={() => setMapReady(true)}
      />

      <View style={[styles.topCard, { top: insets.top + SPACING.sm }]}>
        <View style={styles.topIcon}>
          <Ionicons name="pulse" size={16} color={COLORS.white} />
        </View>
        <View style={styles.topTextCol}>
          <Text style={styles.topTitle}>Live Map</Text>
          <Text style={styles.topSubtitle}>
            {!hasLoadedOnce
              ? "Loading incidents…"
              : loadError
                ? "Couldn't refresh -- showing last known incidents"
                : selectedCategory
                  ? `Showing: ${CATEGORY_LABELS[selectedCategory] ?? selectedCategory} (${incidentMarkers.length})`
                  : showNearestOnly
                  ? "Showing nearest only"
                  : incidents.length === incidentMarkers.length
                  ? `${incidentMarkers.length} active incident${incidentMarkers.length === 1 ? "" : "s"}`
                  : // Some incidents came back with no latitude/longitude --
                    // toIncident() leaves incidentCoords undefined for those,
                    // so they can't be placed as a pin at all. Surfacing the
                    // gap instead of silently under-counting.
                    `${incidentMarkers.length} of ${incidents.length} shown (missing location)`}
          </Text>
        </View>
      </View>

      <NearestIncidentButton
        active={showNearestOnly}
        disabled={!nearestIncident}
        onPress={handleToggleNearest}
        style={{
          position: "absolute",
          right: SPACING.md,
          bottom: tabBarHeight + SPACING.lg + 44 + SPACING.sm + 88 + SPACING.sm,
        }}
      />

      <ZoomControls
        zoomLevel={zoomLevel}
        minZoom={MIN_ZOOM}
        maxZoom={MAX_ZOOM}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        style={{ bottom: tabBarHeight + SPACING.lg + 44 + SPACING.sm }}
      />

      <LocateButton
        isLocating={false}
        onPress={handleLocate}
        style={{ bottom: tabBarHeight + SPACING.lg }}
      />

      <IncidentMapLegend
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        style={{ left: SPACING.md, bottom: tabBarHeight + SPACING.lg }}
      />

      {!hasLoadedOnce && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}
    </View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: COLORS.surface,
    },
    map: {
      ...StyleSheet.absoluteFill,
    },
    topCard: {
      position: "absolute",
      left: SPACING.md,
      right: SPACING.md,
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: SPACING.md,
      ...SHADOW_LG,
    },
    topIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
    },
    topTextCol: {
      flex: 1,
    },
    topTitle: {
      fontFamily: FONT_FAMILY.displaySemibold,
      fontSize: TYPOGRAPHY.body,
      color: COLORS.text,
    },
    topSubtitle: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      marginTop: 1,
    },
    loadingOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
