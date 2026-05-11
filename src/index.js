/**
 * @fileoverview TradingView MCP Server - Entry Point
 * @module index
 */
import { server } from './server.js';
import { CONFIG } from './config.js';
import { connectCDP, disconnectCDP } from './utils/cdp-client.js';

/**
 * Initialize and start the MCP server
 */
async function main() {
  console.error('[Index] TradingView MCP Server initializing...');
  console.error(`[Index] CDP Target: ${CONFIG.CDP_HOST}:${CONFIG.CDP_PORT}`);

  // Attempt CDP connection (non-blocking for now)
  try {
    console.error('[Index] Testing CDP connection...');
    await connectCDP();
    console.error('[Index] CDP connection established');
  } catch (error) {
    console.error(`[Index] Warning: CDP not available - ${error.message}`);
    console.error('[Index] Server will continue without live connection');
  }

  // The actual server connection happens in server.js via main()
  // This file handles initialization and config loading
}

main().catch(console.error);

export { server };
