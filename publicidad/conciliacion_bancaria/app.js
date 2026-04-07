// ============================================================
//  APP.JS — Controlador principal de la conciliación bancaria
// ============================================================

const STORAGE_KEY = 'conciliacion_bancaria_state_publicidad';

// Mapeo de palabras clave a conceptos contables sugeridos
const CONCEPT_MAPPINGS = [
    { key: 'GMF', concepto: 'Impuesto GMF (4x1000)' },
    { key: '4X1000', concepto: 'Impuesto GMF (4x1000)' },
    { key: 'COMISION', concepto: 'Gastos Bancarios - Comisiones' },
    { key: 'IVA', concepto: 'IVA Gasto Bancario' },
    { key: 'INTERES', concepto: 'Rendimientos Financieros / Intereses' },
    { key: 'MANEJO', concepto: 'Cuota de Manejo' },
    { key: 'RETIRO', concepto: 'Retiro de Efectivo' },
    { key: 'TRANSFERENCIA', concepto: 'Transferencia Bancaria' },
    { key: 'ABONO', concepto: 'Abono / Pago Recibido' },
    { key: 'PAGO', concepto: 'Pago Realizado' },
    { key: 'NOMINA', concepto: 'SALARIOS Y RENTAS DE TRABAJO' },
    { key: 'NOMIN', concepto: 'SALARIOS Y RENTAS DE TRABAJO' },
    { key: 'HONORARIO', concepto: 'SALARIOS Y RENTAS DE TRABAJO' },
    { key: 'SERVICIOS', concepto: 'SALARIOS Y RENTAS DE TRABAJO' }
];

function extractNIT(descripcion) {
    if (!descripcion) return null;
    // Busca secuencias de 8 a 10 dígitos que suelen ser NITs en estos extractos
    const match = descripcion.match(/\d{8,10}/);
    return match ? match[0] : null;
}

function sugerirConcepto(descripcion) {
    if (!descripcion) return '';
    const desc = descripcion.toUpperCase();
    const match = CONCEPT_MAPPINGS.find(m => desc.includes(m.key));
    return match ? match.concepto : '';
}

// Estado global
const state = {
    cuentas: [
        { id: 'c1', nombre: 'Bancolombia #1', banco: 'Bancolombia' },
        { id: 'c2', nombre: 'Bancolombia #2', banco: 'Bancolombia' },
        { id: 'c3', nombre: 'BBVA', banco: 'BBVA' }
    ],
    cuentaActiva: 'c1',
    archivoBanco: null,
    archivoHelisa: null,
    resultado: null,
    // Datos parseados (para guardar en localStorage sin resubir archivos)
    _parsedBanco: null,
    _parsedHelisa: null,
    _terceros: [], // Lista única de terceros extraídos de Helisa
    sortParams: { column: 'tercero', direction: 'asc' } // Orden inicial por proveedor
};

// ── Inicialización ────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderCuentas();
    setupDropZones();
    setupButtons();
    restoreProgress();
});

// ── Tabs de cuentas ───────────────────────────────────────────
function renderCuentas() {
    const tabs = document.getElementById('cuentas-tabs');
    tabs.innerHTML = '';
    state.cuentas.forEach(c => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn' + (c.id === state.cuentaActiva ? ' active' : '');
        btn.innerHTML = `<span class="tab-bank-icon">${c.banco === 'Bancolombia' ? '🏦' : '🏛️'}</span> ${c.nombre}`;
        btn.onclick = () => {
            state.cuentaActiva = c.id;
            resetArchivos();
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            document.getElementById('banco-label').textContent = c.banco;
            restoreProgress(c.id);
        };
        tabs.appendChild(btn);
    });
    // Mostrar banco activo
    const activa = state.cuentas.find(c => c.id === state.cuentaActiva);
    document.getElementById('banco-label').textContent = activa.banco;
}

function getCuentaActiva() {
    return state.cuentas.find(c => c.id === state.cuentaActiva);
}

