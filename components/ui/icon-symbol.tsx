import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import type { StyleProp, TextStyle } from "react-native";

const iconMap = {
  "house.fill": "home",
  "map.fill": "map",
  "doc.text.fill": "description",
  "bell.fill": "notifications",
  "person.fill": "person",
  "paperplane.fill": "send",
} as const;

type IconName = keyof typeof iconMap;

type IconSymbolProps = {
  name: IconName | string;
  size?: number;
  color: string;
  style?: StyleProp<TextStyle>;
};

export function IconSymbol({ name, size = 24, color, style }: IconSymbolProps) {
  const resolvedName = (iconMap as Record<string, string>)[name] ?? name;

  return (
    <MaterialIcons
      name={resolvedName as never}
      size={size}
      color={color}
      style={style}
    />
  );
}
