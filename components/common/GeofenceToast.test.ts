import { toastAppearance } from "./GeofenceToast";

const COLORS = { danger: "#DC2626", success: "#16A34A" };

describe("toastAppearance", () => {
  it("shows a resolved incident in green with a checkmark", () => {
    expect(toastAppearance("success", COLORS)).toEqual({
      backgroundColor: "#16A34A",
      icon: "checkmark-circle",
    });
  });

  it("keeps the original red warning look by default (e.g. outside Cordova)", () => {
    expect(toastAppearance("danger", COLORS)).toEqual({
      backgroundColor: "#DC2626",
      icon: "warning",
    });
  });
});
