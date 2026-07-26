/**
 * @fileoverview Chrome DevTools Protocol client wrapper
 * @module utils/cdp-client
 */
import CDP from 'chrome-remote-interface';
import { CONFIG } from '../config.js';

/**
 * CDP connection state (browser-level connection)
 */
let connection = null;
let isConnected = false;

/**
 * Sleep utility
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Connect to Chrome via CDP with automatic retries
 * Connects at the browser level (not to a specific tab).
 * @returns {Promise<import('chrome-remote-interface').ChromeAPI>}
 */
export async function connectCDP() {
  if (isConnected && connection) {
    return connection;
  }

  let lastError;
  
  for (let attempt = 1; attempt <= CONFIG.RETRY_ATTEMPTS; attempt++) {
    try {
      connection = await CDP({ host: CONFIG.CDP_HOST, port: CONFIG.CDP_PORT });
      
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
 * Execute CDP command with timeout (callback-style)
 * @param {string} domain - CDP domain (e.g., 'Page', 'Runtime')
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

// =============================================================================
// TAB-SPECIFIC CDP OPERATIONS
// =============================================================================

/**
 * List all Chrome targets/tabs via the CDP HTTP endpoint.
 * This is the standard way to discover open tabs.
 * @returns {Promise<Array<{id: string, type: string, url: string, title: string}>>}
 */
export async function listTargets() {
  try {
    const response = await fetch(
      `http://${CONFIG.CDP_HOST}:${CONFIG.CDP_PORT}/json`
    );
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    throw new Error(
      `Cannot list Chrome targets. Is Chrome running with --remote-debugging-port=${CONFIG.CDP_PORT}? ${error.message}`
    );
  }
}

/**
 * Find the TradingView page target from the list of Chrome tabs.
 * Filters by url containing "tradingview.com" and type "page".
 * @returns {Promise<{id: string, type: string, url: string, title: string}>}
 */
export async function getTVTab() {
  const targets = await listTargets();
  const tvTarget = targets.find(
    t => t.url && t.url.toLowerCase().includes('tradingview.com') && t.type === 'page'
  );

  if (!tvTarget) {
    throw new Error(
      'TradingView tab not found. Open https://www.tradingview.com/ in Chrome and try again.'
    );
  }

  return tvTarget;
}

/**
 * Connect CDP to a specific target/tab by its ID.
 * The returned client has page-level domain access (Page, Runtime, etc.).
 * @param {string} targetId - The target ID from listTargets()
 * @returns {Promise<import('chrome-remote-interface').ChromeAPI>}
 */
export async function connectToTarget(targetId) {
  try {
    const client = await CDP({
      host: CONFIG.CDP_HOST,
      port: CONFIG.CDP_PORT,
      target: targetId
    });
    return client;
  } catch (error) {
    throw new Error(`Failed to connect to target ${targetId}: ${error.message}`);
  }
}

/**
 * Evaluate JavaScript on the TradingView page via Runtime.evaluate.
 * Connects to the TV tab, evaluates the expression, and disconnects.
 * @param {string} expression - JavaScript expression to evaluate
 * @returns {Promise<any>} The serialized result value
 */
export async function evaluateOnTV(expression) {
  const tvTarget = await getTVTab();
  const client = await connectToTarget(tvTarget.id);

  try {
    const { Runtime } = client;
    await Runtime.enable();

    const result = await Runtime.evaluate({
      expression,
      returnByValue: true,
      awaitPromise: false
    });

    if (result.exceptionDetails) {
      throw new Error(
        `Page evaluation error: ${result.exceptionDetails.text || result.exceptionDetails.exception?.description || 'Unknown error'}`
      );
    }

    return result.result?.value ?? null;
  } catch (error) {
    if (error.message.startsWith('Page evaluation error:')) {
      throw error;
    }
    throw new Error(`CDP evaluation failed: ${error.message}`);
  } finally {
    try { await client.close(); } catch { /* ignore close errors */ }
  }
}

/**
 * Navigate the TradingView tab to a given URL via Page.navigate.
 * Waits for the load event (with a timeout) before returning.
 * @param {string} url - The URL to navigate to
 * @returns {Promise<{frameId: string, url: string}>}
 */
export async function navigateTV(url) {
  const tvTarget = await getTVTab();
  const client = await connectToTarget(tvTarget.id);

  try {
    const { Page } = client;
    await Page.enable();

    // Set up load event listener BEFORE navigating
    const loadPromise = Page.loadEventFired();

    const navResult = await Page.navigate({ url });

    // Wait for load with a safety timeout (10s max)
    await Promise.race([
      loadPromise,
      sleep(10000)
    ]);

    console.log(`[CDP] Navigated TV tab to: ${url}`);
    return {
      frameId: navResult.frameId,
      url
    };
  } catch (error) {
    throw new Error(`Navigation failed: ${error.message}`);
  } finally {
    try { await client.close(); } catch { /* ignore close errors */ }
  }
}

/**
 * Capture a screenshot of the TradingView page via Page.captureScreenshot.
 * @param {Object} [params={}] - Screenshot parameters
 * @param {string} [params.format='png'] - Image format ('png' or 'jpeg')
 * @param {number} [params.quality] - JPEG quality (1-100, only for jpeg)
 * @returns {Promise<{data: string, format: string}>} Base64-encoded image data
 */
export async function captureScreenshotTV(params = {}) {
  const tvTarget = await getTVTab();
  const client = await connectToTarget(tvTarget.id);

  try {
    const { Page } = client;
    await Page.enable();

    const screenshotParams = {
      format: params.format || 'png',
      ...(params.quality ? { quality: params.quality } : {}),
      ...(params.clip ? { clip: params.clip } : {}),
      fromSurface: true
    };

    const result = await Page.captureScreenshot(screenshotParams);

    return {
      data: result.data,
      format: screenshotParams.format
    };
  } catch (error) {
    throw new Error(`Screenshot capture failed: ${error.message}`);
  } finally {
    try { await client.close(); } catch { /* ignore close errors */ }
  }
}

/**
 * Get current page info (URL, title, target ID) for the TradingView tab.
 * Reads from the targets list — does NOT require a WebSocket connection.
 * @returns {Promise<{url: string, title: string, id: string}>}
 */
export async function getPageInfo() {
  const tvTarget = await getTVTab();
  return {
    url: tvTarget.url || '',
    title: tvTarget.title || '',
    id: tvTarget.id
  };
}

export default { connectCDP, executeCDP, healthCheck, disconnectCDP, listTargets, getTVTab, connectToTarget, evaluateOnTV, navigateTV, captureScreenshotTV, getPageInfo };
