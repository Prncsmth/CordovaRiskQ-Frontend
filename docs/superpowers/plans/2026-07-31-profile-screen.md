# Profile Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/(tabs)/profile.tsx`'s minimal implementation with the full Profile screen from the prototype: avatar + welcome header with a logout icon, a grouped menu of 5 rows (4 nav + 1 toggle), and a Contact Support card.

**Architecture:** New presentational components under `components/profile/` (mirrors the existing `components/home/`/`components/report/`/`components/report-history/` pattern). `components/common/Avatar.tsx` (currently unused anywhere in the app) gets a small, self-contained update for 2-letter initials and theme colors. Four new minimal "Coming Soon" stub routes are added for destinations that don't exist yet, matching the existing `app/notifications/index.tsx` pattern exactly. `app/(tabs)/profile.tsx` owns the menu-item list (as data) and the existing logout logic, and composes everything else.

**Tech Stack:** Expo Router v6, React Native (`Switch` from `react-native`), `@expo/vector-icons` (Ionicons), existing `theme/` token modules, existing `context/AuthContext`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-31-profile-design.md`

## Global Constraints

- **No hardcoded colors/spacing/font sizes.** Everything uses `COLORS`, `SPACING`, `RADIUS`, `TYPOGRAPHY` from `@/theme`. Unlike the Report Incident/Report History plans, this plan has no sanctioned hex/pixel exceptions — if a step below needs a fine-grained value, it uses a token, not a literal.
- **Navigation uses full route path strings** matching Expo Router's typed-routes requirement (each `router.push(...)` call uses a literal string at its own call site) — e.g. `router.push("/user-profile")`, `router.push("/contacts")` (existing route, unchanged).
- **New stub routes are plain pushed routes outside the `(tabs)` group**, structurally identical to the existing `app/notifications/index.tsx` (no header, no back button — same as that existing precedent).
- **No automated test suite exists in this repo.** Each task's verification step is `npx tsc --noEmit` (compiles cleanly) AND `npx eslint app components services theme` (0 errors — pre-existing warnings in unrelated files are fine and expected; do not fix them, do not let their count change). A prior plan's final review found that skipping the lint check let a real defect through, so it's included in every task this time.
- **Icons:** use `Ionicons` from `@expo/vector-icons`, matching every existing screen/component.
- Commit after every task.

---

### Task 1: Update Avatar for 2-letter initials and theme colors

**Files:**
- Modify: `components/common/Avatar.tsx` (full file, currently 26 lines — see current content below)

**Current content of `components/common/Avatar.tsx`:**
```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

export function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.text}>{name.charAt(0).toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: "#fff",
    fontWeight: "700",
  },
});
```

**Context:** `Avatar` is currently imported by no other file in this codebase (verified via grep before this plan was written), so this change carries no risk of breaking an existing caller. The screenshot's avatar shows two-letter initials ("CS" for "Carl Santos") and a red (brand primary) circle, not the current single-letter blue circle.

**Interfaces:**
- Consumes: nothing new
- Produces: `Avatar({ name }: { name: string })` — named export (unchanged signature), used by Task 3's `ProfileHeader`. Behavior change only: renders up to 2 initials instead of 1, and uses `COLORS.primary`/`COLORS.white` instead of hardcoded hex.

- [ ] **Step 1: Replace the file contents**

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { COLORS, RADIUS } from "@/theme";

function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name }: { name: string }) {
  return (
    <View style={styles.avatar}>
      <Text style={styles.text}>{getInitials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  text: {
    color: COLORS.white,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/common/Avatar.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors (same pre-existing warning count as before this change)

- [ ] **Step 3: Commit**

```bash
git add components/common/Avatar.tsx
git commit -m "feat: derive 2-letter initials and use theme colors in Avatar"
```

---

### Task 2: MenuRow component

**Files:**
- Create: `components/profile/MenuRow.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `MenuRow({ icon, label, onPress, right }: MenuRowProps)` — default export, where `MenuRowProps = { icon: keyof typeof Ionicons.glyphMap; label: string; onPress?: () => void; right?: React.ReactNode }`. When `right` is omitted, renders a red chevron-forward icon. When `onPress` is omitted, renders as a plain (non-touchable) row. Task 6 imports it as `import MenuRow from "@/components/profile/MenuRow";` and passes a `<Switch>` as `right` for the Push Notification row.

- [ ] **Step 1: Create `components/profile/MenuRow.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export type MenuRowProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

export default function MenuRow({ icon, label, onPress, right }: MenuRowProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={18} color={COLORS.text} />
      </View>
      <Text style={styles.label}>{label}</Text>
      {right ?? (
        <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.text,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/profile/MenuRow.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add components/profile/MenuRow.tsx
git commit -m "feat: add MenuRow component"
```

