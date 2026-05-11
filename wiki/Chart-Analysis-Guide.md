# Guía de Análisis de Chart 📊

## ¿Qué puedes hacer?

El agent puede analizar tu chart de TradingView y proporcionar:
- Estado actual (símbolo, timeframe, tipo de chart)
- Indicadores activos y sus valores
- Niveles de soporte y resistencia
- Estructura de mercado (SMC, ICT)
- Price action y momentum

## Comandos principales

### Ver estado del chart
```
"¿Qué hay en mi chart actual?"
"¿Cuál es el símbolo y timeframe?"
```

### Agregar indicadores
```
"Agrega RSI con período 14"
"Agrega VWAP al chart"
```

### Análisis de niveles
```
"¿Cuáles son los niveles clave?"
"Dibuja el soporte en $80,000"
"Marca la resistencia en $81,500"
```

### Screenshot
```
"Toma un screenshot del chart"
"Captura el chart actual"
```

## Niveles Pine Script

Si tienes indicadores personalizados que usan:
- `line.new()` — puedes leer los niveles
- `label.new()` — puedes leer las etiquetas
- `table.new()` — puedes leer las tablas
- `box.new()` — puedes leer las zonas

## Ejemplo práctico

```
Usuario: "Analiza mi chart de ES1!"

Agent responde:
- Symbol: ES1!
- Timeframe: 15 minutos
- Indicadores: RSI(14), MACD(12,26,9), VWAP
- Soporte: 5800, 5780, 5750
- Resistencia: 5850, 5880, 5900
- Bias: Neutral con presión alcista
```

## Tips

1. **Siempre verifica la conexión** antes de analizar
2. **Usa símbolos completos** (ES1! no ES)
3. **Para niveles Pine**, asegúrate que el indicador esté visible