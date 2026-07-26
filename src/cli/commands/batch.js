#!/usr/bin/env node

/**
 * @fileoverview `tv batch --symbols A,B,C --operation quote|ohlcv` — Multi-symbol queries
 * @module src/cli/commands/batch
 *
 * Queries multiple symbols sequentially and collects results.
 * Partial failures are included in the results array — a single symbol error
 * does NOT abort the entire batch.
 *
 * Output modes:
 *   - TTY: pretty-printed JSON array
 *   - Piped: NDJSON (one result object per line)
 *   - --json flag: pretty-printed JSON array
 */

import { Command } from 'commander';
import { getQuote, getOHLCVData } from '../../utils/cdp-commands.js';
import { formatJSON, formatNDJSON, isPipe } from '../lib/formatters.js';
import { CONFIG, TIMEFRAME_MAP } from '../../config.js';

/** @type {number} Max bars from project config */
const MAX_BARS = CONFIG.MAX_OHLCV_BARS || 500;

/**
 * Convert a CLI-friendly timeframe string to TradingView format.
 * @param {string} input - Timeframe string from user
 * @returns {string} TV-format timeframe
 */
function toTVTimeframe(input) {
  if (!input) return '60';
  if (/^\d+$/.test(input)) return input;
  return TIMEFRAME_MAP[input] || input;
}

const batchCommand = new Command('batch');

batchCommand
  .description('Query multiple symbols (sequential, partial failure tolerance)')
  .requiredOption(
    '--symbols <list>',
    'Comma-separated symbol list (e.g. "BTCUSDT,ETHUSDT,SOLUSDT")'
  )
  .requiredOption(
    '--operation <type>',
    'Operation to perform: quote | ohlcv'
  )
  .option('--timeframe <interval>', 'Timeframe for ohlcv operation (e.g. 1m, 1h, 1d)', '1h')
  .option('--count <number>', 'Number of bars for ohlcv (max ' + MAX_BARS + ')', Number, 100)
  .action(async (options, command) => {
    try {
      // ─── Parse and validate symbols ──────────────────────────────────
      const symbols = String(options.symbols)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      if (symbols.length === 0) {
        process.stderr.write('[ERROR] No symbols provided. Use --symbols with comma-separated values (e.g. --symbols "BTCUSDT,ETHUSDT").\n');
        process.exit(1);
      }

      // ─── Validate operation ──────────────────────────────────────────
      const operation = String(options.operation).toLowerCase();

      if (operation !== 'quote' && operation !== 'ohlcv') {
        process.stderr.write("[ERROR] --operation must be 'quote' or 'ohlcv'\n");
        process.exit(1);
      }

      const globalOpts = command.optsWithGlobals();

      // ─── Validate ohlcv options ──────────────────────────────────────
      let count = 100;
      if (operation === 'ohlcv') {
        const rawCount = Number.isNaN(options.count) ? 100 : options.count;
        count = Math.min(rawCount, MAX_BARS);
        if (count !== rawCount) {
          process.stderr.write(`[INFO] Count capped to ${MAX_BARS} (max allowed)\n`);
        }
      }

      const tvTimeframe = operation === 'ohlcv' ? toTVTimeframe(options.timeframe) : null;

      // ─── Sequential execution (avoid rate limiting) ──────────────────
      const results = [];
      for (const symbol of symbols) {
        try {
          let data;

          if (operation === 'quote') {
            data = await getQuote(symbol);
          } else {
            data = await getOHLCVData(symbol, tvTimeframe, count);
          }

          results.push({ symbol, status: 'ok', data });
        } catch (err) {
          results.push({ symbol, status: 'error', error: err.message });
        }
      }

      // ─── Output ──────────────────────────────────────────────────────
      // Pipe mode: NDJSON (one result per line for streaming consumption)
      // TTY mode: pretty-printed JSON array
      const pipe = isPipe();
      if (pipe) {
        for (const result of results) {
          process.stdout.write(formatNDJSON(result));
        }
      } else {
        process.stdout.write(formatJSON(results) + '\n');
      }
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default batchCommand;
