# Cordova RiskQ Design Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the claude.ai/design "Cordova RiskQ Emergency App" prototype (`docs/superpowers/specs/2026-07-25-cordova-riskq-design-import-design.md`) as real, working Expo/React Native screens, replacing stub screens and restyling the working auth flow.

**Architecture:** expo-router file-based routing. Auth stack gains two new steps (phone number, terms). Tabs group is restructured to Home / Map(=Evacuation list) / Report History / Profile with a raised center FAB (routes to a hidden Report tab), via a custom tab bar. SOS confirm/active states are a global overlay driven by React context, not a route. New non-tab routes: notifications, evacuation-detail/[id], contacts. All list/detail data comes from mock data added to `services/*.ts` stub functions — no new backend calls.

**Tech Stack:** Expo SDK 54, expo-router ~6.0.23 (typed routes enabled), React Native 0.81.5, React 19.1.0, TypeScript (strict), `@expo/vector-icons` (Ionicons) for all iconography, `StyleSheet.create` + the existing `theme/` token system for styling. No new npm dependencies are introduced by this plan.

## Global Constraints

- Expo SDK 54 — verify any router/navigator API usage (e.g. `Tabs` custom `tabBar` prop) against https://docs.expo.dev/versions/v54.0.0/ before relying on it, per this repo's AGENTS.md.
- No automated test suite exists in this repo. Each task's "test" step is: `npx tsc --noEmit` (must show no new errors), `npm run lint` (must show no new errors/warnings in touched files), and a manual visual/interaction check via `npx expo start --web` (documented per task). This replaces the write-a-failing-test cycle used in codebases that have a test runner.
- Map/evacuation visuals use a **static placeholder** (solid-color box, not an interactive map) — the real map library is still undecided (out of scope, see spec).
- Phone number and Terms-of-Service acceptance are **local UI state only** — never sent to a backend.
- Do not rename or remove existing `theme/` keys that are already consumed elsewhere (`primary`, `background`, `text`, `gray`, `border`, `white`, `black`, `danger`, `google`, `success`, `warning`, `secondary`) — only adjust their values and add new keys, to avoid breaking `AuthInput`, `AuthHeader`, `AuthFooter`, `PrimaryButton`, `GoogleButton`, and `profile.tsx`, which all currently import from `@/theme`.
- Reuse existing components (`AuthHeader`, `AuthInput`, `AuthFooter`, `PrimaryButton`, `GoogleButton`) as-is in restyled auth screens rather than rewriting them — they already match the design's rounded-input look closely enough once the theme palette updates.
- Commit after every task.

---

### Task 1: Update theme color palette

**Files:**
- Modify: `theme/colors.ts`

**Interfaces:**
- Produces: `COLORS` object with new keys `primaryDark`, `primaryTint`, `surface`, `textSecondary`, `textTertiary`, `textFaint`, `borderMuted`, `inputBg`, `successBg`, `warningBg`, plus updated values for existing keys `primary`, `primaryLight`, `text`, `gray`, `border`, `success`, `warning`. All other existing keys (`background`, `white`, `black`, `danger`, `google`, `secondary`) are unchanged.

- [ ] **Step 1: Replace the COLORS object**

Replace the full contents of `theme/colors.ts`:

```ts
export const COLORS = {
  primary: "#C8102E",
  primaryDark: "#9C0C24",
  primaryLight: "#F8E2E6",
  primaryTint: "#FAE7EA",

  secondary: "#FF6B35",

  background: "#FFFFFF",
  surface: "#F7F6F4",

  text: "#17181A",
  textSecondary: "#6B7280",
  textTertiary: "#9CA3AF",
  textFaint: "#C7C5C1",

  gray: "#9CA3AF",

  border: "#E5E3DF",
  borderMuted: "#F1F0EE",
  inputBg: "#F9F8F6",

  white: "#FFFFFF",
  black: "#000000",

  success: "#1E8E3E",
  successBg: "#EAF7EE",
  warning: "#B45309",
  warningBg: "#FEF3E2",
  danger: "#DC2626",

  google: "#DB4437",
};
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (existing consumers only read keys that still exist).

- [ ] **Step 3: Visual smoke check**

Run: `npx expo start --web`, open the app, log in (existing account or register) and view the Profile tab. Expected: screen still renders (colors shift slightly — e.g. button now shows the new red `#C8102E` — nothing crashes).

