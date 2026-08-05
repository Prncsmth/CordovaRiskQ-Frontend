# Onboarding (Phone Number Step) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing post-signup phone-number step actually persist to the backend, show it exactly once (right after a fresh registration or new Google sign-up, never on login), and fix the redirect race that currently undermines it.

**Architecture:** Two repos. Backend (`CordovaRiskQ-Bacnkend`) first — adds an `isNewUser` flag to the Google Sign-In response so the frontend can tell a brand-new account from a returning one. Frontend (`CordovaRiskQ-Frontend`, this repo) second — moves `phone-number.tsx`/`terms.tsx` into a new `(onboarding)` route group, fixes the root layout's redirect logic to leave that group alone, wires the phone-number screen to `PUT /api/users/me`, and updates `login.tsx`/`GoogleButton.tsx` so onboarding only fires for brand-new accounts.

**Tech Stack:** Backend: Express 5, Prisma 7 (Postgres), `google-auth-library`, `jsonwebtoken`. Frontend: Expo Router v6 (typed routes enabled), React Native, existing `AuthContext`/`services/user.service.ts` from the User Profile backend work. No new dependencies in either repo.

**Spec:** `docs/superpowers/specs/2026-08-05-onboarding-design.md`

## Global Constraints

- **Repos:** backend work happens in `C:\Users\kianr\CordovaRiskQ-Bacnkend`; frontend work happens in `C:\Users\kianr\CordovaRiskQ-Frontend` (this repo). Each task states which one.
- **No new dependencies in either repo.**
- **No automated test suite in either repo.** Verification is `npx tsc --noEmit` (both repos), `npx eslint` (frontend, scoped to touched directories) plus manual curl/app checks.
- **Terms-of-Service acceptance stays local-only.** No new backend field for it; `terms.tsx` only moves location in this plan, its logic is untouched.
- **`mobile` stays optional and unvalidated server-side.** `updateProfileSchema`'s `mobile: z.string().optional()` is not touched. The 10-digit minimum is enforced only in `phone-number.tsx`.
- **Frontend styling:** no hardcoded colors/spacing/font sizes in anything newly added — use `COLORS`/`SPACING`/`RADIUS`/`TYPOGRAPHY` from `@/theme`. (Pre-existing hardcoded values already in `phone-number.tsx`, e.g. numeric font sizes, are left as-is — not introduced by this plan, out of scope to fix.)
- **Typed routes are enabled** (`app.json`'s `experiments.typedRoutes: true`, `tsconfig.json` includes `.expo/types/**/*.ts`). Moving route files means the generated `.expo/types/router.d.ts` is stale until Metro regenerates it — every task that touches routing must regenerate it (briefly run `npx expo start --web`, confirm it bundles once, stop it) **before** trusting a clean `npx tsc --noEmit` as verification.
- Commit after every task.

---

### Task 1: Backend — `isNewUser` flag on Google Sign-In

**Repo:** `CordovaRiskQ-Bacnkend`

**Files:**
- Modify: `src/services/auth.service.ts`

**Interfaces:**
- Produces: `authService.loginWithGoogle`'s return value gains `isNewUser: boolean`. Task 5 consumes this via the `POST /api/auth/google` JSON response (the controller already spreads the service's return value into the response body, so no controller change is needed).

- [ ] **Step 1: Add the `isNewUser` flag**

Current `src/services/auth.service.ts`:

