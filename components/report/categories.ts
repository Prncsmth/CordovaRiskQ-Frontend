import { Ionicons } from "@expo/vector-icons";

export type CategoryId = "flood" | "fire" | "medical" | "road-accident" | "other";

export type Category = {
  id: CategoryId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
};

// Standalone hex values, deliberately not COLORS.* tokens: a category's
// identity color must not shift if an unrelated theme color is retuned later.
export const CATEGORIES: Category[] = [
  { id: "flood", label: "Flood", icon: "water", color: "#2F6FED" },
  { id: "fire", label: "Fire", icon: "flame", color: "#FF6B35" },
  { id: "medical", label: "Medical Emergency", icon: "medical", color: "#DC2626" },
  { id: "road-accident", label: "Road Accident", icon: "warning", color: "#B45309" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal", color: "#9CA3AF" },
];

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) {
    throw new Error(`Unknown category id: ${id}`);
  }
  return category;
}
