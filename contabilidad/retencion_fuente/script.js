document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Configuración y Estado ---
    const BASE_STORAGE_KEY = 'reten_fuente_v2_';
    
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

    const parseCur = s => {
        if (typeof s === 'number') return s;
        if (!s) return 0;
        // Si ya tiene formato de punto decimal y no tiene comas de miles (formato estándar JS string)
        if (typeof s === 'string' && s.includes('.') && !s.includes(',')) {
            const n = parseFloat(s);
            if (!isNaN(n)) return n;
        }
        const str = String(s || '0').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
        return parseFloat(str) || 0;
    };

    const getStorageKey = () => `${BASE_STORAGE_KEY}DATA_${yearSelect.value}_${monthSelect.value}`;
    const CONFIG_KEY = `${BASE_STORAGE_KEY}CONFIG`;
    const PROVIDERS_KEY = `${BASE_STORAGE_KEY}PROVIDERS`;

    let config = {
        uvt: 52374 // UVT 2026 según tabla
    };

    const CONCEPTS = [
        { id: 'rentas_trabajo', name: 'SALARIOS Y RENTAS DE TRABAJO', ratePN: 0, ratePJ: 0, minUvt: 95, isService: true },
        { id: 'honorarios_pj', name: 'HONORARIOS Y COMISIONES (PJ / DECLARANTES)', ratePN: 0.11, ratePJ: 0.11, minUvt: 0, isService: true },
        { id: 'honorarios_pn', name: 'HONORARIOS Y COMISIONES (PN NO DECLARANTES)', ratePN: 0.10, ratePJ: 0.10, minUvt: 0, isService: true },
        { id: 'servicios_decl', name: 'SERVICIOS GENERALES (DECLARANTES)', ratePN: 0.04, ratePJ: 0.04, minUvt: 2, isService: true },
        { id: 'servicios_no_decl', name: 'SERVICIOS GENERALES (NO DECLARANTES)', ratePN: 0.06, ratePJ: 0.06, minUvt: 2, isService: true },
        { id: 'compras_decl', name: 'COMPRAS GENERALES (DECLARANTES)', ratePN: 0.025, ratePJ: 0.025, minUvt: 10 },
        { id: 'compras_no_decl', name: 'COMPRAS GENERALES (NO DECLARANTES)', ratePN: 0.035, ratePJ: 0.035, minUvt: 10 },
        { id: 'arrendamientos_muebles', name: 'ARRENDAMIENTO BIENES MUEBLES', ratePN: 0.04, ratePJ: 0.04, minUvt: 0, isService: true },
        { id: 'arrendamientos_inmuebles', name: 'ARRENDAMIENTO BIENES INMUEBLES', ratePN: 0.035, ratePJ: 0.035, minUvt: 10, isService: true },
        { id: 'transporte_carga', name: 'SERVICIOS TRANSPORTE CARGA (1%)', ratePN: 0.01, ratePJ: 0.01, minUvt: 2, isService: true },
        { id: 'transporte_pasajeros', name: 'TRANSPORTE PASAJEROS / OTROS (3.5%)', ratePN: 0.035, ratePJ: 0.035, minUvt: 10, isService: true },
        { id: 'hoteles_rest', name: 'HOTELES Y RESTAURANTES', ratePN: 0.035, ratePJ: 0.035, minUvt: 2, isService: true },
        { id: 'rendimientos', name: 'RENDIMIENTOS FINANCIEROS', ratePN: 0.07, ratePJ: 0.07, minUvt: 0 },
        { id: 'contratos_const', name: 'CONTRATOS DE CONSTRUCCION', ratePN: 0.02, ratePJ: 0.02, minUvt: 10, isService: true },
        { id: 'autoretenciones', name: 'AUTORETENCIONES (0.55%)', ratePN: 0.0055, ratePJ: 0.0055, minUvt: 0 },
        { id: 'combustibles', name: 'COMPRA DE COMBUSTIBLES (0.1%)', ratePN: 0.001, ratePJ: 0.001, minUvt: 0 },
        { id: 'reteiva_compras', name: 'RETE IVA COMPRAS (15%)', ratePN: 0.15, ratePJ: 0.15, minUvt: 0, isIVA: true },
        { id: 'reteiva_servicios', name: 'RETE IVA SERVICIOS (15%)', ratePN: 0.15, ratePJ: 0.15, minUvt: 0, isIVA: true, isService: true }
    ];

    let invoices = []; // Array de facturas registradas
    let tempImportData = []; // Datos temporales para la previsualización de importación
    let providerRegistry = {}; // Diccionario: nombre -> { conceptId, personType, isO13, isO15, isArt383 }

    // --- 2. Referencias DOM ---
    const gridBody = document.getElementById('liquidationBody');
    const historyBody = document.getElementById('historyBody');
    const importPreviewBody = document.getElementById('importPreviewBody');

    const modalImportPreview = document.getElementById('modalImportPreview');
    const confirmBulkImportBtn = document.getElementById('confirmBulkImport');

    const totalRetenerEl = document.getElementById('totalRetener');
    const totalBaseEl = document.getElementById('totalBase');
    const invoiceCountEl = document.getElementById('invoiceCount');
    const excessRetentionInput = document.getElementById('excessRetentionInput');
    const monthSelect = document.getElementById('monthSelect');
    const yearSelect = document.getElementById('yearSelect');

    // Inicializar selectores de periodo con la fecha actual
    const now = new Date();
    monthSelect.value = now.getMonth();
    yearSelect.value = now.getFullYear();


    const invoiceModal = document.getElementById('modalInvoice');
    const historyModal = document.getElementById('modalHistory');
    const configModal = document.getElementById('modalConfig');

    const invoiceForm = document.getElementById('invoiceForm');
    const invDescInput = document.getElementById('invDesc');
    const invConceptsContainer = document.getElementById('invConceptsContainer');
    const invBaseInput = document.getElementById('invBase');
    const invPersonTypeSelect = document.getElementById('invPersonType');
    const invO13Check = document.getElementById('invO13');
    const invO15Check = document.getElementById('invO15');
    const invArt383Check = document.getElementById('invArt383');
    const providerList = document.getElementById('providerList');

    const modalProviders = document.getElementById('modalProviders');
    const providersRegistryBody = document.getElementById('providersRegistryBody');
    const manageProvidersBtn = document.getElementById('manageProvidersBtn');

    const editingIndexInput = document.getElementById('editingIndex');
    const modalTitle = document.querySelector('#modalInvoice h2');

    // --- 3. Lógica de Negocio ---

    const loadData = () => {
        // Cargar configuración global
        const globalRaw = storage.get(CONFIG_KEY);
        // Cargar configuración y proveedores
        const conf = storage.get(CONFIG_KEY);
        if (conf) config = JSON.parse(conf);
        document.getElementById('uvtValue').value = config.uvt; // Ensure UVT is updated

        const prov = storage.get(PROVIDERS_KEY);
        if (prov) providerRegistry = JSON.parse(prov);

        // Actualizar datalist de proveedores
        updateProviderDatalist();

        // Cargar datos del periodo seleccionado
        const currentKey = getStorageKey();
        const saved = storage.get(currentKey);

        if (saved) {
            const data = JSON.parse(saved);
            invoices = data.invoices || [];
            excessRetentionInput.value = data.excessRetention || 0;
        } else {
            invoices = [];
            excessRetentionInput.value = 0;
        }
        initConceptDropdown();
        render();
    };

    const saveData = () => {
        const currentKey = getStorageKey();
        storage.set(currentKey, JSON.stringify({
            invoices,
            excessRetention: parseFloat(excessRetentionInput.value) || 0
        }));
    };

    const saveConfig = () => {
        storage.set(CONFIG_KEY, JSON.stringify(config));
    };

    const saveProviders = () => {
        storage.set(PROVIDERS_KEY, JSON.stringify(providerRegistry));
    };

    const updateProviderRegistry = (item) => {
        // Extraer nombre limpio (si viene con "Factura XXX - Nombre")
        let name = item.desc;
        if (name.includes(' - ')) {
            name = name.split(' - ').slice(1).join(' - ').trim();
        }

        if (!name) return;

        providerRegistry[name] = {
            conceptIds: item.conceptIds && item.conceptIds.length > 0 ? item.conceptIds : (item.conceptId ? [item.conceptId] : []),
            personType: item.personType,
            isO13: item.isO13 || false,
            isO15: item.isO15 || false,
            isArt383: item.isArt383 || false
        };
        saveData();
        updateProviderDatalist();
    };

    const updateProviderDatalist = () => {
        const names = Object.keys(providerRegistry).sort();
        providerList.innerHTML = names.map(n => `<option value="${n}">`).join('');
    };

    const handleProviderSelection = (name) => {
        const p = providerRegistry[name];
        if (p) {
            // Uncheck all first
            Array.from(invConceptsContainer.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false);
            // Check the ones in the registry
            if (p.conceptIds && p.conceptIds.length > 0) {
                p.conceptIds.forEach(cid => {
                    const cb = document.getElementById(`concept_${cid}`);
                    if (cb) cb.checked = true;
                });
            } else if (p.conceptId) {
                const cb = document.getElementById(`concept_${p.conceptId}`);
                if (cb) cb.checked = true;
            }

            invPersonTypeSelect.value = p.personType;
            invO13Check.checked = p.isO13;
            invO15Check.checked = p.isO15;
            invArt383Check.checked = p.isArt383;
        }
    };

    const renderProvidersRegistry = () => {
        providersRegistryBody.innerHTML = '';
        const sortedNames = Object.keys(providerRegistry).sort();

        if (sortedNames.length === 0) {
            providersRegistryBody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">No hay proveedores registrados aún.</td></tr>';
            return;
        }

        sortedNames.forEach(name => {
            const p = providerRegistry[name];
            // Backward compatibility
            const ids = p.conceptIds || (p.conceptId ? [p.conceptId] : []);
            const conceptNames = ids.map(id => CONCEPTS.find(c => c.id === id)?.name || id).join(', ');
            
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="font-weight: 500;">${name}</td>
                <td style="font-size: 0.85rem;">${conceptNames}</td>
                <td style="text-align: center;">
                    <div style="display: flex; gap: 4px; justify-content: center;">
                        ${p.isO13 ? '<span class="badge pn" title="Gran Contribuyente">O-13</span>' : ''}
                        ${p.isO15 ? '<span class="badge pn" title="Autoretenedor">O-15</span>' : ''}
                        ${p.isArt383 ? '<span class="badge pj" title="Art 383">383</span>' : ''}
                    </div>
                </td>
                <td style="text-align: right;">
                    <button class="icon-btn delete-btn" onclick="window.deleteProviderRegistry('${name}')">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            providersRegistryBody.appendChild(tr);
        });
    };

    window.deleteProviderRegistry = (name) => {
        if (confirm(`¿Eliminar a ${name} del registro maestro?`)) {
            delete providerRegistry[name];
            saveData();
            renderProvidersRegistry();
            updateProviderDatalist();
        }
    };

    const initConceptDropdown = () => {
        invConceptsContainer.innerHTML = CONCEPTS.map(c => `
            <label style="display: flex; align-items: center; gap: 8px; font-size: 0.85rem; cursor: pointer;">
                <input type="checkbox" value="${c.id}" id="concept_${c.id}" style="width: 16px; height: 16px;">
                ${c.name}
            </label>
        `).join('');
    };

    const calculateItem = (inv, concept) => {
        // 1. Exenciones por Responsabilidad DIAN
        if (inv.isO13 || inv.isO15) return 0; // Gran Contribuyente o Autoretenedor

        // 2. Art 383 ET (Exención en servicios)
        if (inv.isArt383 && concept.isService) return 0;

        // 3. Tope Mínimo (Aplica a Fuente y Reteiva)
        const minBase = concept.minUvt * config.uvt;
        if (!concept.isManual && inv.base < minBase) return 0;

        // 4. Reteiva
        if (concept.isIVA) {
            const ivaBase = inv.iva !== null && inv.iva !== undefined ? inv.iva : (inv.base * 0.19);
            return Math.round(ivaBase * 0.15);
        }

        if (concept.isManual) return Math.round(inv.base);

        const rate = (inv.personType === 'PN') ? concept.ratePN : concept.ratePJ;
        return Math.round(inv.base * rate);
    };

    const render = () => {
        gridBody.innerHTML = '';

        const aggregates = {};
        CONCEPTS.forEach(c => aggregates[c.id] = { basePN: 0, basePJ: 0, retPN: 0, retPJ: 0, total: 0 });

        invoices.forEach(inv => {
            // Backward compatibility: si existe conceptId pero no conceptIds, lo convertimos a array
            const invoiceConcepts = inv.conceptIds && inv.conceptIds.length > 0 ? inv.conceptIds : (inv.conceptId ? [inv.conceptId] : []);
            
            invoiceConcepts.forEach(cId => {
                const concept = CONCEPTS.find(c => c.id === cId);
                if (!concept) return;

                const ret = calculateItem(inv, concept);

                // Si la retención es 0 y no es concepto manual,
                // no lo sumamos a los agregados de la tabla resumen.
                if (ret === 0 && !concept.isManual) return;

                // Para Reteiva, la "base" que importa visualmente es el IVA
                const effectiveBase = concept.isIVA ? (inv.iva !== null && inv.iva !== undefined ? inv.iva : inv.base * 0.19) : inv.base;

                if (inv.personType === 'PN') {
                    aggregates[cId].basePN += effectiveBase;
                    aggregates[cId].retPN += ret;
                } else {
                    aggregates[cId].basePJ += effectiveBase;
                    aggregates[cId].retPJ += ret;
                }

                aggregates[cId].total += ret;
            });
        });

        CONCEPTS.forEach(c => {
            const agg = aggregates[c.id];
            const tr = document.createElement('tr');
            tr.style.cursor = 'pointer';
            tr.title = `Click para ver facturas de ${c.name}`;
            tr.onclick = () => {
                window.viewHistoryByConcept(c.id);
            };
            tr.innerHTML = `
                <td class="concept-cell" style="font-weight: 600; color: var(--primary);">${c.name}</td>
                <td class="num-cell pn-cell">$ ${agg.basePN.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                <td class="num-cell pj-cell">$ ${agg.basePJ.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                <td class="num-cell retencion-cell">$ ${agg.total.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                <td class="num-cell pn-cell">${agg.retPN > 0 ? '$ ' + agg.retPN.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '-'}</td>
                <td class="num-cell pj-cell">${agg.retPJ > 0 ? '$ ' + agg.retPJ.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '-'}</td>
            `;
            gridBody.appendChild(tr);
        });

        const totalRet = Object.values(aggregates).reduce((sum, a) => sum + a.total, 0);
        const totalBase = Object.values(aggregates).reduce((sum, a) => sum + a.basePN + a.basePJ, 0);
        const excess = parseFloat(excessRetentionInput.value) || 0;

        totalRetenerEl.textContent = `$ ${(totalRet - excess).toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
        totalBaseEl.textContent = `$ ${totalBase.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
        invoiceCountEl.textContent = invoices.length;

        renderHistory();
    };

    const renderHistory = (filterConceptId = null) => {
        historyBody.innerHTML = '';

        const filteredInvoices = filterConceptId
            ? invoices.filter(inv => {
                const ids = inv.conceptIds && inv.conceptIds.length > 0 ? inv.conceptIds : (inv.conceptId ? [inv.conceptId] : []);
                return ids.includes(filterConceptId);
            })
            : invoices;

        if (filteredInvoices.length === 0) {
            historyBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">
                ${filterConceptId ? 'No hay facturas con este concepto.' : 'No hay facturas registradas.'}
            </td></tr>`;
            return;
        }

        filteredInvoices.forEach((inv, originalIdx) => {
            // Buscamos el índice real en el array 'invoices'
            const realIdx = invoices.indexOf(inv);
            const ids = inv.conceptIds && inv.conceptIds.length > 0 ? inv.conceptIds : (inv.conceptId ? [inv.conceptId] : []);
            const conceptNames = ids.map(id => CONCEPTS.find(c => c.id === id)?.name || id).join('<br> • ');
            
            // Total retention for this invoice (summing up all concepts)
            let totalRetForInvoice = 0;
            ids.forEach(cId => {
                const concept = CONCEPTS.find(c => c.id === cId);
                if (concept) totalRetForInvoice += calculateItem(inv, concept);
            });

            // For base display, we will just show the general base unless it's only IVA.
            const baseToShow = (ids.length === 1 && CONCEPTS.find(c => c.id === ids[0])?.isIVA) ? (inv.iva !== null && inv.iva !== undefined ? inv.iva : inv.base * 0.19) : inv.base;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${inv.desc}</td>
                <td class="concept-edit-cell" style="cursor: pointer;" onclick="window.startInlineEdit(event, ${realIdx})">
                    <div style="color: var(--primary); text-decoration: underline dotted;">${conceptNames || 'Otro'}</div>
                    <div style="font-size: 0.65rem; display: flex; gap: 4px; margin-top: 4px;">
                        ${inv.isO13 ? '<span style="color: #60a5fa;">O-13</span>' : ''}
                        ${inv.isO15 ? '<span style="color: #60a5fa;">O-15</span>' : ''}
                        ${inv.isArt383 ? '<span style="color: #f472b6;">Art 383</span>' : ''}
                    </div>
                </td>
                <td><span style="font-size: 0.7rem; background: rgba(255,255,255,0.05); padding: 2px 6px; border-radius: 4px;">${inv.personType}</span></td>
                <td class="num-cell">$ ${baseToShow.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                <td class="num-cell" style="font-weight: 600; color: var(--primary);">$ ${totalRetForInvoice.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="icon-btn edit-btn" style="display:inline-flex; font-size: 1rem; color: var(--primary);" onclick="window.editInvoice(${realIdx})">
                        <i class="ph ph-pencil"></i>
                    </button>
                    <button class="delete-btn" style="display:inline-flex;" onclick="window.deleteInvoice(${realIdx})">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            historyBody.appendChild(tr);
        });
    };

    window.viewHistoryByConcept = (conceptId) => {
        renderHistory(conceptId);
        const concept = CONCEPTS.find(c => c.id === conceptId);
        document.querySelector('#modalHistory h2').textContent = `Facturas: ${concept.name}`;
        historyModal.classList.add('active');
    };

    window.startInlineEdit = (event, index) => {
        // En multi-concepto es mejor abrir el modal completo para editar para evitar un UI de checkboxes inline muy complejo.
        window.editInvoice(index);
    };

    window.editInvoice = (index) => {
        const inv = invoices[index];
        document.getElementById('invDesc').value = inv.desc;
        
        // Uncheck all and check the ones assigned
        Array.from(invConceptsContainer.querySelectorAll('input[type="checkbox"]')).forEach(cb => cb.checked = false);
        const ids = inv.conceptIds && inv.conceptIds.length > 0 ? inv.conceptIds : (inv.conceptId ? [inv.conceptId] : []);
        ids.forEach(cid => {
            const cb = document.getElementById(`concept_${cid}`);
            if (cb) cb.checked = true;
        });
        document.getElementById('invBase').value = inv.base;
        document.getElementById('invPersonType').value = inv.personType;
        document.getElementById('invO13').checked = inv.isO13 || false;
        document.getElementById('invO15').checked = inv.isO15 || false;
        document.getElementById('invArt383').checked = inv.isArt383 || false;
        editingIndexInput.value = index;

        modalTitle.textContent = "Editar Factura";
        historyModal.classList.remove('active');
        invoiceModal.classList.add('active');
    };

    // --- 4. Eventos ---

    document.getElementById('importExcelBtn').onclick = () => document.getElementById('excelFile').click();

    document.getElementById('excelFile').onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onerror = () => alert('Error al leer el archivo. Verifique que no esté abierto en otro programa.');
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                
                let allData = [];
                // Intentar en todas las hojas hasta encontrar algo
                for (const sheetName of workbook.SheetNames) {
                    const worksheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(worksheet);
                    if (jsonData && jsonData.length > 0) {
                        // Encontramos una hoja con datos
                        allData = jsonData;
                        break;
                    }
                }

                if (allData.length === 0) {
                    throw new Error('No se encontró ninguna hoja con datos válidos en el archivo.');
                }

                processExcelInvoices(allData);
            } catch (err) {
                alert(`Error al procesar el archivo: ${err.message}`);
            }
            e.target.value = ''; // Reset input
        };
        reader.readAsArrayBuffer(file);
    };

    const processExcelInvoices = (data) => {
        if (data.length === 0) {
            alert('El archivo está vacío.');
            return;
        }

        const keys = Object.keys(data[0]);
        tempImportData = [];

        const cleanNumber = (val) => parseCur(val);

        data.forEach((row) => {
            const normalizedRow = {};
            Object.keys(row).forEach(k => {
                normalizedRow[k.toLowerCase().trim()] = row[k];
            });

            const desc = String(normalizedRow['nombre emisor'] || normalizedRow['nombre'] || normalizedRow['tercero'] || normalizedRow['descripcion'] || normalizedRow['detalle'] || normalizedRow['proveedor'] || row[keys[0]] || 'Factura Importada');
            const nit = String(normalizedRow['nit emisor'] || normalizedRow['nit'] || normalizedRow['identificacion'] || normalizedRow['cedula'] || '');
            const fullDesc = nit.trim() ? `${nit} - ${desc}` : desc;

            // Búsqueda exhaustiva de la base gravable
            let rawBase = normalizedRow['base'] || normalizedRow['subtotal'] || normalizedRow['valor total'] || normalizedRow['total'] || normalizedRow['valor'] || normalizedRow['monto'] || normalizedRow['vr. neto'] || normalizedRow['bruto'] || normalizedRow['valor bruto'] || normalizedRow['vr. base'];
            
            if (rawBase === undefined) {
                // Si no hay encabezado obvio, buscamos el primer valor numérico significativo
                for (let k in normalizedRow) {
                    const val = normalizedRow[k];
                    const numVal = cleanNumber(val);
                    if (typeof val !== 'boolean' && !isNaN(numVal) && numVal > 1000) { // Umbral de 1000 para evitar IDs o fechas cortas
                        rawBase = val;
                        break;
                    }
                }
            }

            const base = cleanNumber(rawBase);
            const conceptText = (normalizedRow['concepto'] || normalizedRow['tipo'] || normalizedRow['tipo de documento'] || normalizedRow['clase'] || '').toString().toLowerCase();

            const personText = (normalizedRow['persona'] || normalizedRow['regimen'] || normalizedRow['tipo persona'] || normalizedRow['naturaleza'] || '').toString().toUpperCase();
            const personType = personText.includes('NATURAL') || personText === 'PN' ? 'PN' : 'PJ';

            // Detección de IVA
            let iva = normalizedRow['iva'] || normalizedRow['valor iva'] || normalizedRow['impuesto'] || normalizedRow['impuestos'] || normalizedRow['iva facturado'];
            iva = iva !== undefined ? cleanNumber(iva) : null;

            if (!isNaN(base) && base > 0) {
                let conceptId = 'compras';
                let isO13 = false;
                let isO15 = false;
                let isArt383 = false;

                // Try to auto-fill from provider registry
                const providerName = fullDesc.includes(' - ') ? fullDesc.split(' - ').slice(1).join(' - ').trim() : fullDesc;
                if (providerRegistry[providerName]) {
                    const p = providerRegistry[providerName];
                    conceptId = p.conceptId;
                    isO13 = p.isO13;
                    isO15 = p.isO15;
                    isArt383 = p.isArt383;
                } else {
                    // Fallback to concept text if not in registry
                    const found = CONCEPTS.find(c => conceptText.includes(c.id) || conceptText.includes(c.name.toLowerCase()));
                    if (found) conceptId = found.id;
                }


                tempImportData.push({
                    id: Date.now() + Math.random(),
                    desc: fullDesc.toString(),
                    conceptId,
                    base,
                    iva,
                    personType,
                    isO13,
                    isO15,
                    isArt383
                });
            }
        });

        if (tempImportData.length > 0) {
            renderImportPreview();
            modalImportPreview.classList.add('active');
        } else {
            alert(`No se encontraron facturas con valores válidos.\n\nColumnas detectadas: ${keys.join(', ')}`);
        }
    };

    const renderImportPreview = () => {
        importPreviewBody.innerHTML = tempImportData.map((item, idx) => {
            const providerName = item.desc.includes(' - ') ? item.desc.split(' - ').slice(1).join(' - ').trim() : item.desc;
            return `
            <tr data-provider="${providerName}" data-idx="${idx}">
                <td>
                    <div style="font-weight: 500;">${item.desc.split(' - ')[1] || item.desc}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted);">${item.desc.split(' - ')[0] || ''}</div>
                </td>
                <td class="num-cell">
                    <div>$ ${Math.round(item.base).toLocaleString()}</div>
                    ${item.iva ? `<div style="font-size: 0.7rem; color: var(--primary);">IVA: $ ${Math.round(item.iva).toLocaleString()}</div>` : ''}
                </td>
                <td>
                    <select class="preview-concept" data-idx="${idx}" style="padding: 4px; border-radius: 4px; background: rgba(0,0,0,0.2); color:white; width: 100%; border: 1px solid rgba(255,255,255,0.1);">
                        ${CONCEPTS.map(c => `<option value="${c.id}" ${c.id === item.conceptId ? 'selected' : ''}>${c.name}</option>`).join('')}
                    </select>
                    <div style="display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; font-size: 0.8rem;">
                        <label><input type="checkbox" class="isO13" ${item.isO13 ? 'checked' : ''}> O-13</label>
                        <label><input type="checkbox" class="isO15" ${item.isO15 ? 'checked' : ''}> O-15</label>
                        <label><input type="checkbox" class="isArt383" ${item.isArt383 ? 'checked' : ''}> Art 383</label>
                    </div>
                </td>
                <td style="text-align: center;">
                    <input type="checkbox" checked class="preview-include" data-idx="${idx}" style="width: 18px; height: 18px;">
                </td>
            </tr>
        `;
        }).join('');

        // Attach listeners for Bulk Sync
        importPreviewBody.querySelectorAll('tr').forEach(tr => {
            const provider = tr.dataset.provider;

            // Concept change
            tr.querySelector('.preview-concept').onchange = (e) => {
                const newConcept = e.target.value;
                syncImportPreviewRows(provider, { conceptId: newConcept });
            };

            // Flags changes
            ['isO13', 'isO15', 'isArt383'].forEach(flag => {
                tr.querySelector('.' + flag).onchange = (e) => {
                    const settings = {};
                    settings[flag] = e.target.checked;
                    syncImportPreviewRows(provider, settings);
                };
            });
        });
    };

    const syncImportPreviewRows = (providerName, settings) => {
        // Actualizar datos temporales
        tempImportData.forEach(item => {
            const currentName = item.desc.includes(' - ') ? item.desc.split(' - ').slice(1).join(' - ').trim() : item.desc;
            if (currentName === providerName) {
                Object.assign(item, settings);
            }
        });

        // Actualizar UI sin re-renderizar todo para no perder el foco o scroll si fuera el caso
        // Pero como son selects/checkboxes, la forma más fácil y limpia es actualizar los elementos del DOM directamente
        importPreviewBody.querySelectorAll(`tr[data-provider="${providerName}"]`).forEach(tr => {
            if (settings.conceptId !== undefined) tr.querySelector('.preview-concept').value = settings.conceptId;
            if (settings.isO13 !== undefined) tr.querySelector('.isO13').checked = settings.isO13;
            if (settings.isO15 !== undefined) tr.querySelector('.isO15').checked = settings.isO15;
            if (settings.isArt383 !== undefined) tr.querySelector('.isArt383').checked = settings.isArt383;
        });
    };

    confirmBulkImportBtn.onclick = () => {
        const rows = importPreviewBody.querySelectorAll('tr');
        let added = 0;

        rows.forEach(tr => {
            const include = tr.querySelector('.preview-include').checked;
            const idx = tr.querySelector('.preview-include').dataset.idx;
            const conceptId = tr.querySelector('.preview-concept').value;

            if (include) {
                const item = tempImportData[idx];
                const finalItem = {
                    ...item,
                    conceptId: conceptId,
                    isO13: tr.querySelector('.isO13')?.checked || false,
                    isO15: tr.querySelector('.isO15')?.checked || false,
                    isArt383: tr.querySelector('.isArt383')?.checked || false
                };
                invoices.push(finalItem);
                updateProviderRegistry(finalItem);
                added++;
            }
        });

        if (added > 0) {
            saveData();
            render();
            alert(`Se importaron ${added} facturas correctamente.`);
            modalImportPreview.classList.remove('active');
        }
    };

    document.getElementById('openInvoiceModal').onclick = () => {
        invoiceForm.reset();
        document.getElementById('editingIndex').value = -1;
        document.querySelector('#modalInvoice h2').textContent = "Registrar Nueva Factura";
        invoiceModal.classList.add('active');
    };

    invDescInput.oninput = (e) => {
        const val = e.target.value;
        // Si el valor coincide exactamente con un proveedor conocido (ej: al seleccionar del datalist)
        if (providerRegistry[val]) {
            handleProviderSelection(val);
        } else if (val.includes(' - ')) {
            // Caso: "Factura 123 - Nombre Proveedor"
            const name = val.split(' - ').slice(1).join(' - ').trim();
            if (providerRegistry[name]) {
                handleProviderSelection(name);
            }
        }
    };

    document.getElementById('viewHistoryBtn').onclick = () => {
        document.querySelector('#modalHistory h2').textContent = "Historial de Facturas (Este Mes)";
        renderHistory();
        historyModal.classList.add('active');
    };
    document.getElementById('configBtn').onclick = () => configModal.classList.add('active');
    manageProvidersBtn.onclick = () => {
        renderProvidersRegistry();
        modalProviders.classList.add('active');
    };

    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.onclick = () => {
            invoiceModal.classList.remove('active');
            historyModal.classList.remove('active');
            configModal.classList.remove('active');
            modalImportPreview.classList.remove('active');
            modalProviders.classList.remove('active');
        };
    });

    invoiceForm.onsubmit = (e) => {
        e.preventDefault();
        const index = parseInt(document.getElementById('editingIndex').value);
        
        // Get all selected concepts
        const selectedConceptCheckboxes = Array.from(invConceptsContainer.querySelectorAll('input[type="checkbox"]:checked'));
        if (selectedConceptCheckboxes.length === 0) {
            alert('Por favor selecciona al menos un concepto fiscal.');
            return;
        }
        const conceptIds = selectedConceptCheckboxes.map(cb => cb.value);

        const inv = {
            id: index === -1 ? Date.now() : invoices[index].id,
            desc: document.getElementById('invDesc').value,
            conceptIds: conceptIds,
            base: parseCur(document.getElementById('invBase').value),
            personType: document.getElementById('invPersonType').value,
            isO13: document.getElementById('invO13').checked,
            isO15: document.getElementById('invO15').checked,
            isArt383: document.getElementById('invArt383').checked,
            iva: (index !== -1 && invoices[index].base === parseCur(document.getElementById('invBase').value)) ? invoices[index].iva : null
        };

        if (index === -1) {
            invoices.push(inv);
        } else {
            invoices[index] = inv;
        }

        // Aprender del proveedor para el registro maestro
        updateProviderRegistry(inv);

        saveData();
        render();

        invoiceForm.reset();
        invoiceModal.classList.remove('active');
    };

    document.getElementById('saveConfig').onclick = () => {
        config.uvt = parseInt(document.getElementById('uvtValue').value);
        saveData();
        render();
        configModal.classList.remove('active');
    };

    document.getElementById('clearBtn').onclick = () => {
        if (confirm('¿Seguro que deseas reiniciar la liquidación del mes? Se borrarán todas las facturas.')) {
            invoices = [];
            excessRetentionInput.value = 0;
            saveData();
            render();
        }
    };

    excessRetentionInput.oninput = () => {
        saveData();
        render();
    };

    // Formato de moneda en tiempo real
    invBaseInput.addEventListener('input', function() {
        let clean = this.value.replace(/\./g, '');
        clean = clean.replace(/[^0-9,]/g, '');
        const parts = clean.split(',');
        let integerPart = parts[0];
        if (integerPart) {
            integerPart = parseInt(integerPart, 10).toLocaleString('es-CO');
        }
        if (parts.length > 1) {
            this.value = (integerPart || '0') + ',' + parts[1].slice(0, 2);
        } else {
            this.value = integerPart;
        }
    });

    const exportToPdf = () => {
        if (invoices.length === 0) {
            alert('No hay facturas para exportar.');
            return;
        }

        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const now = new Date();
        const periodStr = `${months[monthSelect.value]} ${yearSelect.value}`;
        const timestamp = now.toLocaleString();

        // Recalculamos agregados para el reporte
        const reportAggregates = {};
        CONCEPTS.forEach(c => reportAggregates[c.id] = { basePN: 0, basePJ: 0, retPN: 0, retPJ: 0, total: 0 });

        invoices.forEach(inv => {
            const concept = CONCEPTS.find(c => c.id === inv.conceptId);
            if (!concept) return;

            const ret = calculateItem(inv, concept);

            // Si la retención es 0 y no es concepto manual, no lo incluimos en el reporte
            if (ret === 0 && !concept.isManual) return;

            // Para Reteiva, la "base" que importa visualmente es el IVA
            const effectiveBase = concept.isIVA ? (inv.iva !== null && inv.iva !== undefined ? inv.iva : inv.base * 0.19) : inv.base;

            if (inv.personType === 'PN') {
                reportAggregates[inv.conceptId].basePN += effectiveBase;
                reportAggregates[inv.conceptId].retPN += ret;
            } else {
                reportAggregates[inv.conceptId].basePJ += effectiveBase;
                reportAggregates[inv.conceptId].retPJ += ret;
            }
            reportAggregates[inv.conceptId].total += ret;
        });

        const totalRet = Object.values(reportAggregates).reduce((sum, a) => sum + a.total, 0);
        const excess = parseFloat(excessRetentionInput.value) || 0;
        const totalNeto = totalRet - excess;
        // Construcción del HTML para el reporte (Optimizado para evitar espacios arriba)
        let reportHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    * { box-sizing: border-box; }
                    html, body { 
                        margin: 0; 
                        padding: 0; 
                        width: 730px; /* Ancho estandar estricto */
                        background: #fff;
                    }
                    .pdf-table { table-layout: fixed; width: 100%; border-collapse: collapse; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
                    .pdf-table th, .pdf-table td { word-wrap: break-word; overflow-wrap: break-word; }
                </style>
            </head>
            <body>
            <div style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 20px 30px; width: 730px;">
                <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <h1 style="margin: 0; color: #0f172a; font-size: 24px; letter-spacing: -0.5px; line-height: 1.2;">Reporte de Liquidación Mensual</h1>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 13px;">Generado automáticamente por RetenControl</p>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 18px; font-weight: 700; color: #3b82f6; line-height: 1;">${periodStr.toUpperCase()}</span>
                        <span style="font-size: 11px; color: #94a3b8;">${timestamp}</span>
                    </div>
                </div>

                <div style="margin-bottom: 40px;">
                    <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
                        1. Resumen por Conceptos
                    </h3>
                    <table class="pdf-table">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: left; font-size: 12px; color: #64748b; width: 50%;">CONCEPTO</th>
                                <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #64748b; width: 25%;">BASE TOTAL</th>
                                <th style="padding: 12px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; color: #64748b; width: 25%;">RETENCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        CONCEPTS.forEach(c => {
            const agg = reportAggregates[c.id];
            if (agg.total > 0 || agg.basePN > 0 || agg.basePJ > 0) {
                reportHtml += `
                    <tr>
                        <td style="padding: 10px; border: 1px solid #e2e8f0; font-size: 12px; font-weight: 600;">${c.name}</td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px;">$ ${(agg.basePN + agg.basePJ).toLocaleString()}</td>
                        <td style="padding: 10px; border: 1px solid #e2e8f0; text-align: right; font-size: 12px; font-weight: 700; color: #0f172a;">$ ${agg.total.toLocaleString()}</td>
                    </tr>
                `;
            }
        });

        reportHtml += `
                        </tbody>
                    </table>
                </div>

                <div style="display: flex; justify-content: flex-end; margin-bottom: 50px;">
                    <div style="width: 320px; background: #f1f5f9; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; font-size: 13px;">
                            <span style="color: #64748b;">Subtotal Retention:</span>
                            <span style="font-weight: 600;">$ ${totalRet.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; margin-bottom: 15px; font-size: 13px; color: #ef4444;">
                            <span>Ajustes (Exceso/Anuladas):</span>
                            <span style="font-weight: 600;">- $ ${excess.toLocaleString()}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding-top: 15px; border-top: 2px dashed #cbd5e1; color: #0f172a;">
                            <span style="font-weight: 800; font-size: 16px;">TOTAL NETO:</span>
                            <span style="font-weight: 800; font-size: 20px; color: #3b82f6;">$ ${totalNeto.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style="page-break-before: always; height: 1px;"></div> <!-- Asegura salto de página -->

                <div>
                    <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; color: #475569; margin-bottom: 15px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px;">
                        2. Anexo: Detalle de Movimientos
                    </h3>
                    <table class="pdf-table">
                        <thead>
                            <tr style="background: #f8fafc;">
                                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 10px; color: #64748b; width: 33%;">TERCERO / DESCRIPCIÓN</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: left; font-size: 10px; color: #64748b; width: 27%;">CONCEPTO</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #64748b; width: 10%;">TIPO</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 10px; color: #64748b; width: 15%;">BASE</th>
                                <th style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 10px; color: #64748b; width: 15%;">RETENCIÓN</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        invoices.forEach(inv => {
            const ids = inv.conceptIds && inv.conceptIds.length > 0 ? inv.conceptIds : (inv.conceptId ? [inv.conceptId] : []);
            
            ids.forEach(cId => {
                const concept = CONCEPTS.find(c => c.id === cId);
                if (!concept) return;
                
                const ret = calculateItem(inv, concept);

                // Solo incluimos facturas liquidadas o manuales
                if (ret === 0 && !concept.isManual) return;

                const effectiveBase = concept.isIVA ? (inv.iva !== null && inv.iva !== undefined ? inv.iva : inv.base * 0.19) : inv.base;

                // For multi-concept, showing the base as effective base is better per line
                reportHtml += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 11px;">${inv.desc}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; font-size: 10px; color: #475569;">${concept?.name || 'Otro'}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: center; font-size: 10px; color: #64748b;">${inv.personType}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 11px;">$ ${Math.round(effectiveBase).toLocaleString()}</td>
                            <td style="padding: 8px; border: 1px solid #e2e8f0; text-align: right; font-size: 11px; font-weight: 600;">$ ${ret.toLocaleString()}</td>
                        </tr>
                    `;
            });
        });

        reportHtml += `
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 10px; color: #94a3b8; text-align: center;">
                    Documento generado el ${timestamp}. Este reporte tiene carácter informativo y no sustituye los formularios oficiales de la DIAN.
                </div>
            </div>
            </body>
            </html>
        `;

        const opt = {
            margin: 0.3, // top, left, bottom, right en pulgadas
            filename: `Reporte_Retenciones_${periodStr.replace(' ', '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                letterRendering: true,
                windowWidth: 730
            },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '730px'; 
        iframe.style.height = '1200px';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        document.body.appendChild(iframe);

        const idoc = iframe.contentWindow.document;
        idoc.open();
        idoc.write(reportHtml);
        idoc.close();

        setTimeout(() => {
            html2pdf().set(opt).from(idoc.body).save().then(() => {
                document.body.removeChild(iframe);
            }).catch(err => {
                console.error('PDF Export Error:', err);
                document.body.removeChild(iframe);
            });
        }, 500); // Allow styles to apply

    };

    const exportToExcel = () => {
        if (invoices.length === 0) {
            alert('No hay facturas para exportar.');
            return;
        }

        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const periodStr = `${months[monthSelect.value]} ${yearSelect.value}`;

        const excelData = [];
        invoices.forEach(inv => {
            const ids = inv.conceptIds && inv.conceptIds.length > 0 ? inv.conceptIds : (inv.conceptId ? [inv.conceptId] : []);
            
            ids.forEach(cId => {
                const concept = CONCEPTS.find(c => c.id === cId);
                const ret = calculateItem(inv, concept);

                // Si la retención es 0 y no es concepto manual, también aplicamos un filtro opcional? 
                // En Excel normalmente se quiere ver todo, pero si es multi-concepto y da 0 por tope, igual lo pasamos
                const effectiveBase = concept && concept.isIVA ? (inv.iva !== null && inv.iva !== undefined ? inv.iva : inv.base * 0.19) : inv.base;

                excelData.push({
                    'Tercero / Descripción': inv.desc.split(' - ')[1] || inv.desc,
                    'Referencia (Factura)': inv.desc.split(' - ')[0] || '',
                    'Concepto': concept ? concept.name : cId,
                    'Tipo': inv.personType,
                    'O-13 (Gran Contribuyente)': inv.isO13 ? 'Sí' : 'No',
                    'O-15 (Autoretenedor)': inv.isO15 ? 'Sí' : 'No',
                    'Art. 383 (Servicios)': inv.isArt383 ? 'Sí' : 'No',
                    'Base/Valor Total': inv.base,
                    'IVA Efectivo': inv.iva || (concept && concept.isIVA ? Math.round(inv.base * 0.19) : 0),
                    'Base para Retención': Math.round(effectiveBase),
                    'Retención Aplicada': ret
                });
            });
        });

        const ws = XLSX.utils.json_to_sheet(excelData);

        // Ajustar anchos de columna para mejor visualización
        const wscols = [
            { wch: 30 }, // Tercero
            { wch: 15 }, // Factura
            { wch: 40 }, // Concepto
            { wch: 10 }, // Tipo
            { wch: 10 }, // O-13
            { wch: 10 }, // O-15
            { wch: 10 }, // 383
            { wch: 15 }, // Base Total
            { wch: 15 }, // IVA
            { wch: 15 }, // Base Retención
            { wch: 15 }  // Retención
        ];
        ws['!cols'] = wscols;

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Detalle Retenciones");
        XLSX.writeFile(wb, `Liquidacion_Retenciones_${periodStr.replace(' ', '_')}.xlsx`);
    };

    const headerPdfBtn = document.getElementById('exportPdfHeaderBtn');
    if (headerPdfBtn) headerPdfBtn.onclick = exportToPdf;

    const footerPdfBtn = document.getElementById('exportPdfBtn');
    if (footerPdfBtn) footerPdfBtn.onclick = exportToPdf;

    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) exportExcelBtn.onclick = exportToExcel;

    const printHeader = document.getElementById('printBtnHeader');
    if (printHeader) printHeader.onclick = () => window.print();

    const printFooter = document.getElementById('printBtnFooter');
    if (printFooter) printFooter.onclick = () => window.print();

    document.getElementById('saveBtn').onclick = () => {
        saveData();
        alert('Datos guardados exitosamente.');
    };

    // --- 5. Init ---
    monthSelect.onchange = loadData;
    yearSelect.onchange = loadData;

    loadData();
});
