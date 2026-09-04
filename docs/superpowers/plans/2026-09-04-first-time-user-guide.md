# First-Time User Guide (Homepage Tour) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a 5-step spotlight tour that auto-shows once, immediately after a citizen reaches the Homepage via a fresh registration (email Register or first-time Google sign-in), and can be replayed from Settings.

**Architecture:** A root-level `TourContext` (mirroring the existing `AuthContext`/`SosContext` patterns) owns tour visibility/step state, a target-ref registry, and persisted per-user completion. A root-level `FirstTimeGuideOverlay` component (mirroring the existing `SosOverlay`) renders above the whole app when visible, reading measured positions of 4 real on-screen anchors (SOS button, Advisory banner, Evacuation card, Profile tab) via `measureInWindow()`, and drawing an SVG-masked spotlight + tooltip over them.

**Tech Stack:** React Native + Expo Router (existing app). `react-native-reanimated` for animation (already a dependency), `react-native-svg` for the spotlight mask (already a dependency). No new dependencies.

**Testing note:** This repo has no test runner configured (no Jest/RTL, no `__tests__` files outside `node_modules`) and no test scaffolding exists for any screen. Every task in this plan is verified with `npx tsc --noEmit`, `npx eslint <changed files>`, and a described manual run — there is no "write a failing test" step, since there is nothing to run it with. This matches how every other feature in this codebase's history (and this session) has been verified.

**Spec:** `docs/superpowers/specs/2026-09-04-first-time-user-guide-design.md`

## Global Constraints

- Trigger scope: auto-show **only** for sessions that just completed a fresh registration or first-time Google sign-in this session (tracked via `isFreshAccount`, set the same way as `needsOnboarding`/`needsTerms`). Existing accounts never auto-see it — only via Settings → "View App Tutorial".
- Persist completion per user id via the existing `context/authStorage.ts` (SecureStore/localStorage) — key `"tour_completed_users"`, a `{ [userId]: true }` map. Never re-show automatically once persisted, regardless of app restart.
- Tour is citizen-only (`user.role === "citizen"`) — anchors (Profile tab, SOS slider, evacuation card) only exist in the citizen tab layout.
- Do not modify the Homepage's visual layout — only add non-visual `ref`/`collapsable` instrumentation to existing elements for measurement.
- No new fonts — reuse existing `FONT_FAMILY` (Sora display / system body) and `COLORS` (`primary` red `#C8102E`, `secondary` orange `#FF6B35`) tokens; nothing in this codebase uses "Inter".
- All colors must come from `useThemeColors()` — no literal hex values — so the overlay stays correct in dark mode automatically.

---

## Task 1: AuthContext — `isFreshAccount` flag

**Files:**
- Modify: `context/AuthContext.tsx`

**Interfaces:**
- Produces: `AuthContextValue.isFreshAccount: boolean`, `AuthContextValue.clearFreshAccount: () => void` — consumed by `TourContext` in Task 2.

- [ ] **Step 1: Add `isFreshAccount` to `AuthState` and `INITIAL_AUTH_STATE`**

In `context/AuthContext.tsx`, change:

```ts
type AuthState = {
  token: string | null;
  user: AuthUser | null;
  needsOnboarding: boolean;
  needsTerms: boolean;
};

const INITIAL_AUTH_STATE: AuthState = {
  token: null,
  user: null,
  needsOnboarding: false,
  needsTerms: false,
};
```

to:

```ts
type AuthState = {
  token: string | null;
  user: AuthUser | null;
  needsOnboarding: boolean;
  needsTerms: boolean;
  isFreshAccount: boolean;
};

const INITIAL_AUTH_STATE: AuthState = {
  token: null,
  user: null,
  needsOnboarding: false,
  needsTerms: false,
  isFreshAccount: false,
};
```

- [ ] **Step 2: Add to `AuthContextValue` type**

Change:

```ts
type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  needsTerms: boolean;
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
};
```

to:

```ts
type AuthContextValue = {
  isAuthenticated: boolean;
  isLoading: boolean;
  needsOnboarding: boolean;
  needsTerms: boolean;
  isFreshAccount: boolean;
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
};
```

- [ ] **Step 3: Reset `isFreshAccount` to `false` on restored sessions**

In the `loadSession()` function inside the startup `useEffect`, change:

```ts
        if (savedToken && savedUser) {
          setAuthState({
            token: savedToken,
            user: JSON.parse(savedUser),
            needsOnboarding: false,
            needsTerms: false,
          });
        }
```

to:

```ts
        if (savedToken && savedUser) {
          setAuthState({
            token: savedToken,
            user: JSON.parse(savedUser),
            needsOnboarding: false,
            needsTerms: false,
            isFreshAccount: false,
          });
        }
```

- [ ] **Step 4: Expose `isFreshAccount` from the context value**

Change:

```ts
      needsOnboarding: authState.needsOnboarding,
      needsTerms: authState.needsTerms,
      token: authState.token,
```

to:

```ts
      needsOnboarding: authState.needsOnboarding,
      needsTerms: authState.needsTerms,
      isFreshAccount: authState.isFreshAccount,
      token: authState.token,
```

