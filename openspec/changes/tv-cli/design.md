# Design: TV CLI & Streaming

## Technical Approach

A Node.js ESM CLI (`tv`) built with Commander.js that wraps existing Binance REST utilities (`cdp-commands.js`) and CDP primitives (`cdp-client.js`) for terminal workflows. The CLI shares imports but runs independently — not through the MCP server. Streaming uses a poll-and-diff engine emitting NDJSON to stdout. No transpilation step; the `"bin"` entry points directly at `src/cli/index.js`.

## Architecture Decisions

### Decision: Direct import vs IPC to MCP server

| Option | Tradeoff |
|--------|----------|
| CLI imports utils directly | ✅ Zero latency, no port conflicts, simple — reuses existing `cdp-commands.js`/`cdp-client.js` |
| CLI calls MCP server via stdin/stdout | ❌ Circular dependency, adds protocol overhead, couples CLI to server lifecycle |
| **Choice** | Direct import from `src/utils/` |

### Decision: Poll-and-diff vs WebSocket for streaming

| Option | Tradeoff |
|--------|----------|
| Poll Binance REST + diff | ✅ No API key needed, simple, works with existing `getQuote`/`getOHLCVData` |
| Binance WebSocket | ❌ Requires ws dependency, auth for private streams, reconnect logic |
| **Choice** | Poll-and-diff — matches existing codebase pattern zero new external deps |

### Decision: Commander.js command registration

| Option | Tradeoff |
|--------|----------|
| `.addCommand(module)` | ✅ Each command is a standalone ESM module, tree-shakeable, testable in isolation |
| `.command()` inline | ❌ Bloats entry point, mixes concerns |
| **Choice** | Each file under `src/cli/commands/` exports a `Command`, entry calls `program.addCommand()` |

## Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                     CLI Entry (src/cli/index.js)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ status   │  │ quote    │  │ ohlcv    │  │ screenshot  │  │
│  │ commands │  │ command  │  │ command  │  │ command     │  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────┬──────┘  │
│       │              │             │               │          │
│  ┌────▼─────┐  ┌────▼─────┐  ┌────▼─────┐  ┌──────▼──────┐  │
│  │cdp-client│  │cdp-commands────► Binance REST API        │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌─────────────┐               │
│  │ symbol   │  │ batch    │  │ stream       │               │
│  │ command  │  │ command  │  │ command ─────► stream-engine │
│  └────┬─────┘  └────┬─────┘  └──────────────┴──────┬───────┘│
│       │              │                               │       │
│  ┌────▼─────┐  ┌────▼─────┐                  ┌──────▼───────┐
│  │cdp-client│  │cdp-commands                  │ formatters   │
│  └──────────┘  └──────────┘                  └──────────────┘
└─────────────────────────────────────────────────────────────┘
         │                                                    
         ▼                                                    
    stdout (NDJSON if piped / pretty if TTY)                 
    stderr (errors and logs)                                 
```

## Module Design

### `src/cli/index.js`
- Shebang `#!/usr/bin/env node`, ESM imports
- Creates `program = new Command()` — name `"tv"`, version from `package.json`, description, `--json` global flag
- Imports each command module and calls `program.addCommand(cmd)`
- Top-level `process.on('uncaughtException', ...)` → format error, stderr, `process.exit(1)`
- `process.on('SIGINT', ...)` for streaming commands (set flag, let stream engine teardown)

### `src/cli/commands/status.js`
- Exports a `Command` named `"status"`
- `action` calls `healthCheck()` from `cdp-client`
- If connected → print JSON/TTY status. If not → `process.exit(1)`

### `src/cli/commands/quote.js`
- Exports a `Command` named `"quote"` with required positional `<symbol>`
- `action(symbol)` calls `getQuote(symbol)` from `cdp-commands`
- Try/catch Binance API errors → friendly message + exit code 1

### `src/cli/commands/ohlcv.js`
- Exports a `Command` named `"ohlcv"` with required `<symbol>`, options `--timeframe` (default `"1h"`), `--count` (default 100, max 500)
- Resolves timeframe via `TIMEFRAME_MAP` from config, calls `getOHLCVData`
- Formats as table (TTY) or JSON array (pipe)

### `src/cli/commands/screenshot.js`
- Exports a `Command` named `"screenshot"` with `--filename`, `--full-page`
- Calls `captureScreenshotTV()`, writes base64 to `screenshots/` dir
- CDP unavailable → graceful error, exit 1

### `src/cli/commands/symbol.js`
- Exports a `Command` named `"symbol"` with `--set <symbol>`
- No `--set`: calls `getChartState()` → display symbol + timeframe
- With `--set`: calls `navigateToChart()` → confirm

### `src/cli/commands/stream.js`
- Exports a `Command` named `"stream"` with subcommands `quote` and `bars`
- `stream quote <symbol> [--interval]`: calls `createStream(interval, () => getQuote(symbol), quoteDiffer)`
- `stream bars <symbol> [--timeframe] [--interval]`: calls `createStream(interval, () => getOHLCVData(symbol, tf, 1), barDiffer)`
- Pipes data through `formatters.streamFormat()`, handles SIGINT via stream's `stop()`

### `src/cli/commands/batch.js`
- Exports a `Command` named `"batch"` with `--symbols` (required, comma-separated), `--operation` (quote|ohlcv), `--timeframe`
- Splits symbols, calls `getQuote` or `getOHLCVData` in sequence, collects results
- Individual symbol errors → null entry with error field, partial success
- Outputs JSON array

