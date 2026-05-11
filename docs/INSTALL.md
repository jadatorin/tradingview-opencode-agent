# Instalación — TradingView OpenCode Agent

## Requisitos Previos

| Requisito | Versión | Verificación |
|-----------|---------|--------------|
| Node.js | 18+ | `node --version` |
| npm | 8+ | `npm --version` |
| Git | Cualquiera | `git --version` |

> **Nota:** En Windows, también necesitas PowerShell 5.1+ (incluido por defecto en Windows 10/11)

## Pasos de Instalación

### 1. Clonar el Repositorio

```bash
git clone https://github.com/jadatorin/tradingview-opencode-agent.git
cd tradingview-opencode-agent
```

### 2. Instalar Dependencias

```bash
npm install
```

Deberías ver algo como:
```
added 120 packages in 5s
```

### 3. Configurar MCP en opencode.ai

Edita tu archivo de configuración de MCP:

**Opción A: Configuración global**
```json
{
  "mcpServers": {
    "tradingview": {
      "command": "node",
      "args": ["C:/Users/TU_USUARIO/path/to/tradingview-opencode-agent/src/index.js"]
    }
  }
}
```

**Opción B: Configuración por workspace**
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

> 📍 El path debe ser **absoluto** si usas config global, o **relativo** si está en el workspace.

### 4. Iniciar TradingView con Debug Port

El debug port permite que el agente se comunique con TradingView.

**Windows (PowerShell):**
```powershell
.\launchers\launch_tv.ps1
```

**Linux/Mac:**
```bash
chmod +x launchers/launch_tv.sh
./launchers/launch_tv.sh
```

El script detectará automáticamente dónde está instalado TradingView y lo abrirá con el debug port habilitado.

### 5. Verificar Conexión

```bash
npm run test
```

O desde opencode:
```
tv_health_check
```

Deberías ver algo como:
```json
{
  "Browser": "Chrome/120.0.0.0",
  "Protocol-Version": "1.3",
  "User-Agent": "Mozilla/5.0..."
}
```

---

## Estructura del Proyecto

```
tradingview-opencode-agent/
├── src/                      # Servidor MCP
│   ├── index.js              # Entry point
│   ├── server.js             # Servidor principal
│   ├── config.js             # Configuración
│   └── utils/
│       ├── cdp-client.js     # Cliente CDP
│       └── trading-helpers.js
│
├── opencode-skills/          # Skills para opencode
│   ├── SKILL.md              # Dispatcher
│   ├── chart-analysis/       # Análisis de charts
│   ├── pine-develop/         # Desarrollo Pine
│   ├── replay-practice/      # Modo replay
│   ├── multi-symbol-scan/    # Escaneo multi-símbolo
│   ├── strategy-report/      # Reportes de estrategia
│   └── docs/                 # Docs de referencia
│
├── launchers/                # Scripts de lanzamiento
│   ├── launch_tv.ps1         # Windows
│   ├── launch_tv.sh          # Linux/Mac
│   └── ...
│
├── docs/                     # Documentación
├── package.json
└── README.md
```

---

## Verificación de Instalación

### Checklist

- [ ] Node.js 18+ instalado
- [ ] Dependencias instaladas (`npm install` exitoso)
- [ ] Configuración MCP agregada
- [ ] TradingView iniciado con debug port
- [ ] `npm run test` exitoso
- [ ] `tv_health_check` responde correctamente

### Solución de Problemas Iniciales

| Problema | Solución |
|----------|----------|
| `npm install` falla | Verificar versión de Node.js |
| Config MCP no reconocida | Reiniciar opencode después de editar config |
| `launch_tv.ps1` no corre | Ejecutar como PowerShell, no cmd |
| Puerto 9222 en uso | Usar `-Port 9223` como alternativa |

---

## Actualización

Para actualizar a una nueva versión:

```bash
# 1. Obtener últimos cambios
git pull origin main

# 2. Reinstalar dependencias (por si hubo cambios)
npm install

# 3. Reiniciar TradingView
.\launchers\launch_tv.ps1
```

---

## Desinstalación

```bash
# 1. Eliminar carpeta del proyecto
rm -rf tradingview-opencode-agent

# 2. Quitar de configuración MCP
# Editar ~/.config/opencode/mcp.json y remover la entrada "tradingview"

# 3. Cerrar TradingView si está abierto
```

---

## Notas

- El servidor corre **100% local** — no hay conexión a servidores externos
- TradingView Desktop debe estar **abierto** durante el uso
- El debug port (9222 por defecto) debe estar **habilitado**
- Si usas la versión de Microsoft Store (MSIX), hay limitaciones en pasar argumentos — usa `launch_tv_desktop.ps1` si necesitas CDP