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

## Features

- [ ] Accessibility labels/roles for icon-only buttons across responder screens (notification bell, settings, logout, locate, close)
- [ ] Responder dashboard: refresh unread-notification dot on the same poll interval as incidents, not just on screen focus

## Cleanup

- [ ] Responder dashboard: remove or wire up dead styles (dutyPillOnline/dutyTextOnline, statCardDark/statValueDark/statLabelDark)
- [ ] Responder OnTheWayView + navigate.tsx duplicate almost the same live map/bottom-sheet implementation — consider sharing one component
