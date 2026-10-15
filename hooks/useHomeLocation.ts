import { useEffect, useState } from "react";

import { subscribeToLiveLocation, type LiveFix } from "@/services/liveLocationWatcher";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import { formatHomeLocationLabel, reverseGeocodeLocality } from "@/services/geocoding.service";
import { distanceMeters, isValidCoordinate } from "@/utils/liveTracking";

const MAX_FIX_ACCURACY_METERS = 50;
const MIN_REVERSE_GEOCODE_MOVEMENT_METERS = 100;
const MIN_REVERSE_GEOCODE_INTERVAL_MS = 15_000;

export function useHomeLocation(): string {
  const [label, setLabel] = useState("Finding your location…");

  useEffect(() => {
    let cancelled = false;
    let requestId = 0;
    let resolvedInitialLocation = false;
    let lastAccepted: Coordinates | undefined;
    let lastGeocoded: Coordinates | undefined;
    let lastGeocodedAt = 0;

    const geocode = (coords: Coordinates) => {
      const now = Date.now();
      if (lastGeocoded) {
        const moved = distanceMeters(lastGeocoded, coords);
        if (
          moved < MIN_REVERSE_GEOCODE_MOVEMENT_METERS ||
          now - lastGeocodedAt < MIN_REVERSE_GEOCODE_INTERVAL_MS
        ) {
          return;
        }
      }

      lastGeocoded = coords;
      lastGeocodedAt = now;
      const thisRequest = ++requestId;
      void reverseGeocodeLocality(coords).then((result) => {
        if (cancelled || thisRequest !== requestId) return;
        const nextLabel = formatHomeLocationLabel(result);
        if (nextLabel) setLabel(nextLabel);
        else if (!resolvedInitialLocation) setLabel("Location unavailable");
        resolvedInitialLocation = true;
      });
    };

    const accept = (fix: Coordinates & { accuracy?: number | null }) => {
      if (!isValidCoordinate(fix)) return;
      if (fix.accuracy != null && fix.accuracy > MAX_FIX_ACCURACY_METERS) return;
      if (lastAccepted && distanceMeters(lastAccepted, fix) < 5) return;
      lastAccepted = { latitude: fix.latitude, longitude: fix.longitude };
      geocode(lastAccepted);
    };

    const unsubscribe = subscribeToLiveLocation((fix: LiveFix) => accept(fix));
    void getCurrentLocation({ accuracy: "high" }).then((fix) => {
      if (cancelled) return;
      if (fix && !lastAccepted) accept(fix);
      if (!lastAccepted) {
        resolvedInitialLocation = true;
        setLabel("Location unavailable");
      }
    });

    const unavailableTimer = setTimeout(() => {
      if (!cancelled && !lastAccepted) {
        resolvedInitialLocation = true;
        setLabel("Location unavailable");
      }
    }, 10_000);

    return () => {
      cancelled = true;
      requestId += 1;
      clearTimeout(unavailableTimer);
      unsubscribe();
    };
  }, []);

  return label;
}
