# Troubleshooting — TradingView OpenCode Agent

## Error: "TradingView not found"

### Síntomas
```
Error: Cannot connect to TradingView. Is it running?
```

### Solución
1. Verificar que TradingView Desktop esté instalado
2. Usar el launcher del repositorio para iniciar con debug port:

**Windows:**
```powershell
.\scripts\launch_tv.ps1
```

**Linux/Mac:**
```bash
./scripts/launch_tv.sh
```

3. Si no tienes el launcher, descargar desde [tradingview.com/download](https://www.tradingview.com/download/)

## Error: "CDP connection failed"

### Síntomas
```
Error: connect ECONNREFUSED 127.0.0.1:9222
```

### Verificar debug port

```bash
curl http://localhost:9222/json/version
```

Si retorna JSON → TradingView está escuchando.

Si no responde:
1. Cerrar TradingView completamente
2. Ejecutar launcher nuevamente
3. Esperar 3-5 segundos antes de conectar

## Error: "Permission denied" (Linux/Mac)

### Síntomas
```
Error: EACCES: permission denied
```

### Solución
```bash
chmod +x scripts/launch_tv.sh
```

## Error: "Module not found"

### Síntomas
```
Error: Cannot find module './src/index.js'
```

### Solución
1. Verificar que estás en el directorio raíz del proyecto
2. Ejecutar `npm install` para instalar dependencias
3. Verificar que `src/index.js` existe

## Error: "SyntaxError: Unexpected token"

### Síntomas
```
SyntaxError: Unexpected token ...
```

### Solución
- Verificar Node.js versión: `node --version` (requiere 18+)
- Actualizar Node.js si es necesario

## Verificación de salud

Para debugging, verificar manualmente:

1. **¿TradingView abierto?** → Ventana visible
2. **¿Debug port listening?** → `curl http://localhost:9222/json/version`
3. **¿MCP configurado?** → Revisar archivo de config
4. **¿Sin errores en server?** → `node src/index.js` (debería correr sin errors)

## Logs

Para mayor debug, correr el servidor manualmente:

```bash
node src/index.js
```

Esto muestra logs detallados de conexión.

## Getting Help

Si los errores persisten:
1. Revisar issues del repositorio
2. Verificar docs en `opencode-skills/docs/`
3. Ejecutar `npm run test` para diagnosis automática