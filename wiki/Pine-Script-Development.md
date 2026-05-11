# Desarrollo Pine Script 🎯

## Workflow

```
1. Escribe el código
2. Compila
3. Revisa errores
4. Corrige
5. Repite hasta 0 errores
6. Guarda al chart
```

## Comandos disponibles

### Escribir código
```
"Escribe un indicador de VWAP con bandas de desviación"
"Créame una estrategia de cruces de medias"
```

### Compilar
```
"Compila el script"
"¿Hay errores?"
```

### Errores comunes

| Error | Solución |
|-------|----------|
| "Mismatched input" | Verificar indentación (4 espacios) |
| "Undeclared identifier" | Declarar variable antes de usar |
| "Cannot call with type" | Verificar tipos de parámetros |

## Estructura de un script

```pine
//@version=6
indicator("Mi Indicador", overlay=true)

// Inputs
length = input.int(14, "Longitud")
src = input.source(close, "Fuente")

// Cálculos
ema = ta.ema(src, length)

// Plot
plot(ema, "EMA", color.blue)
```

## Recursos

- [Referencia Pine Script v6](https://www.tradingview.com/pine-script-reference/v6/)
- [Manual de Pine Script](https://www.tradingview.com/pine-script-docs/en/)