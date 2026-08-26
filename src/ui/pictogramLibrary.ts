import type { HourlyCondition, VisualIcon } from "../types";

export type WeatherPictogramKind =
  | "sun"
  | "partly"
  | "cloud"
  | "rain"
  | "drizzle"
  | "thunder"
  | "wind"
  | "fog"
  | "snow"
  | "sun-wind"
  | "cloud-wind"
  | "rain-wind";

export type SolarPictogramKind = "dawn" | "sunrise" | "noon" | "sunset" | "dusk";

export const PICTOGRAM_LIBRARY_VERSION = "LOKA_PREMIUM_1.1" as const;

export const PICTOGRAM_STYLE = {
  ink: "#12264A",
  gold: "#FDB515",
  softWhite: "#FFFFFF",
  shadow: "#071B3B"
} as const;

export const OFFICIAL_WEATHER_PICTOGRAMS = [
  "sun", "partly", "cloud", "rain", "drizzle", "thunder",
  "wind", "fog", "snow", "sun-wind", "cloud-wind", "rain-wind"
] as const satisfies readonly WeatherPictogramKind[];

export const OFFICIAL_SOLAR_PICTOGRAMS = ["dawn", "sunrise", "noon", "sunset", "dusk"] as const satisfies readonly SolarPictogramKind[];

export function visualIconToPictogram(icon: VisualIcon): WeatherPictogramKind {
  switch (icon) {
    case "sun": return "sun";
    case "partly":
    case "veil":
    case "mixed": return "partly";
    case "cloud": return "cloud";
    case "fog": return "fog";
    case "wind": return "wind";
    case "rain":
    case "shower": return "rain";
    case "thunder": return "thunder";
    case "rain-wind": return "rain-wind";
    case "cloud-wind": return "cloud-wind";
    case "sun-wind": return "sun-wind";
  }
}

export function hourlyConditionToPictogram(condition: HourlyCondition): WeatherPictogramKind {
  switch (condition) {
    case "soleil": return "sun";
    case "peu nuageux":
    case "variable": return "partly";
    case "nuageux":
    case "couvert": return "cloud";
    case "brouillard": return "fog";
    case "vent": return "wind";
    case "averse":
    case "pluie": return "rain";
    case "orage": return "thunder";
  }
}

const CLOUD_PATH = `M -52 15
  C -58 8 -57 -3 -49 -10
  C -42 -17 -32 -19 -23 -16
  C -18 -35 -4 -48 15 -48
  C 33 -48 47 -36 50 -20
  C 59 -24 70 -21 77 -14
  C 86 -5 85 8 77 17
  C 71 24 63 27 52 27
  L -41 27
  C -46 27 -50 23 -52 15 Z`;

function lineShadow(path: string, strokeWidth = 6, transform = ""): string {
  return `<path d="${path}" transform="${transform} translate(0 3)" fill="none" stroke="${PICTOGRAM_STYLE.shadow}" stroke-opacity="0.14" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function cloud(cx = 80, cy = 58, scale = 1): string {
  const tr = `translate(${cx} ${cy}) scale(${scale})`;
  return `${lineShadow(CLOUD_PATH, 7, tr)}
    <path d="${CLOUD_PATH}" transform="${tr}" fill="${PICTOGRAM_STYLE.softWhite}" fill-opacity="0.16" stroke="${PICTOGRAM_STYLE.ink}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function sun(cx: number, cy: number, radius: number, accent = false): string {
  const stroke = accent ? PICTOGRAM_STYLE.gold : PICTOGRAM_STYLE.ink;
  const shadowStroke = accent ? "#8D6500" : PICTOGRAM_STYLE.shadow;
  const rays: string[] = [];
  const shadowRays: string[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (Math.PI / 4) * i;
    const x1 = cx + Math.cos(a) * (radius + 10);
    const y1 = cy + Math.sin(a) * (radius + 10);
    const x2 = cx + Math.cos(a) * (radius + 25);
    const y2 = cy + Math.sin(a) * (radius + 25);
    rays.push(`<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}"/>`);
    shadowRays.push(`<path d="M ${x1.toFixed(2)} ${(y1 + 3).toFixed(2)} L ${x2.toFixed(2)} ${(y2 + 3).toFixed(2)}"/>`);
  }
  return `<g fill="none" stroke="${shadowStroke}" stroke-opacity="0.14" stroke-width="6" stroke-linecap="round">
    <circle cx="${cx}" cy="${cy + 3}" r="${radius}"/>${shadowRays.join("")}
  </g>
  <g fill="none" stroke="${stroke}" stroke-width="4" stroke-linecap="round">
    <circle cx="${cx}" cy="${cy}" r="${radius}" fill="${PICTOGRAM_STYLE.softWhite}" fill-opacity="0.08"/>${rays.join("")}
  </g>`;
}

