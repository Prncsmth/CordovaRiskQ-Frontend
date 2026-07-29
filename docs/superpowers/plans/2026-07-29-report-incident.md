# Report Incident Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-line `app/(tabs)/report.tsx` stub with the real incident-reporting form (category grid, pinned location, details, optional photo, submit), and add a new post-submit confirmation screen.

**Architecture:** New presentational components under `components/report/`, following the existing `components/home/` pattern (dedicated, theme-token-driven, one file per section). A new plain pushed route `app/report-confirmation.tsx` (outside the `(tabs)` group, same convention as `app/notifications/index.tsx`/`app/contacts/index.tsx`) renders the confirmation screen and reads `ref`/`category`/`location` from route params. `app/(tabs)/report.tsx` owns all local form state (category, details, photo-attached flag) and calls the existing `createReport()` service on submit.

**Tech Stack:** Expo Router v6 (typed routes enabled), React Native, `@expo/vector-icons` (Ionicons), existing `theme/` token modules, existing `components/auth/PrimaryButton` and `components/common/{BackButton,PlaceholderThumb}`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-29-report-incident-design.md`

## Global Constraints

- **No hardcoded colors/spacing/font sizes** except the 5 category accent colors (Task 1), which are a deliberate exception matching the existing precedent in `services/report.service.ts`'s mock data (`statusColor: "#1E8E3E"` etc.) — category identity colors are data, not theme tokens. Everything else uses `COLORS`, `SPACING`, `RADIUS`, `TYPOGRAPHY` from `@/theme`.
- **Typed routes are enabled** (`app.json` → `experiments.typedRoutes: true`). Every `router.push`/`router.replace` call must use a literal path string at its own call site. This is why Task 5 (the confirmation route) is built before Task 6 (the form that navigates to it).
- **Navigation uses full group-qualified paths**, e.g. `router.replace("/(tabs)/report-history")`, matching existing convention.
- **`ref` is a reserved prop name in React** — a function component cannot receive a prop literally named `ref` (React strips it before the component ever sees it, since JSX treats `ref` as a special attribute regardless of component type). The confirmation component's report-reference-number prop is named `refNumber`, not `ref`. The `useLocalSearchParams` query key can still be `ref` — that's just a URL param name, not a JSX prop.
- **No automated test suite exists in this repo.** Each task's verification step is `npx tsc --noEmit` (TypeScript compiles cleanly) plus, where noted, a manual visual check. The final task has a full manual walkthrough.
- **Icons:** use `Ionicons` from `@expo/vector-icons`, matching every existing screen/component.
- Commit after every task.

---

### Task 1: Category data + CategoryGrid component

**Files:**
- Create: `components/report/categories.ts`
- Create: `components/report/CategoryGrid.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces:
  - `type CategoryId = "flood" | "fire" | "medical" | "road-accident" | "other"`
  - `type Category = { id: CategoryId; label: string; icon: keyof typeof Ionicons.glyphMap; color: string }`
  - `CATEGORIES: Category[]` — named export
  - `getCategory(id: CategoryId): Category` — named export, throws if not found (never happens with the fixed union, but keeps the return type non-optional for callers)
  - `CategoryGrid({ selected, onSelect }: { selected: CategoryId | null; onSelect: (id: CategoryId) => void })` — default export. Later tasks (Task 6) import it as `import CategoryGrid from "@/components/report/CategoryGrid";` and `import { getCategory, type CategoryId } from "@/components/report/categories";` (Task 5 also imports `getCategory`/`CategoryId`).

- [ ] **Step 1: Create `components/report/categories.ts`**

```ts
import { Ionicons } from "@expo/vector-icons";

export type CategoryId = "flood" | "fire" | "medical" | "road-accident" | "other";

export type Category = {
  id: CategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

// Standalone hex values, deliberately not COLORS.* tokens: a category's
// identity color must not shift if an unrelated theme color is retuned later.
export const CATEGORIES: Category[] = [
  { id: "flood", label: "Flood", icon: "water", color: "#2F6FED" },
  { id: "fire", label: "Fire", icon: "flame", color: "#FF6B35" },
  { id: "medical", label: "Medical Emergency", icon: "medical", color: "#DC2626" },
  { id: "road-accident", label: "Road Accident", icon: "warning", color: "#B45309" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal", color: "#9CA3AF" },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) {
    throw new Error(`Unknown category id: ${id}`);
  }
  return category;
}
```

