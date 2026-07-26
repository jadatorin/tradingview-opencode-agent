<img width="512" height="512" alt="Tradinview-opencode-Agent" src="https://github.com/user-attachments/assets/bdd1bf61-fc0d-4d8f-a9db-bde221877bc3" />

# TradingView OpenCode Agent 🤖

**Conecta tu TradingView Desktop con opencode.ai para análisis de charts con IA.**

> Este proyecto está **INSPIRADO** en [tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp) de tradesdontlie. No es un fork directo — es una **reimplementación** con código 100% original y documentación en español/inglés.

## ✨ Características

| Característica | Descripción |
|----------------|-------------|
| 📊 **Análisis de Chart** | Lee indicadores, niveles, tablas de Pine, y estado del gráfico |
| 📈 **Indicadores** | SMC, ICT, RSI, MACD, Bollinger Bands, VWAP, EMA, SMA, Stochastic, y más... |
| 🎯 **Niveles SMC** | Detecta CHoCH, BOS, SFP, Fair Price Zones, zonas de liquidez |
| ⏪ **Replay Mode** | Practica trading en datos históricos con control de barras |
| 📋 **Reports** | Genera reportes de estrategia con métricas de rendimiento |
| 🔍 **Multi-Symbol** | Escanea múltiples instrumentos en batch |
| 📸 **Screenshots** | Captura charts automáticamente para análisis |
| 🔔 **Alertas** | Crea y gestiona alertas de precio |

## 🚀 Instalación Rápida

```powershell
# 1. Clonar el repo
git clone https://github.com/jadatorin/tradingview-opencode-agent.git
cd tradingview-opencode-agent

# 2. Instalar dependencias
npm install

# 3. Configurar opencode.ai
# Agregar a tu ~/.config/opencode/mcp.json:
{
  "mcp": {
    "tradingview": {
      "command": ["node", "C:/Users/TU_USUARIO/proyects/tradingview-opencode-agent/src/index.js"],
      "type": "local"
    }
  }
}

# 4. Iniciar TradingView con CDP (Chrome + sesión persistente)
.\launchers\launch_tv_cdp.ps1

   # Alternativa: si tenés la versión Desktop (MSIX/Store):
   .\launchers\launch_tv_msix.ps1
   # ⚠️ MSIX no soporta CDP — las tools MCP no conectarán

# 5. Verificar conexión
npm run test
```

## 📋 Requisitos

| Requisito | Versión Mínima |
|-----------|---------------|
| **Node.js** | 18+ |
| **TradingView Desktop** | Windows/Mac/Linux (cualquiera) |
| **opencode.ai** | Cliente MCP-compatible |
| **Suscripción TradingView** | Para datos en tiempo real (opcional) |

## 🎯 Uso Rápido

### Análisis de Chart
```
"Analiza mi chart de ES1! en 15 minutos"
"Qué indicadores tengo activos?"
"Cuáles son los niveles de soporte y resistencia?"
"Dame un screenshot del gráfico actual"
```

### Pine Script
```
"Escribe un indicador de VWAP con bandas"
"Compila mi script de estrategia"
"Hay errores de compilación? cuales?"
"Agrega un oscilador estocástico"
```

### Replay Trading
```
"Inicia replay en SPY desde marzo 2025"
"Avanza 5 velas hacia adelante"
"Toma una posición larga en el último swing"
"Cierra la posición y muéstrame el P&L"
```

### Multi-Symbol Scan
```
"Escanea ES, NQ, YM para oportunidades alcistas"
"Compara RSI en BTC, ETH y SOL"
"Múltiples screenshots de mi watchlist"
```

## 📁 Estructura del Proyecto

