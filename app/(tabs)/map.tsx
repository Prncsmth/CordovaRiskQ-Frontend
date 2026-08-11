import * as Location from "expo-location";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const DEFAULT_CENTER = { latitude: 10.2489, longitude: 123.9506 };

function buildMapHtml(centers: EvacuationCenter[]): string {
  const markers = centers.map((c) => ({
    id: c.id,
    name: c.name,
    address: c.address,
    status: c.status,
    latitude: c.latitude,
    longitude: c.longitude,
  }));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .center-popup { font-family: -apple-system, Roboto, sans-serif; }
    .center-popup .name { font-weight: 700; margin-bottom: 2px; }
    .center-popup .status-open { color: #1E8E3E; }
    .center-popup .status-full { color: #D93025; }
    .leaflet-control-layers { font-family: -apple-system, Roboto, sans-serif; font-size: 13px; }
    .user-dot { width: 16px; height: 16px; border-radius: 50%; background: #1A73E8; border: 3px solid #fff; box-shadow: 0 0 0 2px rgba(26,115,232,0.35); }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    var markers = ${JSON.stringify(markers)};
    var map = L.map('map', { zoomControl: false }).setView(
      [${DEFAULT_CENTER.latitude}, ${DEFAULT_CENTER.longitude}], 14
    );

    var streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    });

    var satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      attribution: 'Tiles &copy; Esri',
      maxZoom: 19,
    });

    var terrain = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
      attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
      maxZoom: 17,
    });

    streets.addTo(map);

    L.control.layers(
      { 'Map': streets, 'Satellite': satellite, 'Terrain': terrain },
      null,
      { position: 'topright', collapsed: true }
    ).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    markers.forEach(function (center) {
      var marker = L.marker([center.latitude, center.longitude]).addTo(map);
      var statusClass = center.status === 'open' ? 'status-open' : 'status-full';
      var statusLabel = center.status === 'open' ? 'Open' : 'Full';
      marker.bindPopup(
        '<div class="center-popup">' +
          '<div class="name">' + center.name + '</div>' +
          '<div>' + center.address + '</div>' +
          '<div class="' + statusClass + '">' + statusLabel + '</div>' +
        '</div>'
      );
      marker.on('click', function () {
        window.ReactNativeWebView.postMessage(JSON.stringify({ id: center.id }));
      });
    });

    var userMarker = null;
    var hasCenteredOnUser = false;
    window.setUserLocation = function (lat, lng) {
      var latlng = [lat, lng];
      if (!userMarker) {
        userMarker = L.marker(latlng, {
          icon: L.divIcon({ className: 'user-dot', iconSize: [16, 16] }),
          zIndexOffset: 1000,
        }).addTo(map);
      } else {
        userMarker.setLatLng(latlng);
      }
      if (!hasCenteredOnUser) {
        hasCenteredOnUser = true;
        map.setView(latlng, 15);
      }
    };
  </script>
</body>
</html>
`;
}

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const webviewRef = useRef<WebView>(null);
  const [centers, setCenters] = useState<EvacuationCenter[]>([]);
  const [locationDenied, setLocationDenied] = useState(false);

  useEffect(() => {
    getEvacuationCenters()
      .then(setCenters)
      .catch(() => {});
  }, []);

  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setLocationDenied(true);
        return;
      }

      subscription = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Balanced, distanceInterval: 10, timeInterval: 5000 },
        (position) => {
          const { latitude, longitude } = position.coords;
          webviewRef.current?.injectJavaScript(
            `window.setUserLocation && window.setUserLocation(${latitude}, ${longitude}); true;`,
          );
        },
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  const html = useMemo(() => buildMapHtml(centers), [centers]);

  const handleMessage = (event: WebViewMessageEvent) => {
    try {
      const { id } = JSON.parse(event.nativeEvent.data) as { id: string };
      router.push(`/evacuation-detail/${id}`);
    } catch {
      // Ignore malformed messages from the WebView.
    }
  };

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + SPACING.sm }]}>
        <Text style={styles.title}>Evacuation Map</Text>
        <Text style={styles.subtitle}>
          {locationDenied
            ? "Nearby evacuation centers"
            : "Nearby evacuation centers · live location"}
        </Text>
      </View>

      <WebView
        ref={webviewRef}
        style={styles.map}
        originWhitelist={["*"]}
        source={{ html }}
        onMessage={handleMessage}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  map: {
    flex: 1,
  },
});
