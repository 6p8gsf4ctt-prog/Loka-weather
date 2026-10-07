import {
  PICTOGRAM_LIBRARY_VERSION,
  moonPictogramSvg,
  type MoonPictogramKind
} from "../src/ui/pictogramLibrary";

function ok(value: unknown, label: string): asserts value {
  if (!value) throw new Error(`LUNAR_PICTOGRAM_LIBRARY_FAIL:${label}`);
}

const phases: readonly MoonPictogramKind[] = [
  "NEW_MOON",
  "WAXING_CRESCENT",
  "FIRST_QUARTER",
  "WAXING_GIBBOUS",
  "FULL_MOON",
  "WANING_GIBBOUS",
  "LAST_QUARTER",
  "WANING_CRESCENT"
];

ok(PICTOGRAM_LIBRARY_VERSION === "LOKA_PREMIUM_1.3", "version_1_3");

for (const phase of phases) {
  const svg = moonPictogramSvg(phase);
  ok(svg.startsWith("<svg") && svg.endsWith("</svg>"), `${phase}_valid_svg`);
  ok(svg.includes('width="160" height="120" viewBox="0 0 160 120"'), `${phase}_canonical_canvas`);
  ok(svg.includes('fill="#D3D9E3"'), `${phase}_lunar_dark_surface`);
  ok(svg.includes('stroke="#12264A" stroke-width="4.2"'), `${phase}_canonical_outline`);
  ok(svg.includes('stroke="#071B3B" stroke-opacity="0.13" stroke-width="6"'), `${phase}_canonical_shadow`);
  ok(!svg.includes("#FDB515"), `${phase}_has_no_gold`);
}

const newMoon = moonPictogramSvg("NEW_MOON");
ok(!newMoon.includes('fill="#FFFFFF"'), "new_moon_has_no_lit_surface");
ok(!newMoon.includes("clipPath"), "new_moon_has_no_lit_clip");

const fullMoon = moonPictogramSvg("FULL_MOON");
ok(fullMoon.includes('<circle cx="80" cy="60" r="35" fill="#FFFFFF"/>'), "full_moon_is_fully_lit");
ok(fullMoon.includes('stroke-opacity="0.15" stroke-width="2"'), "full_moon_craters_are_subtle");

ok(
  moonPictogramSvg("WAXING_CRESCENT").includes("A25 35 0 0 0 80 25"),
  "waxing_crescent_orientation"
);
ok(
  moonPictogramSvg("WANING_CRESCENT").includes("A25 35 0 0 1 80 25"),
  "waning_crescent_orientation"
);

console.log("LUNAR_PICTOGRAM_LIBRARY_OK");
