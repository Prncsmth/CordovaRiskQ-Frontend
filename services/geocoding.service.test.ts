import { formatHomeLocationLabel, reverseGeocode, reverseGeocodeLocality } from "./geocoding.service";

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
      municipality: "Cebu City",
      province: "Cebu",
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
      municipality: "Cebu City",
      province: "Cebu",
    });
  });

  it("treats a Philippine locality as the barangay and the place as the municipality", async () => {
    // What Mapbox returns inside Cordova: the barangay as a locality,
    // Cordova as the place, Cebu as the region.
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { text: "Day-as", place_type: ["locality"] },
          { text: "Cordova", place_type: ["place"] },
          { text: "Cebu", place_type: ["region"] },
        ],
      }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocodeLocality({ latitude: 10.2554, longitude: 123.9355 })).resolves.toEqual({
      barangay: "Day-as",
      municipality: "Cordova",
      province: "Cebu",
    });
  });

  it("names a highly urbanized city as a city, e.g. Lapu-Lapu", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ text: "Pajo", place_type: ["locality"] }, { text: "Lapu-Lapu", place_type: ["region", "place"] }] }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocodeLocality({ latitude: 10.31, longitude: 123.95 })).resolves.toEqual({ barangay: "Pajo", municipality: "Lapu-Lapu City" });
  });

  it("does not double the word City, e.g. Cebu City", async () => {
    process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN = "test-token";
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [{ text: "Capitol Site", place_type: ["locality"] }, { text: "Cebu City", place_type: ["region", "place"] }] }),
    }) as unknown as typeof fetch;

    await expect(reverseGeocodeLocality({ latitude: 10.31, longitude: 123.95 })).resolves.toEqual({ barangay: "Capitol Site", municipality: "Cebu City" });
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

describe("formatHomeLocationLabel", () => {
  it("shows the barangay and its municipality, not the province", () => {
    expect(formatHomeLocationLabel({ barangay: "Day-as", municipality: "Cordova", province: "Cebu" })).toBe(
      "Barangay Day-as, Cordova",
    );
  });

  it("shows the municipality and province when the barangay is unknown", () => {
    expect(formatHomeLocationLabel({ municipality: "Cordova", province: "Cebu" })).toBe("Cordova, Cebu");
  });

  it("falls back to the barangay and province when the municipality is unknown", () => {
    expect(formatHomeLocationLabel({ barangay: "Day-as", province: "Cebu" })).toBe("Barangay Day-as, Cebu");
  });

  it("works the same for a city, e.g. Lapu-Lapu", () => {
    expect(formatHomeLocationLabel({ barangay: "Pajo", municipality: "Lapu-Lapu City", province: "Cebu" })).toBe(
      "Barangay Pajo, Lapu-Lapu City",
    );
  });

  it("returns null when nothing is known", () => {
    expect(formatHomeLocationLabel(null)).toBeNull();
    expect(formatHomeLocationLabel({})).toBeNull();
  });
});
