# First-Time User Guide (Homepage Tour) — Design

Date: 2026-09-04
Status: Approved for planning

## Summary

A 5-step spotlight tour that auto-shows once, immediately after a citizen
reaches the Homepage for the first time via a fresh registration (email
Register or first-time Google sign-in). It overlays the existing Home
screen and tab bar without modifying their layout, dims the background,
spotlights one real on-screen element per step, and can be re-launched
manually from Settings ("View App Tutorial").

Flow: **Register / First-time Google Sign-in → Phone Number → Terms &
Conditions → Homepage → First-Time User Guide (overlay)**

## Trigger scope (decided)

The tour auto-shows **only** for sessions that just came through a fresh
registration or first-time Google sign-in — i.e., accounts that went
through the `needsOnboarding`/`needsTerms` gates this session. Existing
accounts (registered before this feature ships, or simply logging back in)
never see it automatically. Anyone can replay it via Settings → "View App
Tutorial", which bypasses the completion check entirely.

This is a real product-behavior fork (the alternative — show it to every
account's first-ever Home visit, including pre-existing users — was
explicitly rejected) and must not be silently changed during
implementation.

## State & persistence

### AuthContext: `isFreshAccount` flag

`context/AuthContext.tsx`'s `AuthState` gains one more boolean,
`isFreshAccount`, following the exact pattern already established for
`needsOnboarding` / `needsTerms` (single atomic `setAuthState` call so it
can never desync from `isAuthenticated`):

- Set to `needsOnboardingFlag` inside `login()`, alongside the other two.
- **Not** cleared by `completeOnboarding()` or `completeTerms()` — it must
  survive through the Phone Number and Terms steps and still read `true`
  once the user lands on Home.
- Cleared only by a new `AuthContext` method, `clearFreshAccount()`,
  called by `TourContext` once the tour is shown-and-dismissed (skip or
  finish) — see below. This prevents the tour from re-triggering on a
  second visit to Home within the same app session (e.g. switching tabs
  back and forth) after the user has already dismissed it once, even
  before the persisted-completion write resolves.
- Like its siblings, **not persisted** to `authStorage` — an app restart
  mid-flow drops it, matching the existing accepted gap for
  `needsOnboarding`/`needsTerms` (documented in `AuthContext.tsx`). Out of
  scope to fix here.

### Persisted completion record

A new key in the existing `context/authStorage.ts` SecureStore/localStorage
wrapper (reuse `getItem`/`setItem`, no new storage mechanism):

```
key: "tour_completed_users"
value: JSON.stringify({ [userId]: true, ... })
```

A map (not a single boolean) because `authStorage` already stores one
session at a time but the completion record should stay meaningful if the
storage key is ever inspected per-account; a single boolean would be
ambiguous about *which* user completed it. Read on `TourContext` mount
(and whenever the authenticated user id changes), written by `skip()` /
`finish()` (see below — both are the completion path).

## TourContext

New `context/TourContext.tsx`, provided at root (`app/_layout.tsx`) inside
`AuthProvider` (needs `useAuth()` for `user.id`, `isFreshAccount`,
`clearFreshAccount()`), sibling-level to `SosProvider`.

```ts
type TourContextValue = {
  isVisible: boolean;
  currentStep: number; // 0-4
  steps: TourStepConfig[]; // static, defined in this file
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
  startManualTour: () => void; // Settings entry point
  notifyHomeReady: () => void; // called once by home.tsx on mount; evaluates auto-show
  registerTarget: (id: TourTargetId, ref: React.RefObject<View>) => void;
  unregisterTarget: (id: TourTargetId) => void;
};
```

Behavior:

- On mount / whenever `user` changes: load the persisted completion map,
  compute `hasCompleted = !!map[user.id]`.
- `notifyHomeReady()`: if `isFreshAccount && !hasCompleted && user?.role
  === "citizen"`, set `isVisible = true, currentStep = 0`. Called once by
  `home.tsx` on mount (not an internal effect in `TourContext` itself) so
  the trigger fires deterministically after Home and its anchor children
  have mounted and registered their targets — see "Mount ordering" below.
- `skip()` and `finish()` both: persist `hasCompleted = true` for the
  current user (`setItem` with the updated map), call
  `clearFreshAccount()`, set `isVisible = false`. They are the same
  completion path with different telemetry-worthy names (kept distinct in
  the API in case step-level analytics are added later — not in scope
  now).
- `next()` / `back()` clamp `currentStep` within `[0, steps.length - 1]`.
- `startManualTour()`: sets `isVisible = true, currentStep = 0`
  unconditionally (ignores `hasCompleted`). Does **not** touch
  `isFreshAccount` or the persisted map on entry — only on exit
  (skip/finish), same as the auto-triggered path, so replays still count
  as "seen" (they already were).