// ── Drag & Drop / File Input ───────────────────────────────────
function setupDropZones() {
    setupZone('drop-banco', 'input-banco', 'banco', 'banco-filename');
    setupZone('drop-helisa', 'input-helisa', 'helisa', 'helisa-filename');
}

function setupZone(zoneId, inputId, tipo, fileNameId) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);
    const label = document.getElementById(fileNameId);

    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag-over'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
    zone.addEventListener('drop', e => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file, tipo, label, zone);
    });
    zone.addEventListener('click', () => input.click());
    input.addEventListener('change', () => {
        if (input.files[0]) handleFile(input.files[0], tipo, label, zone);
    });
}

function handleFile(file, tipo, label, zone) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xls', 'xlsx', 'csv', 'txt'].includes(ext)) {
        showToast('⚠️ Formato no soportado. Use XLS, XLSX, CSV o TXT.', 'error');
        return;
    }
    if (tipo === 'banco') state.archivoBanco = file;
    if (tipo === 'helisa') state.archivoHelisa = file;

    label.textContent = file.name;
    zone.classList.add('file-loaded');
    updateConciliarBtn();
}

function resetArchivos() {
    state.archivoBanco = null;
    state.archivoHelisa = null;
    state.resultado = null;
    ['banco', 'helisa'].forEach(t => {
        document.getElementById(`drop-${t}`).classList.remove('file-loaded', 'drag-over');
        document.getElementById(`${t}-filename`).textContent = 'Ningún archivo seleccionado';
        document.getElementById(`input-${t}`).value = '';
    });
    const p = document.getElementById('input-periodo'); if (p) p.value = '';
    const sb = document.getElementById('input-saldo-banco'); if (sb) sb.value = '';
    const sh = document.getElementById('input-saldo-helisa'); if (sh) sh.value = '';
    updateSaveIndicator(null);

    document.getElementById('resultados-section').style.display = 'none';
    document.getElementById('upload-section').style.display = 'block';
    updateConciliarBtn();
}

function updateConciliarBtn() {
    const btn = document.getElementById('btn-conciliar');
    const ok = state.archivoBanco && state.archivoHelisa;
    btn.disabled = !ok;
    btn.classList.toggle('ready', ok);
}

// ── Botones ────────────────────────────────────────────────────
function setupButtons() {
    document.getElementById('btn-conciliar').addEventListener('click', doConciliar);
    document.getElementById('btn-exportar').addEventListener('click', doExportar);
    document.getElementById('btn-pdf').addEventListener('click', exportarPDF);
    document.getElementById('btn-nueva').addEventListener('click', () => {
        resetArchivos();
        document.getElementById('resultados-section').style.display = 'none';
        document.getElementById('upload-section').style.display = 'block';
    });

    // Listeners para recálculo de saldo final si escriben saldo inicial
    document.getElementById('input-saldo-banco').addEventListener('input', calcularSaldosFinales);
    document.getElementById('input-saldo-helisa').addEventListener('input', calcularSaldosFinales);
}

// ── Conciliación ───────────────────────────────────────────────
async function doConciliar() {
    const cuenta = getCuentaActiva();
    const btn = document.getElementById('btn-conciliar');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Procesando...';

    try {
        // Leer archivos
        const [wbBanco, wbHelisa] = await Promise.all([
            readWorkbook(state.archivoBanco),
            readWorkbook(state.archivoHelisa)
        ]);

        // Parsear
        let movsBanco;
        if (cuenta.banco === 'Bancolombia') movsBanco = parseBancolombia(wbBanco);
        else if (cuenta.banco === 'BBVA') movsBanco = parseBBVA(wbBanco);
        else throw new Error('Banco no reconocido');

        const movsHelisa = parseHelisa(wbHelisa);

        // Guardar datos parseados para poder restaurar sin resubir
        state._parsedBanco = movsBanco;
        state._parsedHelisa = movsHelisa;

        // Extraer lista única de terceros
        state._terceros = [...new Set(movsHelisa.map(m => m.tercero).filter(t => t && t.length > 2))].sort();

        // Conciliar
        state.resultado = reconcile(movsBanco, movsHelisa);
        state.resultado._cuenta = cuenta.nombre;
        state.resultado._banco = cuenta.banco;

        // Mostrar resultados
        renderResultados(state.resultado, cuenta);
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('resultados-section').style.display = 'block';

        // Auto-guardar progreso
        saveProgress();
        showToast(`✅ Conciliado. Banco: ${movsBanco.length} | Helisa: ${movsHelisa.length} regs.`, 'success');

    } catch (err) {
        showToast('❌ ' + err.message, 'error');
        console.error(err);
    } finally {
        btn.disabled = false;
        btn.innerHTML = '🔄 Conciliar';
        updateConciliarBtn();
    }
}