- [ ] **Step 2: Create `components/report/CategoryGrid.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import { CATEGORIES, type CategoryId } from "@/components/report/categories";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type CategoryGridProps = {
  selected: CategoryId | null;
  onSelect: (id: CategoryId) => void;
};

export default function CategoryGrid({ selected, onSelect }: CategoryGridProps) {
  return (
    <View style={styles.grid}>
      {CATEGORIES.map((category) => {
        const isSelected = category.id === selected;
        return (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.card,
              isSelected && {
                backgroundColor: `${category.color}14`,
                borderColor: category.color,
              },
            ]}
            onPress={() => onSelect(category.id)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconCircle, { backgroundColor: `${category.color}1A` }]}>
              <Ionicons name={category.icon} size={20} color={category.color} />
            </View>
            <Text style={[styles.label, isSelected && { color: category.color }]}>
              {category.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  card: {
    width: "48%",
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    alignItems: "center",
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.xs,
  },
  label: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
    textAlign: "center",
  },
});
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/report/categories.ts` or `components/report/CategoryGrid.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/report/categories.ts components/report/CategoryGrid.tsx
git commit -m "feat: add category data and CategoryGrid component"
```

---

### Task 2: PinnedLocationCard component

**Files:**
- Create: `components/report/PinnedLocationCard.tsx`

**Interfaces:**
- Consumes: `PlaceholderThumb({ style }: { style?: StyleProp<ViewStyle> })` — default export from `@/components/common/PlaceholderThumb` (existing)
- Produces: `PinnedLocationCard({ address }: { address: string })` — default export. Task 6 imports it as `import PinnedLocationCard from "@/components/report/PinnedLocationCard";`.

- [ ] **Step 1: Create `components/report/PinnedLocationCard.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

type PinnedLocationCardProps = {
  address: string;
};

export default function PinnedLocationCard({ address }: PinnedLocationCardProps) {
  return (
    <View>
      <View style={styles.mapBox}>
        <PlaceholderThumb style={StyleSheet.absoluteFillObject} />
        <Ionicons name="location-sharp" size={28} color={COLORS.primary} />
      </View>
      <Text style={styles.caption}>{address} (auto-detected)</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  mapBox: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  caption: {
    marginTop: SPACING.xs,
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/report/PinnedLocationCard.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/report/PinnedLocationCard.tsx
git commit -m "feat: add PinnedLocationCard component"
```

---

### Task 3: DetailsInput component

**Files:**
- Create: `components/report/DetailsInput.tsx`

**Interfaces:**
- Consumes: nothing new
- Produces: `DetailsInput({ value, onChangeText }: { value: string; onChangeText: (text: string) => void })` — default export. Task 6 imports it as `import DetailsInput from "@/components/report/DetailsInput";`.

- [ ] **Step 1: Create `components/report/DetailsInput.tsx`**

```tsx
import React from "react";
import { StyleSheet, TextInput } from "react-native";

import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type DetailsInputProps = {
  value: string;
  onChangeText: (text: string) => void;
};

export default function DetailsInput({ value, onChangeText }: DetailsInputProps) {
  return (
    <TextInput
      style={styles.input}
      value={value}
      onChangeText={onChangeText}
      placeholder="Describe what's happening..."
      placeholderTextColor={COLORS.textTertiary}
      multiline
      numberOfLines={4}
      textAlignVertical="top"
    />
  );
}

const styles = StyleSheet.create({
  input: {
    minHeight: 100,
    backgroundColor: COLORS.inputBg,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
    fontSize: TYPOGRAPHY.body,
    color: COLORS.text,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/report/DetailsInput.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/report/DetailsInput.tsx
git commit -m "feat: add DetailsInput component"
```

---

### Task 4: PhotoPicker component

**Files:**
- Create: `components/report/PhotoPicker.tsx`

**Interfaces:**
- Consumes: `PlaceholderThumb({ style }: { style?: StyleProp<ViewStyle> })` — default export from `@/components/common/PlaceholderThumb` (existing)
- Produces: `PhotoPicker({ attached, onToggle }: { attached: boolean; onToggle: () => void })` — default export. Task 6 imports it as `import PhotoPicker from "@/components/report/PhotoPicker";`. Purely a UI toggle — `onToggle` flips the parent's boolean state; no image data is ever produced (per spec, this is a UI-only mock, not a real image picker).

