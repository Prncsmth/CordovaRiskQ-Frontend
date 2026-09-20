// context/ReportLocationContext.tsx
// Carries the emergency location pinned on the Evacuation Map tab (via its
// pin-drop toggle) over to the Report tab's Pinned Location card -- the two
// are sibling tabs, not parent/child, so a context is how the value crosses
// between them.
import React, { createContext, useContext, useMemo, useState } from "react";

export type ReportLocation = {
  address: string;
  latitude: number;
  longitude: number;
};

type ReportLocationContextValue = {
  location: ReportLocation | null;
  setLocation: (location: ReportLocation) => void;
  // Bumped by the Pinned Location card's "Change" button, read by the Map
  // tab to tell "the user just tapped Change again" apart from "this tab
  // merely regained focus." Route params turned out unreliable for this --
  // the Map tab is a persistent tab screen (never remounted between
  // visits), and expo-router doesn't reliably re-deliver fresh params to
  // an already-mounted tab screen the way a stack push would. Context
  // already crosses these two sibling tabs correctly (see the file
  // comment above), so it carries this signal too.
  changeRequestId: number;
  requestLocationChange: () => void;
};

const ReportLocationContext = createContext<
  ReportLocationContextValue | undefined
>(undefined);

export function ReportLocationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [location, setLocation] = useState<ReportLocation | null>(null);
  const [changeRequestId, setChangeRequestId] = useState(0);

  const value = useMemo(
    () => ({
      location,
      setLocation,
      changeRequestId,
      requestLocationChange: () => setChangeRequestId((id) => id + 1),
    }),
    [location, changeRequestId],
  );

  return (
    <ReportLocationContext.Provider value={value}>
      {children}
    </ReportLocationContext.Provider>
  );
}

export function useReportLocation() {
  const context = useContext(ReportLocationContext);

  if (!context) {
    throw new Error(
      "useReportLocation must be used within a ReportLocationProvider",
    );
  }

  return context;
}