### `src/cli/lib/stream-engine.js`
- `createStream(intervalMs, fetcher, onData)` returns `{ stop }`
- Internally: `setInterval` loop calling `fetcher()`, comparing with previous snapshot via deep equality
- On first call → emits full snapshot
- On subsequent calls → emits only if data changed (reference comparison or field diff)
- HTTP 429 → doubles interval up to 60s, resets on success
- `stop()` clears interval, allowing SIGINT to exit cleanly

### `src/cli/lib/formatters.js`
- `formatQuote(d, opts)` → pretty table row or JSON
- `formatOHLCV(d, opts)` → table (TTY) or JSON array (pipe)
- `formatStatus(d, opts)` → connected/disconnected string
- `formatStreamData(d)` → NDJSON line
- `detectPipe()` → `!process.stdout.isTTY`
- `formatError(err)` → `[ERROR] message` for stderr

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `package.json` | Modify | Add `commander@^13.0.0`, add `"bin": { "tv": "./src/cli/index.js" }`, add `"cli"` script |
| `src/cli/index.js` | Create | Entry point with shebang and Commander setup |
| `src/cli/commands/status.js` | Create | CDP health check command |
| `src/cli/commands/quote.js` | Create | Binance 24hr quote command |
| `src/cli/commands/ohlcv.js` | Create | Historical OHLCV bars command |
| `src/cli/commands/screenshot.js` | Create | CDP screenshot capture command |
| `src/cli/commands/symbol.js` | Create | Get/set chart symbol command |
| `src/cli/commands/stream.js` | Create | Streaming subcommands (quote, bars) |
| `src/cli/commands/batch.js` | Create | Multi-symbol batch command |
| `src/cli/lib/stream-engine.js` | Create | Poll-and-diff streaming engine |
| `src/cli/lib/formatters.js` | Create | TTY/JSON output formatters |
| `src/utils/cdp-client.js` | No change | Already exports all needed functions |
| `src/utils/cdp-commands.js` | No change | Already exports getQuote, getOHLCVData, getChartState, navigateToChart |

## Error Handling

| Error | Exit Code | Behavior |
|-------|-----------|----------|
| Invalid args (missing symbol) | 2 | Commander prints usage help |
| CDP unavailable (status/screenshot/symbol) | 3 | Friendly msg: "CDP unavailable. Is Chrome running with --remote-debugging-port=9222?" |
| Binance API error (quote/ohlcv/batch) | 1 | "Binance API error (status): detail" from `binanceFetch` |
| Network error (any fetch) | 1 | Network error message |
| Stream rate limited (429) | N/A | Double interval (max 60s), emit warning to stderr, continue |
| Uncaught exception | 1 | Catch-all in index.js |

Custom error classes: no — error objects map to exit codes via switch in the command action.

## Streaming Protocol (NDJSON)

```
{"type":"quote","symbol":"BINANCE:BTCUSDT","timestamp":1234567890,"data":{"last":"50000.00","bid":"49990.00","ask":"50010.00","volume":"1234.56","change":"+2.34","change_pct":"+0.47%"}}
{"type":"bar","symbol":"BINANCE:BTCUSDT","timeframe":"1m","timestamp":1234567890,"data":{"open":"50000","high":"50100","low":"49900","close":"50050","volume":"100.5"},"intrabar":false}
```

| Field | Quote | Bar |
|-------|-------|-----|
| `type` | `"quote"` | `"bar"` |
| `symbol` | TradingView symbol | TradingView symbol |
| `timeframe` | — | e.g. `"1m"` |
| `timestamp` | `Date.now()` | Binance close time |
| `data` | Selected quote fields | OHLCV object |
| `intrabar` | — | `false` (only complete bars) |

Default intervals: quote 3s, bars 10s (1m) to 30s (1h timeframes). Memory: one snapshot per stream.

## Dependency & Build

```
npm install commander@^13.0.0
```

| `package.json` change | Value |
|-----------------------|-------|
| `dependencies.commander` | `"^13.0.0"` |
| `bin.tv` | `"./src/cli/index.js"` |
| `scripts.cli` | `"node src/cli/index.js"` |

No build step. ESM direct — Node >= 18 supports all features used.

## Testing Strategy (no test framework)

| Scenario | How to Verify |
|----------|---------------|
| `tv status` (CDP on) | Run with Chrome + TV tab open → expect "connected" + URL |
| `tv status` (CDP off) | Kill Chrome, run → exit 3, error message |
| `tv quote BTCUSDT` | Run → expect 24hr fields |
| `tv quote INVALID` | Run → exit 1, Binance error |
| `tv ohlcv BTCUSDT --count 5` | Run → expect 5 bars in table |
| `tv ohlcv BTCUSDT --count 1000` | Run → capped to 500 (verify via bar count) |
| `tv screenshot` | Run with TV tab open → file saved |
| `tv symbol` | Run → expect current symbol/timeframe |
| `tv symbol --set BINANCE:ETHUSDT` | Run → verify TV tab navigated |
| `tv stream quote BTCUSDT \| head -3` | Pipe → expect 3 NDJSON lines, exit cleanly |
| `tv stream bars BTCUSDT --timeframe 1m` | Run, wait 15s, Ctrl-C → NDJSON lines, clean exit |
| `tv batch --symbols BTCUSDT,ETHUSDT --operation quote` | Run → JSON array with 2 entries |
| `tv --help` | Run → list all commands and options |
| `tv --version` | Run → version string |

## Open Questions

- [ ] Should `stream bars` emit the full current bar (intrabar=true) on each poll, or only completed bars?
- [ ] Confirm default `--count` for `tv ohlcv` — spec says 100, proposal says no default (user prompt said 20 max 500). Aligned to spec value of 100.
