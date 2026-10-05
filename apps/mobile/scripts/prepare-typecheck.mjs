import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

const expoDir = fileURLToPath(new URL("../.expo", import.meta.url));

rmSync(expoDir, {
  recursive: true,
  force: true
});
