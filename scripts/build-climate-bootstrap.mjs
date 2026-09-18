import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createGunzip } from "node:zlib";
import { createInterface } from "node:readline";

const input = process.argv[2];
const output = process.argv[3];
if (!input || !output) throw new Error("usage: node scripts/build-climate-bootstrap.mjs INPUT.csv.gz OUTPUT.json");

const stationId = "64024001";
const rows = [];
let headers = null;
const finite = (value) => value === undefined || value === "" ? null : Number.isFinite(Number(value)) ? Number(value) : null;

const lines = createInterface({ input: createReadStream(input).pipe(createGunzip()), crlfDelay: Infinity });
for await (const line of lines) {
  if (!headers) { headers = line.replace(/^\uFEFF/, "").split(";"); continue; }
  if (!line.startsWith(`${stationId};`)) continue;
  const values = line.split(";");
  const value = (name) => values[headers.indexOf(name)] ?? "";
  const rawDate = value("AAAAMMJJ").replace(/[^0-9]/g, "");
  if (rawDate.length !== 8) continue;
  rows.push([
    `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`,
    finite(value("TN")), finite(value("TX")), finite(value("RR")), finite(value("FXI3S")),
    finite(value("QTN")), finite(value("QTX")), finite(value("QRR")), finite(value("QFXI3S"))
  ]);
}

if (rows.length < 20_000) throw new Error(`climate_bootstrap_incomplete:${rows.length}`);
const payload = {
  version: 1,
  stationId,
  sourceTitle: "QUOT_departement_64_periode_1950-2024_RR-T-Vent",
  sourceUrl: "https://meteofrance.s3.sbg.io.cloud.ovh.net/data/synchro_ftp/BASE/QUOT/Q_64_previous-1950-2024_RR-T-Vent.csv.gz",
  sourceLastModified: "2026-08-02T02:28:48+00:00",
  firstDate: rows[0][0],
  lastDate: rows.at(-1)[0],
  rowCount: rows.length,
  rows
};
await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(payload));
console.log(`CLIMATE_BOOTSTRAP ${rows.length} ${payload.firstDate} ${payload.lastDate}`);
