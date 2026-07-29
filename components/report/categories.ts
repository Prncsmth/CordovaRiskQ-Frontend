import { Ionicons } from "@expo/vector-icons";

import { COLORS } from "@/theme";

export type CategoryId = "flood" | "fire" | "medical" | "road-accident" | "other";

export type Category = {
  id: CategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

export const CATEGORIES: Category[] = [
  { id: "flood", label: "Flood", icon: "water", color: "#2F6FED" },
  { id: "fire", label: "Fire", icon: "flame", color: COLORS.secondary },
  { id: "medical", label: "Medical Emergency", icon: "medical", color: COLORS.danger },
  { id: "road-accident", label: "Road Accident", icon: "warning", color: COLORS.warning },
  { id: "other", label: "Other", icon: "ellipsis-horizontal", color: COLORS.gray },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) {
    throw new Error(`Unknown category id: ${id}`);
  }
  return category;
}
