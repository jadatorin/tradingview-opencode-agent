#!/usr/bin/env node

/**
 * @fileoverview `tv status` — Check CDP connection and TradingView tab status
 * @module src/cli/commands/status
 *
 * Displays connection status, TV URL, active symbol, and timeframe.
 * Exit 3 when CDP is unavailable; exit 0 when connected.
 */

import { Command } from 'commander';
import { healthCheck, getPageInfo } from '../../utils/cdp-client.js';
import { getChartState } from '../../utils/cdp-commands.js';
import { formatStatus } from '../lib/formatters.js';

/** Exit code for CDP unavailable */
const CDP_EXIT_CODE = 3;

const statusCommand = new Command('status');

statusCommand
  .description('Check TradingView connection status')
  .action(async (_options, command) => {
    try {
      const connected = await healthCheck();

      if (!connected) {
        const state = {
          connected: false,
          message: 'TradingView not connected. Use: npm run launch:tv'
        };
        process.stdout.write(formatStatus(state, { json: command.optsWithGlobals().json }) + '\n');
        process.exit(CDP_EXIT_CODE);
      }

      // CDP is connected — gather TV tab info
      let state;

      try {
        const pageInfo = await getPageInfo();
        const chartState = await getChartState();

        state = {
          connected: true,
          tabUrl: pageInfo.url,
          symbol: chartState.symbol,
          timeframe: chartState.timeframe,
          indicators: chartState.indicators
        };
      } catch {
        // TV tab not found or not on a chart page — partial status
        state = {
          connected: true,
          tabUrl: null,
          message: 'CDP connected (no TradingView tab found)'
        };
      }

      process.stdout.write(formatStatus(state, { json: command.optsWithGlobals().json }) + '\n');
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default statusCommand;
