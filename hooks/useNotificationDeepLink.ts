// hooks/useNotificationDeepLink.ts
// Handles tap-through on remote push notifications: reads the backend's
// generic {type, referenceId} payload (see services/notification.service.ts's
// AppNotification for the in-app equivalent) and deep-links straight into
// the matching existing screen -- same route + href shapes
// components/notifications/NotificationRow.tsx already uses for the in-app
// notification list:
//   - "new_incident"  -> /responder/[id] (responder incident detail)
//   - "announcement"  -> /announcement-detail/[id]
// Covers both a tap while the app is foregrounded/backgrounded
// (addNotificationResponseReceivedListener) and a cold start where the app
// was launched BY the tap (getLastNotificationResponseAsync).
import { useEffect, useRef } from "react";
import { useRouter } from "expo-router";
import * as Notifications from "expo-notifications";

type IncidentPushData = { type?: string; referenceId?: string };

// `enabled` gates this on being authenticated (not still mid auth/onboarding
// check in app/_layout.tsx) -- deliberately not role-restricted: new_incident
// only ever reaches on-duty responders and announcement reaches citizens and/
// or responders depending on audience (see backend announcement.service.ts),
// so both roles need this hook live. When disabled, this no-ops entirely,
// including the cold-start check, so a notification tap that launched the
// app doesn't get silently consumed (and its identifier marked handled)
// before `enabled` flips true -- enabled flipping true re-runs the effect
// and re-checks getLastNotificationResponseAsync from scratch.
export function useNotificationDeepLink(enabled: boolean): void {
  const router = useRouter();
  const handledIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function handleResponse(response: Notifications.NotificationResponse) {
      const identifier = response.notification.request.identifier;
      if (handledIdRef.current === identifier) return;
      handledIdRef.current = identifier;

      const data = response.notification.request.content.data as IncidentPushData;
      if (data.type === "new_incident" && data.referenceId) {
        router.push(`/responder/${data.referenceId}` as const);
      } else if (data.type === "announcement" && data.referenceId) {
        router.push({ pathname: "/announcement-detail/[id]", params: { id: data.referenceId } });
      }
    }

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) handleResponse(response);
    });

    const subscription = Notifications.addNotificationResponseReceivedListener(handleResponse);
    return () => subscription.remove();
  }, [router, enabled]);
}
