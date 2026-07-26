# Tasks: TV CLI & Streaming

**Change**: tv-cli
**Capabilities**: cli-commands, data-streaming
**Type**: New implementation
**Phase**: tasks

---

## Line Estimates & Review Forecast

| Batch | Description | Est. Lines |
|-------|-------------|-----------|
| 1 | Foundation (package.json, index.js, formatters) | ~200 |
| 2 | REST commands (quote, ohlcv) | ~200 |
| 3 | CDP commands (status, screenshot, symbol) | ~150 |
| 4 | Streaming (stream-engine.js, stream command) | ~250 |
| 5 | Batch command + polish | ~100 |
| **Total** | | **~900** |

**Review forecast**: ~900 estimated lines — marginally over the 800-line review budget.
**Recommendation**: Plan as single PR; if actual implementation crosses 800, split at the Batch 2/3 boundary into 2 chained PRs (foundation+REST → CDP+streaming+batch). Use `feature-branch-chain` strategy if splitting.

---

### Batch 1: Foundation
**Files:** `package.json` (modify), `src/cli/index.js` (create), `src/cli/lib/formatters.js` (create)
**Depends on:** Nothing (project already has ESM, Node >= 18)
**Lines:** ~200
**CDP needed to test?** No (smoke test via `node src/cli/index.js --help`)

1. **[ ] Install commander and add bin entry**
   - Files: `package.json`
   - Action: `npm install commander@^13.0.0`
   - Add `"bin": { "tv": "./src/cli/index.js" }` to package.json
   - Add `"cli": "node src/cli/index.js"` to scripts
   - Acceptance: `npm run cli -- --help` prints usage; `npm run cli -- --version` prints version

2. **[ ] Create CLI entry point (src/cli/index.js)**
   - Files: `src/cli/index.js`
   - Shebang `#!/usr/bin/env node`, ESM imports
   - `import { Command } from 'commander'`
   - Create `program = new Command()` with name `"tv"`, version from package.json, description
   - Global `--json` flag (stored on program for subcommands to read)
   - `process.on('uncaughtException', ...)` → format error to stderr, `process.exit(1)`
   - `process.on('SIGINT', ...)` → set global `process._tvStreamStopping = true` (signal for stream engine)
   - Import and `.addCommand()` for each command module (initially just placeholder imports — actual commands come in later batches)
   - `program.parseAsync(process.argv)` with `.catch()` for error handling
   - Acceptance: `node src/cli/index.js --help` shows all defined commands; invalid command exits with error

3. **[ ] Create output formatters (src/cli/lib/formatters.js)**
   - Files: `src/cli/lib/formatters.js`
   - `detectPipe()` → `!process.stdout.isTTY` (returns true when piped)
   - `shouldOutputJSON(opts)` → true if `--json` flag OR piped output (for non-stream commands)
   - `formatQuote(data, opts)` → pretty table row (TTY) or JSON object (pipe)
   - `formatOHLCV(bars, opts)` → table (TTY) or JSON array (pipe)
   - `formatStatus(state, opts)` → "connected: {url}" or "CDP: disconnected"
   - `formatStreamData(data)` → single NDJSON line (always NDJSON, no TTY detection for streams)
   - `formatError(err)` → colored `[ERROR] message` for stderr (chalk optional — use ANSI codes or plain)
   - `formatBatch(results, opts)` → JSON array
   - Acceptance: Import in test script, call each formatter with mock data, verify output format

---

### Batch 2: Core REST commands (no CDP needed)
**Files:** `src/cli/commands/quote.js` (create), `src/cli/commands/ohlcv.js` (create)
**Depends on:** Batch 1 (formatters, entry point)
**Lines:** ~200
**CDP needed to test?** No (hits Binance REST API directly)

4. **[ ] Create `tv quote` command**
   - Files: `src/cli/commands/quote.js`
   - Export a `Command` named `"quote"` with positional required `<symbol>`
   - Action imports `getQuote` from `../../utils/cdp-commands.js`
   - On success: format via `formatQuote(data, opts)` → stdout, exit 0
   - On Binance API error (400, 40x): friendly message with error code → stderr, exit 1
   - On network error (fetch fail): "Network error: {message}" → stderr, exit 1
   - On missing symbol argument: Commander auto-prints help, exit 2
   - Acceptance: `node src/cli/index.js quote BTCUSDT` prints all 24hr fields; `node src/cli/index.js quote XXX123` exits 1 with Binance error

