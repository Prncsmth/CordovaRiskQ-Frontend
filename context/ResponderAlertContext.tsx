// context/ResponderAlertContext.tsx
// App-wide "a new incident/SOS just came in" popup for responders, mirroring
// SosContext's pattern: this holds pure state, RingOverlay renders it.
// Polls independently of DashboardScreen's own poll so a responder gets
// alerted no matter which screen they're on -- except while they're already
// working a specific incident, where a new one is queued (not popped up)
// and only surfaces once they finish that incident or return to a free
// screen, so a new alert never interrupts one already in progress.
import { usePathname, useRouter } from "expo-router";
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "@/context/AuthContext";
import {
  declineIncident,
  getIncidents,
  joinIncident,
} from "@/responder/services/incident.service";
import type { Incident } from "@/responder/types/responder";

const POLL_INTERVAL_MS = 10_000;

// True on a specific incident's own detail route (/responder/<id>), false
// on the dashboard, the completed list, or anywhere else -- the one place
// a responder counts as "busy" and shouldn't be interrupted.
function isBusyWithIncident(path: string): boolean {
  return /^\/responder\/(?!completed$)[^/]+/.test(path);
}

type ResponderAlertContextValue = {
  pendingIncident: Incident | null;
  queuedCount: number;
  accept: () => void;
  decline: () => void;
};

const ResponderAlertContext = createContext<ResponderAlertContextValue | undefined>(
  undefined,
);

export function ResponderAlertProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingIncident, setPendingIncident] = useState<Incident | null>(null);
  const [queuedIncidents, setQueuedIncidents] = useState<Incident[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  // Mirrors pendingIncident/pathname for the poll loop below to read
  // synchronously -- the poll's effect only restarts on [token, isResponder]
  // (so opening/closing the popup doesn't tear down and reopen the interval
  // every time), which means a value read directly from the closure would
  // be stale; refs sidestep that without adding either to the effect's deps.
  const pendingIncidentRef = useRef<Incident | null>(null);
  const pathnameRef = useRef(pathname);
  // First poll after mount/login only establishes a baseline (every
  // currently-pending incident is "already there", not "new") -- otherwise
  // every login would immediately ring for whatever was already sitting in
  // the queue, which is the opposite of "new".
  const isFirstPollRef = useRef(true);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  useEffect(() => {
    pendingIncidentRef.current = pendingIncident;
  }, [pendingIncident]);

  const isResponder = user?.role === "responder";

  useEffect(() => {
    if (!token || !isResponder) {
      seenIdsRef.current = new Set();
      isFirstPollRef.current = true;
      // Resetting internal state when auth drops (e.g. logout) is the same
      // pattern context/SosContext.tsx already uses -- intentional, not
      // derivable without an effect since it reacts to an external change.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPendingIncident(null);
      setQueuedIncidents([]);
      return;
    }

    const poll = () => {
      getIncidents(token)
        .then((incidents) => {
          const pending = incidents.filter((incident) => incident.myStatus === "pending");

          if (isFirstPollRef.current) {
            isFirstPollRef.current = false;
            pending.forEach((incident) => seenIdsRef.current.add(incident.id));
            return;
          }

          const freshlyNew = pending.filter(
            (incident) => !seenIdsRef.current.has(incident.id),
          );
          if (freshlyNew.length === 0) return;
          freshlyNew.forEach((incident) => seenIdsRef.current.add(incident.id));

          const busy = isBusyWithIncident(pathnameRef.current ?? "");
          if (busy || pendingIncidentRef.current) {
            // Can't show one right now -- hold all of them in the queue.
            setQueuedIncidents((prevQueue) => [...prevQueue, ...freshlyNew]);
            return;
          }

          // Free right now: show the first, queue the rest.
          const [first, ...rest] = freshlyNew;
          pendingIncidentRef.current = first;
          setPendingIncident(first);
          if (rest.length > 0) {
            setQueuedIncidents((prevQueue) => [...prevQueue, ...rest]);
          }
        })
        .catch(() => {});
    };

    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [token, isResponder]);

  // The moment the responder becomes free (finishes their current incident,
  // or navigates back to the dashboard/anywhere else) with something
  // waiting, surface it right away instead of waiting for the next poll.
  useEffect(() => {
    if (pendingIncident || queuedIncidents.length === 0) return;
    if (isBusyWithIncident(pathname ?? "")) return;
    const [next, ...rest] = queuedIncidents;
    pendingIncidentRef.current = next;
    // Reacting to the route (an external signal) becoming free again --
    // same justification as the reset-on-logout effect above.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPendingIncident(next);
    setQueuedIncidents(rest);
  }, [pathname, pendingIncident, queuedIncidents]);

  const dismiss = (id: string) => {
    seenIdsRef.current.add(id);
    pendingIncidentRef.current = null;
    setPendingIncident(null);
  };

  const value = useMemo<ResponderAlertContextValue>(
    () => ({
      pendingIncident,
      queuedCount: queuedIncidents.length,
      accept: () => {
        if (!pendingIncident || !token) return;
        const id = pendingIncident.id;
        dismiss(id);
        joinIncident(token, id)
          .then(() => router.push(`/responder/${id}`))
          .catch(() => {});
      },
      decline: () => {
        if (!pendingIncident || !token) return;
        const id = pendingIncident.id;
        dismiss(id);
        declineIncident(token, id).catch(() => {});
      },
    }),
    [pendingIncident, queuedIncidents, token, router],
  );

  return (
    <ResponderAlertContext.Provider value={value}>{children}</ResponderAlertContext.Provider>
  );
}

export function useResponderAlert() {
  const context = useContext(ResponderAlertContext);
  if (!context) {
    throw new Error("useResponderAlert must be used within a ResponderAlertProvider");
  }
  return context;
}
