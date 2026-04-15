// ═══════════════════════════════════════════
// CONFIGURACIÓN Y ESTADO
// ═══════════════════════════════════════════
const MESES = ["", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
let currentMun = 'soacha';
let state = { rows: [] };
let directory = {}; // Directorio de Proveedores Aprendidos

function updateDirectory(nit, nombre) {
    if (!nit || !nombre || nit.length < 5) return;
    directory[nit] = nombre;
    localStorage.setItem('dimalcco_provider_directory', JSON.stringify(directory));
    syncDatalist();
}

function syncDatalist() {
    const dl = document.getElementById('providers-list');
    if (!dl) {
        const newDl = document.createElement('datalist');
        newDl.id = 'providers-list';
        document.body.appendChild(newDl);
    }
    const dlEl = document.getElementById('providers-list');
    dlEl.innerHTML = Object.entries(directory).map(([nit, name]) => 
        `<option value="${nit}">${name}</option>`
    ).join('');
}

function autoFillName(nit, targetId) {
    if (directory[nit]) {
        const input = document.getElementById(targetId);
        if (input && !input.value) {
            input.value = directory[nit];
        }
    }
}

function getPeriodo(mun, mes) {
    if (mun === 'soacha') return mes;
    return Math.ceil(mes / 2);
}

function getStorageKey() {
    const anio = document.getElementById('enc_anio').value;
    const mes = parseInt(document.getElementById('enc_periodo').value);
    const per = getPeriodo(currentMun, mes);
    return `dimalcco_reteica_${currentMun}_${anio}_P${per}`;
}

// ═══════════════════════════════════════════
// INICIALIZACIÓN
// ═══════════════════════════════════════════
function initState() {
    // Cargar Directorio
    const savedDir = localStorage.getItem('dimalcco_provider_directory');
    if (savedDir) {
        try { directory = JSON.parse(savedDir); syncDatalist(); } catch(e){}
    }

    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.rows) { state = parsed; renderTable(); return; }
        } catch (e) { console.error("Error al cargar estado:", e); }
    }
    state = { rows: [] };
    renderTable();
}

function saveState() {
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
    const btn = document.querySelector('.save-btn:last-child');
    if (btn) {
        btn.textContent = '✅ Guardado';
        setTimeout(() => btn.textContent = '💾 Guardar', 2000);
    }
    // Sincronización con el portal
    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ type: 'sync_cloud', module: 'reteica', data: state, municipality: currentMun }, '*');
    }
}

// ═══════════════════════════════════════════
// UI & NAVEGACIÓN
// ═══════════════════════════════════════════
function switchMunicipality(mun, btn) {
    if (mun === 'param') return;
    currentMun = mun;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
    btn.classList.add('on');
    document.getElementById('table_title').textContent = `Registros - ${mun.charAt(0).toUpperCase() + mun.slice(1)}`;
    updateEnc();
}

function updateEnc() {
    const per = document.getElementById('enc_periodo').value;
    const anio = document.getElementById('enc_anio').value;
    const pLabel = currentMun === 'soacha' ? MESES[per] : `Bimestre ${Math.ceil(per/2)}`;
    document.getElementById('pLabel').textContent = `${pLabel} ${anio}`;
    initState();
}

function renderTable() {
    const tbody = document.getElementById('records_body');
    if (state.rows.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="empty-st">No hay registros para este periodo.</td></tr>';
        updateTotals();
        return;
    }

    tbody.innerHTML = state.rows.map((r, i) => `
        <tr>
            <td><input type="text" value="${r.nit}" oninput="updateRow(${i}, 'nit', this.value)"></td>
            <td><input type="text" value="${esc(r.nombre)}" oninput="updateRow(${i}, 'nombre', this.value)"></td>
            <td style="text-align:right"><input type="text" class="num" value="${r.base}" oninput="updateRow(${i}, 'base', this.value)" style="text-align:right"></td>
            <td style="text-align:center"><input type="number" step="0.01" value="${r.tarifa}" oninput="updateRow(${i}, 'tarifa', this.value)" style="text-align:center; width:60px"></td>
            <td style="text-align:right; font-weight:600; color:var(--white)" id="ret_${i}">$ ${fmt(r.ret)}</td>
            <td style="text-align:center">
                <button class="btn btn-red" onclick="removeRow(${i})" style="padding:4px 8px">✕</button>
            </td>
        </tr>
    `).join('');
    updateTotals();
}

