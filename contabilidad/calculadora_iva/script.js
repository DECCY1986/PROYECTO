/**
 * IVA Calculator Logic
 * Handles real-time calculations for Formulario 300 (DIAN)
 */

/**
 * Handles the Excel file selection event for Sales
 */
function importSalesFromExcelByFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("El archivo Excel está vacío o no tiene el formato correcto.");
                return;
            }

            processExcelSales(jsonData);
        } catch (err) {
            console.error("Error al procesar Excel:", err);
            alert("Error al procesar el archivo Excel.");
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Handles the Excel file selection event for Purchases
 */
function importPurchasesFromExcelByFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet);

            if (jsonData.length === 0) {
                alert("El archivo Excel está vacío o no tiene el formato correcto.");
                return;
            }

            processExcelPurchases(jsonData);
        } catch (err) {
            console.error("Error al procesar Excel:", err);
            alert("Error al procesar el archivo Excel.");
        }
        event.target.value = '';
    };
    reader.readAsArrayBuffer(file);
}

/**
 * Common helper to find column values
 */
function getColumnValue(row, patterns) {
    const key = Object.keys(row).find(k => 
        patterns.some(p => k.toLowerCase().trim().includes(p.toLowerCase()))
    );
    return key ? row[key] : null;
}

/**
 * Maps Excel data to the Sales table
 */
function processExcelSales(data) {
    const salesTable = document.querySelector('#sales-table tbody');
    let importedCount = 0;

    data.forEach(row => {
        // --- Specific mapping based on user image: FACTURA | Nombre Receptor | BASE ---
        const factura = getColumnValue(row, ['factura', 'nro_fac', 'consecutivo', 'num']);
        const receptor = getColumnValue(row, ['nombre receptor', 'receptor', 'cliente', 'tercero', 'nombre']);
        const baseRaw = getColumnValue(row, ['base', 'monto', 'subtotal', 'valor_neto', 'valor']);
        
        // Construct detailed concept
        let concept = 'Venta Importada';
        if (factura && receptor) concept = `FAC: ${factura} - ${receptor}`;
        else if (factura) concept = `FAC: ${factura}`;
        else if (receptor) concept = receptor;
        else concept = getColumnValue(row, ['descripcion', 'detalle']) || 'Venta Importada';

        const ivaRaw = getColumnValue(row, ['iva', 'impuesto', 'vlr_iva']) || 0;
        const typeRaw = getColumnValue(row, ['tipo', 'tarifa', 'clase']) || '';

        const base = Math.abs(parseFloat(String(baseRaw).replace(/[^0-9.-]+/g, "")) || 0);
        const iva = Math.abs(parseFloat(String(ivaRaw).replace(/[^0-9.-]+/g, "")) || 0);

        if (base === 0 && iva === 0) return;

        addRow('sales-table');
        const newRow = salesTable.lastElementChild;
        const typeSelect = newRow.querySelector('.type-select');
        
        newRow.querySelector('td:nth-child(1) input').value = concept;
        newRow.querySelector('.base-input').value = base;

        // Guess type
        const typeStr = String(typeRaw).toLowerCase();
        if (typeStr.includes('aiu')) {
            typeSelect.value = 'aiu';
        } else if (iva === 0 && base > 0 && !typeStr) {
            // If we have base but NO IVA and NO type, assume General (19%) as it's the most common case for taxable sales
            // The user can always change it to "No Gravada" if needed
            typeSelect.value = 'general';
        } else if (iva === 0 && base > 0) {
            typeSelect.value = 'no-gravada';
        } else {
            typeSelect.value = 'general';
        }
        
        toggleType(typeSelect);
        calculateRow(newRow.querySelector('.base-input'));
        importedCount++;
    });

    if (importedCount > 0) {
        updateMasterSummary();
        saveData();
        alert(`¡Éxito! Se importaron ${importedCount} ventas con la estructura personalizada.`);
    }
}

/**
 * Maps Excel data to the Purchases table
 */