- [ ] **Step 4: Commit**

```bash
git add theme/colors.ts
git commit -m "theme: update palette to match Cordova RiskQ design"
```

---

### Task 2: Shared UI primitives — BackButton and PlaceholderThumb

**Files:**
- Create: `components/common/BackButton.tsx`
- Create: `components/common/PlaceholderThumb.tsx`

**Interfaces:**
- Produces: `BackButton` — `export default function BackButton(props: { onPress: () => void; style?: StyleProp<ViewStyle> })`. Renders the 36×36 circular chevron-left button used at the top of nearly every non-tab screen.
- Produces: `PlaceholderThumb` — `export default function PlaceholderThumb(props: { style?: StyleProp<ViewStyle> })`. Renders a neutral rounded box standing in for a photo/map image (the design's diagonal-stripe placeholders, simplified to a solid fill since React Native has no built-in repeating gradient).

- [ ] **Step 1: Create BackButton**

```tsx
// components/common/BackButton.tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleProp, StyleSheet, TouchableOpacity, ViewStyle } from "react-native";

import { COLORS, RADIUS } from "@/theme";

interface BackButtonProps {
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export default function BackButton({ onPress, style }: BackButtonProps) {
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="chevron-back" size={18} color={COLORS.text} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.borderMuted,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

- [ ] **Step 2: Create PlaceholderThumb**

```tsx
// components/common/PlaceholderThumb.tsx
import React from "react";
import { StyleProp, StyleSheet, View, ViewStyle } from "react-native";

import { COLORS, RADIUS } from "@/theme";

interface PlaceholderThumbProps {
  style?: StyleProp<ViewStyle>;
}

export default function PlaceholderThumb({ style }: PlaceholderThumbProps) {
  return <View style={[styles.box, style]} />;
}

const styles = StyleSheet.create({
  box: {
    backgroundColor: COLORS.borderMuted,
    borderRadius: RADIUS.lg,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add components/common/BackButton.tsx components/common/PlaceholderThumb.tsx
git commit -m "feat: add BackButton and PlaceholderThumb shared components"
```

---

### Task 3: Mock data services

**Files:**
- Create: `services/evacuation.service.ts`
- Create: `services/contacts.service.ts`
- Modify: `services/report.service.ts`
- Modify: `services/notification.service.ts`

**Interfaces:**
- Produces (`evacuation.service.ts`): `type EvacuationCenter = { id: string; name: string; address: string; distanceKm: number; capacity: { current: number; max: number }; status: "open" | "full"; facilities: string[] }`; `getEvacuationCenters(): Promise<EvacuationCenter[]>`; `getEvacuationCenterById(id: string): Promise<EvacuationCenter | undefined>`.
- Produces (`contacts.service.ts`): `type Hotline = { id: string; name: string; number: string }`; `type Contact = { id: string; name: string; number: string }`; `getHotlines(): Promise<Hotline[]>`; `getMyContacts(): Promise<Contact[]>`.
- Produces (`report.service.ts`): existing `createReport` unchanged; adds `type ReportHistoryItem = { id: string; category: string; location: string; date: string; ref: string; status: "Resolved" | "Reviewing"; statusColor: string; statusBg: string }`; `getReportHistory(): Promise<ReportHistoryItem[]>`.
- Produces (`notification.service.ts`): `type AppNotification = { id: string; title: string; body: string; timestamp: string; group: "today" | "earlier" }`; `getNotifications(): Promise<AppNotification[]>` (replaces the old empty-array stub with the same name/signature).

- [ ] **Step 1: Create evacuation.service.ts**

```ts
// services/evacuation.service.ts
export type EvacuationCenter = {
  id: string;
  name: string;
  address: string;
  distanceKm: number;
  capacity: { current: number; max: number };
  status: "open" | "full";
  facilities: string[];
};

const CENTERS: EvacuationCenter[] = [
  {
    id: "kagawasan-elementary",
    name: "Kagawasan Elementary School",
    address: "Brgy. Poblacion, Cordova, Cebu",
    distanceKm: 1.2,
    capacity: { current: 300, max: 450 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
  },
  {
    id: "cordova-municipal-gym",
    name: "Cordova Municipal Gym",
    address: "Poblacion, Cordova, Cebu",
    distanceKm: 2.4,
    capacity: { current: 180, max: 500 },
    status: "open",
    facilities: ["Water", "Medical Aid", "Restrooms", "Power"],
  },
  {
    id: "barangay-day-care",
    name: "Barangay Day Care Center",
    address: "Day-as, Cordova, Cebu",
    distanceKm: 3.1,
    capacity: { current: 120, max: 120 },
    status: "full",
    facilities: ["Water", "Restrooms"],
  },
];

export async function getEvacuationCenters(): Promise<EvacuationCenter[]> {
  return CENTERS;
}

export async function getEvacuationCenterById(
  id: string,
): Promise<EvacuationCenter | undefined> {
  return CENTERS.find((c) => c.id === id);
}
```

- [ ] **Step 2: Create contacts.service.ts**

```ts
// services/contacts.service.ts
export type Hotline = { id: string; name: string; number: string };
export type Contact = { id: string; name: string; number: string };

const HOTLINES: Hotline[] = [
  { id: "pnp", name: "PNP Cordova", number: "(032) 888-1911" },
  { id: "bfp", name: "Bureau of Fire Protection", number: "(032) 888-1160" },
  { id: "coast-guard", name: "Coast Guard Station Cordova", number: "(032) 888-1729" },
  { id: "disaster-office", name: "Municipal Disaster Office", number: "(032) 888-1045" },
];

const MY_CONTACTS: Contact[] = [
  { id: "1", name: "Mama Beckett", number: "+63 917 555 0142" },
];

export async function getHotlines(): Promise<Hotline[]> {
  return HOTLINES;
}

export async function getMyContacts(): Promise<Contact[]> {
  return MY_CONTACTS;
}
```

- [ ] **Step 3: Add getReportHistory to report.service.ts**

Replace the full contents of `services/report.service.ts`:

```ts
// services/report.service.ts
export async function createReport(payload: Record<string, unknown>) {
  return { success: true, payload, ref: `RQ-${Math.floor(20000 + Math.random() * 900)}` };
}

export type ReportHistoryItem = {
  id: string;
  category: string;
  location: string;
  date: string;
  ref: string;
  status: "Resolved" | "Reviewing";
  statusColor: string;
  statusBg: string;
};

const HISTORY: ReportHistoryItem[] = [
  {
    id: "1",
    category: "Flood",
    location: "Barangay Poblacion",
    date: "Jul 20, 2026",
    ref: "RQ-20487",
    status: "Resolved",
    statusColor: "#1E8E3E",
    statusBg: "#EAF7EE",
  },
  {
    id: "2",
    category: "Road Accident",
    location: "Cordova Public Market Rd.",
    date: "Jul 15, 2026",
    ref: "RQ-20411",
    status: "Reviewing",
    statusColor: "#B45309",
    statusBg: "#FEF3E2",
  },
  {
    id: "3",
    category: "Medical Emergency",
    location: "Brgy. Day-as",
    date: "Jul 9, 2026",
    ref: "RQ-20308",
    status: "Resolved",
    statusColor: "#1E8E3E",
    statusBg: "#EAF7EE",
  },
];

export async function getReportHistory(): Promise<ReportHistoryItem[]> {
  return HISTORY;
}
```

- [ ] **Step 4: Replace notification.service.ts mock feed**

Replace the full contents of `services/notification.service.ts`:

```ts
// services/notification.service.ts
export type AppNotification = {
  id: string;
  title: string;
  body: string;
  timestamp: string;
  group: "today" | "earlier";
};

const NOTIFICATIONS: AppNotification[] = [
  {
    id: "1",
    title: "Tide Advisory",
    body: "Water levels rising along coastal barangays. Stay alert.",
    timestamp: "2h ago",
    group: "today",
  },
  {
    id: "2",
    title: "Evacuation Notice",
    body: "Barangay Poblacion placed under precautionary evacuation.",
    timestamp: "5h ago",
    group: "today",
  },
  {
    id: "3",
    title: "Report Update",
    body: "Your incident report #RQ-20411 has been reviewed.",
    timestamp: "Yesterday",
    group: "earlier",
  },
  {
    id: "4",
    title: "Weather Alert",
    body: "Heavy rainfall expected this weekend.",
    timestamp: "2d ago",
    group: "earlier",
  },
];

export async function getNotifications(): Promise<AppNotification[]> {
  return NOTIFICATIONS;
}
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 6: Commit**

```bash
git add services/evacuation.service.ts services/contacts.service.ts services/report.service.ts services/notification.service.ts
git commit -m "feat: add mock data for evacuation, contacts, report history, notifications"
```

---

### Task 4: SOS context

**Files:**
- Create: `context/SosContext.tsx`
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `triggerSOS()` from `@/services/sos.service` (`() => Promise<{ success: boolean }>`).
- Produces: `SosProvider` (React component); `useSos()` returning `{ stage: "idle" | "confirm" | "active"; openConfirm: () => void; confirmSOS: () => void; cancelSOS: () => void }`.

- [ ] **Step 1: Create SosContext.tsx**

```tsx
// context/SosContext.tsx
import React, { createContext, useContext, useMemo, useState } from "react";

import { triggerSOS } from "@/services/sos.service";

type SosStage = "idle" | "confirm" | "active";

type SosContextValue = {
  stage: SosStage;
  openConfirm: () => void;
  confirmSOS: () => void;
  cancelSOS: () => void;
};

const SosContext = createContext<SosContextValue | undefined>(undefined);

export function SosProvider({ children }: { children: React.ReactNode }) {
  const [stage, setStage] = useState<SosStage>("idle");

  const value = useMemo(
    () => ({
      stage,
      openConfirm: () => setStage("confirm"),
      confirmSOS: () => {
        triggerSOS();
        setStage("active");
      },
      cancelSOS: () => setStage("idle"),
    }),
    [stage],
  );

  return <SosContext.Provider value={value}>{children}</SosContext.Provider>;
}

export function useSos() {
  const context = useContext(SosContext);

  if (!context) {
    throw new Error("useSos must be used within a SosProvider");
  }

  return context;
}
```

- [ ] **Step 2: Mount SosProvider in app/_layout.tsx**

In `app/_layout.tsx`, add the import and wrap `RootLayoutNav` with it, innermost (closest to the tree it affects):

```tsx
import { SosProvider } from "@/context/SosContext";
```

Change:
```tsx
          <NavigationThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <RootLayoutNav />
            <StatusBar style="auto" />
          </NavigationThemeProvider>
```
to:
```tsx
          <NavigationThemeProvider
            value={colorScheme === "dark" ? DarkTheme : DefaultTheme}
          >
            <SosProvider>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </SosProvider>
          </NavigationThemeProvider>
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 4: Commit**

```bash
git add context/SosContext.tsx app/_layout.tsx
git commit -m "feat: add SosContext for global SOS overlay state"
```

---

### Task 5: Restyle Sign Up (register) screen

**Files:**
- Modify: `app/(auth)/register.tsx`

**Interfaces:**
- Consumes: `registerUser(name, email, password)` from `@/services/auth.service` (unchanged); `useAuth().login` (unchanged); `BackButton` from Task 2.
- Produces: after successful registration, navigates to `/phone-number` (a route created in Task 7) instead of `/home`.

- [ ] **Step 1: Replace app/(auth)/register.tsx**

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";

import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
import { registerUser } from "@/services/auth.service";
import { COLORS, SPACING } from "@/theme";

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRegister() {
    if (!name || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const response = await registerUser(name, email, password);
      await login(response.token, response.user);
      router.push("/phone-number");
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Registration failed. Please try again.";
      setError(message);
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
        <BackButton onPress={() => router.push("/login")} style={styles.back} />

        <AuthHeader title="Sign up" subtitle="Create an account to continue" />

        <AuthInput
          icon="person-outline"
          placeholder="Full Name"
          value={name}
          onChangeText={setName}
        />

        <AuthInput
          icon="mail-outline"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Set Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Confirm password"
          secureTextEntry
          value={confirmPassword}
          onChangeText={setConfirmPassword}
        />

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton
          title="Register"
          loading={loading}
          onPress={handleRegister}
        />

        <AuthFooter
          promptText="Already have an account?"
          actionText="Login"
          onPress={() => router.push("/login")}
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

  back: {
    marginBottom: SPACING.lg,
  },

  error: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: One error is acceptable at this point — `router.push("/phone-number")` won't type-check until Task 7 creates that route. If so, temporarily change it to `router.push("/phone-number" as any)` and revert to the typed form in Task 7's step, OR do Task 7 immediately after this task before running `tsc`. Prefer the latter: implement Task 5 and Task 7 back-to-back before the first `tsc` check if working strictly in order.

- [ ] **Step 3: Manual check**

Run: `npx expo start --web`. Register a new account. Expected: new Sign Up screen shows the back button, "Sign up" heading, Full Name / Email / Set Password / Confirm Password fields, and a "Register" button in the new red accent color.

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/register.tsx
git commit -m "feat: restyle Sign Up screen to match design"
```

---

### Task 6: Restyle Sign In (login) screen

**Files:**
- Modify: `app/(auth)/login.tsx`

**Interfaces:**
- Consumes: `loginUser(email, password)` from `@/services/auth.service` (unchanged); `useAuth().login` (unchanged); `BackButton` (Task 2); `GoogleButton` (existing, unmodified).
- Produces: after successful login, navigates to `/phone-number` (Task 7) instead of `/home`. "Forgot Password?" links to the existing `/forgot-password` route.

- [ ] **Step 1: Replace app/(auth)/login.tsx**

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import AuthFooter from "@/components/auth/AuthFooter";
import AuthHeader from "@/components/auth/AuthHeader";
import AuthInput from "@/components/auth/AuthInput";
import GoogleButton from "@/components/auth/GoogleButton";
import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import { useAuth } from "@/context/AuthContext";
import { loginUser } from "@/services/auth.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

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
        <BackButton onPress={() => router.push("/register")} style={styles.back} />

        <AuthHeader
          title={"Sign in to your\nAccount"}
          subtitle="Enter your email and password to log in"
        />

        <AuthInput
          icon="mail-outline"
          placeholder="Email"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <AuthInput
          icon="lock-closed-outline"
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <View style={styles.forgotRow}>
          <TouchableOpacity onPress={() => router.push("/forgot-password")}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <PrimaryButton title="Log In" loading={loading} onPress={handleLogin} />

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

  back: {
    marginBottom: SPACING.lg,
  },

  forgotRow: {
    alignItems: "flex-end",
    marginBottom: SPACING.md,
  },

  forgotText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.primary,
    fontWeight: "600",
  },

  error: {
    color: COLORS.danger,
    marginBottom: SPACING.sm,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors once Task 7 exists (see Task 5 Step 2 note — implement Task 7 before the first full `tsc` pass if checking strictly in order).

- [ ] **Step 3: Manual check**

Run: `npx expo start --web`. Log in with an existing account. Expected: new Sign In screen shows back button, two-line heading, email/password fields, "Forgot Password?" link (navigates to the existing Coming Soon screen), Log In button, "Continue with Google" button, and the Register footer link.

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/login.tsx
git commit -m "feat: restyle Sign In screen to match design"
```

---

### Task 7: Phone number screen

**Files:**
- Create: `app/(auth)/phone-number.tsx`
- Modify: `app/(auth)/_layout.tsx`

**Interfaces:**
- Produces: route `/phone-number`. Local-only state, no backend call. "Continue" navigates to `/terms` (Task 8).

- [ ] **Step 1: Create app/(auth)/phone-number.tsx**

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
        It's helpful to provide a good reason why the phone number is required.
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

- [ ] **Step 2: Register the route in app/(auth)/_layout.tsx**

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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No errors (Tasks 5/6's `router.push("/phone-number")` now type-checks).

- [ ] **Step 4: Manual check**

Run: `npx expo start --web`. Register or log in, land on the phone number screen. Expected: tapping keypad digits updates the formatted number display; backspace removes digits; Continue navigates onward (to Task 8's placeholder-until-built terms screen, which will 404 until that task lands — acceptable at this point).

- [ ] **Step 5: Commit**

```bash
git add app/(auth)/phone-number.tsx app/(auth)/_layout.tsx
git commit -m "feat: add phone number entry screen"
```

---

### Task 8: Terms of Service screen

**Files:**
- Create: `app/(auth)/terms.tsx`

**Interfaces:**
- Produces: route `/terms` (already registered in `app/(auth)/_layout.tsx` by Task 7). On reaching the scroll bottom, the CTA becomes enabled and navigates to `/home`.

- [ ] **Step 1: Create app/(auth)/terms.tsx**

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BackButton from "@/components/common/BackButton";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

const SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "1. Acceptance of Terms",
    body: "By creating an account you agree to use Cordova RiskQ responsibly for emergency reporting and community safety coordination within Cordova and partner barangays.",
  },
  {
    heading: "2. Location & Data Sharing",
    body: "The app shares your real-time geolocation with local responders and volunteers only when you submit a report or trigger an SOS, so help can find you quickly.",
  },
  {
    heading: "3. Emergency Reporting",
    body: "Reports should reflect real, ongoing emergencies. Knowingly false reports may delay responders reaching people who genuinely need help.",
  },
  {
    heading: "4. User Responsibilities",
    body: "Keep your contact details current and your device location services enabled so alerts and evacuation notices reach you in time.",
  },
  {
    heading: "5. Limitation of Liability",
    body: "Cordova RiskQ assists coordination but does not replace calling local emergency hotlines directly in life-threatening situations.",
  },
];

export default function TermsScreen() {
  const router = useRouter();
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  function handleScroll(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const { contentOffset, layoutMeasurement, contentSize } = e.nativeEvent;
    if (contentOffset.y + layoutMeasurement.height >= contentSize.height - 12) {
      setScrolledToBottom(true);
    }
  }

  function handleContentSizeChange(_w: number, contentHeight: number) {
    // If the content already fits without scrolling, unlock immediately.
    setScrolledToBottom((prev) => prev || contentHeight <= 0);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.eyebrow}>Agreement</Text>
        <Text style={styles.title}>Terms of Service</Text>
        <Text style={styles.updated}>Last updated on 7/24/2026</Text>
      </View>

      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.bodyContent}
        onScroll={handleScroll}
        onContentSizeChange={handleContentSizeChange}
        scrollEventThrottle={16}
      >
        {SECTIONS.map((s) => (
          <View key={s.heading} style={styles.section}>
            <Text style={styles.sectionHeading}>{s.heading}</Text>
            <Text style={styles.sectionBody}>{s.body}</Text>
          </View>
        ))}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.cta, scrolledToBottom ? styles.ctaActive : styles.ctaInactive]}
          disabled={!scrolledToBottom}
          onPress={() => router.replace("/home")}
          activeOpacity={0.8}
        >
          <Text
            style={[
              styles.ctaText,
              scrolledToBottom ? styles.ctaTextActive : styles.ctaTextInactive,
            ]}
          >
            {scrolledToBottom ? "I Agree & Continue" : "Scroll to Bottom"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  header: {
    paddingTop: 62,
    paddingHorizontal: SPACING.lg,
  },

  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: COLORS.primary,
    textTransform: "uppercase",
    marginTop: SPACING.md,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginTop: SPACING.xs,
  },

  updated: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },

  body: {
    flex: 1,
    marginTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
  },

  bodyContent: {
    padding: SPACING.lg,
    gap: SPACING.md,
  },

  section: {
    marginBottom: SPACING.md,
  },

  sectionHeading: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },

  sectionBody: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    lineHeight: 21,
  },

  footer: {
    padding: SPACING.lg,
  },

  cta: {
    height: 54,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },

  ctaActive: {
    backgroundColor: COLORS.primary,
  },

  ctaInactive: {
    backgroundColor: COLORS.borderMuted,
  },

  ctaText: {
    fontSize: 15,
    fontWeight: "700",
  },

  ctaTextActive: {
    color: COLORS.white,
  },

  ctaTextInactive: {
    color: COLORS.textTertiary,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors.

- [ ] **Step 3: Manual check**

Run: `npx expo start --web`. Walk through register → phone number → terms. Expected: CTA reads "Scroll to Bottom" and is disabled/greyed until you scroll the terms list to its end, then it becomes "I Agree & Continue" in the red accent and navigates to Home on tap.

- [ ] **Step 4: Commit**

```bash
git add app/(auth)/terms.tsx
git commit -m "feat: add Terms of Service screen"
```

---

### Task 9: Custom tab bar component

**Files:**
- Create: `components/tabs/TabBar.tsx`

**Interfaces:**
- Consumes: `useSos()` from `@/context/SosContext` (Task 4) — hides the bar while `stage !== "idle"`.
- Produces: `export default function TabBar(props: BottomTabBarProps)` — a drop-in for the `tabBar` prop of expo-router's `<Tabs>`. Renders 4 tab buttons (`home`, `map`, `report-history`, `profile`) plus a raised center FAB that navigates to the hidden `report` route.

- [ ] **Step 1: Verify the Tabs `tabBar` prop against the installed Expo version**

Before writing code, confirm at https://docs.expo.dev/versions/v54.0.0/sdk/router/ (or the linked `expo-router` API reference for `Tabs`) that `<Tabs>` accepts a `tabBar` render-prop that is forwarded to the underlying `@react-navigation/bottom-tabs` navigator, and that its signature matches `BottomTabBarProps` from `@react-navigation/bottom-tabs` (already a dependency per `package.json`). Note any discrepancy found before proceeding — this plan assumes the standard React Navigation `tabBar` prop/shape holds for the installed `expo-router@~6.0.23`.

- [ ] **Step 2: Create components/tabs/TabBar.tsx**

```tsx
// components/tabs/TabBar.tsx
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSos } from "@/context/SosContext";
import { COLORS, RADIUS } from "@/theme";

type TabConfig = {
  name: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  activeIcon: keyof typeof Ionicons.glyphMap;
};

const LEFT_TABS: TabConfig[] = [
  { name: "home", label: "Home", icon: "home-outline", activeIcon: "home" },
  { name: "map", label: "Map", icon: "map-outline", activeIcon: "map" },
];

const RIGHT_TABS: TabConfig[] = [
  {
    name: "report-history",
    label: "Report History",
    icon: "document-text-outline",
    activeIcon: "document-text",
  },
  { name: "profile", label: "Profile", icon: "person-outline", activeIcon: "person" },
];

export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { stage } = useSos();

  if (stage !== "idle") return null;

  const activeName = state.routes[state.index].name;

  function renderTab(tab: TabConfig) {
    const focused = activeName === tab.name;
    const color = focused ? COLORS.primary : COLORS.textTertiary;

    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => navigation.navigate(tab.name)}
        activeOpacity={0.7}
      >
        <Ionicons name={focused ? tab.activeIcon : tab.icon} size={21} color={color} />
        <Text style={[styles.label, { color }]}>{tab.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {LEFT_TABS.map(renderTab)}

      <View style={styles.fabSlot}>
        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate("report")}
          activeOpacity={0.85}
        >
          <Ionicons name="document-text" size={26} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {RIGHT_TABS.map(renderTab)}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingTop: 8,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMuted,
    backgroundColor: COLORS.background,
  },

  tab: {
    flex: 1,
    alignItems: "center",
    gap: 4,
    paddingBottom: 2,
  },

  label: {
    fontSize: 10,
    fontWeight: "600",
  },

  fabSlot: {
    flex: 1,
    alignItems: "center",
  },

  fab: {
    width: 58,
    height: 58,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    marginTop: -30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 5,
    borderColor: COLORS.background,
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors (this component isn't mounted anywhere yet, so it must at least compile standalone; `navigation.navigate("report")`/`"report-history"` will only be fully route-checked once Task 10 registers those screens).

- [ ] **Step 4: Commit**

```bash
git add components/tabs/TabBar.tsx
git commit -m "feat: add custom tab bar with raised report FAB"
```

---

### Task 10: Restructure the tab navigator

**Files:**
- Modify: `app/(tabs)/_layout.tsx`
- Rename (git mv): `app/(tabs)/reports.tsx` → `app/(tabs)/report-history.tsx`
- Create: `app/(tabs)/report.tsx` (placeholder; fleshed out in Task 13)
- Rename (git mv): `app/(tabs)/notifications.tsx` → `app/notifications/index.tsx` (placeholder; fleshed out in Task 15)
- Delete: `app/history/index.tsx` (redundant "Coming Soon" stub, superseded by the `report-history` tab; confirmed unlinked from anywhere in the app)

**Interfaces:**
- Produces: tab routes `home`, `map`, `report`, `report-history`, `profile` all registered under `(tabs)`, rendered through `TabBar` (Task 9) instead of the default tab bar. `notifications` is no longer part of the tab group.

- [ ] **Step 1: Rename reports.tsx to report-history.tsx**

```bash
git mv "app/(tabs)/reports.tsx" "app/(tabs)/report-history.tsx"
```

Update its contents to rename the component (still a stub — real content lands in Task 14):

```tsx
import { View, Text } from "react-native";

export default function ReportHistoryScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Coming Soon</Text>
    </View>
  );
}
```

- [ ] **Step 2: Create app/(tabs)/report.tsx placeholder**

```tsx
import { View, Text } from "react-native";

export default function ReportScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Coming Soon</Text>
    </View>
  );
}
```

- [ ] **Step 3: Move notifications.tsx out of the tabs group**

```bash
mkdir -p app/notifications
git mv "app/(tabs)/notifications.tsx" "app/notifications/index.tsx"
```

Update its contents to rename the component (still a stub — real content lands in Task 15):

```tsx
import { View, Text } from "react-native";

export default function NotificationsScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Text>Coming Soon</Text>
    </View>
  );
}
```

- [ ] **Step 4: Delete the redundant history stub**

```bash
git rm -r app/history
```

- [ ] **Step 5: Rewrite app/(tabs)/_layout.tsx**

```tsx
import { Tabs } from "expo-router";
import React from "react";

import TabBar from "@/components/tabs/TabBar";

export default function TabLayout() {
  return (
    <Tabs
      initialRouteName="home"
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="map" options={{ title: "Map" }} />
      <Tabs.Screen name="report" options={{ title: "Report" }} />
      <Tabs.Screen name="report-history" options={{ title: "Report History" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}
```

- [ ] **Step 6: Type-check**

Run: `npx tsc --noEmit`
Expected: No new errors. (`components/haptic-tab.tsx`, `components/ui/icon-symbol.tsx`, `constants/theme.ts`, `hooks/use-color-scheme.ts` are no longer imported by this file but are left in place — still template scaffolding, out of scope to delete here.)

- [ ] **Step 7: Manual check**

Run: `npx expo start --web`. Log in and reach Home. Expected: the new custom tab bar renders with Home / Map / a raised center button / Report History / Profile, all 5 screens still show their (stub, for now) content when tapped, and there's no separate "Notifications" or "Alerts" tab anymore.

- [ ] **Step 8: Commit**

```bash
git add app/(tabs)/_layout.tsx "app/(tabs)/report-history.tsx" "app/(tabs)/report.tsx" app/notifications
git commit -m "refactor: restructure tab navigator to match design (FAB report, no notifications tab)"
```

---





