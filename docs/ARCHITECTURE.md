# Arquitectura — TradingView OpenCode Agent

## Visión General

```
┌─────────────────────────────────────────────────────────────────────┐
│                            opencode.ai                               │
│                        (Cliente MCP Client)                         │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ MCP Protocol
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      MCP Server (src/server.js)                     │
│                   • 25+ tools disponibles                           │
│                   • Request/Response handling                       │
│                   • Error handling centralizado                     │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │ Chrome DevTools Protocol
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CDP Client (src/utils/cdp-client.js)               │
│               • Conexión a localhost:9222                           │
│               • Retry logic (3 intentos)                            │
│               • Reconnect automático                                │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     TradingView Desktop App                          │
│                    (Escucha en debug port)                          │
└─────────────────────────────────────────────────────────────────────┘
```

## Flujo de Datos

```
1. User prompt en opencode
         │
         ▼
2. opencode → MCP Server (tool call)
         │
         ▼
3. server.js valida parámetros + Authentication
         │
         ▼
4. cdp-client.js → CDP Protocol → TradingView
         │
         ▼
5. TradingView ejecuta acción → retorna resultado
         │
         ▼
6. server.js formatea respuesta JSON
         │
         ▼
7. opencode muestra resultado al usuario
```

## Componentes del Servidor

### src/index.js
- **Propósito:** Entry point del servidor MCP
- **Responsabilidades:**
  - Carga configuración global
  - Inicializa logging
  - Registra el servidor con el SDK MCP
  - Maneja lifecycle (start/stop)

### src/server.js
- **Propósito:** Implementación principal del servidor
- **Responsabilidades:**
  - Define las 25+ tools disponibles
  - Maneja request/response
  - Valida parámetros de entrada
  - Formatea respuestas
  - Error handling centralizado

### src/config.js
- **Propósito:** Configuración centralizada
- **Constantes:**
  - `CDP_PORT`: Puerto de debug (default: 9222)
  - `CDP_HOST`: Host de Chrome (default: localhost)
  - `SCREENSHOT_DIR`: Directorio para screenshots
  - `MAX_OHLCV_BARS`: Máximo de barras históricas (500)
  - `TIMEOUT_MS`: Timeout de operaciones (30s)
  - `RETRY_ATTEMPTS`: Intentos de reconexión (3)
  - `RETRY_DELAY_MS`: Delay entre reintentos (1s)

### src/utils/cdp-client.js
- **Propósito:** Wrapper para Chrome DevTools Protocol
- **Funcionalidades:**
  - Conexión WebSocket a localhost:9222
  - Retry logic con exponential backoff
  - Reconnect automático en desconexiones
  - Timeout configurables por operación
  - Manejo de errores robusto

### src/utils/trading-helpers.js
- **Propósito:** Utilidades helpers
- **Funcionalidades:**
  - Mapeo de símbolos (BTCUSD → BINANCE:BTCUSD)
  - Conversión de timeframes (15m → 15)
  - Formateo de fechas
  - Utilidades de parsing

## Tools Disponibles

### Chart Control
| Tool | Descripción |
|------|-------------|
| `chart_set_symbol` | Cambia el símbolo activo |
| `chart_set_timeframe` | Cambia el timeframe (1m, 5m, 15m, 1h, 4h, 1D, 1W) |
| `chart_get_state` | Obtiene estado actual del chart |
| `chart_navigate` | Navega a fecha específica |

### Data & Indicators
| Tool | Descripción |
|------|-------------|
| `quote_get` | Obtiene quote actual de un símbolo |
| `data_get_ohlcv` | Obtiene datos OHLCV históricos |
| `data_get_indicator` | Lee valores de indicadores activos |
| `indicator_set_inputs` | Configura parámetros de indicadores |

### Pine Script
| Tool | Descripción |
|------|-------------|
| `pine_set_source` | Establece código Pine fuente |
| `pine_compile` | Compila el script |
| `pine_get_errors` | Obtiene errores de compilación |
| `pine_add_indicator` | Agrega indicador al chart |

