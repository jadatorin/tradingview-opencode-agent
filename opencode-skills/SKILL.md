---
name: tradingview-opencode-agent
description: "TradingView Desktop AI assistant via MCP. Dispatcher a 5 sub-skills especializadas: chart-analysis, pine-develop, replay-practice, multi-symbol-scan, strategy-report."
trigger: tradingview, chart, pine script, replay, backtest, scan, strategy report, analyze chart, write pine, scan symbols
---

# TradingView OpenCode Agent — Dispatcher

Este es el **skill orquestador** que enruta a las sub-skills especializadas de TradingView.

## Sub-Skills Disponibles

| Sub-Skill | Trigger | Descripción |
|-----------|---------|-------------|
| `chart-analysis` | "analyze chart", "technical analysis", "review my chart" | Análisis técnico completo: setup de gráfico, indicadores, navegación, anotaciones, screenshot |
| `pine-develop` | "write Pine Script", "develop indicator", "create strategy" | Desarrollo Pine Script: write → compile → fix errors → iterate |
| `replay-practice` | "replay", "practice trading", "backtest manually" | Modo replay: step bars, tomar trades, trackear P&L |
| `multi-symbol-scan` | "scan symbols", "compare instruments", "multi-symbol", "screen" | Análisis multi-símbolo: batch screenshots, indicadores, watchlist |
| `strategy-report` | "strategy report", "backtest results", "performance report" | Métricas de estrategia: trades, equity, win rate, recomendaciones |

## Cómo Usar

Cuando el usuario pide algo relacionado con TradingView:

1. **Identifica la sub-skill correcta** según los triggers de arriba
2. **Carga la sub-skill** desde el directorio de skills
3. **Sigue el workflow de la sub-skill** precisamente
4. **Reporta los resultados** al usuario

## Quick Decision Tree

| El usuario dice... | Sub-Skill |
|--------------------|-----------|
| "¿Qué hay en mi gráfico?" / "Analiza ES1!" | `chart-analysis` |
| "Escribe un indicador para..." | `pine-develop` |
| "Practicar trading del 1 de marzo" | `replay-practice` |
| "Escanea ES, NQ, YM para setups" | `multi-symbol-scan` |
| "Muéstrame el rendimiento de la estrategia" | `strategy-report` |

## Conexión MCP

Path: `./src/server.js`

Antes de cualquier sub-skill, verificar que TradingView esté conectado:
```
tv_health_check
```
Si falla, usar `tv_launch` para iniciar TradingView con debug port.

## Estructura del Repositorio

```
opencode-skills/
├── SKILL.md                    # Este archivo (dispatcher)
├── chart-analysis/
│   └── SKILL.md
├── pine-develop/
│   └── SKILL.md
├── replay-practice/
│   └── SKILL.md
├── multi-symbol-scan/
│   └── SKILL.md
├── strategy-report/
│   └── SKILL.md
└── docs/
    ├── INSTALL.md
    ├── MCP.md
    └── TROUBLESHOOTING.md
```

---

## Arquitectura

```
User request
      │
      ▼
┌─────────────────────┐
│ tradingview-agent  │ ← dispatcher (este skill)
│     (umbrella)      │
└──────────┬──────────┘
           │
           ├── "analyze chart"     → chart-analysis/
           ├── "write Pine Script" → pine-develop/
           ├── "replay"            → replay-practice/
           ├── "scan symbols"      → multi-symbol-scan/
           └── "strategy report"   → strategy-report/
                    │
                    ▼
             ┌─────────────┐
             │ Sub-skill   │ ← cada una tiene workflow completo
             │ SKILL.md    │
             └─────────────┘
```

## Disclaimer

Todos los tools de TradingView acceden a tu app de Desktop local via Chrome DevTools Protocol. Sin conexión a servidor. Sos responsable del cumplimiento con los Términos de Uso de TradingView.