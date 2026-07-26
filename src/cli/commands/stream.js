#!/usr/bin/env node

/**
 * @fileoverview `tv stream quote|bars <symbol>` — Streaming data commands
 * @module src/cli/commands/stream
 *
 * Streams real-time data via the poll-and-diff engine.
 * - Output: NDJSON to stdout (one JSON object per line)
 * - Errors: stderr
 * - Signal handling: SIGINT / SIGTERM → clean teardown → exit 0
 *
 * Subcommands:
 *   stream quote <symbol> [--interval ms]   Poll quote every N ms (min 1000)
 *   stream bars  <symbol> [--timeframe tf] [--interval ms]   Poll bars
 */

import { Command } from 'commander';
import { getQuote, getOHLCVData } from '../../utils/cdp-commands.js';
import { createStream } from '../lib/stream-engine.js';
import { formatNDJSON, formatError } from '../lib/formatters.js';

const streamCommand = new Command('stream');

streamCommand
  .description('Stream real-time market data');

// ═══════════════════════════════════════════════════════════════════
//  stream quote <symbol>
// ═══════════════════════════════════════════════════════════════════

streamCommand
  .command('quote')
  .description('Stream live quote updates for a symbol')
  .argument('<symbol>', 'Trading symbol (e.g. BTCUSDT, BINANCE:BTCUSDT)')
  .option('--interval <ms>', 'Poll interval in milliseconds (default: 3000, min: 1000)', Number, 3000)
  .action(async (symbol, options) => {
    const interval = Math.max(options.interval || 3000, 1000);

    /**
     * Quote differ: compare last price.
     * First call always emits (no snapshot).
     * Subsequent calls compare string-coerced last price.
     */
    const differ = (data, snapshot) => {
      if (!snapshot) return true;
      return String(data.last) !== String(snapshot.last);
    };

    function onData(data) {
      const output = {
        type: 'quote',
        symbol,
        data,
        timestamp: Date.now()
      };
      process.stdout.write(formatNDJSON(output));
    }

    function onError(err) {
      process.stderr.write(formatError(err) + '\n');
    }

    const stream = createStream({
      interval,
      fetcher: () => getQuote(symbol),
      differ,
      onData,
      onError
    });

    // ── Signal handlers: clean teardown ──
    const cleanup = () => {
      stream.stop();
      process.stderr.write('\n');
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    await stream.promise;
  });

// ═══════════════════════════════════════════════════════════════════
//  stream bars <symbol>
// ═══════════════════════════════════════════════════════════════════

/**
 * Map a timeframe string to a default poll interval (ms).
 * Scales up for higher timeframes since bars change less frequently.
 *
 * @param {string} tf - Timeframe (TV format: '1', '5', '60', '1D', or shorthand: '1m', '1d')
 * @returns {number} Interval in milliseconds
 */
function barsDefaultInterval(tf) {
  const map = {
    '1': 10000,   '1m': 10000,
    '5': 15000,   '5m': 15000,
    '15': 20000,  '15m': 20000,
    '30': 30000,  '30m': 30000,
    '60': 30000,  '1h': 30000,
    '120': 40000, '2h': 40000,
    '240': 60000, '4h': 60000,
    '360': 60000, '6h': 60000,
    '480': 60000, '8h': 60000,
    '720': 60000, '12h': 60000,
    '1D': 60000,  '1d': 60000,
    '1W': 120000, '1w': 120000
  };
  return map[tf] || 10000;
}

streamCommand
  .command('bars')
  .description('Stream live bar (candlestick) updates for a symbol')
  .argument('<symbol>', 'Trading symbol (e.g. BTCUSDT, BINANCE:BTCUSDT)')
  .option('--timeframe <interval>', 'Timeframe (e.g. 1m, 5m, 1h, 1d, 1w)', '1d')
  .option('--interval <ms>', 'Poll interval in milliseconds (overrides auto-calculation)', Number)
  .action(async (symbol, options) => {
    // Resolve timeframe to TV format
    const { TIMEFRAME_MAP } = await import('../../config.js');
    const rawTf = String(options.timeframe || '1d');
    const timeframe = /^\d+$/.test(rawTf) ? rawTf : (TIMEFRAME_MAP[rawTf] || rawTf);

    // Resolve interval: explicit --interval wins, else auto-calculate
    const interval = options.interval
      ? Math.max(Number(options.interval), 5000)
      : barsDefaultInterval(timeframe);

    /**
     * Bars differ: watches the last bar's open time.
     *
     * Fetcher returns bars from getOHLCVData (chronological order).
     * The last element (data[length-1]) is the current forming bar.
     *
     * First call: emit the current bar as intrabar.
     * Time change: previous bar is now completed → emit completed + new intrabar.
     * Same time, different close → intrabar update.
     *
     * Attaches _streamEvents to data so onData can emit the right NDJSON lines.
     */
    const differ = (data, snapshot) => {
      if (!data || data.length === 0) return false;

      const curr = data[data.length - 1];

      if (!snapshot) {
        // First poll — emit current forming bar as intrabar
        data._streamEvents = [{ type: 'intrabar', bar: curr }];
        return true;
      }

      const prev = snapshot[snapshot.length - 1];

      if (curr.time !== prev.time) {
        // New bar formed: the previous bar is now completed,
        // the current bar is the new forming bar.
        data._streamEvents = [
          { type: 'completed', bar: prev },
          { type: 'intrabar', bar: curr }
        ];
        return true;
      }

      if (curr.close !== prev.close) {
        // Same bar, price changed — intrabar update
        data._streamEvents = [{ type: 'intrabar', bar: curr }];
        return true;
      }

      return false;
    };

    function onData(data) {
      const events = data._streamEvents || [];
      // Clean up the temporary flag
      delete data._streamEvents;

      for (const ev of events) {
        const output = {
          type: 'bar',
          symbol,
          timeframe,
          data: ev.bar,
          intrabar: ev.type === 'intrabar',
          timestamp: Date.now()
        };
        process.stdout.write(formatNDJSON(output));
      }
    }

    function onError(err) {
      process.stderr.write(formatError(err) + '\n');
    }

    const stream = createStream({
      interval,
      fetcher: () => getOHLCVData(symbol, timeframe, 2),
      differ,
      onData,
      onError
    });

    // ── Signal handlers: clean teardown ──
    const cleanup = () => {
      stream.stop();
      process.stderr.write('\n');
      process.exit(0);
    };
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);

    await stream.promise;
  });

export default streamCommand;
