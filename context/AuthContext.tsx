import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import * as authStorage from "./authStorage";
import { setUnauthorizedHandler } from "@/services/api";
import { hasSeenWelcomeOnStartup, WELCOME_SEEN_KEY } from "@/utils/loggedOutStart";
import {
  completeOnboardingStep,
  parsePendingOnboarding,
  PENDING_ONBOARDING_KEY,
  pendingForUser,
  startPendingOnboarding,
  type OnboardingStep,
  type PendingOnboarding,
} from "@/utils/pendingOnboarding";
import { isGoogleSignup } from "@/utils/signupFinish";

// Best-effort storage for the pending sign-up steps. A read failure counts
// as "nothing pending"; a write failure only means a step might be asked
// again, never that one is skipped by mistake -- see markStepDone below.
async function readPendingOnboarding(): Promise<PendingOnboarding | null> {
  try {
    return parsePendingOnboarding(await authStorage.getItem(PENDING_ONBOARDING_KEY));
  } catch {
    return null;
  }
}

async function writePendingOnboarding(pending: PendingOnboarding | null): Promise<void> {
  try {
    if (pending) {
      await authStorage.setItem(PENDING_ONBOARDING_KEY, JSON.stringify(pending));
    } else {
      await authStorage.deleteItem(PENDING_ONBOARDING_KEY);
    }
  } catch {
    // Ignore -- see above.
  }
}

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";
// Deliberately NOT cleared by clearSession() -- it must survive the forced
// logout that (onboarding)/terms.tsx does between registration and the
// user's next manual login, so that login() below can still tell "this is
// the account that just registered" and set isFreshAccount for the tour.
const PENDING_FRESH_ACCOUNT_KEY = "pending_fresh_account_user_id";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "responder";
  isOnDuty: boolean;
};

// token, user, and needsOnboarding are kept in a single state object so that
// "these flip together" is guaranteed by the data model (one setState call
// commits all three at once), not by there happening to be no `await`
// between separate setters. This exact class of bug -- a caller-visible
// state that's supposed to update atomically with isAuthenticated, but
// actually only does so incidentally -- is what caused the onboarding
// redirect race this fix addresses, so it must not be reintroduced here.
//
// needsOnboarding/needsTerms ARE persisted (utils/pendingOnboarding.ts):
// closing the app during Phone Number or Terms, or logging out and signing
// in to the same account again, goes back to the first unfinished step
// instead of Home, so the steps can't be skipped. They're restored into
// this same single state object, keeping the atomic-update guarantee above.
type AuthState = {
  token: string | null;
  user: AuthUser | null;
  needsOnboarding: boolean;
  needsTerms: boolean;
  isFreshAccount: boolean;
  // Set only by finishRegistration(), in the same atomic setAuthState call
  // that flips isAuthenticated back to false. RootLayoutNav (app/_layout.tsx)
  // reads this to send a freshly-logged-out-after-registration user to
  // registration-complete instead of the normal logged-out welcome screen --
  // it owns that redirect so it runs *after* the top-level Stack's
  // isAuthenticated-keyed remount has settled, instead of terms.tsx calling
  // router.replace() itself against a navigator tree that's mid-remount
  // (which expo-router can't resolve, throwing "not handled by any
  // navigator").
  justRegistered: boolean;
  // Snapshot of the user's name taken at finishRegistration() time, since
  // `user` itself goes back to null in the same setAuthState call.
  // registration-complete.tsx reads this instead of `user?.name` to still
  // show a personalized greeting despite being logged out by that point.
  justRegisteredName: string | null;
  // True only for an account that was just created through Google, until
  // onboarding ends. (onboarding)/terms.tsx reads it to keep that user
  // signed in and send them straight to Home + the app guide, instead of
  // the email/password flow's log-out-then-Login (see utils/signupFinish.ts).
  signedUpWithGoogle: boolean;
};

