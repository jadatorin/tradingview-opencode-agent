# Configuración MCP — opencode.ai

## Agregar el servidor

### Option 1: opencode.json (global)

Editar `~/.opencode/mcp.json` (o el archivo de configuración de MCP de tu setup):

```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": [
        "C:/Users/Proyects/tradingview-opencode-agent/src/index.js"
      ]
    }
  }
}
```

### Option 2: Workspace config

En `.opencode/mcp.json` dentro del proyecto:

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

## Rutas absolutas vs relativas

| Tipo | Ejemplo | Cuándo usar |
|------|---------|--------------|
| Absoluta | `C:/Users/Proyects/...` | Config global |
| Relativa | `./src/index.js` | Workspace |

## Verificar conexión

Una vez configurado, reiniciar opencode y verificar con:

```
tv_health_check
```

Debería retornar algo como:
```json
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3",
  "User-Agent": "Mozilla/5.0..."
}
```

## Herramientas Disponibles

Una vez conectado, disponibles:

- **Chart**: `chart_set_symbol`, `chart_set_timeframe`, `chart_get_state`
- **Data**: `quote_get`, `data_get_ohlcv`, `data_get_indicator`
- **Indicators**: `chart_manage_indicator`, `indicator_set_inputs`
- **Drawings**: `draw_shape`, `draw_clear`
- **Screenshots**: `capture_screenshot`
- **Pine Script**: `pine_set_source`, `pine_smart_compile`, `pine_get_errors`
- **Replay**: `replay_start`, `replay_step`, `replay_trade`
- **Watchlist**: `watchlist_get`, `watchlist_add`

## Notas

- El servidor corre localmente — no hay conexión externa
- Requiere TradingView Desktop abierto con debug port
- Path del ejecutable debe ser válido (verificar con `node ./src/index.js --version`)