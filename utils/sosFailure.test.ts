import {
  SOS_SEND_TIMEOUT_MS,
  SosSendTimeoutError,
  classifySosSendError,
  mdrrmoNumber,
  sosFailureActions,
  sosFailureCopy,
  withSosSendTimeout,
} from "./sosFailure";
import { FALLBACK_HOTLINES } from "@/constants/hotlines";
import type { Hotline } from "@/services/contacts.service";

// The shared fallback's MDRRMO entry -- the same list the Contacts screen uses.
const FALLBACK_MDRRMO = FALLBACK_HOTLINES.find((h) => h.id === "mdrrmo")!.number;

const apiError = (status: number) => Object.assign(new Error(`status ${status}`), { status });

describe("classifySosSendError", () => {
  it("treats the backend's geofence rejection (403) as outside Cordova", () => {
    expect(classifySosSendError(apiError(403))).toBe("outside");
  });

  it("treats our own timeout as timed-out", () => {
    expect(classifySosSendError(new SosSendTimeoutError())).toBe("timed-out");
  });

  it("treats network and server errors as send-failed, never as a geofence block", () => {
    expect(classifySosSendError(new TypeError("Network request failed"))).toBe("send-failed");
    expect(classifySosSendError(apiError(500))).toBe("send-failed");
    expect(classifySosSendError(apiError(503))).toBe("send-failed");
    expect(classifySosSendError("weird")).toBe("send-failed");
  });
});

describe("withSosSendTimeout", () => {
  afterEach(() => jest.useRealTimers());

  it("resolves with the request's result when it finishes in time", async () => {
    await expect(withSosSendTimeout(Promise.resolve("ok"), 1000)).resolves.toBe("ok");
  });

  it("passes the request's own error through", async () => {
    await expect(withSosSendTimeout(Promise.reject(apiError(500)), 1000)).rejects.toMatchObject({
      status: 500,
    });
  });

  it("rejects with SosSendTimeoutError when the request takes too long", async () => {
    jest.useFakeTimers();
    const pending = withSosSendTimeout(new Promise(() => {}), SOS_SEND_TIMEOUT_MS);
    jest.advanceTimersByTime(SOS_SEND_TIMEOUT_MS);
    await expect(pending).rejects.toBeInstanceOf(SosSendTimeoutError);
  });

  it("clears its timer once the request settles", async () => {
    jest.useFakeTimers();
    await withSosSendTimeout(Promise.resolve("ok"), SOS_SEND_TIMEOUT_MS);
    expect(jest.getTimerCount()).toBe(0);
  });
});

describe("sosFailureCopy", () => {
  it("has its own title for each failure", () => {
    expect(sosFailureCopy("no-location").title).toBe("Couldn't Get Your Location");
    expect(sosFailureCopy("send-failed").title).toBe("Couldn't Send Your SOS");
    expect(sosFailureCopy("timed-out").title).toBe("Couldn't Send Your SOS");
    expect(sosFailureCopy("not-dispatched").title).toBe("Couldn't Send Your SOS");
  });

  it("says responders weren't notified when the SOS was saved without an incident", () => {
    expect(sosFailureCopy("not-dispatched").message).toMatch(/couldn't be notified/i);
  });

  it("warns after a timeout that the SOS may already have been received", () => {
    expect(sosFailureCopy("timed-out").message).toMatch(/may have reached/i);
    expect(sosFailureCopy("send-failed").message).not.toMatch(/may have reached/i);
  });

  it("never promises that calls always work offline", () => {
    for (const reason of ["no-location", "send-failed", "timed-out", "not-dispatched"] as const) {
      expect(sosFailureCopy(reason).message).not.toMatch(/always/i);
    }
  });
});

describe("mdrrmoNumber", () => {
  const hotline = (id: string, number: string): Hotline => ({ id, name: id, number, category: "medical" });

  it("uses the admin-managed MDRRMO hotline when loaded", () => {
    expect(mdrrmoNumber([hotline("police", "111"), hotline("mdrrmo", "0917-000-0000")])).toBe(
      "0917-000-0000",
    );
  });

  it("falls back to the shared fallback list when hotlines aren't loaded", () => {
    expect(mdrrmoNumber([])).toBe(FALLBACK_MDRRMO);
    expect(mdrrmoNumber([hotline("mdrrmo", " ")])).toBe(FALLBACK_MDRRMO);
  });

  it("keeps the same verified number the Contacts screen always had", () => {
    expect(FALLBACK_MDRRMO).toBe("0917-149-8457");
  });
});

describe("sosFailureActions", () => {
  const hotline = (id: string, number: string): Hotline => ({ id, name: id, number, category: "medical" });

  it("offers a call to MDRRMO through the dialer, plus Try Again and the hotline list", () => {
    expect(sosFailureActions("send-failed", [hotline("mdrrmo", "0917-000-0000")])).toEqual({
      callTelUrl: "tel:09170000000",
      canRetry: true,
      showsHotlines: true,
    });
  });

  it("still offers the call offline, from the verified fallback number", () => {
    expect(sosFailureActions("send-failed", []).callTelUrl).toBe("tel:09171498457");
  });

  it("offers Try Again for every failure except an SOS saved without an incident", () => {
    expect(sosFailureActions("no-location", []).canRetry).toBe(true);
    expect(sosFailureActions("send-failed", []).canRetry).toBe(true);
    expect(sosFailureActions("timed-out", []).canRetry).toBe(true);
    // A retry there would add a second alert (the backend dedupes on the
    // incident), so only calls and the hotline list are offered.
    expect(sosFailureActions("not-dispatched", [])).toEqual({
      callTelUrl: "tel:09171498457",
      canRetry: false,
      showsHotlines: true,
    });
  });
});