function processExcelPurchases(data) {
    const purchaseTable = document.querySelector('#purchases-table tbody');
    let importedCount = 0;

    data.forEach(row => {
        const concept = getColumnValue(row, ['concepto', 'descripcion', 'detalle', 'proveedor', 'nombre', 'beneficiario']) || 'Compra Importada';
        const ivaRaw = getColumnValue(row, ['iva', 'impuesto', 'vlr_iva', 'riva']) || 0;
        const baseRaw = getColumnValue(row, ['base', 'subtotal', 'neto', 'monto']) || 0;
        const rateRaw = getColumnValue(row, ['tarifa', 'porcentaje', 'pct', '%']) || '';

        const iva = Math.abs(parseFloat(String(ivaRaw).replace(/[^0-9.-]+/g, "")) || 0);
        const base = Math.abs(parseFloat(String(baseRaw).replace(/[^0-9.-]+/g, "")) || 0);
        
        if (iva === 0 && base === 0) return;

        let rate = 'bienes-19';
        const rateStr = String(rateRaw).toLowerCase();
        if (rateStr.includes('5')) rate = 'bienes-5';
        else if (rateStr.includes('19')) rate = 'bienes-19';
        else if (iva > 0 && base > 0) {
            const calcRate = iva / base;
            if (calcRate > 0.15) rate = 'bienes-19';
            else if (calcRate > 0.03) rate = 'bienes-5';
        }

        addRow('purchases-table');
        const newRow = purchaseTable.lastElementChild;
        newRow.querySelector('td:nth-child(1) input').value = concept;
        
        const ivaInput = newRow.querySelector('.iva-input');
        if (iva > 0) {
            ivaInput.value = iva;
        } else if (base > 0) {
            const r = rate.includes('19') ? 0.19 : 0.05;
            ivaInput.value = Math.round(base * r);
        }

        newRow.querySelector('.type-select').value = rate;
        calculateRow(ivaInput);
        importedCount++;
    });

    if (importedCount > 0) {
        updateMasterSummary();
        saveData();
        alert(`¡Éxito! Se importaron ${importedCount} compras.`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // Basic navigation active state handling
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });

    // Initialize the tool and load saved data
    loadData();
    updateMasterSummary();
});

/**
 * Imports invoices from the CxC database (dim_cxcxp_v1) into the Sales section
 */
function syncFromCxC() {
    if(!confirm("¿Deseas importar las facturas por cobrar desde el módulo CxC? Esto agregará las facturas a la tabla inferior.")) return;

    try {
        const cxcData = JSON.parse(localStorage.getItem('dim_cxcxp_v1') || '{"cobrar":[]}');
        if(!cxcData.cobrar || cxcData.cobrar.length === 0) {
            alert("No hay facturas por cobrar en el módulo de CxC.");
            return;
        }

        let imported = 0;
        const salesTable = document.querySelector('#sales-table tbody');

        cxcData.cobrar.forEach(doc => {
            const docInfo = doc.details || {};
            const isAiu = ((docInfo.peA||0) + (docInfo.peI||0) + (docInfo.peU||0)) > 0;
            const subtotal = docInfo.subtotal || doc.valor_total;
            const iva = docInfo.iva || 0;
            const reteiva = docInfo.reteiva || 0;
            
            // Avoid duplicates by checking if it already exists basically? No, just append for now, users can delete
            const concepto = doc.contraparte + " -- FAC: " + (doc.factura || "S/N");

            addRow('sales-table');
            const row = salesTable.lastElementChild;
            const typeSelect = row.querySelector('.type-select');
            
            row.querySelector('td:nth-child(1) input').value = concepto;
            row.querySelector('.base-input').value = subtotal;

            if (isAiu) {
                typeSelect.value = 'aiu';
                toggleType(typeSelect);
                if(row.querySelector('.a-input')) {
                    row.querySelector('.a-input').value = docInfo.peA || 5;
                    row.querySelector('.i-input').value = docInfo.peI || 5;
                    row.querySelector('.u-input').value = docInfo.peU || 5;
                }
            } else {
                typeSelect.value = iva > 0 ? 'general' : 'no-gravada';
                toggleType(typeSelect);
            }

            if(reteiva > 0) {
                const riInput = document.getElementById('reteiva-input');
                riInput.value = (parseFloat(riInput.value) || 0) + reteiva;
            }

            // Let calculate row do its thing for the UI
            calculateRow(row.querySelector('.base-input'));
            imported++;
        });

        updateMasterSummary();
        saveData();
        alert(`¡Completado! Se importaron ${imported} facturas desde CxC.`);
    } catch(err) {
        console.error("Error sincronizando CxC:", err);
        alert("Ocurrió un error al importar desde CxC.");
    }
}

