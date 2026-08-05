import * as authStorage from "./authStorage";
import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

type AuthUser = {
  id: string;
  name: string;
  email: string;
};

type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (
    token: string,
    user: AuthUser,
    needsOnboarding?: boolean,
  ) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => Promise<void>;
  completeOnboarding: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  // On app start, try to restore a previously saved session.
  useEffect(() => {
    async function loadSession() {
      try {
        const savedToken = await authStorage.getItem(TOKEN_KEY);
        const savedUser = await authStorage.getItem(USER_KEY);

        if (savedToken && savedUser) {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
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
      isAuthenticated: token !== null,
      isLoading,
      needsOnboarding,
      token,
      user,
      login: async (
        newToken: string,
        newUser: AuthUser,
        needsOnboardingFlag = false,
      ) => {
        await authStorage.setItem(TOKEN_KEY, newToken);
        await authStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setToken(newToken);
        setUser(newUser);
        setNeedsOnboarding(needsOnboardingFlag);
      },
      logout: async () => {
        await authStorage.deleteItem(TOKEN_KEY);
        await authStorage.deleteItem(USER_KEY);
        setToken(null);
        setUser(null);
        setNeedsOnboarding(false);
      },
      updateUser: async (newUser: AuthUser) => {
        await authStorage.setItem(USER_KEY, JSON.stringify(newUser));
        setUser(newUser);
      },
      completeOnboarding: () => {
        setNeedsOnboarding(false);
      },
    }),
    [token, user, isLoading, needsOnboarding],
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
