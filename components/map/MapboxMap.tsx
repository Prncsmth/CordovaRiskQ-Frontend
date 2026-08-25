// components/map/MapboxMap.tsx
// Mapbox implementation of the shared map contract (see types.ts) — used by
// AppMap.tsx for every runtime except Expo Go (dev client, standalone
// builds, web), where the native @rnmapbox/maps module is actually
// available. Requires a dev/standalone build; @rnmapbox/maps cannot load
// inside Expo Go at all, which is why AppMap picks LeafletMap there instead.
import { Ionicons } from "@expo/vector-icons";
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { CORDOVA_BOUNDS } from "@/constants/cordovaBarangays";
import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";
import type { MapEngineProps, MapHandle, MapLatLng } from "./types";

const STYLE_URLS = {
  streets: "mapbox://styles/mapbox/streets-v11",
  satellite: "mapbox://styles/mapbox/satellite-streets-v11",
  terrain: "mapbox://styles/mapbox/outdoors-v11",
} as const;

type StyleKey = keyof typeof STYLE_URLS;

type MapboxModule = {
  default: { setAccessToken: (token: string) => void };
  MapView: React.ComponentType<any>;
  Camera: React.ForwardRefExoticComponent<any>;
  MarkerView: React.ComponentType<any>;
  UserLocation: React.ComponentType<any>;
  ShapeSource: React.ComponentType<any>;
  LineLayer: React.ComponentType<any>;
};

