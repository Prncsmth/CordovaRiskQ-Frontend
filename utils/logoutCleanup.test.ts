import { runLogoutCleanup } from "./logoutCleanup";

const never = () => new Promise<void>(() => {});

describe("runLogoutCleanup", () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it("confirms Off Duty only when the duty update succeeds", async () => {
    const setOffDuty = jest.fn().mockResolvedValue(undefined);
    const unregisterPush = jest.fn().mockResolvedValue(undefined);

    const result = await runLogoutCleanup({ unregisterPush, setOffDuty, timeoutMs: 1000 });

    expect(setOffDuty).toHaveBeenCalledTimes(1);
    expect(unregisterPush).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ pushUnregistered: true, offDutyConfirmed: true });
  });

  it("does not confirm Off Duty when the duty update fails, and still unregisters push", async () => {
    const setOffDuty = jest.fn().mockRejectedValue(new Error("Network request failed"));
    const unregisterPush = jest.fn().mockResolvedValue(undefined);

    const result = await runLogoutCleanup({ unregisterPush, setOffDuty, timeoutMs: 1000 });

    expect(result).toEqual({ pushUnregistered: true, offDutyConfirmed: false });
  });

  it("never throws when both requests fail", async () => {
    const result = await runLogoutCleanup({
      unregisterPush: jest.fn().mockRejectedValue(new Error("500")),
      setOffDuty: jest.fn().mockRejectedValue(new Error("500")),
      timeoutMs: 1000,
    });

    expect(result).toEqual({ pushUnregistered: false, offDutyConfirmed: false });
  });

  it("gives up after the timeout when the server never answers", async () => {
    jest.useFakeTimers();
    const pending = runLogoutCleanup({
      unregisterPush: never,
      setOffDuty: never,
      timeoutMs: 4000,
    });

    // Both requests run side by side, so one timeout bounds the whole wait.
    jest.advanceTimersByTime(4000);

    await expect(pending).resolves.toEqual({
      pushUnregistered: false,
      offDutyConfirmed: false,
    });
  });

  it("skips the duty update when there's nothing to switch off (citizen or already Off Duty)", async () => {
    const unregisterPush = jest.fn().mockResolvedValue(undefined);

    const result = await runLogoutCleanup({ unregisterPush, timeoutMs: 1000 });

    expect(unregisterPush).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ pushUnregistered: true, offDutyConfirmed: false });
  });

  it("starts both requests before either finishes, while the token is still valid", async () => {
    const order: string[] = [];
    await runLogoutCleanup({
      setOffDuty: async () => {
        order.push("duty:start");
        await Promise.resolve();
        order.push("duty:end");
      },
      unregisterPush: async () => {
        order.push("push:start");
        await Promise.resolve();
        order.push("push:end");
      },
      timeoutMs: 1000,
    });

    expect(order.slice(0, 2).sort()).toEqual(["duty:start", "push:start"]);
  });
});
