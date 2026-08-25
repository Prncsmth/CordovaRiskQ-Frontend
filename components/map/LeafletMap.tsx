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

// Small (64px-wide) version of assets/images/riskq.png, inlined as a data
// URI so the WebView can render it without needing to load a bundled asset
// across its own separate origin. Used for markers with `icon: "logo"`.
const RISKQ_LOGO_DATA_URI =
  "data:image/png;base64,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";

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
  const riskqLogoDataUri = RISKQ_LOGO_DATA_URI;
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
  .rq-logo-marker { filter: drop-shadow(0 2px 4px rgba(0,0,0,0.35)); }
</style>
</head>
<body>
<div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var RISKQ_LOGO = '${riskqLogoDataUri}';
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

  function logoIcon() {
    return L.icon({
      iconUrl: RISKQ_LOGO,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
      popupAnchor: [0, -18],
      className: 'rq-logo-marker'
    });
  }

  window.rqSetMarkers = function (json) {
    var markers = JSON.parse(json);
    markersLayer.clearLayers();
    markers.forEach(function (m) {
      var marker = L.marker([m.latitude, m.longitude], {
        icon: m.icon === 'logo' ? logoIcon() : pinIcon(m.color || '#2563eb')
      });
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
