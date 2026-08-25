// components/map/LeafletMap.tsx
// Leaflet map rendered inside a WebView — the map engine used only when the
// app is running inside Expo Go (see AppMap.tsx), since react-native-webview
// ships in the Expo Go client and needs no native config or access token.
// The map is always hard-clamped to CORDOVA_BOUNDS — panning cannot leave
// the municipality, only zooming in/out within it.
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import WebView, { type WebViewMessageEvent } from "react-native-webview";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { CORDOVA_BOUNDS } from "@/constants/cordovaBarangays";
import { useThemeColors } from "@/theme";
import type { MapEngineProps, MapHandle, MapLatLng } from "./types";

const DEFAULT_MIN_ZOOM = 12;
const DEFAULT_MAX_ZOOM = 18;

function buildHtml(options: {
  centerLat: number;
  centerLng: number;
  zoom: number;
  minZoom: number;
  maxZoom: number;
  interactive: boolean;
  showLayerSwitcher: boolean;
}): string {
  const { centerLat, centerLng, zoom, minZoom, maxZoom, interactive, showLayerSwitcher } = options;
  const [swLng, swLat] = CORDOVA_BOUNDS.sw;
  const [neLng, neLat] = CORDOVA_BOUNDS.ne;

  return `<!DOCTYPE html>
<html>
<head>
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #dbe4ea; }
  .leaflet-control-attribution { font-size: 9px; }
  .rq-user-dot { width: 16px; height: 16px; border-radius: 50%; background: #2563eb; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(37,99,235,0.35); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var bounds = L.latLngBounds([${swLat}, ${swLng}], [${neLat}, ${neLng}]);

  var map = L.map('map', {
    center: [${centerLat}, ${centerLng}],
    zoom: ${zoom},
    minZoom: ${minZoom},
    maxZoom: ${maxZoom},
    maxBounds: bounds,
    maxBoundsViscosity: 1.0,
    zoomControl: false,
    attributionControl: true,
    dragging: ${interactive},
    touchZoom: ${interactive},
    scrollWheelZoom: ${interactive},
    doubleClickZoom: ${interactive},
    boxZoom: ${interactive},
    keyboard: ${interactive},
    tap: ${interactive},
    inertia: ${interactive}
  });

  var streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri'
  });

  var terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
    maxZoom: 17,
    attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap'
  });

  if (${showLayerSwitcher}) {
    L.control.layers(
      { 'Streets': streets, 'Satellite': satellite, 'Terrain': terrain },
      {},
      { position: 'topright', collapsed: true }
    ).addTo(map);
  }

  var markersLayer = L.layerGroup().addTo(map);
  var polylinesLayer = L.layerGroup().addTo(map);
  var userMarker = null;
  var userAccuracyCircle = null;

  function post(message) {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(JSON.stringify(message));
    }
  }

  function pinIcon(color) {
    return L.divIcon({
      className: '',
      html: '<div style="width:28px;height:28px;border-radius:50% 50% 50% 0;background:' + color + ';border:2px solid #fff;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.35);"></div>',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28]
    });
  }

  window.rqSetMarkers = function (json) {
    var markers = JSON.parse(json);
    markersLayer.clearLayers();
    markers.forEach(function (m) {
      var marker = L.marker([m.latitude, m.longitude], { icon: pinIcon(m.color || '#2563eb') });
      if (m.label) marker.bindPopup(m.label);
      marker.on('click', function (e) {
        L.DomEvent.stopPropagation(e);
        post({ type: 'markerPress', id: m.id });
      });
      marker.addTo(markersLayer);
    });
  };

  window.rqSetPolylines = function (json) {
    var lines = JSON.parse(json);
    polylinesLayer.clearLayers();
    lines.forEach(function (line) {
      var latlngs = line.points.map(function (p) { return [p.latitude, p.longitude]; });
      L.polyline(latlngs, {
        color: line.color || '#0ea5e9',
        weight: line.weight || 3,
        dashArray: line.dashed ? '6, 8' : null,
        lineCap: 'round'
      }).addTo(polylinesLayer);
    });
  };

  window.rqSetUserLocation = function (json) {
    var loc = JSON.parse(json);
    var latlng = [loc.latitude, loc.longitude];
    if (!userMarker) {
      userMarker = L.marker(latlng, {
        icon: L.divIcon({ className: '', html: '<div class="rq-user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] }),
        zIndexOffset: 1000
      }).addTo(map);
    } else {
      userMarker.setLatLng(latlng);
    }
    if (loc.accuracy) {
      if (!userAccuracyCircle) {
        userAccuracyCircle = L.circle(latlng, { radius: loc.accuracy, color: '#2563eb', weight: 1, fillOpacity: 0.08 }).addTo(map);
      } else {
        userAccuracyCircle.setLatLng(latlng);
        userAccuracyCircle.setRadius(loc.accuracy);
      }
    }
  };

  window.rqClearUserLocation = function () {
    if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
    if (userAccuracyCircle) { map.removeLayer(userAccuracyCircle); userAccuracyCircle = null; }
  };

  window.rqFlyTo = function (lat, lng, zoomLevel) {
    map.flyTo([lat, lng], zoomLevel || map.getZoom(), { duration: 0.6 });
  };

  window.rqZoomIn = function () { map.zoomIn(); };
  window.rqZoomOut = function () { map.zoomOut(); };

  window.rqFitToPoints = function (json, padding) {
    var points = JSON.parse(json);
    if (!points.length) return;
    var latlngs = points.map(function (p) { return [p.latitude, p.longitude]; });
    map.fitBounds(L.latLngBounds(latlngs), { padding: [padding || 60, padding || 60] });
  };

  map.on('moveend', function () {
    var c = map.getCenter();
    post({ type: 'regionChange', latitude: c.lat, longitude: c.lng, zoom: map.getZoom() });
  });

  map.on('click', function (e) {
    post({ type: 'mapPress', latitude: e.latlng.lat, longitude: e.latlng.lng });
  });

  map.whenReady(function () { post({ type: 'ready' }); });
})();
</script>
</body>
</html>`;
}

