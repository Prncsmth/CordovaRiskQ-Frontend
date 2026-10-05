import { hasSeenWelcomeOnStartup, loggedOutStartRoute, WELCOME_SEEN_KEY } from "./loggedOutStart";

describe("loggedOutStartRoute", () => {
  it("shows the welcome walkthrough the first time on this device", () => {
    expect(loggedOutStartRoute(false)).toBe("/(onboarding)/welcome");
  });

  it("goes straight to Login once the welcome has been seen (later launches, logout, forced logout)", () => {
    expect(loggedOutStartRoute(true)).toBe("/(auth)/login");
  });
});

describe("hasSeenWelcomeOnStartup", () => {
  it("is false on a brand-new install", () => {
    expect(hasSeenWelcomeOnStartup(null, false)).toBe(false);
  });

  it("is true once the flag was saved", () => {
    expect(hasSeenWelcomeOnStartup("true", false)).toBe(true);
  });

  it("is true for an existing user who is already signed in, even before the flag existed", () => {
    expect(hasSeenWelcomeOnStartup(null, true)).toBe(true);
  });

  it("ignores any value other than \"true\"", () => {
    expect(hasSeenWelcomeOnStartup("false", false)).toBe(false);
    expect(hasSeenWelcomeOnStartup("", false)).toBe(false);
  });

  it("uses a stable storage key", () => {
    expect(WELCOME_SEEN_KEY).toBe("welcome_seen");
  });
});