/**
 * Adds a new row to the specified table
 */
function addRow(tableId) {
    const table = document.getElementById(tableId).getElementsByTagName('tbody')[0];
    const newRow = table.insertRow();

    if (tableId === 'sales-table') {
        newRow.innerHTML = `
            <td><input type="text" placeholder="Ej. Venta..."></td>
            <td>
                <select class="type-select" onchange="toggleType(this)">
                    <option value="general" selected>General (19%)</option>
                    <option value="aiu">Operación AIU (IVA 19%)</option>
                    <option value="no-gravada">No Gravada / Exenta</option>
                    <option value="dev-general">Devolución Tarifa General</option>
                    <option value="dev-aiu">Devolución AIU</option>
                </select>
            </td>
            <td><input type="number" step="0.01" class="base-input" oninput="calculateRow(this)" placeholder="0.00"></td>
            <td>
                <div class="aiu-container" style="display: none;">
                    <div><label>A%</label><input type="number" class="a-input" value="5" oninput="calculateRow(this)"></div>
                    <div><label>I%</label><input type="number" class="i-input" value="5" oninput="calculateRow(this)"></div>
                    <div><label>U%</label><input type="number" class="u-input" value="5" oninput="calculateRow(this)"></div>
                </div>
                <input type="number" step="1" class="aiu-input" oninput="calculateRow(this)" value="10" disabled hidden>
            </td>
            <td class="iva-cell">$ 0.00</td>
            <td><button class="row-delete" onclick="removeRow(this)"><i class="ph ph-trash"></i></button></td>
        `;
        // Ensure state is correct for new row
        toggleType(newRow.querySelector('.type-select'));
    } else {
        newRow.innerHTML = `
            <td><input type="text" placeholder="Ej. Insumos..."></td>
            <td><input type="number" step="0.01" class="iva-input" oninput="calculateRow(this)" placeholder="0.00"></td>
            <td>
                <select class="type-select" onchange="calculateRow(this)">
                    <option value="bienes-5">Bienes Gravados (5%)</option>
                    <option value="bienes-19" selected>Bienes Gravados (19%)</option>
                    <option value="servicios-5">Servicios Gravados (5%)</option>
                    <option value="servicios-19">Servicios Gravados (19%)</option>
                    <option value="excluidos">Excluidos / Exentos / No Gravados</option>
                    <option value="iva-recuperado-19">IVA Recuperado (Dev. Compras 19%)</option>
                    <option value="iva-recuperado-5">IVA Recuperado (Dev. Compras 5%)</option>
                </select>
            </td>
            <td class="base-cell">$ 0.00</td>
            <td><button class="row-delete" onclick="removeRow(this)"><i class="ph ph-trash"></i></button></td>
        `;
    }
    updateMasterSummary();
}

/**
 * Handles field enabling/disabling based on operation type
 */
function toggleType(select) {
    const row = select.closest('tr');
    const aiuInput = row.querySelector('.aiu-input');
    const aiuContainer = row.querySelector('.aiu-container');
    const type = select.value;

    // Sync data attribute and classes for CSS targeting
    row.setAttribute('data-type', type);
    row.classList.remove('row-aiu', 'row-general', 'row-dev');

    if (type === 'aiu' || type === 'dev-aiu') {
        row.classList.add('row-aiu');
        if (aiuInput) { aiuInput.hidden = true; aiuInput.disabled = true; }
        if (aiuContainer) aiuContainer.style.display = 'grid';
    } else {
        if (type === 'general') row.classList.add('row-general');
        if (type.startsWith('dev')) row.classList.add('row-dev');

        if (aiuInput) { aiuInput.hidden = true; aiuInput.disabled = true; }
        if (aiuContainer) aiuContainer.style.display = 'none';
    }
    calculateRow(select);
}

/**
 * Removes a row from the table
 */
