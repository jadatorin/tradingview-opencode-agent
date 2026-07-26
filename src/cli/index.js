#!/usr/bin/env node

/**
 * @fileoverview TV CLI — Entry point with Commander.js
 * @module src/cli/index
 *
 * Provides the `tv` command-line interface for TradingView operations.
 * All command modules are imported and registered here.
 */

import { Command } from 'commander';
import { createRequire } from 'module';
import statusCommand from './commands/status.js';
import quoteCommand from './commands/quote.js';
import ohlcvCommand from './commands/ohlcv.js';
import screenshotCommand from './commands/screenshot.js';
import symbolCommand from './commands/symbol.js';
import streamCommand from './commands/stream.js';
import { formatError } from './lib/formatters.js';

const require = createRequire(import.meta.url);
const pkg = require('../../package.json');

// ─── Program setup ──────────────────────────────────────────────────
const program = new Command();

program
  .name('tv')
  .version(pkg.version)
  .description(pkg.description)
  .option('--json', 'output in JSON format (machine-readable)');

// ─── Register commands ──────────────────────────────────────────────
// Commands will be added as they are implemented in subsequent batches.
program.addCommand(statusCommand);
program.addCommand(quoteCommand);
program.addCommand(ohlcvCommand);
program.addCommand(screenshotCommand);
program.addCommand(symbolCommand);
program.addCommand(streamCommand);

// ─── Error handling ─────────────────────────────────────────────────

// Catch uncaught exceptions and print to stderr
process.on('uncaughtException', (err) => {
  process.stderr.write(formatError(err) + '\n');
  process.exit(1);
});

// Catch unhandled promise rejections
process.on('unhandledRejection', (reason) => {
  const err = reason instanceof Error ? reason : new Error(String(reason));
  process.stderr.write(formatError(err) + '\n');
  process.exit(1);
});

// SIGINT handling — sets a global flag for streaming commands to check.
// Stream engine checks this before each poll cycle and stops cleanly.
process.on('SIGINT', () => {
  process._tvStreamStopping = true;
});

// ─── Execute ────────────────────────────────────────────────────────
program.parseAsync(process.argv).catch((err) => {
  process.stderr.write(formatError(err) + '\n');
  process.exit(1);
});

// Export for testing
export { program };
export default program;
