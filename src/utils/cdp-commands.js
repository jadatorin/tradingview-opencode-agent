/**
 * @fileoverview Higher-level TradingView-specific CDP commands.
 * Combines CDP tab operations with external APIs (Binance) for reliable data.
 * @module utils/cdp-commands
 */
import {
  getTVTab,
  evaluateOnTV,
  navigateTV,
  captureScreenshotTV,
  getPageInfo
} from './cdp-client.js';
import { CONFIG } from '../config.js';

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Mapping from TradingView timeframe format to Binance interval format.
 * @type {Record<string, string>}
 */
const TV_TO_BINANCE_TIMEFRAME = {
  '1': '1m',
  '3': '3m',
  '5': '5m',
  '15': '15m',
  '30': '30m',
  '60': '1h',
  '120': '2h',
  '240': '4h',
  '360': '6h',
  '480': '8h',
  '720': '12h',
  '1D': '1d',
  '3D': '3d',
  '1W': '1w',
  '1M': '1M'
};

/**
 * Map a TradingView symbol (e.g. "BINANCE:BTCUSDT") to a Binance pair ("BTCUSDT").
 * Extracts the symbol part after the colon, or uses the raw symbol if no colon.
 * @param {string} symbol - TradingView symbol
 * @returns {string} Binance pair name
 */
function tvSymbolToBinance(symbol) {
  const parts = symbol.split(':');
  return parts[parts.length - 1].trim().toUpperCase();
}

/**
 * Map a TradingView timeframe string to a Binance API interval.
 * @param {string} tf - TradingView timeframe (e.g. '60', '240', '1D')
 * @returns {string} Binance interval (e.g. '1h', '4h', '1d')
 */
function tvTimeframeToBinance(tf) {
  const normalized = String(tf).toUpperCase();
  return TV_TO_BINANCE_TIMEFRAME[normalized] || '1h';
}

/**
 * Fetch wrapper with error context for Binance public API.
 * @param {string} url - Binance API URL
 * @returns {Promise<any>} Parsed JSON response
 */
/**
 * Default timeout for Binance API requests (10 seconds).
 * Binance REST API is generally fast; anything over 10s is likely a network issue.
 * @type {number}
 */
const BINANCE_TIMEOUT_MS = 10000;

async function binanceFetch(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BINANCE_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Binance API request timed out after ${BINANCE_TIMEOUT_MS}ms`);
    }
    throw new Error(`Network error reaching Binance API: ${err.message}`);
  }
  clearTimeout(timeoutId);

  if (!response.ok) {
    let detail = '';
    try {
      const err = await response.json();
      detail = err.msg || JSON.stringify(err);
    } catch {
      detail = response.statusText;
    }
    throw new Error(`Binance API error (${response.status}): ${detail}`);
  }
  return response.json();
}

// =============================================================================
// CHART STATE
// =============================================================================

/**
 * Get the current chart state by parsing the TradingView tab's URL.
 * Extracts symbol and timeframe from query parameters.
 * Tries to read active indicators via page evaluation (best-effort).
 * @returns {Promise<{symbol: string, timeframe: string, indicators: string[], viewport: {width: number, height: number}}>}
 */
export async function getChartState() {
  const pageInfo = await getPageInfo();
  const url = pageInfo.url;

  let symbol = 'BINANCE:BTCUSDT';
  let timeframe = '60';

  try {
    const urlObj = new URL(url);
    const symParam = urlObj.searchParams.get('symbol');
    if (symParam) {
      symbol = symParam;
    }
    const intervalParam = urlObj.searchParams.get('interval');
    if (intervalParam) {
      timeframe = intervalParam;
    }
  } catch {
    // URL might be invalid or homepage; use defaults
  }

  // Best-effort: try to read indicators from the chart widget via page eval
  let indicators = [];
  try {
    const raw = await evaluateOnTV(`
      (function() {
        try {
          if (window.tvWidget && window.tvWidget.activeChart) {
            var studies = window.tvWidget.activeChart.getAllStudies();
            return studies.map(function(s) { return s.name; });
          }
          return [];
        } catch(e) {
          return [];
        }
      })()
    `);
    if (Array.isArray(raw)) {
      indicators = raw;
    }
  } catch {
    // Page evaluation failed — not on a chart page or widget not loaded
    indicators = [];
  }

  return {
    symbol,
    timeframe,
    indicators,
    viewport: { width: 1920, height: 1080 }
  };
}

/**
 * Navigate the TradingView tab to a specific chart by symbol and timeframe.
 * Waits for page load before returning.
 * @param {string} symbol - TradingView symbol (e.g. "BINANCE:BTCUSDT")
 * @param {string} timeframe - TradingView timeframe (e.g. "60", "240", "1D")
 * @returns {Promise<{status: string, url: string, symbol: string, timeframe: string}>}
 */
export async function navigateToChart(symbol, timeframe) {
  const url = `https://www.tradingview.com/chart/?symbol=${encodeURIComponent(symbol)}&interval=${timeframe}`;
  await navigateTV(url);
  return { status: 'navigated', url, symbol, timeframe };
}

