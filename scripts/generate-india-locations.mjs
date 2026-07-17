// Generates src/data/india-locations.json from the country-state-city package.
// Run manually if the package is updated: node scripts/generate-india-locations.mjs
// Keeping only India avoids bundling the package's ~8 MB worldwide city database.
import { State, City } from "country-state-city";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const states = State.getStatesOfCountry("IN").map((s) => ({
  name: s.name,
  isoCode: s.isoCode,
  cities: City.getCitiesOfState("IN", s.isoCode).map((c) => c.name),
}));

const outDir = join(root, "src", "data");
mkdirSync(outDir, { recursive: true });
const outFile = join(outDir, "india-locations.json");
writeFileSync(outFile, JSON.stringify(states));
console.log(`Wrote ${states.length} states to ${outFile}`);
