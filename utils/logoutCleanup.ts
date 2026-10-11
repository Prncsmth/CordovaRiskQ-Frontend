// Server-side cleanup run on logout while the session token is still valid:
// unregister this phone's push token and, for an on-duty responder, switch
// them Off Duty -- so the admin dashboard doesn't keep counting someone who
// can no longer be reached as available. Both are best-effort: they run
// side by side under one timeout, never throw, and the caller clears the
// local session afterwards no matter what happened here.
//
// Only the duty flag changes. Any incident the responder is on is left
// exactly as it is, so they stay accountable for it.

export type LogoutCleanupResult = {
  pushUnregistered: boolean;
  // True only when the backend confirmed the update -- never assumed.
  offDutyConfirmed: boolean;
};

// Resolves true if the request succeeded in time, false on error or timeout.
function settlesInTime(request: () => Promise<void>, timeoutMs: number): Promise<boolean> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    request().then(
      () => {
        clearTimeout(timer);
        resolve(true);
      },
      () => {
        clearTimeout(timer);
        resolve(false);
      },
    );
  });
}

export async function runLogoutCleanup({
  unregisterPush,
  setOffDuty,
  timeoutMs,
}: {
  unregisterPush: () => Promise<void>;
  // Omitted when there's nothing to switch off (a citizen, or a responder
  // already Off Duty).
  setOffDuty?: () => Promise<void>;
  timeoutMs: number;
}): Promise<LogoutCleanupResult> {
  const [pushUnregistered, offDutyConfirmed] = await Promise.all([
    settlesInTime(unregisterPush, timeoutMs),
    setOffDuty ? settlesInTime(setOffDuty, timeoutMs) : Promise.resolve(false),
  ]);
  return { pushUnregistered, offDutyConfirmed };
}
