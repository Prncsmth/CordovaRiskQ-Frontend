// hooks/useSequencedFetch.ts
import { useState } from "react";

import { createSequencedRunner } from "@/utils/sequencedRunner";

// Thin React wrapper around sequencedRunner.ts's actual race-prevention
// logic (see that file for the behavior and its tests). Lazy useState
// initializer instead of a ref -- React calls it exactly once on mount, so
// one runner instance persists for the component's lifetime without ever
// reading a ref during render (flagged by this project's react-hooks/refs
// lint rule) and without the setter ever being called, so its identity
// stays stable like a ref's would. Every trigger that calls the returned
// function (initial load, a live create/delete event, pull to refresh,
// screen focus, ...) shares this one instance, so they can't race each
// other: whichever dispatch happened last wins, regardless of which
// response arrives first.
export function useSequencedFetch<T>() {
  const [runner] = useState(() => createSequencedRunner<T>());
  return runner.run;
}