- [ ] **Step 5: Set `isFreshAccount` in `login()`**

Change:

```ts
        setAuthState({
          token: newToken,
          user,
          needsOnboarding: needsOnboardingFlag,
          needsTerms: needsOnboardingFlag,
        });
      },
```

to:

```ts
        setAuthState({
          token: newToken,
          user,
          needsOnboarding: needsOnboardingFlag,
          needsTerms: needsOnboardingFlag,
          isFreshAccount: needsOnboardingFlag,
        });
      },
```

Note: `isFreshAccount` is deliberately **not** cleared by `completeOnboarding()` or `completeTerms()` — it must still read `true` once the user reaches Home after Phone Number + Terms. It's only cleared by the new `clearFreshAccount()` method below, called by `TourContext` once the tour has been shown and dismissed.

- [ ] **Step 6: Add `clearFreshAccount()` method**

Change:

```ts
      completeOnboarding: () => {
        setAuthState((prev) => ({ ...prev, needsOnboarding: false }));
      },
      completeTerms: () => {
        setAuthState((prev) => ({ ...prev, needsTerms: false }));
      },
    }),
```

to:

```ts
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
```

- [ ] **Step 7: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 8: Lint**

Run: `npx eslint context/AuthContext.tsx`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add context/AuthContext.tsx
git commit -m "$(cat <<'EOF'
feat: add isFreshAccount flag to AuthContext for first-time tour trigger

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FbeHHmpSGK3aR69VY9Z7FZ
EOF
)"
```

---

## Task 2: TourContext — state, persistence, target registry

**Files:**
- Create: `context/TourContext.tsx`

**Interfaces:**
- Consumes: `useAuth()` → `user: { id: string; role: "citizen" | "responder" } | null`, `isFreshAccount: boolean`, `clearFreshAccount: () => void` (Task 1). `authStorage.getItem`/`setItem` from `context/authStorage.ts` (existing, unchanged).
- Produces: `TourProvider` component, `useTour()` hook returning `TourContextValue` (below) — consumed by Tasks 3, 5, 6.

```ts
export type TourTargetId = "sos" | "alerts" | "evacuation" | "profile";

export type TourStepConfig = {
  id: string;
  title: string;
  body: string;
  targetId: TourTargetId | null;
};

export type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

type TourContextValue = {
  isVisible: boolean;
  currentStep: number;
  steps: TourStepConfig[];
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
  startManualTour: () => void;
  notifyHomeReady: () => void;
  registerTarget: (id: TourTargetId, ref: React.RefObject<Measurable>) => void;
  unregisterTarget: (id: TourTargetId) => void;
  getTargetRef: (id: TourTargetId) => React.RefObject<Measurable> | undefined;
};
```

- [ ] **Step 1: Write `context/TourContext.tsx`**

```tsx
// context/TourContext.tsx
// Drives the first-time-user guide (5-step spotlight tour) shown once after
// a fresh registration reaches the Homepage. State lives here, following
// the same pattern as AuthContext/SosContext; the actual overlay UI is a
// separate global component (components/tour/FirstTimeGuideOverlay.tsx)
// that reads this context, mounted in app/_layout.tsx the same way
// SosOverlay is.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuth } from "./AuthContext";
import * as authStorage from "./authStorage";

const TOUR_COMPLETED_KEY = "tour_completed_users";

export type TourTargetId = "sos" | "alerts" | "evacuation" | "profile";

export type TourStepConfig = {
  id: string;
  title: string;
  body: string;
  targetId: TourTargetId | null;
};

// Minimal structural type for the anchor refs: any native component ref
// (View, TouchableOpacity, ...) that exposes measureInWindow satisfies
// this, so anchors in different components don't need matching ref types.
export type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
};

export const TOUR_STEPS: TourStepConfig[] = [
  {
    id: "welcome",
    title: "Welcome to Cordova RiskQ",
    body: "This app helps you request emergency assistance, receive alerts, and find evacuation information — all in one place.",
    targetId: null,
  },
  {
    id: "emergency",
    title: "Emergency Request",
    body: "Slide this button to send an emergency request with your live location to responders.",
    targetId: "sos",
  },
  {
    id: "alerts",
    title: "Alerts & Advisories",
    body: "Important emergency announcements and safety advisories for your area show up here.",
    targetId: "alerts",
  },
  {
    id: "evacuation",
    title: "Evacuation Centers & Map",
    body: "See nearby evacuation centers, their status, and get directions.",
    targetId: "evacuation",
  },
  {
    id: "profile",
    title: "Profile & Settings",
    body: "Update your phone number, manage notifications, and adjust your account settings here.",
    targetId: "profile",
  },
];

