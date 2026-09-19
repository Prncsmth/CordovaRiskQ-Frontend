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

import { useAuth } from "./AuthContext";
import * as authStorage from "./authStorage";

const TOUR_COMPLETED_KEY = "tour_completed_users";

export type TourTargetId =
  | "sos"
  | "notifications"
  | "alerts"
  | "evacuation"
  | "map"
  | "report"
  | "history"
  | "profile"
  // Responder-side tab bar anchors (components/responder/ResponderTabBar.tsx)
  // -- kept as distinct names from the citizen ids above even though only
  // one set is ever mounted at a time (role-based routing), so the target
  // registry never has to reason about which role a shared name belongs to.
  | "responder-dashboard"
  | "responder-live-map"
  | "responder-notifications"
  | "responder-settings";

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
// type contract itself. Its first param is typed `any` rather than
// NativeMethods on purpose: different host components (View, ScrollView,
// TouchableOpacity) each declare a different, narrower type for this
// argument depending on RN version (e.g. NativeMethods vs
// ReactNativeElement), and this type only needs to describe "some ref
// I'll cast at the call site" -- pinning it to any one of those would make
// Measurable stop structurally matching the others.
export type Measurable = {
  measureInWindow: (
    callback: (x: number, y: number, width: number, height: number) => void,
  ) => void;
  measureLayout?: (
    relativeToNativeNode: any,
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
    id: "notifications",
    title: "Notifications",
    body: "Tap the bell to see updates on your reports, alerts, and announcements.",
    targetId: "notifications",
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

// Shown once to a responder account the first time it reaches the
// Dashboard -- see notifyHomeReady's role branch below. Walks the 4-tab
// responder nav (app/responder/(tabs)/) rather than in-page content, the
// same navigation-first approach TOUR_STEPS above takes for citizens.
export const RESPONDER_TOUR_STEPS: TourStepConfig[] = [
  {
    id: "responder-welcome",
    title: "Welcome, Responder",
    body: "This app shows you active incidents, their locations, and lets you coordinate your response -- all in one place.",
    targetId: null,
  },
  {
    id: "responder-dashboard",
    title: "Dashboard",
    body: "See active incidents grouped by barangay, with the nearest ones to you called out first.",
    targetId: "responder-dashboard",
  },
  {
    id: "responder-live-map",
    title: "Live Map",
    body: "See every active incident on a live map, along with your own current location.",
    targetId: "responder-live-map",
  },
  {
    id: "responder-notifications",
    title: "Notifications",
    body: "Get notified when a new incident needs a response, and see updates on ones you've joined.",
    targetId: "responder-notifications",
  },
  {
    id: "responder-settings",
    title: "Settings",
    body: "Manage your account, notification preferences, and view your completed incidents here.",
    targetId: "responder-settings",
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
  // True once the persisted completedMap has resolved for the current user
  // id (see the loader effect below). Citizens don't need this -- a fresh
  // account's id can never already be in the map, so notifyHomeReady's
  // mount-time call is correct whether or not the load has resolved yet.
  // Responders have no "fresh account" concept to lean on the same way
  // (see notifyHomeReady's role branch), so a RETURNING responder needs the
  // real persisted value, not the transient empty map the state starts as
  // -- DashboardScreen waits for this before calling notifyHomeReady().
  isCompletedMapLoaded: boolean;
};

const TourContext = createContext<TourContextValue | undefined>(undefined);

export function TourProvider({ children }: { children: React.ReactNode }) {
  const { user, isFreshAccount, clearFreshAccount } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>({});
  const [isCompletedMapLoaded, setIsCompletedMapLoaded] = useState(false);
  const [layoutTick, setLayoutTick] = useState(0);
  // The step list for the account currently logged in -- steps/next/back all
  // read this instead of TOUR_STEPS directly, so a responder's shorter list
  // doesn't get clamped against the citizen list's length (or vice versa).
  const activeSteps = user?.role === "responder" ? RESPONDER_TOUR_STEPS : TOUR_STEPS;
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
    // Resetting internal state when the id this load is keyed to changes --
    // same pattern/justification as ResponderAlertContext's reset-on-logout.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsCompletedMapLoaded(false);

    authStorage
      .getItem(TOUR_COMPLETED_KEY)
      .then((raw) => {
        if (cancelled) return;
        setCompletedMap(raw ? JSON.parse(raw) : {});
        setIsCompletedMapLoaded(true);
      })
      .catch(() => {
        if (cancelled) return;
        setCompletedMap({});
        setIsCompletedMapLoaded(true);
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
    setCurrentStep((step) => Math.min(step + 1, activeSteps.length - 1));
  }, [activeSteps]);

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

  // Called once by home.tsx on mount (citizen), and by DashboardScreen once
  // isCompletedMapLoaded is true (responder -- see that field's own doc
  // comment for why responders need to wait for the real persisted value
  // instead of firing at mount like the citizen path does).
  //
  // Citizens only ever see this right after finishing registration
  // (isFreshAccount) -- there's no equivalent "just registered" moment for
  // a responder account (provisioned by an admin, not self-registered), so
  // responders instead see it the first time their account has never
  // completed it before, full stop.
  const notifyHomeReady = useCallback(() => {
    if (!user || completedMap[user.id]) return;

    const shouldShow =
      user.role === "citizen" ? isFreshAccount : user.role === "responder";

    if (shouldShow) {
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
      steps: activeSteps,
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
      isCompletedMapLoaded,
    }),
    [
      isVisible,
      currentStep,
      activeSteps,
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
      isCompletedMapLoaded,
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
