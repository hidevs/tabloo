import fs from 'node:fs';
import path from 'node:path';
import { RAW } from '../config.mjs';
import { jalaliDate, jalaliDateTime, tehranDayStart, tehranIso } from './time.mjs';

const STALE_MS = 24 * 3600 * 1000;
const RIAL_FIELDS = ['price', 'bid', 'ask', 'open', 'high', 'low', 'prev_close', 'change'];

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const clean = (n) => parseFloat(n.toPrecision(12)); // kills 0.1+0.2-style float noise

// Atomic, and skips the write when bytes are identical so git sees no change.
export function writeJson(p, obj) {
  const text = JSON.stringify(obj, null, 2) + '\n';
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === text) return false;
  const tmp = `${p}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, text);
  fs.renameSync(tmp, p);
  return true;
}

const flat = (doc) => Object.values(doc.data.categories).flat();

function setQuality(q, flags) {
  const keep = q.quality.filter((x) => !(x in flags) || flags[x]);
  for (const [k, on] of Object.entries(flags)) if (on && !keep.includes(k)) keep.push(k);
  // snapshot order: stale first, then spike / ohlc_inconsistent
  const order = ['stale', 'spike', 'ohlc_inconsistent'];
  q.quality = [...keep].sort((a, b) => (order.indexOf(a) + 1 || 99) - (order.indexOf(b) + 1 || 99));
}

// reads: Map<symbol, {price, high, low, open, prev_close, change, change_pct, time: Date|null}>
export function updateLatest(latest, reads, now) {
  const stats = { read: 0, stale: 0 };
  for (const q of flat(latest)) {
    q.checked_at = now.toISOString();
    const r = reads.get(q.symbol);
    if (!r || r.price == null) {
      q.stale = true;
      setQuality(q, { stale: true });
      stats.stale++;
      continue;
    }
    const t = r.time ?? now;
    for (const k of ['price', 'high', 'low', 'open', 'prev_close', 'change', 'change_pct']) if (r[k] != null) q[k] = r[k];
    q.timestamp = t.toISOString();
    q.timestamp_tehran = tehranIso(t);
    q.timestamp_jalali = jalaliDateTime(t);
    q.stale = now - t > STALE_MS;
    setQuality(q, {
      stale: q.stale,
      spike: Math.abs(q.change_pct ?? 0) > 10,
      ohlc_inconsistent: q.high != null && q.low != null && !(q.low <= q.price && q.price <= q.high),
    });
    stats.read++;
  }
  latest.data.generated_at = now.toISOString();
  latest.data.generated_at_jalali = jalaliDateTime(now);
  latest.meta.tehran_time = tehranIso(now);
  latest.meta.published_at = now.toISOString();
  return stats;
}

export function toToman(latest) {
  const out = structuredClone(latest);
  for (const q of flat(out)) {
    if (q.currency !== 'IRR') continue;
    for (const k of RIAL_FIELDS) if (typeof q[k] === 'number') q[k] = clean(q[k] / 10);
    q.currency = 'IRT';
  }
  out.meta.unit = 'toman';
  out.meta.public_file = RAW + 'latest-toman.json';
  return out;
}

export function updatePopular(popular, toman, now) {
  const by = new Map(flat(toman).map((q) => [q.symbol, q]));
  popular.data = popular.data.map((p) => structuredClone(by.get(p.symbol)));
  popular.meta.count = popular.data.length;
  popular.meta.updated_at = popular.data.map((p) => p.timestamp).sort().at(-1);
  popular.meta.stale = popular.data.some((p) => p.stale);
  popular.meta.published_at = now.toISOString();
}

export function upsertCandle(hist, price, now) {
  const t = tehranDayStart(now);
  const iso = t.toISOString();
  const last = hist.data.at(-1);
  if (last?.t === iso) {
    last.high = Math.max(last.high, price);
    last.low = Math.min(last.low, price);
    last.close = price;
    last.ticks = (last.ticks ?? 0) + 1;
  } else {
    hist.data.push({
      t: iso, t_tehran: tehranIso(t), open: price, high: price, low: price, close: price,
      volume: null, ticks: 1, origin: 'source', quality: [], date_jalali: jalaliDate(t),
    });
  }
  hist.meta.count = hist.data.length;
  hist.meta.published_at = now.toISOString();
}

// Reads every data file, applies one run's reads, writes back. Returns stats.
export function publishAll(dataDir, reads, now = new Date()) {
  const f = (...p) => path.join(dataDir, ...p);
  const latest = readJson(f('latest.json'));
  const stats = updateLatest(latest, reads, now);
  const toman = toToman(latest);
  const popular = readJson(f('popular.json'));
  updatePopular(popular, toman, now);
  const tomanBy = new Map(flat(toman).map((q) => [q.symbol, q]));

  const idx = readJson(f('history', 'index.json'));
  for (const e of idx.data) {
    const q = tomanBy.get(e.symbol);
    const r = reads.get(e.symbol);
    const hp = f('history', `${e.symbol}.json`);
    if (!q || !r || r.price == null || !fs.existsSync(hp)) continue;
    const hist = readJson(hp);
    upsertCandle(hist, q.price, now);
    writeJson(hp, hist);
    e.records = hist.data.length;
    e.to = hist.data.at(-1).t;
    e.history_published_at = now.toISOString();
  }
  idx.meta.published_at = now.toISOString();

  const symbols = readJson(f('symbols.json'));
  symbols.meta.published_at = now.toISOString();
  const manifest = readJson(f('manifest.json'));
  manifest.generated_at = now.toISOString();

  // Stable-order list so a diff touches only value lines.
  writeJson(f('latest.json'), latest);
  writeJson(f('latest-toman.json'), toman);
  writeJson(f('popular.json'), popular);
  writeJson(f('history', 'index.json'), idx);
  writeJson(f('symbols.json'), symbols);
  writeJson(f('manifest.json'), manifest);
  return stats;
}
