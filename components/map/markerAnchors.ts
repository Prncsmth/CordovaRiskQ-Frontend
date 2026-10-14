// components/map/markerAnchors.ts
// Where a teardrop pin's TIP sits inside its marker view, so the tip -- not
// the middle of the icon -- lands on the marker's latitude/longitude. A
// pin anchored at its center points at a spot several meters south of the
// real one; that is easy to miss on the street map but obvious on
// satellite imagery, where the pin visibly misses the building.
//
// Derived from the actual geometry, not tuned by eye, and never by
// shifting coordinates.

// ---- Native Mapbox (MapboxMap.tsx, the APK) -------------------------------
// The "flat" pin is Ionicons' "location" glyph at FLAT_PIN_ICON_SIZE, with
// FLAT_PIN_PADDING around it, centered in a FLAT_PIN_WRAP_SIZE square
// MarkerView (whose default anchor is its center).
export const FLAT_PIN_ICON_SIZE = 26;
export const FLAT_PIN_PADDING = 6;
export const FLAT_PIN_WRAP_SIZE = 46;

// Read from the bundled Ionicons.ttf (units per em 512): the "location"
// glyph's lowest point -- the tip -- is 32 units below the baseline.
export const IONICONS_LOCATION_METRICS = {
  unitsPerEm: 512,
  glyphYMin: -32,
  hheaAscender: 454,
  hheaDescender: -71,
  hheaLineGap: 46,
  fontBBoxYMax: 453,
  fontBBoxYMin: -71,
};

// The tip's height inside the wrap, as a 0..1 MarkerView anchor `y`, for a
// glyph whose text box is `textBoxUnits` tall (that height differs a little
// between Android and iOS, see the test).
export function iconTipAnchorY({
  unitsPerEm,
  glyphYMin,
  hheaAscender,
  textBoxUnits,
}: typeof IONICONS_LOCATION_METRICS & { textBoxUnits: number }): number {
  const scale = FLAT_PIN_ICON_SIZE / unitsPerEm;
  const textBoxHeight = textBoxUnits * scale;
  const pressableHeight = textBoxHeight + FLAT_PIN_PADDING * 2;
  const pressableTop = (FLAT_PIN_WRAP_SIZE - pressableHeight) / 2;
  // Baseline sits `ascender` below the text box's top; the tip is below it.
  const tipFromTextTop = (hheaAscender - glyphYMin) * scale;
  return (pressableTop + FLAT_PIN_PADDING + tipFromTextTop) / FLAT_PIN_WRAP_SIZE;
}

// Within ~1 dp of the tip on both Android (~0.747) and iOS (~0.72-0.75).
export const FLAT_PIN_TIP_ANCHOR = { x: 0.5, y: 0.74 } as const;

// ---- Leaflet (LeafletMap.tsx, Expo Go) ------------------------------------
// The pin is a LEAFLET_PIN_SIZE square with one sharp corner, rotated -45deg
// about its center: the sharp corner ends up straight below the center,
// (size / 2) * sqrt(2) away -- the tip.
export const LEAFLET_PIN_SIZE = 28;
export const LEAFLET_PIN_ICON_ANCHOR: [number, number] = [
  LEAFLET_PIN_SIZE / 2,
  Math.round(LEAFLET_PIN_SIZE / 2 + (LEAFLET_PIN_SIZE / 2) * Math.SQRT2),
];
