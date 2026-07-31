# User Profile Edit Screen Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace `app/user-profile/index.tsx`'s "Coming Soon" stub with the real edit-profile form: header, avatar-edit block, four labeled pill inputs, and a Save button.

**Architecture:** Two new presentational components under `components/user-profile/` (mirrors the existing per-screen-domain pattern: `components/home/`, `components/report/`, `components/report-history/`, `components/profile/`). `app/user-profile/index.tsx` owns the local form state, seeded from `useAuth().user`, and composes everything.

**Tech Stack:** Expo Router v6, React Native, `@expo/vector-icons` (Ionicons), existing `theme/` token modules, existing `components/auth/PrimaryButton` and `components/common/BackButton`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-31-user-profile-design.md`

## Global Constraints

- **No hardcoded colors/spacing/font sizes.** Everything uses `COLORS`, `SPACING`, `RADIUS`, `TYPOGRAPHY` from `@/theme`, except where explicitly noted in a task (there are no sanctioned exceptions in this plan).
- **No real image picker, no real backend save.** The camera badge has no `onPress`; "Save" navigates back without any service call — both per the spec's Out of scope section.
- **No automated test suite exists in this repo.** Each task's verification step is `npx tsc --noEmit` (clean) AND `npx eslint app components services theme` (0 errors, same pre-existing warning count as before — currently 4 warnings in unrelated files).
- **Icons:** use `Ionicons` from `@expo/vector-icons`.
- Commit after every task.

---

### Task 1: ProfileAvatarEdit component

**Files:**
- Create: `components/user-profile/ProfileAvatarEdit.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `ProfileAvatarEdit()` — default export, no props. Task 3 imports it as `import ProfileAvatarEdit from "@/components/user-profile/ProfileAvatarEdit";` and renders it with no props.

- [ ] **Step 1: Create `components/user-profile/ProfileAvatarEdit.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, View } from "react-native";

import { COLORS, RADIUS } from "@/theme";

export default function ProfileAvatarEdit() {
  return (
    <View style={styles.wrap}>
      <View style={styles.circle}>
        <Ionicons name="person-outline" size={56} color={COLORS.primary} />
      </View>
      <View style={styles.badge}>
        <Ionicons name="camera" size={16} color={COLORS.white} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignSelf: "center",
    width: 112,
    height: 112,
  },
  circle: {
    width: 112,
    height: 112,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primaryTint,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: COLORS.background,
  },
});
```

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/user-profile/ProfileAvatarEdit.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors (same pre-existing warning count as before)

- [ ] **Step 3: Commit**

```bash
git add components/user-profile/ProfileAvatarEdit.tsx
git commit -m "feat: add ProfileAvatarEdit component"
```

---

### Task 2: ProfileFieldInput component

**Files:**
- Create: `components/user-profile/ProfileFieldInput.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `ProfileFieldInput({ label, value, onChangeText, keyboardType, autoCapitalize }: ProfileFieldInputProps)` — default export, where `ProfileFieldInputProps = { label: string; value: string; onChangeText: (text: string) => void } & Pick<TextInputProps, "keyboardType" | "autoCapitalize">`. Task 3 imports it as `import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";` and renders it 4 times, passing `keyboardType="email-address"`/`autoCapitalize="none"` for the E-Mail field and `keyboardType="phone-pad"` for Mobile.

- [ ] **Step 1: Create `components/user-profile/ProfileFieldInput.tsx`**

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

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/user-profile/ProfileFieldInput.tsx`

Run: `npx eslint app components services theme`
Expected: 0 errors

- [ ] **Step 3: Commit**

```bash
git add components/user-profile/ProfileFieldInput.tsx
git commit -m "feat: add ProfileFieldInput component"
```

---

### Task 3: Assemble the User Profile screen

**Files:**
- Modify: `app/user-profile/index.tsx` (full file, currently 15 lines — see current content below)

**Depends on:** Task 1 (`ProfileAvatarEdit`), Task 2 (`ProfileFieldInput`)

**Current content of `app/user-profile/index.tsx`:**
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

**Interfaces:**
- Consumes:
  - `ProfileAvatarEdit()` (Task 1)
  - `ProfileFieldInput({ label, value, onChangeText, keyboardType?, autoCapitalize? })` (Task 2)
  - `BackButton({ onPress, style? })` from `@/components/common/BackButton` (existing)
  - `PrimaryButton({ title, onPress })` from `@/components/auth/PrimaryButton` (existing)
  - `useAuth()` from `@/context/AuthContext` (existing) — `{ user }`, where `user: { id: string; name: string; email: string } | null`
- Produces: the default-exported `UserProfileScreen` component rendered at the `/user-profile` route — no props (it's a route).

- [ ] **Step 1: Replace the file contents**

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import ProfileAvatarEdit from "@/components/user-profile/ProfileAvatarEdit";
import ProfileFieldInput from "@/components/user-profile/ProfileFieldInput";
import { useAuth } from "@/context/AuthContext";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const MOCK_MOBILE = "+63 917 555 0142";

function splitName(name: string | undefined): {
  firstName: string;
  lastName: string;
} {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { firstName: "", lastName: "" };
  }
  const [first, ...rest] = parts;
  return { firstName: first, lastName: rest.join(" ") };
}

export default function UserProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAuth();
  const initial = splitName(user?.name);

  const [firstName, setFirstName] = useState(initial.firstName);
  const [lastName, setLastName] = useState(initial.lastName);
  const [email, setEmail] = useState(user?.email ?? "");
  const [mobile, setMobile] = useState(MOCK_MOBILE);

  function handleSave() {
    router.back();
  }

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} style={styles.backButton} />
        <Text style={styles.headerTitle}>User Profile</Text>
      </View>

      <ProfileAvatarEdit />

      <View style={styles.fields}>
        <ProfileFieldInput
          label="First Name"
          value={firstName}
          onChangeText={setFirstName}
        />
        <ProfileFieldInput
          label="Last Name"
          value={lastName}
          onChangeText={setLastName}
        />
        <ProfileFieldInput
          label="E-Mail"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <ProfileFieldInput
          label="Mobile"
          value={mobile}
          onChangeText={setMobile}
          keyboardType="phone-pad"
        />
      </View>

      <PrimaryButton title="SAVE" onPress={handleSave} />
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  backButton: {
    position: "absolute",
    left: 0,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.subtitle,
    fontWeight: "800",
    color: COLORS.text,
  },
  fields: {
    gap: SPACING.md,
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
git add app/user-profile/index.tsx
git commit -m "feat: assemble User Profile screen from new components"
```

- [ ] **Step 4: Manual verification**

Run: `npm run web` (or `npx expo start --web`), log in, and navigate to Profile → "User Profile".

Walk through the full checklist from the design spec's Testing section:
- First Name/Last Name/E-Mail are pre-filled from the logged-in user's real name/email; Mobile shows the mock placeholder number
- Back button returns to the Profile screen
- All four fields are editable (typing updates the field)
- Camera badge on the avatar has no effect when tapped
- "Save" returns to the Profile screen

If everything above holds, the task — and the plan — is complete.
