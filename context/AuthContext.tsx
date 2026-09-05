import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import * as authStorage from "./authStorage";
import { setUnauthorizedHandler } from "@/services/api";

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
};

// token, user, and needsOnboarding are kept in a single state object so that
// "these flip together" is guaranteed by the data model (one setState call
// commits all three at once), not by there happening to be no `await`
// between separate setters. This exact class of bug -- a caller-visible
// state that's supposed to update atomically with isAuthenticated, but
// actually only does so incidentally -- is what caused the onboarding
// redirect race this fix addresses, so it must not be reintroduced here.
//
// needsOnboarding is intentionally NOT persisted to authStorage. If the app
// is killed mid-onboarding and relaunched, the restored session will NOT
// resume onboarding -- it lands on Home instead. This is an accepted scope
// decision: onboarding only needs to show once immediately after a fresh
// registration or new Google sign-up, not survive an app restart.
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
};

const INITIAL_AUTH_STATE: AuthState = {
  token: null,
  user: null,
  needsOnboarding: false,
  needsTerms: false,
  isFreshAccount: false,
  justRegistered: false,
  justRegisteredName: null,
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  needsTerms: boolean;
  isFreshAccount: boolean;
  justRegistered: boolean;
  justRegisteredName: string | null;
  token: string | null;
  user: AuthUser | null;
  login: (
    token: string,
    user: Omit<AuthUser, "role"> & { role?: AuthUser["role"] },
    needsOnboardingFlag?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (
    user: Omit<AuthUser, "role"> & { role?: AuthUser["role"] },
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

        if (savedToken && savedUser) {
          setAuthState({
            token: savedToken,
            user: JSON.parse(savedUser),
            needsOnboarding: false,
            needsTerms: false,
            isFreshAccount: false,
            justRegistered: false,
            justRegisteredName: null,
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
      token: authState.token,
      user: authState.user,
      login: async (
        newToken: string,
        newUser: Omit<AuthUser, "role"> & { role?: AuthUser["role"] },
        needsOnboardingFlag = false,
      ) => {
        // The backend doesn't send `role` yet, so default to "citizen" here
        // -- the one place every login/register/Google-auth call funnels
        // through -- rather than at each call site.
        const user: AuthUser = { ...newUser, role: newUser.role ?? "citizen" };
        await authStorage.setItem(TOKEN_KEY, newToken);
        await authStorage.setItem(USER_KEY, JSON.stringify(user));

        // A plain email/password login (login.tsx) never passes
        // needsOnboardingFlag -- it can't otherwise know this is the first
        // login after a registration that already finished phone-number +
        // terms in an earlier, now-logged-out session. Fall back to the
        // pending marker (onboarding)/terms.tsx left behind for this exact
        // user id right before it logged the fresh account out.
        let isFreshAccount = needsOnboardingFlag;
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
          needsOnboarding: needsOnboardingFlag,
          needsTerms: needsOnboardingFlag,
          isFreshAccount,
          justRegistered: false,
          justRegisteredName: null,
        });
      },
      logout: clearSession,
      finishRegistration: async (userId: string, name: string) => {
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
        newUser: Omit<AuthUser, "role"> & { role?: AuthUser["role"] },
      ) => {
        // Preserve the existing role if the caller doesn't pass one -- a
        // profile save shouldn't silently reset a responder to citizen.
        const user: AuthUser = {
          ...newUser,
          role: newUser.role ?? authState.user?.role ?? "citizen",
        };
        await authStorage.setItem(USER_KEY, JSON.stringify(user));
        setAuthState((prev) => ({ ...prev, user }));
      },
      completeOnboarding: () => {
        setAuthState((prev) => ({ ...prev, needsOnboarding: false }));
      },
      completeTerms: () => {
        setAuthState((prev) => ({ ...prev, needsTerms: false }));
      },
      clearFreshAccount: () => {
        setAuthState((prev) => ({ ...prev, isFreshAccount: false }));
      },
    }),
    [authState, isLoading, clearSession],
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