function removeRow(btn) {
    const row = btn.parentNode.parentNode;
    row.parentNode.removeChild(row);
    updateMasterSummary();
}

/**
 * Calculates the IVA for a single row
 */
function calculateRow(element) {
    const row = element.closest('tr');
    const tableId = row.closest('table').id;

    if (tableId === 'sales-table') {
        const base = parseFloat(row.querySelector('.base-input').value) || 0;
        const typeSelect = row.querySelector('.type-select');
        const type = typeSelect ? typeSelect.value : 'general';
        let iva = 0;

        if (type === 'general') {
            iva = base * 0.19;
        } else if (type === 'aiu' || type === 'dev-aiu') {
            const uPercent = parseFloat(row.querySelector('.u-input').value) || 0;
            iva = base * (uPercent / 100) * 0.19;
        } else if (type === 'dev-general') {
            iva = base * 0.19;
        } else {
            iva = 0;
        }
        row.querySelector('.iva-cell').textContent = formatCurrency(Math.round(iva));
    } else {
        // Reverse Logic for Purchases: IVA -> Base
        const ivaValue = parseFloat(row.querySelector('.iva-input').value) || 0;
        const typeSelect = row.querySelector('.type-select');
        const type = typeSelect ? typeSelect.value : 'bienes-19';
        let base = 0;

        if (type === 'bienes-5' || type === 'servicios-5') base = ivaValue / 0.05;
        else if (type === 'bienes-19' || type === 'servicios-19') base = ivaValue / 0.19;
        else if (type === 'iva-recuperado-19') base = ivaValue / 0.19;
        else if (type === 'iva-recuperado-5') base = ivaValue / 0.05;
        else base = 0;
        row.querySelector('.base-cell').textContent = formatCurrency(Math.round(base));
    }

    updateMasterSummary();
}

/**
 * Calculates totals for the entire application
 */
