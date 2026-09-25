import { applyHotlineUpdate } from "./hotlines";
import type { Hotline } from "@/services/contacts.service";

function makeHotline(overrides: Partial<Hotline> = {}): Hotline {
  return {
    id: "police",
    name: "Cordova Police Station",
    number: "0917-000-0000",
    category: "police",
    ...overrides,
  };
}

describe("applyHotlineUpdate", () => {
  it("updates name, number, and category on the matching hotline", () => {
    const list = [makeHotline({ id: "police" })];

    const result = applyHotlineUpdate(list, {
      id: "police",
      name: "Cordova PNP",
      number: "0917-111-1111",
      category: "police",
    });

    expect(result[0]).toEqual(
      makeHotline({ id: "police", name: "Cordova PNP", number: "0917-111-1111" }),
    );
  });

  it("leaves other hotlines in the list untouched", () => {
    const other = makeHotline({ id: "bfp", name: "Fire Station", category: "fire" });
    const list = [makeHotline({ id: "police" }), other];

    const result = applyHotlineUpdate(list, {
      id: "police",
      name: "Updated",
      number: "0000",
      category: "police",
    });

    expect(result[1]).toEqual(other);
  });

  it("returns the list unchanged if the id isn't found", () => {
    const list = [makeHotline({ id: "police" })];

    const result = applyHotlineUpdate(list, {
      id: "unknown",
      name: "X",
      number: "0",
      category: "police",
    });

    expect(result).toEqual(list);
  });

  it("does not mutate the input array", () => {
    const list = [makeHotline({ id: "police" })];
    const original = JSON.parse(JSON.stringify(list));

    applyHotlineUpdate(list, { id: "police", name: "X", number: "0", category: "fire" });

    expect(list).toEqual(original);
  });
});
