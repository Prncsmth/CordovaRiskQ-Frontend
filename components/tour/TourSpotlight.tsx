// components/tour/TourSpotlight.tsx
// The dimmed backdrop for the first-time guide, with a rounded-rect
// cutout ("spotlight") over the current step's target. Renders a plain
// dimmed View (no cutout) when there is no target -- step 0 ("Welcome")
// and the fallback for a target that failed to measure.
import { useThemeColors } from "@/theme";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Defs, Mask, Rect as SvgRect } from "react-native-svg";
import type { Rect } from "./types";

const AnimatedRect = Animated.createAnimatedComponent(SvgRect);
const SPOTLIGHT_PADDING = 6;
const SPOTLIGHT_RADIUS = 14;

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
  const initialHole = targetRect
    ? {
        x: targetRect.x - SPOTLIGHT_PADDING,
        y: targetRect.y - SPOTLIGHT_PADDING,
        width: targetRect.width + SPOTLIGHT_PADDING * 2,
        height: targetRect.height + SPOTLIGHT_PADDING * 2,
      }
    : { x: 0, y: 0, width: 0, height: 0 };
  const holeX = useSharedValue(initialHole.x);
  const holeY = useSharedValue(initialHole.y);
  const holeW = useSharedValue(initialHole.width);
  const holeH = useSharedValue(initialHole.height);

  useEffect(() => {
    if (!targetRect) return;
    holeX.value = withTiming(targetRect.x - SPOTLIGHT_PADDING, {
      duration: 260,
    });
    holeY.value = withTiming(targetRect.y - SPOTLIGHT_PADDING, {
      duration: 260,
    });
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
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.scrim }]}
      />
    );
  }

  return (
    <Svg
      pointerEvents="none"
      style={StyleSheet.absoluteFill}
      width={screenWidth}
      height={screenHeight}
    >
      <Defs>
        <Mask id="tour-spotlight-mask">
          <SvgRect
            x={0}
            y={0}
            width={screenWidth}
            height={screenHeight}
            fill="white"
          />
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
      <AnimatedRect
        animatedProps={animatedProps}
        rx={SPOTLIGHT_RADIUS}
        ry={SPOTLIGHT_RADIUS}
        fill="none"
        stroke={COLORS.white}
        strokeWidth={2}
      />
    </Svg>
  );
}
