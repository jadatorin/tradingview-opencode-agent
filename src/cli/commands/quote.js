#!/usr/bin/env node

/**
 * @fileoverview `tv quote <symbol>` — Get current quote from Binance public API
 * @module src/cli/commands/quote
 *
 * No CDP dependency. Works entirely via Binance REST API.
 */

import { Command } from 'commander';
import { getQuote } from '../../utils/cdp-commands.js';
import { formatQuote } from '../lib/formatters.js';

const quoteCommand = new Command('quote');

quoteCommand
  .description('Get current quote for a symbol (works without TradingView)')
  .argument('<symbol>', 'Trading symbol (e.g. BTCUSDT, BINANCE:BTCUSDT)')
  .action(async (symbol, _options, command) => {
    try {
      const globalOpts = command.optsWithGlobals();
      const data = await getQuote(symbol);
      process.stdout.write(formatQuote(data, { json: globalOpts.json }) + '\n');
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default quoteCommand;
