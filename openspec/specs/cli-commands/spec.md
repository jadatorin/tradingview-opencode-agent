# CLI Commands Specification

**Domain**: cli-commands  
**Type**: New (no existing spec)

---

## Purpose

Expose a `tv` CLI with 8 subcommands wrapping existing TradingView MCP tools and Binance REST API for ad-hoc terminal workflows without an MCP client.

## Requirements

### Requirement: Entry Point

The system SHALL provide a `tv` binary via `package.json` `"bin"` pointing to `src/cli/index.js` using Commander.js v13+ with global `--json`, `--help`, and `--version` options.

| Exit Code | Meaning |
|-----------|---------|
| 0 | Success |
| 1 | Runtime error |
| 2 | Invalid usage |

#### Scenario: Global --help

- GIVEN `tv` is installed
- WHEN the user runs `tv --help`
- THEN the system SHALL print all available subcommands and global options

### Requirement: Status Command

The system SHALL support `tv status` which checks CDP health and prints connection state.

#### Scenario: CDP connected

- GIVEN Chrome is running with CDP on port 9222 AND a TV tab is open
- WHEN the user runs `tv status`
- THEN the system SHALL print "connected" with the TV tab URL and exit 0

#### Scenario: CDP unavailable

- GIVEN Chrome is NOT running
- WHEN the user runs `tv status`
- THEN the system SHALL print "CDP: disconnected" and exit 1

### Requirement: Quote Command

The system SHALL support `tv quote <symbol>` to fetch a 24hr ticker from Binance REST API.

#### Scenario: Valid symbol

- GIVEN "BTCUSDT" is a valid Binance pair
- WHEN the user runs `tv quote BTCUSDT`
- THEN the system SHALL return symbol, bid, ask, last, high, low, volume, change, change_pct

#### Scenario: Invalid symbol

- GIVEN "XXX123" does not exist
- WHEN the user runs `tv quote XXX123`
- THEN the system SHALL exit 1 with "Binance API error (400)"

### Requirement: OHLCV Command

The system SHALL support `tv ohlcv <symbol> [--timeframe] [--count]` to fetch klines from Binance.

#### Scenario: Default parameters

- GIVEN "BTCUSDT" is valid
- WHEN the user runs `tv ohlcv BTCUSDT`
- THEN the system SHALL return 100 hourly bars by default

#### Scenario: Count cap

- GIVEN the user passes `--count 1000`
- WHEN the system builds the request
- THEN the count SHALL be capped at 500 (CONFIG.MAX_OHLCV_BARS)

### Requirement: Screenshot Command

The system SHALL support `tv screenshot [--filename] [--full-page]` to capture chart via CDP.

#### Scenario: Custom filename

- GIVEN CDP is connected
- WHEN the user runs `tv screenshot --filename mychart.png`
- THEN the system SHALL save PNG to `./screenshots/mychart.png`

### Requirement: Symbol Command

The system SHALL support `tv symbol [--set SYMBOL]` to read or set the chart symbol via CDP.

#### Scenario: Read symbol

- GIVEN TV tab is on a chart page
- WHEN the user runs `tv symbol`
- THEN the system SHALL print current symbol and timeframe

### Requirement: Stream Command

The system SHALL support `tv stream quote <symbol> [--interval]` and `tv stream bars <symbol> [--timeframe] [--interval]` with NDJSON output.

#### Scenario: Quote stream

- GIVEN "BTCUSDT" is valid
- WHEN the user runs `tv stream quote BTCUSDT`
- THEN the system SHALL emit initial snapshot, then delta-only NDJSON lines every 2000ms

### Requirement: Batch Command

The system SHALL support `tv batch --symbols A,B,C --operation quote|ohlcv` for parallel multi-symbol queries.

#### Scenario: Partial failure

- GIVEN symbols "BTCUSDT,XXX"
- WHEN the user runs `tv batch --symbols BTCUSDT,XXX --operation quote`
- THEN the system SHALL return results with BTCUSDT data and an error entry for XXX
