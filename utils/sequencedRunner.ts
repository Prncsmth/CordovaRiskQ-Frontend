// utils/sequencedRunner.ts
// Prevents a stale async response from overwriting state a newer dispatch
// already applied. Each call to run() invalidates every call before it the
// instant it's dispatched -- not just once a response arrives -- so "is
// this response still wanted" stays correct even when an earlier dispatch's
// promise settles after a later one's. That's the exact shape of the
// announcement race: a delete-triggered refetch and a create-triggered
// refetch fired close together, with no guarantee either resolves first.
//
// Pure -- no React, no timers of its own -- so the actual "which response
// wins" behavior is unit-tested directly (sequencedRunner.test.ts) with
// manually-controlled promises, instead of only being exercised indirectly
// through a rendered component and real async timing.
export function createSequencedRunner<T>() {
  let latestSeq = 0;

  function run(
    fetcher: () => Promise<T>,
    onSuccess: (result: T) => void,
    onError?: (error: unknown) => void,
  ): void {
    const mySeq = ++latestSeq;
    fetcher()
      .then((result) => {
        if (mySeq === latestSeq) onSuccess(result);
      })
      .catch((error) => {
        if (mySeq === latestSeq) onError?.(error);
      });
  }

  return { run };
}

export type SequencedRunner<T> = ReturnType<typeof createSequencedRunner<T>>;