function dropPath(x: number, y: number, short: boolean): string {
  return short
    ? `M ${x} ${y} C ${x - 4} ${y + 6} ${x - 4} ${y + 11} ${x} ${y + 14} C ${x + 4} ${y + 11} ${x + 4} ${y + 6} ${x} ${y} Z`
    : `M ${x} ${y} C ${x - 6} ${y + 8} ${x - 6} ${y + 16} ${x} ${y + 21} C ${x + 6} ${y + 16} ${x + 6} ${y + 8} ${x} ${y} Z`;
}

function drops(xs: number[], y = 89, short = false): string {
  const paths = xs.map((x, i) => dropPath(x, y + (i % 2) * 2, short));
  return `<g fill="none" stroke="${PICTOGRAM_STYLE.shadow}" stroke-opacity="0.12" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 3)">${paths.map(p => `<path d="${p}"/>`).join("")}</g>
    <g fill="none" stroke="${PICTOGRAM_STYLE.ink}" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${paths.map(p => `<path d="${p}"/>`).join("")}</g>`;
}

function wind(cx = 80, cy = 58, scale = 1): string {
  const paths = `<path d="M -55 -20 H 20 C 38 -20 39 -40 24 -40 C 14 -40 9 -33 10 -27"/>
    <path d="M -55 0 H 38 C 55 0 56 21 40 21 C 29 21 24 14 25 8"/>
    <path d="M -38 22 H 7 C 23 22 24 42 9 42 C -1 42 -6 35 -5 29"/>`;
  return `<g transform="translate(${cx} ${cy + 3}) scale(${scale})" fill="none" stroke="${PICTOGRAM_STYLE.shadow}" stroke-opacity="0.13" stroke-width="6" stroke-linecap="round" stroke-linejoin="round">${paths}</g>
    <g transform="translate(${cx} ${cy}) scale(${scale})" fill="none" stroke="${PICTOGRAM_STYLE.ink}" stroke-width="4.2" stroke-linecap="round" stroke-linejoin="round">${paths}</g>`;
}

function fog(): string {
  const paths = `<path d="M 28 38 H 132"/><path d="M 38 55 H 122"/><path d="M 25 72 H 135"/><path d="M 43 89 H 117"/>`;
  return `<g transform="translate(0 3)" fill="none" stroke="${PICTOGRAM_STYLE.shadow}" stroke-opacity="0.12" stroke-width="6" stroke-linecap="round">${paths}</g>
    <g fill="none" stroke="${PICTOGRAM_STYLE.ink}" stroke-width="4.1" stroke-linecap="round">${paths}</g>`;
}

function snowflakes(): string {
  const one = (cx: number, cy: number) => `<g transform="translate(${cx} ${cy})"><path d="M -9 0 H 9 M 0 -9 V 9 M -6.4 -6.4 L 6.4 6.4 M -6.4 6.4 L 6.4 -6.4"/></g>`;
  const paths = `${one(55,96)}${one(80,101)}${one(105,96)}`;
  return `<g transform="translate(0 2.5)" stroke="${PICTOGRAM_STYLE.shadow}" stroke-opacity="0.12" stroke-width="5" stroke-linecap="round">${paths}</g>
    <g stroke="${PICTOGRAM_STYLE.ink}" stroke-width="3.2" stroke-linecap="round">${paths}</g>`;
}

function thunderBolt(): string {
  const p = `M 83 67 L 69 88 H 81 L 74 108 L 101 77 H 88 L 96 58 Z`;
  return `<path d="${p}" transform="translate(0 3)" fill="none" stroke="#8D6500" stroke-opacity="0.18" stroke-width="7" stroke-linejoin="round"/>
    <path d="${p}" fill="${PICTOGRAM_STYLE.gold}" fill-opacity="0.12" stroke="${PICTOGRAM_STYLE.gold}" stroke-width="4.2" stroke-linejoin="round"/>`;
}

