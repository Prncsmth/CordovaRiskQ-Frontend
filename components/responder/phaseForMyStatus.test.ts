import { phaseForMyStatus } from "./phaseForMyStatus";

describe("phaseForMyStatus", () => {
  it("maps each active status to its phase", () => {
    expect(phaseForMyStatus("pending")).toBe("pending");
    expect(phaseForMyStatus("joined")).toBe("lobby");
    expect(phaseForMyStatus("on_the_way")).toBe("on_the_way");
    expect(phaseForMyStatus("arrived")).toBe("arrived");
  });

  it("returns null for declined and left", () => {
    expect(phaseForMyStatus("declined")).toBeNull();
    expect(phaseForMyStatus("left")).toBeNull();
  });
});
