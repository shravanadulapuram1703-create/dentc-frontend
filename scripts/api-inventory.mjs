/**
 * Builds complete FE + BE API inventories for the migration analysis.
 *   node scripts/api-inventory.mjs            # prints both inventories
 *   node scripts/api-inventory.mjs --json     # writes scripts/.inventory.json
 *
 * FE scan: every `api.<method>(...)` and `fetch(...)` literal across all of src/.
 * BE scan: every path/method in openapi.json with opId, tag, and response schema.
 */
import fs from "node:fs";
import path from "node:path";

// ---------- Backend inventory ----------
const spec = JSON.parse(fs.readFileSync("./openapi.json", "utf8"));
const be = [];
for (const [p, ms] of Object.entries(spec.paths)) {
  for (const [m, op] of Object.entries(ms)) {
    if (typeof op !== "object" || !op.responses) continue;
    let resp = "";
    const ok = op.responses["200"] || op.responses["201"];
    const sch = ok?.content?.["application/json"]?.schema;
    if (sch) resp = (sch.$ref || sch.items?.$ref || "").split("/").pop() || (sch.type ?? "");
    be.push({
      method: m.toUpperCase(),
      path: p,
      opId: op.operationId,
      tag: (op.tags || [])[0] || "",
      resp,
    });
  }
}

// ---------- Frontend inventory ----------
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (/node_modules|api[\\/]generated|\.git|dist/.test(fp)) continue;
      walk(fp, acc);
    } else if (/\.(ts|tsx)$/.test(e.name)) acc.push(fp);
  }
  return acc;
}
const srcFiles = walk("src");

const apiRe = /\bapi\.(get|post|put|patch|delete)\s*(?:<[^>]*>)?\s*\(\s*([`'"])([^`'"]*)\2/g;
const fetchRe = /\bfetch\s*\(\s*([`'"])([^`'"]*)\2/g;

const fe = [];
for (const f of srcFiles) {
  const rel = f.replace(/\\/g, "/");
  if (/services\/api\.ts$/.test(rel)) continue; // the axios instance def itself
  const txt = fs.readFileSync(f, "utf8");
  let m;
  while ((m = apiRe.exec(txt))) {
    const url = m[3];
    if (!url.includes("/api/")) continue;
    fe.push({ method: m[1].toUpperCase(), url, file: rel });
  }
  while ((m = fetchRe.exec(txt))) {
    const url = m[2];
    if (!/\/api\/|\$\{API/.test(url) && !/feeSchedules/.test(rel)) continue;
    fe.push({ method: "GET?", url, file: rel });
  }
}

// normalize FE url -> template
const norm = (u) =>
  u.replace(/\$\{[^}]*\}/g, "{}").replace(/\?.*$/, "").replace(/\/+$/, "");

// de-dup FE by (method, norm-url, file)
const seen = new Set();
const feUniq = fe.filter((r) => {
  const k = `${r.method} ${norm(r.url)} ${r.file}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});

if (process.argv.includes("--json")) {
  fs.writeFileSync("scripts/.inventory.json", JSON.stringify({ fe: feUniq, be }, null, 2));
  console.log(`Wrote scripts/.inventory.json (FE ${feUniq.length}, BE ${be.length})`);
} else {
  console.log(`===== FRONTEND ENDPOINTS (${feUniq.length} unique) =====`);
  const byFile = {};
  for (const r of feUniq) (byFile[r.file] = byFile[r.file] || []).push(r);
  for (const [file, rs] of Object.entries(byFile).sort()) {
    console.log(`\n# ${file}`);
    for (const r of rs.sort((a, b) => a.url.localeCompare(b.url)))
      console.log(`  ${r.method.padEnd(7)} ${norm(r.url)}`);
  }
  console.log(`\n\n===== BACKEND ENDPOINTS (${be.length}) grouped by tag =====`);
  const byTag = {};
  for (const r of be) (byTag[r.tag] = byTag[r.tag] || []).push(r);
  for (const [tag, rs] of Object.entries(byTag).sort()) {
    console.log(`\n# ${tag} (${rs.length})`);
    for (const r of rs.sort((a, b) => a.path.localeCompare(b.path) || a.method.localeCompare(b.method)))
      console.log(`  ${r.method.padEnd(7)} ${r.path}  ->${r.resp}`);
  }
}
