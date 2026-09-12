import { isInsideCordova } from "./geofence";

describe("isInsideCordova", () => {
  it("is true for the Cordova municipal center", () => {
    expect(isInsideCordova(10.2515, 123.9499)).toBe(true);
  });

  it("is true for Gilutongan Island (part of Cordova)", () => {
    expect(isInsideCordova(10.207, 123.988)).toBe(true);
  });

  it("is true exactly on a boundary vertex", () => {
    expect(isInsideCordova(10.2463015, 123.8896035)).toBe(true);
  });

  it("is false for Lapu-Lapu City center", () => {
    expect(isInsideCordova(10.3103, 123.9494)).toBe(false);
  });

  it("is false for Cebu City center", () => {
    expect(isInsideCordova(10.3157, 123.8854)).toBe(false);
  });

  it("is false for Mandaue City center", () => {
    expect(isInsideCordova(10.3236, 123.9227)).toBe(false);
  });

  it("is false far out in the open ocean", () => {
    expect(isInsideCordova(10.25, 124.5)).toBe(false);
  });
});