```ts
import bcrypt from "bcrypt";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "@/lib/prisma";
import { AppError } from "@/utils/AppError";
import { signToken } from "@/utils/jwt";

const googleClient = new OAuth2Client(process.env.GOOGLE_WEB_CLIENT_ID);

export const authService = {
    async register(email: string, password: string, name?: string) {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) throw new AppError("Email already registered", 409);

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashedPassword, name },
        });

        const token = signToken({ userId: user.id });
        return {
            user: { id: user.id, email: user.email, name: user.name },
            token,
        };
    },

    async login(email: string, password: string) {
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user) throw new AppError("Invalid email or password", 401);

        if (!user.password) {
            // Account was created via Google and has no password set.
            throw new AppError(
                "This account uses Google Sign-In. Please log in with Google.",
                401
            );
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) throw new AppError("Invalid email or password", 401);

        const token = signToken({ userId: user.id });
        return {
            user: { id: user.id, email: user.email, name: user.name },
            token,
        };
    },

    async loginWithGoogle(idToken: string) {
        // Verifies the token was genuinely issued by Google for our app,
        // and hasn't been tampered with or expired.
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_WEB_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch {
            throw new AppError("Invalid Google token", 401);
        }

        if (!payload?.email) {
            throw new AppError("Invalid Google token", 401);
        }

        const { email, name, sub: googleId } = payload;

        // Find by googleId first (returning Google user), then by email
        // (existing password account signing in with Google for the first time).
        let user = await prisma.user.findUnique({ where: { googleId } });

        if (!user) {
            user = await prisma.user.findUnique({ where: { email } });

            if (user) {
                // Link this Google account to their existing email/password account.
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId },
                });
            } else {
                // Brand new user, Google-only, no password.
                user = await prisma.user.create({
                    data: { email, name, googleId },
                });
            }
        }

        const token = signToken({ userId: user.id });
        return {
            user: { id: user.id, email: user.email, name: user.name },
            token,
        };
    },
};
```

Replace the `loginWithGoogle` method with:

```ts
    async loginWithGoogle(idToken: string) {
        // Verifies the token was genuinely issued by Google for our app,
        // and hasn't been tampered with or expired.
        let payload;
        try {
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_WEB_CLIENT_ID,
            });
            payload = ticket.getPayload();
        } catch {
            throw new AppError("Invalid Google token", 401);
        }

        if (!payload?.email) {
            throw new AppError("Invalid Google token", 401);
        }

        const { email, name, sub: googleId } = payload;

        // Find by googleId first (returning Google user), then by email
        // (existing password account signing in with Google for the first time).
        let user = await prisma.user.findUnique({ where: { googleId } });
        let isNewUser = false;

        if (!user) {
            user = await prisma.user.findUnique({ where: { email } });

            if (user) {
                // Link this Google account to their existing email/password account.
                user = await prisma.user.update({
                    where: { id: user.id },
                    data: { googleId },
                });
            } else {
                // Brand new user, Google-only, no password.
                user = await prisma.user.create({
                    data: { email, name, googleId },
                });
                isNewUser = true;
            }
        }

        const token = signToken({ userId: user.id });
        return {
            user: { id: user.id, email: user.email, name: user.name },
            token,
            isNewUser,
        };
    },
```

(Only `loginWithGoogle` changes — `register` and `login` are untouched.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/services/auth.service.ts
git commit -m "feat: add isNewUser flag to Google Sign-In response"
```

- [ ] **Step 4: Manual verification**

Start the dev server in a separate terminal (from `C:\Users\kianr\CordovaRiskQ-Bacnkend`): `npm run dev`

You'll need a real Google ID token to test this against the live endpoint, which isn't practical from a shell. If you have a way to obtain one (e.g. through the frontend's Google Sign-In button once Task 5 is done), confirm:
- First call for a brand-new Google account → response includes `"isNewUser":true`.
- A second call reusing the same Google account → response includes `"isNewUser":false`.

If no token is available at this point in the plan, skip this step and rely on Task 5's manual verification to exercise it end-to-end — the `tsc` check above already confirms the code compiles and the field is present in the return type.

---

### Task 2: Frontend — `(onboarding)` route group + redirect fix

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Files:**
- Create: `app/(onboarding)/_layout.tsx`
- Move: `app/(auth)/phone-number.tsx` → `app/(onboarding)/phone-number.tsx` (content unchanged in this task — Task 3 wires it up)
- Move: `app/(auth)/terms.tsx` → `app/(onboarding)/terms.tsx` (content unchanged)
- Modify: `app/(auth)/_layout.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Produces: the `(onboarding)` route group exists and is exempt from the root layout's auto-redirect-to-home rule. `router.push("/phone-number")` / `router.push("/terms")` continue to resolve to the same leaf routes (Expo Router group folders don't appear in the URL). Tasks 3, 4, and 5 rely on this.

- [ ] **Step 1: Create the onboarding group's layout**

Create `app/(onboarding)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="phone-number" />
      <Stack.Screen name="terms" />
    </Stack>
  );
}
```

- [ ] **Step 2: Move the two screen files**

Use `git mv` so history follows the files (content is unchanged by this step):

```bash
git mv "app/(auth)/phone-number.tsx" "app/(onboarding)/phone-number.tsx"
git mv "app/(auth)/terms.tsx" "app/(onboarding)/terms.tsx"
```

