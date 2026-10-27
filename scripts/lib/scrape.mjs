import { timeOfDayToUtc } from './time.mjs';

export const LIST_PAGES = ['currency', 'coin', 'gold-chart', 'gold-global', 'energy', 'sana', 'crypto'];
const BASE = 'https://www.tgju.org/';

export function parseNum(s) {
  if (s == null) return null;
  const t = String(s)
    .replace(/[۰-۹]/g, (c) => String(c.charCodeAt(0) - 0x6f0))
    .replace(/[,٬\s]/g, '');
  const m = t.match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

const round2 = (n) => Math.round(n * 100) / 100;

// Sign is not reliable in the markup (css class only), so derive it from price - prev_close.
export function withChange(row) {
  if (row.price != null && row.prev_close) {
    row.change = parseFloat((row.price - row.prev_close).toPrecision(12));
    row.change_pct = round2((row.change / row.prev_close) * 100);
  }
  return row;
}

export async function readListPage(page, name) {
  await page.goto(BASE + name, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForSelector('tr[data-market-row]', { timeout: 30000 });
  await page.waitForTimeout(2500); // rows are refreshed by websocket after first paint
  const raw = await page.evaluate(() =>
    [...document.querySelectorAll('tr[data-market-row]')].map((tr) => ({
      slug: tr.dataset.marketRow,
      cells: [...tr.children].map((c) => c.innerText.trim()),
      neg: tr.children[2]?.classList.contains('low'),
    })));
  const now = new Date();
  return raw.map(({ slug, cells, neg }) => {
    const [name_fa = "", price, chg, low, high, time] = cells;
    const m = chg?.match(/\(([\d.,]+)%\)\s*([\d.,]+)/);
    const sign = neg ? -1 : 1;
    return {
      slug, name_fa, price: parseNum(price), low: parseNum(low), high: parseNum(high),
      change: m ? sign * parseNum(m[2]) : null,
      change_pct: m ? sign * parseNum(m[1]) : null,
      time: timeOfDayToUtc(time || '', now),
    };
  });
}

const LABELS = {
  price: 'نرخ فعلی',
  high: 'بالاترین قیمت روز',
  low: 'پایین ترین قیمت روز',
  open: 'نرخ بازگشایی بازار',
  time: 'زمان ثبت آخرین نرخ',
  prev_close: 'نرخ روز گذشته',
};

export async function readProfile(page, slug) {
  await page.goto(`${BASE}profile/${encodeURIComponent(slug)}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(2500);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll('tr')].map((r) => [...r.children].map((c) => c.innerText.trim())));
  // newest Jalali date in the history tables = freshness proxy (profile header only shows a time of day)
  const dates = rows.flat().map((c) => c.replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x6f0)).match(/^(1[34]\d\d\/\d\d\/\d\d)$/)?.[1]).filter(Boolean);
  const byLabel = new Map(rows.filter((r) => r.length === 2).map((r) => [r[0], r[1]]));
  if (!byLabel.has(LABELS.price)) return null; // 404 view or markup change
  const out = {};
  for (const [k, label] of Object.entries(LABELS)) {
    out[k] = k === 'time' ? timeOfDayToUtc(byLabel.get(label) || '', new Date()) : parseNum(byLabel.get(label));
  }
  return withChange({ slug, ...out, last_date: dates.sort().at(-1) ?? null });
}