function readWorkbook(file) {
    return new Promise((resolve, reject) => {
        // Estrategia 1: readAsArrayBuffer (preferida para .xlsx)
        const tryArray = () => new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = e => {
                try {
                    const data = new Uint8Array(e.target.result);
                    res(XLSX.read(data, { type: 'array', cellDates: false, raw: true }));
                } catch (err) { rej(err); }
            };
            r.onerror = rej;
            r.readAsArrayBuffer(file);
        });

        // Estrategia 2: readAsBinaryString (compatibilidad con .xls legado)
        const tryBinary = () => new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = e => {
                try {
                    res(XLSX.read(e.target.result, { type: 'binary', cellDates: false, raw: true }));
                } catch (err) { rej(err); }
            };
            r.onerror = rej;
            r.readAsBinaryString(file);
        });

        // Estrategia 3: readAsText (CSV / TXT exportados por Helisa)
        const tryText = () => new Promise((res, rej) => {
            const r = new FileReader();
            r.onload = e => {
                try {
                    const text = e.target.result;
                    // Detectar separador: tabulación (Helisa TXT) o coma (CSV)
                    const sep = text.includes('\t') ? '\t' : ',';
                    res(XLSX.read(text, { type: 'string', FS: sep, cellDates: false }));
                } catch (err) { rej(err); }
            };
            r.onerror = rej;
            r.readAsText(file, 'UTF-8');
        });

        const ext = file.name.split('.').pop().toLowerCase();

        // Orden de intentos según extensión
        const strategies = (ext === 'csv' || ext === 'txt')
            ? [tryText, tryArray, tryBinary]
            : [tryArray, tryBinary, tryText];

        // Probar estrategias en secuencia
        strategies.reduce((chain, fn) =>
            chain.catch(() => fn()),
            Promise.reject(new Error('inicio'))
        )
            .then(resolve)
            .catch(() => reject(new Error(
                `No se pudo leer "${file.name}". Asegúrese de que el archivo no esté protegido con contraseña y sea un formato XLS, XLSX, CSV o TXT válido.`
            )));
    });
}

// ── Renderizar resultados ──────────────────────────────────────
function renderResultados(result, cuenta) {
    const s = result.summary;
    const fmt = n => n?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

    // Tarjetas del resumen
    document.getElementById('res-cuenta').textContent = cuenta.nombre;
    document.getElementById('res-banco').textContent = cuenta.banco;
    document.getElementById('res-fecha').textContent = new Date().toLocaleDateString('es-CO');
    document.getElementById('res-conciliados').textContent = s.conciliados;
    document.getElementById('res-solo-banco').textContent = s.soloBanco;
    document.getElementById('res-solo-helisa').textContent = s.soloHelisa;
    document.getElementById('res-total-banco').textContent = '$ ' + fmt(s.totalBanco);
    document.getElementById('res-total-helisa').textContent = '$ ' + fmt(s.totalHelisa);

    const difEl = document.getElementById('res-diferencia');
    difEl.textContent = '$ ' + fmt(Math.abs(s.diferencia));
    difEl.className = Math.abs(s.diferencia) < 1 ? 'val-ok' : 'val-error';

    document.getElementById('res-pct').textContent = s.porcentajeCruce + '%';

    // Rellenar entradas y salidas en los cuadros de Resumen
    document.getElementById('res-entradas-banco').textContent = '$ ' + fmt(s.salidasBanco); // En los extractos, las entradas aparecen como depósitos/créditos
    document.getElementById('res-salidas-banco').textContent = '$ ' + fmt(s.entradasBanco);
    document.getElementById('res-entradas-helisa').textContent = '$ ' + fmt(s.entradasHelisa); // En Helisa, débito = entrada
    document.getElementById('res-salidas-helisa').textContent = '$ ' + fmt(s.salidasHelisa); // En Helisa, crédito = salida

    // Calcular y mostrar saldos finales initiales
    calcularSaldosFinales();

    // ── Tabs resultados
    setupResultTabs(result);
}

