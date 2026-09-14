import { reverseGeocode } from "./geocoding.service";

describe("reverseGeocode", () => {
  // @ts-ignore - global.fetch type
  const originalFetch = global.fetch;
  const originalToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  afterEach(() => {
    // @ts-ignore - global.fetch type
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = originalToken;
  });

  it("returns the top result's place_name on success", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { place_name: "Victorio Degamo Tirol Street, Buagsong, Cordova, Cebu" },
          { place_name: "Buagsong, Cordova, Cebu" },
        ],
      }),
    }) as unknown as typeof fetch;

    const result = await reverseGeocode({ latitude: 10.249, longitude: 123.9396 });

    expect(result).toBe("Victorio Degamo Tirol Street, Buagsong, Cordova, Cebu");
  });

  it("returns null when there is no access token", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn();

    const result = await reverseGeocode({ latitude: 10.249, longitude: 123.9396 });

    expect(result).toBeNull();
    // @ts-ignore - global.fetch type
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns null when the response has no features", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    }) as unknown as typeof fetch;

    const result = await reverseGeocode({ latitude: 10.249, longitude: 123.9396 });

    expect(result).toBeNull();
  });

  it("returns null on a non-ok response instead of throwing", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    const result = await reverseGeocode({ latitude: 10.249, longitude: 123.9396 });

    expect(result).toBeNull();
  });

  it("returns null on a network failure instead of throwing", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockRejectedValue(new Error("Network request failed"));

    const result = await reverseGeocode({ latitude: 10.249, longitude: 123.9396 });

    expect(result).toBeNull();
  });
});
