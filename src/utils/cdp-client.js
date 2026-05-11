/**
 * @fileoverview Chrome DevTools Protocol client wrapper
 * @module utils/cdp-client
 */
import { ChromeLauncher } from 'chrome-remote-interface';
import { CONFIG } from '../config.js';

/**
 * CDP connection state
 */
let connection = null;
let isConnected = false;

/**
 * Connect to Chrome via CDP with automatic retries
 * @returns {Promise<import('chrome-remote-interface').ChromeAPI>}
 */
export async function connectCDP() {
  if (isConnected && connection) {
    return connection;
  }

  let lastError;
  
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      connection = await ChromeLauncher.launch({
        host: CONFIG.CDP_HOST,
        port: CONFIG.CDP_PORT,
        secure: false
      });
      
      isConnected = true;
      console.log(`[CDP] Connected to Chrome on port ${CONFIG.CDP_PORT}`);
      return connection;
    } catch (error) {
      lastError = error;
      console.warn(`[CDP] Connection attempt ${attempt} failed: ${error.message}`);
      
      if (attempt < CONFIG.RETRY_ATTEMPTS) {
        await sleep(CONFIG.RETRY_DELAY_MS);
      }
    }
  }
  
  throw new Error(`CDP connection failed after ${CONFIG.RETRY_ATTEMPTS} attempts: ${lastError.message}`);
}

/**
 * Execute CDP command with timeout
 * @param {string} domain - CDP domain (e.g., 'Page', 'TradingView')
 * @param {string} command - Command name
 * @param {Object} params - Command parameters
 * @returns {Promise<Object>}
 */
export async function executeCDP(domain, command, params = {}) {
  const client = await connectCDP();
  
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`CDP command ${domain}.${command} timed out`));
    }, CONFIG.TIMEOUT_MS);
    
    try {
      const cmd = client[domain][command];
      cmd(params, (err, result) => {
        clearTimeout(timeout);
        
        if (err) {
          reject(new Error(`${domain}.${command} failed: ${err.message}`));
        } else {
          resolve(result);
        }
      });
    } catch (error) {
      clearTimeout(timeout);
      reject(error);
    }
  });
}

/**
 * Check if CDP connection is alive
 * @returns {Promise<boolean>}
 */
export async function healthCheck() {
  try {
    const client = await connectCDP();
    return client !== null && isConnected;
  } catch {
    return false;
  }
}

/**
 * Disconnect from CDP
 */
export async function disconnectCDP() {
  if (connection) {
    try {
      await connection.close();
    } catch (e) {
      // Ignore close errors
    }
    connection = null;
    isConnected = false;
    console.log('[CDP] Disconnected');
  }
}

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default { connectCDP, executeCDP, healthCheck, disconnectCDP };
