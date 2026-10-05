import { resolveReportPhoto } from "./reportPhoto";

const photo = { uri: "file:///photo.jpg", fileName: "photo.jpg" };

function deps(overrides: Partial<Parameters<typeof resolveReportPhoto>[1]> = {}) {
  return {
    fileExists: jest.fn(() => true),
    upload: jest.fn(async () => ({ photoUrl: "https://cdn.example/photo.jpg" })),
    confirmSubmitWithoutPhoto: jest.fn(async () => true),
    ...overrides,
  };
}

describe("resolveReportPhoto", () => {
  it("goes ahead with no photo when none was picked, without asking anything", async () => {
    const d = deps();

    await expect(resolveReportPhoto(null, d)).resolves.toEqual({ proceed: true });
    expect(d.upload).not.toHaveBeenCalled();
    expect(d.confirmSubmitWithoutPhoto).not.toHaveBeenCalled();
  });

  it("attaches the uploaded photo's URL when the upload succeeds", async () => {
    const d = deps();

    await expect(resolveReportPhoto(photo, d)).resolves.toEqual({
      proceed: true,
      photoUrl: "https://cdn.example/photo.jpg",
    });
    expect(d.upload).toHaveBeenCalledWith(photo);
    expect(d.confirmSubmitWithoutPhoto).not.toHaveBeenCalled();
  });

  it("on a failed upload, asks and submits without the photo when the user agrees", async () => {
    const d = deps({ upload: jest.fn(async () => Promise.reject(new Error("404"))) });

    const outcome = await resolveReportPhoto(photo, d);

    expect(d.confirmSubmitWithoutPhoto).toHaveBeenCalledTimes(1);
    expect(outcome).toEqual({ proceed: true });
    expect(outcome).not.toHaveProperty("photoUrl"); // never pretends it was attached
  });

  it("on a failed upload, stops when the user cancels, so they can retry or remove the photo", async () => {
    const d = deps({
      upload: jest.fn(async () => Promise.reject(new Error("Network request failed"))),
      confirmSubmitWithoutPhoto: jest.fn(async () => false),
    });

    await expect(resolveReportPhoto(photo, d)).resolves.toEqual({ proceed: false });
  });

  it("treats a photo missing from the device like a failed upload", async () => {
    const d = deps({ fileExists: jest.fn(() => false) });

    await expect(resolveReportPhoto(photo, d)).resolves.toEqual({ proceed: true });
    expect(d.upload).not.toHaveBeenCalled();
    expect(d.confirmSubmitWithoutPhoto).toHaveBeenCalledTimes(1);
  });
});
