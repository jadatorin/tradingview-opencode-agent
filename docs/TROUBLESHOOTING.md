# Troubleshooting — TradingView OpenCode Agent

## Índice de Problemas

1. [Errores de Conexión](#errores-de-conexión)
2. [Errores de MCP](#errores-de-mcp)
3. [Errores de TradingView](#errores-de-tradingview)
4. [Errores de Rendimiento](#errores-de-rendimiento)
5. [Problemas de Configuración](#problemas-de-configuración)

---

## Errores de Conexión

### 1. "TradingView not found"

**Síntomas:**
```
Error: Cannot connect to TradingView. Is it running?
```

**Causas:**
- TradingView Desktop no está instalado
- TradingView no está ejecutándose

**Solución:**
```powershell
# Windows: Usar el launcher del repositorio
.\launchers\launch_tv.ps1

# Linux/Mac: Usar el launcher bash
./launchers/launch_tv.sh
```

**Verificación manual:**
```powershell
# Ver si hay algo escuchando en el puerto
curl http://localhost:9222/json/version
```

---

### 2. "CDP connection failed" — ECONNREFUSED

**Síntomas:**
```
Error: connect ECONNREFUSED 127.0.0.1:9222
Error: connect ECONNREFUSED ::1:9222
```

**Causas:**
- TradingView no se inició con `--remote-debugging-port=9222`
- El puerto está siendo usado por otra aplicación
- Firewall bloqueando la conexión

**Solución:**
```powershell
# 1. Cerrar TradingView completamente
# 2. Verificar que el puerto esté libre
netstat -ano | findstr :9222

# 3. Usar un puerto diferente si hay conflicto
.\launchers\launch_tv.ps1 -Port 9223
```

**Verificar debug port:**
```bash
curl http://localhost:9222/json/version
# Debería retornar algo como:
# {"Browser":"Chrome/120.0.0.0","Protocol-Version":"1.3",...}
```

---

### 3. "WebSocket connection failed"

**Síntomas:**
```
Error: WebSocket connection to ws://localhost:9222/... failed
```

**Causas:**
- TradingView se abrió pero el WebSocket no se estableció a tiempo
- Versión incompatible de Chrome DevTools

**Solución:**
```powershell
# 1. Cerrar y reopen TradingView con el launcher
.\launchers\launch_tv.ps1

# 2. Esperar 3-5 segundos antes de conectar
# 3. Verificar endpoints disponibles
curl http://localhost:9222/json
```

---

### 4. "Timeout waiting for target"

**Síntomas:**
```
Error: Timeout waiting for TradingView target
```

**Causas:**
- TradingView tardó en iniciar
- Debug port no está respondiendo

**Solución:**
```powershell
# Aumentar el timeout en config.js o esperar más tiempo
# Verificar que TradingView esté completamente cargado
Start-Sleep -Seconds 5
curl http://localhost:9222/json
```

---

## Errores de MCP

### 5. "Cannot find module '@modelcontextprotocol/sdk'"

**Síntomas:**
```
Error: Cannot find module '@modelcontextprotocol/sdk'
```

**Causas:**
- Dependencies no instaladas
- NPM install no corrió correctamente

**Solución:**
```bash
# Reinstalar dependencies
rm -rf node_modules package-lock.json
npm install
```

---

### 6. "MCP server not responding"

**Síntomas:**
```
Error: MCP server timeout or no response
```

**Causas:**
- Server colgado
- Error no manejado en el servidor

**Solución:**
```bash
# Reiniciar el servidor
node src/index.js

# Ver logs de error
node src/index.js 2>&1 | tee server.log
```

---

### 7. "Invalid tool parameters"

**Síntomas:**
```
Error: Invalid parameters for tool X
```

**Causas:**
- Parámetros mal formateados
- Tipos de datos incorrectos

**Solución:**
- Verificar documentación de la tool específica
- Revisar formato de parámetros en server.js

---

### 8. "JSON parse error"

**Síntomas:**
```
SyntaxError: Unexpected token ...
```

**Causas:**
- Respuesta malformada de TradingView
- Encoding incorrecto

**Solución:**
```bash
# Verificar que el servidor corre bien
node --check src/server.js

# Usar versión de Node.js 18+
node --version
```

---

## Errores de TradingView

### 9. "TradingView chart not loaded"

**Síntomas:**
```
Error: No chart available
Error: Chart state is empty
```

**Causas:**
- No hay ningún chart abierto
- TradingView está en pantalla diferente

**Solución:**
1. Abrir un chart en TradingView Desktop
2. Asegurar que el chart tiene datos cargados
3. Seleccionar el chart activo

---

### 10. "Symbol not found"

**Síntomas:**
```
Error: Symbol XYZ not found
```

**Causas:**
- Símbolo mal escrito
- Símbolo no disponible en tu región

**Solución:**
```javascript
// Usar symbol mappings de config.js
// BTCUSD -> BINANCE:BTCUSD
// AAPL -> NASDAQ:AAPL
```

---

### 11. "Pine Script compilation failed"

**Síntomas:**
```
Error: Pine compilation error
```

**Causas:**
- Syntax error en el código Pine
- Funciones no disponibles en el contexto

**Solución:**
```bash
# Obtener errores específicos
pine_get_errors

# Revisar la línea específica
// Ejemplo: plot() no disponible en estrategia
```

---

### 12. "Replay mode not available"

**Síntomas:**
```
Error: Cannot start replay
Error: Replay requires pro subscription
```

**Causas:**
- No tienes suscripción Pro
- TradingView no está en modo chart

**Solución:**
- Verificar suscripción en TradingView
- Asegurar tener un chart abierto

---

### 13. "Indicators not found"

**Síntomas:**
```
Error: Indicator X not found on chart
```

**Causas:**
- Indicador no agregado al chart
- Nombre incorrecto del indicador

**Solución:**
```bash
# Listar indicadores activos
data_get_indicator

# Agregar indicador si falta
indicator_add name="RSI"
```

---

### 14. "Screenshot failed"

**Síntomas:**
```
Error: Cannot capture screenshot
Error: Chart is not visible
```

**Causas:**
- Chart no visible en pantalla
- Directorio de destino no existe

**Solución:**
```powershell
# Crear directorio de screenshots
New-Item -ItemType Directory -Force -Path ./screenshots

# Asegurar chart visible
# (Tener TradingView en ventana visible)
```

---

### 15. "Watchlist unavailable"

**Síntomas:**
```
Error: Cannot access watchlist
```

**Causas:**
- No hay watchlist creada
- Watchlist vacía

**Solución:**
1. Crear una watchlist en TradingView
2. Agregar símbolos a la watchlist

---

### 16. "Alerts not working"

**Síntomas:**
```
Error: Cannot create alert
Error: Alert quota exceeded
```

**Causas:**
- Límite de alertas alcanzado
- Suscripción requerida para alertas

**Solución:**
- Verificar límites de alertas en TradingView
- Considerar suscripción si es necesario

---

## Errores de Rendimiento

### 17. "Slow response time"

**Síntomas:**
- Las queries tardan más de 5 segundos
- Timeout frecuentemente

**Causas:**
- Mucho tráfico en TradingView
-_many indicators en el chart

**Solución:**
```javascript
// Reducir timeout en config.js
// TIMEOUT_MS: 30000 (aumentar a 60000)

// Remover indicadores no necesarios del chart
```

---

### 18. "Memory leak"

**Síntomas:**
- Uso de memoria creciente
- Server se vuelve lento con el tiempo

**Causas:**
- Muchas conexiones no cerradas
- Screenshots acumulándose

**Solución:**
```powershell
# Limpiar screenshots regularmente
Remove-Item ./screenshots/* -Force

# Reiniciar el servidor periódicamente
```

---

### 19. "Connection drops frequently"

**Síntomas:**
- Desconexiones constantes
- Reconexiones continuas

**Causas:**
- Red inestable
- TradingView muy cargado

**Solución:**
```javascript
// Aumentar retry attempts en config.js
RETRY_ATTEMPTS: 3
RETRY_DELAY_MS: 2000
```

---

## Problemas de Configuración

### 20. "Path not found" en MCP config

**Síntomas:**
```
Error: Cannot find module './src/index.js'
```

**Causas:**
- Ruta relativa incorrecta
- Ejecutando desde directorio errado

**Solución:**
```json
// Usar ruta absoluta en config global
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["C:/Users/TU_USUARIO/proyects/tradingview-opencode-agent/src/index.js"]
    }
  }
}
```

**Verificar path:**
```bash
# Desde la raíz del proyecto
node src/index.js
```

---

### 21. "Node version incompatible"

**Síntomas:**
```
Error: SyntaxError: Unexpected token ...
Error: Cannot use import statement outside a module
```

**Causas:**
- Node.js muy antiguo ( < 18 )
- package.json indica "type": "module" pero Node no soporta ESM

**Solución:**
```bash
# Verificar versión
node --version

# Actualizar Node.js
# Windows: winget install OpenJS.NodeJS.LTS
# macOS: brew install node@18
# Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
```

---

### 22. "Permission denied" (Linux/Mac)

**Síntomas:**
```
Error: EACCES: permission denied
```

**Causas:**
- Script launcher no ejecutable

**Solución:**
```bash
chmod +x launchers/launch_tv.sh

# Si persiste, verificar ownership
ls -la launchers/
```

---

### 23. "Port already in use"

**Síntomas:**
```
Error: listen EADDRINUSE: address already in use :::9222
```

**Causas:**
- Otra instancia de TradingView usando el puerto
- Otra aplicación usando el mismo puerto

**Solución:**
```powershell
# Encontrar el proceso usando el puerto
netstat -ano | findstr :9222

# Matar el proceso o usar otro puerto
.\launchers\launch_tv.ps1 -Port 9223
```

---

## Verificación de Salud

Para diagnóstico completo, ejecutar en orden:

```powershell
# 1. ¿TradingView está abierto?
Get-Process -Name "TradingView*"  # Windows
ps aux | grep -i tradingview       # Linux/Mac

# 2. ¿Debug port escuchando?
curl http://localhost:9222/json/version

# 3. ¿MCP configurado correctamente?
node src/index.js

# 4. ¿Sin errores en opencode?
tv_health_check
```

---

## Getting Help

Si los errores persisten después de seguir esta guía:

1. **Revisar issues** del repositorio: `https://github.com/jadatorin/tradingview-opencode-agent/issues`
2. **Verificar documentación** en `docs/`
3. **Ejecutar test automático**: `npm run test`
4. **Capturar logs detallados**:
   ```bash
   node src/index.js 2>&1 | tee debug.log
   ```

---

## Comandos de Debug Útiles

```powershell
# Ver todos los procesos en puerto 9222
netstat -ano | findstr :9222

# Test de conectividad básica
Test-NetConnection -ComputerName localhost -Port 9222

# Logs del servidor en tiempo real
node src/index.js

# Ver versión de Node.js
node --version

# Ver versión de npm
npm --version

# Instalar dependencias con verbose
npm install --verbose
```