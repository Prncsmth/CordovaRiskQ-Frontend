import { Redirect } from "expo-router";

import { useAuth } from "@/context/AuthContext";
import { loggedOutStartRoute } from "@/utils/loggedOutStart";

// The first route the app opens -- including right after logout, since the
// root Stack remounts on every auth change. Welcome only the first time on
// this device, Login after that.
export default function AuthIndex() {
  const { hasSeenWelcome } = useAuth();
  return <Redirect href={loggedOutStartRoute(hasSeenWelcome)} />;
}
