import { holdScreenAwake, LIVE_TRACKING_KEEP_AWAKE_TAG, type KeepAwakeApi } from "./screenAwake";

function fakeApi() {
  let awake = false;
  const calls: string[] = [];
  const api: KeepAwakeApi = {
    activate: jest.fn(async (tag: string) => {
      calls.push(`activate:${tag}`);
      awake = true;
    }),
    deactivate: jest.fn(async (tag: string) => {
      calls.push(`deactivate:${tag}`);
      awake = false;
    }),
  };
  return { api, calls, isAwake: () => awake };
}

const flush = () => new Promise<void>((resolve) => setImmediate(() => resolve()));

describe("holdScreenAwake", () => {
  it("keeps the screen awake while tracking, with its own tag", async () => {
    const { api, isAwake, calls } = fakeApi();

    holdScreenAwake(api);
    await flush();

    expect(isAwake()).toBe(true);
    expect(calls).toEqual([`activate:${LIVE_TRACKING_KEEP_AWAKE_TAG}`]);
  });

  it("lets the screen sleep again once tracking stops", async () => {
    const { api, isAwake } = fakeApi();

    const release = holdScreenAwake(api);
    await flush();
    release();
    await flush();

    expect(isAwake()).toBe(false);
    expect(api.deactivate).toHaveBeenCalledWith(LIVE_TRACKING_KEEP_AWAKE_TAG);
  });

  it("never stays stuck awake if tracking stops before activation finished", async () => {
    const { api, isAwake } = fakeApi();

    const release = holdScreenAwake(api);
    release(); // e.g. the responder left the incident immediately
    await flush();

    expect(isAwake()).toBe(false);
  });

  it("releasing twice only deactivates once", async () => {
    const { api } = fakeApi();

    const release = holdScreenAwake(api);
    await flush();
    release();
    release();
    await flush();

    expect(api.deactivate).toHaveBeenCalledTimes(1);
  });

  it("never throws when the native keep-awake call fails", async () => {
    const api: KeepAwakeApi = {
      activate: jest.fn(async () => {
        throw new Error("unavailable");
      }),
      deactivate: jest.fn(() => {
        throw new Error("unavailable");
      }),
    };

    const release = holdScreenAwake(api);
    await flush();
    expect(() => release()).not.toThrow();
  });
});
