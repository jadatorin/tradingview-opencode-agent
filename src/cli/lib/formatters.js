/**
 * @fileoverview TTY-aware output formatting utilities for TV CLI
 * @module src/cli/lib/formatters
 */

/**
 * Detect whether stdout is piped to another process
 * @returns {boolean} true if stdout is not a TTY (piped/redirected)
 */
export function isPipe() {
  return !process.stdout.isTTY;
}

/**
 * Format data as pretty-printed JSON
 * @param {unknown} data - Data to format
 * @returns {string} JSON string with 2-space indentation
 */
export function formatJSON(data) {
  return JSON.stringify(data, null, 2);
}

/**
 * Format data as a single NDJSON line (newline-delimited JSON)
 * @param {unknown} data - Data to format
 * @returns {string} One JSON line + newline
 */
export function formatNDJSON(data) {
  return JSON.stringify(data) + '\n';
}

/**
 * Format an error message to stderr
 * @param {Error|string} err - Error object or message string
 * @returns {string} Formatted error string
 */
export function formatError(err) {
  const message = err instanceof Error ? err.message : String(err);
  // Use a cross-platform marker (no special Unicode on Windows cmd)
  return `[ERROR] ${message}`;
}

// ─── Command-specific formatters (stubs) ───────────────────────────
// These will be fully implemented when each command is built in later batches.

/**
 * Format a quote result for display
 * @param {object} data - Quote data
 * @param {object} [opts] - Formatting options
 * @returns {string} Formatted output
 */
export function formatQuote(data, opts) {
  if (opts?.json || isPipe()) {
    return formatJSON(data);
  }
  const { symbol, last, bid, ask, high, low, volume, change, change_pct } = data;
  return [
    `${symbol}`,
    `  Last: ${last ?? 'N/A'}`,
    `  Bid:  ${bid ?? 'N/A'}  Ask: ${ask ?? 'N/A'}`,
    `  H: ${high ?? 'N/A'}  L: ${low ?? 'N/A'}  Vol: ${volume ?? 'N/A'}`,
    `  Change: ${change ?? 'N/A'} (${change_pct ?? 'N/A'})`,
  ].join('\n');
}

/**
 * Format OHLCV bars for display
 * @param {Array<object>} bars - Array of OHLCV bar objects
 * @param {object} [opts] - Formatting options
 * @returns {string} Formatted output
 */
export function formatOHLCV(bars, opts) {
  if (opts?.json || isPipe()) {
    return formatJSON(bars);
  }
  if (!bars || bars.length === 0) return 'No data';
  const header = 'Time                Open      High      Low       Close     Volume';
  const rows = bars.map(b => {
    const t = b.time ? new Date(b.time).toISOString().replace('T', ' ').slice(0, 19) : 'N/A';
    return `${t}  ${String(b.open).padStart(8)} ${String(b.high).padStart(8)} ${String(b.low).padStart(8)} ${String(b.close).padStart(8)} ${String(b.volume).padStart(8)}`;
  });
  return [header, ...rows].join('\n');
}

/**
 * Format CDP/tab status for display
 * @param {object} state - Status state { connected, tabUrl? }
 * @param {object} [opts] - Formatting options
 * @returns {string} Formatted output
 */
export function formatStatus(state, opts) {
  if (opts?.json || isPipe()) {
    return formatJSON(state);
  }
  if (state.connected && state.tabUrl) {
    return `connected: ${state.tabUrl}`;
  }
  if (state.connected) {
    return 'connected (no TV tab found)';
  }
  return 'CDP: disconnected';
}

/**
 * Format a single stream data point as NDJSON
 * @param {object} data - Stream data point
 * @returns {string} NDJSON line
 */
export function formatStreamData(data) {
  return formatNDJSON(data);
}

/**
 * Format batch results as JSON array
 * @param {Array<object>} results - Array of result objects
 * @param {object} [opts] - Formatting options
 * @returns {string} JSON array string
 */
export function formatBatch(results, opts) {
  if (opts?.pretty && !isPipe()) {
    return formatJSON(results);
  }
  return JSON.stringify(results);
}
