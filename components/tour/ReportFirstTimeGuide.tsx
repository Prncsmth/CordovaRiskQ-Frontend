import React, { useEffect, useRef, useState } from "react";
import {
    StyleSheet,
    useWindowDimensions,
    View,
    type NativeMethods,
} from "react-native";

import type {
    Measurable,
    ScrollContainer,
    TourStepConfig,
} from "@/context/TourContext";
import { useThemeColors } from "@/theme";
import TourSpotlight from "./TourSpotlight";
import TourTooltip from "./TourTooltip";
import type { Rect } from "./types";

type ReportFirstTimeGuideProps = {
  targetRefs: React.RefObject<Measurable | null>[];
  scrollRef: React.RefObject<ScrollContainer | null>;
  onFinish: () => void;
};

const REPORT_STEPS: TourStepConfig[] = [
  {
    id: "report-category",
    title: "Choose a Category",
    body: "Tap the category that best describes the incident.",
    targetId: null,
  },
  {
    id: "report-location",
    title: "Check the Location",
    body: "This is the location that will be attached to your report.",
    targetId: null,
  },
  {
    id: "report-details",
    title: "Add Details",
    body: "Describe what happened so responders know how to help.",
    targetId: null,
  },
  {
    id: "report-submit",
    title: "Submit the Report",
    body: "When the required information is complete, tap Submit Report.",
    targetId: null,
  },
];

export default function ReportFirstTimeGuide({
  targetRefs,
  scrollRef,
  onFinish,
}: ReportFirstTimeGuideProps) {
  const COLORS = useThemeColors();
  const { width, height } = useWindowDimensions();
  const overlayRef = useRef<View>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const step = REPORT_STEPS[stepIndex];

  useEffect(() => {
    let cancelled = false;
    const target = targetRefs[stepIndex]?.current;
    const overlay = overlayRef.current;

    if (!target || !overlay) {
      setTargetRect(null);
      return;
    }

    const measureTarget = () => {
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
    };

    const scrollNode = scrollRef.current;
    if (scrollNode && target.measureLayout) {
      target.measureLayout(
        scrollNode as unknown as NativeMethods,
        (_x, y) => {
          scrollNode.scrollTo({ y: Math.max(0, y - 32), animated: false });
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              if (!cancelled) measureTarget();
            });
          });
        },
        measureTarget,
      );
    } else {
      measureTarget();
    }

    return () => {
      cancelled = true;
    };
  }, [scrollRef, stepIndex, targetRefs]);

  const handleNext = () => {
    if (stepIndex === REPORT_STEPS.length - 1) {
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
        totalSteps={REPORT_STEPS.length}
        targetRect={targetRect}
        onNext={handleNext}
        onBack={() => setStepIndex((current) => Math.max(0, current - 1))}
        onSkip={onFinish}
        onFinish={onFinish}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 100,
    elevation: 100,
  },
});