function updateMasterSummary() {
    // 1. Ingresos
    let incGravado = 0;
    let incAIU = 0;
    let incNoGravado = 0;
    let incDevGeneral = 0;
    let incDevAIU = 0;

    // 2. Impuesto Generado
    let genTarifa5 = 0;
    let genTarifa19 = 0;
    let genAIU = 0;
    let genRecuperado = 0;

    // 3. Impuesto Descontable (Bases y Valores)
    let base50Goods5 = 0;
    let base51Goods19 = 0;
    let base52Serv5 = 0;
    let base53Serv19 = 0;
    let base54Exempt = 0;
    let base56DevPurchases = 0;

    let descBienes5Raw = 0;
    let descBienes19Raw = 0;
    let descServicios5Raw = 0;
    let descServicios19Raw = 0;
    let descDevolucionVentas = 0;

    // Process Sales
    document.querySelectorAll('#sales-table tbody tr').forEach(row => {
        const base = parseFloat(row.querySelector('.base-input').value) || 0;
        const typeSelect = row.querySelector('.type-select');
        if (!typeSelect) return;
        const type = typeSelect.value;
        const aPercent = parseFloat(row.querySelector('.a-input')?.value) || 0;
        const iPercent = parseFloat(row.querySelector('.i-input')?.value) || 0;
        const uPercent = parseFloat(row.querySelector('.u-input')?.value) || 0;

        let rowIVA = 0;
        if (type === 'general') {
            rowIVA = (base * 0.19);
            incGravado += base;
            genTarifa19 += rowIVA;
        } else if (type === 'aiu') {
            const valUtility = (base * (uPercent / 100));
            const valExcluido = (base + (base * (aPercent / 100)) + (base * (iPercent / 100)));
            rowIVA = (valUtility * 0.19);
            incAIU += valUtility;
            incNoGravado += valExcluido;
            genAIU += rowIVA;
        } else if (type === 'no-gravada') {
            incNoGravado += base;
        } else if (type === 'dev-general') {
            incDevGeneral += base;
            rowIVA = (base * 0.19);
            descDevolucionVentas += rowIVA;
        } else if (type === 'dev-aiu') {
            const valTotalDev = (base * (1 + (aPercent + iPercent + uPercent) / 100));
            const valUtilityDev = (base * (uPercent / 100));
            rowIVA = (valUtilityDev * 0.19);
            incDevAIU += valTotalDev;
            descDevolucionVentas += rowIVA;
        }
        row.querySelector('.iva-cell').textContent = formatCurrency(rowIVA);
    });

    // Process Purchases (IVA input -> Base calculation)
    document.querySelectorAll('#purchases-table tbody tr').forEach(row => {
        const ivaInput = row.querySelector('.iva-input');
        if (!ivaInput) return;
        const ivaVal = parseFloat(ivaInput.value) || 0;

        const typeSelect = row.querySelector('.type-select');
        if (!typeSelect) return;
        const type = typeSelect.value;

        let rowBase = 0;
        let rowIVA = ivaVal;

        if (type === 'bienes-5') {
            rowBase = (ivaVal / 0.05);
            base50Goods5 += rowBase;
            descBienes5Raw += rowIVA;
        } else if (type === 'bienes-19') {
            rowBase = (ivaVal / 0.19);
            base51Goods19 += rowBase;
            descBienes19Raw += rowIVA;
        } else if (type === 'servicios-5') {
            rowBase = (ivaVal / 0.05);
            base52Serv5 += rowBase;
            descServicios5Raw += rowIVA;
        } else if (type === 'servicios-19') {
            rowBase = (ivaVal / 0.19);
            base53Serv19 += rowBase;
            descServicios19Raw += rowIVA;
        } else if (type === 'excluidos') {
            // For excluded, user can enter "base" into the iva-input as a workaround 
            // since there's no IVA to back-calculate from.
            rowBase = ivaVal;
            base54Exempt += rowBase;
            rowIVA = 0;
        } else if (type === 'iva-recuperado-19') {
            rowBase = (ivaVal / 0.19);
            base56DevPurchases += rowBase;
            genRecuperado += rowIVA;
        } else if (type === 'iva-recuperado-5') {
            rowBase = (ivaVal / 0.05);
            base56DevPurchases += rowBase;
            genRecuperado += rowIVA;
        }

        row.querySelector('.base-cell').textContent = formatCurrency(rowBase);
    });

    // 4. PRORRATEO
    const ingresosGravados = incGravado + incAIU;
    const totalIngresosParaProrrateo = ingresosGravados + incNoGravado;
    const prorationFactor = totalIngresosParaProrrateo > 0 ? ingresosGravados / totalIngresosParaProrrateo : 1;

    // Apply proration individually (as per user Excel)
    const desc71Prorated = Math.round(descBienes5Raw * prorationFactor);
    const desc72Prorated = Math.round(descBienes19Raw * prorationFactor);
    const desc74Prorated = Math.round(descServicios5Raw * prorationFactor);
    const desc75Prorated = Math.round(descServicios19Raw * prorationFactor);

    // Total gross purchases (Row 55)
    const base55Total = base50Goods5 + base51Goods19 + base52Serv5 + base53Serv19 + base54Exempt;

    // Final Calculations for Official Rows
    const incBrutos = incGravado + incAIU + incNoGravado;
    const totalDevoluciones = incDevGeneral + incDevAIU;
    const incNetos = incBrutos - totalDevoluciones;

    const totalGenerado = genTarifa5 + genTarifa19 + genAIU + genRecuperado;
    const totalDescontable = desc71Prorated + desc72Prorated + desc74Prorated + desc75Prorated + descDevolucionVentas;

    // Update UI - Official Rows (Income)
    document.getElementById('gen-28-val').textContent = formatCurrency(incGravado);
    document.getElementById('gen-29-val').textContent = formatCurrency(incAIU);
    document.getElementById('gen-40-val').textContent = formatCurrency(incNoGravado);
    document.getElementById('inc-bruto').textContent = formatCurrency(incBrutos);
    document.getElementById('inc-dev-total').textContent = formatCurrency(totalDevoluciones);
    document.getElementById('inc-neto').textContent = formatCurrency(incNetos);

    // Update UI - Prorate Indicator
    const prorateLabel = document.getElementById('prorate-factor');
    if (prorateLabel) {
        prorateLabel.textContent = (prorationFactor * 100).toFixed(2) + '%';
    }

    // Update UI - Generado
    document.getElementById('gen-58-val').textContent = formatCurrency(genTarifa5);
    document.getElementById('gen-59-val').textContent = formatCurrency(genTarifa19);
    document.getElementById('gen-60-val').textContent = formatCurrency(genAIU);
    document.getElementById('gen-66-val').textContent = formatCurrency(genRecuperado);
    document.getElementById('total-generated').textContent = formatCurrency(totalGenerado);

    // Update UI - Compras (Bases)
    document.getElementById('base-50-val').textContent = formatCurrency(base50Goods5);
    document.getElementById('base-51-val').textContent = formatCurrency(base51Goods19);
    document.getElementById('base-52-val').textContent = formatCurrency(base52Serv5);
    document.getElementById('base-53-val').textContent = formatCurrency(base53Serv19);
    document.getElementById('base-54-val').textContent = formatCurrency(base54Exempt);
    document.getElementById('base-55-val').textContent = formatCurrency(base55Total);
    document.getElementById('base-56-val').textContent = formatCurrency(base56DevPurchases);

    // Update UI - Descontable (Prorated)
    document.getElementById('desc-71-val').textContent = formatCurrency(desc71Prorated);
    document.getElementById('desc-72-val').textContent = formatCurrency(desc72Prorated);
    document.getElementById('desc-74-val').textContent = formatCurrency(desc74Prorated);
    document.getElementById('desc-75-val').textContent = formatCurrency(desc75Prorated);
    document.getElementById('desc-dev-v').textContent = formatCurrency(descDevolucionVentas);
    document.getElementById('total-deductible').textContent = formatCurrency(totalDescontable);

    // Final Balance
    const reteIVA = parseFloat(document.getElementById('reteiva-input').value) || 0;
    const netBalance = totalGenerado - totalDescontable;
    const balanceEl = document.getElementById('net-balance');
    const labelEl = document.getElementById('label-balance');

    if (netBalance >= 0) {
        labelEl.textContent = "Saldo a Pagar:";
        balanceEl.textContent = formatCurrency(netBalance);
        balanceEl.className = 'val negative';
    } else {
        labelEl.textContent = "Saldo a Favor:";
        balanceEl.textContent = formatCurrency(Math.abs(netBalance));
        balanceEl.className = 'val positive';
    }

    const finalToPay = Math.max(0, netBalance - reteIVA);
    document.getElementById('final-to-pay').textContent = formatCurrency(finalToPay);

    showToast();
}

