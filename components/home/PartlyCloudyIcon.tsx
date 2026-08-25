// components/home/PartlyCloudyIcon.tsx
// A small illustrated sun-behind-cloud graphic for the "Partly Cloudy"
// weather readout on Home -- built with react-native-svg instead of a flat
// line icon so it actually reads as a sun and a cloud, shaded for depth.
import React from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

type PartlyCloudyIconProps = {
  size?: number;
};

export default function PartlyCloudyIcon({ size = 34 }: PartlyCloudyIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="rq-sun" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE082" />
          <Stop offset="1" stopColor="#FFA726" />
        </LinearGradient>
        <LinearGradient id="rq-cloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D7DEE6" />
        </LinearGradient>
      </Defs>

      {/* Sun rays -- only the top/right ones, since the cloud covers the rest */}
      <G stroke="#FFB300" strokeWidth={2.5} strokeLinecap="round" opacity={0.85}>
        <Line x1="40" y1="4" x2="40" y2="10" />
        <Line x1="57" y1="10" x2="52.5" y2="14.5" />
        <Line x1="62" y1="24" x2="55.5" y2="24" />
      </G>

      {/* Sun */}
      <Circle cx="40" cy="24" r="13" fill="url(#rq-sun)" />

      {/* Cloud, built from overlapping puffs + a rounded base */}
      <G>
        <Circle cx="23" cy="38" r="11" fill="url(#rq-cloud)" />
        <Circle cx="35" cy="33" r="14" fill="url(#rq-cloud)" />
        <Circle cx="47" cy="39" r="9.5" fill="url(#rq-cloud)" />
        <Rect x="13" y="38" width="43" height="16" rx="8" fill="url(#rq-cloud)" />
      </G>
    </Svg>
  );
}
