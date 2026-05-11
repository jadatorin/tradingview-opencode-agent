/**
 * @fileoverview Configuration for TradingView MCP Server
 * @module config
 */

/**
 * Server configuration constants
 * @typedef {Object} Config
 * @property {number} CDP_PORT - Remote debugging port for Chrome
 * @property {string} CDP_HOST - Chrome host address
 * @property {string} SCREENSHOT_DIR - Directory for screenshot output
 * @property {number} MAX_OHLCV_BARS - Maximum historical bars to fetch
 * @property {number} TIMEOUT_MS - Default operation timeout
 * @property {number} RETRY_ATTEMPTS - Connection retry attempts
 * @property {number} RETRY_DELAY_MS - Delay between retries
 */
export const CONFIG = {
  /** Remote debugging port (Chrome launched with --remote-debugging-port=9222) */
  CDP_PORT: 9222,
  
  /** Target Chrome host */
  CDP_HOST: 'localhost',
  
  /** Where to save screenshots */
  SCREENSHOT_DIR: './screenshots',
  
  /** Maximum OHLCV bars per request */
  MAX_OHLCV_BARS: 500,
  
  /** Default timeout for CDP operations (ms) */
  TIMEOUT_MS: 30000,
  
  /** Connection retry attempts */
  RETRY_ATTEMPTS: 3,
  
  /** Delay between retries (ms) */
  RETRY_DELAY_MS: 1000
};

/**
 * TradingView symbol mappings (exchange:symbol format)
 * @type {Record<string, string>}
 */
export const SYMBOL_MAPPINGS = {
  'BTCUSD': 'BINANCE:BTCUSD',
  'BTCUSDT': 'BINANCE:BTCUSDT',
  'ETHUSD': 'BINANCE:ETHUSD',
  'ETHUSDT': 'BINANCE:ETHUSDT',
  'AAPL': 'NASDAQ:AAPL',
  'GOOGL': 'NASDAQ:GOOGL',
  'MSFT': 'NASDAQ:MSFT'
};

/**
 * Timeframe mappings
 * @type {Record<string, string>}
 */
export const TIMEFRAME_MAP = {
  '1m': '1',
  '5m': '5',
  '15m': '15',
  '30m': '30',
  '1h': '60',
  '4h': '240',
  '1D': '1D',
  '1W': '1W'
};

export default CONFIG;
