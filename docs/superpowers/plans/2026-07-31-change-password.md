# Change Password Bottom Sheet Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/change-password/index.tsx`'s "Coming Soon" stub with a draggable bottom sheet (Old/New/Confirm Password fields, SAVE button) presented over the still-visible Profile screen.

**Architecture:** `/change-password` becomes a `transparentModal`-presented route (verified against the installed `@react-navigation/native-stack` types: unlike `formSheet`/`pageSheet`/`modal`/`fullScreenModal`, `transparentModal` has no Android-fallback caveat, so the previous screen stays visible on both platforms). A new generic `PasswordSheet` shell component provides the dimmed backdrop, rounded sheet, and swipe-to-dismiss gesture using the project's existing `react-native-gesture-handler`/`react-native-reanimated` dependencies. The existing `components/user-profile/ProfileFieldInput.tsx` is extended (backward-compatibly) to support placeholder-only, masked fields.

**Tech Stack:** Expo Router v6, `react-native-gesture-handler` (`Gesture.Pan`/`GestureDetector`), `react-native-reanimated` (`useSharedValue`/`useAnimatedStyle`/`withSpring`/`runOnJS`) — all already project dependencies, no new packages. Existing `components/auth/PrimaryButton`.

**Spec:** `docs/superpowers/specs/2026-07-31-change-password-design.md`

## Global Constraints

- **No hardcoded colors/spacing/font sizes**, with one explicit, narrow exception: the sheet's dimmed backdrop color (`rgba(0, 0, 0, 0.5)`) — no token in `theme/colors.ts` represents a translucent overlay, and this mirrors the existing precedent of ad-hoc alpha values in `CategoryGrid.tsx` (`` `${category.color}14` ``). Everywhere else uses `COLORS`, `SPACING`, `RADIUS`, `TYPOGRAPHY` from `@/theme`.
- **`GestureHandlerRootView` is required.** Verified directly (`grep -rl GestureHandlerRootView node_modules/expo-router/build/`) that Expo Router does NOT wrap the app in it automatically. Without it, the swipe-to-dismiss gesture will silently misbehave, especially on Android. It must wrap the app root in `app/_layout.tsx`.
- **`transparentModal` presentation, not `formSheet`.** This was a deliberate choice (see spec) — `formSheet` degrades to a plain full-screen `modal` on Android per the installed library's own type docs; `transparentModal` does not.
- **No automated test suite exists in this repo.** Each task's verification step is `npx tsc --noEmit` (clean) AND `npx eslint app components services theme` (0 errors, same pre-existing warning count as before — currently 4 warnings in unrelated files). Gesture/drag/modal-presentation behavior cannot be verified this way — the final task's manual verification must happen on a real device or simulator, not web.
- Commit after every task.

---

### Task 1: Extend ProfileFieldInput for placeholder-only, masked fields

**Files:**
- Modify: `components/user-profile/ProfileFieldInput.tsx` (full file, currently 58 lines — see current content below)

**Current content of `components/user-profile/ProfileFieldInput.tsx`:**
```tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type ProfileFieldInputProps = {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
} & Pick<TextInputProps, "keyboardType" | "autoCapitalize">;

export default function ProfileFieldInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
}: ProfileFieldInputProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        placeholderTextColor={COLORS.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  input: {
    height: 52,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
```

**Context:** `ProfileFieldInput` is currently used only by `app/user-profile/index.tsx`, which always passes `label` and never passes `placeholder`/`secureTextEntry`. This change is purely additive — `label` becomes optional (skips the label row when omitted), and `placeholder`/`secureTextEntry` are picked from `TextInputProps` and passed through. User Profile's existing usage is unaffected.

**Interfaces:**
- Consumes: nothing new
- Produces: `ProfileFieldInput({ label?, value, onChangeText, keyboardType?, autoCapitalize?, secureTextEntry?, placeholder? })` — default export. Task 4 imports it as `import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";` and uses it with `placeholder` + `secureTextEntry` set, no `label`.

- [ ] **Step 1: Replace the file contents**