5. **[ ] Create `tv ohlcv` command**
   - Files: `src/cli/commands/ohlcv.js`
   - Export a `Command` named `"ohlcv"` with required `<symbol>`, options `--timeframe` (default `"1h"`), `--count` (default `100`)
   - Import `CONFIG.MAX_OHLCV_BARS` (500) — cap count if exceeds
   - Import `TIMEFRAME_MAP` from `../../config.js` — validate timeframe, map to Binance interval format
   - Action imports `getOHLCVData` from `../../utils/cdp-commands.js`
   - Output: table (TTY) with columns: time, open, high, low, close, volume — or JSON array (pipe/--json)
   - On invalid timeframe: exit 1 with "Invalid timeframe. Valid: 1m, 5m, 15m, 30m, 1h, 4h, 1D, 1W"
   - Acceptance: `node src/cli/index.js ohlcv BTCUSDT --count 5` shows 5 bars; `--count 1000` caps at 500; invalid timeframe prints error

---

### Batch 3: CDP-dependent commands
**Files:** `src/cli/commands/status.js` (create), `src/cli/commands/screenshot.js` (create), `src/cli/commands/symbol.js` (create)
**Depends on:** Batch 1 (formatters, entry point)
**Lines:** ~150
**CDP needed to test?** Yes — `tv status` needs Chrome; `tv screenshot` and `tv symbol` are CDP-dependent

