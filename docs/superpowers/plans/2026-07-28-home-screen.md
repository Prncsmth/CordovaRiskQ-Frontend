# Home Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-line `app/(tabs)/home.tsx` stub with the real Home screen from the design spec: brand header, greeting/weather, tide banner, SOS trigger, quick actions, nearest evacuation center, and safety tips.

**Architecture:** New presentational components under `components/home/`, following the existing `components/auth/` pattern (dedicated, theme-token-driven, one file per section). The SOS trigger reuses and restyles the existing but currently-unused `components/sos/SOSButton.tsx` in place rather than duplicating it. Two new "Coming Soon" stub routes (`/contacts`, `/evacuation-detail/[id]`) are added so navigation from Home doesn't 404. `app/(tabs)/home.tsx` owns all mock data and service calls, and passes them down as props — child components stay pure/presentational.

**Tech Stack:** Expo Router v6 (typed routes enabled — see Global Constraints), React Native, `@expo/vector-icons` (Ionicons), existing `theme/` token modules. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-28-home-screen-design.md`

## Global Constraints

- **No hardcoded colors/spacing/font sizes.** Use `COLORS`, `SPACING`, `RADIUS`, `TYPOGRAPHY` from `@/theme` exclusively (see `theme/colors.ts`, `theme/spacing.ts`, `theme/radius.ts`, `theme/typography.ts`). This repo has an established violation-free pattern in `components/auth/*` — match it.
- **Typed routes are enabled** (`app.json` → `experiments.typedRoutes: true`, `tsconfig.json` → `strict: true`). Every `router.push(...)` call must use a literal path string at its own call site — never build a route string in a variable/array and pass it through, since TypeScript checks the literal against the generated route union. This is why stub routes are created (Task 2) before any component references them.
- **Navigation uses full group-qualified paths**, e.g. `router.push("/(tabs)/report")`, matching the existing convention in `app/_layout.tsx` (`router.replace("/(tabs)/home")`).
- **No automated test suite exists in this repo** (confirmed in the design spec). Each task's verification step is `npx tsc --noEmit` (TypeScript compiles cleanly) plus, where noted, a manual visual check. The final task has a full manual walkthrough.
- **Icons:** use `Ionicons` from `@expo/vector-icons`, matching `components/tabs/TabBar.tsx` and `components/common/BackButton.tsx`.
- **Do not modify `components/ui/*`.** It's unused, orphaned scaffolding — out of scope per the design spec.
- Commit after every task.

---

### Task 1: Restyle the SOS button

**Files:**
- Modify: `components/sos/SOSButton.tsx` (full file, currently 25 lines — see current content below)

**Current content of `components/sos/SOSButton.tsx`:**
```tsx
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

export function SOSButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.text}>SOS</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#dc2626",
    paddingVertical: 14,
    borderRadius: 999,
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 16,
  },
});
```

**Interfaces:**
- Consumes: nothing new (already imports nothing from the rest of this plan)
- Produces: `SOSButton({ onPress }: { onPress?: () => void })` — **named export**, unchanged signature. Renders a large circular button (150px) with a soft tint "glow" ring behind it and a caption below it reading "Tap to alert emergency responders". Later tasks (Task 9) import it as `import { SOSButton } from "@/components/sos/SOSButton";`.

- [ ] **Step 1: Replace the file contents**

```tsx
import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export function SOSButton({ onPress }: { onPress?: () => void }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.glow}>
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
          ]}
          onPress={onPress}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Text style={styles.text}>SOS</Text>
        </Pressable>
      </View>
      <Text style={styles.caption}>Tap to alert emergency responders</Text>
    </View>
  );
}

const BUTTON_SIZE = 150;
const GLOW_SIZE = 170;

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
  },
  glow: {
    width: GLOW_SIZE,
    height: GLOW_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonPressed: {
    backgroundColor: COLORS.primaryDark,
  },
  text: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: TYPOGRAPHY.heading,
    letterSpacing: 1,
  },
  caption: {
    marginTop: SPACING.sm,
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textTertiary,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/sos/SOSButton.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/sos/SOSButton.tsx
git commit -m "feat: restyle SOS button as large circular hero button"
```

---

### Task 2: Add stub routes for Contacts and Evacuation Detail

**Files:**
- Create: `app/contacts/index.tsx`
- Create: `app/evacuation-detail/[id].tsx`

**Interfaces:**
- Consumes: nothing
- Produces: two routable screens, `/contacts` and `/evacuation-detail/[id]`, registered by expo-router's file-based routing (both auto-join the root `Stack` in `app/_layout.tsx` — no manual registration needed). Required so later tasks (Task 6, Task 7) can reference these paths in typed `router.push()` calls — the generated route types only include paths that exist as files.

Both files copy the exact "Coming Soon" pattern already used by `app/(tabs)/map.tsx`, `app/(tabs)/report.tsx`, and `app/notifications/index.tsx`.

- [ ] **Step 1: Create `app/contacts/index.tsx`**

```tsx
import { Text, View } from "react-native";

export default function ContactsScreen() {
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

- [ ] **Step 2: Create `app/evacuation-detail/[id].tsx`**

```tsx
import { Text, View } from "react-native";

export default function EvacuationDetailScreen() {
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

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 4: Start the dev server once to force expo-router to regenerate its typed-routes declaration file**

Run: `npx expo start --web` (let it finish booting, confirm no errors in the terminal, then stop it with `Ctrl+C`)
Expected: server starts cleanly; this regenerates `.expo/types/router.d.ts` to include `/contacts` and `/evacuation-detail/[id]`, which Tasks 6 and 7 depend on for their `router.push()` calls to type-check.

- [ ] **Step 5: Commit**

```bash
git add "app/contacts/index.tsx" "app/evacuation-detail/[id].tsx"
git commit -m "feat: add stub routes for contacts and evacuation detail"
```

---

### Task 3: HomeHeader component

**Files:**
- Create: `components/home/HomeHeader.tsx`

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `useRouter` from `expo-router`; `COLORS, RADIUS, SPACING, TYPOGRAPHY` from `@/theme`
- Produces: `HomeHeader({ hasUnread }: { hasUnread: boolean })` — **default export**. Renders the brand row ("C" logomark + "CORDOVA"/"RISKQ" wordmark) and a bell button that navigates to `/notifications` and shows a small dot when `hasUnread` is `true`. Task 9 imports as `import HomeHeader from "@/components/home/HomeHeader";` and passes `hasUnread` from its own fetched state.

- [ ] **Step 1: Create the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type HomeHeaderProps = {
  hasUnread: boolean;
};

export default function HomeHeader({ hasUnread }: HomeHeaderProps) {
  const router = useRouter();

  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <View style={styles.logo}>
          <Text style={styles.logoText}>C</Text>
        </View>
        <View>
          <Text style={styles.brandName}>CORDOVA</Text>
          <Text style={styles.brandSub}>RISKQ</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.bell}
        onPress={() => router.push("/notifications")}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="notifications-outline" size={18} color={COLORS.text} />
        {hasUnread ? <View style={styles.dot} /> : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  logo: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    color: COLORS.white,
    fontWeight: "800",
    fontSize: TYPOGRAPHY.subtitle,
  },
  brandName: {
    color: COLORS.primary,
    fontWeight: "800",
    fontSize: TYPOGRAPHY.caption,
    lineHeight: TYPOGRAPHY.caption,
  },
  brandSub: {
    color: COLORS.textTertiary,
    fontSize: 9,
    letterSpacing: 1,
  },
  bell: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    position: "absolute",
    top: 6,
    right: 7,
    width: 7,
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/home/HomeHeader.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/home/HomeHeader.tsx
git commit -m "feat: add HomeHeader component"
```

---

### Task 4: GreetingBlock component

**Files:**
- Create: `components/home/GreetingBlock.tsx`

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `COLORS, SPACING, TYPOGRAPHY` from `@/theme`
- Produces: `GreetingBlock({ name, location, temperatureC, weatherDescription }: { name: string; location: string; temperatureC: number; weatherDescription: string })` — **default export**, purely presentational. Task 9 imports as `import GreetingBlock from "@/components/home/GreetingBlock";` and passes its own local mock constants.

- [ ] **Step 1: Create the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

type GreetingBlockProps = {
  name: string;
  location: string;
  temperatureC: number;
  weatherDescription: string;
};

export default function GreetingBlock({
  name,
  location,
  temperatureC,
  weatherDescription,
}: GreetingBlockProps) {
  return (
    <View style={styles.row}>
      <View style={styles.left}>
        <Text style={styles.greeting}>Hello, {name}!</Text>
        <View style={styles.locationRow}>
          <Ionicons name="location-outline" size={12} color={COLORS.textSecondary} />
          <Text style={styles.location}>{location}</Text>
        </View>
      </View>

      <View style={styles.right}>
        <View style={styles.tempRow}>
          <Ionicons name="partly-sunny-outline" size={14} color={COLORS.textSecondary} />
          <Text style={styles.temp}>{temperatureC}°C</Text>
        </View>
        <Text style={styles.weatherDesc}>{weatherDescription}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  left: {
    flexShrink: 1,
  },
  greeting: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: SPACING.xs,
  },
  location: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  right: {
    alignItems: "flex-end",
  },
  tempRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  temp: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
  },
  weatherDesc: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/home/GreetingBlock.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/home/GreetingBlock.tsx
git commit -m "feat: add GreetingBlock component"
```

---

### Task 5: TideBanner component

**Files:**
- Create: `components/home/TideBanner.tsx`

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `COLORS, RADIUS, SPACING, TYPOGRAPHY` from `@/theme`
- Produces:
  - `export type TideLevel = "normal" | "watch" | "warning"`
  - `TideBanner({ level, message }: { level: TideLevel; message: string })` — **default export**. Maps `level` to `COLORS.success`/`COLORS.warning`/`COLORS.danger` (only `"normal"` is exercised by Task 9's mock data today). Task 9 imports as `import TideBanner from "@/components/home/TideBanner";` and passes a literal `"normal"` for `level` — it does not need to import the `TideLevel` type, since a literal string structurally satisfies it.

- [ ] **Step 1: Create the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export type TideLevel = "normal" | "watch" | "warning";

type TideBannerProps = {
  level: TideLevel;
  message: string;
};

const LEVEL_STYLES: Record<
  TideLevel,
  { bg: string; fg: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  normal: { bg: COLORS.successBg, fg: COLORS.success, icon: "checkmark" },
  watch: { bg: COLORS.warningBg, fg: COLORS.warning, icon: "alert" },
  warning: { bg: COLORS.primaryTint, fg: COLORS.danger, icon: "warning" },
};

const LEVEL_LABEL: Record<TideLevel, string> = {
  normal: "Normal",
  watch: "Watch",
  warning: "Warning",
};

export default function TideBanner({ level, message }: TideBannerProps) {
  const { bg, fg, icon } = LEVEL_STYLES[level];

  return (
    <View style={[styles.banner, { backgroundColor: bg }]}>
      <View style={[styles.iconCircle, { backgroundColor: fg }]}>
        <Ionicons name={icon} size={12} color={COLORS.white} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: fg }]}>
          Tide Level: {LEVEL_LABEL[level]}
        </Text>
        <Text style={[styles.message, { color: fg }]}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    gap: SPACING.sm,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 2,
  },
  iconCircle: {
    width: 20,
    height: 20,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
  },
  message: {
    fontSize: TYPOGRAPHY.small,
    opacity: 0.85,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/home/TideBanner.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/home/TideBanner.tsx
git commit -m "feat: add TideBanner component"
```

---

### Task 6: QuickActionsRow component

**Files:**
- Create: `components/home/QuickActionsRow.tsx`

**Depends on:** Task 2 (needs `/contacts` to exist for its `router.push("/contacts")` call to type-check)

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `useRouter` from `expo-router`; `COLORS, RADIUS, SPACING, TYPOGRAPHY` from `@/theme`
- Produces: `QuickActionsRow()` — **default export**, no props (self-contained; navigates internally since its 3 destinations are fixed and not reused elsewhere). Task 9 imports as `import QuickActionsRow from "@/components/home/QuickActionsRow";` and renders it with no props.

- [ ] **Step 1: Create the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export default function QuickActionsRow() {
  const router = useRouter();

  const actions: {
    key: string;
    label: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
  }[] = [
    {
      key: "report",
      label: "Report Incident",
      icon: "warning-outline",
      onPress: () => router.push("/(tabs)/report"),
    },
    {
      key: "evacuation",
      label: "Evacuation Center",
      icon: "home-outline",
      onPress: () => router.push("/(tabs)/map"),
    },
    {
      key: "contacts",
      label: "Emergency Contacts",
      icon: "call-outline",
      onPress: () => router.push("/contacts"),
    },
  ];

  return (
    <View style={styles.row}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.key}
          style={styles.card}
          onPress={action.onPress}
          activeOpacity={0.7}
        >
          <View style={styles.iconCircle}>
            <Ionicons name={action.icon} size={16} color={COLORS.primary} />
          </View>
          <Text style={styles.label}>{action.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  card: {
    flex: 1,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.sm + 2,
    alignItems: "center",
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/home/QuickActionsRow.tsx`. If `router.push("/contacts")` errors as an invalid route, Task 2's Step 4 (regenerating typed routes) was skipped — go back and run `npx expo start --web` once, then retry.

- [ ] **Step 3: Commit**

```bash
git add components/home/QuickActionsRow.tsx
git commit -m "feat: add QuickActionsRow component"
```

---

### Task 7: EvacuationCenterCard component

**Files:**
- Create: `components/home/EvacuationCenterCard.tsx`

**Depends on:** Task 2 (needs `/evacuation-detail/[id]` to exist for its `router.push()` call to type-check)

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `useRouter` from `expo-router`; `PlaceholderThumb` default export from `@/components/common/PlaceholderThumb` (props: `{ style?: StyleProp<ViewStyle> }`); `EvacuationCenter` type from `@/services/evacuation.service` (shape: `{ id: string; name: string; address: string; distanceKm: number; capacity: {current:number; max:number}; status: "open"|"full"; facilities: string[] }`); `COLORS, RADIUS, SPACING, TYPOGRAPHY` from `@/theme`
- Produces: `EvacuationCenterCard({ center }: { center: EvacuationCenter })` — **default export**. Tapping it navigates to `/evacuation-detail/${center.id}`. Task 9 imports as `import EvacuationCenterCard from "@/components/home/EvacuationCenterCard";` and only renders it once it has fetched a non-null center.

- [ ] **Step 1: Create the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { type EvacuationCenter } from "@/services/evacuation.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type EvacuationCenterCardProps = {
  center: EvacuationCenter;
};

export default function EvacuationCenterCard({ center }: EvacuationCenterCardProps) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/evacuation-detail/${center.id}`)}
      activeOpacity={0.7}
    >
      <PlaceholderThumb style={styles.thumb} />
      <View style={styles.textCol}>
        <Text style={styles.name}>{center.name}</Text>
        <Text style={styles.meta}>
          {center.distanceKm} km away · {center.status === "open" ? "Open" : "Full"}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textFaint} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  thumb: {
    width: 44,
    height: 44,
  },
  textCol: {
    flex: 1,
  },
  name: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  meta: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/home/EvacuationCenterCard.tsx`. If `router.push(...)` errors as an invalid route, go back to Task 2 Step 4 and rerun `npx expo start --web` once.

- [ ] **Step 3: Commit**

```bash
git add components/home/EvacuationCenterCard.tsx
git commit -m "feat: add EvacuationCenterCard component"
```

---

### Task 8: SafetyTipsList component

**Files:**
- Create: `components/home/SafetyTipsList.tsx`

**Interfaces:**
- Consumes: `Ionicons` from `@expo/vector-icons`; `COLORS, RADIUS, SPACING, TYPOGRAPHY` from `@/theme`
- Produces: `SafetyTipsList()` — **default export**, no props. Self-contained: owns its own mock tip content and its own "Safety Tips" heading. Task 9 imports as `import SafetyTipsList from "@/components/home/SafetyTipsList";` and renders it with no props.

- [ ] **Step 1: Create the file**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type SafetyTip = {
  title: string;
  body: string;
};

const TIPS: SafetyTip[] = [
  {
    title: "Know your evacuation route",
    body: "Identify the fastest path to your nearest evacuation center before an emergency happens.",
  },
  {
    title: "Prepare an emergency kit",
    body: "Keep water, flashlights, and important documents ready to grab in one bag.",
  },
  {
    title: "Charge your phone",
    body: "Keep your phone charged during storm warnings so you can call for help.",
  },
];

export default function SafetyTipsList() {
  return (
    <View style={styles.section}>
      <Text style={styles.heading}>Safety Tips</Text>
      <View style={styles.list}>
        {TIPS.map((tip) => (
          <View key={tip.title} style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.primary} />
            </View>
            <View style={styles.textCol}>
              <Text style={styles.title}>{tip.title}</Text>
              <Text style={styles.body}>{tip.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: SPACING.sm,
  },
  heading: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.text,
  },
  list: {
    gap: SPACING.sm,
  },
  card: {
    flexDirection: "row",
    gap: SPACING.sm,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    padding: SPACING.sm,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
    color: COLORS.text,
  },
  body: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/home/SafetyTipsList.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/home/SafetyTipsList.tsx
git commit -m "feat: add SafetyTipsList component"
```

---

### Task 9: Assemble the Home screen

**Files:**
- Modify: `app/(tabs)/home.tsx` (full file, currently 9 lines — see current content below)

**Depends on:** Tasks 1–8 (imports every component built so far)

**Current content of `app/(tabs)/home.tsx`:**
```tsx
import { View, Text } from "react-native";

export default function HomeScreen() {
  return (
    <View>
      <Text>Home Screen</Text>
    </View>
  );
}
```

**Interfaces:**
- Consumes:
  - `HomeHeader({ hasUnread: boolean })` (Task 3)
  - `GreetingBlock({ name, location, temperatureC, weatherDescription }: { name: string; location: string; temperatureC: number; weatherDescription: string })` (Task 4)
  - `TideBanner({ level, message }: { level: TideLevel; message: string })` (Task 5)
  - `SOSButton({ onPress }: { onPress?: () => void })` — named export from `@/components/sos/SOSButton` (Task 1)
  - `QuickActionsRow()` (Task 6)
  - `EvacuationCenterCard({ center: EvacuationCenter })` (Task 7)
  - `SafetyTipsList()` (Task 8)
  - `useSos()` from `@/context/SosContext` → `{ stage, openConfirm, confirmSOS, cancelSOS }`
  - `getEvacuationCenters(): Promise<EvacuationCenter[]>` and `getNotifications(): Promise<AppNotification[]>` from existing services
- Produces: the default-exported `HomeScreen` component rendered by `app/(tabs)/_layout.tsx`'s `Tabs.Screen name="home"` — no props (it's a route).

- [ ] **Step 1: Replace the file contents**

```tsx
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import EvacuationCenterCard from "@/components/home/EvacuationCenterCard";
import GreetingBlock from "@/components/home/GreetingBlock";
import HomeHeader from "@/components/home/HomeHeader";
import QuickActionsRow from "@/components/home/QuickActionsRow";
import SafetyTipsList from "@/components/home/SafetyTipsList";
import TideBanner from "@/components/home/TideBanner";
import { SOSButton } from "@/components/sos/SOSButton";
import { useSos } from "@/context/SosContext";
import { getEvacuationCenters, type EvacuationCenter } from "@/services/evacuation.service";
import { getNotifications } from "@/services/notification.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const MOCK_NAME = "Carl";
const MOCK_LOCATION = "Barangay Poblacion, Cordova";
const MOCK_TEMPERATURE_C = 29;
const MOCK_WEATHER_DESCRIPTION = "Partly Cloudy";
const MOCK_TIDE = {
  level: "normal",
  message: "No flooding risk detected in your area.",
} as const;

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { openConfirm } = useSos();
  const [hasUnread, setHasUnread] = useState(false);
  const [nearestCenter, setNearestCenter] = useState<EvacuationCenter | null>(null);

  useEffect(() => {
    getNotifications().then((notifications) => setHasUnread(notifications.length > 0));

    getEvacuationCenters().then((centers) => {
      if (centers.length === 0) return;
      const nearest = centers.reduce((closest, center) =>
        center.distanceKm < closest.distanceKm ? center : closest,
      );
      setNearestCenter(nearest);
    });
  }, []);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <HomeHeader hasUnread={hasUnread} />

      <View style={styles.section}>
        <GreetingBlock
          name={MOCK_NAME}
          location={MOCK_LOCATION}
          temperatureC={MOCK_TEMPERATURE_C}
          weatherDescription={MOCK_WEATHER_DESCRIPTION}
        />
      </View>

      <View style={styles.section}>
        <TideBanner level={MOCK_TIDE.level} message={MOCK_TIDE.message} />
      </View>

      <View style={styles.sosSection}>
        <SOSButton onPress={openConfirm} />
      </View>

      <View style={styles.section}>
        <QuickActionsRow />
      </View>

      {nearestCenter ? (
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Nearest Evacuation Center</Text>
          <EvacuationCenterCard center={nearestCenter} />
        </View>
      ) : null}

      <View style={styles.section}>
        <SafetyTipsList />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: SPACING.md,
  },
  section: {
    gap: SPACING.xs,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  sosSection: {
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/home.tsx"
git commit -m "feat: assemble Home screen from new components"
```

- [ ] **Step 4: Manual verification**

Run: `npm run web` (or `npx expo start --web`), then open the app in the browser and log in (or use an existing session) to land on the Home tab.

Walk through the full checklist from the design spec's Testing section:
- Home renders all seven sections in order: brand header, greeting/weather, tide banner, SOS button, quick actions, nearest evacuation center, safety tips
- Bell icon (top right) navigates to `/notifications` (shows "Coming Soon")
- "Report Incident" quick action navigates to the Report tab
- "Evacuation Center" quick action navigates to the Map tab
- "Emergency Contacts" quick action navigates to `/contacts` (shows "Coming Soon", does not 404)
- The evacuation center card ("Kagawasan Elementary School · 1.2 km away · Open") navigates to `/evacuation-detail/kagawasan-elementary` (shows "Coming Soon", does not 404)
- Pressing the SOS button does not crash the app (it silently changes `useSos()` internal state — no visible overlay yet, this is the known/expected gap documented in the spec)
- The tab bar (Home/Map/FAB/Report History/Profile) still renders and functions normally underneath the new Home content

If everything above holds, the task — and the plan — is complete.