const MapboxMap = forwardRef<MapHandle, MapEngineProps>(function MapboxMap(
  {
    center,
    zoom = 14,
    minZoom = 12,
    maxZoom = 18,
    markers = [],
    polylines = [],
    interactive = true,
    showLayerSwitcher = false,
    onMarkerPress,
    onMapPress,
    onRegionChange,
    onReady,
    style,
  },
  ref,
) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const [mapbox, setMapbox] = useState<MapboxModule | null>(null);
  const [mapError, setMapError] = useState<string | null>(null);
  const [styleKey, setStyleKey] = useState<StyleKey>("streets");
  const cameraRef = useRef<any>(null);
  const currentZoomRef = useRef(zoom);

  useEffect(() => {
    let mounted = true;

    try {
      const module = require("@rnmapbox/maps");
      const mapboxModule = (module as any).default ? (module as any).default : module;
      const setAccessTokenFn =
        mapboxModule.setAccessToken ?? (mapboxModule.default?.setAccessToken as unknown);

      if (typeof setAccessTokenFn === "function") {
        setAccessTokenFn(process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "");
      }

      if (mounted) setMapbox(mapboxModule as unknown as MapboxModule);
    } catch (error) {
      if (!mounted) return;
      console.warn("Failed to load Mapbox module", error);
      setMapError("Map is unavailable. Please rebuild the app with native Mapbox support.");
    }

    return () => {
      mounted = false;
    };
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      flyTo: (latitude: number, longitude: number, zoomLevel?: number) => {
        const nextZoom = zoomLevel ?? currentZoomRef.current;
        currentZoomRef.current = nextZoom;
        cameraRef.current?.setCamera({
          centerCoordinate: [longitude, latitude],
          zoomLevel: nextZoom,
          animationDuration: 600,
        });
      },
      zoomIn: () => {
        const next = Math.min(currentZoomRef.current + 1, maxZoom);
        currentZoomRef.current = next;
        cameraRef.current?.zoomTo(next, 300);
      },
      zoomOut: () => {
        const next = Math.max(currentZoomRef.current - 1, minZoom);
        currentZoomRef.current = next;
        cameraRef.current?.zoomTo(next, 300);
      },
      fitToPoints: (points: MapLatLng[], padding = 60) => {
        if (!points.length) return;
        const lats = points.map((p) => p.latitude);
        const lons = points.map((p) => p.longitude);
        cameraRef.current?.setCamera({
          bounds: {
            ne: [Math.max(...lons), Math.max(...lats)],
            sw: [Math.min(...lons), Math.min(...lats)],
            paddingLeft: padding,
            paddingRight: padding,
            paddingTop: padding,
            paddingBottom: padding,
          },
          animationDuration: 500,
        });
      },
    }),
    [maxZoom, minZoom],
  );

  if (mapError) {
    return (
      <View style={[styles.fallback, style]}>
        <Ionicons name="map-outline" size={26} color={COLORS.textTertiary} />
        <Text style={styles.fallbackText}>{mapError}</Text>
      </View>
    );
  }

  if (!mapbox) {
    return (
      <View style={[styles.fallback, style]}>
        <PlaceholderThumb style={StyleSheet.absoluteFillObject} />
        <ActivityIndicator color={COLORS.primary} />
      </View>
    );
  }

  const { MapView, Camera, MarkerView, UserLocation, ShapeSource, LineLayer } = mapbox;

  return (
    <View style={[styles.fill, style]}>
      <MapView
        style={styles.fill}
        styleURL={STYLE_URLS[styleKey]}
        logoEnabled={false}
        attributionEnabled={interactive}
        scrollEnabled={interactive}
        zoomEnabled={interactive}
        rotateEnabled={interactive}
        pitchEnabled={interactive}
        onDidFinishLoadingMap={() => onReady?.()}
        onPress={(feature: any) => {
          const coords = feature?.geometry?.coordinates;
          if (coords) {
            onMapPress?.({ latitude: coords[1], longitude: coords[0] });
          }
        }}
        onRegionDidChange={(feature: any) => {
          const nextZoom = feature?.properties?.zoomLevel;
          if (typeof nextZoom === "number") {
            currentZoomRef.current = nextZoom;
          }
          const coords = feature?.geometry?.coordinates;
          onRegionChange?.({
            latitude: coords ? coords[1] : center.latitude,
            longitude: coords ? coords[0] : center.longitude,
            zoom: typeof nextZoom === "number" ? nextZoom : currentZoomRef.current,
          });
        }}
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [center.longitude, center.latitude],
            zoomLevel: zoom,
          }}
          maxBounds={CORDOVA_BOUNDS}
          minZoomLevel={minZoom}
          maxZoomLevel={maxZoom}
        />

        {interactive && <UserLocation visible showsUserHeadingIndicator />}

        {polylines.map((line, index) => (
          <ShapeSource
            key={`line-${index}`}
            id={`line-${index}`}
            shape={{
              type: "Feature",
              properties: {},
              geometry: {
                type: "LineString",
                coordinates: line.points.map((p) => [p.longitude, p.latitude]),
              },
            }}
          >
            <LineLayer
              id={`line-layer-${index}`}
              style={{
                lineColor: line.color ?? COLORS.secondary,
                lineWidth: line.weight ?? 3,
                lineDasharray: line.dashed ? [1.4, 1.4] : undefined,
                lineCap: "round",
              }}
            />
          </ShapeSource>
        ))}

        {markers.map((marker) =>
          marker.icon === "logo" ? (
            <MarkerView key={marker.id} coordinate={[marker.longitude, marker.latitude]}>
              <Pressable hitSlop={8} onPress={() => onMarkerPress?.(marker.id)}>
                <Image
                  source={require("@/assets/images/riskq.png")}
                  style={styles.logoPin}
                  resizeMode="contain"
                />
              </Pressable>
            </MarkerView>
          ) : (
            <MarkerView key={marker.id} coordinate={[marker.longitude, marker.latitude]}>
              <Pressable
                hitSlop={8}
                onPress={() => onMarkerPress?.(marker.id)}
                style={[styles.pin, { backgroundColor: marker.color ?? COLORS.primary }]}
              >
                <Ionicons name="location" size={18} color={COLORS.white} />
              </Pressable>
            </MarkerView>
          ),
        )}
      </MapView>

      {showLayerSwitcher && (
        <View style={styles.styleSwitcher}>
          {(Object.keys(STYLE_URLS) as StyleKey[]).map((key) => (
            <Pressable
              key={key}
              onPress={() => setStyleKey(key)}
              style={[styles.styleButton, styleKey === key && styles.styleButtonActive]}
            >
              <Text
                style={[styles.styleButtonText, styleKey === key && styles.styleButtonTextActive]}
              >
                {key === "streets" ? "Map" : key[0].toUpperCase() + key.slice(1)}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
});

export default MapboxMap;

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    fill: {
      flex: 1,
    },
    fallback: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      gap: SPACING.sm,
      paddingHorizontal: SPACING.md,
    },
    fallbackText: {
      color: COLORS.textSecondary,
      fontSize: TYPOGRAPHY.caption,
      textAlign: "center",
    },
    pin: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.full,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: COLORS.white,
    },
    logoPin: {
      width: 36,
      height: 36,
      ...SHADOW,
    },
    styleSwitcher: {
      position: "absolute",
      top: SPACING.sm,
      right: SPACING.sm,
      flexDirection: "row",
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      padding: 4,
      gap: 4,
      ...SHADOW,
    },
    styleButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: RADIUS.sm - 2,
    },
    styleButtonActive: {
      backgroundColor: COLORS.primary,
    },
    styleButtonText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    styleButtonTextActive: {
      color: COLORS.white,
    },
  });
}
