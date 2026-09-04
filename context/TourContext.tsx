// context/TourContext.tsx
// Drives the first-time-user guide (5-step spotlight tour) shown once after
// a fresh registration reaches the Homepage. State lives here, following
// the same pattern as AuthContext/SosContext; the actual overlay UI is a
// separate global component (components/tour/FirstTimeGuideOverlay.tsx)
// that reads this context, mounted in app/_layout.tsx the same way
// SosOverlay is.
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type { NativeMethods } from "react-native";

import { useAuth } from "./AuthContext";
import * as authStorage from "./authStorage";

const TOUR_COMPLETED_KEY = "tour_completed_users";

export type TourTargetId =
  | "sos"
  | "alerts"
  | "evacuation"
  | "map"
  | "report"
  | "history"
  | "profile";

export type TourStepConfig = {
  id: string;
  title: string;
  body: string;
  targetId: TourTargetId | null;
};

// Minimal structural type for the anchor refs: any native component ref
// (View, TouchableOpacity, ...) that exposes measureInWindow satisfies
// this, so anchors in different components don't need matching ref types.
// measureLayout is optional -- used to scroll an anchor into view relative
// to a registered scroll container before the final measureInWindow call;
// every real RN host component has it, but it's not load-bearing for the
// type contract itself.
export type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  measureLayout?: (
    relativeToNativeNode: number | NativeMethods,
    onSuccess: (x: number, y: number, width: number, height: number) => void,
    onFail?: () => void,
  ) => void;
};

// The one scrollable container (Home's ScrollView) that anchors may live
// inside. Registered separately from the id-keyed target registry since
// there's exactly one of it, app-wide, at any time.
export type ScrollContainer = {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
};

export const TOUR_STEPS: TourStepConfig[] = [
  {
    id: "welcome",
    title: "Welcome to Cordova RiskQ",
    body: "This app helps you request emergency assistance, receive alerts, and find evacuation information — all in one place.",
    targetId: null,
  },
  {
    id: "emergency",
    title: "Emergency Request",
    body: "Slide this button to send an emergency request with your live location to responders.",
    targetId: "sos",
  },
  {
    id: "alerts",
    title: "Alerts & Advisories",
    body: "Important emergency announcements and safety advisories for your area show up here.",
    targetId: "alerts",
  },
  {
    id: "evacuation",
    title: "Evacuation Centers & Map",
    body: "See nearby evacuation centers, their status, and get directions.",
    targetId: "evacuation",
  },
  {
    id: "profile",
    title: "Profile & Settings",
    body: "Update your phone number, manage notifications, and adjust your account settings here.",
    targetId: "profile",
  },
  {
    id: "map",
    title: "Map",
    body: "View locations and nearby areas that may help you plan your next move.",
    targetId: "map",
  },
  {
    id: "report",
    title: "Report an Incident",
    body: "Use this button to quickly report an incident to the response team.",
    targetId: "report",
  },
  {
    id: "history",
    title: "Report History",
    body: "Review the emergency reports you have submitted and their updates.",
    targetId: "history",
  },
];

