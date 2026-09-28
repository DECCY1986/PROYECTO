/**
 * ASISTENTE FLOTANTE DE DESCARGA MASIVA DIAN - ZIP DIRECTO Y DESBLOQUEO DE POPUPS
 */

(function () {
    if (document.getElementById('dian-assistant-panel')) {
        document.getElementById('dian-assistant-panel').remove();
    }

    // Cargar JSZip obligatoriamente para evitar el bloqueo de ventanas emergentes de Chrome
    if (typeof JSZip === 'undefined') {
        const jszipScript = document.createElement('script');
        jszipScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        document.head.appendChild(jszipScript);
    }

    const style = document.createElement('style');
    style.id = 'dian-assistant-style';
    style.innerHTML = `
        #dian-assistant-panel {
            position: fixed;
            bottom: 25px;
            right: 25px;
            width: 430px;
            background: #0f172a;
            color: #f8fafc;
            border-radius: 16px;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.9), 0 0 0 1px #38bdf8;
            font-family: system-ui, -apple-system, sans-serif;
            z-index: 9999999;
            padding: 20px;
        }
        #dian-assistant-panel h3 {
            margin: 0 0 12px;
            font-size: 17px;
            font-weight: 700;
            color: #38bdf8;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }
        .dian-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 13px;
            color: #cbd5e1;
        }
        .dian-select {
            background: #1e293b;
            color: #f8fafc;
            border: 1px solid #475569;
            padding: 6px 10px;
            border-radius: 6px;
            font-size: 12px;
            outline: none;
        }
        .dian-btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 10px 14px;
            border-radius: 8px;
            font-weight: 700;
            font-size: 13px;
            cursor: pointer;
            width: 100%;
            margin-top: 6px;
        }
        .dian-btn:hover { background: #1d4ed8; }
        .dian-btn-success { background: #059669; }
        .dian-btn-success:hover { background: #047857; }
        .dian-btn-purple { background: #8b5cf6; }
        .dian-btn-purple:hover { background: #7c3aed; }
        .dian-btn-danger { background: #dc2626; }
        .dian-btn-close {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 20px;
            cursor: pointer;
        }
        #dian-progress-container {
            width: 100%;
            height: 8px;
            background: #1e293b;
            border-radius: 4px;
            overflow: hidden;
            margin-top: 12px;
        }
        #dian-progress-bar {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, #38bdf8, #a7f3d0);
            transition: width 0.3s;
        }
        #dian-log-box {
            background: #020617;
            border-radius: 8px;
            padding: 10px;
            font-size: 11px;
            color: #a7f3d0;
            height: 120px;
            overflow-y: auto;
            margin-top: 12px;
            font-family: monospace;
            border: 1px solid #1e293b;
        }
    `;
    document.head.appendChild(style);

    const panel = document.createElement('div');
    panel.id = 'dian-assistant-panel';
    panel.innerHTML = `
        <h3>
            <span>⚡ Descargador Masivo DIAN (ZIP 100% Efectivo)</span>
            <button class="dian-btn-close" onclick="document.getElementById('dian-assistant-panel').remove()">✕</button>
        </h3>
        
        <div class="dian-row">
            <span>Documentos detectados:</span>
            <b id="dian-count" style="font-size:15px; color:#34d399">0</b>
        </div>

        <div class="dian-row">
            <span>Formato de Descarga:</span>
            <select id="dian-format" class="dian-select">
                <option value="pdf">Solo PDF (Icono Descargar 📥)</option>
                <option value="xml">Solo XML (Icono Clip 📎)</option>
                <option value="both">PDF + XML (Ambos)</option>
            </select>
        </div>

        <button id="dian-scan-btn" class="dian-btn">🔍 1. Escanear Documentos</button>
        <button id="dian-zip-btn" class="dian-btn dian-btn-purple" style="display:none">🎁 2. DESCARGAR TODOS EN 1 SOLO ARCHIVO .ZIP</button>
        <button id="dian-stop-btn" class="dian-btn dian-btn-danger" style="display:none">⛔ Detener</button>

        <div id="dian-progress-container"><div id="dian-progress-bar"></div></div>
        <div id="dian-log-box">> Asistente listo. Haz clic en 'Escanear Documentos'.</div>
    `;
    document.body.appendChild(panel);

    function log(msg) {
        const box = document.getElementById('dian-log-box');
        if (box) {
            box.innerHTML += `<div>> ${msg}</div>`;
            box.scrollTop = box.scrollHeight;
        }
    }

    let itemsFound = [];
    let isRunning = false;

    function sanitize(name) {
        return (name || 'DOCUMENTO').replace(/[^a-zA-Z0-9_-]/g, '_');
    }

    // Descarga un archivo Blob directamente a disco
    function saveBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 3000);
    }

    // Obtener blob binario válido del enlace
    async function getBlobFromElement(elem) {
        if (!elem) return null;
        let href = elem.getAttribute('href') || elem.closest('a')?.getAttribute('href') || '';
        
        if (href && (href.startsWith('http') || href.startsWith('/'))) {
            try {
                const fullUrl = new URL(href, window.location.href).href;
                const resp = await fetch(fullUrl, { credentials: 'include' });
                if (resp.ok) {
                    const blob = await resp.blob();
                    if (blob.size > 100) return blob; // Validar que tenga contenido real
                }
            } catch (e) {}
        }
        return null;
    }

    function scanTable() {
        const rows = document.querySelectorAll('table tbody tr');
        itemsFound = [];

        rows.forEach((row, idx) => {
            const cells = row.querySelectorAll('td');
            if (cells.length === 0) return;

            let folio = `DS_${idx + 1}`;
            let fecha = '';
            let nit = '';

            cells.forEach(c => {
                const txt = c.innerText.trim();
                if (/^\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4}$/.test(txt)) fecha = txt.replace(/\//g, '-');
                else if (/^\d{7,10}(-\d)?$/.test(txt)) nit = txt;
                else if (/^[A-Za-z0-9_-]{2,15}\d{1,10}$/.test(txt)) folio = txt;
            });

            // Extraer enlaces 📎 (Clip/XML) e 📥 (Descarga/PDF)
            let pdfLink = null;
            let xmlLink = null;

            const links = Array.from(row.querySelectorAll('a, button, [onclick], i, svg'));
            
            links.forEach(el => {
                const a = el.closest('a, button') || el;
                const html = a.outerHTML.toLowerCase();
                const title = (a.getAttribute('title') || '').toLowerCase();
                const href = (a.getAttribute('href') || '').toLowerCase();

                // Icono Clip 📎 -> XML
                if (html.includes('clip') || html.includes('paperclip') || title.includes('adjunto') || href.includes('xml') || href.includes('attached')) {
                    xmlLink = a;
                }
                // Icono Descarga 📥 -> PDF
                else if (html.includes('download') || html.includes('pdf') || title.includes('pdf') || title.includes('descargar') || href.includes('pdf')) {
                    pdfLink = a;
                }
            });

            // Fallback por orden visual de enlaces en la fila
            if (!pdfLink && !xmlLink) {
                const rowLinks = Array.from(row.querySelectorAll('a[href]'));
                if (rowLinks.length >= 1) xmlLink = rowLinks[0];
                if (rowLinks.length >= 2) pdfLink = rowLinks[1];
            }

            const fileNameBase = sanitize(`${folio}_${fecha}_${nit}`);

            if (pdfLink || xmlLink || cells.length >= 3) {
                itemsFound.push({ row, folio, fileNameBase, pdfLink, xmlLink, index: idx + 1 });
            }
        });

        document.getElementById('dian-count').innerText = itemsFound.length;
        log(`Escanéo: ${itemsFound.length} documentos detectados.`);

        if (itemsFound.length > 0) {
            document.getElementById('dian-zip-btn').style.display = 'block';
        }
    }

    document.getElementById('dian-scan-btn').onclick = scanTable;

    // Descarga comprimida en 1 solo archivo .ZIP (Bypassea popup blocker de Chrome al 100%)
    document.getElementById('dian-zip-btn').onclick = async function () {
        if (isRunning) return;
        isRunning = true;

        if (typeof JSZip === 'undefined') {
            log('⚠️ Cargando librería ZIP... Reintentando en 2 segundos.');
            await new Promise(r => setTimeout(r, 2000));
        }

        const zip = new JSZip();
        const format = document.getElementById('dian-format').value;
        const total = itemsFound.length;
        const progressBar = document.getElementById('dian-progress-bar');

        document.getElementById('dian-zip-btn').style.display = 'none';
        document.getElementById('dian-stop-btn').style.display = 'block';

        log(`📦 Iniciando descarga en memoria de ${total} documentos...`);

        let countSaved = 0;

        for (let i = 0; i < total; i++) {
            if (!isRunning) break;
            const item = itemsFound[i];
            log(`[${i + 1}/${total}] Obteniendo: ${item.fileNameBase}`);

            // Descargar PDF
            if ((format === 'both' || format === 'pdf') && item.pdfLink) {
                const pdfBlob = await getBlobFromElement(item.pdfLink);
                if (pdfBlob) {
                    zip.file(`${item.fileNameBase}.pdf`, pdfBlob);
                    countSaved++;
                } else {
                    log(`  ⚠ Reintentando clic directo en PDF ${item.folio}...`);
                    item.pdfLink.click();
                }
                await new Promise(r => setTimeout(r, 400));
            }

            // Descargar XML
            if ((format === 'both' || format === 'xml') && item.xmlLink) {
                const xmlBlob = await getBlobFromElement(item.xmlLink);
                if (xmlBlob) {
                    zip.file(`${item.fileNameBase}.xml`, xmlBlob);
                    countSaved++;
                } else {
                    log(`  ⚠ Reintentando clic directo en XML ${item.folio}...`);
                    item.xmlLink.click();
                }
                await new Promise(r => setTimeout(r, 400));
            }

            progressBar.style.width = Math.round(((i + 1) / total) * 100) + '%';
        }

        if (isRunning) {
            log('💾 Generando paquete comprimido .ZIP...');
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            saveBlob(zipBlob, `Documentos_DIAN_${new Date().toISOString().slice(0,10)}.zip`);
            log('🎉 ¡DESCARGA FINALIZADA! Se guardó 1 solo archivo .ZIP en tu carpeta Descargas.');
        }

        isRunning = false;
        document.getElementById('dian-stop-btn').style.display = 'none';
        document.getElementById('dian-zip-btn').style.display = 'block';
    };

    document.getElementById('dian-stop-btn').onclick = function () {
        isRunning = false;
        log('🛑 Descarga cancelada.');
    };

    scanTable();
})();