// =============================================================================
// OHLCV DATA (via Binance public REST API)
// =============================================================================

/**
 * Fetch historical OHLCV (kline) data from the Binance public API.
 * This is more reliable than trying to extract chart data from TradingView via CDP.
 *
 * @param {string} symbol - TradingView symbol (e.g. "BINANCE:BTCUSDT")
 * @param {string} timeframe - TradingView timeframe (e.g. "60", "1D")
 * @param {number} [count=100] - Number of bars to fetch (max: CONFIG.MAX_OHLCV_BARS)
 * @returns {Promise<Array<{time: number, open: number, high: number, low: number, close: number, volume: number}>>}
 */
export async function getOHLCVData(symbol, timeframe, count = 100) {
  const binancePair = tvSymbolToBinance(symbol);
  const binanceInterval = tvTimeframeToBinance(timeframe);
  const limit = Math.min(count, CONFIG.MAX_OHLCV_BARS);

  const url = `https://api.binance.com/api/v3/klines?symbol=${binancePair}&interval=${binanceInterval}&limit=${limit}`;
  const klines = await binanceFetch(url);

  // Binance kline array format:
  // [openTime, open, high, low, close, volume, closeTime, quoteVol, trades, takerBuyBase, takerBuyQuote, ignore]
  return klines.map(k => ({
    time: k[0],               // Open time (milliseconds)
    open: parseFloat(k[1]),
    high: parseFloat(k[2]),
    low: parseFloat(k[3]),
    close: parseFloat(k[4]),
    volume: parseFloat(k[5])
  }));
}

// =============================================================================
// QUOTE (via Binance public REST API)
// =============================================================================

/**
 * Get a 24hr ticker quote from the Binance public API.
 * Provides bid, ask, last price, change, volume, and 24hr stats.
 *
 * @param {string} symbol - TradingView symbol (e.g. "BINANCE:BTCUSDT")
 * @returns {Promise<{symbol: string, bid: string, ask: string, last: string, prev_close: string, change: string, change_pct: string, volume: string, high: string, low: string, timestamp: number}>}
 */
