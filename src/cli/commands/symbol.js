#!/usr/bin/env node

/**
 * @fileoverview `tv symbol [--set SYMBOL]` — Show or change the active symbol
 * @module src/cli/commands/symbol
 *
 * Without --set: displays the current symbol and timeframe from the TV tab URL.
 * With --set <symbol>: navigates the TV tab to the given symbol.
 * Exit 3 when CDP is unavailable.
 */

import { Command } from 'commander';
import { healthCheck } from '../../utils/cdp-client.js';
import { getChartState, navigateToChart } from '../../utils/cdp-commands.js';
import { formatJSON, isPipe } from '../lib/formatters.js';

/** Exit code for CDP unavailable */
const CDP_EXIT_CODE = 3;

const symbolCommand = new Command('symbol');

symbolCommand
  .description('Show or set the current TradingView symbol')
  .option('--set <symbol>', 'Navigate to a different symbol (e.g. BINANCE:ETHUSDT)')
  .action(async (options, command) => {
    try {
      const connected = await healthCheck();

      if (!connected) {
        process.stderr.write('[ERROR] TradingView not connected. Use: npm run launch:tv\n');
        process.exit(CDP_EXIT_CODE);
      }

      const globalOpts = command.optsWithGlobals();

      if (options.set) {
        // ─── Navigate to new symbol ───────────────────────────────────
        const currentState = await getChartState();
        const timeframe = currentState.timeframe || '60';
        const result = await navigateToChart(options.set, timeframe);

        if (globalOpts.json || isPipe()) {
          process.stdout.write(formatJSON(result) + '\n');
        } else {
          process.stdout.write(`Navigated to ${result.symbol} (timeframe: ${result.timeframe})\n`);
        }
      } else {
        // ─── Show current symbol ──────────────────────────────────────
        const state = await getChartState();

        if (globalOpts.json || isPipe()) {
          process.stdout.write(formatJSON({
            symbol: state.symbol,
            timeframe: state.timeframe,
            indicators: state.indicators
          }) + '\n');
        } else {
          process.stdout.write(`Symbol:     ${state.symbol}\n`);
          process.stdout.write(`Timeframe:  ${state.timeframe}\n`);
          if (state.indicators && state.indicators.length > 0) {
            process.stdout.write(`Indicators: ${state.indicators.join(', ')}\n`);
          }
        }
      }
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default symbolCommand;
