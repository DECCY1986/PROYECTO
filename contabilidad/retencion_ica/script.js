document.addEventListener('DOMContentLoaded', () => {
    // --- Configuración de Tablas de Tiempo ---
    const PERIODS = {
        soacha: [
            { id: '1', name: 'Enero' },
            { id: '2', name: 'Febrero' },
            { id: '3', name: 'Marzo' },
            { id: '4', name: 'Abril' },
            { id: '5', name: 'Mayo' },
            { id: '6', name: 'Junio' },
            { id: '7', name: 'Julio' },
            { id: '8', name: 'Agosto' },
            { id: '9', name: 'Septiembre' },
            { id: '10', name: 'Octubre' },
            { id: '11', name: 'Noviembre' },
            { id: '12', name: 'Diciembre' }
        ],
        bogota: [
            { id: '1', name: 'Bimestre 1 (Ene - Feb)' },
            { id: '2', name: 'Bimestre 2 (Mar - Abr)' },
            { id: '3', name: 'Bimestre 3 (May - Jun)' },
            { id: '4', name: 'Bimestre 4 (Jul - Ago)' },
            { id: '5', name: 'Bimestre 5 (Sep - Oct)' },
            { id: '6', name: 'Bimestre 6 (Nov - Dic)' }
        ]
    };

    // Estado local
    let currentMode = 'soacha'; // 'soacha' o 'bogota'
    let currentYear = '2026';
    let currentPeriod = '1';
    let records = [];
    let providers = []; // Listado de proveedores importados
    let editingId = null; // ID del registro que se está editando
    let currentReturns = 0; // Valor de devoluciones para el periodo actual

    // DOM Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const headerTitle = document.getElementById('header-title');
    const headerSubtitle = document.getElementById('header-subtitle');
    const periodLabel = document.getElementById('period-label');
    const periodSelect = document.getElementById('period-select');
    const yearSelect = document.getElementById('year-select');
    
    // Form Elements
    const form = document.getElementById('reteica-form');
    const descInput = document.getElementById('desc');
    const nitInput = document.getElementById('nit');
    const baseInput = document.getElementById('base');
    const tarifaInput = document.getElementById('tarifa');
    
    // Table & Summary Elements
    const recordsBody = document.getElementById('records-body');
    const summaryBase = document.getElementById('summary-base');
    const summaryRetenido = document.getElementById('summary-retenido');
    const btnClear = document.getElementById('btn-clear');
    const btnExportPdf = document.getElementById('btn-export-pdf');
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnPrint = document.getElementById('btn-print');
    const inputDevoluciones = document.getElementById('input-devoluciones');
    
    // Proveedores Elements
    const btnImportProviders = document.getElementById('btn-import-providers');
    const importProvidersFile = document.getElementById('import-providers-file');
    const providersList = document.getElementById('providers-list');

    // Inicializar
    function init() {
        loadData();
        loadProviders();
        setupEvents();
        renderPeriodOptions();
        updateUI();
    }

    // Cambiar de Tab (Soacha/Bogotá)
    function switchMode(mode) {
        if (currentMode === mode) return;
        currentMode = mode;
        currentPeriod = '1'; // Reset al primer periodo
        
        navBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === mode);
        });

        if (mode === 'soacha') {
            headerTitle.textContent = 'Retención ICA - Soacha (Mensual)';
            headerSubtitle.textContent = 'Liquidación de retención de Industria y Comercio por mil (‰) para el municipio de Soacha.';
            periodLabel.textContent = 'Mes';
            tarifaInput.placeholder = "Ej: 11.04";
        } else {
            headerTitle.textContent = 'Retención ICA - Bogotá (Bimensual)';
            headerSubtitle.textContent = 'Liquidación de retención de Industria y Comercio por mil (‰) para la ciudad de Bogotá.';
            periodLabel.textContent = 'Bimestre';
            tarifaInput.placeholder = "Ej: 11.04"; // Mismo placeholder pero adapta contexto visual
        }

        renderPeriodOptions();
        loadData();
        updateUI();
    }

    // Configurar Periodos en el Select
    function renderPeriodOptions() {
        periodSelect.innerHTML = '';
        const periods = PERIODS[currentMode];
        periods.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.id;
            opt.textContent = p.name;
            if (p.id === currentPeriod) opt.selected = true;
            periodSelect.appendChild(opt);
        });
    }

    // Formatear moneda (String a Numerico)
    function parseCurrency(str) {
        const s = String(str || '0').replace(/\./g, '').replace(',', '.').replace(/[^0-9.-]/g, '');
        return parseFloat(s) || 0;
    }

    // Formatear de Numeric a Moneda $ XX.XXX
    function formatCurrency(num) {
        return '$ ' + num.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
    }

    // Manejar inputs de moneda
    baseInput.addEventListener('input', function(e) {
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

    // Añadir/Editar Registro
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const baseVal = parseCurrency(baseInput.value);
        const tarifaVal = parseFloat(tarifaInput.value);

        if (baseVal <= 0 || tarifaVal <= 0 || isNaN(tarifaVal)) {
            alert('Por favor ingrese una base y tarifa válidas.');
            return;
        }

        const retenido = (baseVal * tarifaVal) / 1000;
        const recordData = {
            desc: descInput.value.trim().toUpperCase(),
            nit: nitInput.value.trim(),
            base: baseVal,
            tarifa: tarifaVal,
            retenido: retenido
        };

        if (editingId) {
            // Actualizar existente
            const index = records.findIndex(r => r.id === editingId);
            if (index !== -1) {
                records[index] = { ...records[index], ...recordData };
            }
            editingId = null;
            form.querySelector('button[type="submit"]').innerHTML = '<i class="ph ph-calculator"></i> Calcular y Agregar';
        } else {
            // Nuevo registro
            const newRecord = {
                id: Date.now().toString(),
                ...recordData
            };
            records.push(newRecord);
        }

        saveData();
        updateUI();

        // Limpiar form
        form.reset();
        descInput.focus();
    });

    // Almacenamiento
    const getPrefix = () => {
        const path = window.location.pathname.toLowerCase();
        if (path.includes('carpinteria')) return 'carp_';
        if (path.includes('publicidad')) return 'pub_';
        return '';
    };
    const PREFIX = getPrefix();

    function getStorageKey() {
        return `${PREFIX}reteica_${currentMode}_${currentYear}_${currentPeriod}`;
    }

    function saveData() {
        const data = {
            records: records,
            returns: currentReturns
        };
        localStorage.setItem(getStorageKey(), JSON.stringify(data));
    }

    function loadData() {
        const stored = localStorage.getItem(getStorageKey());
        if (stored) {
            const data = JSON.parse(stored);
            // Migrar datos antiguos si es necesario
            if (Array.isArray(data)) {
                records = data;
                currentReturns = 0;
            } else {
                records = data.records || [];
                currentReturns = data.returns || 0;
            }
        } else {
            records = [];
            currentReturns = 0;
        }
        
        if (inputDevoluciones) {
            inputDevoluciones.value = currentReturns > 0 ? currentReturns.toLocaleString('es-CO') : '';
        }
    }

    // --- Gestión de Proveedores ---
    function loadProviders() {
        const stored = localStorage.getItem('dim_proveedores');
        providers = stored ? JSON.parse(stored) : [];
        populateProvidersList();
    }

    function saveProviders() {
        localStorage.setItem('dim_proveedores', JSON.stringify(providers));
    }

    function populateProvidersList() {
        providersList.innerHTML = '';
        providers.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.nombre;
            providersList.appendChild(opt);
        });
    }

    function handleImportProviders(file) {
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[firstSheetName];
                const jsonData = XLSX.utils.sheet_to_json(worksheet);
                
                // Mapeo basado en el formato del usuario: NOMBRE DEL TERCERO, NIT, DIRECCION, TELEFONO, CIUDAD
                const newProviders = jsonData.map(row => {
                    const nombre = row['NOMBRE DEL TERCERO'] || row['Nombre'] || row['Nombre Completo'] || row['Razón Social'] || row['Proveedor'] || row['nombre'] || row['tercero'];
                    const nit = row['NIT'] || row['NIT / CC'] || row['Cédula'] || row['documento'] || row['nit'] || row['identificacion'];
                    const direccion = row['DIRECCION'] || '';
                    const telefono = row['TELEFONO'] || '';
                    const ciudad = row['CIUDAD'] || '';
                    
                    if (nombre) {
                        return { 
                            nombre: String(nombre).trim().toUpperCase(), 
                            nit: nit ? String(nit).trim() : '',
                            direccion: String(direccion).trim(),
                            telefono: String(telefono).trim(),
                            ciudad: String(ciudad).trim()
                        };
                    }
                    return null;
                }).filter(p => p !== null);

                if (newProviders.length > 0) {
                    providers = newProviders;
                    saveProviders();
                    populateProvidersList();
                    alert(`Se importaron ${newProviders.length} proveedores exitosamente.`);
                } else {
                    alert('No se encontraron datos válidos. El Excel debe tener columnas como "Nombre" y "NIT".');
                }
            } catch (err) {
                console.error(err);
                alert('Error al procesar el archivo Excel.');
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // Actualizar Render
    function updateUI() {
        renderTable();
        calculateSummary();
    }

    function calculateSummary() {
        let totalBase = 0;
        let totalRet = 0;
        
        records.forEach(r => {
            totalBase += r.base;
            totalRet += r.retenido;
        });

        const finalTotal = Math.max(0, totalRet - currentReturns);

        summaryBase.textContent = formatCurrency(totalBase);
        summaryRetenido.textContent = formatCurrency(finalTotal);
    }

    function renderTable() {
        recordsBody.innerHTML = '';
        
        if (records.length === 0) {
            recordsBody.innerHTML = `<tr><td colspan="6" class="empty-state">No hay registros en este período. Agrega uno nuevo.</td></tr>`;
            return;
        }

        records.forEach(record => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="mono">${record.nit}</td>
                <td>${record.desc}</td>
                <td class="text-right mono">${formatCurrency(record.base)}</td>
                <td class="text-center mono">${record.tarifa}‰</td>
                <td class="text-right highlight-col mono">${formatCurrency(record.retenido)}</td>
                <td class="text-center">
                    <div class="actions" style="justify-content: center;">
                        <button class="btn-icon btn-edit" onclick="editRecord('${record.id}')" title="Editar">
                            <i class="ph ph-pencil"></i>
                        </button>
                        <button class="btn-icon" onclick="deleteRecord('${record.id}')" title="Eliminar">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            recordsBody.appendChild(tr);
        });
    }

    // Eliminar Registro (Expuesto globalmente para el onclick en string template)
    window.deleteRecord = (id) => {
        if(confirm('¿Eliminar este registro?')) {
            if (editingId === id) cancelEdit();
            records = records.filter(r => r.id !== id);
            saveData();
            updateUI();
        }
    };

    // Editar Registro
    window.editRecord = (id) => {
        const record = records.find(r => r.id === id);
        if (!record) return;

        editingId = id;
        descInput.value = record.desc;
        nitInput.value = record.nit;
        baseInput.value = record.base.toLocaleString('es-CO');
        tarifaInput.value = record.tarifa;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.innerHTML = '<i class="ph ph-check-circle"></i> Actualizar Registro';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        descInput.focus();
    };

    function cancelEdit() {
        editingId = null;
        form.reset();
        form.querySelector('button[type="submit"]').innerHTML = '<i class="ph ph-calculator"></i> Calcular y Agregar';
    }

    // Configurar Eventos Menores
    function setupEvents() {
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => switchMode(btn.dataset.tab));
        });

        yearSelect.addEventListener('change', (e) => {
            currentYear = e.target.value;
            loadData();
            updateUI();
        });

        periodSelect.addEventListener('change', (e) => {
            currentPeriod = e.target.value;
            loadData();
            updateUI();
        });

        btnClear.addEventListener('click', () => {
            if(records.length > 0 && confirm('¿Estás seguro de borrar TODOS los registros de este período?')) {
                records = [];
                saveData();
                updateUI();
            }
        });

        btnExportPdf.addEventListener('click', exportPDF);
        btnExportExcel.addEventListener('click', exportExcel);
        if (btnPrint) btnPrint.addEventListener('click', () => window.print());

        // Proveedores
        btnImportProviders.addEventListener('click', () => importProvidersFile.click());
        importProvidersFile.addEventListener('change', (e) => {
            handleImportProviders(e.target.files[0]);
            e.target.value = ''; // Reset
        });

        // Autocompletar NIT al escribir tercero
        descInput.addEventListener('input', () => {
            const val = descInput.value.toUpperCase();
            const match = providers.find(p => p.nombre === val);
            if (match) {
                nitInput.value = match.nit;
            }
        });

        // Manejar input de devoluciones
        inputDevoluciones.addEventListener('input', function() {
            let clean = this.value.replace(/\./g, '').replace(/[^0-9]/g, '');
            currentReturns = parseInt(clean) || 0;
            this.value = currentReturns > 0 ? (parseInt(clean, 10).toLocaleString('es-CO')) : '';
            saveData();
            calculateSummary();
        });
    }

    // Exportar PDF
    function exportPDF() {
        if (records.length === 0) {
            alert("No hay registros para exportar.");
            return; 
        }

        // Datos del contexto
        const cityLabel = currentMode === 'soacha' ? 'Soacha' : 'Bogotá';
        const periodObj = PERIODS[currentMode].find(p => p.id === currentPeriod);
        const periodStr = `${periodObj.name} - ${currentYear}`;
        
        let totalBase = 0;
        let totalRet = 0;

        let html = `
            <div id="pdfExportContainer" style="font-family: 'Segoe UI', Arial, sans-serif; color: #1e293b; padding: 0; background: #fff; width: 100%; box-sizing: border-box;">
                <style>
                    .pdf-table { table-layout: fixed; width: 100%; border-collapse: collapse; overflow-wrap: break-word; word-wrap: break-word; word-break: break-word; }
                    .pdf-table th, .pdf-table td { word-wrap: break-word; overflow-wrap: break-word; padding: 10px; border: 1px solid #cbd5e1; font-size: 11px; }
                    .pdf-table th { background: #f1f5f9; text-align: left; font-weight: 600; color: #475569; text-transform: uppercase; font-size: 10px; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                    .mono { font-family: 'Courier New', monospace; }
                </style>
                <div style="border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; display: flex; justify-content: space-between; align-items: flex-end;">
                    <div>
                        <h1 style="margin: 0; color: #0f172a; font-size: 22px; letter-spacing: -0.5px;">Reporte de Retención ICA</h1>
                        <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">Municipio: <strong>${cityLabel}</strong></p>
                    </div>
                    <div style="text-align: right;">
                        <span style="display: block; font-size: 16px; font-weight: 700; color: #3b82f6;">${periodStr.toUpperCase()}</span>
                        <span style="font-size: 11px; color: #94a3b8;">Generado el: ${new Date().toLocaleString()}</span>
                    </div>
                </div>

                <table class="pdf-table">
                    <thead>
                        <tr>
                            <th style="width: 15%">NIT / CC</th>
                            <th style="width: 35%">TERCERO</th>
                            <th class="text-right" style="width: 20%">BASE IMPONIBLE</th>
                            <th class="text-center" style="width: 10%">TARIFA</th>
                            <th class="text-right" style="width: 20%">RETENCIÓN</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        records.forEach(r => {
            totalBase += r.base;
            totalRet += r.retenido;
            html += `
                <tr>
                    <td class="mono">${r.nit}</td>
                    <td>${r.desc}</td>
                    <td class="text-right mono">${formatCurrency(r.base)}</td>
                    <td class="text-center mono">${r.tarifa}‰</td>
                    <td class="text-right mono" style="font-weight: 600;">${formatCurrency(r.retenido)}</td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
                <div style="margin-top: 30px; display: flex; justify-content: flex-end;">
                    <table style="width: 40%; border-collapse: collapse; font-family: 'Segoe UI', Arial, sans-serif;">
                        <tr>
                            <td style="padding: 8px; font-size: 12px; color: #64748b; text-align: right;">Base Total:</td>
                            <td class="mono text-right" style="padding: 8px; font-size: 14px; font-weight: 600;">${formatCurrency(totalBase)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-size: 12px; color: #f59e0b; text-align: right;">(-) Devoluciones:</td>
                            <td class="mono text-right" style="padding: 8px; font-size: 14px; font-weight: 600;">${formatCurrency(currentReturns)}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; font-size: 14px; font-weight: 700; color: #0f172a; text-align: right; border-top: 2px solid #cbd5e1;">TOTAL RETENIDO:</td>
                            <td class="mono text-right" style="padding: 8px; font-size: 18px; font-weight: 700; color: #3b82f6; border-top: 2px solid #cbd5e1;">${formatCurrency(Math.max(0, totalRet - currentReturns))}</td>
                        </tr>
                    </table>
                </div>
            </div>
        `;

        const iframe = document.createElement('iframe');
        iframe.style.position = 'absolute';
        iframe.style.width = '730px'; 
        iframe.style.height = '1200px';
        iframe.style.top = '-9999px';
        iframe.style.left = '-9999px';
        document.body.appendChild(iframe);

        const idoc = iframe.contentWindow.document;
        idoc.open();
        idoc.write(html);
        idoc.close();

        const opt = {
            margin: 0.4,
            filename: `Retencion_ICA_${cityLabel}_${periodStr.replace(/ /g, '_')}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, letterRendering: true, windowWidth: 730 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        setTimeout(() => {
            html2pdf().set(opt).from(idoc.body).save().then(() => {
                document.body.removeChild(iframe);
            });
        }, 500);
    }

    // Exportar Excel
    function exportExcel() {
        if (records.length === 0) {
            alert("No hay registros para exportar.");
            return; 
        }

        const cityLabel = currentMode === 'soacha' ? 'Soacha' : 'Bogotá';
        const periodObj = PERIODS[currentMode].find(p => p.id === currentPeriod);

        const exportData = records.map(r => ({
            "NIT / CC": r.nit,
            "Tercero / Descripción": r.desc,
            "Base Imponible": r.base,
            "Tarifa (‰)": r.tarifa,
            "Retención calculada": r.retenido
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        
        // Agregar fila de resumen al final
        XLSX.utils.sheet_add_aoa(ws, [
            [],
            ["", "Total Base", totalBase],
            ["", "Total Retenido Bruto", totalRet],
            ["", "(-) Devoluciones", currentReturns],
            ["", "TOTAL A PAGAR", Math.max(0, totalRet - currentReturns)]
        ], { origin: -1 });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Retenciones ${cityLabel}`);
        XLSX.writeFile(wb, `Retencion_ICA_${cityLabel}_${periodObj.name}_${currentYear}.xlsx`);
    }

    // Boot
    init();
});