export async function getQuote(symbol) {
  const binancePair = tvSymbolToBinance(symbol);

  const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binancePair}`;
  const data = await binanceFetch(url);

  return {
    symbol,
    bid: parseFloat(data.bidPrice).toFixed(2),
    ask: parseFloat(data.askPrice).toFixed(2),
    last: parseFloat(data.lastPrice).toFixed(2),
    prev_close: parseFloat(data.prevClosePrice).toFixed(2),
    change: parseFloat(data.priceChange).toFixed(2),
    change_pct: parseFloat(data.priceChangePercent).toFixed(2) + '%',
    volume: parseFloat(data.volume).toFixed(2),
    high: parseFloat(data.highPrice).toFixed(2),
    low: parseFloat(data.lowPrice).toFixed(2),
    timestamp: Date.now()
  };
}

// =============================================================================
// STUDY / INDICATOR VALUES
// =============================================================================

/**
 * Get study (indicator) values from the TradingView chart widget.
 * Attempts to read via page evaluation first.
 * Falls back to returning basic simulated values when the widget API is
 * inaccessible or no chart is loaded.
 *
 * NOTE: Full study value access requires the TradingView Charting Library widget
 * API (`window.tvWidget.activeChart.getStudyValues()`). This works on
 * tradingview.com chart pages but may not expose all indicator data depending
 * on the page's security context.
 *
 * @param {string} [studyId] - Optional study identifier to filter by
 * @returns {Promise<Array<{name: string, value: number|Array, id?: string}>>}
 */
export async function getStudyValues(studyId) {
  // Try real widget API first
  try {
    const expression = studyId
      ? `(function() {
          try {
            if (window.tvWidget && window.tvWidget.activeChart) {
              var studies = window.tvWidget.activeChart.getAllStudies();
              for (var i = 0; i < studies.length; i++) {
                if (studies[i].id === '${studyId.replace(/'/g, "\\'")}') {
                  var vals = window.tvWidget.activeChart.getStudyValues(studies[i].id);
                  return [{ name: studies[i].name, id: studies[i].id, values: vals || [] }];
                }
              }
            }
            return null;
          } catch(e) { return null; }
        })()`
      : `(function() {
          try {
            if (window.tvWidget && window.tvWidget.activeChart) {
              var studies = window.tvWidget.activeChart.getAllStudies();
              var results = [];
              for (var i = 0; i < studies.length; i++) {
                var vals = window.tvWidget.activeChart.getStudyValues(studies[i].id);
                results.push({ name: studies[i].name, id: studies[i].id, values: vals || [] });
              }
              return results;
            }
            return null;
          } catch(e) { return null; }
        })()`;

    const result = await evaluateOnTV(expression);
    if (result && Array.isArray(result) && result.length > 0) {
      return result;
    }
  } catch {
    // Fall through to simulated data
  }

  // Fallback: return basic simulated indicator values.
  // TODO: Replace with real TradingView widget API calls once
  // the Charting Library widget is confirmed accessible via page eval.
  return [
    { name: 'SMA 20', value: 0 },
    { name: 'SMA 50', value: 0 },
    { name: 'RSI', value: 0 }
  ];
}

// =============================================================================
// DRAWING TOOLS
// =============================================================================

/**
 * Draw a horizontal line on the TradingView chart using the chart widget API.
 * Injects a shape via Runtime.evaluate on the TV page.
 *
 * This requires the TradingView chart widget (`window.tvWidget`) to be loaded.
 * If the widget is not available, returns a descriptive status.
 *
 * @param {number} price - Price level for the horizontal line
 * @param {string} [color='#2962FF'] - Line color (hex)
 * @param {string} [text=''] - Label text for the line
 * @returns {Promise<{id: string, status: string, message?: string}>}
 */
export async function drawHorizontalLine(price, color = '#2962FF', text = '') {
  const safeColor = color.replace(/[^#\w]/g, '');
  const safeText = text.replace(/'/g, "\\'");

  const expression = `
    (function() {
      try {
        if (window.tvWidget && window.tvWidget.activeChart) {
          var chart = window.tvWidget.activeChart;
          var now = Math.floor(Date.now() / 1000);
          var shape = chart.createShape(
            { price: ${Number(price)}, time: now },
            {
              shape: 'horizontal_line',
              text: '${safeText}',
              color: '${safeColor}',
              width: 2,
              style: 0,
              extendToInfinity: true
            }
          );
          if (shape && shape.id) {
            return JSON.stringify({ id: shape.id, status: 'created' });
          }
          return JSON.stringify({ id: 'shape_' + now, status: 'created' });
        }
        return 'null';
      } catch(e) {
        return JSON.stringify({ error: e.message });
      }
    })()
  `;

  const raw = await evaluateOnTV(expression);
  let result;

  try {
    result = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    result = raw;
  }

  if (result && result.error) {
    return {
      id: `shape_${Date.now()}`,
      status: 'error',
      message: `Drawing failed: ${result.error}`
    };
  }

  if (!result || result === null || raw === 'null') {
    return {
      id: `shape_${Date.now()}`,
      status: 'needs_chart_widget',
      message: 'TradingView chart widget not accessible. Navigate to a chart page first (e.g. https://www.tradingview.com/chart/?symbol=BINANCE:BTCUSDT).'
    };
  }

  return result;
}
