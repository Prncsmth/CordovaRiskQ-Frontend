import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import * as authStorage from "./authStorage";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

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
};

const INITIAL_AUTH_STATE: AuthState = {
  token: null,
  user: null,
  needsOnboarding: false,
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
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
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>(INITIAL_AUTH_STATE);
  const [isLoading, setIsLoading] = useState(true);

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
        setAuthState({
          token: newToken,
          user,
          needsOnboarding: needsOnboardingFlag,
        });
      },
      logout: async () => {
        await authStorage.deleteItem(TOKEN_KEY);
        await authStorage.deleteItem(USER_KEY);
        setAuthState(INITIAL_AUTH_STATE);
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
    }),
    [authState, isLoading],
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