export function weatherPictogramSvg(kind: WeatherPictogramKind): string {
  let body = "";
  switch (kind) {
    case "sun": body = sun(80, 57, 23, true); break;
    case "partly": body = `${sun(57, 40, 18, true)}${cloud(84, 64, 0.76)}`; break;
    case "cloud": body = cloud(80, 61, 0.82); break;
    case "rain": body = `${cloud(80, 50, 0.76)}${drops([55, 80, 105], 81, false)}`; break;
    case "drizzle": body = `${cloud(80, 50, 0.76)}${drops([80], 84, true)}`; break;
    case "thunder": body = `${cloud(80, 45, 0.76)}${thunderBolt()}<g stroke="${PICTOGRAM_STYLE.ink}" stroke-width="4" stroke-linecap="round"><path d="M 48 88 l -7 18"/><path d="M 118 88 l -7 18"/></g>`; break;
    case "wind": body = wind(80, 57, 0.88); break;
    case "fog": body = fog(); break;
    case "snow": body = `${cloud(80, 49, 0.76)}${snowflakes()}`; break;
    case "sun-wind": body = `${sun(51, 44, 17, true)}${wind(103, 65, 0.56)}`; break;
    case "cloud-wind": body = `${cloud(57, 47, 0.58)}${wind(108, 70, 0.50)}`; break;
    case "rain-wind": body = `${cloud(56, 41, 0.54)}${drops([45,60,75], 75, true)}${wind(111, 69, 0.45)}`; break;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="120" viewBox="0 0 160 120" fill="none">${body}</svg>`;
}

function solarRays(cx: number, cy: number, angles: number[], startR: number, endR: number): string {
  const lines = angles.map(a => {
    const x1 = cx + Math.cos(a) * startR, y1 = cy + Math.sin(a) * startR;
    const x2 = cx + Math.cos(a) * endR, y2 = cy + Math.sin(a) * endR;
    return `<path d="M ${x1.toFixed(2)} ${y1.toFixed(2)} L ${x2.toFixed(2)} ${y2.toFixed(2)}"/>`;
  }).join("");
  return `<g transform="translate(0 2)" stroke="#8D6500" stroke-opacity="0.15" stroke-width="5" stroke-linecap="round">${lines}</g>
    <g stroke="${PICTOGRAM_STYLE.gold}" stroke-width="3.2" stroke-linecap="round">${lines}</g>`;
}

export function solarPictogramSvg(kind: SolarPictogramKind): string {
  let body = "";
  if (kind === "noon") {
    body = `${sun(60, 44, 17, false)}${solarRays(60,44,Array.from({length:8},(_,i)=>i*Math.PI/4),27,37)}`;
  } else {
    const y = kind === "dawn" ? 58 : kind === "dusk" ? 60 : 55;
    const r = kind === "dawn" || kind === "dusk" ? 15 : 18;
    const angles = kind === "sunrise" || kind === "sunset" ? [-2.55,-2.06,-1.57,-1.08,-0.59] : [-2.25,-1.57,-0.89];
    const main = `<path d="M ${60-r} ${y} A ${r} ${r} 0 0 1 ${60+r} ${y}"/><path d="M 27 ${y} H 93"/>${kind==='sunrise'?`<path d="M 34 ${y+10} H 86 M 42 ${y+18} H 78"/>`:''}${kind==='sunset'?`<path d="M 34 ${y+10} H 86 M 44 ${y+18} H 76"/>`:''}${kind==='dusk'?`<path d="M 38 ${y+11} H 82"/>`:''}${kind==='dawn'?`<path d="M 42 ${y+11} H 78"/>`:''}`;
    body = `${solarRays(60,y,angles,r+7,r+17)}<g transform="translate(0 2.5)" fill="none" stroke="${PICTOGRAM_STYLE.shadow}" stroke-opacity="0.12" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">${main}</g><g fill="${PICTOGRAM_STYLE.softWhite}" fill-opacity="0.08" stroke="${PICTOGRAM_STYLE.ink}" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">${main}</g>`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="90" viewBox="0 0 120 90" fill="none">${body}</svg>`;
}

function toDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function weatherPictogramDataUrl(kind: WeatherPictogramKind): string {
  return toDataUrl(weatherPictogramSvg(kind));
}

export function solarPictogramDataUrl(kind: SolarPictogramKind): string {
  return toDataUrl(solarPictogramSvg(kind));
}