```
tradingview-opencode-agent/
├── src/                          # Servidor MCP
│   ├── index.js                  # Entry point
│   ├── server.js                 # Implementación del servidor
│   ├── config.js                 # Configuración centralizada
│   └── utils/
│       ├── cdp-client.js         # Cliente Chrome DevTools Protocol
│       └── trading-helpers.js    # Helpers de TradingView
│
├── opencode-skills/              # Skills para opencode.ai
│   ├── SKILL.md                  # Dispatcher principal
│   ├── chart-analysis/           # Análisis técnico
│   ├── pine-develop/             # Desarrollo Pine Script
│   ├── replay-practice/          # Modo replay
│   ├── multi-symbol-scan/        # Escaneo multi-símbolo
│   ├── strategy-report/          # Reportes de estrategia
│   └── docs/                     # Docs de referencia
│
├── launchers/                    # Scripts de lanzamiento
│   ├── launch_tv_cdp.ps1         # [RECOMENDADO] Chrome + CDP + sesión persistente
│   ├── launch_tv.ps1             # Windows universal (detecta cualquier versión)
│   ├── launch_tv.sh              # Linux/macOS
│   ├── launch_tv_desktop.ps1     # Desktop installer
│   ├── launch_tv_msix.ps1        # Microsoft Store (sin CDP)
│   ├── start_all.ps1             # Lanza CDP + MCP server en un solo comando
│   └── start_mcp.ps1             # Solo MCP server (cuando TV ya está abierto)
│
├── docs/                         # Documentación principal
└── package.json                  # Dependencias Node.js
```

## 🔧 Configuración

### Variables de Entorno (opcional)

```bash
# Puerto de debug de Chrome (default: 9222)
CDP_PORT=9222

# Host de Chrome (default: localhost)
CDP_HOST=localhost

# Directorio para screenshots (default: ./screenshots)
SCREENSHOT_DIR=./screenshots

# Timeout de operaciones (default: 30000ms)
TIMEOUT_MS=30000
```

### Configuración de MCP

#### OpenCode (formato correcto)
```json
{
  "mcp": {
    "tradingview": {
      "command": ["node", "C:/Users/TU_USUARIO/proyects/tradingview-opencode-agent/src/index.js"],
      "type": "local"
    }
  }
}
```

#### Claude Desktop / Cursor
```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["C:/Users/TU_USUARIO/proyects/tradingview-opencode-agent/src/index.js"]
    }
  }
}
```

> **Tip:** Para rutas relativas usa `./src/index.js` si el config está en la raíz del proyecto.

## 🛡️ Seguridad

| Aspecto | Estado |
|---------|--------|
| ✅ Código 100% original | Auditado, sin dependencias externas |
| ✅ Sin conexiones a servidores | Todo corre localmente |
| ✅ Sin recopilación de datos | No hay telemetry ni tracking |
| ✅ Chrome DevTools Protocol | Conexión local a tu app |

## 📚 Documentación Detallada

| Documento | Descripción |
|-----------|-------------|
| [INSTALL](./INSTALL.md) | Guía paso a paso de instalación |
| [MCP](./MCP.md) | Configuración detallada de MCP |
| [ARCHITECTURE](./ARCHITECTURE.md) | Arquitectura técnica del proyecto |
| [TROUBLESHOOTING](./TROUBLESHOOTING.md) | Problemas comunes y soluciones |
| [../launchers/README.md](../launchers/README.md) | Scripts de lanzamiento |
| [../opencode-skills/SKILL.md](../opencode-skills/SKILL.md) | Skills de opencode.ai |

## 🤝 Contribuir

```bash
# 1. Fork el repo
# 2. Crea una rama
git checkout -b feature/nueva-feature

# 3. Commit con convencionales
git commit -m 'feat: nueva feature awesome'

# 4. Push
git push origin feature/nueva-feature

# 5. Abre un Pull Request
```

## 📜 Licencia

MIT License — ver [LICENSE](../LICENSE)

## 👥 Autores

**jadatorin** (aka bitorin)
- GitHub: [@jadatorin](https://github.com/jadatorin)
- TradingView: bitorin

**Inspirado por:** [tradesdontlie/tradingview-mcp](https://github.com/tradesdontlie/tradingview-mcp)

---

⭐ Si te resultó útil, dale una estrella al repo!