/**
 * Helper to format numbers as currency
 */
function formatCurrency(amount) {
    return '$ ' + amount.toLocaleString('es-CO', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

/**
 * Simple toast feedback
 */
let toastTimeout;
function showToast() {
    const toast = document.getElementById('toast');
    toast.style.opacity = '1';

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
    }, 1500);
}

/**
 * Persistence: Save data to LocalStorage
 */
function saveData() {
    const data = {
        sales: [],
        purchases: [],
        reteiva: document.getElementById('reteiva-input').value
    };

    // Serialize Sales
    document.querySelectorAll('#sales-table tbody tr').forEach(row => {
        data.sales.push({
            concept: row.querySelector('td:nth-child(1) input').value,
            type: row.querySelector('.type-select').value,
            base: row.querySelector('.base-input').value,
            a: row.querySelector('.a-input')?.value || 5,
            i: row.querySelector('.i-input')?.value || 5,
            u: row.querySelector('.u-input')?.value || 5
        });
    });

    // Serialize Purchases (Save IVA instead of Base)
    document.querySelectorAll('#purchases-table tbody tr').forEach(row => {
        data.purchases.push({
            concept: row.querySelector('td:nth-child(1) input').value,
            iva: row.querySelector('.iva-input').value,
            type: row.querySelector('.type-select').value
        });
    });

    // --- Prefijo Dinámico por Empresa ---
    const getPrefix = () => {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('carpinteria')) return 'carp_';
        if (path.includes('publicidad')) return 'pub_';
        return '';
    };
    const PREFIX = getPrefix();
    const storage = {
        get: (key) => localStorage.getItem(PREFIX + key),
        set: (key, val) => localStorage.setItem(PREFIX + key, val),
        remove: (key) => localStorage.removeItem(PREFIX + key)
    };

    storage.set('iva_calculator_data', JSON.stringify(data));
    alert('¡Progreso guardado correctamente en este navegador!');
}

