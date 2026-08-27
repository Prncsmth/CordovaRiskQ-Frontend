// components/home/TideCardBackground.tsx
// Decorative water motif for the tide card: two soft overlapping wave
// layers along the bottom edge plus a faint glow, all drawn inline so the
// card never depends on an external image. Purely cosmetic -- sits behind
// the card's text as an absolutely-positioned, non-interactive layer.
//
// Takes the card's own measured width/height so the wave curves are drawn
// in real pixels for that exact box, instead of being stretched from a
// generic reference size (which distorts the curve on cards of a
// different aspect ratio).
import React from "react";
import { StyleSheet } from "react-native";
import Svg, {
  Defs,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from "react-native-svg";

type TideCardBackgroundProps = {
  width: number;
  height: number;
};

export default function TideCardBackground({ width, height }: TideCardBackgroundProps) {
  if (!width || !height) return null;

  const w = width;
  const h = height;

  return (
    <Svg style={StyleSheet.absoluteFill} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Defs>
        <RadialGradient id="rq-tide-glow" cx="82%" cy="8%" r="60%">
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.1} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={w} height={h} fill="url(#rq-tide-glow)" />

      <Path
        d={`M0,${h * 0.68} C${w * 0.18},${h * 0.82} ${w * 0.35},${h * 0.55} ${w * 0.53},${h * 0.64} C${w * 0.7},${h * 0.73} ${w * 0.83},${h * 0.86} ${w},${h * 0.73} L${w},${h} L0,${h} Z`}
        fill="#FFFFFF"
        fillOpacity={0.05}
      />
      <Path
        d={`M0,${h * 0.8} C${w * 0.23},${h * 0.68} ${w * 0.4},${h * 0.93} ${w * 0.6},${h * 0.82} C${w * 0.78},${h * 0.72} ${w * 0.88},${h * 0.91} ${w},${h * 0.83} L${w},${h} L0,${h} Z`}
        fill="#FFFFFF"
        fillOpacity={0.07}
      />
    </Svg>
  );
}
