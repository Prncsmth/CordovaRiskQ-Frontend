import { Platform } from "react-native";

// Soft floating-card shadow — the default depth for cards/rows across the app.
export const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },

  android: {
    elevation: 3,
  },

  default: {},
});

// Prominent depth for hero elements (SOS button glow, floating tab bar,
// active-state cards).
export const SHADOW_LG = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.12,
    shadowRadius: 20,
    shadowOffset: {
      width: 0,
      height: 8,
    },
  },

  android: {
    elevation: 6,
  },

  default: {},
});