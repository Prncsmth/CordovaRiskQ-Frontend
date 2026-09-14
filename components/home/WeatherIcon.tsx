// components/home/WeatherIcon.tsx
// Illustrated weather glyph for the Home tide card -- switches between sun,
// moon, cloud, and rain variants based on the backend's weatherDescription
// (one of a fixed set of strings from deriveWeatherDescription) and time of
// day, since a sun icon at night would be misleading.
import React from "react";
import Svg, {
  Circle,
  Defs,
  G,
  Line,
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

  const showSun = (kind === "clear" || kind === "partly-cloudy") && !isNight;
  const showMoon = (kind === "clear" || kind === "partly-cloudy") && isNight;
  const showCloud = kind !== "clear";
  const rainDropCount = kind === "heavy-rain" ? 3 : kind === "light-rain" ? 2 : 0;

  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Defs>
        <LinearGradient id="rq-sun" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FFE082" />
          <Stop offset="1" stopColor="#FFA726" />
        </LinearGradient>
        <LinearGradient id="rq-moon" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#E8EAF6" />
          <Stop offset="1" stopColor="#B0BEC5" />
        </LinearGradient>
        <LinearGradient id="rq-cloud" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFFFFF" />
          <Stop offset="1" stopColor="#D7DEE6" />
        </LinearGradient>
      </Defs>

      {showSun && (
        <G>
          {/* Sun rays -- only the top/right ones, since the cloud covers the rest */}
          <G stroke="#FFB300" strokeWidth={2.5} strokeLinecap="round" opacity={0.85}>
            <Line x1="40" y1="4" x2="40" y2="10" />
            <Line x1="57" y1="10" x2="52.5" y2="14.5" />
            <Line x1="62" y1="24" x2="55.5" y2="24" />
          </G>
          <Circle cx="40" cy="24" r="13" fill="url(#rq-sun)" />
        </G>
      )}

      {showMoon && <Circle cx="40" cy="22" r="12" fill="url(#rq-moon)" />}

      {showCloud && (
        <G>
          <Circle cx="23" cy="38" r="11" fill="url(#rq-cloud)" />
          <Circle cx="35" cy="33" r="14" fill="url(#rq-cloud)" />
          <Circle cx="47" cy="39" r="9.5" fill="url(#rq-cloud)" />
          <Rect x="13" y="38" width="43" height="16" rx="8" fill="url(#rq-cloud)" />
        </G>
      )}

      {rainDropCount > 0 && (
        <G stroke="#4FC3F7" strokeWidth={3} strokeLinecap="round">
          <Line x1="22" y1="57" x2="19" y2="62" />
          <Line x1="34" y1="57" x2="31" y2="62" />
          {rainDropCount >= 3 && <Line x1="46" y1="57" x2="43" y2="62" />}
        </G>
      )}
    </Svg>
  );
}
