// components/home/WeatherIcon.tsx
// Illustrated weather glyph for the Home tide card -- switches between sun,
// moon, cloud, and rain variants based on the backend's weatherDescription
// (one of a fixed set of strings from deriveWeatherDescription) and time of
// day, since a sun icon at night would be misleading. Daytime clear/partly
// cloudy skies plus cloudy and both rain kinds use the illustrated PNGs in
// assets/images/weather; the night sun/moon variants have no illustrated
// counterpart, so they keep the SVG glyph below.
import React from "react";
import { Image, type ImageSourcePropType } from "react-native";
import Svg, {
  Circle,
  Defs,
  G,
  LinearGradient,
  Rect,
  Stop,
} from "react-native-svg";

export type WeatherKind = "clear" | "partly-cloudy" | "cloudy" | "light-rain" | "heavy-rain";

type WeatherIconProps = {
  weatherDescription: string;
  isNight: boolean;
  size?: number;
};

const KIND_BY_DESCRIPTION: Record<string, WeatherKind> = {
  "Clear skies": "clear",
  "Partly cloudy": "partly-cloudy",
  Cloudy: "cloudy",
  "Light rain": "light-rain",
  "Heavy rain": "heavy-rain",
};

const ILLUSTRATION_BY_KIND: Record<WeatherKind, ImageSourcePropType> = {
  clear: require("@/assets/images/weather/sunny.png"),
  "partly-cloudy": require("@/assets/images/weather/partly-cloudy.png"),
  cloudy: require("@/assets/images/weather/cloudy.png"),
  "light-rain": require("@/assets/images/weather/rainy.png"),
  "heavy-rain": require("@/assets/images/weather/rainy.png"),
};

export function getWeatherKind(weatherDescription: string): WeatherKind {
  return KIND_BY_DESCRIPTION[weatherDescription] ?? "cloudy";
}

// Sky-gradient backdrop for the Home tide card, keyed by the same weather
// kind as the icon above plus time of day -- kept as fixed hex pairs rather
// than theme tokens since these represent the sky itself, not an app-theme
// surface, and shouldn't shift between light/dark app mode.
const GRADIENT_BY_KIND: Record<WeatherKind, readonly [string, string]> = {
  clear: ["#5AA9DE", "#3E86C4"],
  "partly-cloudy": ["#4E86C4", "#3568A0"],
  cloudy: ["#3E6FA8", "#2A527F"],
  "light-rain": ["#3C5470", "#263647"],
  "heavy-rain": ["#3A4658", "#20262F"],
};

const NIGHT_GRADIENT_BY_KIND: Partial<Record<WeatherKind, readonly [string, string]>> = {
  clear: ["#2A2F72", "#1B1E52"],
  "partly-cloudy": ["#2C3868", "#1E2650"],
  cloudy: ["#2A3F5C", "#1C2C42"],
};

export function getWeatherGradient(kind: WeatherKind, isNight: boolean): readonly [string, string] {
  if (isNight) {
    return NIGHT_GRADIENT_BY_KIND[kind] ?? GRADIENT_BY_KIND[kind];
  }
  return GRADIENT_BY_KIND[kind];
}

export default function WeatherIcon({ weatherDescription, isNight, size = 34 }: WeatherIconProps) {
  const kind = getWeatherKind(weatherDescription);

  const isNightSky = isNight && (kind === "clear" || kind === "partly-cloudy");
  if (!isNightSky) {
    return (
      <Image
        source={ILLUSTRATION_BY_KIND[kind]}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    );
  }

  // Only night clear/partly-cloudy reach here (the moon glyph).
  const showCloud = kind === "partly-cloudy";

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="rq-moon" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E8EAF6" />
          <Stop offset="1" stopColor="#B0BEC5" />
        </LinearGradient>
        <LinearGradient id="rq-cloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D7DEE6" />
        </LinearGradient>
      </Defs>

      <Circle cx="40" cy="22" r="12" fill="url(#rq-moon)" />

      {showCloud && (
        <G>
          <Circle cx="23" cy="38" r="11" fill="url(#rq-cloud)" />
          <Circle cx="35" cy="33" r="14" fill="url(#rq-cloud)" />
          <Circle cx="47" cy="39" r="9.5" fill="url(#rq-cloud)" />
          <Rect x="13" y="38" width="43" height="16" rx="8" fill="url(#rq-cloud)" />
        </G>
      )}
    </Svg>
  );
}
