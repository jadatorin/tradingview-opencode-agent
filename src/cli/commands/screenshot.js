#!/usr/bin/env node

/**
 * @fileoverview `tv screenshot [--filename] [--full-page]` — Capture screenshot
 * @module src/cli/commands/screenshot
 *
 * Captures the current TradingView chart as a PNG image via CDP.
 * Exit 3 when CDP is unavailable.
 */

import { Command } from 'commander';
import { writeFile, mkdir } from 'fs/promises';
import { dirname, resolve } from 'path';
import { healthCheck, captureScreenshotTV } from '../../utils/cdp-client.js';
import { formatJSON } from '../lib/formatters.js';

/** Exit code for CDP unavailable */
const CDP_EXIT_CODE = 3;

const screenshotCommand = new Command('screenshot');

screenshotCommand
  .description('Capture a screenshot of the TradingView chart')
  .option(
    '--filename <path>',
    'Output file path (default: tv-screenshot-{timestamp}.png)'
  )
  .option('--full-page', 'Capture full page content (may require cdp-client update)', false)
  .action(async (options, command) => {
    try {
      const connected = await healthCheck();

      if (!connected) {
        process.stderr.write('[ERROR] TradingView not connected. Use: npm run launch:tv\n');
        process.exit(CDP_EXIT_CODE);
      }

      // Resolve output path — default to current directory with timestamped name
      const filename = options.filename || `tv-screenshot-${Date.now()}.png`;
      const resolvedPath = resolve(filename);

      // Ensure parent directory exists
      const parentDir = dirname(resolvedPath);
      await mkdir(parentDir, { recursive: true });

      // Capture screenshot via CDP (base64-encoded PNG data)
      const params = {
        format: 'png'
      };
      if (options.fullPage) {
        params.captureBeyondViewport = true;
      }

      const result = await captureScreenshotTV(params);

      // Decode base64 and write to file
      const buffer = Buffer.from(result.data, 'base64');
      await writeFile(resolvedPath, buffer);

      // Output
      const globalOpts = command.optsWithGlobals();
      if (globalOpts.json) {
        process.stdout.write(formatJSON({ path: resolvedPath }) + '\n');
      } else {
        process.stdout.write(`Screenshot saved: ${resolvedPath}\n`);
      }
    } catch (err) {
      process.stderr.write(`[ERROR] ${err.message}\n`);
      process.exit(1);
    }
  });

export default screenshotCommand;
