// context/SosContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";

import { getNearestBarangay } from "@/constants/cordovaBarangays";
import { useAuth } from "@/context/AuthContext";
import type { ApiError } from "@/services/api";
import { reverseGeocode } from "@/services/geocoding.service";
import { getVerifiedLocation } from "@/services/location.service";
import { cancelSosIncident, triggerSOS } from "@/services/sos.service";
import { getResponderTracking, type TrackingSnapshot } from "@/services/tracking.service";
import { isInsideCordova } from "@/utils/geofence";

type SosStage = "idle" | "confirm" | "verifying" | "sending" | "active";
type SosBlockedReason = "permission" | "unavailable" | null;

// Whether a responder has accepted this SOS's linked incident yet --
// separate from SosStage, which only tracks the citizen's own send/cancel
// flow. "idle" here means "not currently tracking" (SOS isn't active),
// distinct from SosStage's "idle".
export type SosTrackingState =
  | { kind: "idle" }
  | { kind: "waiting" }
  | { kind: "live"; snapshot: TrackingSnapshot };

type SosContextValue = {
  stage: SosStage;
  blockedReason: SosBlockedReason;
  isMinimized: boolean;
  incidentId: string | null;
  tracking: SosTrackingState;
  showAssignedToast: boolean;
  showResolvedToast: boolean;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
  expandSOS: () => void;
  minimizeSOS: () => void;
  dismissBlocked: () => void;
  retryConfirm: () => void;
  dismissAssignedToast: () => void;
  dismissResolvedToast: () => void;
};

// Matches useResponderTracking's own POLL_INTERVAL_MS -- this poll serves
// the same purpose (has a responder accepted the incident this SOS created)
// but runs off SosStage instead of screen focus, since the bubble/full-screen
// SOS UI can be showing over any screen in the app.
const TRACKING_POLL_INTERVAL_MS = 4000;

const SosContext = createContext<SosContextValue | undefined>(undefined);

