import { File as FileClass } from "expo-file-system";

import {
  PHOTO_MAX_EDGE_PX,
  PHOTO_UPLOAD_TIMEOUT_MS,
  getReportDetailById,
  photoFileExists,
  shrinkReportPhoto,
  uploadReportPhoto,
} from "./report.service";

const mockRender = jest.fn();
const mockResize = jest.fn();
const mockSave = jest.fn();
jest.mock("expo-image-manipulator", () => ({
  SaveFormat: { JPEG: "jpeg" },
  ImageManipulator: {
    manipulate: jest.fn(() => ({ renderAsync: mockRender, resize: mockResize })),
  },
}));

function renderAs(width: number, height: number) {
  mockRender.mockResolvedValue({ width, height, saveAsync: mockSave });
}

beforeEach(() => {
  mockRender.mockReset();
  mockResize.mockReset();
  mockSave.mockReset().mockResolvedValue({ uri: "file:///small.jpg" });
  renderAs(4000, 3000);
});

jest.mock("expo-file-system", () => ({
  File: jest.fn().mockImplementation((uri: string) => ({
    exists: uri === "file:///exists.jpg",
  })),
}));

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

describe("shrinkReportPhoto", () => {
  it("shrinks a big landscape photo to the max width, as a JPEG", async () => {
    renderAs(4000, 3000);
    await expect(shrinkReportPhoto("file:///big.heic", "IMG_1.heic")).resolves.toEqual({
      uri: "file:///small.jpg",
      fileName: "IMG_1.jpg",
    });
    expect(mockResize).toHaveBeenCalledWith({ width: PHOTO_MAX_EDGE_PX });
    expect(mockSave).toHaveBeenCalledWith({ format: "jpeg", compress: 0.6 });
  });

  it("limits a portrait photo by its height", async () => {
    renderAs(3000, 4000);
    await shrinkReportPhoto("file:///tall.jpg", "tall.jpg");
    expect(mockResize).toHaveBeenCalledWith({ height: PHOTO_MAX_EDGE_PX });
  });

  it("never enlarges a small photo, only re-compresses it", async () => {
    renderAs(800, 600);
    await shrinkReportPhoto("file:///s.png", "s.png");
    expect(mockResize).not.toHaveBeenCalled();
    expect(mockSave).toHaveBeenCalled();
  });

  it("falls back to the original when shrinking fails", async () => {
    mockRender.mockRejectedValue(new Error("decode failed"));
    await expect(shrinkReportPhoto("file:///x.jpg", "x.jpg")).resolves.toEqual({
      uri: "file:///x.jpg",
      fileName: "x.jpg",
    });
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

  it("sends the shrunk photo as an expo-file-system File, not a { uri } object", async () => {
    // expo/fetch (SDK 57's global fetch) rejects React Native's { uri, name,
    // type } parts with "Unsupported FormDataPart implementation".
    const fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, photoUrl: "https://cdn.example.com/photo.jpg" }),
    });
    // @ts-ignore - global.fetch type
    global.fetch = fetchMock as unknown as typeof fetch;
    const append = jest.spyOn(FormData.prototype, "append");

    try {
      await uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg");

      expect(File).toHaveBeenCalledWith("file:///small.jpg");
      expect(append).toHaveBeenCalledTimes(1);
      const [field, value] = append.mock.calls[0];
      expect(field).toBe("photo");
      // The File instance itself (from the mocked constructor), never a
      // plain { uri, name, type } descriptor.
      expect(value).toBe(File.mock.results[File.mock.results.length - 1].value);
      expect(value).not.toHaveProperty("uri");
    } finally {
      append.mockRestore();
    }
  });

  it("fails a response with no photoUrl instead of attaching nothing", async () => {
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    }) as unknown as typeof fetch;

    await expect(
      uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg"),
    ).rejects.toThrow();
  });

  it("gives up on a stalled upload so the report can still be sent", async () => {
    jest.useFakeTimers();
    try {
      // @ts-ignore - global.fetch type
      global.fetch = jest.fn(
        (_url: string, init: { signal: AbortSignal }) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener("abort", () => reject(new Error("Aborted")));
          }),
      ) as unknown as typeof fetch;

      const upload = uploadReportPhoto("token123", "file:///exists.jpg", "photo.jpg");
      const assertion = expect(upload).rejects.toThrow("timed out");
      await jest.advanceTimersByTimeAsync(PHOTO_UPLOAD_TIMEOUT_MS);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
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

describe("getReportDetailById", () => {
  // @ts-ignore - global.fetch type
  const originalFetch = global.fetch;

  afterEach(() => {
    // @ts-ignore - global.fetch type
    global.fetch = originalFetch;
  });

  it("returns undefined for a real 404", async () => {
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => "",
    }) as unknown as typeof fetch;

    const result = await getReportDetailById("token123", "missing-id");

    expect(result).toBeUndefined();
  });

  it("propagates a network/server failure instead of returning undefined", async () => {
    // @ts-ignore - global.fetch type
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "",
    }) as unknown as typeof fetch;

    await expect(
      getReportDetailById("token123", "some-id"),
    ).rejects.toThrow();
  });
});
