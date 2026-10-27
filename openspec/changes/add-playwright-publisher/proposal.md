## Why

This repo started from an imported upstream snapshot. Upstream, the JSON files under `data/` are refreshed by a private, server-hosted publisher whose code is not available. That publisher is also degraded: in the imported snapshot every one of the 1042 quotes carries `stale: true` and the same `checked_at` (2026-10-26T00:00Z), while runs every 30 minutes only bump `published_at`. We need our own open publisher that reads real live prices from tgju.org through a browser. It must keep the same public data contract with fresh values and run from our own GitHub repo and Pages site.

## What Changes

- Add a `scripts/` Node.js project that uses Playwright (real Chromium) to read prices from rendered tgju.org pages. The tgju JSON endpoints (`call*.tgju.org/ajax.json`, `api.tgju.org/...`) are not used for prices, because many of their keys are years stale and their shape may change.
- Add a one-time **slug discovery** step that maps every symbol in `data/latest.json` (all 1042, no more, no fewer) to the tgju page that serves it, and commit that mapping as a fixed file. Discovery checks each symbol once (page exists, value is fresh, value is close to the published one). The 30-minute publisher trusts the mapping and does not re-check.
- Add a **publisher** that, on each run, rewrites the existing data files in place, keeping their exact structure, field names, ordering and symbol sets: `data/latest.json`, `data/latest-toman.json`, `data/popular.json`, `data/symbols.json`, `data/manifest.json`, `data/history/index.json`, and today's candle in each of the 128 `data/history/{SYMBOL}.json`.
- Symbols with no live source keep their previous values and are flagged `stale: true`. Nothing is added or removed.
- Rebrand the public base URLs from the upstream repository to this repo's own owner and name. Only URL values change. The site, docs structure and JSON schema stay the same.
- Add a public GitHub Actions workflow that runs the publisher every 30 minutes and commits only when data changed. Only the built-in `GITHUB_TOKEN` is used, so no secret is exposed. The publisher is a plain `node` command, so it can later run from cron or PM2 on a self-hosted server.

## Capabilities

### New Capabilities
- `market-data-publisher`: the contract for refreshing the public `data/*.json` files from live tgju pages. It covers the fixed symbol set and structure, slug discovery, freshness and quality flags, derived files, history candles, public URLs, and the scheduled public run.

### Modified Capabilities
<!-- none: openspec/specs/ is empty -->

## Impact

- New: `scripts/` (Node 22, `playwright` dependency, `sources.json` mapping), `.github/workflows/publish.yml`.
- Writes: every file under `data/` (values only, same shape). This gives one commit every 30 minutes on `main`, the same pattern as the original repo.
- One-off edit (already done) of hardcoded upstream URLs and brand names (to "Tabloo") in `index.html`, `assets/app.js`, `README.md`, `SYMBOLS.md`, `llms.txt`, `robots.txt`, `sitemap.xml`, `site.webmanifest` and the JSON `public_file`/`url` fields.
- Runtime: GitHub-hosted runners (non-Iran IPs) must be able to reach tgju.org. This is checked first. If they cannot, the same command moves to a self-hosted machine.
- Local development in Iran: `cdn.playwright.dev` returns 403, so local runs use the system Chrome (`channel: chrome`).
