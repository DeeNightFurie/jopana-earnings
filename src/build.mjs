/**
 * Generates index.html from src/template.html, injecting the rates straight out
 * of src/pricing.ts.
 *
 * pricing.ts is the same file the React component on jopana.in uses, so the two
 * can never quote different numbers. After a rate change, re-run:
 *
 *   node --experimental-strip-types src/build.mjs
 */
import { readFile, writeFile } from "node:fs/promises"
import { fileURLToPath } from "node:url"
import { dirname, join } from "node:path"

import { PROFESSIONS, DEFAULT_HOUR_PRESETS } from "./pricing.ts"

const here = dirname(fileURLToPath(import.meta.url))
const root = join(here, "..")

const template = await readFile(join(here, "template.html"), "utf8")

const payload = {
  professions: PROFESSIONS,
  defaultHourPresets: [...DEFAULT_HOUR_PRESETS],
}

const html = template
  .replace("__PRICING_DATA__", JSON.stringify(payload))
  .replace(/__GENERATED__/g, new Date().toISOString().slice(0, 10))

await writeFile(join(root, "index.html"), html, "utf8")

const specs = PROFESSIONS.flatMap((p) => p.specialities)
console.log(
  `index.html written — ${PROFESSIONS.length} professions, ${specs.length} specialities`
)
