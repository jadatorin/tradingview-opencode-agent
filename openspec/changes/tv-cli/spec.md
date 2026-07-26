# Specification: TV CLI & Streaming

**Change**: tv-cli
**Capabilities**: cli-commands, data-streaming
**Type**: New (no existing specs)

---

## 1. Entry Point

The system SHALL expose a `tv` CLI via `package.json` `"bin"` entry at `src/cli/index.js` using Commander.js v13+.

**Global options**: `--json` (machine-readable output), `--help`, `--version`.

**Exit codes**: `0` success, `1` error, `2` invalid usage.

## 2. Commands

All commands are ESM modules under `src/cli/commands/`.

### 2.1 `tv status`

| Property | Value |
|----------|-------|
| Syntax | `tv status [--json]` |
| Dependencies | CDP (connects to Chrome) |
| Behavior | Runs CDP health check, prints connection state + TV tab URL |
| Exit 0 | CDP connected, TV tab found |
| Exit 1 | CDP unavailable or TV tab not found |
| Output | Human-readable by default, JSON with `--json` |

#### Scenario: CDP connected and TV tab found

- GIVEN Chrome is running with `--remote-debugging-port=9222` AND a TradingView tab is open
- WHEN the user runs `tv status`
- THEN the system SHALL print a status line with "connected", the TV tab URL, and exit code 0

#### Scenario: CDP unavailable

- GIVEN Chrome is NOT running or CDP port is not open
- WHEN the user runs `tv status`
- THEN the system SHALL print "CDP: disconnected" and exit with code 1

### 2.2 `tv quote <symbol>`

| Property | Value |
|----------|-------|
| Syntax | `tv quote <symbol> [--json]` |
| Dependencies | Binance REST API (no CDP) |
| Behavior | Fetches 24hr ticker from Binance `GET /api/v3/ticker/24hr` |
| Exit 0 | Valid symbol, API responds |
| Exit 1 | Invalid symbol, network error, timeout |

#### Scenario: Valid symbol

- GIVEN the symbol "BTCUSDT" maps to a Binance trading pair
- WHEN the user runs `tv quote BTCUSDT`
- THEN the system SHALL return symbol, bid, ask, last, high, low, volume, change, and change_pct

#### Scenario: Invalid symbol

- GIVEN the symbol "XXX123" does not exist on Binance
- WHEN the user runs `tv quote XXX123`
- THEN the system SHALL print an error with "Binance API error (400)" and exit code 1

#### Scenario: No symbol provided

- GIVEN no `<symbol>` argument is provided
- WHEN the user runs `tv quote`
- THEN the system SHALL print usage/error and exit code 2

### 2.3 `tv ohlcv <symbol> [--timeframe] [--count]`

| Property | Value |
|----------|-------|
| Syntax | `tv ohlcv <symbol> [--timeframe <tf>] [--count <N>]` |
| Defaults | `--timeframe` = `1h`, `--count` = `100` |
| Constraints | `--count` max = `CONFIG.MAX_OHLCV_BARS` (500) |
| Dependencies | Binance REST API (no CDP) |
| Behavior | Fetches klines from Binance `GET /api/v3/klines` |
| Exit 0 | Valid request, bars returned |
| Exit 1 | API error, invalid timeframe |

#### Scenario: Fetch 10 hourly bars

- GIVEN symbol "BTCUSDT" exists
- WHEN the user runs `tv ohlcv BTCUSDT --timeframe 1h --count 10`
- THEN the system SHALL return exactly 10 bars with time, open, high, low, close, volume

#### Scenario: Count exceeds max

- GIVEN the user requests `--count 1000`
- WHEN the system queries Binance
- THEN the system SHALL cap `--count` to `CONFIG.MAX_OHLCV_BARS` (500)

### 2.4 `tv screenshot [--filename] [--full-page]`

| Property | Value |
|----------|-------|
| Syntax | `tv screenshot [--filename <name>] [--full-page]` |
| Defaults | `--filename` = auto-generated timestamp, `--full-page` = false |
| Dependencies | CDP (Page.captureScreenshot) |
| Behavior | Captures chart PNG via CDP, saves to `./screenshots/` |
| Exit 0 | Screenshot saved |
| Exit 1 | CDP unavailable, TV tab not found, write error |

#### Scenario: Default filename

- GIVEN CDP is connected and TV tab is open
- WHEN the user runs `tv screenshot`
- THEN the system SHALL save a PNG to `./screenshots/tv-{timestamp}.png`

#### Scenario: Custom filename

- WHEN the user runs `tv screenshot --filename test.png`
- THEN the system SHALL save to `./screenshots/test.png`

#### Scenario: CDP not connected

- GIVEN Chrome is not running
- WHEN the user runs `tv screenshot`
- THEN the system SHALL exit with code 1 and print "Screenshot failed: CDP unavailable"

### 2.5 `tv symbol [--set SYMBOL]`

| Property | Value |
|----------|-------|
| Syntax | `tv symbol [--set <symbol>]` |
| Dependencies | CDP for `--set`; none for read |
| Behavior | Without `--set`: reads current chart symbol + timeframe from TV tab URL. With `--set`: navigates to new symbol. |
| Exit 0 | Success (read or set) |
| Exit 1 | CDP unavailable, invalid symbol, navigation timeout |

#### Scenario: Read current symbol

- GIVEN the TV tab is on a chart page
- WHEN the user runs `tv symbol`
- THEN the system SHALL print the current symbol and timeframe

#### Scenario: Set symbol

- GIVEN CDP is connected
- WHEN the user runs `tv symbol --set BINANCE:ETHUSDT`
- THEN the system SHALL navigate the TV tab to the ETHUSDT chart and print the new symbol