---

### Task 3: ProfileHeader component

**Files:**
- Create: `components/profile/ProfileHeader.tsx`

**Depends on:** Task 1 (`Avatar`)

**Interfaces:**
- Consumes: `Avatar({ name }: { name: string })` — named export from `@/components/common/Avatar` (Task 1)
- Produces: `ProfileHeader({ name, onLogout }: { name: string; onLogout: () => void })` — default export. Task 6 imports it as `import ProfileHeader from "@/components/profile/ProfileHeader";` and passes the existing logout handler.

- [ ] **Step 1: Create `components/profile/ProfileHeader.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { Avatar } from "@/components/common/Avatar";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type ProfileHeaderProps = {
  name: string;
  onLogout: () => void;
};

export default function ProfileHeader({ name, onLogout }: ProfileHeaderProps) {
  return (
    <View style={styles.row}>
      <Avatar name={name} />
      <View style={styles.textCol}>
        <Text style={styles.welcome}>Welcome</Text>
        <Text style={styles.name}>{name}</Text>
      </View>
      <TouchableOpacity
        style={styles.logoutButton}
        onPress={onLogout}
        activeOpacity={0.7}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Ionicons name="log-out-outline" size={20} color={COLORS.primary} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  textCol: {
    flex: 1,
  },
  welcome: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  name: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "800",
    color: COLORS.text,
  },
  logoutButton: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/profile/ProfileHeader.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add components/profile/ProfileHeader.tsx
git commit -m "feat: add ProfileHeader component"
```

---

### Task 4: Stub routes for User Profile, Change Password, FAQs, Contact Support

**Files:**
- Create: `app/user-profile/index.tsx`
- Create: `app/change-password/index.tsx`
- Create: `app/faqs/index.tsx`
- Create: `app/contact-support/index.tsx`

**Context:** These four screens don't have real designs yet. Each is a minimal placeholder, structurally identical to the existing `app/notifications/index.tsx` (a plain pushed route outside `(tabs)`, no header, no back button — same as that existing precedent). Only the exported function name differs per file (for readability in stack traces/dev tools); the rendered content is identical.

**Interfaces:**
- Consumes: nothing
- Produces: four routes — `/user-profile`, `/change-password`, `/faqs`, `/contact-support` — each rendering a centered "Coming Soon" text. Task 6 navigates to the first three; Task 4's `ContactSupportCard` (already committed) navigates to the fourth.

- [ ] **Step 1: Create `app/user-profile/index.tsx`**

```tsx
import { Text, View } from "react-native";

export default function UserProfileScreen() {
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

- [ ] **Step 2: Create `app/change-password/index.tsx`**

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

- [ ] **Step 3: Create `app/faqs/index.tsx`**

```tsx
import { Text, View } from "react-native";

export default function FaqsScreen() {
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

- [ ] **Step 4: Create `app/contact-support/index.tsx`**

```tsx
import { Text, View } from "react-native";

export default function ContactSupportScreen() {
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

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit`
Expected: no errors

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 6: Commit**

```bash
git add app/user-profile/index.tsx app/change-password/index.tsx app/faqs/index.tsx app/contact-support/index.tsx
git commit -m "feat: add Coming Soon stub routes for User Profile, Change Password, FAQs, Contact Support"
```

---

### Task 5: ContactSupportCard component

**Files:**
- Create: `components/profile/ContactSupportCard.tsx`

**Depends on:** Task 4 (the `/contact-support` route must exist before this component's `router.push("/contact-support")` call type-checks against Expo Router's typed routes)

**Interfaces:**
- Consumes: nothing new (uses `useRouter()` internally, same self-contained-navigation precedent as the existing `components/home/EvacuationCenterCard.tsx`)
- Produces: `ContactSupportCard()` — default export, no props. Task 6 imports it as `import ContactSupportCard from "@/components/profile/ContactSupportCard";` and renders it with no props.

- [ ] **Step 1: Create `components/profile/ContactSupportCard.tsx`**

```tsx
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ContactSupportCard() {
  const router = useRouter();

  return (
    <View style={styles.card}>
      <Text style={styles.message}>
        If you have any other query you can reach out to us.
      </Text>
      <TouchableOpacity
        onPress={() => router.push("/contact-support")}
        hitSlop={8}
      >
        <Text style={styles.link}>Contact Support</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.primaryTint,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    gap: SPACING.xs,
  },
  message: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  link: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.primary,
    textDecorationLine: "underline",
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/profile/ContactSupportCard.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add components/profile/ContactSupportCard.tsx
git commit -m "feat: add ContactSupportCard component"
```

---

### Task 6: Assemble the Profile screen

**Files:**
- Modify: `app/(tabs)/profile.tsx` (full file, currently 53 lines — see current content below)

**Depends on:** Tasks 1–5 (imports every component built so far, and navigates to every route built so far)

**Current content of `app/(tabs)/profile.tsx`:**
```tsx
import PrimaryButton from "@/components/auth/PrimaryButton";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING } from "@/theme";
import { useRouter } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  const { logout, user } = useAuth();
  const router = useRouter();

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.name ?? "User"}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <PrimaryButton title="Log Out" onPress={handleLogout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: COLORS.background,
  },
  name: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  email: {
    color: COLORS.gray,
    marginBottom: SPACING.lg,
  },
});
```

**Interfaces:**
- Consumes:
  - `ProfileHeader({ name, onLogout })` (Task 3)
  - `MenuRow({ icon, label, onPress, right })` (Task 2)
  - `ContactSupportCard()` (Task 4)
  - the `/user-profile`, `/change-password`, `/faqs` routes (Task 5) and the existing `/contacts` route (unchanged)
  - `useAuth()` from `@/context/AuthContext` (existing) — `{ logout, user }`
- Produces: the default-exported `ProfileScreen` component rendered by `app/(tabs)/_layout.tsx`'s `Tabs.Screen name="profile"` — no props (it's a route).