function updateRow(idx, field, val) {
    state.rows[idx][field] = val;
    // Solo recalculamos pero no re-renderizamos para no perder el foco
    const r = state.rows[idx];
    const baseVal = parseNum(r.base);
    const tarifaVal = parseFloat(r.tarifa) || 0;
    r.ret = Math.round(baseVal * (tarifaVal / 1000));
    
    const retEl = document.getElementById(`ret_${idx}`);
    if (retEl) retEl.textContent = `$ ${fmt(r.ret)}`;
    updateTotals();
}

function addManualRow() {
    const nit = document.getElementById('add_nit').value;
    const nombre = document.getElementById('add_nombre').value;
    const base = document.getElementById('add_base').value;
    const tarifa = document.getElementById('add_tarifa').value;

    if (!base || (!nit && !nombre)) return;

    state.rows.push({
        nit,
        nombre,
        base,
        tarifa,
        ret: Math.round(parseNum(base) * (parseFloat(tarifa) / 1000))
    });

    updateDirectory(nit, nombre);
    renderTable();
    document.getElementById('add_nit').value = '';
    document.getElementById('add_nombre').value = '';
    document.getElementById('add_base').value = '';
}

function removeRow(i) {
    state.rows.splice(i, 1);
    renderTable();
}

function resetMonth() {
    if (confirm('¿Deseas limpiar todos los registros de este periodo?')) {
        state.rows = [];
        saveState();
        renderTable();
    }
}

function updateTotals() {
    const totalBase = state.rows.reduce((s, r) => s + parseNum(r.base), 0);
    const totalRet = state.rows.reduce((s, r) => s + (r.ret || 0), 0);
    document.getElementById('total_base').textContent = `$ ${fmt(totalBase)}`;
    document.getElementById('total_ret').textContent = `$ ${fmt(totalRet)}`;
}

