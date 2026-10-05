// utils/loggedOutStart.ts
// Where a signed-out user lands: the welcome/intro walkthrough only the
// first time on this device, Login every time after that -- on every later
// app launch, after logging out, and after a forced logout (expired or
// revoked session). Used by the root guard (app/_layout.tsx) and the auth
// group's index route, so both always agree.

// Device-level, not per account: kept across logout on purpose (see
// AuthContext's clearSession, which never removes it).
export const WELCOME_SEEN_KEY = "welcome_seen";

export type LoggedOutStartRoute = "/(onboarding)/welcome" | "/(auth)/login";

export function loggedOutStartRoute(hasSeenWelcome: boolean): LoggedOutStartRoute {
  return hasSeenWelcome ? "/(auth)/login" : "/(onboarding)/welcome";
}

// On startup: seen if the flag was saved, or if this device already has a
// signed-in session saved -- someone who has used the app before this flag
// existed shouldn't be sent back through the intro.
export function hasSeenWelcomeOnStartup(
  savedFlag: string | null,
  hasSavedSession: boolean,
): boolean {
  return savedFlag === "true" || hasSavedSession;
}
