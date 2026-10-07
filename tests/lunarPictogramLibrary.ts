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

ok(PICTOGRAM_LIBRARY_VERSION === "LOKA_PREMIUM_1.4", "version_1_4");

for (const phase of phases) {
  const svg = moonPictogramSvg(phase);
  ok(svg.startsWith("<svg") && svg.endsWith("</svg>"), `${phase}_valid_svg`);
  ok(svg.includes('width="160" height="120" viewBox="0 0 160 120"'), `${phase}_canonical_canvas`);
  ok(svg.includes('stop-color="#E3E8F0"'), `${phase}_lunar_dark_surface`);
  ok(svg.includes('stroke="#12264A" stroke-width="4.2"'), `${phase}_canonical_outline`);
  ok(svg.includes('stroke="#071B3B" stroke-opacity="0.07" stroke-width="4.5"'), `${phase}_subtle_shadow`);
  ok(!svg.includes("clipPath"), `${phase}_has_no_crater_clip`);
}

const newMoon = moonPictogramSvg("NEW_MOON");
ok(!newMoon.includes('fill="url(#loka-moon-lit)"'), "new_moon_has_no_lit_surface");
ok(!newMoon.includes('stroke="#FDB515" stroke-width="3.8" stroke-linecap="round"><path'), "new_moon_has_no_gold_marker");

const fullMoon = moonPictogramSvg("FULL_MOON");
ok(fullMoon.includes('<circle cx="80" cy="60" r="39" fill="url(#loka-moon-lit)"/>'), "full_moon_is_fully_lit");
ok(fullMoon.includes('M73 21.6 A39 39 0 0 1 87 21.6'), "full_moon_top_marker");

ok(
  moonPictogramSvg("WAXING_CRESCENT").includes("A22 39 0 0 0 80 21"),
  "waxing_crescent_is_enlarged_and_oriented"
);
ok(
  moonPictogramSvg("WANING_CRESCENT").includes("A22 39 0 0 1 80 21"),
  "waning_crescent_is_enlarged_and_oriented"
);

ok(moonPictogramSvg("FIRST_QUARTER").includes("M80 21 V99"), "first_quarter_terminator");
ok(moonPictogramSvg("LAST_QUARTER").includes("M80 21 V99"), "last_quarter_terminator");
ok(moonPictogramSvg("WAXING_GIBBOUS").includes("A19 39 0 0 1 80 21"), "waxing_gibbous_geometry");
ok(moonPictogramSvg("WANING_GIBBOUS").includes("A19 39 0 0 0 80 21"), "waning_gibbous_geometry");

console.log("LUNAR_PICTOGRAM_LIBRARY_OK");