/**
 * Persistence: Load data from LocalStorage
 */
function loadData() {
    // --- Prefijo Dinámico por Empresa ---
    const getPrefix = () => {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('carpinteria')) return 'carp_';
        if (path.includes('publicidad')) return 'pub_';
        return '';
    };
    const PREFIX = getPrefix();
    const storageValue = localStorage.getItem(PREFIX + 'iva_calculator_data');
    if (!storageValue) return;

    try {
        const data = JSON.parse(storageValue);

        // Restore ReteIVA
        document.getElementById('reteiva-input').value = data.reteiva || '';

        // Restore Sales
        const salesTable = document.querySelector('#sales-table tbody');
        salesTable.innerHTML = '';
        data.sales.forEach(s => {
            addRow('sales-table');
            const row = salesTable.lastElementChild;
            row.querySelector('td:nth-child(1) input').value = s.concept;
            row.querySelector('.type-select').value = s.type;
            row.querySelector('.base-input').value = s.base;

            // Set AIU if they exist
            if (row.querySelector('.a-input')) {
                row.querySelector('.a-input').value = s.a;
                row.querySelector('.i-input').value = s.i;
                row.querySelector('.u-input').value = s.u;
            }
            toggleType(row.querySelector('.type-select'));
        });

        // Restore Purchases
        const purchaseTable = document.querySelector('#purchases-table tbody');
        purchaseTable.innerHTML = '';
        data.purchases.forEach(p => {
            addRow('purchases-table');
            const row = purchaseTable.lastElementChild;
            row.querySelector('td:nth-child(1) input').value = p.concept;
            row.querySelector('.iva-input').value = p.iva || '';
            row.querySelector('.type-select').value = p.type;
        });

        updateMasterSummary();
    } catch (e) {
        console.error("Error al cargar datos guardados", e);
    }
}

/**
 * Persistence: Clear all data
 */
function clearData() {
    if (confirm('¿Estás seguro de que deseas borrar todos los datos? Esta acción no se puede deshacer.')) {
        localStorage.removeItem('iva_calculator_data');
        location.reload();
    }
}

/**
 * Triggers the print dialog for exporting the summary
 */
function exportSummary() {
    window.print();
}

/**
 * 📊 EXPORT TO EXCEL
 * Generates a multi-sheet Excel file with Summary, Sales, and Purchases
 */
