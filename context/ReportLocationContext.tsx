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

  const value = useMemo(() => ({ location, setLocation }), [location]);

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