6. **[x] Create `tv status` command**
   - Files: `src/cli/commands/status.js`
   - Export a `Command` named `"status"`
   - Action imports `healthCheck` + `getTVTab` from `../../utils/cdp-client.js`
   - CDP connected + TV tab found → print "connected: {tab URL}", exit 0
   - CDP connected but no TV tab → print "connected (no TV tab)", exit 0 (debatable — spec says exit 1 for no TV tab, but let's follow the spec which says "CDP connected, TV tab found → exit 0" and "TV tab not found → exit 1")
   - CDP unavailable → print "CDP: disconnected. Is Chrome running with --remote-debugging-port=9222?", exit 3 (per design's exit code for CDP unavailable)
   - Support `--json` flag → structured output
   - Acceptance: With Chrome running → `node src/cli/index.js status` shows "connected: ..."; without Chrome → exit 3 with error message

7. **[x] Create `tv screenshot` command**
   - Files: `src/cli/commands/screenshot.js`
   - Export a `Command` named `"screenshot"` with `--filename` (optional), `--full-page` (flag)
   - Default filename: `tv-{timestamp}.png` (auto-generated timestamp)
   - Import `captureScreenshotTV` from `../../utils/cdp-client.js`
   - Import `CONFIG.SCREENSHOT_DIR` from `../../config.js`
   - Ensure `screenshots/` directory exists (`fs.mkdirSync` if not)
   - Save base64-decoded screenshot to `./screenshots/{filename}`
   - On success: print "Screenshot saved: screenshots/{filename}", exit 0
   - On CDP unavailable: exit 1 with "Screenshot failed: CDP unavailable"
   - Acceptance: With Chrome + TV tab → `node src/cli/index.js screenshot --filename test.png` saves PNG to `./screenshots/test.png`

8. **[x] Create `tv symbol` command**
   - Files: `src/cli/commands/symbol.js`
   - Export a `Command` named `"symbol"` with `--set <symbol>` (optional)
   - Without `--set`: import `getChartState` from `../../utils/cdp-commands.js`, display current symbol + timeframe
   - With `--set`: import `navigateToChart` from `../../utils/cdp-commands.js`, navigate to new symbol, confirm
   - On CDP unavailable without `--set`: exit 1 with "CDP unavailable"
   - On CDP unavailable with `--set`: exit 1 with "Cannot set symbol: CDP unavailable"
   - Acceptance: `node src/cli/index.js symbol` prints current symbol+tf; `node src/cli/index.js symbol --set BINANCE:ETHUSDT` navigates chart

---

### Batch 4: Streaming
**Files:** `src/cli/lib/stream-engine.js` (create), `src/cli/commands/stream.js` (create)
**Depends on:** Batch 1 (formatters, entry point), Batch 2 (quote, ohlcv for fetcher functions)
**Lines:** ~250
**CDP needed to test?** No (Binance REST only)

9. **[ ] Create stream engine (src/cli/lib/stream-engine.js)**
   - Files: `src/cli/lib/stream-engine.js`
   - Export `createStream(intervalMs, fetcher, differ)` returning `{ stop, isRunning }`
   - Internal state: `_intervalId`, `_previousSnapshot`, `_currentInterval`, `_isRunning`
   - On first call to `fetcher()`: store snapshot, emit via callback
   - On subsequent calls: call `fetcher()`, diff against `_previousSnapshot`, if changed → emit delta, update snapshot
   - If unchanged → no emission (skip)
   - Diffs:
     - For quote: deep compare `last`, `bid`, `ask`, `volume`, `high`, `low`, `change`, `change_pct` — emit only changed fields from full snapshot
     - For bars: compare latest bar's close time — emit new bar if close time changed
   - HTTP 429 handling: `_currentInterval` doubles (start at `intervalMs`, cap at 60,000ms), emit warning to stderr, reset on successful poll
   - `stop()`: clears interval, sets `_isRunning = false`, resolves pending
   - Check `process._tvStreamStopping` before each poll cycle — if true, call `stop()` and emit `{"event":"stream.end","reason":"SIGINT"}`
   - Memory: store only last snapshot (`_previousSnapshot`), no history accumulation
   - Acceptance: Integration test with mock fetcher confirms first call emits full, subsequent calls emit deltas only; 429 doubles interval; `stop()` clears interval

10. **[ ] Create `tv stream` command (quote + bars subcommands)**
    - Files: `src/cli/commands/stream.js`
    - Export a `Command` named `"stream"` with subcommands `quote` and `bars`
    - **`stream quote <symbol> [--interval]`**:
      - Default `--interval`: 2000ms
      - Import `getQuote` from `../../utils/cdp-commands.js`
      - Import `createStream` from `../lib/stream-engine.js`
      - Import `formatStreamData` from `../lib/formatters.js`
      - Fetcher: async function calling `getQuote(symbol)`
      - Differ: deep comparison of quote fields
      - On data: format as NDJSON → stdout (type: "quote", symbol, timestamp, data, changed fields)
      - On `stop()`: emit final `{"event":"stream.end","reason":"SIGINT"}`, process.exit(0)
    - **`stream bars <symbol> [--timeframe] [--interval]`**:
      - Defaults: `--timeframe=1m`, `--interval=10000ms` (10s)
      - Import `getOHLCVData` from `../../utils/cdp-commands.js`
      - Fetcher: async function calling `getOHLCVData(symbol, timeframe, 2)` (fetch 2 bars to detect closed bar)
      - Differ: compare latest bar's close time; if changed → emit new bar
      - NDJSON format: type "bar", symbol, timeframe, timestamp, data (ohlcv), **intrabar: true** on each poll update (current in-progress bar), **intrabar: false** when bar is confirmed complete (close time advanced)
      - On `stop()`: same as quote stream
    - SIGINT/SIGTERM: set `process._tvStreamStopping = true` in index.js handler
    - Acceptance: `node src/cli/index.js stream quote BTCUSDT | head -3` emits 3 NDJSON lines then exits; `node src/cli/index.js stream bars BTCUSDT --timeframe 1m` runs until Ctrl-C

---

### Batch 5: Batch command + polish
**Files:** `src/cli/commands/batch.js` (create)
**Depends on:** Batch 2 (quote, ohlcv fetchers), Batch 1 (formatters, entry point)
**Lines:** ~100
**CDP needed to test?** No (Binance REST only)

11. **[ ] Create `tv batch` command**
    - Files: `src/cli/commands/batch.js`
    - Export a `Command` named `"batch"` with:
      - Required `--symbols <list>` (comma-separated)
      - Required `--operation <op>` (choices: `quote`, `ohlcv`)
      - Optional `--timeframe` (only for ohlcv, default `"1h"`)
      - Optional `--count` (only for ohlcv, default `100`, max `500`)
    - Split `--symbols` by comma, trim each
    - Run each symbol's operation via `Promise.allSettled` for parallelism
    - Collect results: fulfilled → data object; rejected → `{ symbol, error: message }`
    - Output: JSON array to stdout
    - Exit 0 always (partial results are valid — spec says "exit 1 if any operation fails" but design says "partial success". Follow spec: exit 1 if ALL fail, exit 0 if at least one succeeds?)
    - Actually follow the scenario: "include the error for XXX in the results and exit with partial results" — so always exit 0 with results including error entries, unless there's a structural error (invalid op, no symbols)
    - Acceptance: `node src/cli/index.js batch --symbols BTCUSDT,ETHUSDT --operation quote` returns 2-object array; `node src/cli/index.js batch --symbols BTCUSDT,XXX --operation quote` returns 2 entries (one with error)

12. **[ ] Edge case hardening + final verification**
    - Files: verify all files from Batches 1–5
    - Verify `tv --help` lists all 8 commands (status, quote, ohlcv, screenshot, symbol, stream, batch) and global `--json` flag
    - Verify `tv --version` matches package.json
    - Verify error messages for missing args (Commander's built-in validation)
    - Verify pipe detection: `tv quote BTCUSDT | cat` outputs JSON, not table
    - Verify `tv stream quote BTCUSDT | head -3` exits cleanly (SIGPIPE handled)
    - Verify no regressions: `npm start` (MCP server) still works
    - Verify `npm test` (`node src/cli/index.js status`) works appropriately
    - Acceptance: All smoke tests pass, existing MCP server unchanged

---

## Dependencies Graph

```
Batch 1 (Foundation)
  ├── Batch 2 (REST commands)
  │     └── Batch 5 (Batch command)
  └── Batch 3 (CDP commands)
  └── Batch 4 (Streaming) ← also depends on Batch 2 (getQuote, getOHLCVData)
```

Batch 5 can start as soon as Batch 2 is done (doesn't need Batch 3 or 4).
Batch 4 needs Batch 2 for the fetcher functions.

Recommended implementation order: 1 → 2 → 3 → 4 → 5 (sequential), or 1 + 2 first, then 3 + 4 in parallel, then 5.

---

## File Creation Summary

| # | File | Action | Est. Lines | Batch |
|---|------|--------|-----------|-------|
| 1 | `package.json` | Modify (+commander, +bin, +cli script) | ~10 diff | 1 |
| 2 | `src/cli/index.js` | Create | ~70 | 1 |
| 3 | `src/cli/lib/formatters.js` | Create | ~120 | 1 |
| 4 | `src/cli/commands/quote.js` | Create | ~60 | 2 |
| 5 | `src/cli/commands/ohlcv.js` | Create | ~80 | 2 |
| 6 | `src/cli/commands/status.js` | Create | ~40 | 3 |
| 7 | `src/cli/commands/screenshot.js` | Create | ~60 | 3 |
| 8 | `src/cli/commands/symbol.js` | Create | ~50 | 3 |
| 9 | `src/cli/lib/stream-engine.js` | Create | ~150 | 4 |
| 10 | `src/cli/commands/stream.js` | Create | ~100 | 4 |
| 11 | `src/cli/commands/batch.js` | Create | ~100 | 5 |
| | **Total** | | **~840** | |

**Zero changes to:** `src/server.js`, `src/index.js`, `src/config.js`, `src/utils/cdp-client.js`, `src/utils/cdp-commands.js`, `src/utils/trading-helpers.js`

---

## Key Design Decisions Enforced

| Decision | Value |
|----------|-------|
| Stream bars intrabar | `true` on each poll update (current in-progress bar), `false` on confirmed completed bar |
| tv ohlcv --count default | 100 |
| tv ohlcv --count max | CONFIG.MAX_OHLCV_BARS (500) |
| Commander.js | ^13.0.0 (must be installed) |
| Module system | ESM throughout, no build step |
| CLI imports | Direct from `src/utils/` — does NOT go through MCP |
| Existing files changed | Only `package.json` — zero changes to `src/` outside `src/cli/` |
| Exit code: CDP unavailable | 3 (per design doc) |
| Exit code: Binance API error | 1 |
| Exit code: Invalid usage | 2 (Commander default) |

---

## Testing Strategy (manual — no test framework)

Each task's acceptance criteria are executable as manual smoke tests. See the design doc for the full manual test matrix. Key tests:

| Test | Command | Expected |
|------|---------|----------|
| Help | `tv --help` | All 8 commands listed |
| Version | `tv --version` | package.json version |
| Quote | `tv quote BTCUSDT` | 24hr ticker fields |
| Invalid quote | `tv quote XXX123` | Exit 1, Binance error |
| OHLCV | `tv ohlcv BTCUSDT --count 5` | 5 bar rows |
| Count cap | `tv ohlcv BTCUSDT --count 1000` | 500 bars (capped) |
| Pipe JSON | `tv quote BTCUSDT \| cat` | JSON output |
| Status (CDP on) | `tv status` | "connected: {url}" |
| Status (CDP off) | `tv status` (Chrome closed) | Exit 3, CDP error |
| Screenshot | `tv screenshot --filename test.png` | File saved |
| Symbol read | `tv symbol` | Current symbol+tf |
| Symbol set | `tv symbol --set BINANCE:ETHUSDT` | Chart navigated |
| Stream quote | `tv stream quote BTCUSDT \| head -3` | 3 NDJSON lines |
| Stream bars | `tv stream bars BTCUSDT` + Ctrl-C | NDJSON bars, clean exit |
| Batch quote | `tv batch --symbols BTCUSDT,ETHUSDT --operation quote` | 2-object array |
| Batch partial | `tv batch --symbols BTCUSDT,XXX --operation quote` | 2 entries, one error |
| SIGINT | `tv stream quote BTCUSDT` (Ctrl-C) | `stream.end` event, exit 0 |
| MCP unaffected | `npm start` (separate terminal) | Server starts, tools work |
