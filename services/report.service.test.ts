jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    exists: uri === "file:///exists.jpg",
  })),
}));

import { File as FileClass } from "expo-file-system";

import { photoFileExists, uploadReportPhoto } from "./report.service";

const File = FileClass as unknown as jest.Mock;

describe("photoFileExists", () => {
  afterEach(() => {
    File.mockImplementation((uri: string) => ({
      exists: uri === "file:///exists.jpg",
    }));
  });

  it("returns true when the file exists at the given uri", () => {
    expect(photoFileExists("file:///exists.jpg")).toBe(true);
  });

  it("returns false when no file exists at the given uri", () => {
    expect(photoFileExists("file:///missing.jpg")).toBe(false);
  });

  it("returns false if the File constructor throws", () => {
    File.mockImplementationOnce(() => {
      throw new Error("invalid uri");
    });

    expect(photoFileExists("not-a-uri")).toBe(false);
  });
});

describe("uploadReportPhoto", () => {
  // @ts-ignore - global.fetch type
  const originalFetch = global.fetch;

  afterEach(() => {
    // @ts-ignore - global.fetch type
    global.fetch = originalFetch;
  });

  it("returns the photoUrl on a successful upload", async () => {
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        photoUrl: "https://cdn.example.com/photo.jpg",
      }),
    }) as unknown as typeof fetch;

    const result = await uploadReportPhoto(
      "token123",
      "file:///exists.jpg",
      "photo.jpg",
    );

    expect(result).toEqual({ photoUrl: "https://cdn.example.com/photo.jpg" });
  });

  it("throws when the server responds with a non-ok status", async () => {
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
    }) as unknown as typeof fetch;

    await expect(
      uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg"),
    ).rejects.toThrow();
  });

  it("propagates a network failure", async () => {
    // @ts-ignore - global.fetch type
    global.fetch = jest
      .fn()
      .mockRejectedValue(new Error("Network request failed"));

    await expect(
      uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg"),
    ).rejects.toThrow("Network request failed");
  });
});
