import { phaseForMyStatus } from "./phaseForMyStatus";

describe("phaseForMyStatus", () => {
  it("maps each active status to its phase", () => {
    expect(phaseForMyStatus("pending")).toBe("pending");
    expect(phaseForMyStatus("joined")).toBe("lobby");
    expect(phaseForMyStatus("on_the_way")).toBe("on_the_way");
    expect(phaseForMyStatus("arrived")).toBe("arrived");
  });

  it("maps left back to pending, since rejoining is allowed", () => {
    expect(phaseForMyStatus("left")).toBe("pending");
  });

  it("returns null for declined", () => {
    expect(phaseForMyStatus("declined")).toBeNull();
  });
});
