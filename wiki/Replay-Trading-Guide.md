# Guía de Replay Trading ⏪

## ¿Qué es?

El modo replay te permite practicar trading en datos históricos.
Avanzas bar por bar (o automáticamente) y tomas decisiones como si fuera tiempo real.

## Comandos

### Iniciar replay
```
"Inicia replay desde marzo 2025"
"Empieza replay en ES1! hace 2 semanas"
```

### Control
```
"Avanza 1 vela"
"Avanza 10 velas"
"Modo automático rápido"
"Para el replay"
```

### Trading
```
"Compra en largo"
"Vende en corto"
"Cierra posición"
```

### Status
```
"¿Cuál es mi posición?"
"¿Cuánto gano/perdí?"
"¿En qué fecha estoy?"
```

## Best practices

1. **Empieza con setups conocidos** — practica en tendencias claras
2. **Análisis pre-trade** — antes de avanzar, mira el contexto
3. **Documenta decisiones** — anota por qué entraste/saliste
4. **Revisa al final** — compara con lo que pasó realmente

## Workflow completo

```
1. setup symbol/timeframe
2. replay_start date
3. add indicators
4. analyze context
5. step through bars
6. identify entry
7. replay_trade buy/sell
8. manage position
9. replay_trade close
10. replay_status for P&L
11. replay_stop
12. review session
```

## Consejos

- Usa 5-10 velas para escanear, luego baja a 1 para timing
- Dibuja tus niveles antes de empezar
- No improvises — sigue tu plan