```tsx
import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
} from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type ProfileFieldInputProps = {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
} & Pick<
  TextInputProps,
  "keyboardType" | "autoCapitalize" | "secureTextEntry" | "placeholder"
>;

export default function ProfileFieldInput({
  label,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  placeholder,
}: ProfileFieldInputProps) {
  return (
    <View style={styles.wrapper}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textTertiary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  input: {
    height: 52,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
    paddingHorizontal: SPACING.md,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/user-profile/ProfileFieldInput.tsx` or `app/user-profile/index.tsx` (User Profile's existing calls, which always pass `label`, remain valid under the new optional-`label` type)

Run: `npx eslint app components services theme`
Expected: 0 errors (same pre-existing warning count as before)

- [ ] **Step 3: Commit**

```bash
git add components/user-profile/ProfileFieldInput.tsx
git commit -m "feat: make ProfileFieldInput label optional, add placeholder/secureTextEntry"
```

---

### Task 2: PasswordSheet component

**Files:**
- Create: `components/change-password/PasswordSheet.tsx`

**Interfaces:**
- Consumes: `Gesture`, `GestureDetector` from `react-native-gesture-handler`; `useSharedValue`, `useAnimatedStyle`, `withSpring`, `runOnJS` from `react-native-reanimated` (all existing dependencies, verified present in `node_modules`)
- Produces: `PasswordSheet({ children, onClose }: { children: React.ReactNode; onClose: () => void })` — default export. Task 4 imports it as `import PasswordSheet from "@/components/change-password/PasswordSheet";` and renders its form content as `children`.

- [ ] **Step 1: Create `components/change-password/PasswordSheet.tsx`**

```tsx
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { COLORS, RADIUS, SPACING } from "@/theme";

const DISMISS_THRESHOLD = 100;

type PasswordSheetProps = {
  children: React.ReactNode;
  onClose: () => void;
};

export default function PasswordSheet({
  children,
  onClose,
}: PasswordSheetProps) {
  const insets = useSafeAreaInsets();
  const translateY = useSharedValue(0);

  const pan = Gesture.Pan()
    .onUpdate((event) => {
      translateY.value = Math.max(0, event.translationY);
    })
    .onEnd((event) => {
      if (event.translationY > DISMISS_THRESHOLD) {
        runOnJS(onClose)();
      } else {
        translateY.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.overlay}>
      <TouchableOpacity
        style={styles.backdrop}
        activeOpacity={1}
        onPress={onClose}
      />
      <GestureDetector gesture={pan}>
        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + SPACING.md },
            animatedStyle,
          ]}
        >
          <View style={styles.handle} />
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  handle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.border,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/change-password/PasswordSheet.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add components/change-password/PasswordSheet.tsx
git commit -m "feat: add PasswordSheet gesture-driven bottom sheet shell"
```

---

### Task 3: Wire transparentModal presentation and GestureHandlerRootView

**Files:**
- Modify: `app/_layout.tsx` (full file, currently 79 lines — see current content below)

**Current content of `app/_layout.tsx`:**
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
    </Stack>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
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
  );
}
```

**Context:** This is a shared, high-blast-radius file — isolated as its own task so it gets a focused review. Two changes only: (1) add a `Stack.Screen name="change-password"` entry with `transparentModal` presentation, alongside the existing `(auth)`/`(tabs)` entries — every other route is unaffected since it's not explicitly listed and keeps Expo Router's default `"card"` presentation; (2) wrap the whole app in `GestureHandlerRootView` (required for `components/change-password/PasswordSheet.tsx`'s `Gesture.Pan()` to work correctly, verified this isn't already provided anywhere in the app).

**Interfaces:**
- Consumes: `GestureHandlerRootView` from `react-native-gesture-handler` (existing dependency)
- Produces: the `/change-password` route now presents as a `transparentModal` with `slide_from_bottom` animation; the whole app now renders inside `GestureHandlerRootView`. Task 4's screen relies on both of these.

- [ ] **Step 1: Replace the file contents**

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
        name="change-password"
        options={{
          presentation: "transparentModal",
          animation: "slide_from_bottom",
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

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/_layout.tsx
git commit -m "feat: add transparentModal presentation for change-password and GestureHandlerRootView"
```

---

### Task 4: Assemble the Change Password screen

**Files:**
- Modify: `app/change-password/index.tsx` (full file, currently 15 lines — see current content below)

**Depends on:** Task 1 (`ProfileFieldInput`'s new props), Task 2 (`PasswordSheet`), Task 3 (`transparentModal` route + `GestureHandlerRootView`)

**Current content of `app/change-password/index.tsx`:**
```tsx
import { Text, View } from "react-native";

export default function ChangePasswordScreen() {
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

**Interfaces:**
- Consumes:
  - `PasswordSheet({ children, onClose })` (Task 2)
  - `ProfileFieldInput({ value, onChangeText, placeholder?, secureTextEntry? })` (Task 1)
  - `PrimaryButton({ title, onPress, disabled })` from `@/components/auth/PrimaryButton` (existing)
- Produces: the default-exported `ChangePasswordScreen` component rendered at the `/change-password` route (presented as a `transparentModal` per Task 3) — no props (it's a route).

- [ ] **Step 1: Replace the file contents**

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import PasswordSheet from "@/components/change-password/PasswordSheet";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ChangePasswordScreen() {
  const router = useRouter();
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const canSave =
    oldPassword.length > 0 &&
    newPassword.length > 0 &&
    newPassword === confirmPassword;

  function handleClose() {
    router.back();
  }

  function handleSave() {
    router.back();
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <PasswordSheet onClose={handleClose}>
        <Text style={styles.title}>Change Password</Text>
        <ProfileFieldInput
          value={oldPassword}
          onChangeText={setOldPassword}
          placeholder="Old Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder="New Password"
          secureTextEntry
        />
        <ProfileFieldInput
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Confirm Password"
          secureTextEntry
        />
        <PrimaryButton title="SAVE" onPress={handleSave} disabled={!canSave} />
      </PasswordSheet>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.primary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add app/change-password/index.tsx
git commit -m "feat: assemble Change Password bottom sheet from new components"
```

- [ ] **Step 4: Manual verification**

Run on a **real device or simulator** (not web — gesture/drag and modal-presentation behavior cannot be verified in a browser): log in, navigate to Profile, tap "Change Password".

Walk through the full checklist from the design spec's Testing section:
- Sheet slides up from the bottom, Profile screen visible and dimmed behind it
- Tapping the dimmed backdrop dismisses the sheet back to Profile
- Dragging the sheet down past a threshold dismisses it; a smaller drag snaps back to position
- "SAVE" is disabled until Old Password is filled, New Password is filled, and New Password matches Confirm Password; becomes enabled once all three hold
- Tapping "SAVE" while enabled dismisses the sheet back to Profile
- All three fields mask their input (dots/bullets, not plain text)
- Navigate to Profile → "User Profile" and confirm its fields still render with labels exactly as before (First Name/Last Name/E-Mail/Mobile) — `ProfileFieldInput`'s prop changes didn't affect it

If everything above holds, the task — and the plan — is complete.