- [ ] **Step 3: Remove the moved screens from the auth group's layout**

Current `app/(auth)/_layout.tsx`:

```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="phone-number" />
      <Stack.Screen name="terms" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
```

Replace with:

```tsx
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" />
    </Stack>
  );
}
```

- [ ] **Step 4: Fix the root layout's redirect logic**

Current `app/_layout.tsx`:

```tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SosProvider } from "@/context/SosContext";
import { ThemeProvider as AppThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Watches auth state and redirects to the right screen group.
// Runs after AuthContext has finished checking SecureStore on startup.
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (!isAuthenticated && !inAuthGroup) {
      // No saved session -> force to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Already logged in but sitting on an auth screen -> skip to app
      router.replace("/(tabs)/home");
    }
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    // Brief splash while we check SecureStore for a saved session
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="change-password/index"
        options={{
          presentation: "transparentModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserProvider>
          <AppThemeProvider>
            <NavigationThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <SosProvider>
                <RootLayoutNav />
                <StatusBar style="auto" />
              </SosProvider>
            </NavigationThemeProvider>
          </AppThemeProvider>
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

Replace with:

```tsx
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { SosProvider } from "@/context/SosContext";
import { ThemeProvider as AppThemeProvider } from "@/context/ThemeContext";
import { UserProvider } from "@/context/UserContext";
import { useColorScheme } from "@/hooks/use-color-scheme";
import {
    DarkTheme,
    DefaultTheme,
    ThemeProvider as NavigationThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export const unstable_settings = {
  anchor: "(tabs)",
};

// Watches auth state and redirects to the right screen group.
// Runs after AuthContext has finished checking SecureStore on startup.
function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === "(auth)";
    const inOnboardingGroup = segments[0] === "(onboarding)";

    if (!isAuthenticated && !inAuthGroup) {
      // No saved session -> force to login
      router.replace("/(auth)/login");
    } else if (isAuthenticated && inAuthGroup) {
      // Already logged in but sitting on an auth screen -> skip to app
      router.replace("/(tabs)/home");
    }
    // Authenticated + sitting in (onboarding) (phone-number/terms, reached
    // via a push right after registration or a new Google sign-up) is left
    // alone here -- those screens navigate onward themselves once done.
  }, [isAuthenticated, isLoading, segments]);

  if (isLoading) {
    // Brief splash while we check SecureStore for a saved session
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(onboarding)" />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen
        name="change-password/index"
        options={{
          presentation: "transparentModal",
          animation: "fade",
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <UserProvider>
          <AppThemeProvider>
            <NavigationThemeProvider
              value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
            >
              <SosProvider>
                <RootLayoutNav />
                <StatusBar style="auto" />
              </SosProvider>
            </NavigationThemeProvider>
          </AppThemeProvider>
        </UserProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
```

(Two changes: `inOnboardingGroup` computed and left unhandled by the if/else chain, and `<Stack.Screen name="(onboarding)" />` added to the rendered `Stack`.)

- [ ] **Step 5: Regenerate typed routes, then verify**

Typed routes are stale after moving files (see Global Constraints). Regenerate them first:

```bash
npx expo start --web
```

Wait for `Waiting on http://localhost:8081` and a successful bundle log line, then stop the process (Ctrl+C, or if run in the background, kill it). This regenerates `.expo/types/router.d.ts` to reflect the new `(onboarding)` group.

Then run:

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint "app/(onboarding)" "app/(auth)" app/_layout.tsx`
Expected: 0 errors.

- [ ] **Step 6: Commit**

```bash
git add "app/(onboarding)" "app/(auth)/_layout.tsx" app/_layout.tsx
git commit -m "feat: move phone-number/terms into an (onboarding) route group"
```

- [ ] **Step 7: Manual verification**

With the backend running (`npm run dev` from `C:\Users\kianr\CordovaRiskQ-Bacnkend`) and the frontend running (`npx expo start --web`, from this repo):

1. Register a new account. Confirm you land on the phone-number screen (still showing the unwired keypad from before Task 3) and are **not** immediately bounced to Home.
2. Manually navigate to `/terms` (or tap Continue if the old unwired behavior still allows it) and confirm you're not bounced to Home while there either.
3. Log in as an existing user. Confirm you land on Home directly (this part won't fully match the spec until Task 4 — `login.tsx` still pushes to `/phone-number` at this point in the plan, so you may still see it once; that's expected and gets fixed in Task 4).

---

### Task 3: Frontend — wire phone-number.tsx to the backend

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 2 (`app/(onboarding)/phone-number.tsx` must exist at this path)

**Files:**
- Modify: `app/(onboarding)/phone-number.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `token: string | null`, `user: AuthUser | null` (existing, unchanged). `updateProfile` from `@/services/user.service` (existing, from the User Profile backend work): `updateProfile(token: string, payload: { name?: string; email: string; mobile?: string }): Promise<UserProfile>`.

- [ ] **Step 1: Replace the file**

Current `app/(onboarding)/phone-number.tsx` (moved verbatim from `(auth)` in Task 2):

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import BackButton from "@/components/common/BackButton";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

const KEYS: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

function formatPhone(digits: string): string {
  if (!digits) return "";
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  let out = a.length ? `(${a}` : "";
  if (a.length === 3) out += ") ";
  if (b) out += b;
  if (c) out += "-" + c;
  return out;
}

export default function PhoneNumberScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState("");

  function appendDigit(d: string) {
    setPhone((p) => (p + d).slice(0, 10));
  }

  function backspace() {
    setPhone((p) => p.slice(0, -1));
  }

  return (
    <View style={styles.container}>
      <BackButton onPress={() => router.back()} />

      <Text style={styles.title}>Your phone number</Text>
      <Text style={styles.subtitle}>
        It&apos;s helpful to provide a good reason why the phone number is
        required.
      </Text>

      <View style={styles.displayWrap}>
        <Text style={phone ? styles.digits : styles.digitsPlaceholder}>
          {phone ? formatPhone(phone) : "(555) 123-4567"}
        </Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity
        style={styles.continueButton}
        onPress={() => router.push("/terms")}
        activeOpacity={0.8}
      >
        <Text style={styles.continueText}>Continue</Text>
      </TouchableOpacity>

      <View style={styles.keypad}>
        {KEYS.map((k) => (
          <TouchableOpacity
            key={k.digit}
            style={styles.key}
            onPress={() => appendDigit(k.digit)}
          >
            <Text style={styles.keyDigit}>{k.digit}</Text>
            <Text style={styles.keyLetters}>{k.letters}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity style={styles.key} onPress={() => appendDigit("0")}>
          <Text style={styles.keyDigit}>0</Text>
          <Text style={styles.keyLetters}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.key} onPress={backspace}>
          <Ionicons name="backspace-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 62,
    paddingHorizontal: SPACING.lg,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  displayWrap: {
    marginTop: SPACING.xl,
    alignItems: "center",
  },

  digits: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.text,
  },

  digitsPlaceholder: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.textFaint,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderMuted,
    width: "100%",
    marginTop: SPACING.md,
  },

  continueButton: {
    marginTop: SPACING.md,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  continueText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  keypad: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
  },

  key: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },

  keyDigit: {
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
  },

  keyLetters: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
```

Replace with:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
import { updateProfile } from "@/services/user.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

const KEYS: { digit: string; letters: string }[] = [
  { digit: "1", letters: "" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
];

function formatPhone(digits: string): string {
  if (!digits) return "";
  const a = digits.slice(0, 3);
  const b = digits.slice(3, 6);
  const c = digits.slice(6, 10);
  let out = a.length ? `(${a}` : "";
  if (a.length === 3) out += ") ";
  if (b) out += b;
  if (c) out += "-" + c;
  return out;
}

export default function PhoneNumberScreen() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function appendDigit(d: string) {
    setPhone((p) => (p + d).slice(0, 10));
  }

  function backspace() {
    setPhone((p) => p.slice(0, -1));
  }

  async function handleContinue() {
    if (!token || !user) return;

    setIsSaving(true);
    try {
      await updateProfile(token, {
        email: user.email,
        mobile: formatPhone(phone),
      });
      router.push("/terms");
    } catch (err) {
      Alert.alert(
        "Couldn't save phone number",
        err instanceof Error ? err.message : "Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const canContinue = phone.length === 10 && !isSaving;

  return (
    <View style={styles.container}>
      <BackButton onPress={() => router.back()} />

      <Text style={styles.title}>Your phone number</Text>
      <Text style={styles.subtitle}>
        It&apos;s helpful to provide a good reason why the phone number is
        required.
      </Text>

      <View style={styles.displayWrap}>
        <Text style={phone ? styles.digits : styles.digitsPlaceholder}>
          {phone ? formatPhone(phone) : "(555) 123-4567"}
        </Text>
        <View style={styles.divider} />
      </View>

      <TouchableOpacity
        style={[
          styles.continueButton,
          !canContinue && styles.continueButtonDisabled,
        ]}
        onPress={handleContinue}
        disabled={!canContinue}
        activeOpacity={0.8}
      >
        {isSaving ? (
          <ActivityIndicator color={COLORS.white} />
        ) : (
          <Text style={styles.continueText}>Continue</Text>
        )}
      </TouchableOpacity>

      <View style={styles.keypad}>
        {KEYS.map((k) => (
          <TouchableOpacity
            key={k.digit}
            style={styles.key}
            onPress={() => appendDigit(k.digit)}
          >
            <Text style={styles.keyDigit}>{k.digit}</Text>
            <Text style={styles.keyLetters}>{k.letters}</Text>
          </TouchableOpacity>
        ))}
        <View style={styles.key} />
        <TouchableOpacity style={styles.key} onPress={() => appendDigit("0")}>
          <Text style={styles.keyDigit}>0</Text>
          <Text style={styles.keyLetters}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.key} onPress={backspace}>
          <Ionicons name="backspace-outline" size={24} color={COLORS.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 62,
    paddingHorizontal: SPACING.lg,
  },

  title: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.md,
  },

  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    lineHeight: 20,
  },

  displayWrap: {
    marginTop: SPACING.xl,
    alignItems: "center",
  },

  digits: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.text,
  },

  digitsPlaceholder: {
    fontSize: 30,
    fontWeight: "700",
    color: COLORS.textFaint,
  },

  divider: {
    height: 1,
    backgroundColor: COLORS.borderMuted,
    width: "100%",
    marginTop: SPACING.md,
  },

  continueButton: {
    marginTop: SPACING.md,
    height: 54,
    borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  continueButtonDisabled: {
    backgroundColor: COLORS.borderMuted,
  },

  continueText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "700",
  },

  keypad: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    alignContent: "center",
    justifyContent: "center",
    paddingVertical: SPACING.lg,
  },

  key: {
    width: "33.33%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.sm,
  },

  keyDigit: {
    fontSize: 24,
    fontWeight: "500",
    color: COLORS.text,
  },

  keyLetters: {
    fontSize: 9,
    letterSpacing: 1.2,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint "app/(onboarding)"`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(onboarding)/phone-number.tsx"
git commit -m "feat: persist phone number to the backend on onboarding"
```

- [ ] **Step 4: Manual verification**

With the backend running (`npm run dev` from `C:\Users\kianr\CordovaRiskQ-Bacnkend`) and the frontend running (`npx expo start --web`, from this repo):

1. Register a new account and reach the phone-number screen.
2. Confirm "Continue" is disabled with 0–9 digits entered, and enabled at exactly 10.
3. Stop the backend dev server. Enter 10 digits and tap Continue. Confirm an `Alert` reading "Couldn't save phone number" appears and the screen stays put (the keypad and entered digits are still there).
4. Restart the backend dev server. Tap Continue again. Confirm it saves and advances to `/terms`.
5. Continue through Terms to Home. Navigate to the User Profile screen and confirm the Mobile field shows the number you entered, formatted as `(555) 123-4567`-style.

---

### Task 4: Frontend — stop showing onboarding on every login

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Files:**
- Modify: `app/(auth)/login.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new consumed by later tasks.

- [ ] **Step 1: Remove the onboarding redirect from login**

Current `app/(auth)/login.tsx`:

```tsx
import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import PrimaryButton from "@/components/auth/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { loginUser } from "@/services/auth.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      await login(response.token, response.user);
      router.push("/phone-number");
    } catch (err) {
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <AuthHeader
          title={"Sign in to your\nAccount"}
          subtitle="Enter your email and password to log in"
        />

        <AuthInput
          label="Email"
          placeholder="Enter your email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <AuthInput
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          rightLabel="Forgot Password?"
          onRightLabelPress={() => router.push("/forgot-password")}
          value={password}
          onChangeText={setPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton title="Log In" loading={loading} onPress={handleLogin} />

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <GoogleButton onError={setError} />

        <AuthFooter
          promptText="Don't have an account?"
          actionText="Register"
          onPress={() => router.push("/register")}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: SPACING.md,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    marginHorizontal: SPACING.sm,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.gray,
  },
  error: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
});
```

Replace `handleLogin` with:

```tsx
  async function handleLogin() {
    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const response = await loginUser(email, password);
      await login(response.token, response.user);
    } catch (err) {
      setError("Login failed. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }
```

(Only the `router.push("/phone-number");` line is removed. `router` stays imported and used elsewhere in this file — `onRightLabelPress`, the Register footer link — so no unused-import cleanup is needed.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint "app/(auth)"`
Expected: 0 errors.

- [ ] **Step 3: Commit**

```bash
git add "app/(auth)/login.tsx"
git commit -m "fix: don't route existing users through onboarding on login"
```

- [ ] **Step 4: Manual verification**

With both dev servers running: log out, then log back in with an existing (already-onboarded) account. Confirm you land on Home directly — the phone-number screen no longer appears.

---

### Task 5: Frontend — route new Google sign-ups through onboarding

**Repo:** `CordovaRiskQ-Frontend` (this repo)

**Depends on:** Task 1 (backend `isNewUser` field), Task 2 (`(onboarding)` group + redirect fix)

**Files:**
- Modify: `services/auth.service.ts`
- Modify: `components/auth/GoogleButton.tsx`

**Interfaces:**
- Consumes: backend `POST /api/auth/google` response now includes `isNewUser` (Task 1).

- [ ] **Step 1: Add `isNewUser` to the frontend type**

Current `services/auth.service.ts`:

```ts
import { apiPost } from "./api";

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export async function loginUser(
  email: string,
  password: string,
): Promise<LoginResponse> {
  return apiPost<LoginResponse>("/api/auth/login", { email, password });
}

export type RegisterResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export async function registerUser(
  name: string,
  email: string,
  password: string,
): Promise<RegisterResponse> {
  return apiPost<RegisterResponse>("/api/auth/register", {
    name,
    email,
    password,
  });
}

export type GoogleAuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
};

export async function googleAuth(
  idToken: string,
): Promise<GoogleAuthResponse> {
  return apiPost<GoogleAuthResponse>("/api/auth/google", { idToken });
}
```

Replace the `GoogleAuthResponse` type with:

```ts
export type GoogleAuthResponse = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
  isNewUser: boolean;
};
```

(Only this type changes — `LoginResponse`, `RegisterResponse`, and all three functions are untouched.)

- [ ] **Step 2: Route new Google sign-ups to onboarding**

Current `components/auth/GoogleButton.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { googleAuth } from "@/services/auth.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

// Required once per app so the browser popup properly closes and
// returns control back to the app after Google redirects.
WebBrowser.maybeCompleteAuthSession();

interface GoogleButtonProps {
  onError?: (message: string) => void;
}

const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// useAuthRequest throws synchronously if the client id for the current
// platform is missing, and hooks can't be called conditionally. So instead
// of branching inside one component, we decide here which component to
// mount: the real hook-using button only ever mounts once its platform's
// client id exists, so the hook is never invoked with a missing id.
const isConfigured = Boolean(
  Platform.OS === "android"
    ? androidClientId
    : Platform.OS === "ios"
      ? iosClientId
      : webClientId,
);

export default function GoogleButton({ onError }: GoogleButtonProps) {
  if (!isConfigured) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.disabled]}
        activeOpacity={0.8}
        onPress={() =>
          onError?.(
            "Google sign-in isn't configured for this platform yet.",
          )
        }
      >
        <Ionicons
          name="logo-google"
          size={20}
          color={COLORS.google}
          style={styles.icon}
        />
        <Text style={styles.text}>Continue with Google</Text>
      </TouchableOpacity>
    );
  }

  return <GoogleAuthButton onError={onError} />;
}

