// components/home/TideCardBackground.tsx
// Decorative corner sheen for the tide card, drawn inline so the card never
// depends on an external image. Purely cosmetic -- sits behind the card's
// text as an absolutely-positioned, non-interactive layer.
//
// Takes the card's own measured width/height so the glow is positioned in
// real pixels for that exact box, instead of being stretched from a generic
// reference size (which distorts it on cards of a different aspect ratio).
import React from "react";
import { StyleSheet } from "react-native";
import Svg, { Defs, RadialGradient, Rect, Stop } from "react-native-svg";

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
          <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
          <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </RadialGradient>
      </Defs>

      <Rect x={0} y={0} width={w} height={h} fill="url(#rq-tide-glow)" />
    </Svg>
  );
}
