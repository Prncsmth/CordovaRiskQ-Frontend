import { severityStyle, toSeverity } from "./announcementSeverity";
import type { ColorPalette } from "@/theme";

const COLORS = {
  tide: "teal",
  tideTint: "teal-tint",
  warning: "amber",
  warningBg: "amber-tint",
  danger: "red",
} as unknown as ColorPalette;

describe("toSeverity", () => {
  it("passes the three backend levels through", () => {
    expect(toSeverity("Information")).toBe("Information");
    expect(toSeverity("Warning")).toBe("Warning");
    expect(toSeverity("Critical")).toBe("Critical");
  });

  it("reads an older backend's Normal/Urgent safely (Urgent is never Critical)", () => {
    expect(toSeverity("Normal")).toBe("Information");
    expect(toSeverity("Urgent")).toBe("Warning");
  });

  it("treats anything unknown as Information", () => {
    expect(toSeverity(undefined)).toBe("Information");
    expect(toSeverity("critical")).toBe("Information");
  });
});

describe("severityStyle", () => {
  it("gives each level its own label, icon and color", () => {
    expect(severityStyle("Information", COLORS)).toMatchObject({
      label: "Information",
      icon: "information-circle-outline",
      color: "teal",
    });
    expect(severityStyle("Warning", COLORS)).toMatchObject({
      label: "Warning",
      icon: "warning-outline",
      color: "amber",
    });
    expect(severityStyle("Critical", COLORS)).toMatchObject({
      label: "CRITICAL ALERT",
      icon: "alert-circle",
      color: "red",
    });
  });

  it("only Critical is marked prominent", () => {
    expect(severityStyle("Information", COLORS).prominent).toBe(false);
    expect(severityStyle("Warning", COLORS).prominent).toBe(false);
    expect(severityStyle("Critical", COLORS).prominent).toBe(true);
  });
});