function GoogleAuthButton({ onError }: GoogleButtonProps) {
  const { login } = useAuth();
  const [loading, setLoading] = React.useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });

  useEffect(() => {
    async function handleResponse() {
      if (response?.type !== "success") return;

      const idToken = response.authentication?.idToken;

      if (!idToken) {
        onError?.("Google sign-in did not return a valid token.");
        return;
      }

      setLoading(true);
      try {
        const result = await googleAuth(idToken);
        await login(result.token, result.user);
      } catch (err) {
        onError?.("Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    handleResponse();
  }, [response]);

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.disabled]}
      disabled={!request || loading}
      activeOpacity={0.8}
      onPress={() => promptAsync()}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <>
          <Ionicons
            name="logo-google"
            size={20}
            color={COLORS.google}
            style={styles.icon}
          />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 56,
    flexDirection: "row",

    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: RADIUS.md,

    alignItems: "center",
    justifyContent: "center",

    marginTop: SPACING.sm,
  },

  disabled: {
    opacity: 0.6,
  },

  icon: {
    marginRight: SPACING.xs,
  },

  text: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
});
```

Replace with:

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
} from "react-native";

import { useAuth } from "@/context/AuthContext";
import { googleAuth } from "@/services/auth.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

// Required once per app so the browser popup properly closes and
// returns control back to the app after Google redirects.
WebBrowser.maybeCompleteAuthSession();

interface GoogleButtonProps {
  onError?: (message: string) => void;
}

const androidClientId = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

// useAuthRequest throws synchronously if the client id for the current
// platform is missing, and hooks can't be called conditionally. So instead
// of branching inside one component, we decide here which component to
// mount: the real hook-using button only ever mounts once its platform's
// client id exists, so the hook is never invoked with a missing id.
const isConfigured = Boolean(
  Platform.OS === "android"
    ? androidClientId
    : Platform.OS === "ios"
      ? iosClientId
      : webClientId,
);

export default function GoogleButton({ onError }: GoogleButtonProps) {
  if (!isConfigured) {
    return (
      <TouchableOpacity
        style={[styles.button, styles.disabled]}
        activeOpacity={0.8}
        onPress={() =>
          onError?.(
            "Google sign-in isn't configured for this platform yet.",
          )
        }
      >
        <Ionicons
          name="logo-google"
          size={20}
          color={COLORS.google}
          style={styles.icon}
        />
        <Text style={styles.text}>Continue with Google</Text>
      </TouchableOpacity>
    );
  }

  return <GoogleAuthButton onError={onError} />;
}

function GoogleAuthButton({ onError }: GoogleButtonProps) {
  const { login } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
  });

  useEffect(() => {
    async function handleResponse() {
      if (response?.type !== "success") return;

      const idToken = response.authentication?.idToken;

      if (!idToken) {
        onError?.("Google sign-in did not return a valid token.");
        return;
      }

      setLoading(true);
      try {
        const result = await googleAuth(idToken);
        await login(result.token, result.user);
        if (result.isNewUser) {
          router.push("/phone-number");
        }
      } catch (err) {
        onError?.("Google sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    handleResponse();
  }, [response]);

  return (
    <TouchableOpacity
      style={[styles.button, loading && styles.disabled]}
      disabled={!request || loading}
      activeOpacity={0.8}
      onPress={() => promptAsync()}
    >
      {loading ? (
        <ActivityIndicator color={COLORS.text} />
      ) : (
        <>
          <Ionicons
            name="logo-google"
            size={20}
            color={COLORS.google}
            style={styles.icon}
          />
          <Text style={styles.text}>Continue with Google</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: "100%",
    height: 56,
    flexDirection: "row",

    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,

    borderRadius: RADIUS.md,

    alignItems: "center",
    justifyContent: "center",

    marginTop: SPACING.sm,
  },

  disabled: {
    opacity: 0.6,
  },

  icon: {
    marginRight: SPACING.xs,
  },

  text: {
    color: COLORS.text,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
  },
});
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Expected: no errors.

Run: `npx eslint services components/auth`
Expected: 0 errors.

- [ ] **Step 4: Commit**

```bash
git add services/auth.service.ts components/auth/GoogleButton.tsx
git commit -m "feat: route new Google sign-ups through onboarding"
```

- [ ] **Step 5: Manual verification**

With both dev servers running:

1. Sign up with a Google account that has never used this app before. Confirm you land on the phone-number screen after Google auth completes.
2. Complete phone-number → terms → Home. Confirm the mobile number saved correctly (check User Profile).
3. Log out. Sign in again with the same Google account. Confirm you land on Home directly this time — no phone-number screen (it's now a returning account).
4. If you have a second Google test account already linked from before this feature, sign in with it and confirm it also goes straight to Home.

This is the last task — once it passes, the plan is complete.
