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

/**
 * Convert a CLI-friendly timeframe string to TradingView format.
 * Maps Binance-style intervals (1m, 5m, 1h, 1d) to TV format (1, 5, 60, 1D).
 * Falls through to the raw value if no mapping exists.
 *
 * @param {string} input - Timeframe string from user
 * @returns {string} TV-format timeframe
 */
function toTVTimeframe(input) {
  if (!input) return '60';
  // Already numeric (TV format like '60', '240') or already valid:
  if (/^\d+$/.test(input)) return input;
  // Try the config mapping (Binance format → TV format):
  return TIMEFRAME_MAP[input] || input;
}

const ohlcvCommand = new Command('ohlcv');

ohlcvCommand
  .description('Get OHLCV candlestick data for a symbol (works without TradingView)')
  .argument('<symbol>', 'Trading symbol (e.g. BTCUSDT, BINANCE:BTCUSDT)')
  .option('--timeframe <interval>', 'Timeframe interval (e.g. 1m, 5m, 1h, 4h, 1d, 1w)', '1h')
  .option('--count <number>', 'Number of bars to return (max ' + MAX_BARS + ')', Number, 100)
  .action(async (symbol, options, command) => {
    try {
      // Validate and cap count
      const rawCount = Number.isNaN(options.count) ? 100 : options.count;
      const count = Math.min(rawCount, MAX_BARS);
      if (count !== rawCount) {
        process.stderr.write(`[INFO] Count capped to ${MAX_BARS} (max allowed)\n`);
      }

      // Convert timeframe to TV format for the existing cdp-commands helper
      const tvTimeframe = toTVTimeframe(options.timeframe);

      const globalOpts = command.optsWithGlobals();
      const bars = await getOHLCVData(symbol, tvTimeframe, count);
      process.stdout.write(formatOHLCV(bars, { json: globalOpts.json }) + '\n');
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default ohlcvCommand;
