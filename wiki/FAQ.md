# FAQ — Preguntas Frecuentes ❓

## Instalación

### Q: ¿Qué versión de Node.js necesito?
**A:** Node.js 18 o superior.

### Q: ¿Necesito TradingView Premium?
**A:** No es obligatorio, pero las features de datos en tiempo real requieren suscripción.

### Q: ¿Funciona en Mac/Linux?
**A:** Sí, usa `launch_tv.sh` para Mac/Linux.

---

## Conexión

### Q: TradingView no se conecta
**A:** 
1. Verifica que TradingView esté abierto
2. Ejecuta `.\launchers\launch_tv.ps1`
3. Verifica el debug port: `curl http://localhost:9222/json/version`

### Q: ¿Puedo usar la versión de Windows Store?
**A:** Sí, usa `.\launchers\launch_tv_msix.ps1`

### Q: ¿El debug port puede ser diferente?
**A:** Sí, ejecuta `.\launch_tv.ps1 -Port 9223` (o el que prefieras)

---

## Uso

### Q: ¿Cómo cambio el símbolo?
**A:** `chart_set_symbol "ES1!"` o simplemente dime "cambia a AAPL"

### Q: ¿Puedo usar indicadores custom?
**A:** Sí, siempre que estén visibles en el chart. El agent puede leer Pine lines, labels, tables.

### Q: ¿Dónde se guardan los screenshots?
**A:** En `screenshots/` (configurable con SCREENSHOT_DIR)

---

## Errores

### Q: "CDP connection failed"
**A:** Reinicia TradingView con el debug port o verifica que no haya otro proceso usando el puerto.

### Q: "Symbol not found"
**A:** Verifica el nombre del símbolo. Usa `symbol_search` para buscar símbolos válidos.

---

## Contribuir

### Q: ¿Puedo contribuir?
**A:** ¡Sí! Fork el repo, crea una rama, y abre un PR.

### Q: ¿Cómo reporto bugs?
**A:** Usa el template de Bug Report en Issues.

---

¿Tu pregunta no está aquí? Abre un issue con label "question".