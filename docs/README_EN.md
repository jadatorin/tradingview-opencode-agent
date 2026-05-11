# TradingView OpenCode Agent 🤖

**Connect your TradingView Desktop with opencode.ai for AI-powered chart analysis.**

> This project is **INSPIRED** by [tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp) from tradesdontlie. Not a direct fork — it's a **reimplementation** with 100% original code and Spanish/English documentation.

## ✨ Features

| Feature | Description |
|---------|-------------|
| 📊 **Chart Analysis** | Reads indicators, levels, Pine tables, chart state |
| 📈 **Indicators** | RSI, MACD, Bollinger Bands, VWAP, EMA, SMA, Stochastic, etc. |
| 🎯 **SMC Levels** | Detects CHoCH, BOS, SFP, Fair Price Zones, liquidity zones |
| ⏪ **Replay Mode** | Practice trading on historical data with bar control |
| 📋 **Reports** | Generate strategy reports with performance metrics |
| 🔍 **Multi-Symbol** | Scan multiple instruments in batch |
| 📸 **Screenshots** | Capture charts automatically for analysis |
| 🔔 **Alerts** | Create and manage price alerts |

## 🚀 Quick Install

```powershell
# 1. Clone the repo
git clone https://github.com/jadatorin/tradingview-opencode-agent.git
cd tradingview-opencode-agent

# 2. Install dependencies
npm install

# 3. Configure opencode.ai
# Add to your ~/.config/opencode/mcp.json:
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["C:/Users/YOUR_USER/path/to/tradingview-opencode-agent/src/index.js"]
    }
  }
}

# 4. Launch TradingView with debug port
.\launchers\launch_tv.ps1

# 5. Verify connection
npm run test
```

## 📋 Requirements

| Requirement | Minimum Version |
|-------------|-----------------|
| **Node.js** | 18+ |
| **TradingView Desktop** | Windows/Mac/Linux (any) |
| **opencode.ai** | MCP-compatible client |
| **TradingView Subscription** | For real-time data (optional) |

## 🎯 Quick Usage

### Chart Analysis
```
"Analyze my ES1! chart on 15 minutes"
"What indicators do I have active?"
"What are the support and resistance levels?"
"Take a screenshot of the current chart"
```

### Pine Script
```
"Write a VWAP indicator with bands"
"Compile my strategy script"
"Any compilation errors? Show me which ones"
"Add a stochastic oscillator"
```

### Replay Trading
```
"Start replay on SPY since March 2025"
"Forward 5 bars"
"Take a long position at the last swing"
"Close the position and show me the P&L"
```

### Multi-Symbol Scan
```
"Scan ES, NQ, YM for bullish opportunities"
"Compare RSI on BTC, ETH, and SOL"
"Multiple screenshots of my watchlist"
```

## 📁 Project Structure

```
tradingview-opencode-agent/
├── src/                          # MCP Server
│   ├── index.js                  # Entry point
│   ├── server.js                 # Server implementation
│   ├── config.js                 # Centralized config
│   └── utils/
│       ├── cdp-client.js         # Chrome DevTools Protocol client
│       └── trading-helpers.js    # TradingView helpers
│
├── opencode-skills/              # Skills for opencode.ai
│   ├── SKILL.md                  # Main dispatcher
│   ├── chart-analysis/           # Technical analysis
│   ├── pine-develop/             # Pine Script development
│   ├── replay-practice/           # Replay mode
│   ├── multi-symbol-scan/        # Multi-symbol scanning
│   ├── strategy-report/          # Strategy reports
│   └── docs/                     # Reference docs
│
├── launchers/                    # Launch scripts
│   ├── launch_tv.ps1             # Windows universal
│   ├── launch_tv.sh             # Linux/macOS
│   ├── launch_tv_desktop.ps1    # Desktop installer
│   └── launch_tv_msix.ps1       # Microsoft Store
│
├── docs/                         # Main documentation
└── package.json                  # Node.js dependencies
```

## 🔧 Configuration

### Environment Variables (optional)

```bash
# Chrome debug port (default: 9222)
CDP_PORT=9222

# Chrome host (default: localhost)
CDP_HOST=localhost

# Screenshot directory (default: ./screenshots)
SCREENSHOT_DIR=./screenshots

# Operation timeout (default: 30000ms)
TIMEOUT_MS=30000
```

### MCP Configuration

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["C:/Users/YOUR_USER/proyects/tradingview-opencode-agent/src/index.js"]
    }
  }
}
```

> **Tip:** Use relative path `./src/index.js` if the config is in the project root.

## 🛡️ Security

| Aspect | Status |
|--------|--------|
| ✅ 100% Original Code | Audited, no external dependencies |
| ✅ No Server Connections | Everything runs locally |
| ✅ No Data Collection | No telemetry or tracking |
| ✅ Chrome DevTools Protocol | Local connection to your app |

## 📚 Detailed Documentation

| Document | Description |
|----------|-------------|
| [INSTALL](./INSTALL.md) | Step-by-step installation guide |
| [MCP](./MCP.md) | Detailed MCP configuration |
| [ARCHITECTURE](./ARCHITECTURE.md) | Technical architecture |
| [TROUBLESHOOTING](./TROUBLESHOOTING.md) | Common issues and solutions |
| [../launchers/README.md](../launchers/README.md) | Launch scripts |
| [../opencode-skills/SKILL.md](../opencode-skills/SKILL.md) | opencode.ai skills |

## 🤝 Contributing

```bash
# 1. Fork the repo
# 2. Create a branch
git checkout -b feature/awesome-feature

# 3. Commit with conventional commits
git commit -m 'feat: awesome new feature'

# 4. Push
git push origin feature/awesome-feature

# 5. Open a Pull Request
```

## 📜 License

MIT License — see [LICENSE](../LICENSE)

## 👥 Authors

**jadatorin** (aka bitorin)
- GitHub: [@jadatorin](https://github.com/jadatorin)
- TradingView: bitorin

**Inspired by:** [tradesdontlie/tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp)

---

⭐ If you found this useful, give the repo a star!