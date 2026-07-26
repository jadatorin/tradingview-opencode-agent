#!/usr/bin/env node

/**
 * @fileoverview `tv ohlcv <symbol> [--timeframe] [--count]` — Get OHLCV data
 * from the Binance public API.
 *
 * No CDP dependency. Works entirely via Binance REST API.
 */

import { Command } from 'commander';
import { getOHLCVData } from '../../utils/cdp-commands.js';
import { formatOHLCV } from '../lib/formatters.js';
import { CONFIG, TIMEFRAME_MAP } from '../../config.js';

/** @type {number} Max bars from project config */
const MAX_BARS = CONFIG.MAX_OHLCV_BARS || 500;

/** @type {string[]} Valid Binance-style timeframe labels */
const VALID_BINANCE_TFS = Object.keys(TIMEFRAME_MAP);
/** @type {string[]} Valid TV-format numeric timeframe values */
const VALID_TV_TFS = Object.values(TIMEFRAME_MAP);

/**
 * Convert a CLI-friendly timeframe string to TradingView format.
 * Maps Binance-style intervals (1m, 5m, 1h, 1d) to TV format (1, 5, 60, 1D).
 * Validates the input against known timeframes and throws on invalid.
 *
 * @param {string} input - Timeframe string from user
 * @returns {string} TV-format timeframe
 * @throws {Error} If the timeframe is not recognized
 */
function toTVTimeframe(input) {
  if (!input) return '60';
  // Already a known TV-format value (e.g. '60', '240', '1D', '1W')
  if (VALID_TV_TFS.includes(input)) return input;
  // Try the config mapping (Binance format → TV format)
  if (VALID_BINANCE_TFS.includes(input)) return TIMEFRAME_MAP[input];
  // Invalid — throw with helpful message
  const valid = [...VALID_BINANCE_TFS, ...VALID_TV_TFS];
  throw new Error(
    `Invalid timeframe "${input}". Valid values: ${valid.join(', ')}`
  );
}

const ohlcvCommand = new Command('ohlcv');

ohlcvCommand
  .description('Get OHLCV candlestick data for a symbol (works without TradingView)')
  .argument('<symbol>', 'Trading symbol (e.g. BTCUSDT, BINANCE:BTCUSDT)')
  .option('--timeframe <interval>', 'Timeframe interval (e.g. 1m, 5m, 1h, 4h, 1d, 1w)', '1h')
  .option('--count <number>', 'Number of bars to return (max ' + MAX_BARS + ')', Number, 100)
  .action(async (symbol, options, command) => {
    try {
      const normalizedSymbol = symbol.trim();

      // Validate and cap count
      const rawCount = Number.isNaN(options.count) ? 100 : options.count;
      const count = Math.min(rawCount, MAX_BARS);
      if (count !== rawCount) {
        process.stderr.write(`[INFO] Count capped to ${MAX_BARS} (max allowed)\n`);
      }

      // Convert timeframe to TV format for the existing cdp-commands helper
      const tvTimeframe = toTVTimeframe(options.timeframe);

      const globalOpts = command.optsWithGlobals();
      const bars = await getOHLCVData(normalizedSymbol, tvTimeframe, count);

      if (!bars || bars.length === 0) {
        process.stderr.write('[INFO] No data returned for this symbol/timeframe combination\n');
      }

      process.stdout.write(formatOHLCV(bars, { json: globalOpts.json }) + '\n');
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default ohlcvCommand;
