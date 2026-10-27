## Purpose

Keeps the public `data/*.json` market files fresh by reading live prices from tgju.org pages in a real browser. The published structure, field set and symbol set stay identical to the imported upstream snapshot.

## ADDED Requirements

### Requirement: Fixed symbol set and structure
The publisher SHALL write exactly the symbols present in the imported snapshot: 1042 quotes in `data/latest.json` and `data/latest-toman.json`, 1437 entries in `data/symbols.json`, 6 entries in `data/popular.json`, 128 files under `data/history/` plus `data/history/index.json`, and the same file list in `data/manifest.json`. It SHALL keep every key name, key order, category grouping, item order, number formatting and indentation. It SHALL NOT add, remove or rename any symbol, field or file.

#### Scenario: Symbol set unchanged after a run
- **WHEN** the publisher completes a run
- **THEN** the sorted list of `symbol` values in every data file equals the list before the run, and the set of files under `data/` is unchanged

#### Scenario: Shape unchanged after a run
- **WHEN** the JSON before and after a run is reduced to its key paths
- **THEN** both key-path sets are identical

### Requirement: Prices read from rendered tgju pages
The publisher SHALL take every price value (`price`, `high`, `low`, `open`, `prev_close`, `change`, `change_pct`, `timestamp`) from tgju.org pages rendered in a headless browser. It SHALL NOT use `call*.tgju.org/ajax.json` or `api.tgju.org` responses as a price source.

#### Scenario: Live dollar price
- **WHEN** a run happens while tgju.org shows the open-market dollar at a given rate
- **THEN** `USD_IRR_FREE.price` in `data/latest.json` equals that rate in rial, and the same item in `data/latest-toman.json` equals that rate divided by 10

### Requirement: Fixed symbol-to-page mapping
The repository SHALL contain a committed mapping from each of the 1042 quoted symbols to the tgju page and row that serves it, or to `null` when no live source exists. The mapping SHALL be produced by a separate discovery command. A tgju page is accepted for a symbol only when it exists, shows a value updated within the last 7 days, and that value is within a factor of 5 of the symbol's published price. The scheduled publisher SHALL read the mapping as-is and SHALL NOT re-run discovery or these checks.

#### Scenario: Discovery covers every symbol
- **WHEN** the discovery command finishes
- **THEN** the mapping has exactly one entry for each of the 1042 quoted symbols, and each entry is a page reference or `null`

#### Scenario: Dead tgju slug rejected
- **WHEN** a candidate tgju page returns the "page not found" view or shows a value older than 7 days
- **THEN** discovery does not map the symbol to that page

### Requirement: Stale and quality flags
For each quote, the publisher SHALL set `checked_at` to the run time. When the symbol is mapped and was read successfully in this run, it SHALL update the values and `timestamp*` fields and set `stale` to `false` unless the source timestamp is older than the staleness threshold. When the symbol is mapped to `null`, or reading failed, it SHALL keep the previous values and `timestamp*`, set `stale: true`, and include `"stale"` in `quality`. The `quality` array SHALL use only the values already present in the snapshot (`stale`, `spike`, `ohlc_inconsistent`).

#### Scenario: Unmapped symbol keeps old value
- **WHEN** a symbol is mapped to `null`
- **THEN** after a run its `price` and `timestamp` are unchanged, `stale` is `true`, and `quality` contains `"stale"`

#### Scenario: One page fails
- **WHEN** one tgju page times out during a run
- **THEN** only the symbols on that page are marked stale with previous values, and the run still writes all files

### Requirement: Derived files consistent with latest
On every run, `data/latest-toman.json` SHALL equal `data/latest.json` with rial values divided by 10 and `currency` `IRR` shown as `IRT`. `data/popular.json` SHALL contain the same 6 symbols in the same order, taken from the toman data. `data/symbols.json`, `data/manifest.json` and `data/history/index.json` SHALL update only their time and count fields (`published_at`, `generated_at`, `updated_at`, record counts, ranges).

#### Scenario: Toman conversion
- **WHEN** `GOLD_18K_IRR` in `latest.json` has price `263405000` in IRR
- **THEN** the same symbol in `latest-toman.json` has price `26340500` with currency `IRT`

### Requirement: Daily history candles
For each of the 128 history files, the publisher SHALL upsert the candle for the current Tehran calendar day. It SHALL use the day's first observed price as `open`, the running max/min as `high`/`low`, and the latest price as `close`. Older candles SHALL NOT change. Candles SHALL stay in ascending date order with the existing field set (`t`, `t_tehran`, `open`, `high`, `low`, `close`, `volume`, `ticks`, `origin`, `quality`, `date_jalali`).

#### Scenario: Second run in the same day
- **WHEN** two runs happen on the same Tehran day with dollar prices 2,711,850 then 2,735,000
- **THEN** `history/USD_IRR_FREE.json` has one candle for that day with `open` from the first run and `high` and `close` from the second

#### Scenario: First run of a new day
- **WHEN** the first run after Tehran midnight completes
- **THEN** a new last candle is appended and the previous day's candle is unchanged

### Requirement: Public URLs point to this repository
All absolute public URLs in data files and site files SHALL use this repository's owner, name, branch and Pages origin, taken from one configured value, in place of the upstream repository's URLs.

#### Scenario: Manifest URL
- **WHEN** the repository is `hidevs/tabloo` on branch `main`
- **THEN** every `url` in `data/manifest.json` starts with `https://raw.githubusercontent.com/hidevs/tabloo/main/data/`

### Requirement: Scheduled public run
A public GitHub Actions workflow SHALL run the publisher every 30 minutes and on manual dispatch. It SHALL never overlap with itself. It SHALL commit and push `data/` only when a file changed, using a fixed bot author. It SHALL use no secret other than the built-in `GITHUB_TOKEN`. The publisher SHALL be runnable with one documented command outside GitHub Actions.

#### Scenario: Nothing changed
- **WHEN** a run produces byte-identical data files
- **THEN** no commit is created

#### Scenario: Overlapping schedule
- **WHEN** a run is still in progress at the next scheduled time
- **THEN** the new run waits or is skipped, and two runs never push at the same time
