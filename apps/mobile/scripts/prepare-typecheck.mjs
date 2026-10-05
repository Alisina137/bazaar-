import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const expoDir = resolve(scriptDir, "..", ".expo");

rmSync(expoDir, {
  recursive: true,
  force: true
});
