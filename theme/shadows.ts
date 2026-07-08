import { Platform } from "react-native";

export const SHADOW = Platform.select({
  ios: {
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 3,
    },
  },

  android: {
    elevation: 4,
  },

  default: {},
});