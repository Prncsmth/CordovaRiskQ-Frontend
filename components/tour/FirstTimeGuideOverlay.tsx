// components/tour/FirstTimeGuideOverlay.tsx
// Global first-time-user guide, mounted once in app/_layout.tsx above the
// tab navigator (same pattern as components/sos/SosOverlay.tsx) so it can
// spotlight real elements that live in different parts of the tree (Home
// screen content and the tab bar's Profile icon).
import React, { useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import { useTour } from "@/context/TourContext";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";
import type { Rect } from "./types";

export default function FirstTimeGuideOverlay() {
  const { isVisible, currentStep, steps, next, back, skip, finish, getTargetRef } =
    useTour();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  const step = steps[currentStep];

  useEffect(() => {
    if (!isVisible || !step.targetId) {
      setTargetRect(null);
      return;
    }

    const ref = getTargetRef(step.targetId);
    if (!ref?.current) {
      setTargetRect(null);
      return;
    }

    const frame = requestAnimationFrame(() => {
      ref.current?.measureInWindow((x, y, width, height) => {
        setTargetRect({ x, y, width, height });
      });
    });

    return () => cancelAnimationFrame(frame);
  }, [isVisible, currentStep, step.targetId, getTargetRef]);

  if (!isVisible) return null;

  return (
    <View style={styles.container}>
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