type TourContextValue = {
  isVisible: boolean;
  currentStep: number;
  steps: TourStepConfig[];
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
  startManualTour: () => void;
  notifyHomeReady: () => void;
  registerTarget: (id: TourTargetId, ref: React.RefObject<Measurable>) => void;
  unregisterTarget: (id: TourTargetId) => void;
  getTargetRef: (id: TourTargetId) => React.RefObject<Measurable> | undefined;
};

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user, isFreshAccount, clearFreshAccount } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const targetsRef = useRef(new Map<TourTargetId, React.RefObject<Measurable>>());

  // Loads whatever was persisted for the current user id. A brand-new
  // account's id can never already be a key in this map, so it's safe for
  // notifyHomeReady() (Step below) to be called before this load resolves --
  // "not yet loaded" and "loaded, but absent" both correctly mean "not
  // completed" for a fresh account.
  useEffect(() => {
    let cancelled = false;

    authStorage
      .getItem(TOUR_COMPLETED_KEY)
      .then((raw) => {
        if (cancelled) return;
        setCompletedMap(raw ? JSON.parse(raw) : {});
      })
      .catch(() => {
        if (!cancelled) setCompletedMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const completeTour = useCallback(() => {
    if (user) {
      setCompletedMap((prev) => {
        const nextMap = { ...prev, [user.id]: true };
        authStorage
          .setItem(TOUR_COMPLETED_KEY, JSON.stringify(nextMap))
          .catch(() => {});
        return nextMap;
      });
    }
    clearFreshAccount();
    setIsVisible(false);
  }, [user, clearFreshAccount]);

  const next = useCallback(() => {
    setCurrentStep((step) => Math.min(step + 1, TOUR_STEPS.length - 1));
  }, []);

  const back = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

  // skip() and finish() are the same completion path -- kept as distinct
  // names in the API since they're semantically different exits (in case
  // step-level analytics differentiate them later; not in scope now).
  const skip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const finish = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Settings -> "View App Tutorial": ignores completedMap entirely, always
  // shows. Does not touch isFreshAccount or the persisted map on entry --
  // only completeTour() (skip/finish) does, same as the auto-triggered path.
  const startManualTour = useCallback(() => {
    setCurrentStep(0);
    setIsVisible(true);
  }, []);

  // Called once by home.tsx on mount. Auto-shows only for a citizen account
  // that just came through a fresh registration/first-time Google sign-in
  // this session and hasn't completed the tour before.
  const notifyHomeReady = useCallback(() => {
    if (user?.role === "citizen" && isFreshAccount && !completedMap[user.id]) {
      setCurrentStep(0);
      setIsVisible(true);
    }
  }, [user, isFreshAccount, completedMap]);

  const registerTarget = useCallback(
    (id: TourTargetId, ref: React.RefObject<Measurable>) => {
      targetsRef.current.set(id, ref);
    },
    [],
  );

  const unregisterTarget = useCallback((id: TourTargetId) => {
    targetsRef.current.delete(id);
  }, []);

  const getTargetRef = useCallback(
    (id: TourTargetId) => targetsRef.current.get(id),
    [],
  );

  const value = useMemo<TourContextValue>(
    () => ({
      isVisible,
      currentStep,
      steps: TOUR_STEPS,
      next,
      back,
      skip,
      finish,
      startManualTour,
      notifyHomeReady,
      registerTarget,
      unregisterTarget,
      getTargetRef,
    }),
    [
      isVisible,
      currentStep,
      next,
      back,
      skip,
      finish,
      startManualTour,
      notifyHomeReady,
      registerTarget,
      unregisterTarget,
      getTargetRef,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);

  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }

  return context;
}
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors. (`TourProvider` isn't mounted anywhere yet — that's fine, this task only creates the module.)

- [ ] **Step 3: Lint**

Run: `npx eslint context/TourContext.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add context/TourContext.tsx
git commit -m "$(cat <<'EOF'
feat: add TourContext for first-time user guide state and target registry

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FbeHHmpSGK3aR69VY9Z7FZ
EOF
)"
```

---

## Task 3: Tour overlay UI components

**Files:**
- Create: `components/tour/types.ts`
- Create: `components/tour/TourSpotlight.tsx`
- Create: `components/tour/TourTooltip.tsx`
- Create: `components/tour/FirstTimeGuideOverlay.tsx`

**Interfaces:**
- Consumes: `useTour()`, `TourStepConfig` from `context/TourContext.tsx` (Task 2).
- Produces: `FirstTimeGuideOverlay` default export — mounted in Task 4's `app/_layout.tsx`.

- [ ] **Step 1: Write `components/tour/types.ts`**

```ts
// components/tour/types.ts
export type Rect = {
  x: number;
  y: number;
  width: number;
  height: number;
};
```

- [ ] **Step 2: Write `components/tour/TourSpotlight.tsx`**

```tsx
// components/tour/TourSpotlight.tsx
// The dimmed backdrop for the first-time guide, with a rounded-rect
// cutout ("spotlight") over the current step's target. Renders a plain
// dimmed View (no cutout) when there is no target -- step 0 ("Welcome")
// and the fallback for a target that failed to measure.
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Rect as SvgRect } from "react-native-svg";

import { useThemeColors } from "@/theme";
import type { Rect } from "./types";

const AnimatedRect = Animated.createAnimatedComponent(SvgRect);
const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 16;

type TourSpotlightProps = {
  targetRect: Rect | null;
  screenWidth: number;
  screenHeight: number;
};

export default function TourSpotlight({
  targetRect,
  screenWidth,
  screenHeight,
}: TourSpotlightProps) {
  const COLORS = useThemeColors();

  const holeX = useSharedValue(targetRect ? targetRect.x - SPOTLIGHT_PADDING : 0);
  const holeY = useSharedValue(targetRect ? targetRect.y - SPOTLIGHT_PADDING : 0);
  const holeW = useSharedValue(
    targetRect ? targetRect.width + SPOTLIGHT_PADDING * 2 : 0,
  );
  const holeH = useSharedValue(
    targetRect ? targetRect.height + SPOTLIGHT_PADDING * 2 : 0,
  );

  useEffect(() => {
    if (!targetRect) return;
    holeX.value = withTiming(targetRect.x - SPOTLIGHT_PADDING, { duration: 260 });
    holeY.value = withTiming(targetRect.y - SPOTLIGHT_PADDING, { duration: 260 });
    holeW.value = withTiming(targetRect.width + SPOTLIGHT_PADDING * 2, {
      duration: 260,
    });
    holeH.value = withTiming(targetRect.height + SPOTLIGHT_PADDING * 2, {
      duration: 260,
    });
  }, [targetRect, holeX, holeY, holeW, holeH]);

  const animatedProps = useAnimatedProps(() => ({
    x: holeX.value,
    y: holeY.value,
    width: holeW.value,
    height: holeH.value,
  }));

  if (!targetRect) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.scrim }]} />
    );
  }

  return (
    <Svg style={StyleSheet.absoluteFill} width={screenWidth} height={screenHeight}>
      <Defs>
        <Mask id="tour-spotlight-mask">
          <SvgRect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
          <AnimatedRect
            animatedProps={animatedProps}
            rx={SPOTLIGHT_RADIUS}
            ry={SPOTLIGHT_RADIUS}
            fill="black"
          />
        </Mask>
      </Defs>
      <SvgRect
        x={0}
        y={0}
        width={screenWidth}
        height={screenHeight}
        fill={COLORS.scrim}
        mask="url(#tour-spotlight-mask)"
      />
    </Svg>
  );
}
```

- [ ] **Step 3: Write `components/tour/TourTooltip.tsx`**

```tsx
// components/tour/TourTooltip.tsx
// The tooltip card for the first-time guide: title, body copy, a dot
// progress row, and Skip/Back/Next/Finish. Positions itself above or
// below the current target (or roughly centered when there's no target,
// i.e. step 0) based on available screen space.
import React, { useEffect, useMemo } from "react";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import type { TourStepConfig } from "@/context/TourContext";
import {
  FONT_FAMILY,
  RADIUS,
  SHADOW_LG,
  SPACING,
  TYPOGRAPHY,
  useThemeColors,
  type ColorPalette,
} from "@/theme";
import type { Rect } from "./types";

const TARGET_GAP = SPACING.md;

type TourTooltipProps = {
  step: TourStepConfig;
  stepIndex: number;
  totalSteps: number;
  targetRect: Rect | null;
  onNext: () => void;
  onBack: () => void;
  onSkip: () => void;
  onFinish: () => void;
};

export default function TourTooltip({
  step,
  stepIndex,
  totalSteps,
  targetRect,
  onNext,
  onBack,
  onSkip,
  onFinish,
}: TourTooltipProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { height: screenHeight } = useWindowDimensions();

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(12);

  useEffect(() => {
    opacity.value = 0;
    translateY.value = 12;
    opacity.value = withTiming(1, { duration: 220 });
    translateY.value = withTiming(0, { duration: 220 });
  }, [stepIndex, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === totalSteps - 1;

  const positionStyle = targetRect
    ? targetRect.y > screenHeight / 2
      ? { bottom: screenHeight - targetRect.y + TARGET_GAP }
      : { top: targetRect.y + targetRect.height + TARGET_GAP }
    : { top: "40%" as const };

  function handlePress(action: () => void) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    action();
  }

  return (
    <Animated.View style={[styles.wrap, positionStyle, animatedStyle]}>
      <View style={styles.headerRow}>
        <View style={styles.progressRow}>
          {Array.from({ length: totalSteps }).map((_, i) => (
            <View key={i} style={[styles.dot, i === stepIndex && styles.dotActive]} />
          ))}
        </View>
        <Pressable onPress={() => handlePress(onSkip)} hitSlop={8}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      <Text style={styles.stepLabel}>
        Step {stepIndex + 1} of {totalSteps}
      </Text>
      <Text style={styles.title}>{step.title}</Text>
      <Text style={styles.body}>{step.body}</Text>

      <View style={styles.actionsRow}>
        {!isFirstStep ? (
          <Pressable style={styles.backButton} onPress={() => handlePress(onBack)}>
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>
        ) : (
          <View style={styles.backSpacer} />
        )}

        <Pressable
          style={styles.nextButton}
          onPress={() => handlePress(isLastStep ? onFinish : onNext)}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.nextButtonGradient}
          >
            <Text style={styles.nextButtonText}>{isLastStep ? "Finish" : "Next"}</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    wrap: {
      position: "absolute",
      left: SPACING.lg,
      right: SPACING.lg,
      backgroundColor: COLORS.background,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      ...SHADOW_LG,
    },
    headerRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    progressRow: {
      flexDirection: "row",
      gap: 6,
    },
    dot: {
      width: 6,
      height: 6,
      borderRadius: RADIUS.full,
      backgroundColor: COLORS.borderMuted,
    },
    dotActive: {
      backgroundColor: COLORS.primary,
      width: 16,
    },
    skipText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    stepLabel: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
      color: COLORS.primary,
      textTransform: "uppercase",
      letterSpacing: 0.6,
      marginTop: SPACING.md,
    },
    title: {
      fontFamily: FONT_FAMILY.display,
      fontSize: TYPOGRAPHY.subtitle,
      color: COLORS.text,
      marginTop: SPACING.xs,
    },
    body: {
      fontSize: TYPOGRAPHY.caption,
      color: COLORS.textSecondary,
      lineHeight: 21,
      marginTop: SPACING.xs,
    },
    actionsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: SPACING.sm,
      marginTop: SPACING.lg,
    },
    backButton: {
      paddingVertical: SPACING.sm + 4,
      paddingHorizontal: SPACING.md,
    },
    backButtonText: {
      fontSize: TYPOGRAPHY.body,
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    backSpacer: {
      width: SPACING.sm,
    },
    nextButton: {
      flex: 1,
      borderRadius: RADIUS.md,
      overflow: "hidden",
    },
    nextButtonGradient: {
      height: 48,
      alignItems: "center",
      justifyContent: "center",
    },
    nextButtonText: {
      color: COLORS.white,
      fontWeight: "700",
      fontSize: TYPOGRAPHY.body,
    },
  });
}
```

Note: `top: "40%"` for the no-target (step 0) case is an intentional approximation, not a precise vertical center — matches the spec ("Step 0 centers the card on screen instead"), avoids adding an extra measure-own-height pass for one step.

- [ ] **Step 4: Write `components/tour/FirstTimeGuideOverlay.tsx`**

```tsx
// components/tour/FirstTimeGuideOverlay.tsx
// Global first-time-user guide, mounted once in app/_layout.tsx above the
// tab navigator (same pattern as components/sos/SosOverlay.tsx) so it can
// spotlight real elements that live in different parts of the tree (Home
// screen content and the tab bar's Profile icon).
import React, { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { useTour } from "@/context/TourContext";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";
import type { Rect } from "./types";

export default function FirstTimeGuideOverlay() {
  const { isVisible, currentStep, steps, next, back, skip, finish, getTargetRef } =
    useTour();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isVisible || !step.targetId) {
      setTargetRect(null);
      return;
    }

    const ref = getTargetRef(step.targetId);
    if (!ref?.current) {
      setTargetRect(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        setTargetRect({ x, y, width, height });
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isVisible, currentStep, step.targetId, getTargetRef]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      <TourSpotlight
        targetRect={targetRect}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
      />
      <TourTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        onNext={next}
        onBack={back}
        onSkip={skip}
        onFinish={finish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 101,
    elevation: 101,
  },
});
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Lint**

Run: `npx eslint components/tour/types.ts components/tour/TourSpotlight.tsx components/tour/TourTooltip.tsx components/tour/FirstTimeGuideOverlay.tsx`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add components/tour/
git commit -m "$(cat <<'EOF'
feat: add first-time guide overlay UI (spotlight, tooltip, orchestrator)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FbeHHmpSGK3aR69VY9Z7FZ
EOF
)"
```

---

## Task 4: Mount `TourProvider` + `FirstTimeGuideOverlay` in root layout

**Files:**
- Modify: `app/_layout.tsx`

**Interfaces:**
- Consumes: `TourProvider` from `context/TourContext.tsx` (Task 2), `FirstTimeGuideOverlay` from `components/tour/FirstTimeGuideOverlay.tsx` (Task 3).

- [ ] **Step 1: Add imports**

In `app/_layout.tsx`, add alongside the other component/context imports:

```ts
import FirstTimeGuideOverlay from "@/components/tour/FirstTimeGuideOverlay";
```

and

```ts
import { TourProvider } from "@/context/TourContext";
```

(Match the existing import grouping/order in the file — component imports near `SosOverlay`, context imports near `AuthProvider`/`SosContext`.)

- [ ] **Step 2: Wrap `SosProvider` with `TourProvider` and mount the overlay**

Change:

```tsx
function ThemedApp() {
  const { theme } = useThemeMode();

  return (
    <NavigationThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
      <SosProvider>
        <RootLayoutNav />
        <SosOverlay />
        <StatusBar style={theme === "dark" ? "light" : "dark"} />
      </SosProvider>
    </NavigationThemeProvider>
  );
}
```

to:

```tsx
function ThemedApp() {
  const { theme } = useThemeMode();

  return (
    <NavigationThemeProvider value={theme === "dark" ? DarkTheme : DefaultTheme}>
      <TourProvider>
        <SosProvider>
          <RootLayoutNav />
          <SosOverlay />
          <FirstTimeGuideOverlay />
          <StatusBar style={theme === "dark" ? "light" : "dark"} />
        </SosProvider>
      </TourProvider>
    </NavigationThemeProvider>
  );
}
```

`TourProvider` needs to sit inside `AuthProvider` (it calls `useAuth()`) — it already does, since `ThemedApp` is rendered inside `AppThemeProvider` which is inside `AuthProvider` in `RootLayout` below. No change needed there.

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Lint**

Run: `npx eslint app/_layout.tsx`
Expected: no new errors (the pre-existing `react-hooks/exhaustive-deps` warning on the `RootLayoutNav` effect is unrelated and expected to still appear).

- [ ] **Step 5: Manual smoke test**

Run: `npx expo start` (or your usual dev flow), open the app.
Expected: app boots normally, no crash, no visible change (the overlay renders `null` since `TourContext`'s `isVisible` defaults to `false` and nothing sets it yet).

- [ ] **Step 6: Commit**

```bash
git add app/_layout.tsx
git commit -m "$(cat <<'EOF'
feat: mount TourProvider and FirstTimeGuideOverlay at root layout

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FbeHHmpSGK3aR69VY9Z7FZ
EOF
)"
```

---

## Task 5: Wire the 4 anchor targets + trigger on Home

**Files:**
- Modify: `app/(tabs)/home.tsx`
- Modify: `components/home/AdvisoryBanner.tsx`
- Modify: `components/home/HomeActionList.tsx`
- Modify: `components/tabs/TabBar.tsx`

**Interfaces:**
- Consumes: `useTour()` → `registerTarget`, `unregisterTarget`, `notifyHomeReady` (Task 2).

This task makes the auto-trigger path fully end-to-end testable for the first time — all 5 tour steps will have a real anchor (or, for step 0, none by design).

- [ ] **Step 1: Register the `sos` target and call `notifyHomeReady()` in `home.tsx`**

In `app/(tabs)/home.tsx`, add `useRef` to the React import and add the `View` import (it's already imported), and add the `useTour` import:

Change:

```tsx
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdvisoryBanner from "@/components/home/AdvisoryBanner";
import GreetingBlock from "@/components/home/GreetingBlock";
import HomeActionList from "@/components/home/HomeActionList";
import HomeHeader from "@/components/home/HomeHeader";
import TideBanner from "@/components/home/TideBanner";
import { SOSButton } from "@/components/sos/SOSButton";
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
```

to:

```tsx
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import AdvisoryBanner from "@/components/home/AdvisoryBanner";
import GreetingBlock from "@/components/home/GreetingBlock";
import HomeActionList from "@/components/home/HomeActionList";
import HomeHeader from "@/components/home/HomeHeader";
import TideBanner from "@/components/home/TideBanner";
import { SOSButton } from "@/components/sos/SOSButton";
import { useAuth } from "@/context/AuthContext";
import { useSos } from "@/context/SosContext";
import { useTour } from "@/context/TourContext";
```

Inside `HomeScreen()`, add the ref, the tour hook, and the two effects (registration + one-time trigger). Change:

```tsx
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { openConfirm } = useSos();
  const { user } = useAuth();
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);
  const [tideStatus, setTideStatus] = useState<TideStatus | null>(null);

  useEffect(() => {
```

to:

```tsx
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { openConfirm } = useSos();
  const { user } = useAuth();
  const { registerTarget, unregisterTarget, notifyHomeReady } = useTour();
  const sosAnchorRef = useRef<View>(null);
  const firstName = user?.name?.trim().split(/\s+/)[0] || "there";
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);
  const [tideStatus, setTideStatus] = useState<TideStatus | null>(null);

  useEffect(() => {
    registerTarget("sos", sosAnchorRef);
    return () => unregisterTarget("sos");
  }, [registerTarget, unregisterTarget]);

  // Runs once on mount only. notifyHomeReady's identity changes as the
  // persisted-completion map finishes loading in TourContext, but a fresh
  // account's id can never already be in that map -- so the show/hide
  // decision is identical before and after the load resolves, and a single
  // mount-time call is correct. Depending on notifyHomeReady here would
  // risk re-showing (and resetting to step 0) the tour mid-session if the
  // user had already advanced past step 0 by the time it re-fires.
  useEffect(() => {
    notifyHomeReady();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
```

Then wrap the `<SOSButton />` with the ref. Change:

```tsx
      <View style={styles.sosSection}>
        <SOSButton onPress={openConfirm} />
      </View>
```

to:

```tsx
      <View style={styles.sosSection} ref={sosAnchorRef} collapsable={false}>
        <SOSButton onPress={openConfirm} />
      </View>
```

- [ ] **Step 2: Register the `alerts` target in `AdvisoryBanner.tsx`**

In `components/home/AdvisoryBanner.tsx`, change:

```tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type AdvisoryBannerProps = {
  signalLabel: string;
  time: string;
  title: string;
  message: string;
  sample?: boolean;
};

export default function AdvisoryBanner({
  signalLabel,
  time,
  title,
  message,
  sample,
}: AdvisoryBannerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  return (
    <View style={styles.card}>
```

to:

```tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTour } from "@/context/TourContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";

type AdvisoryBannerProps = {
  signalLabel: string;
  time: string;
  title: string;
  message: string;
  sample?: boolean;
};

export default function AdvisoryBanner({
  signalLabel,
  time,
  title,
  message,
  sample,
}: AdvisoryBannerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget } = useTour();
  const anchorRef = useRef<View>(null);

  useEffect(() => {
    registerTarget("alerts", anchorRef);
    return () => unregisterTarget("alerts");
  }, [registerTarget, unregisterTarget]);

  return (
    <View style={styles.card} ref={anchorRef} collapsable={false}>
```

- [ ] **Step 3: Register the `evacuation` target in `HomeActionList.tsx`**

In `components/home/HomeActionList.tsx`, change:

```tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type EvacuationCenter } from "@/services/evacuation.service";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";
```

to:

```tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { type EvacuationCenter } from "@/services/evacuation.service";
import { useTour } from "@/context/TourContext";
import { useThemeColors, FONT_FAMILY, RADIUS, SHADOW, SPACING, TYPOGRAPHY, type ColorPalette } from "@/theme";
```

Then, inside `HomeActionList`, register the root card. Change:

```tsx
export default function HomeActionList({
  nearestCenter,
  onPressEvacuation,
  onPressReport,
  onPressHotlines,
}: HomeActionListProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  const walkMinutes = nearestCenter
    ? Math.max(1, Math.round((nearestCenter.distanceKm / WALK_SPEED_KMH) * 60))
    : null;
  const isOpen = nearestCenter?.status === "open";

  return (
    <View style={styles.card}>
```

to:

```tsx
export default function HomeActionList({
  nearestCenter,
  onPressEvacuation,
  onPressReport,
  onPressHotlines,
}: HomeActionListProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget } = useTour();
  const anchorRef = useRef<View>(null);

  const walkMinutes = nearestCenter
    ? Math.max(1, Math.round((nearestCenter.distanceKm / WALK_SPEED_KMH) * 60))
    : null;
  const isOpen = nearestCenter?.status === "open";

  useEffect(() => {
    registerTarget("evacuation", anchorRef);
    return () => unregisterTarget("evacuation");
  }, [registerTarget, unregisterTarget]);

  return (
    <View style={styles.card} ref={anchorRef} collapsable={false}>
```

This targets the whole card (not just the conditionally-rendered nearest-center row), so it's robust even if `nearestCenter` hasn't loaded when the tour opens.

- [ ] **Step 4: Register the `profile` target in `TabBar.tsx`**

In `components/tabs/TabBar.tsx`, change:

```tsx
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSos } from "@/context/SosContext";
import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";
```

to:

```tsx
import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import React, { useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useSos } from "@/context/SosContext";
import { useTour } from "@/context/TourContext";
import { RADIUS, SHADOW_LG, SPACING, useThemeColors, type ColorPalette } from "@/theme";
```

Then, inside `TabBar`, register the ref **before** the `stage === "active"` early return (hooks must run unconditionally every render):

```tsx
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { stage } = useSos();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  if (stage === "active") return null;
```

to:

```tsx
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { stage } = useSos();
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { registerTarget, unregisterTarget } = useTour();
  const profileTabRef = useRef<TouchableOpacity>(null);

  useEffect(() => {
    registerTarget("profile", profileTabRef);
    return () => unregisterTarget("profile");
  }, [registerTarget, unregisterTarget]);

  if (stage === "active") return null;
```

Then attach the ref only to the "profile" tab inside `renderTab`. Change:

```tsx
  function renderTab(tab: TabConfig) {
    const focused = activeName === tab.name;
    const color = focused ? COLORS.primary : COLORS.textTertiary;

    return (
      <TouchableOpacity
        key={tab.name}
        style={styles.tab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate(tab.name);
        }}
        activeOpacity={0.7}
      >
```

to:

```tsx
  function renderTab(tab: TabConfig) {
    const focused = activeName === tab.name;
    const color = focused ? COLORS.primary : COLORS.textTertiary;

    return (
      <TouchableOpacity
        key={tab.name}
        ref={tab.name === "profile" ? profileTabRef : undefined}
        collapsable={false}
        style={styles.tab}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          navigation.navigate(tab.name);
        }}
        activeOpacity={0.7}
      >
```

- [ ] **Step 5: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Lint**

Run: `npx eslint app/(tabs)/home.tsx components/home/AdvisoryBanner.tsx components/home/HomeActionList.tsx components/tabs/TabBar.tsx`
Expected: no new errors (the `eslint-disable-next-line` on the one-time-mount effect in `home.tsx` is intentional — confirm it silences that specific warning and nothing else changed).

- [ ] **Step 7: Manual end-to-end test — auto-trigger path**

Run the app (`npx expo start`), then:

1. Register a brand-new account through the Register screen (or use first-time Google sign-in).
2. Complete Phone Number, then Terms & Conditions.
3. On landing on the Homepage, confirm the tour appears automatically, dimmed background, step 1 "Welcome to Cordova RiskQ" centered, no spotlight cutout.
4. Tap **Next** through steps 2–5, confirming each spotlight cutout visibly lines up with the real SOS slider, Advisory banner, Evacuation/Report/Hotlines card, and the Profile tab icon respectively, with the tooltip positioned sensibly above/below each and the dot progress row advancing.
5. Confirm **Back** on steps 2–5 returns to the previous step's spotlight, and there is no Back button on step 1.
6. Tap **Finish** on step 5. Confirm the overlay closes.
7. Force-close and relaunch the app, log back in with the same account. Confirm the tour does **not** reappear.
8. Repeat steps 1–3 with a second new account, but tap **Skip** partway through instead of finishing. Confirm the overlay closes immediately and, after relaunch, the tour does not reappear for that account either.
9. Repeat once more in dark mode (Settings → Dark Mode, or system dark mode) and confirm colors/spotlight/tooltip remain legible and theme-correct.
10. Log in with a **pre-existing** account (registered before this feature, or simply not freshly registered this session) and confirm the tour does **not** auto-show.

- [ ] **Step 8: Commit**

```bash
git add "app/(tabs)/home.tsx" components/home/AdvisoryBanner.tsx components/home/HomeActionList.tsx components/tabs/TabBar.tsx
git commit -m "$(cat <<'EOF'
feat: wire first-time guide anchor targets on Home and tab bar

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FbeHHmpSGK3aR69VY9Z7FZ
EOF
)"
```

---

## Task 6: Settings "View App Tutorial" + final QA

**Files:**
- Modify: `app/settings/index.tsx`

**Interfaces:**
- Consumes: `useTour()` → `startManualTour` (Task 2).

- [ ] **Step 1: Add the manual-replay row**

In `app/settings/index.tsx`, add the import:

```tsx
import { useTour } from "@/context/TourContext";
```

alongside the existing `useAuth`/`useThemeMode` imports.

Inside `SettingsScreen()`, get the tour hook. Change:

```tsx
  const { theme, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const isResponder = user?.role === "responder";
```

to:

```tsx
  const { theme, toggleTheme } = useThemeMode();
  const { user, logout } = useAuth();
  const tour = useTour();
  const isResponder = user?.role === "responder";
```

Then add the row to `supportRows`, citizen-only (the tour's anchors — Profile tab, SOS slider, evacuation card — only exist in the citizen tab layout). Change:

```tsx
  const supportRows: NavRow[] = [
    {
      key: "faqs",
      icon: "help-circle-outline",
      label: "FAQs",
      onPress: () => router.push("/faqs"),
    },
    {
      key: "contact-support",
      icon: "chatbubbles-outline",
      label: "Contact Support",
      onPress: () => router.push("/contact-support"),
    },
    {
      key: "emergency-contacts",
      icon: "call-outline",
      label: "Emergency Contacts",
      onPress: () => router.push("/contacts"),
    },
  ];
```

to:

```tsx
  const supportRows: NavRow[] = [
    {
      key: "faqs",
      icon: "help-circle-outline",
      label: "FAQs",
      onPress: () => router.push("/faqs"),
    },
    {
      key: "contact-support",
      icon: "chatbubbles-outline",
      label: "Contact Support",
      onPress: () => router.push("/contact-support"),
    },
    {
      key: "emergency-contacts",
      icon: "call-outline",
      label: "Emergency Contacts",
      onPress: () => router.push("/contacts"),
    },
    ...(isResponder
      ? []
      : [
          {
            key: "view-tutorial",
            icon: "play-circle-outline",
            label: "View App Tutorial",
            onPress: () => {
              tour.startManualTour();
              router.push("/(tabs)/home");
            },
          } satisfies NavRow,
        ]),
  ];
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Lint**

Run: `npx eslint app/settings/index.tsx`
Expected: no errors.

- [ ] **Step 4: Manual test — manual replay path**

Run the app, log in with an account that has already completed (or skipped) the tour, or any pre-existing account:

1. Go to Settings → Support → "View App Tutorial" (should not appear if logged in as a responder).
2. Tap it. Confirm it navigates to Home and the tour opens at step 1, spotlighting correctly through to step 5.
3. Tap **Finish** (or **Skip**). Confirm it closes normally, and that re-opening Settings → "View App Tutorial" again still works (replay isn't itself limited to once).
4. Confirm this does **not** change whether the tour would have auto-shown for this account (it was already not auto-showing, being a pre-existing/already-completed account either way).

- [ ] **Step 5: Final regression pass**

1. Re-run the full flow from Task 5 Step 7 once more end-to-end (fresh Register → Phone Number → Terms → Homepage tour → Finish) to confirm nothing in this task's Settings change broke the auto-trigger path.
2. Confirm existing Settings functionality (Dark Mode toggle, Log Out, User Profile, Change Password, other Support rows) still works unchanged.
3. Confirm a responder account's Settings screen still has no "View App Tutorial" row and behaves exactly as before this feature.

- [ ] **Step 6: Commit**

```bash
git add app/settings/index.tsx
git commit -m "$(cat <<'EOF'
feat: add manual "View App Tutorial" replay entry point in Settings

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01FbeHHmpSGK3aR69VY9Z7FZ
EOF
)"
```
