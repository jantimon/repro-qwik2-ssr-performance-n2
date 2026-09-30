import { renderToString } from "@qwik.dev/core/server";
import type { JSXChildren } from "@qwik.dev/core";
import { createHash } from "node:crypto";

// An inline component: a plain function, no component$, no <Slot/>
const Inline = ({ children }: { children?: JSXChildren }) => <b>{children}</b>;

async function time(inline: boolean, n: number) {
  const jsx = <div>{Array.from({ length: n }, (_, i) => (inline ? <Inline>{i}</Inline> : <b>{i}</b>))}</div>;
  const runs: number[] = [];
  let html = "";
  for (let r = 0; r < 5; r++) {
    const t = performance.now();
    html = (await renderToString(jsx, { containerTagName: "div" })).html;
    runs.push(performance.now() - t);
  }
  // median of 5
  const ms = runs.sort((a, b) => a - b)[2];
  // q:instance is random per render. The manifest hash and the bundle-graph name change with
  // the client build, which also bundles the server code that scripts/patch.mjs edits
  const stable = html
    .replaceAll(/q:instance="[^"]*"/g, "")
    .replaceAll(/q:manifest-hash="[^"]*"/g, "")
    .replaceAll(/[\w-]+-bundle-graph\.json/g, "bundle-graph.json");
  return { ms, hash: createHash("sha1").update(stable).digest("hex").slice(0, 10) };
}

// warm-up for both render paths, so the first measured row is not slower than the next
for (let w = 0; w < 5; w++) {
  await time(true, 1000);
  await time(false, 1000);
}

console.log("| n | `<Inline>` | `<b>` | html sha1 |");
console.log("|---:|---:|---:|---|");
for (const n of [500, 1000, 2000, 4000]) {
  const a = await time(true, n);
  const b = await time(false, n);
  console.log(`| ${n.toLocaleString("en")} | ${a.ms.toFixed(1)} ms | ${b.ms.toFixed(1)} ms | ${a.hash} |`);
}
// renderToString leaves a handle open
process.exit(0);
