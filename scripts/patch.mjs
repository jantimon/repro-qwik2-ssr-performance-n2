// Makes vNodeData_createSsrNodeReference resume its scan of a vNodeData array where the
// previous call for the same array stopped, instead of starting at index 1 every time
// (in @qwik.dev/core@2.0.0-beta.45 dist/server.prod.mjs)
// `node scripts/patch.mjs` applies it, `node scripts/patch.mjs --restore` undoes it
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";

const file = "node_modules/@qwik.dev/core/dist/server.prod.mjs";
const backup = `${file}.orig`;

if (process.argv.includes("--restore")) {
  if (existsSync(backup)) copyFileSync(backup, file);
  process.exit(0);
}

if (!existsSync(backup)) copyFileSync(file, backup);
const src = readFileSync(backup, "utf8");
const before = `    const i = [ -1 ];
    let o = -1;
    for (let t = 1; t < e.length; t++) {
        const r = e[t];`;
const after = `    // Short arrays are cheaper to rescan than to track
    const track = e.length >= 16;
    const saved = track ? scanCursors.get(e) : undefined;
    const i = saved ? saved.stack.slice() : [ -1 ];
    let o = saved ? saved.attributesIndex : -1;
    let cursorSaved = false;
    for (let t = saved ? saved.index : 1; t < e.length; t++) {
        if (track && t === e.length - 1) {
            // Entries before the last one never change. The last one can be an element
            // count that grows in place, so the next call rescans it
            scanCursors.set(e, { index: t, stack: i.slice(), attributesIndex: o });
            cursorSaved = true;
        }
        const r = e[t];`;
const loopEnd = `    }
    let a = String(r);`;
const loopEndAfter = `    }
    if (track && !cursorSaved) scanCursors.set(e, { index: e.length, stack: i.slice(), attributesIndex: o });
    let a = String(r);`;
const fn = "function vNodeData_createSsrNodeReference(t, e, r, n, s) {\n";
for (const s of [before, loopEnd, fn]) if (src.split(s).length !== 2) throw new Error("vNodeData_createSsrNodeReference not found");
writeFileSync(
  file,
  src
    .replace(fn, "const scanCursors = new WeakMap();\n\n" + fn)
    .replace(before, after)
    .replace(loopEnd, loopEndAfter),
);
