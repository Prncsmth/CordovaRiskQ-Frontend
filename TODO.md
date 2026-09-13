# TODO

## Bugs

- [x] Responder dashboard: no "all caught up" empty state when online with zero nearby incidents (just blank space under filter bar)
- [x] Responder dashboard: no first-load spinner — looks identical to "no incidents" while still loading
- [x] Responder dashboard: no error/retry UI when the first incident fetch fails (silently swallowed)
- [x] Responder incident detail ([id].tsx): "Incident not found" shown for both a real 404 and a network failure — no retry
- [x] Responder incident detail ([id].tsx): loading spinner has no back button, traps user if the fetch hangs
- [x] Responder incident detail ([id].tsx): handleJoin's error path calls router.back() immediately after Alert.alert(), popping the screen before the user dismisses the alert
- [x] Responder flow: no way to mark an incident "completed" once arrived — only "Back to Home" (leaves it open) or "Cancel Incident" (destructive)
- [x] Responder navigate.tsx: "Location data unavailable" fallback covers both still-loading and permanently-failed with no retry
- [x] Responder LobbyView: setTimeout resetting "rung" has no cleanup — setState-after-unmount warning if user navigates away within 2.5s
- [x] Notifications screen: unread-notification fetch failure is silently swallowed (`getNotifications(...).catch(() => {})`) and renders identically to "zero notifications" — no error/retry state, so a failed fetch looks like an empty inbox
- [x] Home screen: bell-dot fetch failure is silently swallowed — accepted as-is (passive badge, no natural place for error UI); mitigated by the 12s poll below self-healing a transient failure, documented with a comment in home.tsx
- [x] Report History (report-history.tsx): report-fetch failure is swallowed (`.catch(() => {})`) and shows the same "No reports yet" EmptyState as a genuine zero-reports case — no retry, no way to tell failure from empty
- [x] Report Detail ([id].tsx) + report.service.ts's getReportDetailById: catches both a real 404 and a network/server failure into the same `undefined`, so the screen always shows a generic "Report not found" with no retry — same conflation bug already fixed on the responder incident-detail screen
- [x] Report Detail ([id].tsx): loading spinner has no back button, traps the user if the fetch hangs (same gap already fixed on the responder incident-detail screen)
- [x] Evacuation Detail navigate.tsx: "Location data unavailable." fallback covers both still-loading and permission-denied/failed location with no retry action — same class of bug already fixed on the responder Navigate screen
- [x] Login screen (app/(auth)/login.tsx): catch block discards the real error and always shows "Login failed. Please check your credentials and try again.", even for a network/server outage — conflates wrong-password with connectivity failure, unlike register.tsx/forgot-password.tsx which both surface `err.message`
- [x] SosOverlay ActiveView: shows a hardcoded "Estimated arrival: ~8 mins" regardless of the real responder distance or assignment — `SosAlert` carries no ETA field from the backend, so the number is always fabricated
- [x] Profile screen + Settings screen: "Push Notification(s)" toggle is plain local `useState(true)` on both screens, never persisted and never wired to push.service.ts/the backend — flipping it does nothing, and the two screens keep independent, out-of-sync toggle state for the same setting

## Features

- [x] Accessibility labels/roles for icon-only buttons across responder screens (notification bell, settings, logout, locate, close)
- [x] Responder dashboard: refresh unread-notification dot on the same poll interval as incidents, not just on screen focus
- [x] components/common/BackButton.tsx (used across ~15 citizen screens — settings, faqs, contacts, contact-support, notifications, report-detail, evacuation-detail, user-profile, report.tsx, register/forgot-password): icon-only button has no accessibilityLabel/accessibilityRole
- [x] HomeHeader.tsx: notification bell icon-only button has no accessibilityLabel/accessibilityRole
- [x] ProfileHeader.tsx: logout icon-only button has no accessibilityLabel/accessibilityRole
- [x] ProfileAvatarEdit.tsx: camera-badge icon-only Pressable has no accessibilityLabel/accessibilityRole
- [x] Home screen: unread-notification dot only refreshes via `useFocusEffect` (on tab focus), with no polling while the user stays on the Home tab, so it can go stale mid-session — same parity gap already fixed for the responder dashboard's indicators
- [x] User Profile screen: load-failure state only says "go back and try again" with no in-place Retry button, unlike other screens that let you retry without leaving

## Cleanup

- [x] Responder dashboard: remove or wire up dead styles (dutyPillOnline/dutyTextOnline, statCardDark/statValueDark/statLabelDark)
- [x] Responder OnTheWayView + navigate.tsx duplicate almost the same live map/bottom-sheet implementation — consider sharing one component
- [x] SosOverlay's ConfirmView/VerifyingView and GeofenceBlockedModal duplicate nearly identical backdrop/dialog markup and styles (backdrop, dialog, dialogIcon, dialogTitle, dialogMessage, dialogActions, dialogButton, dialogButtonSecondary/Primary) — candidate to extract into one shared Dialog component
