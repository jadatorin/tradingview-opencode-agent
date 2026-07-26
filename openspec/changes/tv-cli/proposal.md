# Proposal: TV CLI & Streaming

## Intent

Add a `tv` CLI (Commander.js) wrapping existing MCP tools with streaming data
for ad-hoc terminal workflows — no MCP client needed.

## Scope

### In Scope

- `tv status` — CDP health check via MCP reuse
- `tv quote <symbol>` — Binance REST real-time quote
- `tv ohlcv <symbol> [--timeframe] [--count]` — Binance OHLCV klines
- `tv screenshot [--filename]` — chart capture via CDP
- `tv symbol [--set SYMBOL]` — show/set active chart symbol
- `tv stream quote <symbol>` — poll-and-diff NDJSON streaming
- `tv stream bars <symbol> [--timeframe]` — streaming OHLCV bars
- `tv batch --symbols A,B,C --operation quote|ohlcv` — multi-symbol
- Poll-and-diff engine, NDJSON output, signal teardown

### Out of Scope

- Streaming study values, alert management, drawing, replay controls

## Capabilities

### New Capabilities

- `cli-commands`: Entry point (`tv`) with 6 subcommands + stream & batch ops
- `data-streaming`: Poll-and-diff engine emitting NDJSON deltas

### Modified Capabilities

None — no existing specs in `openspec/specs/`.

## Approach

1. Entry: `src/cli/index.js` (shebang, Commander.js)
2. One file per command in `src/cli/commands/`
3. Shared engine in `src/cli/lib/stream-engine.js` (poll Binance REST, diff, NDJSON)
4. Formatters in `src/cli/lib/formatters.js` (NDJSON if piped, pretty if TTY)
5. Reuse `src/utils/cdp-commands.js` for CDP-dependent commands
6. Add `commander@^13.0.0` to dependencies
7. SIGINT/SIGTERM handlers for clean teardown

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `package.json` | Modified | Add `commander@^13.0.0` |
| `src/cli/index.js` | New | Entry point |
| `src/cli/commands/` | New | 6+ command files |
| `src/cli/lib/stream-engine.js` | New | Poll-and-diff |
| `src/cli/lib/formatters.js` | New | Output formatting |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Binance API rate limits | Medium | Configurable poll interval, backoff |
| CDP dependency for screenshot/status | Medium | Graceful fallback with clear error |
| Streaming memory leak | Low | Bounded history (keep last snapshot only) |

## Rollback Plan

Revert `package.json`, delete `src/cli/`. No existing functionality affected.

## Dependencies

- `commander@^13.0.0` (new dependency)
- Existing `src/utils/cdp-commands.js` / `cdp-client.js` (unchanged)

## Success Criteria

- [ ] `tv status` prints CDP connection state within 5s
- [ ] `tv quote BTCUSDT` returns all 24hr fields
- [ ] `tv ohlcv BTCUSDT --timeframe 1h --count 10` returns 10 bars
- [ ] `tv screenshot --filename test.png` saves PNG to `./screenshots/`
- [ ] `tv symbol --set BINANCE:ETHUSDT` updates chart
- [ ] `tv stream quote BTCUSDT` emits NDJSON deltas
- [ ] `tv stream bars BTCUSDT --timeframe 1m` emits new bars
- [ ] `tv batch --symbols BTCUSDT,ETHUSDT --operation quote` returns both
- [ ] Ctrl-C stops streaming cleanly
- [ ] Existing MCP tools continue working
