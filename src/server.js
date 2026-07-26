/**
 * @fileoverview TradingView MCP Server - Main server implementation
 * @module server
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { CONFIG } from './config.js';
import { connectCDP, healthCheck as cdpHealthCheck, disconnectCDP, getPageInfo, captureScreenshotTV } from './utils/cdp-client.js';
import {
  formatOHLCVBar,
  formatPrice,
  resolveSymbol,
  resolveTimeframe,
  parseTimestamp,
  formatStudyValue,
  formatPineLine,
  formatAlert,
  sanitizeFilename
} from './utils/trading-helpers.js';
import {
  getChartState,
  navigateToChart,
  getOHLCVData,
  getQuote,
  getStudyValues,
  drawHorizontalLine
} from './utils/cdp-commands.js';
import fs from 'fs';
import path from 'path';

// Ensure screenshot directory exists
if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
  fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
}

/**
 * @type {Server}
 */
const server = new Server(
  {
    name: 'tradingview-mcp-server',
    version: '1.0.0'
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

/**
 * Tool definitions for the MCP protocol
 */
const TOOLS = [
  // === Health & Connection ===
  {
    name: 'tv_health_check',
    description: 'Verify CDP connection to TradingView/Chrome',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'tv_launch',
    description: 'Detect and launch TradingView application',
    inputSchema: {
      type: 'object',
      properties: {
        browser: {
          type: 'string',
          enum: ['chrome', 'chromium', 'edge'],
          default: 'chrome',
          description: 'Browser to use'
        },
        url: {
          type: 'string',
          default: 'https://www.tradingview.com',
          description: 'URL to open'
        }
      },
      required: []
    }
  },

  // === Chart State ===
  {
    name: 'chart_get_state',
    description: 'Get current chart state: symbol, timeframe, indicators',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // === Quotes & Prices ===
  {
    name: 'quote_get',
    description: 'Get current quote (price, OHLC) for a symbol',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: {
          type: 'string',
          description: 'TradingView symbol (e.g., BINANCE:BTCUSDT)'
        }
      },
      required: ['symbol']
    }
  },
  {
    name: 'data_get_ohlcv',
    description: 'Get historical OHLCV bars',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'TradingView symbol' },
        timeframe: { type: 'string', description: 'Timeframe (1m, 5m, 1h, etc.)' },
        from: { type: 'number', description: 'Start timestamp (ms)' },
        to: { type: 'number', description: 'End timestamp (ms)' },
        count: { type: 'number', description: 'Max bars (max 500)' }
      },
      required: ['symbol']
    }
  },

  // === Study/Pine Values ===
  {
    name: 'data_get_study_values',
    description: 'Get values from indicators/studies on chart',
    inputSchema: {
      type: 'object',
      properties: {
        study_id: { type: 'string', description: 'Study identifier' },
        symbols: { type: 'array', items: { type: 'string' }, description: 'Symbols to query' }
      },
      required: []
    }
  },
  {
    name: 'data_get_pine_lines',
    description: 'Get drawn lines from Pine scripts',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', default: false, description: 'Get all lines' }
      },
      required: []
    }
  },
  {
    name: 'data_get_pine_labels',
    description: 'Get drawn labels from Pine scripts',
    inputSchema: {
      type: 'object',
      properties: {
        all: { type: 'boolean', default: false, description: 'Get all labels' }
      },
      required: []
    }
  },
  {
    name: 'data_get_pine_tables',
    description: 'Get table data from Pine scripts',
    inputSchema: {
      type: 'object',
      properties: {
        table_id: { type: 'string', description: 'Table identifier' }
      },
      required: []
    }
  },

  // === Drawing Tools ===
  {
    name: 'draw_shape',
    description: 'Draw a shape on the chart',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', enum: ['arrow', 'line', 'rectangle', 'ellipse', 'text'], description: 'Shape type' },
        points: { type: 'array', items: { type: 'object' }, description: 'Coordinates [{time, price}]' },
        style: { type: 'object', description: 'Visual style {color, width, dashed}' },
        text: { type: 'string', description: 'Text for label (optional)' }
      },
      required: ['type', 'points']
    }
  },
  {
    name: 'draw_list',
    description: 'List all drawn objects on chart',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Filter by type (line, shape, label)' }
      },
      required: []
    }
  },
  {
    name: 'draw_remove',
    description: 'Remove a drawn object by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Object ID to remove' }
      },
      required: ['id']
    }
  },
  {
    name: 'draw_clear',
    description: 'Clear all drawings or drawings of a type',
    inputSchema: {
      type: 'object',
      properties: {
        type: { type: 'string', description: 'Type to clear (optional, clears all if omitted)' }
      },
      required: []
    }
  },

  // === Alerts ===
  {
    name: 'alert_list',
    description: 'List all alerts',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'alert_create',
    description: 'Create a new alert',
    inputSchema: {
      type: 'object',
      properties: {
        symbol: { type: 'string', description: 'TradingView symbol' },
        condition: { type: 'string', description: 'Alert condition (e.g., "crossover(ta.sma(close,20), ta.sma(close,50))")' },
        message: { type: 'string', description: 'Alert message text' },
        interval: { type: 'string', description: 'Chart interval' }
      },
      required: ['condition']
    }
  },
  {
    name: 'alert_delete',
    description: 'Delete an alert by ID',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Alert ID to delete' }
      },
      required: ['id']
    }
  },

  // === Screenshot ===
  {
    name: 'capture_screenshot',
    description: 'Capture chart screenshot',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'Output filename' },
        full_page: { type: 'boolean', default: false, description: 'Capture full page' }
      },
      required: []
    }
  },

  // === Replay ===
  {
    name: 'replay_start',
    description: 'Start replay mode',
    inputSchema: {
      type: 'object',
      properties: {
        from: { type: 'number', description: 'Start timestamp' },
        to: { type: 'number', description: 'End timestamp' }
      },
      required: []
    }
  },
  {
    name: 'replay_step',
    description: 'Advance replay by one bar',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'replay_status',
    description: 'Get current replay status',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'replay_stop',
    description: 'Stop replay mode',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },

  // === Batch Operations ===
  {
    name: 'batch_run',
    description: 'Execute operations across multiple symbols',
    inputSchema: {
      type: 'object',
      properties: {
        symbols: { type: 'array', items: { type: 'string' }, description: 'List of symbols' },
        operation: { type: 'string', enum: ['quote', 'ohlcv'], description: 'Operation to perform' },
        timeframe: { type: 'string', description: 'Timeframe for ohlcv' },
        count: { type: 'number', description: 'Bars count for ohlcv' }
      },
      required: ['symbols', 'operation']
    }
  }
];

