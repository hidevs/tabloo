## 1. Reachability probe

- [ ] 1.1 Add a throwaway `workflow_dispatch` job that opens `https://www.tgju.org/profile/price_dollar_rl` with Playwright on `ubuntu-latest` and prints «نرخ فعلی»; verify the Actions log shows a current rial price (if blocked: stop and switch to self-hosted runner plan)

## 2. Project setup

- [ ] 2.1 Create `scripts/package.json` (type module, Node >=22, dep `playwright`) and `scripts/config.mjs` (REPO/BRANCH/PAGES_ORIGIN from env, default `hidevs/tabloo`, `main`); verify `npm ci` in `scripts/` succeeds
- [ ] 2.2 Add `scripts/lib/browser.mjs` honoring `PW_CHANNEL`; verify `PW_CHANNEL=chrome node -e "import('./scripts/lib/browser.mjs')..."` opens tgju locally

## 3. Scraping

- [ ] 3.1 `scripts/lib/scrape.mjs`: `readListPage(page)` returns `{slug,name_fa,price,change,change_pct,low,high,time}` for every `tr[data-market-row]`; verify on `/currency` it returns 36 rows incl. `price_dollar_rl`
- [ ] 3.2 `readProfile(slug)` parses the profile table rows and returns null on the 404 view; verify `price_dollar_rl` parses and `usdt-irr` returns null
- [ ] 3.3 `scripts/lib/time.mjs` (Tehran ISO, Jalali via Intl persian calendar, time-of-day to UTC); verify self-check asserts `1405/08/05` for 2026-10-27

## 4. Slug discovery

- [ ] 4.1 `scripts/discover.mjs` implementing candidate order (list row by name_fa, slug guesses filtered by ajax dictionary, site search) and the acceptance rule; writes `scripts/sources.json` + `scripts/discovery-report.md`; verify it has exactly 1042 keys
- [ ] 4.2 Run discovery, review report's `null` list manually, fix obvious misses by hand in `sources.json`; verify every non-null entry re-opens to a fresh price; commit `sources.json`

## 5. Publisher

- [ ] 5.1 `scripts/lib/write.mjs`: update `latest.json` in place (values, timestamps, checked_at, stale/quality per spec) with atomic write; verify self-check: same symbol set and key paths as before
- [ ] 5.2 Derive `latest-toman.json` and `popular.json`; verify self-check: GOLD_18K_IRR toman = IRR/10 and popular order unchanged
- [ ] 5.3 Upsert today's candle in the 128 history files and refresh `history/index.json`; verify self-check: same-day second run updates one candle, older candles byte-identical
- [ ] 5.4 Refresh `symbols.json` and `manifest.json` meta (published_at, counts); verify `git diff --stat data/` touches only value lines
- [ ] 5.5 `scripts/publish.mjs` orchestration (list pages, then profiles with 6 tabs, per-page failure isolation, exit non-zero if self-check fails, write nothing in that case); verify a local run updates `USD_IRR_FREE` to the live tgju price
- [ ] 5.6 `scripts/test/self-check.mjs` runnable as `npm test`; verify passes on current data and fails on a hand-broken copy

## 6. Rebrand URLs

- [x] 6.1 Replace `iran-market` URLs and "Iran Market" names with `hidevs/tabloo` / Tabloo across site, docs and data (done before implementation; JSON shapes verified unchanged, site loads with 0 console errors)

## 7. Scheduling

- [ ] 7.1 Add `.github/workflows/publish.yml` per design (cron */30, dispatch, concurrency, contents: write, commit-if-changed, rebase-and-push); verify a manual dispatch creates one data commit and a second immediate dispatch with no change creates none
- [ ] 7.2 Document local/self-hosted run (`cd scripts && npm ci && PW_CHANNEL=chrome node publish.mjs`) in a short section of `README.md`; verify the command works from a clean clone
- [ ] 7.3 Remove the probe workflow from 1.1; verify only `publish.yml` remains
