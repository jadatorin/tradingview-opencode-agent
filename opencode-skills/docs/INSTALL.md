# Instalación — TradingView OpenCode Agent

## Requisitos

- Node.js 18+
- TradingView Desktop (Windows/Mac/Linux)
- opencode.ai con MCP configurado

## Pasos

### 1. Clonar el repositorio

```bash
git clone <repo-url>
cd tradingview-opencode-agent
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar MCP en opencode

Agregar al archivo de configuración de MCP:

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["./src/index.js"]
    }
  }
}
```

Ver [MCP.md](./MCP.md) para detalles completos.

### 4. Iniciar TradingView con CDP

Usar el launcher del repositorio:

**Windows (PowerShell):**
```powershell
./scripts/launch_tv.ps1
```

**Linux/Mac (bash):**
```bash
./scripts/launch_tv.sh
```

Esto inicia TradingView con el debug port habilitado (9222 por defecto).

### 5. Verificar conexión

```bash
npm run test
```

O desde opencode:
```
tv_health_check
```

Debería devolver información de la versión de Chrome DevTools Protocol.

## Estructura del Proyecto

```
tradingview-opencode-agent/
├── opencode-skills/          # Skills para opencode
│   ├── SKILL.md              # Dispatcher
│   ├── chart-analysis/
│   ├── pine-develop/
│   ├── replay-practice/
│   ├── multi-symbol-scan/
│   ├── strategy-report/
│   └── docs/
├── src/                      # Servidor MCP
│   ├── index.js              # Entry point
│   ├── server.js             # Servidor principal
│   └── tools/                # Herramientas MCP
├── scripts/                  # Scripts auxiliares
│   ├── launch_tv.ps1         # Launcher Windows
│   └── launch_tv.sh         # Launcher Linux/Mac
└── package.json
```

## Troubleshooting

Si la verificación falla, ver [TROUBLESHOOTING.md](./TROUBLESHOOTING.md).

## Notas

- TradingView Desktop debe estar abierto durante el uso
- El debug port (9222) debe estar habilitado
- No se requiere servidor externo — todo corre local