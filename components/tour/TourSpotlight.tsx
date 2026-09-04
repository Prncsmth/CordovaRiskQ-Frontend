// components/tour/TourSpotlight.tsx
// The dimmed backdrop for the first-time guide, with a rounded-rect
// cutout ("spotlight") over the current step's target. Renders a plain
// dimmed View (no cutout) when there is no target -- step 0 ("Welcome")
// and the fallback for a target that failed to measure.
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Rect as SvgRect } from "react-native-svg";

import { useThemeColors } from "@/theme";
import type { Rect } from "./types";

const AnimatedRect = Animated.createAnimatedComponent(SvgRect);
const SPOTLIGHT_PADDING = 8;
const SPOTLIGHT_RADIUS = 16;

type TourSpotlightProps = {
  targetRect: Rect | null;
  screenWidth: number;
  screenHeight: number;
};

export default function TourSpotlight({
  targetRect,
  screenWidth,
  screenHeight,
}: TourSpotlightProps) {
  const COLORS = useThemeColors();

  const holeX = useSharedValue(targetRect ? targetRect.x - SPOTLIGHT_PADDING : 0);
  const holeY = useSharedValue(targetRect ? targetRect.y - SPOTLIGHT_PADDING : 0);
  const holeW = useSharedValue(
    targetRect ? targetRect.width + SPOTLIGHT_PADDING * 2 : 0,
  );
  const holeH = useSharedValue(
    targetRect ? targetRect.height + SPOTLIGHT_PADDING * 2 : 0,
  );

  useEffect(() => {
    if (!targetRect) return;
    holeX.value = withTiming(targetRect.x - SPOTLIGHT_PADDING, { duration: 260 });
    holeY.value = withTiming(targetRect.y - SPOTLIGHT_PADDING, { duration: 260 });
    holeW.value = withTiming(targetRect.width + SPOTLIGHT_PADDING * 2, {
      duration: 260,
    });
    holeH.value = withTiming(targetRect.height + SPOTLIGHT_PADDING * 2, {
      duration: 260,
    });
  }, [targetRect, holeX, holeY, holeW, holeH]);

  const animatedProps = useAnimatedProps(() => ({
    x: holeX.value,
    y: holeY.value,
    width: holeW.value,
    height: holeH.value,
  }));

  if (!targetRect) {
    return (
      <View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.scrim }]} />
    );
  }

  return (
    <Svg style={StyleSheet.absoluteFill} width={screenWidth} height={screenHeight}>
      <Defs>
        <Mask id="tour-spotlight-mask">
          <SvgRect x={0} y={0} width={screenWidth} height={screenHeight} fill="white" />
          <AnimatedRect
            animatedProps={animatedProps}
            rx={SPOTLIGHT_RADIUS}
            ry={SPOTLIGHT_RADIUS}
            fill="black"
          />
        </Mask>
      </Defs>
      <SvgRect
        x={0}
        y={0}
        width={screenWidth}
        height={screenHeight}
        fill={COLORS.scrim}
        mask="url(#tour-spotlight-mask)"
      />
    </Svg>
  );
}
