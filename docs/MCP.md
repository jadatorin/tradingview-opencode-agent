# Configuración MCP — TradingView OpenCode Agent

## ¿Qué es MCP?

**MCP (Model Context Protocol)** es un protocolo estándar que permite a clientes AI (como opencode.ai) comunicarse con servidores que ofrecen herramientas especializadas.

En este caso:
- **Cliente MCP:** opencode.ai
- **Servidor MCP:** `src/index.js` (este proyecto)
- **Target:** TradingView Desktop vía Chrome DevTools Protocol

## Agregar el Servidor

### Localización del Archivo de Configuración

| OS | Ubicación |
|----|------------|
| Windows | `C:/Users/TU_USUARIO/.config/opencode/mcp.json` |
| macOS | `~/.config/opencode/mcp.json` |
| Linux | `~/.config/opencode/mcp.json` |

### Configuración con Ruta Absoluta

Para **configuración global** (funciona desde cualquier proyecto):

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": [
        "C:/Users/TU_USUARIO/proyects/tradingview-opencode-agent/src/index.js"
      ]
    }
  }
}
```

### Configuración con Ruta Relativa

Para **configuración por proyecto** (crear `.opencode/mcp.json` en la raíz):

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": [
        "./src/index.js"
      ]
    }
  }
}
```

> **Nota:** La ruta relativa solo funciona si ejecutas opencode desde la raíz del proyecto.

## Después de Configurar

### 1. Reiniciar opencode

Cierra y reopen opencode.ai para que cargue el nuevo servidor MCP.

### 2. Verificar Conexión

Desde opencode, ejecuta:
```
tv_health_check
```

Deberías ver:
```json
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3",
  "User-Agent": "Mozilla/5.0..."
}
```

## Troubleshooting de Configuración

### "Cannot find module"

**Problema:**
```
Error: Cannot find module './src/index.js'
```

**Solución:**
- Verificar que el path sea correcto
- Usar ruta absoluta en lugar de relativa
- Ejecutar `node ./src/index.js` para verificar que el archivo existe

### "Server not responding"

**Problema:**
El servidor no responde a las llamadas

**Solución:**
```bash
# Test directo del servidor
node src/index.js

# Debería mostrar:
# [Index] TradingView MCP Server initializing...
```

### "MCP server not in list"

**Problema:**
El servidor no aparece en la lista de servidores disponibles

**Solución:**
1. Verificar que el JSON es válido (usa un validator online)
2. Asegurarse de que el array "args" contiene strings, no números
3. Reiniciar opencode completamente

## Herramientas Disponibles

Una vez conectado, estas son las tools disponibles:

### Chart
| Tool | Descripción |
|------|-------------|
| `chart_set_symbol` | Cambia el símbolo del chart |
| `chart_set_timeframe` | Cambia el timeframe |
| `chart_get_state` | Obtiene el estado actual |
| `chart_navigate` | Navega a una fecha específica |

### Data
| Tool | Descripción |
|------|-------------|
| `quote_get` | Obtiene el quote actual |
| `data_get_ohlcv` | Obtiene datos históricos OHLCV |
| `data_get_indicator` | Lee valores de indicadores |

### Pine Script
| Tool | Descripción |
|------|-------------|
| `pine_set_source` | Establece código fuente |
| `pine_compile` | Compila el script |
| `pine_get_errors` | Obtiene errores de compilación |

### Screenshots
| Tool | Descripción |
|------|-------------|
| `capture_screenshot` | Captura el chart actual |
| `capture_multi_symbol` | Captura múltiples símbolos |

### Replay
| Tool | Descripción |
|------|-------------|
| `replay_start` | Inicia modo replay |
| `replay_step` | Avanza N barras |
| `replay_trade` | Abre/cierra posición |
| `replay_get_state` | Obtiene estado del replay |

### System
| Tool | Descripción |
|------|-------------|
| `tv_health_check` | Verifica estado de conexión |
| `tv_version` | Obtiene versión de CDP |

## Configuración Avanzada

### Variables de Entorno

Puedes customize el comportamiento usando variables de entorno:

```bash
# Puerto de debug (default: 9222)
export CDP_PORT=9222

# Host de Chrome (default: localhost)
export CDP_HOST=localhost

# Directorio de screenshots (default: ./screenshots)
export SCREENSHOT_DIR=./screenshots

# Timeout (default: 30000ms)
export TIMEOUT_MS=30000
```

### Puerto Alternativo

Si el puerto 9222 está en uso:

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "env": {
        "CDP_PORT": "9223"
      },
      "args": ["C:/Users/.../src/index.js"]
    }
  }
}
```

O inicia TradingView con:
```powershell
.\launchers\launch_tv.ps1 -Port 9223
```

## Verificación

### Test Manual del Servidor

```bash
cd tradingview-opencode-agent
node src/index.js
```

Debería mostrar algo como:
```
[Index] TradingView MCP Server initializing...
[Index] CDP Target: localhost:9222
[Index] Testing CDP connection...
```

### Test del Puerto CDP

```bash
curl http://localhost:9222/json/version
```

Debería返回:
```json
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3"
}
```

### Test desde opencode

```
tv_health_check
```

Debería返回 información de la versión del browser.

## Notas Importantes

1. **El servidor corre localmente** — no hay conexión a servidores externos
2. **TradingView debe estar abierto** con el debug port habilitado
3. **El path del ejecutable debe ser válido** — verificar con `node ./src/index.js`
4. **Si cambias la ubicación del proyecto**, actualiza el path en la configuración MCP