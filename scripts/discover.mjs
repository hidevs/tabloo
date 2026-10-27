// One-off: maps each symbol in data/latest.json to the tgju page that serves it.
// Writes sources.json ({SYMBOL: slug|null}) and discovery-report.md. Run by hand, not by the scheduler.
import fs from 'node:fs';
import { launch } from './lib/browser.mjs';
import { LIST_PAGES, readListPage, readProfile } from './lib/scrape.mjs';
import { jalaliDate } from './lib/time.mjs';

const DATA = new URL('../data/latest.json', import.meta.url);
const OUT = new URL('./sources.json', import.meta.url);
const REPORT = new URL('./discovery-report.md', import.meta.url);
const CONCURRENCY = 4;

const norm = (s) => s.replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌\s()]/g, '').toLowerCase();

const quotes = Object.values(JSON.parse(fs.readFileSync(DATA, 'utf8')).data.categories).flat();
const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : {};

// ajax.json is used ONLY as a slug dictionary (its prices can be years old).
const dict = new Set(Object.keys((await (await fetch('https://call1.tgju.org/ajax.json')).json()).current));

const guesses = (sym) => {
  const l = sym.toLowerCase();
  const i = l.indexOf('_');
  const g = [l, l.replaceAll('_', '-'), l.replaceAll('_', '@'), `price_${l}`, `crypto-${l.replaceAll('_', '-')}`];
  if (i > 0) g.push(l.slice(0, i) + '@' + l.slice(i + 1).replaceAll('_', '-'));
  return [...new Set(g)].filter((s) => dict.has(s));
};

const weekAgo = jalaliDate(new Date(Date.now() - 7 * 86400000));
const ok = (q, r) =>
  r && r.price != null && r.price > 0 && q.price > 0 &&
  (!r.last_date || r.last_date >= weekAgo) &&
  r.price / q.price < 5 && q.price / r.price < 5;

const { browser, context } = await launch();

// list rows: slug -> row, plus name index
const rows = new Map();
const byName = new Map();
{
  const page = await context.newPage();
  for (const p of LIST_PAGES) {
    try {
      for (const r of await readListPage(page, p)) {
        rows.set(r.slug, r);
        const k = norm(r.name_fa);
        byName.set(k, [...(byName.get(k) || []), r]);
      }
    } catch (e) { console.error('list page failed', p, e.message); }
  }
  await page.close();
}
console.log('list rows', rows.size);

const pages = Array.from({ length: CONCURRENCY }, () => ({ p: null }));
const cache = new Map();
const open = async (w, slug) => {
  if (cache.has(slug)) return cache.get(slug);
  let r = null;
  for (let i = 0; i < 3 && !r; i++) {
    try {
      if (!w.p || w.p.isClosed()) w.p = await context.newPage();
      r = await readProfile(w.p, slug);
    } catch (e) {
      if (/closed|crash/i.test(e.message)) w.p = null;
      if (i === 2) console.error('fail', slug, e.message.split('\n')[0]);
    }
  }
  cache.set(slug, r);
  return r;
};

const result = {};
const how = {};
let next = 0;
await Promise.all(pages.map(async (page) => {
  while (next < quotes.length) {
    const q = quotes[next++];
    if (q.symbol in prev && process.env.RESUME) { result[q.symbol] = prev[q.symbol]; continue; }
    let found = null;
    // dead symbols (no price for 30+ days) are not worth page loads: keep them null and stale
    if (Date.now() - Date.parse(q.timestamp) > 30 * 86400000) { result[q.symbol] = null; continue; }
    for (const r of byName.get(norm(q.name_fa)) || []) {
      if (ok(q, r)) { found = r.slug; how[q.symbol] = 'list-row'; break; }
    }
    if (!found) {
      for (const slug of guesses(q.symbol)) {
        if (ok(q, await open(page, slug))) { found = slug; how[q.symbol] = 'slug-guess'; break; }
      }
    }
    result[q.symbol] = found;
    if (next % 50 === 0) console.log(next, '/', quotes.length);
  }
}));
await browser.close();

const ordered = Object.fromEntries(quotes.map((q) => [q.symbol, result[q.symbol] ?? null]));
fs.writeFileSync(OUT, JSON.stringify(ordered, null, 2) + '\n');

const nulls = quotes.filter((q) => !ordered[q.symbol]);
fs.writeFileSync(REPORT, [
  '# Discovery report', '',
  `Mapped: ${quotes.length - nulls.length} / ${quotes.length}`, '',
  '## Unmapped (null) — review by hand', '',
  ...nulls.map((q) => `- \`${q.symbol}\` (${q.category}) ${q.name_fa}`), '',
].join('\n'));
console.log(`mapped ${quotes.length - nulls.length}/${quotes.length}`);