- `registerTarget`/`unregisterTarget`: a `Map<TourTargetId,
  RefObject<View>>` in a ref (not state — registration churn on every
  Home mount/unmount shouldn't cause re-renders of the whole tree).

### Mount ordering / triggering Home's effect

`app/(tabs)/home.tsx` adds one `useEffect(() => { tour.notifyHomeReady();
}, [])` on mount, called after its own render (and its children's, per
React's effect-timing guarantees) so the anchor components below have
already registered their targets by the time `notifyHomeReady()` runs.

## Target registry & anchors

`TourTargetId = "sos" | "alerts" | "evacuation" | "profile"` (step 0,
"Welcome", has no target — full-screen centered card, no spotlight cutout).

Each anchor wraps its **existing** root element with a `ref` and registers
it — no visual or layout change, pure instrumentation:

| Step | Target id | Component | Ref attaches to |
|---|---|---|---|
| 1 Welcome | — | — | — (centered card only) |
| 2 Emergency Request | `sos` | `app/(tabs)/home.tsx` | the `sosSection` wrapping `View` around `<SOSButton />` |
| 3 Alerts & Advisories | `alerts` | `components/home/AdvisoryBanner.tsx` | the root `card` `View` |
| 4 Evacuation Centers & Map | `evacuation` | `components/home/HomeActionList.tsx` | the root `card` `View` (whole card, **not** the conditionally-rendered nearest-center row — robust to `nearestCenter` still being `null`/loading on first render) |
| 5 Profile & Settings | `profile` | `components/tabs/TabBar.tsx` | the Profile tab's `TouchableOpacity` (the existing `RIGHT_TABS` entry with `name: "profile"`) |

Registration happens in a `useEffect(() => { registerTarget(id, ref);
return () => unregisterTarget(id); }, [])` in each component. Each
component takes no new props for this — it just imports `useTour()`
internally, keeping the change contained to those 4 files plus
`home.tsx`'s wrapper `View`.

## Overlay rendering

New `components/tour/FirstTimeGuideOverlay.tsx`, rendered in
`app/_layout.tsx`'s `ThemedApp`, directly after `<SosOverlay />`:

```tsx
<SosProvider>
  <RootLayoutNav />
  <SosOverlay />
  <FirstTimeGuideOverlay />
  <StatusBar .../>
</SosProvider>
```

(`TourProvider` wraps higher up, alongside `AuthProvider`/`UserProvider`,
so both `RootLayoutNav`'s tree and this overlay share the same context
instance.)

Renders `null` when `!isVisible` (cheap — no measuring, no listeners
active). When visible:

1. Reads `steps[currentStep]`, resolves its `targetId` (if any) via the
   registry, calls `measureInWindow()` on that ref.
2. Full-screen `Animated.View` backdrop using `COLORS.scrim` (already
   theme-aware).
3. An `react-native-svg` `Svg` overlay the same size as the screen, with a
   single `Path` = full-screen rect minus a rounded-rect hole at the
   measured target (evenodd fill rule) — this is what actually "dims
   everything except the target." No target (step 0) → no hole, backdrop
   is a plain dimmed `View` instead (skip the SVG entirely for that step).
4. A tooltip card (`RADIUS.lg`, `SHADOW_LG`, `COLORS.background`)
   positioned above or below the spotlight rect depending on which side
   has more room (simple heuristic: if `target.y > screenHeight / 2`,
   place above; else below). Step 0 centers the card on screen instead.
5. Tooltip contents: step title (`FONT_FAMILY.displaySemibold`), body copy
   (system font, matching `AdvisoryBanner`/`HomeActionList` body text
   sizing), a small "step X of 5" label + dot row, and the button row.
6. Buttons: `Skip` (text button, top-right of the tooltip, always
   present), `Back` (steps 2-5 only), `Next` (steps 1-4), `Finish` (step
   5, uses `PrimaryButton` styling — same visual weight as the rest of the
   app's primary CTAs).

### Animation

`react-native-reanimated` (already a dependency, used the same way in
`SOSButton`/`settings/index.tsx`):

- Backdrop opacity: `withTiming` fade in on show, fade out on
  skip/finish/unmount.
- Spotlight hole position/size: `withTiming` between steps rather than
  jump-cutting, so the cutout visibly slides/resizes to the next target.
- Tooltip: fade + slight vertical slide (`withTiming` on `opacity` +
  `translateY`) on step change, mirroring the slide transitions already
  used for screen navigation (`animation: "slide_from_right"` in the
  various `_layout.tsx` stacks) but adapted to a vertical in-place swap
  since the tooltip repositions itself, not a full-screen push.

### Copy (5 steps)

1. **Welcome to Cordova RiskQ** — "This app helps you request emergency
   assistance, receive alerts, and find evacuation information — all in
   one place."
2. **Emergency Request** — target `sos` — "Slide this button to send an
   emergency request with your live location to responders."
3. **Alerts & Advisories** — target `alerts` — "Important emergency
   announcements and safety advisories for your area show up here."
4. **Evacuation Centers & Map** — target `evacuation` — "See nearby
   evacuation centers, their status, and get directions."
5. **Profile & Settings** — target `profile` — "Update your phone number,
   manage notifications, and adjust your account settings here."

(Exact copy can be refined at implementation time; meaning/placement is
fixed by this table.)

## Settings integration

`app/settings/index.tsx`: add one `NavRow` to the existing `supportRows`
array —

```ts
{
  key: "view-tutorial",
  icon: "play-circle-outline",
  label: "View App Tutorial",
  onPress: () => {
    tour.startManualTour();
    router.push("/(tabs)/home");
  },
}
```

No new section — fits the existing "Support" card. Available to citizens
only (see Role scoping below) — the row itself can simply be omitted when
`isResponder`, consistent with how `accountRows` already branches on role
for responder-specific needs.

## Role scoping

The tour (auto and manual) is citizen-only:

- Auto-trigger: `notifyHomeReady()` no-ops unless `user.role ===
  "citizen"` (responders land on a different dashboard, `app/responder/`,
  not `(tabs)/home`, so in practice this mostly self-excludes already —
  stated explicitly for clarity and defensiveness).
- Settings: the "View App Tutorial" row only renders for citizens (see
  above) since the anchors (Profile tab, SOS slider, evacuation card) only
  exist in the citizen tab layout.

## Edge cases

- **Target not yet measured**: `measureInWindow()` is called inside a
  `requestAnimationFrame` after the step becomes active, giving the
  registered view one paint cycle to settle. If a target genuinely isn't
  registered (component unmounted / registration raced out) the overlay
  falls back to a centered card with no spotlight cutout for that step
  rather than throwing.
- **Interrupted onboarding** (app killed between registration and
  reaching Home — already an accepted gap per `AuthContext`'s existing
  comments on `needsOnboarding` not persisting): the restored session
  lands on Home with `isFreshAccount = false` (state reset on relaunch),
  so the tour simply doesn't auto-show. Consistent with the existing
  accepted behavior for the phone-number/terms gates; not a regression
  introduced here.
- **Rapid tab switching while tour is visible**: the overlay is global
  (rendered above the `Tabs` navigator), so it stays visible/interactive
  regardless of which tab is focused underneath — acceptable since
  `Skip`/`Finish` are always reachable; not attempting to lock tab
  navigation while the tour is up (no requirement to do so).
- **Dark mode**: all colors pull from `useThemeColors()` (`COLORS.scrim`,
  `COLORS.background`, etc.) — no literal color values, so it stays
  theme-aware automatically.

## Testing

- Manual: fresh Register → Phone Number → Terms → Home shows the tour
  once; relaunching the app after finishing does not show it again;
  Settings → "View App Tutorial" replays it; regular login by a
  pre-existing account never auto-shows it.
- Manual: first-time Google sign-in follows the same trigger path
  (`isFreshAccount` set the same way via `login()`'s existing
  `needsOnboardingFlag` param).
- Manual: verify each of the 4 spotlighted targets visually lines up with
  the real element in both light and dark themes, and that `Skip`/`Back`/
  `Next`/`Finish` all behave correctly at the boundary steps (no `Back` on
  step 1, no `Next` on step 5).
- No new automated test infrastructure exists in this repo for screens
  (no test files found under `app/` or `components/`), so this stays
  manual verification, consistent with how other UI features in this
  codebase have been verified.

## Files touched

- `context/AuthContext.tsx` — add `isFreshAccount` + `clearFreshAccount()`
- `context/authStorage.ts` — no changes (reused as-is)
- `context/TourContext.tsx` — new
- `components/tour/FirstTimeGuideOverlay.tsx` — new
- `components/tour/` — possible small sub-components (tooltip, spotlight
  SVG) if `FirstTimeGuideOverlay.tsx` grows too large
- `app/_layout.tsx` — mount `TourProvider` + `<FirstTimeGuideOverlay />`
- `app/(tabs)/home.tsx` — wrap SOS section with a registered ref, call
  `notifyHomeReady()`
- `components/home/AdvisoryBanner.tsx` — register ref
- `components/home/HomeActionList.tsx` — register ref
- `components/tabs/TabBar.tsx` — register ref on Profile tab
- `app/settings/index.tsx` — add "View App Tutorial" row
