document.addEventListener('DOMContentLoaded', () => {

    // ═══════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════
    const fmt = n => '$ ' + n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    const parseCur = s => {
        const str = String(s || '0').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
        return parseFloat(str) || 0;
    };
    const round1000 = n => Math.round(n / 1000) * 1000;
    
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

    // ═══════════════════════════════════════════
    // PERIODICITY DEFINITIONS
    // ═══════════════════════════════════════════
    const PERIOD_DEFS = {
        mensual: [
            { id: '1', label: 'Enero', months: [1] },
            { id: '2', label: 'Febrero', months: [2] },
            { id: '3', label: 'Marzo', months: [3] },
            { id: '4', label: 'Abril', months: [4] },
            { id: '5', label: 'Mayo', months: [5] },
            { id: '6', label: 'Junio', months: [6] },
            { id: '7', label: 'Julio', months: [7] },
            { id: '8', label: 'Agosto', months: [8] },
            { id: '9', label: 'Septiembre', months: [9] },
            { id: '10', label: 'Octubre', months: [10] },
            { id: '11', label: 'Noviembre', months: [11] },
            { id: '12', label: 'Diciembre', months: [12] }
        ],
        bimensual: [
            { id: '1', label: 'Ene - Feb', months: [1, 2] },
            { id: '2', label: 'Mar - Abr', months: [3, 4] },
            { id: '3', label: 'May - Jun', months: [5, 6] },
            { id: '4', label: 'Jul - Ago', months: [7, 8] },
            { id: '5', label: 'Sep - Oct', months: [9, 10] },
            { id: '6', label: 'Nov - Dic', months: [11, 12] }
        ],
        trimestral: [
            { id: '1', label: 'Ene - Mar', months: [1, 2, 3] },
            { id: '2', label: 'Abr - Jun', months: [4, 5, 6] },
            { id: '3', label: 'Jul - Sep', months: [7, 8, 9] },
            { id: '4', label: 'Oct - Dic', months: [10, 11, 12] }
        ],
        cuatrimestral: [
            { id: '1', label: 'Ene - Abr', months: [1, 2, 3, 4] },
            { id: '2', label: 'May - Ago', months: [5, 6, 7, 8] },
            { id: '3', label: 'Sep - Dic', months: [9, 10, 11, 12] }
        ],
        semestral: [
            { id: '1', label: 'Ene - Jun', months: [1, 2, 3, 4, 5, 6] },
            { id: '2', label: 'Jul - Dic', months: [7, 8, 9, 10, 11, 12] }
        ],
        anual: [
            { id: '1', label: 'Año Completo', months: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }
        ]
    };

    // ═══════════════════════════════════════════
    // STATE
    // ═══════════════════════════════════════════
    let year = '2026';
    let data = { cities: {} };
    // Each city: { periodicity, avisos, bomberil, act1: {nom, tar}, act2, act3, invoices: [...] }
    let activeCity = null;
    let activePeriod = '1';

    // ═══════════════════════════════════════════
    // DOM REFS
    // ═══════════════════════════════════════════
    const fileInput = document.getElementById('file-input');
    const yearSelect = document.getElementById('year-select');
    const cityNav = document.getElementById('city-nav');
    const emptyCitiesMsg = document.getElementById('empty-cities-msg');
    const emptyState = document.getElementById('empty-state');
    const cityView = document.getElementById('city-view');

    const cityTitle = document.getElementById('city-title');
    const citySubtitle = document.getElementById('city-subtitle');
    const periodicitySelect = document.getElementById('periodicity-select');
    
    // Surcharges
    const cityAvisos = document.getElementById('city-avisos');
    const cityBomberil = document.getElementById('city-bomberil');

    const cityAct1Nom = document.getElementById('city-act-1-nom');
    const cityAct1Tar = document.getElementById('city-act-1-tar');
    const cityAct2Nom = document.getElementById('city-act-2-nom');
    const cityAct2Tar = document.getElementById('city-act-2-tar');
    const cityAct3Nom = document.getElementById('city-act-3-nom');
    const cityAct3Tar = document.getElementById('city-act-3-tar');

    const periodSelect = document.getElementById('period-select');

    // Summaries
    const sumBase = document.getElementById('sum-base');
    const sumGlobal = document.getElementById('sum-global');
    const sumFuera = document.getElementById('sum-fuera');
    const sumRetencion = document.getElementById('sum-retencion');
    const sumAvisos = document.getElementById('sum-avisos');
    const sumBomberil = document.getElementById('sum-bomberil');
    const sumPracticadas = document.getElementById('sum-practicadas');
    const sumNeto = document.getElementById('sum-neto');
    const sumCount = document.getElementById('sum-count');
    
    // Subtotals by Activity
    const sumSubAct1 = document.getElementById('sum-sub-act1');
    const sumSubAct2 = document.getElementById('sum-sub-act2');
    const sumSubAct3 = document.getElementById('sum-sub-act3');
    const lblSubAct1 = document.getElementById('lbl-sub-act1');
    const lblSubAct2 = document.getElementById('lbl-sub-act2');
    const lblSubAct3 = document.getElementById('lbl-sub-act3');
    
    const cardAvisos = document.getElementById('card-avisos');
    const cardBomberil = document.getElementById('card-bomberil');

    // Global Company Config
    const globalEmpresa = document.getElementById('global-empresa');
    const globalNit = document.getElementById('global-nit');
    const globalFechaPres = document.getElementById('global-fecha-pres');

    const invoicesBody = document.getElementById('invoices-body');

    const btnAddManual = document.getElementById('btn-add-manual');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnPrint = document.getElementById('btn-print');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnDeleteCity = document.getElementById('btn-delete-city');

    const modalOverlay = document.getElementById('modal-overlay');
    const modalClose = document.getElementById('modal-close');
    const manualForm = document.getElementById('manual-form');
    
    // Edit Modal specific
    const mId = document.getElementById('m-id');
    const modalTitleText = document.getElementById('modal-title-text');
    const modalTitleIcon = document.getElementById('modal-title-icon');
    const modalBtnText = document.getElementById('modal-btn-text');

    // ═══════════════════════════════════════════
    // STORAGE
    // ═══════════════════════════════════════════
    const storageKey = () => `ica_module_${year}`;

    window.saveData = function() {
        storage.set(storageKey(), JSON.stringify(data));
    };

    function save() {
        window.saveData();
    }

    function load() {
        const raw = storage.get(storageKey());
        data = raw ? JSON.parse(raw) : { cities: {}, company: { empresa: '', nit: '', fechaPres: '' } };
        if (!data.company) data.company = { empresa: '', nit: '', fechaPres: '' };
    }

    // ═══════════════════════════════════════════
    // EXCEL IMPORT
    // ═══════════════════════════════════════════
    const COL_MATCHERS = {
        fecha:   v => /fecha|date/i.test(v),
        factura: v => /factura|nro|numero|invoice|num/i.test(v),
        tercero: v => /tercero|proveedor|raz[oó]n|nombre|supplier|name/i.test(v),
        nit:     v => /nit|cc|c[eé]dula|documento|id/i.test(v),
        ciudad:  v => /ciudad|municipio|city|town/i.test(v),
        base:    v => /base|valor|monto|imponible|amount|total/i.test(v),
        tarifa:  v => /tarifa|tasa|rate|por.?mil/i.test(v),
    };

    function mapColumns(headers) {
        const mapping = {};
        const normalHeaders = headers.map(h => String(h).trim());
        for (const [field, matcher] of Object.entries(COL_MATCHERS)) {
            const idx = normalHeaders.findIndex(h => matcher(h));
            if (idx !== -1) mapping[field] = idx;
        }
        return mapping;
    }

    // Returns a "YYYY-MM-DD" string to avoid timezone shifts
    function parseExcelDate(val) {
        if (!val) return null;
        if (val instanceof Date) {
            const y = val.getFullYear();
            const m = String(val.getMonth() + 1).padStart(2, '0');
            const d = String(val.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        }
        if (typeof val === 'number') {
            const p = XLSX.SSF.parse_date_code(val);
            if (p) return `${p.y}-${String(p.m).padStart(2,'0')}-${String(p.d).padStart(2,'0')}`;
        }
        // Try parsing string
        const d = new Date(val);
        if (!isNaN(d.getTime())) {
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const dd = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${dd}`;
        }
        return null;
    }

    // Format a "YYYY-MM-DD" string for display (DD/MM/YYYY)
    function formatDateStr(dateStr) {
        if (!dateStr) return '\u2014';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }

    // Get month (1-12) from a "YYYY-MM-DD" string
    function getMonthFromDateStr(dateStr) {
        if (!dateStr) return null;
        const parts = dateStr.split('-');
        return parseInt(parts[1], 10);
    }

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            try {
                const wb = XLSX.read(ev.target.result, { type: 'array', cellDates: true });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });

                if (rows.length < 2) { alert('El archivo no contiene datos suficientes.'); return; }

                let headerRowIdx = 0;
                let colMap = {};
                for (let i = 0; i < Math.min(rows.length, 10); i++) {
                    const attempt = mapColumns(rows[i]);
                    if (attempt.ciudad !== undefined && (attempt.base !== undefined || attempt.factura !== undefined)) {
                        headerRowIdx = i;
                        colMap = attempt;
                        break;
                    }
                }

                if (colMap.ciudad === undefined) {
                    alert('No se encontró la columna "Ciudad" o "Municipio" en el archivo.');
                    return;
                }

                let importedCount = 0;

                for (let i = headerRowIdx + 1; i < rows.length; i++) {
                    const row = rows[i];
                    const cityRaw = String(row[colMap.ciudad] || '').trim().toUpperCase();
                    if (!cityRaw) continue;

                    if (!data.cities[cityRaw]) {
                        data.cities[cityRaw] = { 
                            periodicity: 'bimensual',
                            avisos: false,
                            bomberil: false,
                            act1: { nom: 'Principal', tar: 11.04 },
                            act2: { nom: 'Secundaria', tar: 9.66 },
                            act3: { nom: 'Otras', tar: 4.14 },
                            invoices: [] 
                        };
                    }

                    const invoice = {
                        id: Date.now().toString() + '_' + i,
                        fecha: null,
                        factura: '',
                        tercero: '',
                        nit: '',
                        base: 0,
                        actividad: '1',     // Default to principal
                        tarifa: null,       // null = follow activity's tariff from city config
                        retPracticada: 0,
                        certificado: false
                    };

                    if (colMap.fecha !== undefined) {
                        invoice.fecha = parseExcelDate(row[colMap.fecha]);
                    }
                    if (colMap.factura !== undefined) invoice.factura = String(row[colMap.factura] || '').trim();
                    if (colMap.tercero !== undefined) invoice.tercero = String(row[colMap.tercero] || '').trim().toUpperCase();
                    if (colMap.nit !== undefined) invoice.nit = String(row[colMap.nit] || '').trim();
                    if (colMap.base !== undefined) invoice.base = parseCur(row[colMap.base]);
                    
                    if (colMap.tarifa !== undefined) {
                        const t = parseFloat(row[colMap.tarifa]);
                        if (!isNaN(t) && t > 0) invoice.tarifa = t;
                    }

                    // Auto-detect NC
                    if (invoice.factura.toUpperCase().startsWith('NC') || invoice.factura.toUpperCase().includes('NOTA CREDITO')) {
                        invoice.isNC = true;
                    }

                    data.cities[cityRaw].invoices.push(invoice);
                    importedCount++;
                }

                save();
                renderCityNav();

                const cities = Object.keys(data.cities);
                if (cities.length > 0) selectCity(cities[0]);

                alert(`✅ Importación exitosa: ${importedCount} facturas en ${Object.keys(data.cities).length} ciudad(es).`);

            } catch (err) {
                console.error(err);
                alert('Error al leer el archivo Excel: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        fileInput.value = '';
    });

    // ═══════════════════════════════════════════
    // CITY NAVIGATION
    // ═══════════════════════════════════════════
    function renderCityNav() {
        cityNav.querySelectorAll('.city-btn').forEach(b => b.remove());
        const cities = Object.keys(data.cities);
        emptyCitiesMsg.style.display = cities.length === 0 ? 'flex' : 'none';

        cities.sort().forEach(name => {
            const btn = document.createElement('button');
            btn.className = 'city-btn' + (name === activeCity ? ' active' : '');
            const count = data.cities[name].invoices.length;
            btn.innerHTML = `<i class="ph ph-map-pin"></i><span>${name}</span><span class="badge">${count}</span>`;
            btn.addEventListener('click', () => selectCity(name));
            cityNav.insertBefore(btn, emptyCitiesMsg);
        });
    }

    function selectCity(name) {
        activeCity = name;
        activePeriod = '1';

        emptyState.style.display = 'none';
        cityView.style.display = 'block';

        const cityData = data.cities[name];
        
        // Migration of old data
        if (!cityData.act1) cityData.act1 = { nom: 'Principal', tar: cityData.tarifa || 11.04 };
        if (!cityData.act2) cityData.act2 = { nom: 'Secundaria', tar: 9.66 };
        if (!cityData.act3) cityData.act3 = { nom: 'Otras', tar: 4.14 };
        if (cityData.avisos === undefined) cityData.avisos = false;
        if (cityData.bomberil === undefined) cityData.bomberil = false;

        cityTitle.textContent = name;
        citySubtitle.textContent = `Retención de Industria y Comercio — ${cityData.periodicity.charAt(0).toUpperCase() + cityData.periodicity.slice(1)}`;

        periodicitySelect.value = cityData.periodicity;
        
        cityAvisos.checked = cityData.avisos;
        cityBomberil.checked = cityData.bomberil;

        cityAct1Nom.value = cityData.act1.nom;
        cityAct1Tar.value = cityData.act1.tar;
        cityAct2Nom.value = cityData.act2.nom;
        cityAct2Tar.value = cityData.act2.tar;
        cityAct3Nom.value = cityData.act3.nom;
        cityAct3Tar.value = cityData.act3.tar;

        renderPeriodOptions();
        renderCityNav();
        renderAll();
    }

    // ═══════════════════════════════════════════
    // PERIOD OPTIONS
    // ═══════════════════════════════════════════
    function renderPeriodOptions() {
        if (!activeCity) return;
        const pType = data.cities[activeCity].periodicity;
        const periods = PERIOD_DEFS[pType] || PERIOD_DEFS.bimensual;

        periodSelect.innerHTML = '';
        periods.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.label;
            if (p.id === activePeriod) opt.selected = true;
            periodSelect.appendChild(opt);
        });
    }

    function getInvoicePeriodId(invoice) {
        if (!invoice.fecha) return '1';
        const month = getMonthFromDateStr(invoice.fecha);
        if (!month) return '1';
        const pType = data.cities[activeCity].periodicity;
        const periods = PERIOD_DEFS[pType] || PERIOD_DEFS.bimensual;
        for (const p of periods) {
            if (p.months.includes(month)) return p.id;
        }
        return '1';
    }

    // ═══════════════════════════════════════════
    // RENDER TABLE + SUMMARY
    // ═══════════════════════════════════════════
    function getInvoiceTarifa(inv, cityData) {
        if (inv.tarifa !== null && inv.tarifa !== undefined) return parseFloat(inv.tarifa);
        const actKey = 'act' + (inv.actividad || '1');
        return cityData[actKey] ? cityData[actKey].tar : 0;
    }

    function renderAll() {
        if (!activeCity || !data.cities[activeCity]) return;

        const cityData = data.cities[activeCity];
        const filtered = cityData.invoices.filter(inv => getInvoicePeriodId(inv) === activePeriod);

        // Manage columns visibility
        document.querySelectorAll('.th-avisos').forEach(el => el.style.display = cityData.avisos ? '' : 'none');
        document.querySelectorAll('.th-bomberil').forEach(el => el.style.display = cityData.bomberil ? '' : 'none');
        let colCount = 11 + (cityData.avisos ? 1 : 0) + (cityData.bomberil ? 1 : 0);

        let totalBase = 0;
        let totalRet = 0;
        let totalAvisos = 0;
        let totalBomberil = 0;
        let totalPracticadas = 0;
        
        let subAct1 = 0;
        let subAct2 = 0;
        let subAct3 = 0;

        invoicesBody.innerHTML = '';

        if (filtered.length === 0) {
            invoicesBody.innerHTML = `<tr><td colspan="${colCount}" class="empty-td">No hay facturas en este período.</td></tr>`;
        } else {
            filtered.forEach(inv => {
                // Migrate old data
                if (inv.retPracticada === undefined) inv.retPracticada = 0;
                if (inv.certificado === undefined) inv.certificado = false;
                if (!inv.actividad) inv.actividad = '1';

                const isNC = inv.isNC || (inv.factura || '').toUpperCase().startsWith('NC') || (inv.factura || '').toUpperCase().includes('NOTA CREDITO');
                const sign = isNC ? -1 : 1;
                const ncBadge = isNC ? `<span style="background:var(--danger); color:white; font-size:9px; padding:2px 4px; border-radius:4px; margin-left:4px; font-weight:bold;">NC</span>` : '';

                const tarifa = getInvoiceTarifa(inv, cityData);
                const retencion = sign * ((inv.base * tarifa) / 1000);
                
                const valAvisos = cityData.avisos ? (retencion * 0.15) : 0;
                const valBomberil = cityData.bomberil ? (retencion * 0.015) : 0;

                totalBase += (sign * inv.base);
                totalRet += retencion;
                totalAvisos += valAvisos;
                totalBomberil += valBomberil;
                totalPracticadas += (sign * (inv.retPracticada || 0));

                if (inv.actividad === '1') subAct1 += (sign * inv.base);
                else if (inv.actividad === '2') subAct2 += (sign * inv.base);
                else if (inv.actividad === '3') subAct3 += (sign * inv.base);

                const fechaStr = formatDateStr(inv.fecha);

                // Build Optional Surcharge TDs
                const tdAvisos = cityData.avisos ? `<td class="text-right hl mono" style="color:#ef4444">${fmt(valAvisos)}</td>` : '';
                const tdBomberil = cityData.bomberil ? `<td class="text-right hl mono" style="color:#f97316">${fmt(valBomberil)}</td>` : '';

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${fechaStr}</td>
                    <td class="mono">${inv.factura || '—'}${ncBadge}</td>
                    <td>${inv.tercero || '—'}</td>
                    <td class="mono">${inv.nit || '—'}</td>
                    <td class="text-right mono">${fmt(inv.base)}</td>
                    <td class="text-center">
                        <select class="inline-act" data-id="${inv.id}" data-field="actividad">
                            <option value="1" ${inv.actividad === '1' ? 'selected' : ''}>${cityData.act1.nom || 'Principal'}</option>
                            <option value="2" ${inv.actividad === '2' ? 'selected' : ''}>${cityData.act2.nom || 'Secundaria'}</option>
                            <option value="3" ${inv.actividad === '3' ? 'selected' : ''}>${cityData.act3.nom || 'Otras'}</option>
                        </select>
                    </td>
                    <td class="text-center">
                        <input type="number" class="inline-tarifa" step="0.01" min="0"
                               value="${tarifa}" data-id="${inv.id}" data-field="tarifa"
                               title="Tarifa por mil para esta factura">
                    </td>
                    <td class="text-right hl mono" style="color:#8b5cf6">${fmt(retencion)}</td>
                    ${tdAvisos}
                    ${tdBomberil}
                    <td class="text-right">
                        <input type="text" class="inline-ret-practicada" 
                               value="${inv.retPracticada ? Math.round(inv.retPracticada).toLocaleString('es-CO') : '0'}" 
                               data-id="${inv.id}" data-field="retPracticada"
                               title="Retención ICA practicada por el cliente">
                    </td>
                    <td class="text-center">
                        <label class="cert-label">
                            <input type="checkbox" class="cert-check" 
                                   data-id="${inv.id}" data-field="certificado"
                                   ${inv.certificado ? 'checked' : ''}>
                            <span class="cert-badge ${inv.certificado ? 'yes' : 'no'}">
                                <i class="ph ph-${inv.certificado ? 'check-circle' : 'x-circle'}"></i>
                                ${inv.certificado ? 'Sí' : 'No'}
                            </span>
                        </label>
                    </td>
                    <td class="text-center" style="white-space:nowrap; display:flex; gap:4px; justify-content:center;">
                        <button class="btn-icon btn-icon-edit" data-id="${inv.id}" title="Editar" style="color:#0284c7;background:rgba(2,132,199,.1);"><i class="ph ph-pencil-simple"></i></button>
                        <button class="btn-icon" data-id="${inv.id}" title="Eliminar"><i class="ph ph-trash"></i></button>
                    </td>
                `;
                invoicesBody.appendChild(tr);
            });
        }

        // Calculate National Total for the specific months of this period
        const pType = cityData.periodicity;
        const periods = PERIOD_DEFS[pType] || PERIOD_DEFS.bimensual;
        const periodObj = periods.find(p => p.id === activePeriod) || periods[0];
        const activeMonths = periodObj.months;

        let totalGlobal = 0;
        Object.values(data.cities).forEach(cData => {
            cData.invoices.forEach(inv => {
                if (!inv.fecha) return;
                const isNC = inv.isNC || (inv.factura || '').toUpperCase().startsWith('NC') || (inv.factura || '').toUpperCase().includes('NOTA CREDITO');
                const sign = isNC ? -1 : 1;
                const m = getMonthFromDateStr(inv.fecha);
                if (activeMonths.includes(m)) {
                    totalGlobal += (sign * inv.base);
                }
            });
        });

        // Ingresos Fuera de Ciudad = Total Nacional - Ingresos en esta ciudad
        let totalFuera = totalGlobal - totalBase;
        if (totalFuera < 0) totalFuera = 0;

        // Manage Cards Visibility
        cardAvisos.style.display = cityData.avisos ? 'flex' : 'none';
        cardBomberil.style.display = cityData.bomberil ? 'flex' : 'none';

        if(sumGlobal) sumGlobal.textContent = fmt(totalGlobal);
        if(sumFuera) sumFuera.textContent = fmt(totalFuera);
        sumBase.textContent = fmt(totalBase);
        sumRetencion.textContent = fmt(totalRet);
        sumAvisos.textContent = fmt(totalAvisos);
        sumBomberil.textContent = fmt(totalBomberil);
        sumPracticadas.textContent = fmt(totalPracticadas);
        const neto = totalRet + totalAvisos + totalBomberil - totalPracticadas;
        sumNeto.textContent = fmt(round1000(neto));
        
        // Update Subtotals by Activity
        if (lblSubAct1) lblSubAct1.textContent = cityData.act1.nom || 'Act. Principal';
        if (lblSubAct2) lblSubAct2.textContent = cityData.act2.nom || 'Act. Secundaria';
        if (lblSubAct3) lblSubAct3.textContent = cityData.act3.nom || 'Otras Actividades';
        
        if (sumSubAct1) sumSubAct1.textContent = fmt(subAct1);
        if (sumSubAct2) sumSubAct2.textContent = fmt(subAct2);
        if (sumSubAct3) sumSubAct3.textContent = fmt(subAct3);
        
        // Count summary fallback - update count variable logic if needed
        const prevCountCard = document.getElementById('sum-count');
        if (prevCountCard) prevCountCard.textContent = filtered.length;
    }

    // ═══════════════════════════════════════════
    // TABLE EVENT DELEGATION
    // ═══════════════════════════════════════════
    invoicesBody.addEventListener('click', (e) => {
        // Delete button
        const btnDelete = e.target.closest('.btn-icon:not(.btn-icon-edit)');
        if (btnDelete) {
            const id = btnDelete.dataset.id;
            if (!confirm('¿Eliminar esta factura?')) return;
            data.cities[activeCity].invoices = data.cities[activeCity].invoices.filter(inv => inv.id !== id);
            save();
            renderAll();
            renderCityNav();
            return;
        }

        // Edit button
        const btnEdit = e.target.closest('.btn-icon-edit');
        if (btnEdit) {
            const id = btnEdit.dataset.id;
            const inv = data.cities[activeCity].invoices.find(i => i.id === id);
            if (!inv) return;

            mId.value = inv.id;
            modalTitleText.textContent = 'Editar Factura';
            modalTitleIcon.className = 'ph ph-pencil-simple';
            modalBtnText.textContent = 'Guardar Cambios';

            document.getElementById('m-fecha').value = inv.fecha || '';
            document.getElementById('m-factura').value = inv.factura || '';
            document.getElementById('m-tercero').value = inv.tercero || '';
            document.getElementById('m-nit').value = inv.nit || '';
            
            document.getElementById('m-base').value = inv.base ? inv.base.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '0';
            document.getElementById('m-ret-practicada').value = inv.retPracticada ? inv.retPracticada.toLocaleString('es-CO', { maximumFractionDigits: 2 }) : '0';
            
            mActividad.innerHTML = `
                <option value="1">${data.cities[activeCity].act1.nom || 'Principal'}</option>
                <option value="2">${data.cities[activeCity].act2.nom || 'Secundaria'}</option>
                <option value="3">${data.cities[activeCity].act3.nom || 'Otras'}</option>
            `;
            mActividad.value = inv.actividad || '1';
            
            if (inv.tarifa) {
                document.getElementById('m-tarifa').value = inv.tarifa;
            } else {
                document.getElementById('m-tarifa').value = '';
                document.getElementById('m-tarifa').placeholder = 'Auto (' + getInvoiceTarifa(inv, data.cities[activeCity]) + '‰)';
            }
            document.getElementById('m-is-nc').checked = inv.isNC || false;

            modalOverlay.style.display = 'flex';
        }
    });

    invoicesBody.addEventListener('change', (e) => {
        const el = e.target;
        const id = el.dataset.id;
        const field = el.dataset.field;
        if (!id || !field) return;

        const inv = data.cities[activeCity].invoices.find(inv => inv.id === id);
        if (!inv) return;

        if (field === 'actividad') {
            inv.actividad = el.value;
            inv.tarifa = null; // Re-link to the new activity's tariff
            save();
            renderAll();
        }

        if (field === 'tarifa') {
            const val = parseFloat(el.value);
            if (!isNaN(val) && val > 0) {
                inv.tarifa = val;
            } else {
                inv.tarifa = null; // Re-link to configured tariff
                el.value = getInvoiceTarifa(inv, data.cities[activeCity]);
            }
            save();
            renderAll();
        }

        if (field === 'retPracticada') {
            inv.retPracticada = parseCur(el.value);
            save();
            renderAll();
        }

        if (field === 'certificado') {
            inv.certificado = el.checked;
            save();
            renderAll();
        }
    });

    // ═══════════════════════════════════════════
    // CONFIG CHANGE HANDLERS
    // ═══════════════════════════════════════════
    periodicitySelect.addEventListener('change', () => {
        if (!activeCity) return;
        data.cities[activeCity].periodicity = periodicitySelect.value;
        activePeriod = '1';
        save();
        renderPeriodOptions();
        renderAll();
        citySubtitle.textContent = `Retención de Industria y Comercio — ${periodicitySelect.value.charAt(0).toUpperCase() + periodicitySelect.value.slice(1)}`;
    });

    cityAvisos.addEventListener('change', () => {
        if (!activeCity) return;
        data.cities[activeCity].avisos = cityAvisos.checked;
        save();
        renderAll();
    });

    cityBomberil.addEventListener('change', () => {
        if (!activeCity) return;
        data.cities[activeCity].bomberil = cityBomberil.checked;
        save();
        renderAll();
    });

    // Activities configuration listeners
    const actInputs = [
        { nom: cityAct1Nom, tar: cityAct1Tar, key: 'act1' },
        { nom: cityAct2Nom, tar: cityAct2Tar, key: 'act2' },
        { nom: cityAct3Nom, tar: cityAct3Tar, key: 'act3' }
    ];

    actInputs.forEach(({ nom, tar, key }) => {
        nom.addEventListener('input', () => {
            if (!activeCity) return;
            data.cities[activeCity][key].nom = nom.value;
            save();
            renderAll();
        });
        tar.addEventListener('input', () => {
            if (!activeCity) return;
            data.cities[activeCity][key].tar = parseFloat(tar.value) || 0;
            save();
            renderAll(); // Will recalculate invoices that are linked to this activity
        });
    });

    periodSelect.addEventListener('change', () => {
        activePeriod = periodSelect.value;
        renderAll();
    });

    yearSelect.addEventListener('change', () => {
        year = yearSelect.value;
        load();
        activeCity = null;
        activePeriod = '1';
        emptyState.style.display = 'flex';
        cityView.style.display = 'none';
        renderCityNav();

        const cities = Object.keys(data.cities);
        if (cities.length > 0) selectCity(cities[0]);
    });

    // ═══════════════════════════════════════════
    // MANUAL ADD
    // ═══════════════════════════════════════════
    const mActividad = document.getElementById('m-actividad');
    const mTarifa = document.getElementById('m-tarifa');

    mActividad.addEventListener('change', () => {
        if (!activeCity) return;
        mTarifa.placeholder = 'Auto (' + data.cities[activeCity]['act' + mActividad.value].tar + '‰)';
    });

    btnAddManual.addEventListener('click', () => {
        if (!activeCity) return;
        mId.value = '';
        modalTitleText.textContent = 'Agregar Factura Manual';
        modalTitleIcon.className = 'ph ph-plus-circle';
        modalBtnText.textContent = 'Agregar Factura';

        modalOverlay.style.display = 'flex';
        document.getElementById('m-fecha').valueAsDate = new Date();
        mActividad.value = '1';
        mTarifa.value = '';
        mTarifa.placeholder = 'Auto (' + data.cities[activeCity].act1.tar + '‰)';
        mTarifa.readOnly = false; // Permite personalización en la creación
        document.getElementById('m-is-nc').checked = false;
        
        mActividad.innerHTML = `
            <option value="1">${data.cities[activeCity].act1.nom || 'Principal'}</option>
            <option value="2">${data.cities[activeCity].act2.nom || 'Secundaria'}</option>
            <option value="3">${data.cities[activeCity].act3.nom || 'Otras'}</option>
        `;
    });

    modalClose.addEventListener('click', () => { modalOverlay.style.display = 'none'; });
    modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.style.display = 'none'; });

    // Currency formatting in modal
    const mBase = document.getElementById('m-base');
    const mRetPracticada = document.getElementById('m-ret-practicada');

    [mBase, mRetPracticada].forEach(el => {
        el.addEventListener('input', function () {
            // 1. Eliminar TODOS los puntos (separadores de miles) para evitar confusión
            let clean = this.value.replace(/\./g, '');
            // 2. Solo permitir dígitos y una coma decimal
            clean = clean.replace(/[^0-9,]/g, '');
            
            // 3. Dividir en parte entera y decimal
            const parts = clean.split(',');
            let integerPart = parts[0];
            
            if (integerPart) {
                integerPart = parseInt(integerPart, 10).toLocaleString('es-CO');
            }
            
            // 4. Reconstruir
            if (parts.length > 1) {
                this.value = (integerPart || '0') + ',' + parts[1].slice(0, 2);
            } else {
                this.value = integerPart;
            }
        });
    });

    manualForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!activeCity) return;

        const invoiceId = mId.value;
        const tarifaVal = parseFloat(mTarifa.value);

        const invData = {
            fecha: document.getElementById('m-fecha').value || null,
            factura: document.getElementById('m-factura').value.trim(),
            tercero: document.getElementById('m-tercero').value.trim().toUpperCase(),
            nit: document.getElementById('m-nit').value.trim(),
            base: parseCur(mBase.value),
            actividad: mActividad.value,
            tarifa: (!isNaN(tarifaVal) && tarifaVal > 0) ? tarifaVal : null,
            retPracticada: parseCur(mRetPracticada.value),
            isNC: document.getElementById('m-is-nc').checked
        };

        if (invoiceId) {
            // Edit existing
            const targetInv = data.cities[activeCity].invoices.find(i => i.id === invoiceId);
            if (targetInv) {
                Object.assign(targetInv, invData);
            }
        } else {
            // Create new
            invData.id = Date.now().toString();
            invData.certificado = false;
            data.cities[activeCity].invoices.push(invData);
        }

        save();
        
        // --- Notificación de Período ---
        const invPeriod = getInvoicePeriodId(invData);
        if (invPeriod !== activePeriod) {
            const periods = PERIOD_DEFS[data.cities[activeCity].periodicity] || PERIOD_DEFS.bimensual;
            const pObj = periods.find(p => p.id === invPeriod);
            alert(`Factura agregada con éxito al período: ${pObj ? pObj.label : invPeriod}.\nCambiando de vista para mostrarla.`);
            activePeriod = invPeriod;
            periodSelect.value = invPeriod;
        }

        renderAll();
        renderCityNav();
        modalOverlay.style.display = 'none';
        manualForm.reset();
    });

    btnPrint.addEventListener('click', () => {
        window.print();
    });

    // ═══════════════════════════════════════════
    // DELETE CITY
    // ═══════════════════════════════════════════
    btnDeleteCity.addEventListener('click', () => {
        if (!activeCity) return;
        if (!confirm(`¿Estás seguro de eliminar TODA la información de "${activeCity}"?`)) return;
        delete data.cities[activeCity];
        save();
        activeCity = null;
        emptyState.style.display = 'flex';
        cityView.style.display = 'none';
        renderCityNav();

        const cities = Object.keys(data.cities);
        if (cities.length > 0) selectCity(cities[0]);
    });

    // ═══════════════════════════════════════════
    // EXPORT PDF
    // ═══════════════════════════════════════════
    btnExportPdf.addEventListener('click', () => {
        if (!activeCity) return;
        const cityData = data.cities[activeCity];
        const pType = cityData.periodicity;
        const periods = PERIOD_DEFS[pType];
        const periodObj = periods.find(p => p.id === activePeriod) || periods[0];

        const filtered = cityData.invoices.filter(inv => getInvoicePeriodId(inv) === activePeriod);
        if (filtered.length === 0) { alert('No hay facturas en este período.'); return; }

        let totalBase = 0, totalRet = 0, totalAvisos = 0, totalBomberil = 0, totalPract = 0;

        let rowsHtml = '';
        filtered.forEach(inv => {
            const tarifa = getInvoiceTarifa(inv, cityData);
            const ret = (inv.base * tarifa) / 1000;
            const valAvisos = cityData.avisos ? (ret * 0.15) : 0;
            const valBomberil = cityData.bomberil ? (ret * 0.015) : 0;

            totalBase += inv.base;
            totalRet += ret;
            totalAvisos += valAvisos;
            totalBomberil += valBomberil;
            totalPract += (inv.retPracticada || 0);

            const fechaStr = formatDateStr(inv.fecha);
            const certIcon = inv.certificado ? '✅' : '❌';
            const actName = cityData['act' + (inv.actividad || '1')].nom || 'Principal';

            const tdAvisos = cityData.avisos ? `<td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:right;font-family:monospace;color:#ef4444;">${fmt(valAvisos)}</td>` : '';
            const tdBomberil = cityData.bomberil ? `<td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:right;font-family:monospace;color:#f97316;">${fmt(valBomberil)}</td>` : '';

            rowsHtml += `<tr>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;">${fechaStr}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;font-family:monospace;">${inv.factura || '—'}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;">${inv.tercero || '—'}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;font-family:monospace;">${inv.nit || '—'}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:right;font-family:monospace;">${fmt(inv.base)}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:8px;text-align:center;">${actName}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:center;font-family:monospace;">${tarifa}‰</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:right;font-family:monospace;font-weight:600;color:#8b5cf6;">${fmt(ret)}</td>
                ${tdAvisos}
                ${tdBomberil}
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:right;font-family:monospace;color:#10b981;">${fmt(inv.retPracticada || 0)}</td>
                <td style="padding:6px 4px;border:1px solid #e2e8f0;font-size:9px;text-align:center;">${certIcon}</td>
            </tr>`;
        });

        const thAvisos = cityData.avisos ? `<th style="padding:6px 4px;background:#fef2f2;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:right;color:#dc2626;">Avisos</th>` : '';
        const thBomberil = cityData.bomberil ? `<th style="padding:6px 4px;background:#fff7ed;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:right;color:#ea580c;">Bomberil</th>` : '';

        const trAvisos = cityData.avisos ? `
            <tr>
                <td style="padding:5px;font-size:11px;color:#ef4444;text-align:right;">(+) Avisos y Tableros (15%):</td>
                <td style="padding:5px;font-size:12px;font-weight:600;text-align:right;font-family:monospace;color:#ef4444">${fmt(totalAvisos)}</td>
            </tr>
        ` : '';
        const trBomberil = cityData.bomberil ? `
            <tr>
                <td style="padding:5px;font-size:11px;color:#f97316;text-align:right;">(+) Sobretasa Bomberil (1.5%):</td>
                <td style="padding:5px;font-size:12px;font-weight:600;text-align:right;font-family:monospace;color:#f97316">${fmt(totalBomberil)}</td>
            </tr>
        ` : '';

        const html = `
        <div style="font-family:'Segoe UI',Arial,sans-serif;color:#1e293b;width:100%;box-sizing:border-box;">
            <style>table{table-layout:fixed;width:100%;border-collapse:collapse;overflow-wrap:break-word;word-break:break-word;}</style>
            <div style="border-bottom:3px solid #8b5cf6;padding-bottom:12px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-end;">
                <div>
                    <h1 style="margin:0;font-size:18px;color:#0f172a;">Retención ICA — ${activeCity}</h1>
                    <p style="margin:4px 0 0;color:#64748b;font-size:11px;">Periodicidad: ${pType.charAt(0).toUpperCase() + pType.slice(1)}</p>
                    <p style="margin:6px 0 0;color:#1e293b;font-size:12px;font-weight:600;">Empresa Presentante: ${data.company.empresa || '—'}</p>
                    <p style="margin:2px 0 0;color:#475569;font-size:11px;">NIT: ${data.company.nit || '—'}</p>
                </div>
                <div style="text-align:right;">
                    <span style="display:block;font-size:13px;font-weight:700;color:#8b5cf6;">${periodObj.label} — ${year}</span>
                    <span style="display:block;font-size:11px;color:#0f172a;margin-top:4px;">Fecha Presentación: ${data.company.fechaPres || '—'}</span>
                    <span style="display:block;font-size:9px;color:#94a3b8;margin-top:2px;">Generado: ${new Date().toLocaleString()}</span>
                </div>
            </div>
            <table>
                <thead><tr>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:left;width:7%">Fecha</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:left;width:7%">Factura</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:left;width:17%">Tercero</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:left;width:9%">NIT</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:right;width:10%">Base</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:center;width:10%">Actividad</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:center;width:6%">Tarifa</th>
                    <th style="padding:6px 4px;background:#f3e8ff;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:right;color:#7e22ce;">Retención</th>
                    ${thAvisos}
                    ${thBomberil}
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:right;;width:9%">Ret. Pract.</th>
                    <th style="padding:6px 4px;background:#f8fafc;border:1px solid #e2e8f0;font-size:8px;text-transform:uppercase;text-align:center;width:4%">Cert.</th>
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
            </table>
            <div style="margin-top:20px;display:flex;justify-content:flex-end;">
                <table style="width:50%;border-collapse:collapse;">
                    <tr>
                        <td style="padding:5px;font-size:11px;color:#64748b;text-align:right;">Total Base:</td>
                        <td style="padding:5px;font-size:12px;font-weight:600;text-align:right;font-family:monospace;">${fmt(totalBase)}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px;font-size:11px;color:#8b5cf6;text-align:right;">Total Retención ICA:</td>
                        <td style="padding:5px;font-size:12px;font-weight:600;text-align:right;font-family:monospace;color:#8b5cf6">${fmt(totalRet)}</td>
                    </tr>
                    ${trAvisos}
                    ${trBomberil}
                    <tr>
                        <td style="padding:5px;font-size:11px;color:#10b981;text-align:right;">(-) Retenciones Practicadas:</td>
                        <td style="padding:5px;font-size:12px;font-weight:600;text-align:right;font-family:monospace;color:#10b981;">${fmt(totalPract)}</td>
                    </tr>
                    <tr>
                        <td style="padding:5px 5px;font-size:13px;font-weight:700;color:#0f172a;text-align:right;border-top:2px solid #cbd5e1;">NETO A PAGAR:</td>
                        <td style="padding:5px 5px;font-size:16px;font-weight:700;color:#0f172a;text-align:right;border-top:2px solid #cbd5e1;font-family:monospace;">${fmt(round1000(totalRet + totalAvisos + totalBomberil - totalPract))}</td>
                    </tr>
                </table>
            </div>
        </div>`;

        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:absolute;width:1100px;height:1200px;top:-9999px;left:-9999px;';
        document.body.appendChild(iframe);
        const idoc = iframe.contentWindow.document;
        idoc.open(); idoc.write(html); idoc.close();

        const opt = {
            margin: 0.4,
            filename: `ICA_${activeCity}_${periodObj.label.replace(/ /g, '_')}_${year}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 1100 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };

        setTimeout(() => {
            html2pdf().set(opt).from(idoc.body).save().then(() => document.body.removeChild(iframe));
        }, 500);
    });

    // ═══════════════════════════════════════════
    // EXPORT EXCEL
    // ═══════════════════════════════════════════
    btnExportExcel.addEventListener('click', () => {
        if (!activeCity) return;
        const cityData = data.cities[activeCity];
        const pType = cityData.periodicity;
        const periods = PERIOD_DEFS[pType];
        const periodObj = periods.find(p => p.id === activePeriod) || periods[0];

        const filtered = cityData.invoices.filter(inv => getInvoicePeriodId(inv) === activePeriod);
        if (filtered.length === 0) { alert('No hay facturas en este período.'); return; }

        const rows = filtered.map(inv => {
            const tarifa = getInvoiceTarifa(inv, cityData);
            const actName = cityData['act' + (inv.actividad || '1')].nom || 'Principal';
            
            const ret = (inv.base * tarifa) / 1000;
            const valAvisos = cityData.avisos ? (ret * 0.15) : 0;
            const valBomberil = cityData.bomberil ? (ret * 0.015) : 0;

            const rowData = {
                'Fecha': formatDateStr(inv.fecha),
                'Factura': inv.factura,
                'Tercero': inv.tercero,
                'NIT': inv.nit,
                'Base Imponible': inv.base,
                'Actividad': actName,
                'Tarifa (‰)': tarifa,
                'Retención ICA': ret
            };

            if (cityData.avisos) rowData['Avisos y Tableros'] = valAvisos;
            if (cityData.bomberil) rowData['Sobretasa Bomberil'] = valBomberil;

            rowData['Ret. Practicada'] = inv.retPracticada || 0;
            rowData['Certificado'] = inv.certificado ? 'Sí' : 'No';

            return rowData;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, activeCity.substring(0, 31));
        XLSX.writeFile(wb, `ICA_${activeCity}_${periodObj.label.replace(/ /g, '_')}_${year}.xlsx`);
    });

    // ═══════════════════════════════════════════
    // INIT
    // ═══════════════════════════════════════════
    function init() {
        year = yearSelect.value;
        load();
        
        // Initialize Global Company Fields
        globalEmpresa.value = data.company.empresa || '';
        globalNit.value = data.company.nit || '';
        globalFechaPres.value = data.company.fechaPres || '';

        globalEmpresa.addEventListener('change', (e) => { data.company.empresa = e.target.value.toUpperCase(); save(); });
        globalNit.addEventListener('change', (e) => { data.company.nit = e.target.value; save(); });
        globalFechaPres.addEventListener('change', (e) => { data.company.fechaPres = e.target.value; save(); });

        renderCityNav();

        const cities = Object.keys(data.cities);
        if (cities.length > 0) selectCity(cities[0]);
    }

    init();
});
