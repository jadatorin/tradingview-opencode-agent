# TradingView Launchers

Scripts de lanzamiento automático para TradingView con soporte CDP (Chrome DevTools Protocol).

## Estructura

```
launchers/
├── launch_tv.ps1           # Auto-detect universal (PowerShell)
├── launch_tv.sh            # Mac/Linux (Bash)
├── launch_tv_msix.ps1      # Windows Store/MSIX
├── launch_tv_desktop.ps1   # Desktop app
└── README.md               # Este archivo
```

## Scripts

### launch_tv.ps1 (Windows - Universal)

Detector universal que busca en múltiples ubicaciones:

1. Windows Registry (`HKCU\Software\TradingView`)
2. `%LOCALAPPDATA%\TradingView`
3. `%PROGRAMFILES%\TradingView`
4. `%PROGRAMFILES(X86)%\TradingView`
5. `WindowsApps\TradingViewInc*`
6. `%LOCALAPPDATA%\Microsoft\WindowsApps`
7. Path MSIX conocido

**Uso:**
```powershell
# Uso básico
.\launch_tv.ps1

# Puerto custom
.\launch_tv.ps1 -Port 9223

# No esperar CDP
.\launch_tv.ps1 -NoWait
```

**Salida JSON:**
```json
{"success":true,"url":"http://localhost:9222/json","port":9222,"path":"C:\\..."}
```

---

### launch_tv.sh (macOS/Linux)

Detector para sistemas Unix.

**Ubicaciones buscadas:**
- macOS: `/Applications/TradingView.app`, `~/Applications/TradingView.app`
- Linux: `~/.local/share/TradingView`, `~/.local/bin/TradingView`, `/opt/TradingView`

**Uso:**
```bash
# Make executable
chmod +x launch_tv.sh

# Uso básico
./launch_tv.sh

# Puerto custom
./launch_tv.sh --port 9223

# No esperar CDP
./launch_tv.sh --no-wait
```

**Requiere:**
- macOS: `open`
- Linux: `xdg-open` (del paquete `xdg-utils`)

---

### launch_tv_msix.ps1 (Windows Store)

Específico para versión de Microsoft Store (MSIX).

**Nota:** Las apps MSIX tienen restricciones de seguridad que pueden impedir pasar argumentos de línea de comandos (`--remote-debugging-port`). El script intentará passing args pero puede fallar silenciosamente.

**Uso:**
```powershell
.\launch_tv_msix.ps1
.\launch_tv_msix.ps1 -Port 9223
```

---

### launch_tv_desktop.ps1 (Desktop Installer)

Para versión descargada directamente desde tradingview.com.

**Ubicaciones:**
- `%LOCALAPPDATA%\Programs\TradingView`
- `%LOCALAPPDATA%\TradingView`
- `%PROGRAMFILES%\TradingView`
- `%PROGRAMFILES%\TradingView Desktop`

**Uso:**
```powershell
.\launch_tv_desktop.ps1
.\launch_tv_desktop.ps1 -Port 9223
```

---

## Troubleshooting

### "TradingView not found"
- Verifica que TradingView esté instalado
- Para MSIX: instala desde Microsoft Store
- Para Desktop: descarga desde https://tradingview.com/

### "CDP not established"
- El puerto ya está en uso por otra instancia
- Prueba con otro puerto: `-Port 9223`
- Verifica que no haya otro proceso usando ese puerto

### MSIX no acepta --remote-debugging-port
- Es una limitación de seguridad de MSIX
- Usa `launch_tv_desktop.ps1` si necesitas CDP

### Permission denied (Linux/macOS)
- Asegúrate de que el script sea ejecutable:
  ```bash
  chmod +x launch_tv.sh
  ```

## Testing

Verificar que CDP esté funcionando:

```powershell
# PowerShell
Invoke-RestMethod "http://localhost:9222/json"

# Bash
curl "http://localhost:9222/json"
```

Debería devolver una lista de páginas activas.

## Integración con opencode-agent

Estos scripts pueden integrarse con el agent para automatizar el debugging:

```powershell
# En tu script principal
$launcher = "C:\Users\Proyects\tradingview-opencode-agent\launchers\launch_tv.ps1"
$result = & $launcher -Port 9222 | ConvertFrom-Json

if ($result.success) {
    Write-Host "CDP disponible en: $($result.url)"
}
```

---

## MCP Server Scripts

### start_mcp.ps1

Inicia solo el servidor MCP (sin abrir TradingView).

**Uso:**
```powershell
.\start_mcp.ps1
```

**Cuando usarlo:**
- Ya tenés TradingView abierto con debug port
- Solo necesitás el servidor MCP para OpenCode

### start_all.ps1

Inicia TradingView + MCP server + abre OpenCode automáticamente.

**Uso:**
```powershell
.\start_all.ps1
```

**Cuando usarlo:**
- Workflow completo desde cero
- Un solo comando para tener todo funcionando

**Nota:** Requiere que `opencode` esté en tu PATH. Si no lo está, modificá el script para usar la ruta completa.