- [ ] **Step 1: Create `components/report/PhotoPicker.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PlaceholderThumb from "@/components/common/PlaceholderThumb";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type PhotoPickerProps = {
  attached: boolean;
  onToggle: () => void;
};

export default function PhotoPicker({ attached, onToggle }: PhotoPickerProps) {
  if (attached) {
    return (
      <View style={styles.attachedWrap}>
        <PlaceholderThumb style={styles.thumb} />
        <TouchableOpacity
          style={styles.removeButton}
          onPress={onToggle}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={14} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <TouchableOpacity style={styles.emptyBox} onPress={onToggle} activeOpacity={0.7}>
      <Ionicons name="camera-outline" size={22} color={COLORS.textTertiary} />
      <Text style={styles.emptyLabel}>Add Photo (Optional)</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  emptyBox: {
    height: 88,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: "dashed",
    borderRadius: RADIUS.md,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
  },
  emptyLabel: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  attachedWrap: {
    height: 88,
    width: 88,
  },
  thumb: {
    width: 88,
    height: 88,
  },
  removeButton: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.text,
    alignItems: "center",
    justifyContent: "center",
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/report/PhotoPicker.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/report/PhotoPicker.tsx
git commit -m "feat: add PhotoPicker component"
```

---

### Task 5: Report Confirmation screen (component + route)

**Files:**
- Create: `components/report/ReportConfirmation.tsx`
- Create: `app/report-confirmation.tsx`

**Depends on:** Task 1 (`getCategory`, `CategoryId`)

**Interfaces:**
- Consumes:
  - `getCategory(id: CategoryId): Category` and `type CategoryId` from `@/components/report/categories` (Task 1)
  - `PrimaryButton({ title, onPress, disabled? }: { title: string } & TouchableOpacityProps)` — default export from `@/components/auth/PrimaryButton` (existing)
- Produces:
  - `ReportConfirmation({ categoryId, location, refNumber, onViewHistory, onBackHome }: { categoryId: CategoryId; location: string; refNumber: string; onViewHistory: () => void; onBackHome: () => void })` — default export, used only by `app/report-confirmation.tsx` in this task.
  - The route `/report-confirmation`, reachable via `router.push({ pathname: "/report-confirmation", params: { ref, category, location } })`. Task 6 relies on this exact route path and these exact three param names.

- [ ] **Step 1: Create `components/report/ReportConfirmation.tsx`**

```tsx
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { getCategory, type CategoryId } from "@/components/report/categories";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type ReportConfirmationProps = {
  categoryId: CategoryId;
  location: string;
  refNumber: string;
  onViewHistory: () => void;
  onBackHome: () => void;
};

export default function ReportConfirmation({
  categoryId,
  location,
  refNumber,
  onViewHistory,
  onBackHome,
}: ReportConfirmationProps) {
  const category = getCategory(categoryId);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconCircle}>
        <Ionicons name="checkmark" size={32} color={COLORS.success} />
      </View>
      <Text style={styles.heading}>Report Submitted</Text>
      <Text style={styles.subtitle}>
        Responders have been notified and are reviewing your report.
      </Text>

      <View style={styles.summaryRow}>
        <Ionicons name={category.icon} size={16} color={category.color} />
        <Text style={styles.summaryText}>
          {category.label} · {location}
        </Text>
      </View>
      <Text style={styles.refText}>Report #{refNumber}</Text>

      <View style={styles.actions}>
        <PrimaryButton title="View Report History" onPress={onViewHistory} />
        <TouchableOpacity onPress={onBackHome} hitSlop={8} style={styles.backLink}>
          <Text style={styles.backLinkText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: RADIUS.full,
    backgroundColor: COLORS.successBg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: SPACING.md,
  },
  heading: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.body,
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginBottom: SPACING.xs,
  },
  summaryText: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "600",
    color: COLORS.text,
  },
  refText: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginBottom: SPACING.lg,
  },
  actions: {
    width: "100%",
  },
  backLink: {
    alignItems: "center",
    marginTop: SPACING.md,
  },
  backLinkText: {
    fontSize: TYPOGRAPHY.body,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
```

- [ ] **Step 2: Create `app/report-confirmation.tsx`**

```tsx
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";
import { View } from "react-native";

import type { CategoryId } from "@/components/report/categories";
import ReportConfirmation from "@/components/report/ReportConfirmation";
import { COLORS } from "@/theme";

export default function ReportConfirmationScreen() {
  const router = useRouter();
  const { ref, category, location } = useLocalSearchParams<{
    ref: string;
    category: CategoryId;
    location: string;
  }>();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ReportConfirmation
        categoryId={category}
        location={location}
        refNumber={ref}
        onViewHistory={() => router.replace("/(tabs)/report-history")}
        onBackHome={() => router.replace("/(tabs)/home")}
      />
    </View>
  );
}
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/report/ReportConfirmation.tsx` or `app/report-confirmation.tsx`

- [ ] **Step 4: Commit**

```bash
git add components/report/ReportConfirmation.tsx app/report-confirmation.tsx
git commit -m "feat: add Report Confirmation screen"
```

---

### Task 6: Assemble the Report Incident form