### 2.6 `tv stream quote <symbol> [--interval]`

| Property | Value |
|----------|-------|
| Syntax | `tv stream quote <symbol> [--interval <ms>]` |
| Defaults | `--interval` = `2000` (2s) |
| Dependencies | Binance REST API (no CDP) |
| Behavior | Polls Binance 24hr ticker every N ms, diffs against last snapshot, emits NDJSON deltas |
| Exit 0 | SIGINT/SIGTERM received |
| Exit 1 | Invalid symbol on first poll |

#### Scenario: Stream emits initial snapshot

- GIVEN symbol "BTCUSDT" is valid
- WHEN the user runs `tv stream quote BTCUSDT`
- THEN the first NDJSON line SHALL contain all 24hr fields (full snapshot)

#### Scenario: Stream emits delta on price change

- GIVEN the stream is running
- WHEN the "last" price changes between polls
- THEN the system SHALL emit an NDJSON line with only the changed fields

#### Scenario: SIGINT stops stream

- GIVEN the stream is running
- WHEN the user presses Ctrl-C
- THEN the system SHALL print a final NDJSON line `{"event":"stream.end","reason":"SIGINT"}` and exit 0

### 2.7 `tv stream bars <symbol> [--timeframe] [--interval]`

| Property | Value |
|----------|-------|
| Syntax | `tv stream bars <symbol> [--timeframe <tf>] [--interval <ms>]` |
| Defaults | `--timeframe` = `1m`, `--interval` = `10000` (10s) |
| Dependencies | Binance REST API (no CDP) |
| Behavior | Polls Binance klines, emits only NEW bars (previous close time changed) |
| Exit 0 | SIGINT/SIGTERM |
| Exit 1 | Initial poll fails |

#### Scenario: Stream emits new bars only

- GIVEN the stream is running
- WHEN a new kline closes on Binance
- THEN the system SHALL emit one NDJSON line with the new bar

#### Scenario: Same bar, no emission

- GIVEN the stream is running
- WHEN the latest kline has the same close time as the previous poll
- THEN the system SHALL NOT emit any output

### 2.8 `tv batch --symbols <list> --operation <op>`

| Property | Value |
|----------|-------|
| Syntax | `tv batch --symbols A,B,C --operation quote|ohlcv [--timeframe] [--count]` |
| Dependencies | Binance REST API (no CDP) |
| Behavior | Runs the given operation for each symbol in parallel, aggregates results |
| Exit 0 | All operations succeed |
| Exit 1 | Any operation fails |

#### Scenario: Batch quote for 3 symbols

- GIVEN symbols "BTCUSDT,ETHUSDT,SOLUSDT"
- WHEN the user runs `tv batch --symbols BTCUSDT,ETHUSDT,SOLUSDT --operation quote`
- THEN the system SHALL return an array of 3 quote objects, one per symbol

#### Scenario: Partial failure

- GIVEN one symbol in the list is invalid
- WHEN the user runs `tv batch --symbols BTCUSDT,XXX --operation quote`
- THEN the system SHALL include the error for XXX in the results and exit with the partial results

## 3. Stream Engine

The stream engine (`src/cli/lib/stream-engine.js`) SHALL implement poll-and-diff with NDJSON output.

### Requirements

| ID | Requirement | Scenarios |
|----|------------|-----------|
| SE1 | Poll Binance REST at configurable interval (defaults: quote=2000ms, bars=10000ms) | Interval honored, jitter < 100ms |
| SE2 | Diff against previous snapshot; emit NDJSON with only changed fields | Delta emission, no-change suppression |
| SE3 | Handle SIGINT/SIGTERM with clean teardown | Ctrl-C → stream.end event → exit 0 |
| SE4 | Backoff on HTTP 429: double interval, max 60s, reset on success | 429 → interval doubles, success → reset |
| SE5 | Bounded history: store only last snapshot (no leak) | 10k polls → memory grows < 1MB |

#### Scenario: 429 rate limit backoff

- GIVEN Binance returns HTTP 429
- WHEN the stream engine receives the response
- THEN the poll interval SHALL double (up to 60s max)
- AND on the next successful poll, the interval SHALL reset to default

## 4. Output Formatting

The formatter (`src/cli/lib/formatters.js`) SHALL detect TTY vs pipe:

| Condition | Format |
|-----------|--------|
| stdout is TTY, `--json` NOT set | Pretty-printed (human readable) |
| stdout is piped OR `--json` set | NDJSON or JSON array |
| Stream subcommands | Always NDJSON |

## 5. Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NF1 | All modules MUST use ESM (`import`/`export`) |
| NF2 | Node.js >= 18 compatibility (project already uses Node 22) |
| NF3 | Existing MCP server SHALL continue working — no changes to `src/server.js`, `src/index.js`, or `src/utils/` |
| NF4 | `package.json` SHALL add `"bin": { "tv": "./src/cli/index.js" }` |
| NF5 | `commander@^13.0.0` SHALL be added to `dependencies` |

## 6. File Structure

```
src/cli/
├── index.js              # Entry: shebang, Commander setup, subcommand registration
├── commands/
│   ├── status.js         # tv status
│   ├── quote.js          # tv quote
│   ├── ohlcv.js          # tv ohlcv
│   ├── screenshot.js     # tv screenshot
│   ├── symbol.js         # tv symbol
│   ├── stream.js         # tv stream quote / tv stream bars
│   └── batch.js          # tv batch
└── lib/
    ├── stream-engine.js  # Poll-and-diff engine
    └── formatters.js     # TTY-aware output formatting
```