// ═══════════════════════════════════════════
// IMPORTACIÓN EXCEL
// ═══════════════════════════════════════════
let tempData = [];
document.getElementById('excelFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        const data = new Uint8Array(evt.target.result);
        const wb = XLSX.read(data, { type: 'array' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json(sheet);
        processImport(json);
        e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
};

function processImport(data) {
    tempData = [];
    data.forEach(row => {
        // Normalizar nombres de columnas a minúsculas y sustituir caracteres especiales
        const norm = {};
        Object.keys(row).forEach(k => {
            let key = k.toLowerCase().trim()
                .replace(/[\/]/g, '_')   // NIT/CEDULA -> nit_cedula
                .replace(/\s+/g, '_');   // Espacios a underscores
            norm[key] = row[k];
        });
        
        // Mapeo exacto según imagen del usuario
        const nit = String(norm['nit_cedula'] || norm['nit'] || '');
        const nombre = String(norm['nombre_del'] || norm['proveedor'] || norm['tercero'] || '');
        const base = parseNum(norm['base'] || norm['base_gravable'] || 0);
        const retManual = parseNum(norm['creditos'] || norm['retencion'] || 0);
        let tarifa = parseFloat(String(norm['tarifa'] || '').replace('%','')) || 11.04;

        if (base > 0 && (nombre || nit)) {
            tempData.push({ nit, nombre, base, retManual, tarifa });
        }
    });

    if (tempData.length > 0) {
        renderImportPreview();
        document.getElementById('modalImportPreview').style.display = 'flex';
    } else {
        alert('No se detectaron datos válidos. Verifica que las columnas se llamen NIT/CEDULA, NOMBRE DEL y BASE.');
    }
}

function renderImportPreview() {
    const container = document.getElementById('importPreviewBody');
    container.innerHTML = tempData.map((r, i) => `
        <tr>
            <td><input type="text" value="${esc(r.nit)}" oninput="tempData[${i}].nit=this.value"></td>
            <td><input type="text" value="${esc(r.nombre)}" oninput="tempData[${i}].nombre=this.value"></td>
            <td class="val">Base: $ ${fmt(r.base)}<br><small style="color:var(--gold)">Ret: $ ${fmt(r.retManual)}</small></td>
            <td><input type="number" step="0.01" value="${r.tarifa}" oninput="tempData[${i}].tarifa=this.value" style="width:65px; text-align:center"> ‰</td>
            <td style="text-align:center"><input type="checkbox" checked id="chk_${i}"></td>
        </tr>
    `).join('');
}

function closeImport() { document.getElementById('modalImportPreview').style.display = 'none'; }

function initEventListeners() {
    const btnConfirm = document.getElementById('confirmBulkImport');
    if (!btnConfirm) return;

    btnConfirm.onclick = () => {
        try {
            if (!tempData || tempData.length === 0) {
                alert("No hay datos para importar.");
                return;
            }

            let added = 0;
            tempData.forEach((r, i) => {
                const chk = document.getElementById(`chk_${i}`);
                if (chk && chk.checked) {
                    // Garantizar valores numéricos
                    const baseNum = parseNum(r.base);
                    const tNum = parseFloat(r.tarifa) || 0;
                    const rNum = parseNum(r.retManual);
                    
                    let vRet = rNum > 0 ? rNum : Math.round(baseNum * (tNum / 1000));
                    
                    state.rows.push({
                        nit: r.nit || '0',
                        nombre: r.nombre || 'SIN NOMBRE',
                        base: baseNum,
                        tarifa: tNum,
                        ret: vRet
                    });
                    
                    if (r.nit && r.nombre) updateDirectory(r.nit, r.nombre);
                    added++;
                }
            });

            if (added > 0) {
                saveState();
                renderTable();
                closeImport();
                alert(`¡Éxito! Se importaron ${added} registros.`);
            } else {
                alert("No has seleccionado ningún registro para importar.");
            }
        } catch (err) {
            console.error("Error en importación:", err);
            alert("Ocurrió un error técnico al importar. Revisa la consola.");
        }
    };
}

// ═══════════════════════════════════════════
// EXPORTACIÓN
// ═══════════════════════════════════════════
function exportExcel() {
    if (!state.rows || state.rows.length === 0) {
        alert("No hay registros para exportar en este periodo.");
        return;
    }
    const anio = document.getElementById('enc_anio').value;
    const perList = document.getElementById('enc_periodo');
    const perText = perList.options[perList.selectedIndex].text;
    
    const wsData = [
        ["REPORTE RETEICA - " + currentMun.toUpperCase()],
        ["Año: " + anio, "Periodo: " + perText],
        [],
        ["NIT", "PROVEEDOR", "BASE GRAVABLE", "TARIFA (‰)", "RETENCIÓN"]
    ];
    
    let totalBase = 0;
    let totalRet = 0;
    
    state.rows.forEach(r => {
        const b = parseNum(r.base);
        const ret = r.ret || 0;
        totalBase += b;
        totalRet += ret;
        wsData.push([r.nit, r.nombre, b, r.tarifa, ret]);
    });
    
    wsData.push([]);
    wsData.push(["", "TOTALES", totalBase, "", totalRet]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ReteICA");
    XLSX.writeFile(wb, `ReteICA_${currentMun}_${anio}.xlsx`);
}

function exportPDF() {
    window.print();
}

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function parseNum(v) { return parseFloat(String(v).replace(/[^0-9.-]/g, '')) || 0; }
function fmt(n) { return Math.round(n).toLocaleString('es-CO'); }
function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// INIT
document.addEventListener('DOMContentLoaded', () => {
    initState();
    initEventListeners();
});