type TourContextValue = {
  isVisible: boolean;
  currentStep: number;
  steps: TourStepConfig[];
  next: () => void;
  back: () => void;
  skip: () => void;
  finish: () => void;
  startManualTour: () => void;
  notifyHomeReady: () => void;
  registerTarget: (
    id: TourTargetId,
    ref: React.RefObject<Measurable | null>,
  ) => void;
  unregisterTarget: (
    id: TourTargetId,
    ref: React.RefObject<Measurable | null>,
  ) => void;
  getTargetRef: (
    id: TourTargetId,
  ) => React.RefObject<Measurable | null> | undefined;
  registerScrollContainer: (
    ref: React.RefObject<ScrollContainer | null>,
  ) => void;
  unregisterScrollContainer: (
    ref: React.RefObject<ScrollContainer | null>,
  ) => void;
  getScrollContainer: () => React.RefObject<ScrollContainer | null> | null;
  // Bumped whenever any registered anchor's onLayout fires, so the overlay
  // can re-measure the current step's target when layout shifts (async
  // data loading above it, orientation change, etc.), not just on step
  // change.
  layoutTick: number;
  notifyTargetLayout: () => void;
};

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user, isFreshAccount, clearFreshAccount } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [layoutTick, setLayoutTick] = useState(0);
  const targetsRef = useRef(
    new Map<TourTargetId, React.RefObject<Measurable | null>>(),
  );
  const scrollContainerRef =
    useRef<React.RefObject<ScrollContainer | null> | null>(null);

  // Loads whatever was persisted for the current user id. A brand-new
  // account's id can never already be a key in this map, so it's safe for
  // notifyHomeReady() (Step below) to be called before this load resolves --
  // "not yet loaded" and "loaded, but absent" both correctly mean "not
  // completed" for a fresh account.
  useEffect(() => {
    let cancelled = false;

    authStorage
      .getItem(TOUR_COMPLETED_KEY)
      .then((raw) => {
        if (cancelled) return;
        setCompletedMap(raw ? JSON.parse(raw) : {});
      })
      .catch(() => {
        if (!cancelled) setCompletedMap({});
      });

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const completeTour = useCallback(() => {
    if (user) {
      setCompletedMap((prev) => {
        const nextMap = { ...prev, [user.id]: true };
        authStorage
          .setItem(TOUR_COMPLETED_KEY, JSON.stringify(nextMap))
          .catch(() => {});
        return nextMap;
      });
    }
    clearFreshAccount();
    setIsVisible(false);
  }, [user, clearFreshAccount]);

  const next = useCallback(() => {
    setCurrentStep((step) => Math.min(step + 1, TOUR_STEPS.length - 1));
  }, []);

  const back = useCallback(() => {
    setCurrentStep((step) => Math.max(step - 1, 0));
  }, []);

  // skip() and finish() are the same completion path -- kept as distinct
  // names in the API since they're semantically different exits (in case
  // step-level analytics differentiate them later; not in scope now).
  const skip = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const finish = useCallback(() => {
    completeTour();
  }, [completeTour]);

  // Settings -> "View App Tutorial": ignores completedMap entirely, always
  // shows. Does not touch isFreshAccount or the persisted map on entry --
  // only completeTour() (skip/finish) does, same as the auto-triggered path.
  const startManualTour = useCallback(() => {
    setCurrentStep(0);
    setIsVisible(true);
  }, []);

  // Called once by home.tsx on mount. In development, always show the guide
  // so it can be previewed without creating a fresh account each time. A
  // production build keeps the normal first-registration behavior.
  const notifyHomeReady = useCallback(() => {
    const shouldShowForFreshAccount =
      user?.role === "citizen" && isFreshAccount && !completedMap[user.id];

    if (shouldShowForFreshAccount) {
      setCurrentStep(0);
      setIsVisible(true);
    }
  }, [user, isFreshAccount, completedMap]);

  const registerTarget = useCallback(
    (id: TourTargetId, ref: React.RefObject<Measurable | null>) => {
      targetsRef.current.set(id, ref);
    },
    [],
  );

  // Only deletes if this exact ref is still the registered one -- guards
  // against a duplicate-mount race (e.g. Settings' manual replay pushing a
  // second Home instance) where an older instance's unmount cleanup would
  // otherwise delete a newer, still-live registration.
  const unregisterTarget = useCallback(
    (id: TourTargetId, ref: React.RefObject<Measurable | null>) => {
      if (targetsRef.current.get(id) === ref) {
        targetsRef.current.delete(id);
      }
    },
    [],
  );

  const getTargetRef = useCallback(
    (id: TourTargetId) => targetsRef.current.get(id),
    [],
  );

  const registerScrollContainer = useCallback(
    (ref: React.RefObject<ScrollContainer | null>) => {
      scrollContainerRef.current = ref;
    },
    [],
  );

  const unregisterScrollContainer = useCallback(
    (ref: React.RefObject<ScrollContainer | null>) => {
      if (scrollContainerRef.current === ref) {
        scrollContainerRef.current = null;
      }
    },
    [],
  );

  const getScrollContainer = useCallback(() => scrollContainerRef.current, []);

  const notifyTargetLayout = useCallback(() => {
    setLayoutTick((tick) => tick + 1);
  }, []);

  const value = useMemo<TourContextValue>(
    () => ({
      isVisible,
      currentStep,
      steps: TOUR_STEPS,
      next,
      back,
      skip,
      finish,
      startManualTour,
      notifyHomeReady,
      registerTarget,
      unregisterTarget,
      getTargetRef,
      registerScrollContainer,
      unregisterScrollContainer,
      getScrollContainer,
      layoutTick,
      notifyTargetLayout,
    }),
    [
      isVisible,
      currentStep,
      next,
      back,
      skip,
      finish,
      startManualTour,
      notifyHomeReady,
      registerTarget,
      unregisterTarget,
      getTargetRef,
      registerScrollContainer,
      unregisterScrollContainer,
      getScrollContainer,
      layoutTick,
      notifyTargetLayout,
    ],
  );

  return <TourContext.Provider value={value}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);

  if (!context) {
    throw new Error("useTour must be used within a TourProvider");
  }

  return context;
}
