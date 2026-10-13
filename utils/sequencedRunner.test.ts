import { createSequencedRunner } from "./sequencedRunner";

// Lets a test control exactly when a fetch "resolves", independent of when
// it was dispatched -- the only way to deterministically simulate
// responses arriving out of dispatch order.
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("sequencedRunner", () => {
  it("a normal in-order delete-then-create: the later (create) dispatch's result is what's shown", async () => {
    const runner = createSequencedRunner<string | null>();
    const results: (string | null)[] = [];

    const deleteTriggered = createDeferred<string | null>();
    runner.run(() => deleteTriggered.promise, (r) => results.push(r));
    deleteTriggered.resolve(null); // the delete's refetch found nothing current
    await Promise.resolve();

    const createTriggered = createDeferred<string | null>();
    runner.run(() => createTriggered.promise, (r) => results.push(r));
    createTriggered.resolve("New Announcement");
    await Promise.resolve();

    expect(results).toEqual([null, "New Announcement"]);
  });

  it("responses arriving in reverse order: a stale delete-triggered response arriving AFTER a newer create-triggered one is ignored", async () => {
    const runner = createSequencedRunner<string | null>();
    const applied: (string | null)[] = [];

    const deleteTriggered = createDeferred<string | null>();
    runner.run(() => deleteTriggered.promise, (r) => applied.push(r));

    const createTriggered = createDeferred<string | null>();
    runner.run(() => createTriggered.promise, (r) => applied.push(r));

    // Resolve the LATER-dispatched (create) request FIRST, then the
    // EARLIER-dispatched (delete) one -- the exact out-of-order arrival
    // this fix exists for.
    createTriggered.resolve("New Announcement");
    await Promise.resolve();
    deleteTriggered.resolve(null);
    await Promise.resolve();

    // Only the create's result was ever applied -- the delete's late,
    // stale response never overwrote it back to null.
    expect(applied).toEqual(["New Announcement"]);
  });

  it("a stale empty response arriving after a newer valid response does not erase the valid announcement", async () => {
    const runner = createSequencedRunner<string | null>();
    const applied: (string | null)[] = [];

    const staleEmpty = createDeferred<string | null>();
    runner.run(() => staleEmpty.promise, (r) => applied.push(r));

    const newerValid = createDeferred<string | null>();
    runner.run(() => newerValid.promise, (r) => applied.push(r));

    newerValid.resolve("HAZE ALERT!");
    await Promise.resolve();
    staleEmpty.resolve(null); // arrives late -- must be dropped
    await Promise.resolve();

    expect(applied).toEqual(["HAZE ALERT!"]);
  });

  it("a stale valid response arriving after a newer empty response does not restore a deleted announcement", async () => {
    const runner = createSequencedRunner<string | null>();
    const applied: (string | null)[] = [];

    const staleValid = createDeferred<string | null>();
    runner.run(() => staleValid.promise, (r) => applied.push(r));

    const newerEmpty = createDeferred<string | null>();
    runner.run(() => newerEmpty.promise, (r) => applied.push(r));

    newerEmpty.resolve(null); // the newer fetch correctly found nothing current
    await Promise.resolve();
    staleValid.resolve("HAZE ALERT!"); // arrives late -- must be dropped
    await Promise.resolve();

    expect(applied).toEqual([null]);
  });

  it("a stale failed request does not report an error once a newer request has already succeeded", async () => {
    const runner = createSequencedRunner<string | null>();
    const applied: (string | null)[] = [];
    const errors: unknown[] = [];

    const staleFailing = createDeferred<string | null>();
    runner.run(
      () => staleFailing.promise,
      (r) => applied.push(r),
      (e) => errors.push(e),
    );

    const newerSucceeding = createDeferred<string | null>();
    runner.run(
      () => newerSucceeding.promise,
      (r) => applied.push(r),
      (e) => errors.push(e),
    );

    newerSucceeding.resolve("HAZE ALERT!");
    await Promise.resolve();
    staleFailing.reject(new Error("network error"));
    // Let the rejection's microtask settle without an unhandled-rejection
    // complaint -- .catch is attached inside run() itself.
    await Promise.resolve().catch(() => {});

    expect(applied).toEqual(["HAZE ALERT!"]);
    expect(errors).toEqual([]);
  });

  it("the latest request's own failure is still reported", async () => {
    const runner = createSequencedRunner<string | null>();
    const applied: (string | null)[] = [];
    const errors: unknown[] = [];

    const failure = new Error("network error");
    const deferred = createDeferred<string | null>();
    runner.run(
      () => deferred.promise,
      (r) => applied.push(r),
      (e) => errors.push(e),
    );
    deferred.reject(failure);
    await Promise.resolve().catch(() => {});

    expect(applied).toEqual([]);
    expect(errors).toEqual([failure]);
  });

  it("three overlapping dispatches: only the last one's result is ever applied, whatever order they resolve in", async () => {
    const runner = createSequencedRunner<number>();
    const applied: number[] = [];

    const first = createDeferred<number>();
    const second = createDeferred<number>();
    const third = createDeferred<number>();
    runner.run(() => first.promise, (r) => applied.push(r));
    runner.run(() => second.promise, (r) => applied.push(r));
    runner.run(() => third.promise, (r) => applied.push(r));

    // Resolve out of dispatch order: second, then first, then third.
    second.resolve(2);
    await Promise.resolve();
    first.resolve(1);
    await Promise.resolve();
    third.resolve(3);
    await Promise.resolve();

    expect(applied).toEqual([3]);
  });
});
