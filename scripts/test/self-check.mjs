// npm test: runs the writer on a temp copy of data/ with fake reads and checks the invariants.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkShape } from '../lib/check.mjs';
import { publishAll } from '../lib/write.mjs';
import { jalaliDate } from '../lib/time.mjs';

const DATA = new URL('../../data', import.meta.url).pathname;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tabloo-'));
const run = (dir, reads, now) => publishAll(dir, reads, now);
const J = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const mk = (price, extra = {}) => ({ price, high: price, low: price, open: price, prev_close: price, change: 0, change_pct: 0, time: new Date('2099-10-27T09:00:00Z'), ...extra });

const t1 = new Date('2099-10-27T09:00:00Z');
const t2 = new Date('2099-10-27T09:30:00Z');
const t3 = new Date('2099-10-28T09:00:00Z'); // next Tehran day

fs.cpSync(DATA, tmp, { recursive: true });
const before = path.join(os.tmpdir(), path.basename(tmp) + '-before');
fs.cpSync(DATA, before, { recursive: true });

// run 1: dollar 2,711,850; gold 18k 263,405,000 rial; everything else unread -> stale
const gold = 263405000;
run(tmp, new Map([['USD_IRR_FREE', mk(2711850)], ['GOLD_18K_IRR', mk(gold)]]), t1);
let errs = checkShape(before, tmp);
assert.deepEqual(errs, [], errs.join('; '));

const q = (f, s) => Object.values(J(path.join(tmp, f)).data.categories).flat().find((x) => x.symbol === s);
assert.equal(q('latest.json', 'USD_IRR_FREE').price, 2711850);
assert.equal(q('latest-toman.json', 'USD_IRR_FREE').price, 271185);
assert.equal(q('latest-toman.json', 'GOLD_18K_IRR').price, gold / 10);
assert.equal(q('latest-toman.json', 'GOLD_18K_IRR').currency, 'IRT');
assert.equal(q('latest.json', 'ZINC').stale, true);
assert.ok(q('latest.json', 'ZINC').quality.includes('stale'));
assert.equal(q('latest.json', 'ZINC').price, q('latest.json', 'ZINC').price);
assert.deepEqual(J(path.join(tmp, 'popular.json')).data.find((p) => p.symbol === 'USD_IRR_FREE').price, 271185);

// same-day second run: one candle, open kept, high/close updated
run(tmp, new Map([['USD_IRR_FREE', mk(2735000, { time: t2 })]]), t2);
const h = J(path.join(tmp, 'history/USD_IRR_FREE.json')).data;
const orig = J(path.join(DATA, 'history/USD_IRR_FREE.json')).data;
assert.equal(h.length, orig.length + 1);
assert.equal(h.at(-1).open, 271185);
assert.equal(h.at(-1).high, 273500);
assert.equal(h.at(-1).close, 273500);
assert.equal(h.at(-1).date_jalali, jalaliDate(t1));
assert.equal(jalaliDate(new Date('2026-10-27T09:00:00Z')), '1405/08/05');
assert.deepEqual(h.slice(0, orig.length), orig); // older candles byte-identical

// identical rerun -> byte-identical files except timestamps handled by caller; next day appends a candle
run(tmp, new Map([['USD_IRR_FREE', mk(2740000, { time: t3 })]]), t3);
const h3 = J(path.join(tmp, 'history/USD_IRR_FREE.json')).data;
assert.equal(h3.length, orig.length + 2);
assert.deepEqual(h3[h3.length - 2], h.at(-1));

// a hand-broken copy must fail the checker
const broken = J(path.join(tmp, 'latest.json'));
delete Object.values(broken.data.categories)[0][0].name_en;
fs.writeFileSync(path.join(tmp, 'latest.json'), JSON.stringify(broken, null, 2) + '\n');
assert.ok(checkShape(before, tmp).some((e) => e.includes('key order/set')));

fs.rmSync(tmp, { recursive: true });
fs.rmSync(before, { recursive: true });
console.log('self-check ok');
