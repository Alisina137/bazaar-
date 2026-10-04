import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const roots = [
  "apps/mobile/src/app",
  "apps/mobile/src/components/foundation",
  "apps/mobile/src/components/localization"
];

const rawTextPattern = /(?<!=)>\s*([A-Za-z][^<{\n]*?)\s*</g;
const rawPropPattern =
  /\b(?:title|description|message|label|accessibilityLabel|placeholder)\s*=\s*"[^"]*[A-Za-z][^"]*"/g;

async function collectTsx(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectTsx(target)));
    } else if (entry.isFile() && target.endsWith(".tsx")) {
      files.push(target);
    }
  }

  return files;
}

const failures = [];

for (const root of roots) {
  for (const file of await collectTsx(root)) {
    const source = await readFile(file, "utf8");

    for (const match of source.matchAll(rawTextPattern)) {
      failures.push(`${file}: raw JSX text "${match[1].trim()}"`);
    }

    for (const match of source.matchAll(rawPropPattern)) {
      failures.push(`${file}: raw user-facing prop "${match[0]}"`);
    }
  }
}

if (failures.length > 0) {
  process.stderr.write("Mobile localization verification failed:\n");
  for (const failure of failures) {
    process.stderr.write(`- ${failure}\n`);
  }
  process.exit(1);
}

process.stdout.write(
  "Mobile localization verification passed: no raw route/foundation user-facing English strings detected.\n"
);