const LeafletMap = forwardRef<MapHandle, MapEngineProps>(function LeafletMap(
  {
    center,
    zoom = 14,
    minZoom = DEFAULT_MIN_ZOOM,
    maxZoom = DEFAULT_MAX_ZOOM,
    markers = [],
    polylines = [],
    userLocation = null,
    interactive = true,
    showLayerSwitcher = true,
    onMarkerPress,
    onMapPress,
    onRegionChange,
    onReady,
    style,
  },
  ref,
) {
  const COLORS = useThemeColors();
  const webViewRef = useRef<WebView>(null);
  const isReady = useRef(false);
  const [loaded, setLoaded] = useState(false);

  // Built once from the initial center/zoom/mode — subsequent updates go
  // through injectJavaScript so the WebView never reloads.
  const html = useMemo(
    () =>
      buildHtml({
        centerLat: center.latitude,
        centerLng: center.longitude,
        zoom,
        minZoom,
        maxZoom,
        interactive,
        showLayerSwitcher,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  useEffect(() => {
    if (!isReady.current) return;
    webViewRef.current?.injectJavaScript(
      `window.rqSetMarkers(${JSON.stringify(JSON.stringify(markers))}); true;`,
    );
  }, [markers]);

  useEffect(() => {
    if (!isReady.current) return;
    webViewRef.current?.injectJavaScript(
      `window.rqSetPolylines(${JSON.stringify(JSON.stringify(polylines))}); true;`,
    );
  }, [polylines]);

  useEffect(() => {
    if (!isReady.current) return;
    if (userLocation) {
      webViewRef.current?.injectJavaScript(
        `window.rqSetUserLocation(${JSON.stringify(JSON.stringify(userLocation))}); true;`,
      );
    } else {
      webViewRef.current?.injectJavaScript(`window.rqClearUserLocation(); true;`);
    }
  }, [userLocation]);

  useImperativeHandle(ref, () => ({
    flyTo: (latitude: number, longitude: number, zoomLevel?: number) => {
      webViewRef.current?.injectJavaScript(
        `window.rqFlyTo(${latitude}, ${longitude}, ${zoomLevel ?? ""}); true;`,
      );
    },
    zoomIn: () => {
      webViewRef.current?.injectJavaScript(`window.rqZoomIn(); true;`);
    },
    zoomOut: () => {
      webViewRef.current?.injectJavaScript(`window.rqZoomOut(); true;`);
    },
    fitToPoints: (points: MapLatLng[], padding?: number) => {
      webViewRef.current?.injectJavaScript(
        `window.rqFitToPoints(${JSON.stringify(JSON.stringify(points))}, ${padding ?? 60}); true;`,
      );
    },
  }));

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "ready") {
        isReady.current = true;
        if (markers.length) {
          webViewRef.current?.injectJavaScript(
            `window.rqSetMarkers(${JSON.stringify(JSON.stringify(markers))}); true;`,
          );
        }
        if (polylines.length) {
          webViewRef.current?.injectJavaScript(
            `window.rqSetPolylines(${JSON.stringify(JSON.stringify(polylines))}); true;`,
          );
        }
        if (userLocation) {
          webViewRef.current?.injectJavaScript(
            `window.rqSetUserLocation(${JSON.stringify(JSON.stringify(userLocation))}); true;`,
          );
        }
        setLoaded(true);
        onReady?.();
      } else if (data.type === "markerPress") {
        onMarkerPress?.(data.id);
      } else if (data.type === "mapPress") {
        onMapPress?.({ latitude: data.latitude, longitude: data.longitude });
      } else if (data.type === "regionChange") {
        onRegionChange?.({
          latitude: data.latitude,
          longitude: data.longitude,
          zoom: data.zoom,
        });
      }
    } catch {
      // ignore malformed bridge messages
    }
  };

  return (
    <View style={[styles.fill, style]}>
      <WebView
        ref={webViewRef}
        originWhitelist={["*"]}
        source={{ html }}
        style={styles.fill}
        onMessage={handleMessage}
        pointerEvents={interactive ? "auto" : "none"}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        androidLayerType="hardware"
      />
      {!loaded && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <PlaceholderThumb style={StyleSheet.absoluteFillObject} />
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}
    </View>
  );
});

export default LeafletMap;

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
});
