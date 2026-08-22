/**
 * Finds user-facing English copy that has not been routed through the
 * dictionary yet.
 *
 * Deliberately noisy in one direction: it would rather flag a className or an
 * aria-role than let a sentence ship untranslated, so entries are dismissed by
 * reading them, not by tightening the regex until the list is empty.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["src/app", "src/components", "src/lib"];
const SKIP_DIRS = new Set(["generated"]);
const SKIP_FILES = [/i18n\//, /\.d\.ts$/, /globals\.css$/];

/** Attributes whose values are machine-facing, never shown to a person. */
const TECH_ATTRS =
  /\b(className|class|href|src|id|key|type|name|role|rel|target|xmlns|viewBox|fill|stroke|d|method|action|htmlFor|scope|as|charSet|property|content|sizes|crossOrigin|encType|autoComplete|inputMode|spellCheck|data-[\w-]+)\s*=/;

function files(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (!SKIP_DIRS.has(entry)) out.push(...files(path));
    } else if (/\.tsx?$/.test(path)) {
      out.push(path);
    }
  }
  return out;
}

function stripNoise(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/import[\s\S]*?from\s*["'][^"']+["'];/g, "");
}

/** Two or more words, at least one of them 3+ letters: prose, not a token. */
const PROSE = /^(?=.*[A-Za-z]{3})[A-Z][A-Za-z0-9'’,.:;()%/&+-]*(?:\s+[A-Za-z0-9'’,.:;()%/&+$—–-]+){1,}$/;

const hits = [];
for (const root of ROOTS) {
  for (const file of files(root)) {
    if (SKIP_FILES.some((re) => re.test(file))) continue;
    const source = stripNoise(readFileSync(file, "utf8"));
    const lines = source.split("\n");

    lines.forEach((line, index) => {
      if (TECH_ATTRS.test(line)) return;

      // JSX text nodes
      for (const m of line.matchAll(/>([^<>{}][^<>{}]*)</g)) {
        const text = m[1].trim();
        if (PROSE.test(text)) hits.push({ file, line: index + 1, text, kind: "jsx" });
      }
      // Quoted strings
      for (const m of line.matchAll(/(["'])((?:(?!\1)[^\\])*)\1/g)) {
        const text = m[2].trim();
        if (PROSE.test(text)) hits.push({ file, line: index + 1, text, kind: "str" });
      }
    });
  }
}

const byFile = new Map();
for (const hit of hits) {
  if (!byFile.has(hit.file)) byFile.set(hit.file, []);
  byFile.get(hit.file).push(hit);
}

const sorted = [...byFile.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [file, list] of sorted) {
  console.log(`\n${file}  (${list.length})`);
  for (const hit of list.slice(0, 40)) {
    console.log(`  ${String(hit.line).padStart(4)}  ${hit.text.slice(0, 96)}`);
  }
}
console.log(`\nTOPLAM: ${hits.length} aday, ${byFile.size} dosya`);
