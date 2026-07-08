import React, { createContext, useContext, useMemo, useState } from "react";

type UserContextValue = {
  userName: string;
  setUserName: (name: string) => void;
};

const UserContext = createContext<UserContextValue | undefined>(undefined);

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [userName, setUserName] = useState("Guest");

  const value = useMemo(() => ({ userName, setUserName }), [userName]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser() {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }

  return context;
}
