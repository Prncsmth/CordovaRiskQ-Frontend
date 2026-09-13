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
  { id: "medical", label: "Medical Emergency", icon: "medkit", color: "#DC2626" },
  { id: "road-accident", label: "Road Accident", icon: "car-sport", color: "#B45309" },
  { id: "other", label: "Other", icon: "ellipsis-horizontal-circle", color: "#6B7280" },
];

// Tappable starter phrases shown above the Details input once a category is
// picked -- gives a quick starting point instead of a blank textarea.
export const DETAIL_SUGGESTIONS: Record<CategoryId, string[]> = {
  flood: ["Flooding on the road", "Water is rising", "Road is impassable"],
  fire: ["Fire spreading", "Heavy smoke", "House is on fire"],
  medical: ["Person is injured", "Person needs medical help", "Unconscious person"],
  "road-accident": ["Vehicle collision", "Person is injured", "Road is blocked"],
  other: ["Emergency situation", "Need immediate assistance", "Area is unsafe"],
};

export function getCategory(id: CategoryId): Category {
  const category = CATEGORIES.find((c) => c.id === id);
  if (!category) {
    throw new Error(`Unknown category id: ${id}`);
  }
  return category;
}

// Maps a stored category (a CategoryId, plus "sos" for SOS-sourced
// incidents) to its display label. Shared by citizen report history and
// responder incident screens so both read the same category → label mapping.
export const CATEGORY_LABELS: Record<string, string> = {
  ...Object.fromEntries(CATEGORIES.map((c) => [c.id, c.label])),
  sos: "SOS Alert",
};
