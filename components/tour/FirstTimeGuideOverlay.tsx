// components/tour/FirstTimeGuideOverlay.tsx
// Global first-time-user guide, mounted once in app/_layout.tsx above the
// tab navigator (same pattern as components/sos/SosOverlay.tsx) so it can
// spotlight real elements that live in different parts of the tree (Home
// screen content and the tab bar's Profile icon).
import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  useWindowDimensions,
  View,
  type NativeMethods,
} from "react-native";

import { useTour } from "@/context/TourContext";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";
import type { Rect } from "./types";

// A rect with zero (or negative, though that shouldn't happen) width/height
// means the target hasn't actually laid out yet -- e.g. mid-mount, or the
// screen transition into Home is still animating. Accepting it would draw
// a phantom or zero-size spotlight, so it's treated as "not ready yet" and
// retried instead.
function isValidRect(x: number, y: number, width: number, height: number) {
  return width > 0 && height > 0;
}

const MAX_MEASURE_ATTEMPTS = 10;
const MEASURE_RETRY_DELAY_MS = 60;
const SCROLL_INTO_VIEW_PADDING = 24;
// After scrollTo() with animated:false, the JS-side call returns before the
// native scroll has actually applied and re-laid-out its content -- there's
// no completion callback for it. A double requestAnimationFrame reliably
// waits for at least one full native commit, which a fixed setTimeout only
// approximates.
const CONFIRM_MEASURE_DELAY_MS = 140;

export default function FirstTimeGuideOverlay() {
  const {
    isVisible,
    currentStep,
    steps,
    next,
    back,
    skip,
    finish,
    getTargetRef,
    getScrollContainer,
    layoutTick,
  } = useTour();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const overlayRef = useRef<View>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isVisible || !step.targetId) {
      setTargetRect(null);
      return;
    }

    const ref = getTargetRef(step.targetId);
    if (!ref) {
      setTargetRect(null);
      return;
    }

    let cancelled = false;
    let attempts = 0;

    // Measures both nodes in window coordinates, then converts the target
    // into the overlay container's local coordinate space. The overlay is
    // absolutely positioned in the app tree, so its local origin can differ
    // from the native window origin on edge-to-edge devices.
    // Retries with a short
    // delay if the node isn't mounted yet or reports a zero-size rect
    // (not laid out yet), instead of showing an incorrect/empty spotlight.
    // Gives up after MAX_MEASURE_ATTEMPTS and falls back to the no-cutout
    // centered card, same as a target that's genuinely never registered.
    function attemptMeasure() {
      if (cancelled) return;
      const node = ref?.current;
      if (!node) {
        retryOrGiveUp();
        return;
      }

      const overlayNode = overlayRef.current;
      if (!overlayNode) {
        retryOrGiveUp();
        return;
      }

      node.measureInWindow((x, y, width, height) => {
        if (cancelled) return;
        overlayNode.measureInWindow((overlayX, overlayY) => {
          if (cancelled) return;
          const localX = x - overlayX;
          const localY = y - overlayY;
          if (isValidRect(localX, localY, width, height)) {
            setTargetRect({ x: localX, y: localY, width, height });
          } else {
            retryOrGiveUp();
          }
        });
      });
    }

    function retryOrGiveUp() {
      attempts += 1;
      if (attempts >= MAX_MEASURE_ATTEMPTS) {
        setTargetRect(null);
        return;
      }
      setTimeout(attemptMeasure, MEASURE_RETRY_DELAY_MS);
    }

    // Waits for at least one full native commit (double RAF), then measures,
    // then measures again shortly after as a confirmation pass -- guards
    // against a first reading that lands mid-scroll-settle: it has a valid
    // non-zero size (so isValidRect's check doesn't catch it), just at a
    // stale pre-scroll position. The second, later reading overwrites it
    // via the normal setTargetRect call if it differs.
    function measureAfterScrollSettles() {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (cancelled) return;
          attemptMeasure();
          setTimeout(() => {
            if (!cancelled) attemptMeasure();
          }, CONFIRM_MEASURE_DELAY_MS);
        });
      });
    }

    // If the target lives inside a registered scroll container (Home's
    // ScrollView) and isn't currently in view -- e.g. the evacuation card
    // near the bottom of the page -- scroll it into view first, then
    // measure. The Profile tab lives in an entirely separate part of the
    // tree (the tab bar, not inside Home's screen), so it's not a
    // descendant of Home's ScrollView at all -- measureLayout's onFail is
    // supposed to handle that gracefully, but in practice a "relativeTo"
    // node that isn't an actual ancestor can make it throw synchronously
    // instead on some platforms, so the call is wrapped defensively rather
    // than trusting onFail alone.
    const scrollContainerRef = getScrollContainer();
    const node = ref.current;
    if (scrollContainerRef?.current && node?.measureLayout) {
      try {
        node.measureLayout(
          // The ScrollContainer type only declares scrollTo (all the target
          // registry needs from it) -- but the real value here is always a
          // ScrollView ref, which does implement NativeMethods at runtime
          // (this RN version's ScrollView class type just doesn't expose it
          // statically, the same gap TouchableOpacity has for its own ref
          // type). measureLayout's relativeTo param needs a NativeMethods
          // instance, which this genuinely is.
          scrollContainerRef.current as unknown as NativeMethods,
          (_x, y) => {
            if (cancelled) return;
            scrollContainerRef.current?.scrollTo({
              y: Math.max(0, y - SCROLL_INTO_VIEW_PADDING),
              animated: false,
            });
            measureAfterScrollSettles();
          },
          () => attemptMeasure(),
        );
      } catch {
        attemptMeasure();
      }
    } else {
      attemptMeasure();
    }

    return () => {
      cancelled = true;
    };
  }, [
    isVisible,
    currentStep,
    step.targetId,
    getTargetRef,
    getScrollContainer,
    layoutTick,
  ]);

  if (!isVisible) return null;

  return (
    <View ref={overlayRef} style={styles.container}>
      <TourSpotlight
        targetRect={targetRect}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
      />
      <TourTooltip
        step={step}
        stepIndex={currentStep}
        totalSteps={steps.length}
        targetRect={targetRect}
        onNext={next}
        onBack={back}
        onSkip={skip}
        onFinish={finish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 101,
    elevation: 101,
  },
});