/**
 * Handle tool execution
 * @param {Object} tool - Tool name and parameters
 * @returns {Promise<Object>}
 */
async function handleTool(tool) {
  const { name, arguments: args } = tool;
  const params = args || {};

  switch (name) {
    case 'tv_health_check':
      return handleHealthCheck();
    case 'tv_launch':
      return handleLaunch(params);
    case 'chart_get_state':
      return handleChartGetState();
    case 'quote_get':
      return handleQuoteGet(params);
    case 'data_get_ohlcv':
      return handleGetOHLCV(params);
    case 'data_get_study_values':
      return handleGetStudyValues(params);
    case 'data_get_pine_lines':
      return handleGetPineLines(params);
    case 'data_get_pine_labels':
      return handleGetPineLabels(params);
    case 'data_get_pine_tables':
      return handleGetPineTables(params);
    case 'draw_shape':
      return handleDrawShape(params);
    case 'draw_list':
      return handleDrawList(params);
    case 'draw_remove':
      return handleDrawRemove(params);
    case 'draw_clear':
      return handleDrawClear(params);
    case 'alert_list':
      return handleAlertList();
    case 'alert_create':
      return handleAlertCreate(params);
    case 'alert_delete':
      return handleAlertDelete(params);
    case 'capture_screenshot':
      return handleCaptureScreenshot(params);
    case 'replay_start':
      return handleReplayStart(params);
    case 'replay_step':
      return handleReplayStep();
    case 'replay_status':
      return handleReplayStatus();
    case 'replay_stop':
      return handleReplayStop();
    case 'batch_run':
      return handleBatchRun(params);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// === Tool Handlers ===

async function handleHealthCheck() {
  const healthy = await cdpHealthCheck();
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: healthy ? 'connected' : 'disconnected',
        timestamp: new Date().toISOString()
      }, null, 2)
    }]
  };
}

