# Data Streaming Specification

**Domain**: data-streaming  
**Type**: New (no existing spec)

---

## Purpose

Provide a poll-and-diff stream engine that polls Binance REST API at configurable intervals, detects changes from the previous snapshot, and emits NDJSON deltas with clean signal-based teardown.

## Requirements

### Requirement: Poll-and-Diff Engine

The system SHALL implement a poll-and-diff engine in `src/cli/lib/stream-engine.js` that polls Binance REST endpoints at a configurable interval and diffs results against the previous snapshot.

#### Scenario: Initial snapshot

- GIVEN the stream engine starts polling
- WHEN the first poll completes successfully
- THEN the system SHALL emit one NDJSON line with ALL fields (full snapshot)

#### Scenario: Delta emission

- GIVEN a snapshot exists from the previous poll
- WHEN the current poll returns data with changed field values
- THEN the system SHALL emit an NDJSON line containing ONLY the changed fields

#### Scenario: No-change suppression

- GIVEN a snapshot exists from the previous poll
- WHEN the current poll returns identical data
- THEN the system SHALL NOT emit any output

### Requirement: Configurable Interval

The system SHALL accept a configurable poll interval per command with sensible defaults.

| Stream Type | Default Interval | Min | Max |
|-------------|-----------------|-----|-----|
| quote | 2000ms | 1000ms | 60000ms |
| bars | 10000ms | 2000ms | 120000ms |

#### Scenario: Custom interval

- GIVEN the user specifies `--interval 5000`
- WHEN the stream engine runs
- THEN polls SHALL occur every 5000ms (±100ms jitter)

### Requirement: Rate Limit Backoff

The system SHALL detect HTTP 429 responses and apply exponential backoff.

#### Scenario: Backoff on 429

- GIVEN Binance returns HTTP 429
- WHEN the stream engine receives the response
- THEN the poll interval SHALL double (to max 60s)
- AND the engine SHALL NOT stop the stream

#### Scenario: Backoff reset

- GIVEN the engine is in backoff state
- WHEN the next poll succeeds
- THEN the interval SHALL return to the configured default

### Requirement: Signal Teardown

The system SHALL handle SIGINT and SIGTERM for clean stream termination.

#### Scenario: SIGINT during stream

- GIVEN the stream engine is actively polling
- WHEN SIGINT is received
- THEN the system SHALL emit `{"event":"stream.end","reason":"SIGINT"}` as the final NDJSON line
- AND exit with code 0

#### Scenario: SIGTERM during stream

- GIVEN the stream engine is actively polling
- WHEN SIGTERM is received
- THEN the system SHALL emit `{"event":"stream.end","reason":"SIGTERM"}` and exit 0

### Requirement: Bounded Memory

The system SHALL keep only the most recent snapshot in memory.

#### Scenario: No memory leak

- GIVEN the stream runs for 10,000 polls
- WHEN measuring memory usage
- THEN memory SHALL remain stable (< 1MB beyond baseline)

### Requirement: NDJSON Output Format

The system SHALL emit NDJSON (one JSON object per line, terminated by `\n`) for all stream output.

#### Scenario: Pipe detection

- GIVEN stdout is piped to another process (e.g., `tv stream quote BTCUSDT | head -5`)
- WHEN the stream emits data
- THEN each line SHALL be a valid JSON object followed by `\n`
