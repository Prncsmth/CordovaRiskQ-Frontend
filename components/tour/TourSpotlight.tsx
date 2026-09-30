// components/tour/TourSpotlight.tsx
// The dimmed backdrop for the first-time guide, with a rounded-rect
// cutout ("spotlight") over the current step's target. Renders a plain
// dimmed View (no cutout) when there is no target -- step 0 ("Welcome")
// and the fallback for a target that failed to measure.
//
// The cutout is 4 plain Views tiled around the target (top/bottom span the
// full width, left/right fill the remaining band beside the hole) instead
// of an SVG <Mask> -- a full-screen SVG mask forces a GPU compositing pass
// every frame it's recomposited, which is a well-known Android perf cost
// in react-native-svg; four opaque Views with Reanimated-driven layout
// props are far cheaper and still animate on the UI thread. The left/right
// pieces share the hole's exact top/height, so rounding their *inner*
// corners (the corners that touch the hole) lands exactly on all 4 of the
// hole's corners -- top/bottom need no rounding at all. A 5th, transparent
// bordered View traces the same rect for the white outline the old stroked
// SvgRect drew.
//
// Fixed ~50% black regardless of theme (not COLORS.scrim, which is
// lighter and theme-adaptive) -- same reasoning as TourTooltip's fixed
// white card: a short-lived onboarding overlay, consistent every time
// rather than shifting with dark mode.
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import type { Rect } from "./types";

const SPOTLIGHT_PADDING = 6;
const SPOTLIGHT_RADIUS = 14;
const SCRIM_COLOR = "rgba(0, 0, 0, 0.5)";

type TourSpotlightProps = {
  targetRect: Rect | null;
  screenWidth: number;
  screenHeight: number;
};

// screenWidth/screenHeight are accepted for interface stability with the
// caller (FirstTimeGuideOverlay et al. already have them from
// useWindowDimensions) but are no longer needed here -- every rect below is
// positioned with edge anchors (left/right/top/bottom) instead of computed
// pixel widths, so it tracks the real screen size natively.
export default function TourSpotlight({
  targetRect,
}: TourSpotlightProps) {
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

  // Fades the whole overlay in once, on mount -- FirstTimeGuideOverlay (and
  // its map/report/faq counterparts) fully unmount this between tour
  // sessions, so a mount-time animation only ever plays once per session,
  // not on every step change (the cutout's own move/resize animation below
  // handles per-step transitions separately).
  const overlayOpacity = useSharedValue(0);
  useEffect(() => {
    overlayOpacity.value = withTiming(1, { duration: 200 });
  }, [overlayOpacity]);
  const overlayAnimatedStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

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

  // Spans the full width above the hole -- needs no rounding itself; the
  // left/right pieces below supply all 4 rounded corners.
  const topStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: holeY.value,
    backgroundColor: SCRIM_COLOR,
  }));
  // Anchored by top+bottom instead of a computed height, so it always
  // reaches the screen's actual bottom edge regardless of rotation/resize.
  const bottomStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: holeY.value + holeH.value,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: SCRIM_COLOR,
  }));
  // Shares the hole's exact top/height, so its inner (right) corners land
  // exactly on the hole's top-left/bottom-left corners.
  const leftStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: holeY.value,
    left: 0,
    width: holeX.value,
    height: holeH.value,
    backgroundColor: SCRIM_COLOR,
    borderTopRightRadius: SPOTLIGHT_RADIUS,
    borderBottomRightRadius: SPOTLIGHT_RADIUS,
  }));
  // Anchored by left+right instead of a computed width, for the same
  // rotation/resize reason as bottomStyle; its inner (left) corners land on
  // the hole's top-right/bottom-right corners.
  const rightStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: holeY.value,
    left: holeX.value + holeW.value,
    right: 0,
    height: holeH.value,
    backgroundColor: SCRIM_COLOR,
    borderTopLeftRadius: SPOTLIGHT_RADIUS,
    borderBottomLeftRadius: SPOTLIGHT_RADIUS,
  }));
  // Transparent, bordered -- traces the hole itself for the same white
  // outline the old stroked SvgRect drew.
  const outlineStyle = useAnimatedStyle(() => ({
    position: "absolute",
    top: holeY.value,
    left: holeX.value,
    width: holeW.value,
    height: holeH.value,
  }));

  if (!targetRect) {
    return (
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: SCRIM_COLOR },
          overlayAnimatedStyle,
        ]}
      />
    );
  }

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, overlayAnimatedStyle]}
    >
      <Animated.View style={topStyle} />
      <Animated.View style={bottomStyle} />
      <Animated.View style={leftStyle} />
      <Animated.View style={rightStyle} />
      <Animated.View style={[styles.outline, outlineStyle]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outline: {
    borderRadius: SPOTLIGHT_RADIUS,
    borderWidth: 2,
    borderColor: "#FFFFFF",
    backgroundColor: "transparent",
  },
});