const INITIAL_AUTH_STATE: AuthState = {
  token: null,
  user: null,
  needsOnboarding: false,
  needsTerms: false,
  isFreshAccount: false,
  justRegistered: false,
  justRegisteredName: null,
  signedUpWithGoogle: false,
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  needsTerms: boolean;
  isFreshAccount: boolean;
  justRegistered: boolean;
  justRegisteredName: string | null;
  signedUpWithGoogle: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (
    token: string,
    user: Omit<AuthUser, "role" | "isOnDuty"> & {
      role?: AuthUser["role"];
      isOnDuty?: AuthUser["isOnDuty"];
    },
    needsOnboardingFlag?: boolean,
    // { viaGoogle: true } from GoogleButton -- only matters together with
    // needsOnboardingFlag (a brand-new account).
    options?: { viaGoogle?: boolean },
  ) => Promise<void>;
  logout: () => Promise<void>;
  // Whether this device has already been through the welcome/intro
  // walkthrough. Decides where a signed-out user lands (see
  // utils/loggedOutStart.ts). Survives logout.
  hasSeenWelcome: boolean;
  markWelcomeSeen: () => Promise<void>;
  // Swaps in a new token for the same signed-in user (e.g. the one
  // change-password returns), leaving the user and onboarding state as is.
  replaceToken: (newToken: string) => Promise<void>;
  updateUser: (
    user: Omit<AuthUser, "role" | "isOnDuty"> & {
      role?: AuthUser["role"];
      isOnDuty?: AuthUser["isOnDuty"];
    },
  ) => Promise<void>;
  completeOnboarding: () => void;
  completeTerms: () => void;
  clearFreshAccount: () => void;
  // Atomically logs the just-registered account out (same as logout()) and
  // marks the account so its next login restores isFreshAccount for the
  // tour. Used by (onboarding)/terms.tsx instead of calling logout()
  // followed by a manual router.replace() -- see the AuthState.justRegistered
  // comment above for why that ordering was unsafe.
  finishRegistration: (userId: string, name: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [isLoading, setIsLoading] = useState(true);
  const [hasSeenWelcome, setHasSeenWelcome] = useState(false);

  // Saved-step updates run one after another, in order, so finishing Phone
  // then Terms in quick succession can't interleave and leave a stale step.
  const pendingWritesRef = useRef<Promise<void>>(Promise.resolve());
  const markStepDone = useCallback((userId: string, step: OnboardingStep) => {
    pendingWritesRef.current = pendingWritesRef.current.then(async () => {
      const pending = pendingForUser(await readPendingOnboarding(), userId);
      if (pending) await writePendingOnboarding(completeOnboardingStep(pending, step));
    });
  }, []);

  // Device-level and best-effort: a storage failure only means the welcome
  // screen might show once more, never anything about the session itself.
  const markWelcomeSeen = useCallback(async () => {
    setHasSeenWelcome(true);
    try {
      await authStorage.setItem(WELCOME_SEEN_KEY, "true");
    } catch {
      // Ignore -- the in-memory flag still applies for this run.
    }
  }, []);

  // Deliberately does NOT remove WELCOME_SEEN_KEY: after logging out (or a
  // forced logout on a revoked/expired session) the user goes straight to
  // Login, not back through the welcome walkthrough.
  const clearSession = useCallback(async () => {
    await authStorage.deleteItem(TOKEN_KEY);
    await authStorage.deleteItem(USER_KEY);
    setAuthState(INITIAL_AUTH_STATE);
  }, []);

  // services/api.ts calls this when the backend rejects a stored token
  // (401) -- forces a logout so the user lands back on the login screen
  // instead of staying stuck in an "authenticated" state with a dead token.
  useEffect(() => {
    setUnauthorizedHandler(clearSession);
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // On app start, try to restore a previously saved session.
  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await authStorage.getItem(TOKEN_KEY);
        const savedUser = await authStorage.getItem(USER_KEY);
        const welcomeFlag = await authStorage.getItem(WELCOME_SEEN_KEY);

        // Read here, before isLoading turns false, so the first screen is
        // already the right one (no flash of the welcome screen).
        const seen = hasSeenWelcomeOnStartup(welcomeFlag, Boolean(savedToken && savedUser));
        setHasSeenWelcome(seen);
        if (seen && welcomeFlag !== "true") {
          // Existing signed-in user from before this flag existed.
          await authStorage.setItem(WELCOME_SEEN_KEY, "true");
        }

        if (savedToken && savedUser) {
          const restoredUser: AuthUser = JSON.parse(savedUser);
          // App was closed during Phone Number or Terms: resume there.
          const pending = pendingForUser(await readPendingOnboarding(), restoredUser.id);
          setAuthState({
            token: savedToken,
            user: restoredUser,
            needsOnboarding: pending?.needsOnboarding ?? false,
            needsTerms: pending?.needsTerms ?? false,
            // Still a brand-new account, so the app guide shows once it
            // reaches Home.
            isFreshAccount: pending !== null,
            justRegistered: false,
            justRegisteredName: null,
            signedUpWithGoogle: pending?.signedUpWithGoogle ?? false,
          });
        }
      } catch {
        // No valid saved session -- fall through to the logged-out state.
      } finally {
        setIsLoading(false);
      }
    }

    loadSession();
  }, []);

  const value = useMemo(
    () => ({
      isAuthenticated: authState.token !== null,
      isLoading,
      needsOnboarding: authState.needsOnboarding,
      needsTerms: authState.needsTerms,
      isFreshAccount: authState.isFreshAccount,
      justRegistered: authState.justRegistered,
      justRegisteredName: authState.justRegisteredName,
      signedUpWithGoogle: authState.signedUpWithGoogle,
      token: authState.token,
      user: authState.user,
      login: async (
        newToken: string,
        newUser: Omit<AuthUser, "role" | "isOnDuty"> & {
          role?: AuthUser["role"];
          isOnDuty?: AuthUser["isOnDuty"];
        },
        needsOnboardingFlag = false,
        options?: { viaGoogle?: boolean },
      ) => {
        // The backend doesn't send `role` yet, so default to "citizen" here
        // -- the one place every login/register/Google-auth call funnels
        // through -- rather than at each call site. isOnDuty defaults to
        // true (matching the backend column's default) for the same
        // "older cached session predates this field" reason.
        const user: AuthUser = {
          ...newUser,
          role: newUser.role ?? "citizen",
          isOnDuty: newUser.isOnDuty ?? true,
        };
        await authStorage.setItem(TOKEN_KEY, newToken);
        await authStorage.setItem(USER_KEY, JSON.stringify(user));
        // Anyone who has signed in on this device is past the walkthrough.
        await markWelcomeSeen();

        // A plain email/password login (login.tsx) never passes
        // needsOnboardingFlag -- it can't otherwise know this is the first
        // login after a registration that already finished phone-number +
        // terms in an earlier, now-logged-out session. Fall back to the
        // pending marker (onboarding)/terms.tsx left behind for this exact
        // user id right before it logged the fresh account out.
        // A brand-new account starts owing Phone Number and Terms (saved,
        // so closing the app can't skip them). Any other sign-in resumes
        // whatever this account still owes from an earlier, unfinished
        // sign-up on this phone -- e.g. a Google user who closed the app on
        // Terms and signs in again (now as an existing account).
        let pending: PendingOnboarding | null;
        if (needsOnboardingFlag) {
          pending = startPendingOnboarding(
            user.id,
            isGoogleSignup(needsOnboardingFlag, options?.viaGoogle),
          );
          await writePendingOnboarding(pending);
        } else {
          pending = pendingForUser(await readPendingOnboarding(), user.id);
        }

        let isFreshAccount = needsOnboardingFlag || pending !== null;
        if (!isFreshAccount) {
          const pendingUserId = await authStorage.getItem(
            PENDING_FRESH_ACCOUNT_KEY,
          );
          if (pendingUserId === user.id) {
            isFreshAccount = true;
            await authStorage.deleteItem(PENDING_FRESH_ACCOUNT_KEY);
          }
        }

        setAuthState({
          token: newToken,
          user,
          needsOnboarding: pending?.needsOnboarding ?? false,
          needsTerms: pending?.needsTerms ?? false,
          isFreshAccount,
          justRegistered: false,
          justRegisteredName: null,
          signedUpWithGoogle: pending?.signedUpWithGoogle ?? false,
        });
      },
      logout: clearSession,
      hasSeenWelcome,
      markWelcomeSeen,
      replaceToken: async (newToken: string) => {
        await authStorage.setItem(TOKEN_KEY, newToken);
        setAuthState((prev) => ({ ...prev, token: newToken }));
      },
      finishRegistration: async (userId: string, name: string) => {
        // Terms accepted: the email sign-up's steps are all done.
        markStepDone(userId, "terms");
        await pendingWritesRef.current;
        await authStorage.deleteItem(TOKEN_KEY);
        await authStorage.deleteItem(USER_KEY);
        await authStorage.setItem(PENDING_FRESH_ACCOUNT_KEY, userId);
        setAuthState({
          ...INITIAL_AUTH_STATE,
          justRegistered: true,
          justRegisteredName: name,
        });
      },
      updateUser: async (
        newUser: Omit<AuthUser, "role" | "isOnDuty"> & {
          role?: AuthUser["role"];
          isOnDuty?: AuthUser["isOnDuty"];
        },
      ) => {
        // Preserve the existing role/duty status if the caller doesn't pass
        // one -- a profile save shouldn't silently reset a responder to
        // citizen or flip their duty status.
        const user: AuthUser = {
          ...newUser,
          role: newUser.role ?? authState.user?.role ?? "citizen",
          isOnDuty: newUser.isOnDuty ?? authState.user?.isOnDuty ?? true,
        };
        await authStorage.setItem(USER_KEY, JSON.stringify(user));
        setAuthState((prev) => ({ ...prev, user }));
      },
      completeOnboarding: () => {
        setAuthState((prev) => ({ ...prev, needsOnboarding: false }));
        if (authState.user) markStepDone(authState.user.id, "phone");
      },
      completeTerms: () => {
        setAuthState((prev) => ({ ...prev, needsTerms: false }));
        if (authState.user) markStepDone(authState.user.id, "terms");
      },
      clearFreshAccount: () => {
        setAuthState((prev) => ({ ...prev, isFreshAccount: false }));
      },
    }),
    [authState, isLoading, clearSession, hasSeenWelcome, markWelcomeSeen, markStepDone],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
