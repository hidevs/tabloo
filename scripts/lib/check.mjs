import fs from 'node:fs';
import path from 'node:path';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

// Every key path in a JSON value; array indices collapse to [] so item count may differ.
function keyPaths(v, prefix = '', out = new Set()) {
  if (Array.isArray(v)) v.forEach((x) => keyPaths(x, prefix + '[]', out));
  else if (v && typeof v === 'object') for (const k of Object.keys(v)) { out.add(prefix + '.' + k); keyPaths(v[k], prefix + '.' + k, out); }
  return out;
}

function listFiles(dir, base = dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) return listFiles(p, base);
    return d.name.includes('.tmp-') ? [] : [path.relative(base, p)];
  }).sort();
}

const symbolsOf = (doc) => Object.values(doc.data.categories).flat().map((q) => q.symbol);

// Returns a list of problems (empty = ok) comparing the data dir before/after a run.
export function checkShape(before, after) {
  const errs = [];
  const fb = listFiles(before), fa = listFiles(after);
  if (JSON.stringify(fb) !== JSON.stringify(fa)) errs.push('file list changed');
  for (const f of fb.filter((x) => x.endsWith('.json'))) {
    if (!fa.includes(f)) continue;
    const a = readJson(path.join(before, f)), b = readJson(path.join(after, f));
    const pa = [...keyPaths(a)].sort(), pb = [...keyPaths(b)].sort();
    if (JSON.stringify(pa) !== JSON.stringify(pb)) errs.push(`${f}: key paths changed`);
  }
  for (const f of ['latest.json', 'latest-toman.json']) {
    const sa = symbolsOf(readJson(path.join(before, f))), sb = symbolsOf(readJson(path.join(after, f)));
    if (JSON.stringify(sa) !== JSON.stringify(sb)) errs.push(`${f}: symbol list/order changed`);
  }
  for (const f of ['latest.json', 'latest-toman.json']) {
    const qa = Object.values(readJson(path.join(before, f)).data.categories).flat();
    const qb = Object.values(readJson(path.join(after, f)).data.categories).flat();
    const keys = (q) => Object.keys(q).join();
    qb.forEach((q, i) => { if (keys(q) !== keys(qa[i])) errs.push(`${f}: key order/set changed for ${q.symbol}`); });
  }
  const L = readJson(path.join(after, 'latest.json')), T = readJson(path.join(after, 'latest-toman.json'));
  const tb = new Map(Object.values(T.data.categories).flat().map((q) => [q.symbol, q]));
  for (const q of Object.values(L.data.categories).flat()) {
    const t = tb.get(q.symbol);
    const want = q.currency === 'IRR' ? parseFloat((q.price / 10).toPrecision(12)) : q.price;
    if (t.price !== want) errs.push(`toman mismatch ${q.symbol}`);
    if (q.price != null && !(q.price > 0 || q.price === 0)) errs.push(`bad price ${q.symbol}`);
    if (!Array.isArray(q.quality) || q.quality.some((x) => !['stale', 'spike', 'ohlc_inconsistent'].includes(x))) errs.push(`bad quality ${q.symbol}`);
  }
  // history: older candles untouched, at most one new/changed candle (the last)
  for (const f of fb.filter((x) => /^history\/[^/]+\.json$/.test(x) && x !== 'history/index.json')) {
    const a = readJson(path.join(before, f)).data, b = readJson(path.join(after, f)).data;
    const keep = a.length - 1;
    if (JSON.stringify(a.slice(0, keep)) !== JSON.stringify(b.slice(0, keep))) errs.push(`${f}: older candles changed`);
    if (b.length < a.length || b.length > a.length + 1) errs.push(`${f}: candle count jumped`);
    for (let i = 1; i < b.length; i++) if (b[i].t <= b[i - 1].t) errs.push(`${f}: candles out of order`);
  }
  return errs;
}