function calcularSaldosFinales() {
    if (!state.resultado) return;
    const s = state.resultado.summary;
    const fmt = n => n?.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) ?? '0,00';

    const valBanco = toNumberUI(document.getElementById('input-saldo-banco').value);
    const finalBanco = valBanco + s.salidasBanco - s.entradasBanco; // En banco sumamos salidasBanco (créditos/entradas) y restamos entradasBanco (débitos/salidas)
    document.getElementById('res-final-banco').textContent = '$ ' + fmt(finalBanco);

    const valHelisa = toNumberUI(document.getElementById('input-saldo-helisa').value);
    const finalHelisa = valHelisa + s.entradasHelisa - s.salidasHelisa;
    document.getElementById('res-final-helisa').textContent = '$ ' + fmt(finalHelisa);
}

function updateMovementConcept(origen, index, concepto) {
    if (!state.resultado) return;
    if (origen === 'Banco') {
        state.resultado.onlyBank[index].concepto = concepto;
    } else {
        state.resultado.onlyHelisa[index].concepto = concepto;
    }
    saveProgress();
}

/**
 * Resetea el concepto y tercero de una fila específica
 */
function clearRow(origen, index) {
    if (!state.resultado) return;
    const move = (origen === 'Banco') ? state.resultado.onlyBank[index] : state.resultado.onlyHelisa[index];
    move.concepto = '';
    move.tercero = '';
    move.saved = false;

    // Forzar re-render de la pestaña actual
    renderTabDiferencias(state.resultado.onlyBank, state.resultado.onlyHelisa);
    saveProgress();
}

/**
 * Alterna el estado de "guardado/confirmado" de una fila
 */
function toggleSaveRow(origen, index) {
    if (!state.resultado) return;
    const move = (origen === 'Banco') ? state.resultado.onlyBank[index] : state.resultado.onlyHelisa[index];
    move.saved = !move.saved;

    renderTabDiferencias(state.resultado.onlyBank, state.resultado.onlyHelisa);
    saveProgress();
}

function updateMovementTercero(origen, index, tercero) {
    if (!state.resultado) return;

    if (origen === 'Banco') {
        state.resultado.onlyBank[index].tercero = tercero;
    } else {
        state.resultado.onlyHelisa[index].tercero = tercero;
    }

    saveProgress();
}

function setupResultTabs(result) {
    const tabs = document.querySelectorAll('.res-tab');
    const panes = document.querySelectorAll('.res-pane');

    tabs.forEach(tab => {
        tab.onclick = () => {
            tabs.forEach(t => t.classList.remove('active'));
            panes.forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById('pane-' + tab.dataset.tab).classList.add('active');
        };
    });

    renderTabConciliados(result.matched);
    renderTabDiferencias(result.onlyBank, result.onlyHelisa);
}

