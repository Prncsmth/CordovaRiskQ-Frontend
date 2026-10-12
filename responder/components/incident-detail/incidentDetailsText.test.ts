import { incidentDetailsText } from "./incidentDetailsText";

describe("incidentDetailsText", () => {
  it("shows what the citizen wrote, trimmed", () => {
    expect(
      incidentDetailsText({ details: "  Fire at the 2nd floor, two kids inside.  ", categoryId: "fire" }),
    ).toEqual({ text: "Fire at the 2nd floor, two kids inside.", provided: true });
  });

  it("explains an SOS sent without text", () => {
    const result = incidentDetailsText({ details: null, categoryId: "sos" });
    expect(result.provided).toBe(false);
    expect(result.text).toMatch(/SOS alert sent with no details/);
  });

  it("explains a report with no description, including whitespace-only", () => {
    expect(incidentDetailsText({ details: "   ", categoryId: "flood" })).toEqual({
      text: "The reporter didn't add details.",
      provided: false,
    });
    expect(incidentDetailsText({ details: null, categoryId: "flood" }).provided).toBe(false);
  });
});