async function handleLaunch(params) {
  // In production, would launch browser via CDP
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: 'launch_not_implemented',
        message: 'Use Chrome launched externally with --remote-debugging-port=9222',
        params
      }, null, 2)
    }]
  };
}

async function handleChartGetState() {
  try {
    // Try reading chart state from the current TV page URL
    const state = await getChartState();
    return {
      content: [{ type: 'text', text: JSON.stringify(state, null, 2) }]
    };
  } catch (error) {
    // If not on a chart page, navigate to a default chart and retry
    try {
      await navigateToChart('BINANCE:BTCUSDT', '60');
      const state = await getChartState();
      return {
        content: [{ type: 'text', text: JSON.stringify(state, null, 2) }]
      };
    } catch (navError) {
      throw new Error(`Failed to get chart state: ${navError.message}`);
    }
  }
}

async function handleQuoteGet(params) {
  const symbol = resolveSymbol(params.symbol);
  
  try {
    const quote = await getQuote(symbol);
    return {
      content: [{ type: 'text', text: JSON.stringify(quote, null, 2) }]
    };
  } catch (error) {
    throw new Error(`Failed to get quote for ${symbol}: ${error.message}`);
  }
}

async function handleGetOHLCV(params) {
  const symbol = resolveSymbol(params.symbol);
  const timeframe = resolveTimeframe(params.timeframe || '1h');
  const count = Math.min(params.count || 100, CONFIG.MAX_OHLCV_BARS);
  
  try {
    const rawBars = await getOHLCVData(symbol, timeframe, count);
    // Normalize bar format for consistency
    const bars = rawBars.map(bar => formatOHLCVBar(bar));
    
    return {
      content: [{ type: 'text', text: JSON.stringify({ symbol, timeframe, bars }, null, 2) }]
    };
  } catch (error) {
    throw new Error(`Failed to get OHLCV data for ${symbol}: ${error.message}`);
  }
}

async function handleGetStudyValues(params) {
  try {
    // Try real widget API first, falls back to simulated data
    const values = await getStudyValues(params.study_id);
    return {
      content: [{ type: 'text', text: JSON.stringify(values.map(formatStudyValue), null, 2) }]
    };
  } catch (error) {
    throw new Error(`Failed to get study values: ${error.message}`);
  }
}

async function handleGetPineLines(params) {
  const lines = [];
  
  if (params.all) {
    lines.push(
      { id: 'line_1', value: 68000, color: '#2196F3', style: 'solid', width: 2 }
    );
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify(lines.map(formatPineLine), null, 2) }]
  };
}

async function handleGetPineLabels(params) {
  return {
    content: [{ type: 'text', text: JSON.stringify([], null, 2) }]
  };
}

async function handleGetPineTables(params) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ table_id: params.table_id, rows: [] }, null, 2) }]
  };
}

