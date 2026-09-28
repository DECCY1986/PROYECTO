# 🚀 Asistente de Descarga Masiva de Facturas DIAN (Python & Navegador)

Este paquete proporciona una herramienta automática para **descargar todas tus facturas electrónicas (PDF y XML)** desde el portal de la DIAN (Colombia), operando exclusivamente sobre tu sesión abierta y **sin guardar claves ni credenciales**.

Soporta la descarga de **Facturas Emitidas (Ventas)**, **Facturas Recibidas (Compras/Gastos)** o **Ambas**.

---

## 🔒 100% Seguro y Privado
- **Sin Claves ni Certificados:** No requiere ingresar usuario, contraseña ni firmas digitales.
- **Acceso por Sesión:** Inicias sesión manualmente en el portal de la DIAN y el script se conecta a la ventana activa para realizar las descargas de forma automática.

---

## 🛠️ Estructura del Proyecto

```
contabilidad/dian_downloader/
├── 1_iniciar_chrome_dian.bat   # Batch para iniciar Chrome con depuración activada
├── 2_ejecutar_descarga.bat     # Batch para instalar dependencias y ejecutar el script
├── dian_downloader.py          # Script principal en Python (Playwright + Pandas)
├── dian_assistant.js           # Asistente flotante inyectable en navegador
├── requirements.txt            # Librerías de Python requeridas
└── README_DIAN.md              # Guía de usuario
```

---

## 📖 Instrucciones de Uso (Paso a Paso)

### Método 1: Script de Python (Recomendado - Guarda en Carpetas)

1. **Abre Chrome en Modo Compatibilidad:**
   - Haz doble clic en `1_iniciar_chrome_dian.bat`.
   - Se abrirá una ventana de Chrome con el puerto de depuración `9222`.

2. **Inicia Sesión en la DIAN:**
   - En la ventana de Chrome que se abrió, ingresa al portal de la DIAN (ej. token de correo o usuario/clave).
   - Dirígete a la sección de **Facturas Emitidas** o **Facturas Recibidas**.

3. **Ejecuta la Descarga Automática:**
   - Haz doble clic en `2_ejecutar_descarga.bat`.
   - El asistente detectará tu ventana de Chrome abierta, te preguntará qué tipo de facturas deseas descargar (`1: Emitidas`, `2: Recibidas`, `3: Ambas`).
   - El script recorrerá todas las páginas descargando automáticamente PDFs y XMLs.

4. **Resultados:**
   Los archivos se guardarán en:
   - `Facturas_DIAN_Descargadas/Facturas_Emitidas_Ventas/`
   - `Facturas_DIAN_Descargadas/Facturas_Recibidas_Compras/`
   - `resumen_facturas_dian.xlsx` (Tabla resumen en Excel con NIT, Totales y Fechas).

---

### Método 2: Asistente Flotante en Navegador (JavaScript)

Si prefieres realizar la descarga directamente desde la ventana del navegador sin usar la consola de comando:

1. Inicia sesión en la DIAN.
2. Presiona `F12` en tu teclado para abrir las **Herramientas de Desarrollador** de Chrome y ve a la pestaña **Consola (Console)**.
3. Copia y pega todo el contenido de `dian_assistant.js` y presiona `Enter`.
4. En la parte inferior derecha aparecerá el widget flotante:
   - Haz clic en **Escanear Facturas en Pantalla**.
   - Haz clic en **Descargar PDFs y XMLs**.

---

## ❓ Preguntas Frecuentes

**¿Qué pasa si la DIAN bloquea descargas masivas?**
El script incluye pausas de seguridad (`asyncio.sleep(0.8)`) entre cada descarga para evitar saturar el servidor y prevenir bloqueos.

**¿Puedo filtrar por rango de fechas?**
Sí, aplica el filtro de fechas directamente en los buscadores de la DIAN antes de iniciar el script; la herramienta procesará las facturas filtradas que estén en pantalla y sus páginas subsiguientes.