**Files:**
- Modify: `app/(tabs)/report.tsx` (full file, currently 12 lines — see current content below)

**Depends on:** Tasks 1–5 (imports every component built so far, and navigates to the Task 5 route)

**Current content of `app/(tabs)/report.tsx`:**
```tsx
import { Text, View } from "react-native";

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

**Interfaces:**
- Consumes:
  - `CategoryGrid({ selected, onSelect })` (Task 1)
  - `PinnedLocationCard({ address })` (Task 2)
  - `DetailsInput({ value, onChangeText })` (Task 3)
  - `PhotoPicker({ attached, onToggle })` (Task 4)
  - the `/report-confirmation` route + its `ref`/`category`/`location` params (Task 5)
  - `PrimaryButton({ title, onPress, disabled })` from `@/components/auth/PrimaryButton` (existing)
  - `BackButton({ onPress })` from `@/components/common/BackButton` (existing)
  - `createReport(payload: Record<string, unknown>): Promise<{ success: boolean; payload: Record<string, unknown>; ref: string }>` from `@/services/report.service` (existing)
- Produces: the default-exported `ReportScreen` component rendered by `app/(tabs)/_layout.tsx`'s `Tabs.Screen name="report"` — no props (it's a route).

- [ ] **Step 1: Replace the file contents**

```tsx
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import BackButton from "@/components/common/BackButton";
import type { CategoryId } from "@/components/report/categories";
import CategoryGrid from "@/components/report/CategoryGrid";
import DetailsInput from "@/components/report/DetailsInput";
import PhotoPicker from "@/components/report/PhotoPicker";
import PinnedLocationCard from "@/components/report/PinnedLocationCard";
import { createReport } from "@/services/report.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

const MOCK_LOCATION = "Barangay Poblacion, Cordova";

export default function ReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<CategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [photoAttached, setPhotoAttached] = useState(false);

  const canSubmit = category !== null && details.trim().length > 0;

  const handleSubmit = async () => {
    if (!category || details.trim().length === 0) return;

    const result = await createReport({
      category,
      location: MOCK_LOCATION,
      details,
      hasPhoto: photoAttached,
    });

    router.push({
      pathname: "/report-confirmation",
      params: { ref: result.ref, category, location: MOCK_LOCATION },
    });
  };

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <BackButton onPress={() => router.back()} />

      <View style={styles.section}>
        <Text style={styles.title}>Report an Incident</Text>
        <Text style={styles.subtitle}>Select a category and share details</Text>
      </View>

      <View style={styles.section}>
        <CategoryGrid selected={category} onSelect={setCategory} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Pinned Location</Text>
        <PinnedLocationCard address={MOCK_LOCATION} />
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionHeading}>Details</Text>
        <DetailsInput value={details} onChangeText={setDetails} />
      </View>

      <View style={styles.section}>
        <PhotoPicker
          attached={photoAttached}
          onToggle={() => setPhotoAttached((v) => !v)}
        />
      </View>

      <PrimaryButton
        title="Submit Report"
        onPress={handleSubmit}
        disabled={!canSubmit}
      />
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
  title: {
    fontSize: TYPOGRAPHY.heading,
    fontWeight: "800",
    color: COLORS.text,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.caption,
    color: COLORS.textSecondary,
  },
  sectionHeading: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "800",
    color: COLORS.text,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/report.tsx"
git commit -m "feat: assemble Report Incident form from new components"
```

- [ ] **Step 4: Manual verification**

Run: `npm run web` (or `npx expo start --web`), log in (or use an existing session), and navigate to the Report tab (via Home's "Report Incident" quick action or the FAB).

Walk through the full checklist from the design spec's Testing section:
- Back button (top-left) navigates back to the previous screen
- Each category card toggles its selected style (tinted background, colored border, colored bold label) when tapped; only one is selected at a time
- Pinned Location shows the gray placeholder box with a red pin icon and the caption "Barangay Poblacion, Cordova (auto-detected)"
- Submit Report is disabled (dimmed) with no category selected, or with an empty Details field; becomes enabled once both are filled
- Tapping Add Photo toggles between the empty dashed box and an attached placeholder-thumbnail state with a remove (×) button; tapping remove goes back to the empty state
- Submitting navigates to the confirmation screen, showing the correct category icon/label, location, and a `RQ-XXXXX`-style ref number
- On the confirmation screen, "View Report History" navigates to the Report History tab; "Back to Home" navigates to the Home tab
- Pressing back (hardware/gesture) from the confirmation screen does not return to the report form
- The tab bar still renders and functions normally when landing on Report History / Home from the confirmation screen

If everything above holds, the task — and the plan — is complete.
