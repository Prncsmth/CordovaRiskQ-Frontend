// hooks/useLiveCoordinates.ts
// This device's live position for the route maps (the responder's
// OnTheWayView/NavigateScreen and the citizen's evacuation route,
// app/evacuation-detail/navigate.tsx), which used to read the location once on
// mount and never again -- so the responder's own marker and route stayed
// where they started. Reads from the shared continuous GPS stream
// (services/liveLocationWatcher.ts), so it adds no second native watcher
// next to the upload loop, and stops listening on unmount.
//
// Seeded with one getCurrentLocation() so the screen still renders as fast
// as before even if the stream's first fix takes a moment. Only re-renders
// once the position has moved MIN_MOVE_METERS, not on every GPS tick; the
// route itself is rate-limited separately (hooks/useRouteOrigin.ts).
import { useEffect, useState } from "react";

import { subscribeToLiveLocation } from "@/services/liveLocationWatcher";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import { nextLiveMarkerPosition } from "@/utils/liveTracking";

const MIN_MOVE_METERS = 5;

export function useLiveCoordinates(): {
  coords: Coordinates | undefined;
  // True once the initial lookup has finished, whether or not it found a
  // position -- lets a screen tell "still locating" from "unavailable".
  resolved: boolean;
} {
  const [coords, setCoords] = useState<Coordinates | undefined>();
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let gotStreamFix = false;

    // Invalid positions (NaN, out of range, 0,0) and fixes too vague to use
    // are skipped -- the last good position stays -- so a bad GPS reading
    // can never become a marker position or a route origin.
    const accept = (next: Coordinates & { accuracy?: number | null }) => {
      setCoords((prev) => nextLiveMarkerPosition(prev, next, MIN_MOVE_METERS));
      setResolved(true);
    };

    getCurrentLocation()
      .then((fix) => {
        if (cancelled) return;
        // The stream already answered with something fresher.
        if (fix && !gotStreamFix) accept(fix);
        setResolved(true);
      })
      .catch(() => {
        if (!cancelled) setResolved(true);
      });

    const unsubscribe = subscribeToLiveLocation((fix) => {
      if (cancelled) return;
      gotStreamFix = true;
      accept(fix);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { coords, resolved };
}
