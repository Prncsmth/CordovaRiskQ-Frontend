import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import type { Measurable, TourStepConfig } from "@/context/TourContext";
import { useThemeColors } from "@/theme";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";
import type { Rect } from "./types";

type MapFirstTimeGuideProps = {
  targetRefs: React.RefObject<Measurable | null>[];
  onFinish: () => void;
};

const MAP_STEPS: TourStepConfig[] = [
  {
    id: "map-search",
    title: "Search a Barangay",
    body: "Type a barangay name here to quickly find it on the map.",
    targetId: null,
  },
  {
    id: "map-pin",
    title: "Pin an Emergency Location",
    body: "Tap this button, then tap anywhere on the map to choose the location you want to report.",
    targetId: null,
  },
  {
    id: "map-locate",
    title: "Find Your Location",
    body: "Tap this button to center the map on your current location.",
    targetId: null,
  },
];

function isValidRect(rect: Rect) {
  return rect.width > 0 && rect.height > 0;
}

export default function MapFirstTimeGuide({
  targetRefs,
  onFinish,
}: MapFirstTimeGuideProps) {
  const COLORS = useThemeColors();
  const { width, height } = useWindowDimensions();
  const overlayRef = useRef<View>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const step = MAP_STEPS[stepIndex];

  useEffect(() => {
    let cancelled = false;
    const target = targetRefs[stepIndex]?.current;
    const overlay = overlayRef.current;

    if (!target || !overlay) {
      setTargetRect(null);
      return;
    }

    target.measureInWindow((x, y, targetWidth, targetHeight) => {
      if (cancelled) return;
      overlay.measureInWindow((overlayX, overlayY) => {
        if (cancelled) return;
        const rect = {
          x: x - overlayX,
          y: y - overlayY,
          width: targetWidth,
          height: targetHeight,
        };
        setTargetRect(isValidRect(rect) ? rect : null);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [stepIndex, targetRefs]);

  function handleNext() {
    if (stepIndex === MAP_STEPS.length - 1) {
      onFinish();
      return;
    }
    setStepIndex((current) => current + 1);
  }

  function handleBack() {
    setStepIndex((current) => Math.max(0, current - 1));
  }

  return (
    <View ref={overlayRef} pointerEvents="box-none" style={styles.overlay}>
      <TourSpotlight
        targetRect={targetRect}
        screenWidth={width}
        screenHeight={height}
      />
      <TourTooltip
        step={step}
        stepIndex={stepIndex}
        totalSteps={MAP_STEPS.length}
        targetRect={targetRect}
        onNext={handleNext}
        onBack={handleBack}
        onSkip={onFinish}
        onFinish={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    elevation: 100,
  },
});
