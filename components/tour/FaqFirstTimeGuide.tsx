import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import type { Measurable, TourStepConfig } from "@/context/TourContext";
import { useThemeColors } from "@/theme";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";
import type { Rect } from "./types";

type FaqFirstTimeGuideProps = {
  targetRefs: React.RefObject<Measurable | null>[];
  onFinish: () => void;
};

const FAQ_STEPS: TourStepConfig[] = [
  {
    id: "faq-search",
    title: "Search for an Answer",
    body: "Type a word or phrase to find questions about safety, reports, or your account.",
    targetId: null,
  },
  {
    id: "faq-categories",
    title: "Filter by Topic",
    body: "Choose a topic to narrow the list and find the right question faster.",
    targetId: null,
  },
  {
    id: "faq-question",
    title: "Open a Question",
    body: "Tap any question to expand its answer. You can open or close questions anytime.",
    targetId: null,
  },
];

export default function FaqFirstTimeGuide({
  targetRefs,
  onFinish,
}: FaqFirstTimeGuideProps) {
  const COLORS = useThemeColors();
  const { width, height } = useWindowDimensions();
  const overlayRef = useRef<View>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const step = FAQ_STEPS[stepIndex];

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
        setTargetRect({
          x: x - overlayX,
          y: y - overlayY,
          width: targetWidth,
          height: targetHeight,
        });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [stepIndex, targetRefs]);

  const next = () => {
    if (stepIndex === FAQ_STEPS.length - 1) {
      onFinish();
      return;
    }
    setStepIndex((current) => current + 1);
  };

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
        totalSteps={FAQ_STEPS.length}
        targetRect={targetRect}
        onNext={next}
        onBack={() => setStepIndex((current) => Math.max(0, current - 1))}
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
