## Context

See proposal.md (Why). Facts from the imported snapshot and from probing tgju.org on 2026-10-27:

- `data/latest.json` holds 1042 quotes in 9 categories. Every quote has the fields `symbol, name_fa, name_en, category, market, currency, unit, unit_size, price, bid, ask, open, high, low, prev_close, change, change_pct, volume, market_status, timestamp, timestamp_tehran, timestamp_jalali, checked_at, source, stale, quality`.
- tgju list pages render `tr[data-market-row="<slug>"]` with columns title, live price, change, low, high and time. `/currency`, `/coin`, `/gold-chart`, `/gold-global`, `/energy`, `/sana` and `/crypto` together render about 480 rows. `/crypto` uses numeric ids.
- `https://www.tgju.org/profile/<slug>` renders a table with the rows «نرخ فعلی», «بالاترین قیمت روز», «پایین ترین قیمت روز», «نرخ بازگشایی بازار», «زمان ثبت آخرین نرخ» and «نرخ روز گذشته». A dead slug renders «صفحه مورد نظر موجود نمی‌باشد».
- `ajax.json` lists 1052 keys. 297 of them are older than 30 days (e.g. `usdt-irr` from 2020), so it is used only as a slug **dictionary** during discovery, never for prices.
- History files are updated with `update_frequency_minutes: 1440`, OHLC per Tehran day.

## Goals / Non-Goals

**Goals:** a byte-stable rewrite of `data/` (same order, 2-space JSON, same number types); the fewest browser page loads per run; one command that runs the same way locally, in Actions and on a server.

**Non-Goals:** backfilling history; adding symbols; changing the site UI; resolving the 395 `symbols.json` entries that have `has_latest: false` (they stay as they are); alerting.

## Decisions

1. **Plain Node 22 ESM + `playwright` only.** No TypeScript, no framework. The scripts are small, run as cron jobs, and build-free is simpler to self-host. Alternative: Python + playwright. Rejected because the site JS is already Node-friendly and one runtime is enough.

2. **Layout.**
   ```
   scripts/
     package.json         (type: module, dep: playwright)
     config.mjs           (REPO, BRANCH, PAGES_ORIGIN from env, defaults for hidevs/tabloo)
     sources.json         (committed: symbol -> {page, row} | {profile: slug} | null)
     discover.mjs         (one-time: builds sources.json)
     publish.mjs          (every 30 min: scrape -> write data/)
     lib/browser.mjs      (launch; PW_CHANNEL=chrome locally)
     lib/scrape.mjs       (readListPage, readProfile -> normalized rows)
     lib/write.mjs        (latest, toman, popular, symbols, manifest, history)
     lib/time.mjs         (Tehran / Jalali formatting via Intl, calendar 'persian')
     test/self-check.mjs  (asserts: symbol sets, key paths, toman math, candle upsert)
   ```

3. **List pages first, profile pages second.** Each run loads the 7 list pages, then opens `profile/<slug>` only for mapped symbols not covered by a list row, with 6 parallel tabs and a 45s timeout each. Alternative: profile pages for all 1042. Rejected, because about 1042 page loads per run is slow and heavy on the source.

4. **Discovery strategy.** Candidates per symbol, in order: (a) a list-page row whose `name_fa` matches; (b) slug guesses from the symbol (`lower`, `_→-`, `_→@`, `crypto-<name>`, `price_<code>`) filtered by the `ajax.json` key dictionary; (c) a tgju site search by `name_fa`. Each candidate is opened once and accepted by the spec rule (exists, fresh within 7 days, within a factor of 5 of the published price). Symbols left without a candidate are written as `null` and listed in a discovery report for manual review. Mapping is per symbol, so `_IRR` and `_USD` twins can point to different pages.

5. **Read-modify-write on the existing JSON.** The publisher loads each current file, replaces only value fields in place (same object, same key order) and writes with `JSON.stringify(obj, null, 2) + "\n"`, matching the snapshot format. A temp file plus rename makes writes atomic. The pattern `data/**/*.tmp-*` is already gitignored.

6. **Number parsing.** Strip `,`, convert Persian digits, `parseFloat`. Keep integers as integers. `change_pct` is rounded to 2 decimals, like the snapshot.

7. **Stale threshold.** `stale` is true when the source timestamp is older than 24 h or the symbol was not read. This mirrors daily-quoted global commodities. `spike` and `ohlc_inconsistent` are recomputed only for symbols read in this run (`spike`: |change_pct| > 10; `ohlc_inconsistent`: not low ≤ price ≤ high). Otherwise the previous flags are kept.

8. **Toman.** Every item with `currency: "IRR"` gets values ÷ 10, rounded like the snapshot, and becomes `IRT`. Other currencies are copied unchanged.

9. **URL rebrand.** This is a one-off `sed` over site and docs files, plus `config.mjs` used by every writer for `url` and `public_file`.

10. **Workflow.** `.github/workflows/publish.yml`: `on: schedule '*/30 * * * *'` + `workflow_dispatch`; `concurrency: {group: publish, cancel-in-progress: false}`; `permissions: contents: write`; `actions/setup-node@v4` with npm cache; `npx playwright install --with-deps chromium`; `node scripts/publish.mjs`; then `git diff --quiet data || (git commit -m "data: refresh market snapshots <iso>" && git pull --rebase && git push)` with author `Tabloo Publisher <publisher@users.noreply.github.com>`.

11. **Pages.** Repo `hidevs/tabloo` is a project site served at `https://hidevs.github.io/tabloo/` from `main` / root. All site asset paths are relative, so the sub-path works. `PAGES_ORIGIN` = `https://hidevs.github.io/tabloo/`.

## Risks / Trade-offs

- tgju blocks or rate-limits GitHub runner IPs → Task 1 is a probe workflow. If it fails, run the same command on a self-hosted machine (option 3).
- tgju changes its markup → the self-check fails loudly, the run commits nothing, and the next green run recovers. The selectors live in one file.
- A mapping goes wrong silently (the page now shows another asset) → the factor-of-5 check runs only at discovery. Re-run `discover.mjs` periodically by hand.
- Scheduled Actions can be delayed 5–20 minutes and are disabled after 60 days without repo activity → data commits count as activity.
- Repo growth: about 48 commits a day touching about 10 files is the same as the original.

## Migration Plan

Commit the scripts and `sources.json`, run the workflow by hand once, compare the shape diff (self-check), then let cron take over. Rollback: disable the workflow, and the data files stay as they were.