- [ ] **Step 1: Replace the file contents**

```tsx
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ContactSupportCard from "@/components/profile/ContactSupportCard";
import MenuRow from "@/components/profile/MenuRow";
import ProfileHeader from "@/components/profile/ProfileHeader";
import { useAuth } from "@/context/AuthContext";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type MenuItem = {
  key: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress?: () => void;
  right?: React.ReactNode;
};

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { logout, user } = useAuth();
  const router = useRouter();
  const [notificationsOn, setNotificationsOn] = useState(true);

  function handleLogout() {
    Alert.alert("Log out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log out",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/(auth)/login");
        },
      },
    ]);
  }

  const menuItems: MenuItem[] = [
    {
      key: "user-profile",
      icon: "person-outline",
      label: "User Profile",
      onPress: () => router.push("/user-profile"),
    },
    {
      key: "change-password",
      icon: "lock-closed-outline",
      label: "Change Password",
      onPress: () => router.push("/change-password"),
    },
    {
      key: "emergency-contacts",
      icon: "call-outline",
      label: "Emergency Contacts",
      onPress: () => router.push("/contacts"),
    },
    {
      key: "faqs",
      icon: "help-circle-outline",
      label: "FAQs",
      onPress: () => router.push("/faqs"),
    },
    {
      key: "push-notification",
      icon: "notifications-outline",
      label: "Push Notification",
      right: (
        <Switch
          value={notificationsOn}
          onValueChange={setNotificationsOn}
          trackColor={{ true: COLORS.primary }}
          thumbColor={COLORS.white}
        />
      ),
    },
  ];

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <Text style={styles.title}>Profile</Text>

      <ProfileHeader name={user?.name ?? "User"} onLogout={handleLogout} />

      <View style={styles.menuCard}>
        {menuItems.map((item, index) => (
          <View
            key={item.key}
            style={index < menuItems.length - 1 ? styles.menuRowDivider : undefined}
          >
            <MenuRow
              icon={item.icon}
              label={item.label}
              onPress={item.onPress}
              right={item.right}
            />
          </View>
        ))}
      </View>

      <ContactSupportCard />
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
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  menuCard: {
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
  },
  menuRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
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
git add "app/(tabs)/profile.tsx"
git commit -m "feat: assemble Profile screen from new components"
```

- [ ] **Step 4: Manual verification**

Run: `npm run web` (or `npx expo start --web`), log in (or use an existing session), and navigate to the Profile tab.

Walk through the full checklist from the design spec's Testing section:
- Avatar shows the correct 2-letter initials (e.g. "CS" for "Carl Santos") in a red circle; header shows "Welcome" + the logged-in user's full name
- Tapping the top-right logout icon shows the confirm dialog; confirming logs out and returns to the login screen; canceling does nothing
- User Profile, Change Password, and FAQs rows each navigate to their "Coming Soon" stub; Emergency Contacts navigates to the existing `/contacts` stub
- The Contact Support link at the bottom navigates to its "Coming Soon" stub
- The Push Notification switch toggles between on/off and holds its state while on the screen; it does not navigate anywhere
- The 5 rows render inside one bordered, rounded card with a divider line between each row and no divider after the last row (Push Notification)
- No leftover bottom "Log Out" button

If everything above holds, the task — and the plan — is complete.
