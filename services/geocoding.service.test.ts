import { reverseGeocode, reverseGeocodeLocality } from "./geocoding.service";

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

describe("reverseGeocodeLocality", () => {
  // @ts-ignore - global.fetch type
  const originalFetch = global.fetch;
  const originalToken = process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN;

  afterEach(() => {
    // @ts-ignore - global.fetch type
    global.fetch = originalFetch;
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = originalToken;
  });

  it("returns the barangay, city or municipality, and province from reverse geocoding", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { text: "Banilad", place_type: ["neighborhood"] },
          { text: "Cebu City", place_type: ["place"] },
          { text: "Cebu", place_type: ["region"] },
        ],
      }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocodeLocality({ latitude: 10.35, longitude: 123.91 })).resolves.toEqual({
      barangay: "Banilad",
      locality: "Cebu City",
      region: "Cebu",
    });
    // @ts-ignore - global.fetch type
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("?types=neighborhood,locality,place,region&language=en"),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it("uses a neighborhood in the context when Mapbox omits a separate feature", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            text: "Cebu City",
            place_type: ["place"],
            context: [
              { id: "neighborhood.banilad", text: "Banilad" },
              { id: "region.abc", text: "Cebu" },
            ],
          },
        ],
      }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocodeLocality({ latitude: 10.35, longitude: 123.91 })).resolves.toEqual({
      barangay: "Banilad",
      locality: "Cebu City",
      region: "Cebu",
    });
  });

  it("returns null when locality cannot be resolved", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocodeLocality({ latitude: 10.35, longitude: 123.91 })).resolves.toBeNull();
  });
});
