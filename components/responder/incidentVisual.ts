import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/theme";

export type IncidentVisual = {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

// Maps an incident's free-text type (e.g. "Medical Emergency") to the same
// icon/color language used for citizen report categories, so a fire report
// looks the same to a responder as it did to the person who filed it.
export function getIncidentVisual(type: string): IncidentVisual {
  const t = type.toLowerCase();
  if (t.includes("fire")) return { icon: "flame", color: "#FF6B35" };
  if (t.includes("flood")) return { icon: "water", color: "#2F6FED" };
  if (t.includes("medical")) return { icon: "medkit", color: "#DC2626" };
  if (t.includes("road") || t.includes("accident")) {
    return { icon: "car-sport", color: "#B45309" };
  }
  return { icon: "alert-circle", color: COLORS.primary };
}