function fmt(n) {
    return (n ?? 0).toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function renderTabConciliados(matched) {
    const tbody = document.querySelector('#tabla-conciliados tbody');
    tbody.innerHTML = '';
    if (!matched.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-msg">No hay movimientos conciliados</td></tr>';
        return;
    }
    matched.forEach(m => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
      <td>${m.banco_fecha}</td>
      <td title="${m.banco_descripcion}">${truncate(m.banco_descripcion, 30)}</td>
      <td class="num">${m.banco_debito > 0 ? '$ ' + fmt(m.banco_debito) : '-'}</td>
      <td class="num">${m.banco_credito > 0 ? '$ ' + fmt(m.banco_credito) : '-'}</td>
      <td>${m.helisa_fecha}</td>
      <td title="${m.helisa_descripcion}">${truncate(m.helisa_descripcion, 30)}</td>
      <td class="num">${m.helisa_debito > 0 ? '$ ' + fmt(m.helisa_debito) : '-'}</td>
      <td class="num">${m.helisa_credito > 0 ? '$ ' + fmt(m.helisa_credito) : '-'}</td>`;
        tbody.appendChild(tr);
    });
}

function renderTabDiferencias(onlyBank, onlyHelisa) {
    const tbody = document.querySelector('#tabla-diferencias tbody');
    tbody.innerHTML = '';
    let all = [...onlyBank, ...onlyHelisa];

    // Aplicar ordenamiento
    const { column, direction } = state.sortParams;
    all.sort((a, b) => {
        let valA = '', valB = '';

        switch (column) {
            case 'tipo': valA = a.tipo; valB = b.tipo; break;
            case 'fecha': valA = a.fecha; valB = b.fecha; break;
            case 'descripcion': valA = a.descripcion; valB = b.descripcion; break;
            case 'concepto':
                valA = a.concepto || sugerirConcepto(a.descripcion);
                valB = b.concepto || sugerirConcepto(b.descripcion);
                break;
            case 'tercero': valA = a.tercero || ''; valB = b.tercero || ''; break;
            case 'monto':
                valA = Math.max(a.debito || 0, a.credito || 0);
                valB = Math.max(b.debito || 0, b.credito || 0);
                break;
            default: valA = a[column] || ''; valB = b[column] || '';
        }

        if (typeof valA === 'string') {
            return direction === 'asc'
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        } else {
            return direction === 'asc' ? valA - valB : valB - valA;
        }
    });

    if (!all.length) {
        tbody.innerHTML = '<tr><td colspan="9" class="empty-msg">✅ ¡Sin diferencias! Conciliación perfecta.</td></tr>';
        return;
    }

    // Actualizar encabezado de la tabla para incluir Concepto, Tercero y Acciones de forma robusta
    const theadRow = document.querySelector('#tabla-diferencias thead tr');
    if (theadRow) {
        const sortIcon = state.sortParams.direction === 'asc' ? ' 🔼' : ' 🔽';
        const cols = [
            { id: 'tipo', label: 'Tipo' },
            { id: 'fecha', label: 'Fecha' },
            { id: 'descripcion', label: 'Descripción' },
            { id: 'comprobante', label: 'Referencia' },
            { id: 'monto', label: 'Monto' },
            { id: 'concepto', label: 'Concepto' },
            { id: 'tercero', label: 'Proveedor' },
            { id: 'acciones', label: 'Acciones' }
        ];

        theadRow.innerHTML = cols.map(c => {
            const isSorted = state.sortParams.column === c.id;
            const extra = isSorted ? `<span class="sort-indicator">${sortIcon}</span>` : '';
            const align = c.id === 'monto' ? 'class="num"' : '';
            const clickable = c.id !== 'acciones' ? `onclick="changeSort('${c.id}')" style="cursor:pointer;"` : '';
            return `<th ${align} ${clickable}>${c.label} ${extra}</th>`;
        }).join('');
    }

    // Preparar datalist de terceros
    let datalist = document.getElementById('list-terceros');
    if (!datalist) {
        datalist = document.createElement('datalist');
        datalist.id = 'list-terceros';
        document.body.appendChild(datalist);
    }
    datalist.innerHTML = state._terceros.map(t => `<option value="${t}">`).join('');

    all.forEach((m, idx) => {
        const tr = document.createElement('tr');
        const esBank = m.origen !== 'Helisa';
        tr.className = (esBank ? 'row-bank' : 'row-helisa') + (m.saved ? ' row-saved' : '');

        // El concepto persistido o sugerido
        const conceptoActual = m.concepto || sugerirConcepto(m.descripcion);
        if (!m.concepto && conceptoActual) m.concepto = conceptoActual;

        // Necesitamos el índice original dentro de su propio array (onlyBank o onlyHelisa)
        const originIdx = esBank ? onlyBank.indexOf(m) : onlyHelisa.indexOf(m);

        // Extraer NIT si existe
        const nit = extractNIT(m.descripcion);
        const descHtml = nit
            ? `<div class="desc-with-nit">
                 <span class="badge-nit">${nit}</span> 
                 <span class="desc-text">${truncate(m.descripcion.replace(nit, '').replace(/^[\s\-\.]+/, ''), 35)}</span>
               </div>`
            : truncate(m.descripcion, 35);

        tr.innerHTML = `
      <td><span class="badge ${esBank ? 'badge-bank' : 'badge-helisa'}">${m.tipo}</span></td>
      <td>${m.fecha}</td>
      <td title="${m.descripcion}">${descHtml}</td>
      <td>${m.comprobante || m.referencia || '-'}</td>
      <td class="num">${m.debito > 0 ? '$ ' + fmt(m.debito) : '-'}</td>
      <td class="num">${m.credito > 0 ? '$ ' + fmt(m.credito) : '-'}</td>
      <td>
        <input type="text" class="concept-input" 
               placeholder="Concepto..." 
               value="${m.concepto || ''}"
               onchange="updateMovementConcept('${esBank ? 'Banco' : 'Helisa'}', ${originIdx}, this.value)">
      </td>
      <td>
        <input type="text" class="concept-input" 
               list="list-terceros"
               placeholder="Buscar proveedor..." 
               value="${m.tercero || ''}"
               onchange="updateMovementTercero('${esBank ? 'Banco' : 'Helisa'}', ${originIdx}, this.value)">
      </td>
      <td class="row-actions">
        <button class="btn-row-action btn-save-row" 
                onclick="toggleSaveRow('${esBank ? 'Banco' : 'Helisa'}', ${originIdx})" 
                title="${m.saved ? 'Editar fila' : 'Confirmar fila'}">
            ${m.saved ? '✏️ Editar' : '✔️ Listo'}
        </button>
        <button class="btn-row-action btn-clear" 
                onclick="clearRow('${esBank ? 'Banco' : 'Helisa'}', ${originIdx})" 
                title="Borrar/Reiniciar fila">
            🗑️ Borrar
        </button>
      </td>`;
        tbody.appendChild(tr);
    });
}

// ── Exportar ───────────────────────────────────────────────────
function doExportar() {
    if (!state.resultado) return;
    const cuenta = getCuentaActiva();

    // Leer parámetros del formulario
    const periodo = document.getElementById('input-periodo').value.trim() || '';
    const saldoInicialBanco = toNumberUI(document.getElementById('input-saldo-banco').value);
    const saldoInicialHelisa = toNumberUI(document.getElementById('input-saldo-helisa').value);

    const saldos = { saldoInicialBanco, saldoInicialHelisa };

    try {
        const file = exportToExcel(state.resultado, cuenta.nombre, cuenta.banco, saldos, periodo);
        showToast(`📥 Descargado: ${file} `, 'success');
    } catch (err) {
        showToast('❌ Error al exportar: ' + err.message, 'error');
        console.error(err);
    }
}

// ── Exportar a PDF ─────────────────────────────────────────────
function exportarPDF() {
    if (!state.resultado) return;

    const cuenta = getCuentaActiva();
    const element = document.getElementById('resultados-section');
    const periodo = document.getElementById('input-periodo').value.trim() || document.getElementById('input-periodo').placeholder;

    // Elementos a ocultar temporalmente durante la impresión
    const actions = element.querySelector('.result-actions');
    if (actions) actions.style.display = 'none';

    // Activar modo impresión (fondo blanco, texto oscuro)
    document.body.classList.add('pdf-mode');

    // Opciones del PDF
    const opt = {
        margin: [10, 10, 10, 10], // top, left, bottom, right
        filename: `Conciliacion_${cuenta.nombre}_${periodo}.pdf`.replace(/ /g, '_'),
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generar PDF
    html2pdf().set(opt).from(element).save().then(() => {
        // Restaurar estado
        document.body.classList.remove('pdf-mode');
        if (actions) actions.style.display = 'flex';
        showToast('📄 PDF generado exitosamente', 'success');
    }).catch(err => {
        document.body.classList.remove('pdf-mode');
        if (actions) actions.style.display = 'flex';
        showToast('❌ Error al generar PDF: ' + err.message, 'error');
        console.error(err);
    });
}

// Convierte valor de input a número (soporta formato colombiano y punto decimal)
function toNumberUI(str) {
    if (!str) return 0;
    str = str.trim().replace(/[$\s]/g, '');
    const dots = (str.match(/\./g) || []).length;
    const commas = (str.match(/,/g) || []).length;
    if (dots > 0 && commas > 0) {
        const lastDot = str.lastIndexOf('.');
        const lastComma = str.lastIndexOf(',');
        if (lastDot > lastComma) return parseFloat(str.replace(/,/g, '')) || 0;
        else return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }

    if (dots === 1 && commas === 0) return parseFloat(str) || 0;
    if (commas === 1 && dots === 0) return parseFloat(str.replace(',', '.')) || 0;
    if (dots > 1) return parseFloat(str.replace(/\./g, '')) || 0;
    if (commas > 1) return parseFloat(str.replace(/,/g, '')) || 0;
    return parseFloat(str) || 0;
}

// ══════════════════════════════════════════════════════════════
//  PERSISTENCIA — Guardar / Restaurar progreso con localStorage
// ══════════════════════════════════════════════════════════════

function saveProgress() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        let allData = {};
        if (raw) {
            try { allData = JSON.parse(raw); } catch (e) { }
        }

        // Convert from old version (v2 without active accounts map)
        if (allData.version === 2 && allData.resultado) {
            allData = {};
        }

        if (!allData.cuentas) allData.cuentas = {};

        const data = {
            timestamp: new Date().toISOString(),
            parsedBanco: state._parsedBanco,
            parsedHelisa: state._parsedHelisa,
            terceros: state._terceros,
            resultado: state.resultado,
            periodo: document.getElementById('input-periodo')?.value || '',
            saldoBanco: document.getElementById('input-saldo-banco')?.value || '',
            saldoHelisa: document.getElementById('input-saldo-helisa')?.value || ''
        };

        allData.version = 3;
        allData.lastActive = state.cuentaActiva;
        allData.cuentas[state.cuentaActiva] = data;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        updateSaveIndicator(data.timestamp);
    } catch (err) {
        console.warn('No se pudo guardar progreso:', err);
        showToast('⚠️ No se pudo guardar el progreso (datos demasiado grandes)', 'error');
    }
}

function restoreProgress(cuentaToLoad = null) {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;

        let allData = JSON.parse(raw);
        if (!allData) return;

        // Backward compatibility: migrate v2 to v3
        if (allData.version === 2 && allData.resultado) {
            const oldData = { ...allData };
            allData = {
                version: 3,
                lastActive: oldData.cuentaActiva || 'c1',
                cuentas: {}
            };
            allData.cuentas[allData.lastActive] = {
                timestamp: oldData.timestamp,
                parsedBanco: oldData.parsedBanco,
                parsedHelisa: oldData.parsedHelisa,
                resultado: oldData.resultado,
                periodo: oldData.periodo,
                saldoBanco: oldData.saldoBanco,
                saldoHelisa: oldData.saldoHelisa
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
        }

        if (allData.version !== 3 || !allData.cuentas) return;

        // Determine which account to load
        const targetCuenta = cuentaToLoad || allData.lastActive || 'c1';
        const data = allData.cuentas[targetCuenta];

        // If no data for this account, just ensure we're on this account but in a blank state
        if (!data) {
            if (!cuentaToLoad) { // Only change tab active if not explicitly loading one from click
                state.cuentaActiva = targetCuenta;
                renderCuentas();
            }
            return;
        }

        // Restaurar estado
        state.cuentaActiva = targetCuenta;
        state._parsedBanco = data.parsedBanco;
        state._parsedHelisa = data.parsedHelisa;
        state._terceros = data.terceros || [];
        state.resultado = data.resultado;

        // Actualizar tabs solo si no venimos de un clic explícito para evitar loops
        if (!cuentaToLoad) {
            renderCuentas();
        }

        // Restaurar campos del formulario
        const periodoEl = document.getElementById('input-periodo');
        const saldoBEl = document.getElementById('input-saldo-banco');
        const saldoHEl = document.getElementById('input-saldo-helisa');
        if (periodoEl) periodoEl.value = data.periodo || '';
        if (saldoBEl) saldoBEl.value = data.saldoBanco || '';
        if (saldoHEl) saldoHEl.value = data.saldoHelisa || '';

        // Mostrar resultados
        const cuenta = getCuentaActiva();
        renderResultados(state.resultado, cuenta);
        document.getElementById('upload-section').style.display = 'none';
        document.getElementById('resultados-section').style.display = 'block';

        updateSaveIndicator(data.timestamp);
        if (!cuentaToLoad) {
            showToast(`📂 Progreso anterior restaurado automáticamente.Archivos leídos: ${state._parsedBanco.length} registros del banco, ${state._parsedHelisa.length} de Helisa`, 'success');
        } else {
            showToast(`📂 Datos de ${cuenta.nombre} restaurados.`, 'success');
        }

    } catch (err) {
        console.warn('Error al restaurar progreso:', err);
    }
}

function clearProgress() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            let allData = JSON.parse(raw);
            if (allData && allData.version === 3 && allData.cuentas) {
                delete allData.cuentas[state.cuentaActiva];
                localStorage.setItem(STORAGE_KEY, JSON.stringify(allData));
            } else {
                localStorage.removeItem(STORAGE_KEY);
            }
        }
    } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
    }

    state._parsedBanco = null;
    state._parsedHelisa = null;
    state.resultado = null;
    updateSaveIndicator(null);
    resetArchivos(); // Ensure UI goes back to upload section
    showToast('🗑️ Progreso de esta cuenta eliminado', 'success');
}

function updateSaveIndicator(timestamp) {
    const el = document.getElementById('save-indicator');
    if (!el) return;
    if (timestamp) {
        const d = new Date(timestamp);
        const fmt = d.toLocaleDateString('es-CO') + ' ' + d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
        el.textContent = `💾 Guardado: ${fmt} `;
        el.style.color = 'var(--primary)';
    } else {
        el.textContent = 'Sin datos guardados';
        el.style.color = 'var(--text-muted)';
    }
}

// ── Utilidades ─────────────────────────────────────────────────
function truncate(str, n) {
    if (!str) return '';
    return str.length > n ? str.slice(0, n) + '…' : str;
}

function showToast(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast - ${type} `;
    toast.textContent = msg;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 400); }, 4000);
}
function changeSort(column) {
    if (state.sortParams.column === column) {
        state.sortParams.direction = state.sortParams.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.sortParams.column = column;
        state.sortParams.direction = 'asc';
    }
    // Re-renderizar diferencias
    if (state.resultado) {
        renderTabDiferencias(state.resultado.onlyBank, state.resultado.onlyHelisa);
    }
}