### Drawing Tools
| Tool | Descripción |
|------|-------------|
| `draw_line` | Dibuja una línea |
| `draw_shape` | Dibuja una forma (rectángulo, triángulo) |
| `draw_text` | Agrega texto al chart |
| `draw_clear` | Limpia todas las anotaciones |

### Screenshots
| Tool | Descripción |
|------|-------------|
| `capture_screenshot` | Captura screenshot del chart actual |
| `capture_multi_symbol` | Captura múltiples símbolos |

### Replay Mode
| Tool | Descripción |
|------|-------------|
| `replay_start` | Inicia modo replay en fecha específica |
| `replay_step` | Avanza N barras |
| `replay_trade` | Abre/cierra posición |
| `replay_get_state` | Obtiene estado del replay |

### Watchlist & Alerts
| Tool | Descripción |
|------|-------------|
| `watchlist_get` | Obtiene watchlist actual |
| `watchlist_add` | Agrega símbolo a watchlist |
| `alert_create` | Crea una alerta |
| `alert_get` | Lista alertas existentes |

### System
| Tool | Descripción |
|------|-------------|
| `tv_health_check` | Verifica estado de conexión |
| `tv_version` | Obtiene versión de CDP |

## Decisiones de Diseño

| Decisión | Justificación |
|----------|---------------|
| **MCP Server** | Estandar para integración AI - bien documentado, múltiples clientes |
| **CDP directo** | Sin abstracciones adicionales - máximo control y performance |
| **Local only** | Seguridad + privacidad - ningún dato sale de tu máquina |
| **Retry logic** | TradingView a veces cierra conexiones - reconnect automático esencial |
| **Modular tools** | Cada tool es independiente - fácil testing y mantenimiento |

## Diagrama de Secuencia (Ejemplo: get_indicator)

```
┌──────────┐    ┌─────────┐   ┌────────────┐   ┌──────────────┐
│ opencode │───▶│ server  │──▶│ cdp-client │──▶│ TradingView  │
└──────────┘    └─────────┘   └────────────┘   └──────────────┘
                    │               │                  │
                    │ Tool call     │                  │
                    │──────────────▶│                  │
                    │               │ CDP Command      │
                    │               │─────────────────▶│
                    │               │                  │ Execute
                    │               │                  │◀──────────
                    │               │ Response         │
                    │               │◀─────────────────│
                    │ Format JSON   │                  │
                    │◀──────────────│                  │
Result ◀────────────┤               │                  │
```

## Capas de Abstracción

```
┌────────────────────────────────────────────────┐
│           Capa de Presentación                │
│         (opencode-skills/)                    │
│   • Dispatcher principal + sub-skills         │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│              Capa MCP Server                 │
│              (src/server.js)                 │
│   • 25+ tools, validación, formateo           │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│           Capa de Protocolo                 │
│        (src/utils/cdp-client.js)            │
│   • WebSocket, retry, reconnect              │
└──────────────────────┬───────────────────────┘
                       │
┌──────────────────────▼───────────────────────┐
│           Capa de TradingView                │
│          (TradingView Desktop)               │
│   • Chrome DevTools Protocol interface       │
└─────────────────────────────────────────────┘
```

## Errores y Handling

| Error | Causa | Solución |
|-------|-------|----------|
| `ECONNREFUSED` | TradingView no está corriendo con debug port | Usar launcher para iniciar |
| `Timeout` | TradingView tardó en responder | Aumentar TIMEOUT_MS |
| `WebSocket closed` | Conexión perdida | Retry automático del cliente |
| `Invalid params` | Parámetros mal formateados | Validar en server.js antes de llamar CDP |

## Testing

```bash
# Test de conexión
npm run test

# Test manual del servidor
node src/index.js

# Verificar CDP endpoint
curl http://localhost:9222/json/version
```

## Recursos

- [Chrome DevTools Protocol](https://chromedevtools.dev/)
- [@modelcontextprotocol/sdk](https://github.com/modelcontextprotocol/spec)
- [TradingView Charting Library](https://www.tradingview.com/charting-library/)