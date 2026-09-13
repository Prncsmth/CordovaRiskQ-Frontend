# Report Photo Evidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock "Add Photo" toggle on the report screen with a real camera/gallery picker, an immediate preview, and an upload that's verified before the report is submitted — never letting a failed upload create a report that falsely claims photo evidence.

**Architecture:** `PhotoPicker` becomes a controlled component holding no photo state itself — it emits a `SelectedPhoto { uri, fileName }` via `onSelect`/`onRemove`, and the parent screen (`report.tsx`) owns that state. Submission gates on a new `verifyPhotoExists` + `uploadReportPhoto` pair in `report.service.ts`; only a successful upload attaches `photoUrl` to the `createReport` payload.

**Tech Stack:** React Native, Expo SDK 57, `expo-image-picker` (already installed), `expo-file-system` (new), Jest for service-layer unit tests.

**Spec:** `docs/superpowers/specs/2026-09-12-report-photo-evidence-design.md`

## Global Constraints

- Reports must still submit successfully with no photo attached — the entire upload path is skipped when `photo` is `null`.
- Action sheet button copy is exactly "Take Photo" and "Choose from Gallery".
- Preview-state button copy is exactly "Change Photo" and "Remove Photo".
- Cancelling the camera/gallery picker must leave existing state (photo attached or not) completely unchanged.
- On upload or file-existence failure, submission stops before `createReport` is called, and the alert shown is exactly: title `"Photo upload failed"`, message `"Please try again or remove the photo."`.
- `photoUrl` is attached to the `createReport` payload only after a successful upload — never speculatively.
- Backend contract for `/api/incidents/photo` is an assumption pending confirmation (see spec's "Open dependency" section) — isolate all wire-format knowledge to `services/report.service.ts`.

---

### Task 1: Report-photo service layer

**Files:**
- Modify: `services/report.service.ts`
- Test: `services/report.service.test.ts` (new file)

**Interfaces:**
- Consumes: `API_BASE_URL` from `services/api.ts` (existing export).
- Produces:
  - `photoFileExists(uri: string): boolean`
  - `uploadReportPhoto(token: string, uri: string, fileName: string): Promise<{ photoUrl: string }>` — throws on any non-2xx response or network failure.
  - `createReport`'s payload type gains `photoUrl?: string`, forwarded unchanged into the existing `apiPost` call.

- [ ] **Step 1: Install expo-file-system**

Run: `npx expo install expo-file-system`

This adds the SDK-57-matched version to `package.json`/`package-lock.json` (or yarn/pnpm lockfile, whichever this repo uses).

- [ ] **Step 2: Write the failing tests**

Create `services/report.service.test.ts`:

```typescript
jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    exists: uri === "file:///exists.jpg",
  })),
}));

import { File } from "expo-file-system";

import { photoFileExists, uploadReportPhoto } from "./report.service";

describe("photoFileExists", () => {
  afterEach(() => {
    (File as jest.Mock).mockImplementation((uri: string) => ({
      exists: uri === "file:///exists.jpg",
    }));
  });

  it("returns true when the file exists at the given uri", () => {
    expect(photoFileExists("file:///exists.jpg")).toBe(true);
  });

  it("returns false when no file exists at the given uri", () => {
    expect(photoFileExists("file:///missing.jpg")).toBe(false);
  });

  it("returns false if the File constructor throws", () => {
    (File as jest.Mock).mockImplementationOnce(() => {
      throw new Error("invalid uri");
    });

    expect(photoFileExists("not-a-uri")).toBe(false);
  });
});

describe("uploadReportPhoto", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it("returns the photoUrl on a successful upload", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        photoUrl: "https://cdn.example.com/photo.jpg",
      }),
    }) as unknown as typeof fetch;

    const result = await uploadReportPhoto(
      "token123",
      "file:///exists.jpg",
      "photo.jpg",
    );

    expect(result).toEqual({ photoUrl: "https://cdn.example.com/photo.jpg" });
  });

  it("throws when the server responds with a non-ok status", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    await expect(
      uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg"),
    ).rejects.toThrow();
  });

  it("propagates a network failure", async () => {
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network request failed"));

    await expect(
      uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg"),
    ).rejects.toThrow("Network request failed");
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx jest services/report.service.test.ts`
Expected: FAIL — `photoFileExists` and `uploadReportPhoto` are not exported from `./report.service`.

- [ ] **Step 4: Implement the service functions**

In `services/report.service.ts`, add the import at the top (alongside the existing imports):

```typescript
import { File } from "expo-file-system";

import { API_BASE_URL, apiGet, apiPost } from "./api";
```

(Replace the existing `import { apiGet, apiPost } from "./api";` line with the one above, adding `API_BASE_URL`.)

Add these functions above `export async function createReport(`:

```typescript
export function photoFileExists(uri: string): boolean {
  try {
    return new File(uri).exists;
  } catch {
    return false;
  }
}

function guessPhotoMimeType(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

// Contract assumed pending backend confirmation — see
// docs/superpowers/specs/2026-09-12-report-photo-evidence-design.md.
// Until the backend implements this route, calls here fail (404/network
// error), which correctly drives the "upload failed" UI path rather than
// silently pretending success.
export async function uploadReportPhoto(
  token: string,
  uri: string,
  fileName: string,
): Promise<{ photoUrl: string }> {
  const formData = new FormData();
  formData.append("photo", {
    uri,
    name: fileName,
    type: guessPhotoMimeType(fileName),
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/api/incidents/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Photo upload failed with status ${response.status}`);
  }

  const data = (await response.json()) as { success: true; photoUrl: string };
  return { photoUrl: data.photoUrl };
}
```

Then update `createReport`'s payload type to add the optional field (this is the only change to the existing function — the body already forwards whatever payload it's given, so no other line changes):

```typescript
export async function createReport(
  token: string,
  payload: {
    category: CategoryId;
    details: string;
    locationLabel: string;
    latitude: number;
    longitude: number;
    reporterLatitude: number;
    reporterLongitude: number;
    photoUrl?: string;
  },
) {
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx jest services/report.service.test.ts`
Expected: PASS (all 6 tests).

- [ ] **Step 6: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 7: Lint**

Run: `npx eslint services/report.service.ts`
Expected: no errors.

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json services/report.service.ts services/report.service.test.ts
git commit -m "feat: add photo-evidence upload service functions"
```

(Adjust the lockfile filename if this repo uses `yarn.lock` or `pnpm-lock.yaml` instead.)

---

### Task 2: Real photo capture in PhotoPicker

**Files:**
- Modify: `components/report/PhotoPicker.tsx`

**Interfaces:**
- Consumes: nothing from Task 1.
- Produces:
  - `export type SelectedPhoto = { uri: string; fileName: string }`
  - `PhotoPickerProps = { photo: SelectedPhoto | null; onSelect: (photo: SelectedPhoto) => void; onRemove: () => void }` — consumed by Task 3.

No test file: this repo has no React Native component-testing setup (no `.test.tsx` files, no `@testing-library/react-native` dependency), and no sibling component in `components/report/` has one either. Verify this task via the manual QA steps at the end instead.

- [ ] **Step 1: Rewrite the component**

Replace the entire contents of `components/report/PhotoPicker.tsx`:

```tsx
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { RADIUS, SHADOW, SPACING, TYPOGRAPHY, useThemeColors, type ColorPalette } from "@/theme";

export type SelectedPhoto = {
  uri: string;
  fileName: string;
};

type PhotoPickerProps = {
  photo: SelectedPhoto | null;
  onSelect: (photo: SelectedPhoto) => void;
  onRemove: () => void;
};

function fileNameFromAsset(asset: ImagePicker.ImagePickerAsset): string {
  if (asset.fileName) return asset.fileName;
  const fromUri = asset.uri.split("/").pop();
  return fromUri && fromUri.length > 0 ? fromUri : "photo.jpg";
}

async function pickFromCamera(): Promise<SelectedPhoto | null> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Camera access needed",
      "Allow camera access in your device settings to take a photo.",
    );
    return null;
  }

  const result = await ImagePicker.launchCameraAsync({
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    fileName: fileNameFromAsset(result.assets[0]),
  };
}

async function pickFromGallery(): Promise<SelectedPhoto | null> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    Alert.alert(
      "Photo access needed",
      "Allow photo library access in your device settings to choose a photo.",
    );
    return null;
  }

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: true,
    quality: 0.8,
  });

  if (result.canceled || !result.assets[0]) return null;
  return {
    uri: result.assets[0].uri,
    fileName: fileNameFromAsset(result.assets[0]),
  };
}

export default function PhotoPicker({ photo, onSelect, onRemove }: PhotoPickerProps) {
  const COLORS = useThemeColors();
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  function openPickerSheet() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Add Photo", undefined, [
      {
        text: "Take Photo",
        onPress: async () => {
          const picked = await pickFromCamera();
          if (picked) onSelect(picked);
        },
      },
      {
        text: "Choose from Gallery",
        onPress: async () => {
          const picked = await pickFromGallery();
          if (picked) onSelect(picked);
        },
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  if (photo) {
    return (
      <View style={styles.previewWrap}>
        <Image source={{ uri: photo.uri }} style={styles.previewThumb} />
        <View style={styles.previewInfo}>
          <Text style={styles.previewFileName} numberOfLines={1}>
            {photo.fileName}
          </Text>
          <View style={styles.previewActions}>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openPickerSheet();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="camera-outline" size={14} color={COLORS.tide} />
              <Text style={[styles.actionButtonText, { color: COLORS.tide }]}>
                Change Photo
              </Text>
            </Pressable>
            <Pressable
              style={styles.actionButton}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onRemove();
              }}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            >
              <Ionicons name="trash-outline" size={14} color={COLORS.danger} />
              <Text style={[styles.actionButtonText, { color: COLORS.danger }]}>
                Remove Photo
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        style={styles.emptyBox}
        onPress={openPickerSheet}
        onPressIn={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutable by design
          scale.value = withTiming(0.98, { duration: 100 });
        }}
        onPressOut={() => {
          // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value, mutable by design
          scale.value = withTiming(1, { duration: 100 });
        }}
      >
        <LinearGradient
          colors={COLORS.iconTileGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.emptyIcon}
        >
          <Ionicons name="camera" size={22} color={COLORS.primary} />
        </LinearGradient>
        <Text style={styles.emptyLabel}>Add Photo</Text>
        <Text style={styles.emptyHint}>Tap to attach evidence</Text>
      </Pressable>
    </Animated.View>
  );
}

function createStyles(COLORS: ColorPalette) {
  return StyleSheet.create({
    emptyBox: {
      height: 130,
      backgroundColor: COLORS.background,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderStyle: "dashed",
      borderRadius: RADIUS.lg,
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
    },
    emptyIcon: {
      width: 44,
      height: 44,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.primaryLight,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: SPACING.xs,
      shadowColor: COLORS.primary,
      shadowOpacity: 0.08,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    emptyLabel: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    emptyHint: {
      fontSize: TYPOGRAPHY.small,
      color: COLORS.textTertiary,
    },
    previewWrap: {
      flexDirection: "row",
      gap: SPACING.md,
      padding: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: COLORS.border,
      backgroundColor: COLORS.background,
      ...SHADOW,
    },
    previewThumb: {
      width: 84,
      height: 84,
      borderRadius: RADIUS.md,
      backgroundColor: COLORS.surface,
    },
    previewInfo: {
      flex: 1,
      justifyContent: "center",
      gap: SPACING.xs,
    },
    previewFileName: {
      fontSize: TYPOGRAPHY.caption,
      fontWeight: "700",
      color: COLORS.text,
    },
    previewActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: SPACING.sm,
    },
    actionButton: {
      flexDirection: "row",
      alignItems: "center",
      gap: 4,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      borderColor: COLORS.borderMuted,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 6,
    },
    actionButtonText: {
      fontSize: TYPOGRAPHY.small,
      fontWeight: "700",
    },
  });
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors. (Task 3 hasn't updated `report.tsx`'s usage yet, so this step will show a type error there until Task 3 is done — that's expected; confirm the error is confined to `app/(tabs)/report.tsx`'s `PhotoPicker` usage, not inside `PhotoPicker.tsx` itself.)

- [ ] **Step 3: Lint**

Run: `npx eslint components/report/PhotoPicker.tsx`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add components/report/PhotoPicker.tsx
git commit -m "feat: real camera/gallery capture and preview in PhotoPicker"
```

---

### Task 3: Wire upload-gated submission into the report screen

**Files:**
- Modify: `app/(tabs)/report.tsx`

**Interfaces:**
- Consumes: `SelectedPhoto` type and new props from Task 2's `PhotoPicker`; `photoFileExists`, `uploadReportPhoto` from Task 1's `services/report.service.ts`.
- Produces: nothing consumed elsewhere (this is the screen's own submit flow).

No test file: `app/(tabs)/report.tsx` has no existing test coverage (screen-level logic in this repo isn't unit-tested — only pure `services/`/`utils/` functions are). Verify via the manual QA checklist below.

- [ ] **Step 1: Update imports and state**

In `app/(tabs)/report.tsx`, change the `PhotoPicker` import to also pull the type:

```typescript
import PhotoPicker, { type SelectedPhoto } from "@/components/report/PhotoPicker";
```

Change the `createReport` import line to also pull the new service functions:

```typescript
import { createReport, photoFileExists, uploadReportPhoto } from "@/services/report.service";
```

Replace the `photoAttached` state declaration:

```typescript
const [photoAttached, setPhotoAttached] = useState(false);
```

with:

```typescript
const [photo, setPhoto] = useState<SelectedPhoto | null>(null);
```

Widen the `submitPhase` state type to add the new phase:

```typescript
const [submitPhase, setSubmitPhase] = useState<"idle" | "locating" | "uploading-photo" | "submitting">("idle");
```

- [ ] **Step 2: Gate submission on the photo upload**

In `handleSubmit`, the current code goes straight from the geofence checks into:

```typescript
      setSubmitPhase("submitting");
      try {
        const submitResult = await createReport(token, {
          category,
          details,
          locationLabel: activeLocation.address,
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          reporterLatitude: result.coords.latitude,
          reporterLongitude: result.coords.longitude,
        });
```

Replace that block with:

```typescript
      let photoUrl: string | undefined;
      if (photo) {
        setSubmitPhase("uploading-photo");
        if (!photoFileExists(photo.uri)) {
          setSubmitPhase("idle");
          Alert.alert("Photo upload failed", "Please try again or remove the photo.");
          return;
        }
        try {
          const uploaded = await uploadReportPhoto(token, photo.uri, photo.fileName);
          photoUrl = uploaded.photoUrl;
        } catch {
          setSubmitPhase("idle");
          Alert.alert("Photo upload failed", "Please try again or remove the photo.");
          return;
        }
      }

      setSubmitPhase("submitting");
      try {
        const submitResult = await createReport(token, {
          category,
          details,
          locationLabel: activeLocation.address,
          latitude: activeLocation.latitude,
          longitude: activeLocation.longitude,
          reporterLatitude: result.coords.latitude,
          reporterLongitude: result.coords.longitude,
          photoUrl,
        });
```

(Everything after this — the `router.push(...)`, the `catch`/`finally` blocks — stays exactly as it is today; only the block above it changes.)

- [ ] **Step 3: Show the uploading caption**

Find this block, which renders the "locating" caption above the submit button:

```tsx
          {submitPhase === "locating" && (
            <Text style={styles.locatingCaption}>Getting your accurate location...</Text>
          )}
```

Replace it with:

```tsx
          {submitPhase === "locating" && (
            <Text style={styles.locatingCaption}>Getting your accurate location...</Text>
          )}
          {submitPhase === "uploading-photo" && (
            <Text style={styles.locatingCaption}>Uploading photo...</Text>
          )}
```

- [ ] **Step 4: Wire the new PhotoPicker props**

Replace:

```tsx
          <PhotoPicker
            attached={photoAttached}
            onToggle={() => setPhotoAttached((value) => !value)}
          />
```

with:

```tsx
          <PhotoPicker
            photo={photo}
            onSelect={setPhoto}
            onRemove={() => setPhoto(null)}
          />
```

- [ ] **Step 5: Typecheck**

Run: `npx tsc --noEmit`
Expected: PASS, no errors (this resolves the expected Task 2 type error since `report.tsx` now matches the new `PhotoPicker` props).

- [ ] **Step 6: Lint**

Run: `npx eslint "app/(tabs)/report.tsx"`
Expected: no errors.

- [ ] **Step 7: Manual QA in a running app**

Run: `npx expo start` (dev client or simulator — camera doesn't work in Expo Go's JS-only web preview, use a device/simulator build).

Walk through each acceptance criterion on the Report screen:

1. Tap "Add Photo" → confirm the sheet shows exactly "Take Photo" / "Choose from Gallery" / "Cancel".
2. Pick a photo (either path) → confirm an immediate preview (thumbnail + file name) appears, and the box is replaced by "Change Photo" / "Remove Photo".
3. Open the sheet again and tap Cancel (or press outside a picker to dismiss it on iOS) → confirm the previously-attached photo (or empty state) is unchanged.
4. Tap "Remove Photo" → confirm it reverts to the empty "Add Photo" box.
5. With no photo attached, fill in category + details and submit → confirm the report submits normally (no upload step, no spinner).
6. With a photo attached, submit → confirm the submit button shows its spinner and the "Uploading photo..." caption appears, then either:
   - the upload fails (expected today, since the backend route doesn't exist yet — see spec) and the alert reads exactly "Photo upload failed" / "Please try again or remove the photo.", with no report created and the photo still attached afterward; or
   - if a real endpoint has been wired up by this point, the report is created successfully.

- [ ] **Step 8: Commit**

```bash
git add "app/(tabs)/report.tsx"
git commit -m "feat: gate report submission on verified photo upload"
```
