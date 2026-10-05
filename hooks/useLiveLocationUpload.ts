// hooks/useLiveLocationUpload.ts
// Sends this responder's live GPS to PATCH /api/responders/location while
// `active` is true. The backend stores it and pushes it straight to the
// citizen's Track Responder screen over Socket.IO (incident:responderLocation);
// the citizen's 4 s poll of GET /api/incidents/:id/tracking is only the
// backup path. Owned by IncidentDetailScreen, gated on the lobby/on_the_way
// phases and the incident not yet closed -- kept live there via the incident
// socket (connectToIncidentSocket), so this hook doesn't need its own
// polling to know when to stop; it just reacts to `active` flipping false.
// The Navigate screen opens on top of IncidentDetailScreen, so this keeps
// running there too.
//
// While active it:
// - listens to the shared continuous high-accuracy GPS stream
//   (services/liveLocationWatcher.ts) and keeps only the latest fix, instead
//   of requesting a brand-new fix (up to ~8 s) for every upload;
// - every UPLOAD_INTERVAL_MS uploads that latest fix if it moved at least
//   MOVE_THRESHOLD_METERS, or -- standing still -- every
//   CHECK_IN_INTERVAL_MS so the citizen's "Updated Xs ago" stays honest
//   (see shouldUploadFix in utils/liveTracking.ts);
// - falls back to a one-off fix when the stream has nothing yet, or has
//   gone quiet past a check-in, so a missing stream never freezes tracking;
// - keeps the screen awake. There's no background location: an auto-locked
//   screen would pause the app and freeze the responder's marker mid-drive.
//   Released as soon as `active` turns false (arrived, left, incident
//   closed, or leaving the incident screen), so it never drains the battery
//   elsewhere.
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useEffect } from "react";

import { updateResponderLocation } from "@/responder/services/incident.service";
import { subscribeToLiveLocation, type LiveFix } from "@/services/liveLocationWatcher";
import { getCurrentLocation, type Coordinates } from "@/services/location.service";
import { CHECK_IN_INTERVAL_MS, shouldUploadFix, UPLOAD_INTERVAL_MS } from "@/utils/liveTracking";
import { holdScreenAwake } from "@/utils/screenAwake";

const keepAwakeApi = { activate: activateKeepAwakeAsync, deactivate: deactivateKeepAwake };

export function useLiveLocationUpload(token: string | null, active: boolean): void {
  useEffect(() => {
    if (!active || !token) return;

    // Fresh window each time `active` turns true (e.g. re-entering
    // on_the_way after a resync) -- always send the first fix of a window
    // regardless of how close it is to wherever a previous window left off.
    let lastSent: Coordinates | null = null;
    let lastSentAt = 0;
    let latestFix: LiveFix | null = null;
    let cancelled = false;
    // An upload (or a fallback fix) can outlast one interval; skip a tick
    // rather than run two at once, so an older fix can never be uploaded
    // after a newer one (which would make the marker jump backwards).
    let inFlight = false;

    const startedAt = Date.now();
    const releaseScreen = holdScreenAwake(keepAwakeApi);

    const tick = async () => {
      if (inFlight) return;
      inFlight = true;
      try {
        let fix: Coordinates | null = latestFix;
        const now = Date.now();
        // Give the stream one interval to deliver its first fix before
        // falling back; after that, fall back whenever it has gone quiet
        // past a check-in.
        const streamQuiet = latestFix
          ? now - latestFix.receivedAt >= CHECK_IN_INTERVAL_MS && now - lastSentAt >= CHECK_IN_INTERVAL_MS
          : now - startedAt >= UPLOAD_INTERVAL_MS;
        if (streamQuiet) {
          const oneOff = await getCurrentLocation({ accuracy: "high" });
          if (cancelled) return;
          // A stream fix that landed while we waited is newer -- prefer it.
          if (latestFix && Date.now() - latestFix.receivedAt < CHECK_IN_INTERVAL_MS) fix = latestFix;
          else if (oneOff) fix = oneOff;
        }
        if (!fix || !shouldUploadFix(lastSent, lastSentAt, fix, Date.now())) return;

        try {
          await updateResponderLocation(token, { latitude: fix.latitude, longitude: fix.longitude });
          if (!cancelled) {
            lastSent = fix;
            lastSentAt = Date.now();
          }
        } catch {
          // Transient network/server failure (or a stale 403 the instant
          // eligibility ends) -- keep trying on the next tick instead of
          // crashing or blocking the UI. If eligibility has genuinely ended,
          // the caller's own `active` flag flips false on the next incident
          // update and this effect tears itself down anyway.
        }
      } finally {
        inFlight = false;
      }
    };

    // The very first stream fix of the window goes out right away instead of
    // waiting for the next tick, so the citizen sees the responder ASAP.
    // Only once -- if that upload fails, the regular ticks retry, never the
    // 1 s GPS stream.
    let kickedOff = false;
    const unsubscribe = subscribeToLiveLocation((fix) => {
      latestFix = fix;
      if (!kickedOff) {
        kickedOff = true;
        tick();
      }
    });

    const interval = setInterval(tick, UPLOAD_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
      unsubscribe();
      releaseScreen();
    };
  }, [active, token]);
}