// How long the full-screen "Help Is On The Way" overlay stays up before
// auto-minimizing to a persistent banner -- the SOS itself stays active
// server-side either way; this only affects how much of the screen the
// citizen gets back. One-shot: re-expanding via the banner (expandSOS)
// does not restart this timer, so a screen the user deliberately reopened
// never gets yanked away from under them.
const AUTO_MINIMIZE_DELAY_MS = 20_000;

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");
  const [blockedReason, setBlockedReason] = useState<SosBlockedReason>(null);
  const [incidentId, setIncidentId] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [tracking, setTracking] = useState<SosTrackingState>({ kind: "idle" });
  const [showAssignedToast, setShowAssignedToast] = useState(false);
  const [showResolvedToast, setShowResolvedToast] = useState(false);
  const { token } = useAuth();
  const inFlightRef = useRef(false);
  const minimizeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks whether this SOS's incident has already been seen "live" (a
  // responder accepted) -- so the toast fires exactly once per SOS, not on
  // every poll tick after the first.
  const trackingWasLiveRef = useRef(false);

  const clearMinimizeTimer = () => {
    if (minimizeTimerRef.current) {
      clearTimeout(minimizeTimerRef.current);
      minimizeTimerRef.current = null;
    }
  };
  // Identifies which runConfirm() call is still "live" -- cancelSOS() bumps
  // this so an abandoned attempt's own async continuation (its getVerifiedLocation
  // or triggerSOS await resolving after the user already cancelled) can tell
  // it's stale and skip touching stage/blockedReason or releasing a guard a
  // newer attempt may since have taken. Without this, cancelling mid-flight
  // and immediately retrying races the original attempt's `finally` clearing
  // inFlightRef out from under the new one, and the original attempt's delayed
  // resolution can pop a blocked-reason modal out of context long after cancel.
  const attemptIdRef = useRef(0);

  const runConfirm = async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    const myAttemptId = ++attemptIdRef.current;
    const isCurrent = () => attemptIdRef.current === myAttemptId;

    setIncidentId(null);
    setIsMinimized(false);
    setShowResolvedToast(false);
    clearMinimizeTimer();
    try {
      setStage("verifying");
      const result = await getVerifiedLocation();
      if (!isCurrent()) return;

      if (result.status === "denied") {
        setStage("idle");
        setBlockedReason("permission");
        return;
      }
      if (result.status === "unavailable" || !isInsideCordova(result.coords.latitude, result.coords.longitude)) {
        setStage("idle");
        setBlockedReason("unavailable");
        return;
      }

      if (!token) {
        setStage("idle");
        setBlockedReason("unavailable");
        return;
      }

      setStage("sending");

      const barangayLabel = `Barangay ${getNearestBarangay(result.coords.latitude, result.coords.longitude).name}, Cordova`;
      // Best-effort upgrade to a full street-level address, same source
      // (reverseGeocode) the Report Incident flow already uses -- without
      // this, every SOS alert only ever carried the coarse barangay
      // fallback, since nothing here ever called it. Raced against a short
      // local timeout (separate from reverseGeocode's own internal 15s
      // one) so a slow/unresponsive geocoder can't meaningfully delay an
      // emergency send; falls back to the barangay label either way.
      const geocoded = await Promise.race([
        reverseGeocode(result.coords),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]).catch(() => null);
      if (!isCurrent()) return;
      const locationLabel = geocoded ?? barangayLabel;
      try {
        const alert = await triggerSOS(token, result.coords, locationLabel);
        if (!isCurrent()) return;
        setIncidentId(alert.incidentId);
        setStage("active");
        minimizeTimerRef.current = setTimeout(() => {
          if (isCurrent()) setIsMinimized(true);
        }, AUTO_MINIMIZE_DELAY_MS);
      } catch (error) {
        console.warn("Failed to send SOS alert", error);
        if (isCurrent()) {
          setStage("idle");
          setBlockedReason("unavailable");
        }
      }
    } finally {
      if (isCurrent()) inFlightRef.current = false;
    }
  };

  // Handles both "back out before anything was sent" (confirm/verifying/
  // sending -- just abandon locally, nothing to tell the backend) and "back
  // out of an already-sent SOS" (active -- ask the backend to cancel, since
  // it's the source of truth for whether a responder has since joined).
  const runCancel = async () => {
    const wasActive = stage === "active";
    const activeIncidentId = incidentId;

    attemptIdRef.current += 1;
    inFlightRef.current = false;
    clearMinimizeTimer();

    if (wasActive && activeIncidentId && token) {
      try {
        await cancelSosIncident(token, activeIncidentId);
      } catch (err) {
        if ((err as Partial<ApiError>)?.status === 409) {
          Alert.alert(
            "Can't cancel",
            "A responder has already been assigned to your SOS and is on the way.",
          );
        } else {
          Alert.alert("Couldn't cancel", "Please check your connection and try again.");
        }
        return;
      }
    }

    setStage("idle");
    setIncidentId(null);
    setIsMinimized(false);
  };

  // Wipe all SOS state on logout -- otherwise a leftover active/minimized
  // SOS from the previous session would keep showing on the login screen,
  // or worse, bleed into whichever account logs in next on the same device.
  useEffect(() => {
    if (token) return;
    attemptIdRef.current += 1;
    inFlightRef.current = false;
    clearMinimizeTimer();
    setStage("idle");
    setBlockedReason(null);
    setIncidentId(null);
    setIsMinimized(false);
    setShowResolvedToast(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Polls whether a responder has accepted this SOS's incident yet, using
  // the same real GET /api/incidents/:id/tracking endpoint the Track
  // Responder screen already trusts. Runs off SosStage rather than
  // useFocusEffect/screen focus -- unlike that screen, this needs to keep
  // working while the citizen is anywhere else in the app with the SOS
  // bubble minimized. Naturally resets to "idle" (and re-arms the
  // one-shot toast) whenever stage leaves "active", including a brand new
  // SOS started right after this one.
  useEffect(() => {
    if (stage !== "active" || !incidentId || !token) {
      // Deliberately does NOT touch showResolvedToast: the "ended" branch
      // below sets that flag true in the same batch as setStage("idle"),
      // which re-triggers this very effect (stage is a dependency) -- if
      // this guard also cleared it, the toast would be wiped before it
      // ever rendered. runConfirm() and the logout effect reset it
      // instead, at points that can't race a just-set toast.
      setTracking({ kind: "idle" });
      setShowAssignedToast(false);
      trackingWasLiveRef.current = false;
      return;
    }

    let stopped = false;
    const poll = () => {
      if (stopped) return;
      getResponderTracking(token, incidentId)
        .then((result) => {
          if (stopped) return;
          if (result.state === "ok") {
            setTracking({ kind: "live", snapshot: result.snapshot });
            if (!trackingWasLiveRef.current) {
              trackingWasLiveRef.current = true;
              setShowAssignedToast(true);
              // A responder accepting means the citizen should stay put on
              // the active SOS view instead of being auto-minimized out
              // from under them -- cancel runConfirm's still-pending
              // 20s auto-minimize timer, if it hasn't fired yet.
              clearMinimizeTimer();
            }
          } else if (result.state === "waiting") {
            setTracking({ kind: "waiting" });
          } else if (result.state === "ended") {
            // The incident left its active window -- most commonly a
            // responder marking it resolved, but also covers a
            // cancellation from elsewhere. Nothing previously reset the
            // citizen's own SOS UI for this, so it used to just sit on
            // "Responder Assigned" forever. Resetting `stage` here is what
            // actually dismisses the full-screen view/bubble; this
            // effect's own dependency-change cleanup (stage leaving
            // "active") stops the poll.
            setShowAssignedToast(false);
            setShowResolvedToast(true);
            setStage("idle");
            setIncidentId(null);
            setIsMinimized(false);
          }
          // "forbidden" -- shouldn't happen for the SOS's own creator
          // (the tracking endpoint's reporter-only check), so left as-is
          // if it somehow does rather than guessing at a response.
        })
        // Transient network/server failure -- keep last known state, retry
        // next tick, same best-effort handling as useResponderTracking.
        .catch(() => {});
    };

    poll();
    const intervalId = setInterval(poll, TRACKING_POLL_INTERVAL_MS);
    return () => {
      stopped = true;
      clearInterval(intervalId);
    };
  }, [stage, incidentId, token]);

  const value = useMemo(
    () => ({
      stage,
      blockedReason,
      isMinimized,
      incidentId,
      tracking,
      showAssignedToast,
      showResolvedToast,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        void runConfirm();
      },
      cancelSOS: () => {
        void runCancel();
      },
      expandSOS: () => setIsMinimized(false),
      minimizeSOS: () => setIsMinimized(true),
      dismissBlocked: () => setBlockedReason(null),
      retryConfirm: () => {
        setBlockedReason(null);
        void runConfirm();
      },
      dismissAssignedToast: () => setShowAssignedToast(false),
      dismissResolvedToast: () => setShowResolvedToast(false),
    }),
    [
      stage,
      blockedReason,
      isMinimized,
      token,
      incidentId,
      tracking,
      showAssignedToast,
      showResolvedToast,
    ],
  );

  return <SosContext.Provider value={value}>{children}</SosContext.Provider>;
}

export function useSos() {
  const context = useContext(SosContext);

  if (!context) {
    throw new Error("useSos must be used within a SosProvider");
  }

  return context;
}
