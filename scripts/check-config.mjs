import fs from "node:fs";
const text = fs.readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8");
if (text.includes("REPLACE_WITH_YOUR_D1_DATABASE_ID")) {
  console.error("❌ Replace REPLACE_WITH_YOUR_D1_DATABASE_ID in wrangler.jsonc before deployment.");
  process.exit(1);
}
console.log("✅ wrangler.jsonc looks configured.");
