// Refreshes data/*.json from live tgju pages. Usage: PW_CHANNEL=chrome node publish.mjs
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { launch } from './lib/browser.mjs';
import { checkShape } from './lib/check.mjs';
import { LIST_PAGES, readListPage, readProfile } from './lib/scrape.mjs';
import { publishAll } from './lib/write.mjs';

const DATA = new URL('../data', import.meta.url).pathname;
const sources = JSON.parse(fs.readFileSync(new URL('./sources.json', import.meta.url), 'utf8'));
const TABS = 6;
const now = new Date();

const { browser, context } = await launch();

// 1) list pages (one failure only loses that page's rows)
const rows = new Map();
{
  const page = await context.newPage();
  for (const p of LIST_PAGES) {
    try { for (const r of await readListPage(page, p)) rows.set(r.slug, r); }
    catch (e) { console.error('list page failed:', p, e.message.split('\n')[0]); }
  }
  await page.close();
}

// 2) profile pages for mapped slugs not covered by a list row
const slugs = [...new Set(Object.values(sources).filter(Boolean))];
const profiles = new Map();
const todo = slugs.filter((s) => !rows.has(s));
let next = 0;
await Promise.all(Array.from({ length: TABS }, async () => {
  let page = await context.newPage();
  while (next < todo.length) {
    const slug = todo[next++];
    try {
      const r = await readProfile(page, slug);
      if (r) profiles.set(slug, r);
    } catch (e) {
      console.error('profile failed:', slug, e.message.split('\n')[0]);
      if (page.isClosed()) page = await context.newPage();
    }
  }
}));
await browser.close();

// 3) symbol -> read
const reads = new Map();
for (const [symbol, slug] of Object.entries(sources)) {
  const r = slug && (profiles.get(slug) ?? rows.get(slug));
  if (!r || r.price == null) continue;
  const read = { ...r };
  // list rows have no open/prev_close: derive prev_close, leave open untouched
  if (read.prev_close == null && read.change != null) read.prev_close = parseFloat((read.price - read.change).toPrecision(12));
  reads.set(symbol, read);
}
console.log(`read ${reads.size}/${Object.keys(sources).length} symbols (${rows.size} list rows, ${profiles.size}/${todo.length} profiles)`);

// 4) write into a temp copy, validate, then replace data/ files
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tabloo-pub-'));
fs.cpSync(DATA, tmp, { recursive: true });
const stats = publishAll(tmp, reads, now);
const errs = checkShape(DATA, tmp);
if (errs.length || reads.size === 0) {
  console.error('self-check failed, nothing written:\n' + errs.slice(0, 20).join('\n'));
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
fs.cpSync(tmp, DATA, { recursive: true });
fs.rmSync(tmp, { recursive: true, force: true });
console.log('published', stats);
