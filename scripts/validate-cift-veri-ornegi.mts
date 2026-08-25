import { readFile } from "node:fs/promises";
import { runNokta } from "../client/src/lib/noktaInterpreter.ts";

const source = await readFile(new URL("../ornek_cift_veri_isleme.nokta", import.meta.url), "utf8");
const result = runNokta(source);

if (!result.ok) {
  console.error(result.diagnostics);
  process.exit(1);
}

console.log(JSON.stringify({
  outputs: result.entries.filter((entry) => entry.tone === "output").map((entry) => entry.text),
  previews: result.previews.map((preview) => preview.title),
  steps: result.entries.filter((entry) => entry.tone === "step").length,
}, null, 2));
