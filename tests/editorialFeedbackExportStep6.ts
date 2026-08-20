import {
  EDITORIAL_ACTIVE_VISUAL_FIELDS,
  EDITORIAL_ACTIVE_ENGAGEMENT_FIELDS,
  EDITORIAL_EXPORT_SCHEMA_VERSION,
  EDITORIAL_LEGACY_RETIRED_FIELDS,
  EDITORIAL_STORAGE_SCHEMA_VERSION,
  editorialExportFieldStatus
} from "../src/storage/editorialFeedbackExport";
import { enhanceInstagramWithEditorialExport } from "../src/ui/instagramEditorialExport";

let passed = 0;
function ok(value: boolean, label: string): void {
  if (!value) throw new Error(`EDITORIAL_EXPORT_STEP6_FAIL:${label}`);
  passed++;
}

ok(EDITORIAL_EXPORT_SCHEMA_VERSION === "1.2", "export_schema_1_2");
ok(EDITORIAL_STORAGE_SCHEMA_VERSION === "1.0", "storage_schema_stays_1_0");
ok(JSON.stringify(EDITORIAL_ACTIVE_VISUAL_FIELDS) === JSON.stringify(["primaryLine", "secondaryLine"]), "active_visual_fields");
ok(JSON.stringify(EDITORIAL_ACTIVE_ENGAGEMENT_FIELDS) === JSON.stringify(["engagementFormat", "engagementQuestion", "engagementOptionA", "engagementOptionB"]), "active_engagement_fields");
ok(JSON.stringify(EDITORIAL_LEGACY_RETIRED_FIELDS) === JSON.stringify(["subtitle"]), "legacy_retired_fields");
ok(editorialExportFieldStatus("subtitle") === "LEGACY_RETIRED", "subtitle_is_legacy");
ok(editorialExportFieldStatus("primaryLine") === "ACTIVE", "primary_is_active");
ok(editorialExportFieldStatus("secondaryLine") === "ACTIVE", "secondary_is_active");
ok(editorialExportFieldStatus("paragraph1") === "ACTIVE", "social_fields_remain_active");

const enhanced = enhanceInstagramWithEditorialExport(
  '<!doctype html><html><head></head><body><div class="editor-persistence"><button id="saveEditorialFeedback"></button></div></body></html>',
  "tarnos"
);
ok(enhanced.includes("ACTIVE / LEGACY_RETIRED"), "ui_explains_field_status");
ok(enhanced.includes("version:'1.2'"), "ui_export_version_1_2");
ok(enhanced.includes("editorial-feedback/export?city="), "endpoint_unchanged");
ok(!enhanced.includes("schemaVersion:'1.0'"), "ui_does_not_pin_old_schema");

if (passed !== 13) throw new Error(`editorial_export_step6_count_mismatch:${passed}`);
console.log(`EDITORIAL_EXPORT_STEP6 ${passed}/13 PASS`);