function exportToExcel() {
    try {
        const wb = XLSX.utils.book_new();

        // --- 1. SUMMARY SHEET ---
        const summaryData = [
            ["DECLARACIÓN DE IVA - RESUMEN FORMULARIO 300"],
            ["Empresa:", "Janus ERP"],
            ["Fecha de Exportación:", new Date().toLocaleDateString()],
            [""],
            ["Sección", "Renglón / Concepto", "Valor"],
        ];

        // Helper to get text/value from summary
        const getSumVal = (id) => document.getElementById(id)?.textContent || "$ 0";

        summaryData.push(["INGRESOS", "(28) Gravados Tarifa General", getSumVal('gen-28-val')]);
        summaryData.push(["", "(29) AIU (Base Especial)", getSumVal('gen-29-val')]);
        summaryData.push(["", "(40) Operaciones No Gravadas", getSumVal('gen-40-val')]);
        summaryData.push(["", "(41) Total Ingresos Brutos", getSumVal('inc-bruto')]);
        summaryData.push(["", "(42) Devoluciones en Ventas", getSumVal('inc-dev-total')]);
        summaryData.push(["", "(43) Total Ingresos Netos", getSumVal('inc-neto')]);
        summaryData.push([""]);

        summaryData.push(["COMPRAS (BASES)", "(50) Bienes Gravados 5%", getSumVal('base-50-val')]);
        summaryData.push(["", "(51) Bienes Gravados 19%", getSumVal('base-51-val')]);
        summaryData.push(["", "(52) Servicios Gravados 5%", getSumVal('base-52-val')]);
        summaryData.push(["", "(53) Servicios Gravados 19%", getSumVal('base-53-val')]);
        summaryData.push(["", "(54) Bienes y Serv. Excluidos", getSumVal('base-54-val')]);
        summaryData.push(["", "(55) Total Compras Brutas", getSumVal('base-55-val')]);
        summaryData.push(["", "(56) Dev. en Compras (Base)", getSumVal('base-56-val')]);
        summaryData.push([""]);

        summaryData.push(["IMPUESTO GENERADO", "(58) A la tarifa 5%", getSumVal('gen-58-val')]);
        summaryData.push(["", "(59) A la tarifa general", getSumVal('gen-59-val')]);
        summaryData.push(["", "(60) Sobre A.I.U", getSumVal('gen-60-val')]);
        summaryData.push(["", "(66) IVA Recup. en Devolución", getSumVal('gen-66-val')]);
        summaryData.push(["", "Total Generado", getSumVal('total-generated')]);
        summaryData.push([""]);

        summaryData.push(["IMPUESTO DESCONTABLE", "Factor Prorrateo", getSumVal('prorate-factor')]);
        summaryData.push(["", "(71) Bienes Gravados 5%", getSumVal('desc-71-val')]);
        summaryData.push(["", "(72) Bienes Gravados 19%", getSumVal('desc-72-val')]);
        summaryData.push(["", "(74) Servicios Gravados 5%", getSumVal('desc-74-val')]);
        summaryData.push(["", "(75) Servicios Gravados 19%", getSumVal('desc-75-val')]);
        summaryData.push(["", "Devoluciones Ventas", getSumVal('desc-dev-v')]);
        summaryData.push(["", "(77) Total IVA Descontable", getSumVal('total-deductible')]);
        summaryData.push([""]);

        summaryData.push(["TOTALES", "Saldo del Periodo", getSumVal('net-balance')]);
        summaryData.push(["", "Retenciones de IVA", "$" + (document.getElementById('reteiva-input')?.value || "0")]);
        summaryData.push(["", "TOTAL A PAGAR", getSumVal('final-to-pay')]);

        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen F300");

        // --- 2. SALES DETAILS ---
        const salesData = [["Concepto", "Tipo Operación", "Base Gravable", "AIU % (A/I/U)", "IVA Generado"]];
        document.querySelectorAll('#sales-table tbody tr').forEach(row => {
            const concept = row.querySelector('td:nth-child(1) input').value;
            const type = row.querySelector('.type-select').value;
            const base = row.querySelector('.base-input').value;
            const iva = row.querySelector('.iva-cell').textContent;
            
            let aiuStr = "N/A";
            if (type.includes('aiu')) {
                const a = row.querySelector('.a-input')?.value || 0;
                const i = row.querySelector('.i-input')?.value || 0;
                const u = row.querySelector('.u-input')?.value || 0;
                aiuStr = `${a}/${i}/${u}`;
            }

            salesData.push([concept, type, base, aiuStr, iva]);
        });
        const wsSales = XLSX.utils.aoa_to_sheet(salesData);
        XLSX.utils.book_append_sheet(wb, wsSales, "Detalle Ventas");

        // --- 3. PURCHASES DETAILS ---
        const purchasesData = [["Concepto", "IVA Pagado", "Tarifa Seleccionada", "Base Calculada"]];
        document.querySelectorAll('#purchases-table tbody tr').forEach(row => {
            const concept = row.querySelector('td:nth-child(1) input').value;
            const ivaInput = row.querySelector('.iva-input').value;
            const type = row.querySelector('.type-select').value;
            const baseCell = row.querySelector('.base-cell').textContent;

            purchasesData.push([concept, ivaInput, type, baseCell]);
        });
        const wsPurchases = XLSX.utils.aoa_to_sheet(purchasesData);
        XLSX.utils.book_append_sheet(wb, wsPurchases, "Detalle Compras");

        // Save file
        const fileName = `Declaracion_IVA_${new Date().toISOString().split('T')[0]}.xlsx`;
        XLSX.writeFile(wb, fileName);

        alert("¡Excel generado con éxito!");
    } catch (err) {
        console.error("Error al exportar a Excel:", err);
        alert("Ocurrió un error al generar el archivo Excel.");
    }
}
