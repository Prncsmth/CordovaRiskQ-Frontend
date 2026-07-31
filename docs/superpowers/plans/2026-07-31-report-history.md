# Report History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the one-line `app/(tabs)/report-history.tsx` stub with the real report-history list screen (title/subtitle header, "+ New Report" shortcut, list of past reports with status pills, empty state).

**Architecture:** One new presentational component, `components/report-history/ReportHistoryCard.tsx`, following the existing `components/home/`/`components/report/` per-screen-domain pattern (dedicated folder, theme-token-driven, one file per section). `app/(tabs)/report-history.tsx` owns the fetch (`getReportHistory()`, existing/unchanged) and renders the list of cards or the existing `EmptyState` component.

**Tech Stack:** Expo Router v6, React Native, `@expo/vector-icons` (not needed here — no icons in this screen), existing `theme/` token modules, existing `components/auth/PrimaryButton` and `components/common/EmptyState`. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-31-report-history-design.md`

## Global Constraints

- **No hardcoded colors/spacing/font sizes** except the status pill's `statusColor`/`statusBg`, which come directly from `ReportHistoryItem` (mock data, not theme tokens) — same precedent as the category accent colors in the Report Incident plan. Everything else uses `COLORS`, `SPACING`, `RADIUS`, `TYPOGRAPHY` from `@/theme`.
- **Navigation uses full group-qualified paths**, e.g. `router.push("/(tabs)/report")`, matching existing convention.
- **No automated test suite exists in this repo.** Each task's verification step is `npx tsc --noEmit` (TypeScript compiles cleanly) plus, where noted, a manual visual check.
- Commit after every task.

---

### Task 1: ReportHistoryCard component

**Files:**
- Create: `components/report-history/ReportHistoryCard.tsx`

**Interfaces:**
- Consumes: `ReportHistoryItem` type from `@/services/report.service` (existing, unchanged) — shape: `{ id: string; category: string; location: string; date: string; ref: string; status: "Resolved" | "Reviewing"; statusColor: string; statusBg: string }`
- Produces: `ReportHistoryCard({ item }: { item: ReportHistoryItem })` — default export. Task 2 imports it as `import ReportHistoryCard from "@/components/report-history/ReportHistoryCard";`.

- [ ] **Step 1: Create `components/report-history/ReportHistoryCard.tsx`**

```tsx
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import type { ReportHistoryItem } from "@/services/report.service";
import { COLORS, RADIUS, SPACING, TYPOGRAPHY } from "@/theme";

type ReportHistoryCardProps = {
  item: ReportHistoryItem;
};

export default function ReportHistoryCard({ item }: ReportHistoryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.textCol}>
        <Text style={styles.category}>{item.category}</Text>
        <Text style={styles.location}>{item.location}</Text>
        <Text style={styles.meta}>
          {item.date} · {item.ref}
        </Text>
      </View>
      <View style={[styles.pill, { backgroundColor: item.statusBg }]}>
        <Text style={[styles.pillText, { color: item.statusColor }]}>
          {item.status}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: RADIUS.md,
    padding: SPACING.sm + 4,
  },
  textCol: {
    flex: 1,
    gap: 2,
  },
  category: {
    fontSize: TYPOGRAPHY.caption,
    fontWeight: "700",
    color: COLORS.text,
  },
  location: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textSecondary,
  },
  meta: {
    fontSize: TYPOGRAPHY.small,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  pill: {
    borderRadius: RADIUS.full,
    paddingVertical: 4,
    paddingHorizontal: SPACING.sm,
  },
  pillText: {
    fontSize: TYPOGRAPHY.small,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors mentioning `components/report-history/ReportHistoryCard.tsx`

- [ ] **Step 3: Commit**

```bash
git add components/report-history/ReportHistoryCard.tsx
git commit -m "feat: add ReportHistoryCard component"
```

---

### Task 2: Assemble the Report History screen

**Files:**
- Modify: `app/(tabs)/report-history.tsx` (full file, currently 15 lines — see current content below)

**Depends on:** Task 1 (`ReportHistoryCard`)

**Current content of `app/(tabs)/report-history.tsx`:**
```tsx
import { Text, View } from "react-native";

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

**Interfaces:**
- Consumes:
  - `ReportHistoryCard({ item })` (Task 1)
  - `getReportHistory(): Promise<ReportHistoryItem[]>` from `@/services/report.service` (existing)
  - `PrimaryButton({ title, onPress })` from `@/components/auth/PrimaryButton` (existing)
  - `EmptyState({ message }: { message: string })` — named export from `@/components/common/EmptyState` (existing)
- Produces: the default-exported `ReportHistoryScreen` component rendered by `app/(tabs)/_layout.tsx`'s `Tabs.Screen name="report-history"` — no props (it's a route).

- [ ] **Step 1: Replace the file contents**

```tsx
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import PrimaryButton from "@/components/auth/PrimaryButton";
import { EmptyState } from "@/components/common/EmptyState";
import ReportHistoryCard from "@/components/report-history/ReportHistoryCard";
import { getReportHistory, type ReportHistoryItem } from "@/services/report.service";
import { COLORS, SPACING, TYPOGRAPHY } from "@/theme";

export default function ReportHistoryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reports, setReports] = useState<ReportHistoryItem[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    getReportHistory()
      .then((history) => setReports(history))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + SPACING.sm, paddingBottom: SPACING.xl },
      ]}
    >
      <View style={styles.section}>
        <Text style={styles.title}>Report History</Text>
        <Text style={styles.subtitle}>Track the status of what you've reported</Text>
      </View>

      <PrimaryButton
        title="+ New Report"
        onPress={() => router.push("/(tabs)/report")}
      />

      {loaded && reports.length === 0 ? (
        <EmptyState message="You haven't submitted any reports yet." />
      ) : (
        <View style={styles.list}>
          {reports.map((item) => (
            <ReportHistoryCard key={item.id} item={item} />
          ))}
        </View>
      )}
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
  list: {
    gap: SPACING.sm,
  },
});
```

- [ ] **Step 2: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add "app/(tabs)/report-history.tsx"
git commit -m "feat: assemble Report History screen from ReportHistoryCard"
```

- [ ] **Step 4: Manual verification**

Run: `npm run web` (or `npx expo start --web`), log in (or use an existing session), and navigate to the Report History tab.

Walk through the full checklist from the design spec's Testing section:
- The 3 mock reports render: Flood/Barangay Poblacion/Jul 20, 2026 · RQ-20487/green "Resolved" pill; Road Accident/Cordova Public Market Rd./Jul 15, 2026 · RQ-20411/amber "Reviewing" pill; Medical Emergency/Brgy. Day-as/Jul 9, 2026 · RQ-20308/green "Resolved" pill
- Card layout matches the screenshot: bold category label, location line, small date · ref line, status pill top-right — no chevron, tapping a card does nothing
- "+ New Report" navigates to the Report tab (`(tabs)/report`); back returns to Report History
- Temporarily change `getReportHistory()` in `services/report.service.ts` to `return [];` and confirm the EmptyState message renders instead of the list, then revert the change (do not commit it)
- The tab bar still renders and functions normally on this screen

If everything above holds, the task — and the plan — is complete.
