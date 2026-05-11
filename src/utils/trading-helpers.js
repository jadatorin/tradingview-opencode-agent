/**
 * @fileoverview Helper utilities for TradingView MCP Server
 * @module utils/trading-helpers
 */
import { SYMBOL_MAPPINGS, TIMEFRAME_MAP } from '../config.js';

/**
 * Format OHLCV bar for API response
 * @param {Object} bar - Raw bar data from chart
 * @returns {Object} Formatted bar
 */
export function formatOHLCVBar(bar) {
  return {
    time: bar.time || bar.timestamp,
    open: parseFloat(bar.open || bar.o),
    high: parseFloat(bar.high || bar.h),
    low: parseFloat(bar.low || bar.l),
    close: parseFloat(bar.close || bar.c),
    volume: parseFloat(bar.volume || bar.v || 0)
  };
}

/**
 * Format price with appropriate decimal places
 * @param {number} price - Price value
 * @param {number} [decimals=8] - Decimal places
 * @returns {string}
 */
export function formatPrice(price, decimals = 8) {
  return parseFloat(price.toFixed(decimals)).toString();
}

/**
 * Map symbol to TradingView format
 * @param {string} symbol - User symbol input
 * @returns {string} TradingView full symbol (exchange:symbol)
 */
export function resolveSymbol(symbol) {
  const upper = symbol.toUpperCase();
  
  if (SYMBOL_MAPPINGS[upper]) {
    return SYMBOL_MAPPINGS[upper];
  }
  
  // Assume format is already correct
  if (symbol.includes(':')) {
    return symbol;
  }
  
  // Default to Binance
  return `BINANCE:${upper}`;
}

/**
 * Normalize timeframe string
 * @param {string} tf - Timeframe input
 * @returns {string} TradingView timeframe
 */
export function resolveTimeframe(tf) {
  const lower = tf.toLowerCase();
  return TIMEFRAME_MAP[lower] || tf;
}

/**
 * Parse timestamp to Unix milliseconds
 * @param {number|string|Date} timestamp - Input timestamp
 * @returns {number} Unix milliseconds
 */
export function parseTimestamp(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.getTime();
  }
  
  if (typeof timestamp === 'string') {
    return new Date(timestamp).getTime();
  }
  
  // Assume seconds if small number
  if (timestamp < 1e12) {
    return timestamp * 1000;
  }
  
  return timestamp;
}

/**
 * Format timestamp for TradingView
 * @param {number|Date} timestamp - Input timestamp
 * @returns {string} ISO string
 */
export function formatTimestamp(timestamp) {
  if (timestamp instanceof Date) {
    return timestamp.toISOString();
  }
  return new Date(timestamp).toISOString();
}

/**
 * Validate symbol format
 * @param {string} symbol - Symbol to validate
 * @returns {boolean}
 */
export function isValidSymbol(symbol) {
  if (!symbol || typeof symbol !== 'string') return false;
  return symbol.length > 0 && symbol.length < 50;
}

/**
 * Validate timeframe
 * @param {string} tf - Timeframe to validate
 * @returns {boolean}
 */
export function isValidTimeframe(tf) {
  if (!tf || typeof tf !== 'string') return false;
  return ['1', '3', '5', '15', '30', '60', '240', '1D', '1W', '1M'].includes(tf.toUpperCase());
}

/**
 * Format study value for response
 * @param {Object} value - Raw study value
 * @returns {Object}
 */
export function formatStudyValue(value) {
  return {
    name: value.name || value.title,
    value: value.value !== undefined ? value.value : value.values,
    color: value.color || value.plots?.color,
    line_index: value.line_index || 0
  };
}

/**
 * Format Pine line
 * @param {Object} line - Raw Pine line data
 * @returns {Object}
 */
export function formatPineLine(line) {
  return {
    id: line.id || line.line_id,
    value: line.value,
    color: line.color,
    style: line.style || 'solid',
    width: line.width || 1
  };
}

/**
 * Format alert
 * @param {Object} alert - Raw alert data
 * @returns {Object}
 */
export function formatAlert(alert) {
  return {
    id: alert.id,
    name: alert.name || alert.message,
    condition: alert.condition,
    message: alert.message,
    interval: alert.interval,
    enabled: alert.enabled !== false
  };
}

/**
 * Sanitize filename for screenshots
 * @param {string} name - Original name
 * @returns {string}
 */
export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 100);
}

export default {
  formatOHLCVBar,
  formatPrice,
  resolveSymbol,
  resolveTimeframe,
  parseTimestamp,
  formatTimestamp,
  isValidSymbol,
  isValidTimeframe,
  formatStudyValue,
  formatPineLine,
  formatAlert,
  sanitizeFilename
};
