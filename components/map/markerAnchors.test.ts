import {
  FLAT_PIN_ICON_SIZE,
  FLAT_PIN_PADDING,
  FLAT_PIN_TIP_ANCHOR,
  FLAT_PIN_WRAP_SIZE,
  IONICONS_LOCATION_METRICS,
  LEAFLET_PIN_ICON_ANCHOR,
  LEAFLET_PIN_SIZE,
  iconTipAnchorY,
} from "./markerAnchors";

describe("flat pin tip anchor (native Mapbox MarkerView)", () => {
  // Text box heights the platforms give the Ionicons glyph: Android
  // (includeFontPadding: font bbox yMax..yMin) and iOS (hhea ascender..
  // descender, with or without the line gap).
  const m = IONICONS_LOCATION_METRICS;
  const boxes = {
    android: m.fontBBoxYMax - m.fontBBoxYMin,
    iosNoGap: m.hheaAscender - m.hheaDescender,
    iosWithGap: m.hheaAscender - m.hheaDescender + m.hheaLineGap,
  };

  it.each(Object.entries(boxes))("puts the pin's tip within 1.5 dp of the coordinate on %s", (_platform, boxUnits) => {
    const tipY = iconTipAnchorY({ ...m, textBoxUnits: boxUnits }) * FLAT_PIN_WRAP_SIZE;
    const anchorY = FLAT_PIN_TIP_ANCHOR.y * FLAT_PIN_WRAP_SIZE;
    expect(Math.abs(tipY - anchorY)).toBeLessThan(1.5);
  });

  it("is horizontally centered and well below the old center anchor", () => {
    expect(FLAT_PIN_TIP_ANCHOR.x).toBe(0.5);
    // The old default (0.5) left the tip ~11 dp south of the real spot.
    const oldOffsetDp = (FLAT_PIN_TIP_ANCHOR.y - 0.5) * FLAT_PIN_WRAP_SIZE;
    expect(oldOffsetDp).toBeGreaterThan(9);
    expect(oldOffsetDp).toBeLessThan(13);
  });

  it("stays inside the marker view", () => {
    expect(FLAT_PIN_TIP_ANCHOR.y).toBeGreaterThan(0);
    expect(FLAT_PIN_TIP_ANCHOR.y).toBeLessThan(1);
    expect(FLAT_PIN_ICON_SIZE + FLAT_PIN_PADDING * 2).toBeLessThanOrEqual(FLAT_PIN_WRAP_SIZE);
  });
});

describe("Leaflet pin anchor (Expo Go WebView)", () => {
  it("anchors at the tip of the rotated teardrop, not its box's bottom edge", () => {
    // A square of side s rotated -45deg about its center puts its sharp
    // (radius-0) corner straight below the center, s/2 * sqrt(2) away.
    const s = LEAFLET_PIN_SIZE;
    const tipY = s / 2 + (s / 2) * Math.SQRT2;
    expect(LEAFLET_PIN_ICON_ANCHOR[0]).toBe(s / 2);
    expect(Math.abs(LEAFLET_PIN_ICON_ANCHOR[1] - tipY)).toBeLessThan(0.5);
  });
});
