import {
  PICTOGRAM_LIBRARY_VERSION,
  temperaturePictogramDataUrl,
  weatherPictogramDataUrl
} from "../../ui/pictogramLibrary";
import type { WeeklyComplementaryTheme, WeeklyComplementaryVisual } from "./complementarySlides";

export const WEEKLY_COMPLEMENTARY_PICTOGRAM_SOURCE = "LOKA_OFFICIAL_PICTOGRAM_LIBRARY" as const;

const ALLOWED_VISUALS: Record<WeeklyComplementaryTheme, readonly WeeklyComplementaryVisual[]> = {
  TEMPERATURE: ["THERMOMETER", "TREND"],
  WET_WEATHER: ["RAIN", "THUNDER", "TREND"],
  WIND: ["WIND", "TREND"],
  VISIBILITY: ["FOG"],
  LIGHT: ["SUN", "TREND"],
  OTHER: ["SUN", "TREND"]
};

/** The only complementary-slide pictogram resolver allowed before rendering. */
export function complementaryPictogramDataUrl(visual: WeeklyComplementaryVisual): string {
  if (visual === "THERMOMETER") return temperaturePictogramDataUrl("thermometer");
  if (visual === "RAIN") return weatherPictogramDataUrl("rain");
  if (visual === "WIND") return weatherPictogramDataUrl("wind");
  if (visual === "THUNDER") return weatherPictogramDataUrl("thunder");
  if (visual === "FOG") return weatherPictogramDataUrl("fog");
  if (visual === "SUN") return weatherPictogramDataUrl("sun");
  return weatherPictogramDataUrl("partly");
}

export function complementaryPictogramIsOfficial(
  theme: WeeklyComplementaryTheme,
  visual: WeeklyComplementaryVisual
): boolean {
  const url = complementaryPictogramDataUrl(visual);
  return ALLOWED_VISUALS[theme].includes(visual)
    && PICTOGRAM_LIBRARY_VERSION === "LOKA_PREMIUM_1.2"
    && url.startsWith("data:image/svg+xml;charset=utf-8,")
    && url.length > 200;
}