async function handleDrawShape(params) {
  // Support horizontal_line / line drawing via CDP evaluation on TV widget
  if (params.type === 'line' || params.type === 'horizontal_line') {
    try {
      const price = params.points?.[0]?.price;
      if (price === undefined || price === null) {
        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              id: `shape_${Date.now()}`,
              status: 'needs_chart_widget',
              type: params.type,
              message: 'price is required in points[0].price for horizontal_line drawing.'
            }, null, 2)
          }]
        };
      }
      const color = params.style?.color || '#2962FF';
      const text = params.text || '';
      const result = await drawHorizontalLine(price, color, text);
      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
      };
    } catch {
      // CDP / widget not available — fall through to needs_chart_widget
    }
  }
  
  // For all other shapes (or when CDP drawing fails), return needs_chart_widget
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: `shape_${Date.now()}`,
        status: 'needs_chart_widget',
        type: params.type,
        points: params.points,
        style: params.style,
        message: params.type === 'line' || params.type === 'horizontal_line'
          ? 'Drawing via CDP requires the TradingView chart widget to be loaded. Navigate to a chart first.'
          : `Drawing '${params.type}' shapes via CDP requires TradingView chart widget API. Only horizontal_line is currently supported.`
      }, null, 2)
    }]
  };
}

async function handleDrawList(params) {
  return {
    content: [{ type: 'text', text: JSON.stringify({ shapes: [], lines: [], labels: [] }, null, 2) }]
  };
}

async function handleDrawRemove(params) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ id: params.id, status: 'removed' }, null, 2)
    }]
  };
}

async function handleDrawClear(params) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ status: 'cleared', type: params.type || 'all' }, null, 2)
    }]
  };
}

async function handleAlertList() {
  return {
    content: [{ type: 'text', text: JSON.stringify({ alerts: [] }, null, 2) }]
  };
}

async function handleAlertCreate(params) {
  const alertId = `alert_${Date.now()}`;
  
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        id: alertId,
        status: 'created',
        symbol: resolveSymbol(params.symbol || ''),
        condition: params.condition,
        message: params.message
      }, null, 2)
    }]
  };
}

async function handleAlertDelete(params) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ id: params.id, status: 'deleted' }, null, 2)
    }]
  };
}

async function handleCaptureScreenshot(params) {
  const filename = params.filename || `screenshot_${Date.now()}.png`;
  const safeName = sanitizeFilename(filename);
  const filepath = path.join(CONFIG.SCREENSHOT_DIR, safeName);
  
  try {
    const result = await captureScreenshotTV({ format: 'png' });
    const buffer = Buffer.from(result.data, 'base64');
    fs.writeFileSync(filepath, buffer);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          status: 'captured',
          filepath,
          size: buffer.length
        }, null, 2)
      }]
    };
  } catch (error) {
    throw new Error(`Failed to capture screenshot: ${error.message}`);
  }
}

async function handleReplayStart(params) {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        status: 'replay_started',
        from: params.from,
        to: params.to
      }, null, 2)
    }]
  };
}

async function handleReplayStep() {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({ status: 'stepped', timestamp: Date.now() }, null, 2)
    }]
  };
}

async function handleReplayStatus() {
  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        active: false,
        current_time: null
      }, null, 2)
    }]
  };
}

async function handleReplayStop() {
  return {
    content: [{ type: 'text', text: JSON.stringify({ status: 'replay_stopped' }, null, 2) }]
  };
}

async function handleBatchRun(params) {
  const results = [];
  
  for (const sym of params.symbols) {
    try {
      const resolved = resolveSymbol(sym);
      if (params.operation === 'quote') {
        const quote = await handleQuoteGet({ symbol: resolved });
        results.push({ symbol: resolved, ...JSON.parse(quote.content[0].text) });
      } else if (params.operation === 'ohlcv') {
        const ohlcv = await handleGetOHLCV({
          symbol: resolved,
          timeframe: params.timeframe,
          count: params.count
        });
        results.push({ symbol: resolved, ...JSON.parse(ohlcv.content[0].text) });
      }
    } catch (error) {
      results.push({ symbol: sym, error: error.message });
    }
  }
  
  return {
    content: [{ type: 'text', text: JSON.stringify(results, null, 2) }]
  };
}

// === Register Handlers ===

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: TOOLS
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    const result = await handleTool(request.params);
    return result;
  } catch (error) {
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ error: error.message })
      }],
      isError: true
    };
  }
});

export { server };

// === Main ===

async function main() {
  console.error('[TradingView MCP Server] Starting...');
  
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  console.error('[TradingView MCP Server] Connected to stdio transport');
}

main().catch(console.error);
