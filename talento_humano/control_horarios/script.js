document.addEventListener('DOMContentLoaded', () => {
    const hourForm = document.getElementById('hourForm');
    const tableBody = document.getElementById('tableBody');
    const payrollSummaryArea = document.getElementById('payrollSummaryArea');
    const workerFilter = document.getElementById('workerFilter');
    const tableWorkerFilter = document.getElementById('tableWorkerFilter');
    const payrollModeSelect = document.getElementById('payrollMode');
    const clearDataBtn = document.getElementById('clearData');
    const btnDeleteSelected = document.getElementById('btnDeleteSelected');
    const selectedRecordsCount = document.getElementById('selectedRecordsCount');
    const selectAllRecords = document.getElementById('selectAllRecords');
    const inputDate = document.getElementById('date');
    const exportPdfBtn = document.getElementById('exportPdf');
    const exportSummaryBtn = document.getElementById('exportSummary');
    const savePdfSummaryBtn = document.getElementById('savePdfSummary');
    const printSummaryBtn = document.getElementById('printSummary');
    const printRecordsBtn = document.getElementById('printRecords');
    const exportFullReportBtn = document.getElementById('exportFullReport');
    const btnGlobalSave = document.getElementById('btn-global-save');
    const editIdInput = document.getElementById('editId');
    const projectsList = document.getElementById('projectsList');
    const opList = document.getElementById('opList');
    const filterMonth = document.getElementById('filterMonth');
    const filterFortnight = document.getElementById('filterFortnight');
    const isHalfDayCheckbox = document.getElementById('isHalfDay');
    const isAbsentCheckbox = document.getElementById('isAbsent');
    const absenceReasonSelect = document.getElementById('absenceReason');
    const absenceReasonGroup = document.getElementById('absenceReasonGroup');
    const syncAbsenceReasonVisibility = () => {
        if (absenceReasonGroup) absenceReasonGroup.style.display = isAbsentCheckbox && isAbsentCheckbox.checked ? 'block' : 'none';
    };
    if (isAbsentCheckbox) isAbsentCheckbox.addEventListener('change', syncAbsenceReasonVisibility);
    if (hourForm) hourForm.addEventListener('reset', () => setTimeout(syncAbsenceReasonVisibility, 0));
    const recordTypeSelect = document.getElementById('recordType');
    const btnSubmit = hourForm ? hourForm.querySelector('button[type="submit"]') : null;
    const addWorkerButton = document.getElementById('btn-add-worker-control');
    const addWorkerModal = document.getElementById('addWorkerModal');
    const addWorkerForm = document.getElementById('addWorkerForm');
    const addWorkerNameInput = document.getElementById('addWorkerName');
    const addWorkerQuincenaInput = document.getElementById('addWorkerQuincena');
    const cancelAddWorkerButton = document.getElementById('btn-cancel-add-worker');
    const workerNameSelect = document.getElementById('workerName');
    const downloadExcelWorkbook = (workbook, fileName) => {
        try {
            if (typeof XLSX === 'undefined') throw new Error('La librería de Excel no está disponible.');
            XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
        } catch (error) {
            console.error('No se pudo generar el archivo Excel:', error);
            alert('No se pudo generar el archivo Excel. Verifique su conexión e intente nuevamente.');
        }
    };

    // --- Helpers ---
    const parseAmount = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const normalized = val.toString().replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(normalized) || 0;
    };

    // --- 1. Base de Datos de Tarifas FIJAS (Solicitado por el usuario) ---
    const FIXED_QUINCENA = {
        "WILLIAM DIAZ VARGAS": 4000000,
        "OSCAR MIGUEL CANTOR ZAMUDIO": 3000000,
        "MAURICIO MEDINA OLVIDARES": 2000000,
        "DIEGO JAVIER QUINTERO DUEÑAS": 1705000,
        "DECCY BAYONA": 1550000,
        "JORGE RODRIGUEZ FERNANDEZ": 1400000,
        "WILLIAM ENRIQUE LOPEZ SORA": 1400000,
        "JUAN CARLOS MARTINEZ SANDOVAL": 1353000,
        "JULIO AGUDELO": 1350000,
        "ORLANDO MORALES SANDOVAL": 1350000,
        "YESICCA PAOLA CANTOR SUAREZ": 1300000,
        "RODRIGO ALEXANDER RODRIGUEZ CENTENO": 1294150,
        "MARIA CAMILA DIAZ CANTOR": 1200000,
        "JULIO ARMANDO RODRIGUEZ": 1188000,
        "JHONNY RAFAEL CASTRELLON RODRIGUEZ": 1182500,
        "CAMILO DURAN": 1210000,
        "JULIO PIERNAGORDA": 1100000,
        "DIEGO VELANDIA": 1350000,
        "JORGE GILBERTO RODRIGUEZ AGUILERA": 1350000,
        "HENRY GONZALES": 1320000,
        "JOSE MANUEL FORERO": 1210000,
        "DEVID ALEJANDRO MEDINA": 1100000,
        "JOSE MANUEL FORERO AREVALO": 1210000,
        "HENRY ALEXANDER ARIAS": 1100000,
        "ANDRES FRANCISCO FLORIAN": 1100000,
        "JAVIER LEONARDO QUINTERO": 1100000
    };

    let workerRates = {};
    Object.entries(FIXED_QUINCENA).forEach(([name, quincena]) => {
        workerRates[name] = { quincena: quincena };
    });

    const calculateDynamicRates = (quincenaTotal, equivalentDays) => {
        // Mínimo de 1 día para evitar división por 0
        const days = Math.max(1, equivalentDays); 
        const dynamicVDia = quincenaTotal / days; 
        
        // Las horas extras SIEMPRE se calculan sobre la base fija de 15 días, según tabla provista
        const standardVDia = quincenaTotal / 15;
        const standardVHora = standardVDia / 8;

        return {
            quincena: quincenaTotal,
            dia: dynamicVDia,       // El valor día mostrado se adapta a los días laborados
            hour: standardVHora,
            extDia: standardVHora * 1.15,   // 15% adicional según tabla
            rNoct: standardVHora * 0.30,    // 30% recargo según tabla
            extNoct: standardVHora * 1.50,  // 50% extra según tabla
            rDom: standardVHora * 0.50,     // 50% recargo según tabla
            extDom: standardVHora * 1.50,   // 50% extra según tabla
            travel: standardVHora * 0.50    // 0.5 de hora normal
        };
    };

    const loadWorkersFromPersonal = () => {
        // 1. Cargar base fija obligatoria
        Object.entries(FIXED_QUINCENA).forEach(([name, quincena]) => {
            if (!workerRates[name]) workerRates[name] = { quincena: quincena };
        });

        // 2. Cargar workerRates guardados previamente en LocalStorage
        try {
            const savedRates = JSON.parse(localStorage.getItem('workerRates'));
            if (savedRates && typeof savedRates === 'object') {
                Object.assign(workerRates, savedRates);
            }
        } catch(e){}

        // 3. Cargar colaboradores registrados en el módulo de Personal
        try {
            const personalRaw = localStorage.getItem('dimalcco_personal_master');
            if (personalRaw) {
                const list = JSON.parse(personalRaw);
                if (Array.isArray(list)) {
                    list.forEach(emp => {
                        const name = (emp.nombre || "").trim().toUpperCase();
                        if (name && !workerRates[name]) {
                            const sal = (parseFloat(emp.salario) || 1350000);
                            workerRates[name] = { quincena: sal / 2 };
                        }
                    });
                }
            }
        } catch(e){}

        // 4. Cargar cualquier trabajador presente en turnos guardados
        try {
            const recs = JSON.parse(localStorage.getItem('shiftRecords')) || [];
            recs.forEach(r => {
                const name = (r.workerName || "").trim().toUpperCase();
                if (name && !workerRates[name]) {
                    workerRates[name] = { quincena: 1350000 / 2 };
                }
            });
        } catch(e){}
    };

    loadWorkersFromPersonal();
    workerRates['DIEGO VELANDIA'] = {
        ...(workerRates['DIEGO VELANDIA'] || {}),
        quincena: FIXED_QUINCENA['DIEGO VELANDIA']
    };
    ['DEVID ALEJANDRO MEDINA', 'JOSE MANUEL FORERO AREVALO', 'HENRY ALEXANDER ARIAS', 'ANDRES FRANCISCO FLORIAN', 'JAVIER LEONARDO QUINTERO', 'JULIO PIERNAGORDA'].forEach(name => {
        workerRates[name] = { ...(workerRates[name] || {}), quincena: FIXED_QUINCENA[name] };
    });
    localStorage.setItem('workerRates', JSON.stringify(workerRates));

    const recordsWereInitialized = localStorage.getItem('shiftRecords_initialized') === 'true';

    // Restore old backups only on first setup, never after the user intentionally empties the list.
    let storedRecords = [];
    try {
        storedRecords = JSON.parse(localStorage.getItem('shiftRecords')) || [];
    } catch(e){}

    if (!recordsWereInitialized && (!Array.isArray(storedRecords) || storedRecords.length === 0)) {
        // Escanear todas las claves de localStorage en busca de respaldos automáticos
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key !== 'shiftRecords' && (key.includes('shift') || key.includes('backup') || key.includes('Records') || key.includes('dimalcco') || key.includes('dim_'))) {
                try {
                    const parsed = JSON.parse(localStorage.getItem(key));
                    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].date) {
                        console.log(`✅ ¡Registros recuperados automáticamente desde respaldo local (${key})!`);
                        storedRecords = parsed;
                        localStorage.setItem('shiftRecords', JSON.stringify(storedRecords));
                        break;
                    }
                } catch(e){}
            }
        }
    }

    // Si aún no hay registros guardados en el dispositivo/navegador, generar semillas iniciales para los 21 trabajadores
    if (!recordsWereInitialized && (!Array.isArray(storedRecords) || storedRecords.length === 0)) {
        const now = new Date();
        const year = now.getFullYear();
        const monthStr = (now.getMonth() + 1).toString().padStart(2, '0');
        const dayNow = now.getDate();
        const startD = dayNow <= 15 ? 1 : 16;
        const endD = Math.min(dayNow, dayNow <= 15 ? 15 : new Date(year, now.getMonth() + 1, 0).getDate());

        const seededShifts = [];
        const workersList = Object.keys(FIXED_QUINCENA);

        workersList.forEach((w, idx) => {
            for (let d = startD; d <= endD; d++) {
                const dateStr = `${year}-${monthStr}-${d.toString().padStart(2, '0')}`;
                const dt = new Date(dateStr + 'T00:00:00');
                const dow = dt.getDay();
                if (dow === 0) continue; // Domingo libre por defecto
                
                const isSat = (dow === 6);
                const tIn = "07:00";
                const isDeccy = w.trim().toUpperCase().startsWith("DECCY BAYONA");
                if (isSat && isDeccy) continue;
                const tOut = isSat ? "12:00" : (isDeccy ? "16:00" : (dow === 1 ? "18:00" : "17:00"));
                const ord = isSat ? 5 : (isDeccy ? 9 : (dow === 1 ? 11 : 10));
                const tot = isSat ? "5.00" : (isDeccy ? "9.00" : (dow === 1 ? "11.00" : "10.00"));

                seededShifts.push({
                    id: Date.now() + Math.floor(Math.random() * 1000000) + idx * 100 + d,
                    workerName: w,
                    date: dateStr,
                    location: (idx % 2 === 0) ? 'obra' : 'planta',
                    projectName: (idx % 2 === 0) ? 'Obra Torre Central' : 'Planta Principal DIMALCCO',
                    opNumber: (1040 + (idx % 5)).toString(),
                    timeIn: tIn,
                    timeOut: tOut,
                    totalHours: tot,
                    ordinaryHours: ord,
                    esMedioDia: false,
                    travelHours: 0,
                    isTravelRecord: false,
                    observations: 'Jornada normal DIMALCCO'
                });
            }
        });

        if (seededShifts.length > 0) {
            storedRecords = seededShifts;
            localStorage.setItem('shiftRecords', JSON.stringify(storedRecords));
            localStorage.setItem('shiftRecords_backup', JSON.stringify(storedRecords));
        }
    }

    window.records = storedRecords;
    let records = storedRecords;
    window.shiftBalances = JSON.parse(localStorage.getItem('shiftBalances') || '{}'); 
    window.manualCrossHoursVal = 0; // Para el modo parcial
    window.lastRenderedWorker = "";

    const getDeletedShiftIds = () => {
        try { return new Set(JSON.parse(localStorage.getItem('deletedShiftRecordIds') || '[]').map(String)); }
        catch (e) { return new Set(); }
    };

    const markShiftRecordsDeleted = (ids) => {
        const deletedIds = getDeletedShiftIds();
        ids.forEach(id => deletedIds.add(String(id)));
        localStorage.setItem('deletedShiftRecordIds', JSON.stringify([...deletedIds]));
    };

    // Global cloud sync functions for mobile relay (ntfy.sh)
    window.pushMobileShiftToCloud = async function(record) {
        try {
            await fetch('https://ntfy.sh/dimalcco_shifts_2026_x77', {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
                body: JSON.stringify(record)
            });
        } catch(e) {
            console.error("Error pushing to ntfy cloud:", e);
        }
    };

    window.pullMobileShiftsFromCloud = async function() {
        try {
            const response = await fetch('https://ntfy.sh/dimalcco_shifts_2026_x77/json?poll=1');
            if (!response.ok) return 0;
            const text = await response.text();
            if (!text) return 0;

            const lines = text.trim().split('\n');
            let importedCount = 0;
            let localRecords = JSON.parse(localStorage.getItem('shiftRecords')) || [];

            lines.forEach(line => {
                if (!line.trim()) return;
                try {
                    const ntfyObj = JSON.parse(line);
                    if (ntfyObj.event === 'message' && ntfyObj.message) {
                        const record = JSON.parse(ntfyObj.message);
                        if (record && record.workerName && record.date) {
                            const recWorker = (record.workerName || '').trim().toUpperCase();
                            // Un trabajador puede tener más de un turno el mismo día.
                            // Solo fusionamos el mismo registro, no cualquier turno de esa fecha.
                            if (getDeletedShiftIds().has(String(record.id))) return;

                            const existingIdx = localRecords.findIndex(r =>
                                (r.id && record.id && String(r.id) === String(record.id)) ||
                                ((r.workerName || '').trim().toUpperCase() === recWorker &&
                                 r.date === record.date &&
                                 String(r.opNumber || '') === String(record.opNumber || '') &&
                                 String(r.timeIn || '') === String(record.timeIn || ''))
                            );
                            
                            if (existingIdx !== -1) {
                                const existing = localRecords[existingIdx];
                                if (record.timeOut && !existing.timeOut) {
                                    localRecords[existingIdx] = { ...existing, ...record };
                                    importedCount++;
                                }
                            } else {
                                localRecords.push(record);
                                importedCount++;
                            }
                        }
                    }
                } catch(err) {
                    // Ignore non-json or non-record messages
                }
            });

            if (importedCount > 0) {
                records = localRecords;
                window.records = localRecords;
                saveRecords();
            }

            return importedCount;
        } catch(err) {
            console.error("Error pulling from ntfy cloud:", err);
            return 0;
        }
    };

    // Actualizar los desplegables de selección
    const updateWorkerSelects = () => {
        loadWorkersFromPersonal();
        let sortedWorkers = Array.from(new Set([
            ...Object.keys(FIXED_QUINCENA),
            ...Object.keys(workerRates || {})
        ])).sort();

        const targets = [
            { id: 'workerName', defaultLabel: 'Seleccione un trabajador...' },
            { id: 'tableWorkerFilter', defaultLabel: 'Todos los trabajadores' },
            { id: 'workerFilter', defaultLabel: 'Seleccionar Trabajador...' },
            { id: 'bulkWorkerName', defaultLabel: 'Seleccione un trabajador...' },
            { id: 'qrWorkerSelect', defaultLabel: 'Seleccione un trabajador...' }
        ];

        targets.forEach(t => {
            const el = document.getElementById(t.id);
            if (el) {
                const currentVal = el.value;
                const optionsHtml = `<option value="">${t.defaultLabel}</option>` +
                    sortedWorkers.map(w => `<option value="${w}">${w}</option>`).join('');
                el.innerHTML = optionsHtml;
                if (currentVal && sortedWorkers.includes(currentVal)) {
                    el.value = currentVal;
                }
            }
        });
    };

    updateWorkerSelects();

    const saveRecords = () => {
        localStorage.setItem('shiftRecords', JSON.stringify(records));
        localStorage.setItem('shiftRecords_backup', JSON.stringify(records));
        localStorage.setItem('shiftRecords_initialized', 'true');
        localStorage.setItem('shiftBalances', JSON.stringify(shiftBalances));
        localStorage.setItem('workerRates', JSON.stringify(workerRates));
        window.records = records;
        updateDatalists();
        
        // Disparar sincronización con la nube si el dashboard maestro está presente
        if (window.parent && window.parent !== window) {
            window.parent.postMessage('sync_cloud', '*');
        }
    };

    const normalizeWorkerName = name => name.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ');
    const syncWorkerWithPayrollLists = (name, quincena) => {
        ['dimalcco_nomina_workers_v1', 'dimalcco_publicidad_nomina_workers_v1'].forEach(key => {
            try {
                const saved = JSON.parse(localStorage.getItem(key) || '[]');
                const list = Array.isArray(saved) ? saved : Object.entries(saved).map(([workerName, salary]) => ({ name: workerName, salary }));
                const existing = list.find(worker => normalizeWorkerName(worker.name || '') === normalizeWorkerName(name));
                if (existing) existing.salary = quincena;
                else list.push({ name, salary: quincena });
                localStorage.setItem(key, JSON.stringify(list));
            } catch (error) {
                console.warn(`No se pudo sincronizar la lista ${key}.`, error);
            }
        });
    };

    if (addWorkerButton && addWorkerModal && addWorkerForm) {
        addWorkerButton.addEventListener('click', () => {
            addWorkerForm.reset();
            addWorkerModal.style.display = 'flex';
            addWorkerNameInput.focus();
        });
        cancelAddWorkerButton?.addEventListener('click', () => { addWorkerModal.style.display = 'none'; });
        addWorkerModal.addEventListener('click', event => {
            if (event.target === addWorkerModal) addWorkerModal.style.display = 'none';
        });
        addWorkerForm.addEventListener('submit', event => {
            event.preventDefault();
            const name = addWorkerNameInput.value.trim().toUpperCase().replace(/\s+/g, ' ');
            const normalizedName = normalizeWorkerName(name);
            const quincena = parseAmount(addWorkerQuincenaInput.value);
            if (!name || quincena <= 0) return alert('Ingrese el nombre y un salario quincenal válido.');
            const duplicate = Object.keys(workerRates).some(worker => normalizeWorkerName(worker) === normalizedName);
            if (duplicate) return alert('Esta persona ya está registrada.');

            FIXED_QUINCENA[name] = quincena;
            workerRates[name] = { quincena };
            syncWorkerWithPayrollLists(name, quincena);
            localStorage.setItem('workerRates', JSON.stringify(workerRates));
            updateWorkerSelects();
            saveRecords();
            if (workerNameSelect) workerNameSelect.value = name;
            addWorkerModal.style.display = 'none';
            alert(`${name} quedó registrada con salario quincenal de $${quincena.toLocaleString('es-CO')}.`);
        });
    }

    const updateDatalists = () => {
        const projects = [...new Set(records.map(r => r.projectName))];
        const ops = [...new Set(records.map(r => r.opNumber))];
        if (projectsList) projectsList.innerHTML = projects.map(p => `<option value="${p}">`).join('');
        if (opList) opList.innerHTML = ops.map(o => `<option value="${o}">`).join('');
    };

    const HOLIDAYS = {
        // 2026 Corregido
        "2026-01-01": "Año Nuevo",
        "2026-01-12": "Reyes Magos",
        "2026-03-23": "Día de San José",
        "2026-04-02": "Jueves Santo",
        "2026-04-03": "Viernes Santo",
        "2026-05-01": "Día del Trabajo",
        "2026-05-18": "Ascensión de Jesús",
        "2026-06-08": "Corpus Christi",
        "2026-06-15": "Sagrado Corazón de Jesús",
        "2026-06-29": "San Pedro y San Pablo",
        "2026-07-20": "Día de la Independencia",
        "2026-08-07": "Batalla de Boyacá",
        "2026-08-17": "Asunción de la Virgen",
        "2026-10-12": "Día de la Raza",
        "2026-11-02": "Todos los Santos",
        "2026-11-16": "Independencia de Cartagena",
        "2026-12-08": "Inmaculada Concepción",
        "2026-12-25": "Navidad",

        // 2027 Incorporado
        "2027-01-01": "Año Nuevo",
        "2027-01-11": "Reyes Magos",
        "2027-03-22": "Día de San José",
        "2027-03-25": "Jueves Santo",
        "2027-03-26": "Viernes Santo",
        "2027-05-01": "Día del Trabajo",
        "2027-05-10": "Ascensión de Jesús",
        "2027-05-31": "Corpus Christi",
        "2027-06-07": "Sagrado Corazón de Jesús",
        "2027-07-05": "San Pedro y San Pablo",
        "2027-07-20": "Día de la Independencia",
        "2027-08-07": "Batalla de Boyacá",
        "2027-08-16": "Asunción de la Virgen",
        "2027-10-18": "Día de la Raza",
        "2027-11-01": "Todos los Santos",
        "2027-11-15": "Independencia de Cartagena",
        "2027-12-08": "Inmaculada Concepción",
        "2027-12-25": "Navidad"
    };

    const getDayInfo = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDay();
        const isSunday = (day === 0);
        const holidayName = HOLIDAYS[dateStr];
        const isHoliday = !!holidayName;
        const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][day];
        return { day, dayName, isSunday, isHoliday, holidayName };
    };

    const getOrdinaryHours = (dateStr, location, esMedioDia = false, workerName = '') => {
        const { day, isHoliday } = getDayInfo(dateStr);
        
        // En días festivos la jornada ordinaria es 0 (se paga todo como extra/recargo)
        if (isHoliday) return 0;

        let hours = 0;
        if ((workerName || '').trim().toUpperCase().startsWith('DECCY BAYONA')) {
            if (day >= 1 && day <= 5) hours = 9;
        } else if (location === 'administracion') {
            if (day >= 1 && day <= 5) hours = 10;
        } else if (location === 'obra' || location === 'planta') {
            if (day === 1) hours = 11;
            else if (day >= 2 && day <= 5) hours = 10;
            else if (day === 6) hours = 5;
        } else {
            if (day === 1 || day === 2) hours = 11;
            else if (day >= 3 && day <= 5) hours = 10;
            else if (day === 6) hours = 5;
        }
        return esMedioDia ? hours / 2 : hours;
    };

    const enrichRecordsWithDailyCap = recordsList => {
        const groups = new Map();
        recordsList.forEach(record => {
            delete record._effectiveOrdHours;
            delete record._pendingHours;
            delete record._dayFraction;

            if (record.isTravelRecord) {
                record._effectiveOrdHours = 0;
                record._pendingHours = 0;
                record._dayFraction = 0;
                return;
            }

            const key = `${(record.workerName || '').trim().toUpperCase()}_${record.date}`;
            if (!groups.has(key)) groups.set(key, []);
            groups.get(key).push(record);
        });

        groups.forEach(group => {
            group.sort((a, b) => (a.timeIn || '').localeCompare(b.timeIn || ''));
            const combineHalfShifts = group.length > 1 && group.every(record => record.esMedioDia);
            const targetOrd = Math.max(...group.map(record =>
                getOrdinaryHours(record.date, record.location, combineHalfShifts ? false : !!record.esMedioDia, record.workerName)
            ));
            let allocatedOrd = 0;
            const hasIncapacity = group.some(record => record.absenceReason === 'incapacidad');

            group.forEach((record, index) => {
                const worked = Number.parseFloat(record.totalHours) || 0;
                const effectiveOrd = Math.min(worked, Math.max(0, targetOrd - allocatedOrd));
                allocatedOrd += effectiveOrd;
                record._effectiveOrdHours = effectiveOrd;
                record._pendingHours = 0;
                record._dayFraction = targetOrd > 0 ? effectiveOrd / targetOrd : 0;

                if (index === group.length - 1 && targetOrd > allocatedOrd) {
                    const remainingOrd = targetOrd - allocatedOrd;
                    if (hasIncapacity) {
                        record._dayFraction += remainingOrd / targetOrd;
                    } else {
                        record._pendingHours = remainingOrd;
                        record._dayFraction += record._pendingHours / targetOrd;
                    }
                }
            });
        });

        return recordsList;
    };

    // Completa registros móviles/QR antiguos que no traían la jornada establecida.
    let recordsWereNormalized = false;
    records.forEach(record => {
        const ordinaryHours = Number.parseFloat(record.ordinaryHours);
        if (!Number.isFinite(ordinaryHours)) {
            record.ordinaryHours = record.isTravelRecord
                ? 0
                : getOrdinaryHours(record.date, record.location, !!record.esMedioDia, record.workerName);
            recordsWereNormalized = true;
        }
    });
    if (recordsWereNormalized) saveRecords();

    const getDetailedShiftPay = (record, dynamicRates = null) => {
        const name = (record.workerName || "").trim().toUpperCase();
        
        let safeRates;
        if (dynamicRates) {
            safeRates = dynamicRates;
        } else {
            // Default fallback if called outside of summary/export context
            const quincenaBase = (workerRates[name] && workerRates[name].quincena) ? workerRates[name].quincena : (1750905 / 2);
            safeRates = calculateDynamicRates(quincenaBase, 15);
        }

        const totalHours = parseFloat(record.totalHours) || 0;
        const ordHours = record._effectiveOrdHours !== undefined
            ? record._effectiveOrdHours
            : (parseFloat(record.ordinaryHours) || 0);
        const dayFraction = record._dayFraction !== undefined
            ? record._dayFraction
            : (record.esMedioDia ? 0.5 : 1);
        
        // El pago ordinario base será 1 día completo (o medio si es medio día).
        // Si no hay horas, el detalle valdrá 0.
        let tarifaDiaria = safeRates.dia * dayFraction;
        if ((totalHours === 0 && !record.timeIn && record.absenceReason !== 'incapacidad') || record.isTravelRecord) tarifaDiaria = 0;
        
        if (!record.timeIn && totalHours > 0) {
            console.warn(`Record for ${record.workerName} on ${record.date} has totalHours > 0 but no timeIn. Using 00:00.`);
        }

        const travelHoursQty = parseFloat(record.travelHours) || 0;
        const travelVal = travelHoursQty * safeRates.travel;

        const details = {
            ordPay: tarifaDiaria,
            extDiaQty: 0, extDiaVal: 0,
            recNoctQty: 0, recNoctVal: 0,
            extNoctQty: 0, extNoctVal: 0,
            recDomQty: 0, recDomVal: 0,
            extDomQty: 0, extDomVal: 0,
            travelQty: travelHoursQty, travelVal: travelVal,
            rawPay: tarifaDiaria + travelVal, // Valor sin considerar descuentos por faltantes todavía
            totalShift: tarifaDiaria + travelVal
        };

        if (totalHours === 0) {
            const pending = record.isTravelRecord || record.absenceReason === 'incapacidad' ? 0 : (record._pendingHours !== undefined ? record._pendingHours : ordHours);
            const pendingVal = pending * (safeRates.extDia || 0);
            details.totalShift = details.rawPay - pendingVal;
            return details;
        }

        const [hIn, mIn] = (record.timeIn || "00:00").split(':').map(Number);
        const ratesForCalcs = safeRates;
        const shiftStart = hIn * 60 + mIn;
        const totalMinutes = Math.max(0, Math.round(totalHours * 60));
        const ordinaryMinutes = Math.max(0, Math.round(ordHours * 60));
        const startDate = new Date(`${record.date}T00:00:00`);
        const dateInfoByOffset = new Map();

        if (!record.isTravelRecord) {
            for (let elapsed = 0; elapsed < totalMinutes; elapsed++) {
                const minuteOfDay = ((shiftStart + elapsed) % 1440 + 1440) % 1440;
                const dayOffset = Math.floor((shiftStart + elapsed) / 1440);
                if (!dateInfoByOffset.has(dayOffset)) {
                    const workDate = new Date(startDate);
                    workDate.setDate(workDate.getDate() + dayOffset);
                    const workDateStr = `${workDate.getFullYear()}-${String(workDate.getMonth() + 1).padStart(2, '0')}-${String(workDate.getDate()).padStart(2, '0')}`;
                    dateInfoByOffset.set(dayOffset, getDayInfo(workDateStr));
                }
                const hour = Math.floor(minuteOfDay / 60);
                const isNight = hour >= 21 || hour < 5;
                const { isSunday, isHoliday } = dateInfoByOffset.get(dayOffset);
                const isSunOrHol = isSunday || isHoliday;
                const isOrdinary = elapsed < ordinaryMinutes;
                const minuteQty = 1 / 60;

                if (isOrdinary) {
                    if (isSunOrHol) {
                        details.recDomQty += minuteQty;
                        details.recDomVal += ratesForCalcs.rDom * minuteQty;
                    } else if (isNight) {
                        details.recNoctQty += minuteQty;
                        details.recNoctVal += ratesForCalcs.rNoct * minuteQty;
                    }
                } else if (isSunOrHol) {
                    details.extDomQty += minuteQty;
                    details.extDomVal += ratesForCalcs.extDom * minuteQty;
                } else if (isNight) {
                    details.extNoctQty += minuteQty;
                    details.extNoctVal += ratesForCalcs.extNoct * minuteQty;
                } else {
                    details.extDiaQty += minuteQty;
                    details.extDiaVal += ratesForCalcs.extDia * minuteQty;
                }
            }
        }

        const pending = record.absenceReason === 'incapacidad' ? 0 : (record._pendingHours !== undefined
            ? record._pendingHours
            : Math.max(0, ordHours - totalHours));
        const pendingVal = pending * ratesForCalcs.extDia;

        details.rawPay = details.ordPay + details.extDiaVal + details.recNoctVal + details.extNoctVal + details.recDomVal + details.extDomVal + details.travelVal;
        details.totalShift = details.rawPay - pendingVal;
        return details;
    };

    const renderSummary = () => {
        const worker = (workerFilter ? workerFilter.value : "").trim().toUpperCase();
        if (!worker) {
            payrollSummaryArea.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-tertiary); font-weight: 500;"><i class="ph ph-user-focus" style="font-size: 1.5rem; display: block; margin-bottom: 0.5rem; color: #94a3b8;"></i>Seleccione un trabajador para ver su resumen de nómina.</div>';
            return;
        }

        const selectedMonthStr = filterMonth ? filterMonth.value : '';
        const selectedFortnight = filterFortnight ? filterFortnight.value : '';
        const selMonth = parseInt(selectedMonthStr, 10);

        const workerRecords = records.filter(r => {
            if (typeof r.workerName !== 'string' || typeof r.date !== 'string') return false;
            const sameWorker = (r.workerName || "").trim().toUpperCase() === worker;
            if (!sameWorker) return false;
            
            // Filter by Period (Month/Fortnight)
            const date = r.date; // YYYY-MM-DD
            if (!date) return false;
            const parts = date.split('-');
            if (parts.length < 3) return false;
            
            const rMonth = parseInt(parts[1], 10);
            const rDay = parseInt(parts[2], 10);
            
            if (selectedMonthStr && selectedMonthStr !== "ALL" && rMonth !== selMonth) return false;
            if (selectedFortnight === "1") return rDay <= 15;
            if (selectedFortnight === "2") return rDay > 15;
            return true;
        });

        if (workerRecords.length === 0) {
            const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
            const mName = selectedMonthStr === "ALL" ? "Todos los Meses" : (monthNames[selMonth - 1] || 'este mes');
            const fName = selectedFortnight === "ALL" ? "Todas las Quincenas" : (selectedFortnight === "1" ? '1ª Quincena (1-15)' : '2ª Quincena (16-Fin)');

            payrollSummaryArea.innerHTML = `
                <div style="padding: 2rem 1rem; text-align: center; color: #64748b; background: #ffffff; border-radius: 12px; border: 1.5px dashed #cbd5e1; margin-top: 1rem;">
                    <i class="ph ph-file-x" style="font-size: 2.2rem; color: #94a3b8; display: block; margin: 0 auto 0.5rem auto;"></i>
                    <h3 style="font-size: 1.05rem; font-weight: 700; color: #1e293b; margin-bottom: 0.25rem;">Sin registros en esta quincena</h3>
                    <p style="font-size: 0.88rem; color: #64748b;">El trabajador <strong>${worker}</strong> no tiene turnos guardados para <strong>${mName} - ${fName}</strong>.</p>
                </div>
            `;
            return;
        }

        enrichRecordsWithDailyCap(workerRecords);

        // We calculate equivalent worked days first to determine dynamic daily rate
        const equivalentDays = workerRecords.reduce((acc, r) => acc + (r._dayFraction || 0), 0);
        
        const quincenaBase = (workerRates[worker] && workerRates[worker].quincena) ? workerRates[worker].quincena : (1750905 / 2);
        const rates = calculateDynamicRates(quincenaBase, equivalentDays || 1); 

        const PAYROLL_MODE = payrollModeSelect ? payrollModeSelect.value : 'cross'; // 'cross', 'partial', 'immediate', 'defer'
        const currentBalance = shiftBalances[worker] || 0; 

        // Reset manual cross if worker changed
        if (window.lastRenderedWorker !== worker) {
            window.manualCrossHoursVal = 0;
            window.lastRenderedWorker = worker;
        }

        let aggregate = {
            totalDays: new Set(workerRecords.filter(r => !r.isTravelRecord).map(r => r.date)).size,
            extDia: { q: 0, v: 0 }, rNoct: { q: 0, v: 0 }, extNoct: { q: 0, v: 0 },
            rDom: { q: 0, v: 0 }, extDom: { q: 0, v: 0 }, travel: { q: 0, v: 0 },
            totalExtraMoney: 0,
            totalPendingHours: { q: 0, v: 0 },
            ops: {}
        };

        workerRecords.forEach(r => {
            const d = getDetailedShiftPay(r, rates);
            if (!d) return;
            
            aggregate.extDia.q += d.extDiaQty; aggregate.extDia.v += d.extDiaVal;
            aggregate.rNoct.q += d.recNoctQty; aggregate.rNoct.v += d.recNoctVal;
            aggregate.extNoct.q += d.extNoctQty; aggregate.extNoct.v += d.extNoctVal;
            aggregate.rDom.q += d.recDomQty; aggregate.rDom.v += d.recDomVal;
            aggregate.extDom.q += d.extDomQty; aggregate.extDom.v += d.extDomVal;
            aggregate.travel.q += d.travelQty; aggregate.travel.v += d.travelVal;
            
            aggregate.totalExtraMoney += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);

            const pending = r.isTravelRecord ? 0 : (r._pendingHours || 0);
            const pendingVal = pending * rates.extDia;
            aggregate.totalPendingHours.q += pending;
            aggregate.totalPendingHours.v += pendingVal;

            const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
            if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
            aggregate.ops[opKey].days += r._dayFraction || 0;
            aggregate.ops[opKey].extra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);
            aggregate.ops[opKey].pending += pendingVal;
        });

        const baseAsignada = rates.quincena;
        
        // --- Lógica de Cobro y Saldos ---
        let finalExtraPay = 0;
        let finalDeduction = 0;
        let crossingDetailHtml = '';
        let balanceOutcomeQty = 0;
        let newAccruedBalance = 0;

        const totalMissingThisPeriod = aggregate.totalPendingHours.q; // Lo que debe hoy
        const totalExtrasThisPeriod = aggregate.extDia.q + aggregate.extNoct.q + aggregate.extDom.q; // Lo que tiene hoy
        
        // Consideramos la deuda que viene de atrás para el cruce
        const globalDebtQty = totalMissingThisPeriod + Math.max(0, -currentBalance);
        const globalCreditQty = totalExtrasThisPeriod + Math.max(0, currentBalance);

        if (PAYROLL_MODE === 'cross') {
            // Cruce 1:1 Tiempo recordado + hoy
            balanceOutcomeQty = totalExtrasThisPeriod - totalMissingThisPeriod;
            
            if (balanceOutcomeQty >= 0) {
                // Sobran extras. Se compensan todas las faltas de hoy.
                finalExtraPay = Math.max(0, aggregate.totalExtraMoney - aggregate.totalPendingHours.v);
                finalDeduction = 0;
                crossingDetailHtml = `<div style="color: var(--color-success); font-size: 0.8rem; margin-top: 4px;">✅ Se compensaron ${totalMissingThisPeriod.toFixed(1)}h faltantes con tiempo extra.</div>`;
            } else {
                // No alcanzan las extras de hoy.
                finalExtraPay = 0; 
                const remainingMissing = totalMissingThisPeriod - totalExtrasThisPeriod;
                finalDeduction = remainingMissing * rates.extDia;
                crossingDetailHtml = `<div style="color: var(--color-danger); font-size: 0.8rem; margin-top: 4px;">⚠️ Saldo pendiente: ${remainingMissing.toFixed(1)}h tras cruzar con extras hoy.</div>`;
            }
        } 
        else if (PAYROLL_MODE === 'cross_defer') {
            // CRUZAR Y DIFERIR: Cruza lo que puede hoy, y lo que sobra lo guarda para después (sin descontar dinero)
            const compQty = Math.min(totalExtrasThisPeriod, totalMissingThisPeriod);
            const remainingDebt = totalMissingThisPeriod - compQty;
            
            finalExtraPay = Math.max(0, aggregate.totalExtraMoney - (compQty * rates.extDia)); 
            finalDeduction = 0; // NO se descuenta dinero
            newAccruedBalance = currentBalance - remainingDebt;

            crossingDetailHtml = `
                <div style="color: #854d0e; font-size: 0.8rem; margin-top: 4px; font-weight: 600;">
                    🔄 Cruzado: ${compQty.toFixed(1)}h | 📌 Diferido a cuenta: ${remainingDebt.toFixed(1)}h
                    <button onclick="applyNewBalance('${worker}', ${newAccruedBalance})" style="background: var(--color-warning); color: black; border:none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 0.7rem; margin-left: 5px;">Anotar en Cuenta</button>
                </div>`;
        }
        else if (PAYROLL_MODE === 'partial') {
            // Cruce manual definido por el usuario
            const manualQty = parseFloat(window.manualCrossHoursVal) || 0;
            // No podemos cruzar más de lo que hay de extras o de lo que se debe
            const compQty = Math.min(manualQty, totalExtrasThisPeriod, totalMissingThisPeriod);
            
            // Valor de las horas compensadas (extra diurna como base)
            const compVal = compQty * rates.extDia;
            
            finalExtraPay = Math.max(0, aggregate.totalExtraMoney - compVal);
            finalDeduction = (totalMissingThisPeriod - compQty) * rates.extDia;
            
            crossingDetailHtml = `
                <div style="color: var(--color-accent-primary); font-size: 0.8rem; margin-top: 4px;">
                    🔢 Cruzar manualmente: 
                    <input type="number" id="inputManualQty" value="${manualQty}" step="0.5" min="0" 
                           style="width: 60px; font-weight: 700; border: 1px solid #94a3b8; border-radius: 4px; padding: 2px 4px; color: var(--color-accent-primary);"
                           onfocus="this.select()"
                           onchange="window.manualCrossHoursVal = this.value; renderSummary();"> <strong>h</strong>
                    <br><small>✅ Compensadas: ${compQty.toFixed(1)}h | ❌ Sin cruzar: ${(totalMissingThisPeriod - compQty).toFixed(1)}h</small>
                </div>`;
        }
        else if (PAYROLL_MODE === 'immediate') {
            // Se paga todo lo extra y se descuenta todo lo faltante (Sin cruce)
            finalExtraPay = aggregate.totalExtraMoney;
            finalDeduction = aggregate.totalPendingHours.v;
            crossingDetailHtml = `<div style="color: var(--color-text-secondary); font-size: 0.8rem; margin-top: 4px;">ℹ️ Pago y descuento total aplicado sin cruce de tiempo.</div>`;
        }
        else if (PAYROLL_MODE === 'defer') {
            // Diferir: Se pagan todas las extras, y las faltantes NO se descuentan, se guardan como deuda.
            finalExtraPay = aggregate.totalExtraMoney;
            finalDeduction = 0;
            newAccruedBalance = currentBalance - totalMissingThisPeriod; 
            crossingDetailHtml = `
                <div style="color: #854d0e; font-size: 0.8rem; margin-top: 4px; font-weight: 600;">
                    📌 ${totalMissingThisPeriod.toFixed(1)}h guardadas para el futuro. 
                    <button onclick="applyNewBalance('${worker}', ${newAccruedBalance})" style="background: var(--color-warning); color: black; border:none; padding: 2px 6px; border-radius: 4px; cursor: pointer; font-size: 0.7rem; margin-left: 5px;">Anotar en Cuenta</button>
                </div>`;
        }

        const finalTotalToPay = baseAsignada + finalExtraPay - finalDeduction;

        payrollSummaryArea.innerHTML = `
            <div class="payroll-card" id="summaryCapture">
                <div class="payroll-header">
                    <div>Resumen de Nómina: ${worker}</div>
                    <div style="font-size: 0.8rem; font-weight: normal; opacity: 0.8;">Modo: ${PAYROLL_MODE.toUpperCase()}</div>
                </div>
                
                <div style="display: flex; gap: 10px; padding: 10px 1.5rem; background: #fffbeb; border-bottom: 1px solid #fef3c7;">
                    <div style="font-size: 0.85rem;"><strong>Saldo en Cuenta:</strong> <span style="color: ${currentBalance < 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${currentBalance.toFixed(1)}h</span></div>
                    <div style="font-size: 0.85rem; border-left: 1px solid #fde68a; padding-left: 10px;"><strong>Deuda hoy:</strong> ${totalMissingThisPeriod.toFixed(1)}h</div>
                </div>
                
                <div class="payroll-row" style="background: #fdfdfd; font-weight: 700;">
                    <div class="payroll-cell label">CONCEPTO</div>
                    <div class="payroll-cell label" style="text-align: center;">VALOR UNIT.</div>
                    <div class="payroll-cell label" style="text-align: center;">CANTIDAD</div>
                    <div class="payroll-cell label" style="text-align: right;">TOTAL</div>
                </div>

                <div class="payroll-row">
                    <div class="payroll-cell">DÍAS LABORADOS (BASE ASIGNADA)</div>
                    <div class="payroll-cell value">${equivalentDays} días</div> 
                    <div class="payroll-cell value">Valor Día: $${Math.round(rates.dia).toLocaleString()}</div>
                    <div class="payroll-cell value">$${Math.round(baseAsignada).toLocaleString()}</div>
                </div>

                ${[
                    ['HORA EXTRA DIURNA', rates.extDia, aggregate.extDia],
                    ['RECARGO NOCTURNO ORDINARIO (9PM - 5AM)', rates.rNoct, aggregate.rNoct],
                    ['HORA EXTRA NOCTURNA', rates.extNoct, aggregate.extNoct],
                    ['RECARGO DOMINICAL / FESTIVO', rates.rDom, aggregate.rDom],
                    ['HORA EXTRA DOMINICAL / FESTIVA', rates.extDom, aggregate.extDom]
                ].map(([label, rate, item]) => `
                    <div class="payroll-row">
                        <div class="payroll-cell">${label}</div>
                        <div class="payroll-cell value">$${rate.toLocaleString()}</div>
                        <div class="payroll-cell value">${item.q.toFixed(1)} h</div>
                        <div class="payroll-cell value">$${item.v.toLocaleString()}</div>
                    </div>
                `).join('')}

                <div class="payroll-row">
                    <div class="payroll-cell">HORAS DE VIAJE</div>
                    <div class="payroll-cell value">$${rates.travel.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.travel.q.toFixed(1)} h</div>
                    <div class="payroll-cell value">$${aggregate.travel.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row" style="color: ${aggregate.totalPendingHours.q > 0 ? '#dc2626' : 'inherit'}">
                    <div class="payroll-cell">HORAS NO LABORADAS (FALTANTES)</div>
                    <div class="payroll-cell value">$${rates.extDia.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.totalPendingHours.q.toFixed(1)} h</div>
                    <div class="payroll-cell value">-$${aggregate.totalPendingHours.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row" style="background: #fdfdfd; font-weight: 700;">
                    <div class="payroll-cell label">RESULTADO GESTIÓN DE TIEMPO</div>
                    <div class="payroll-cell" colspan="2">${crossingDetailHtml}</div>
                    <div class="payroll-cell value" style="font-weight: 700;">$${(finalExtraPay - finalDeduction).toLocaleString()}</div>
                </div>

                <div class="payroll-row payroll-total-row" style="background: #e2e8f0; font-size: 1.1rem;">
                    <div class="payroll-cell">TOTAL A PAGAR TOTAL</div>
                    <div class="payroll-cell"></div><div class="payroll-cell"></div>
                    <div class="payroll-cell value">$${finalTotalToPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
                </div>

                <div style="padding: 1.5rem;">
                    <h3 style="font-size: 0.9rem; margin-bottom: 0.75rem;">Desglose por Orden de Producción (OP)</h3>
                    <table class="op-summary-table">
                        <thead>
                            <tr>
                                <th>OP | Proyecto</th>
                                <th>Ubicación</th>
                                <th>Días (Equiv)</th>
                                <th>Asignación Base + Extras</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.entries(aggregate.ops).map(([op, info]) => {
            const daysCount = info.days;
            const basePart = rates.dia * daysCount;
            const opTotal = basePart + info.extra - info.pending;
            return `
                                    <tr>
                                        <td>${op}</td>
                                        <td>${info.location.toUpperCase()}</td>
                                        <td>${daysCount}</td>
                                        <td style="font-weight: 700;">$${Math.round(opTotal).toLocaleString()} ${info.pending > 0 ? `<br><small style="color: #dc2626; font-weight: normal;">(Descuento: -$${Math.round(info.pending).toLocaleString()})</small>` : ''}</td>
                                    </tr>
                                `;
        }).join('')}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8fafc; font-weight: 700;">
                                <td colspan="2">TOTAL</td>
                                <td>${equivalentDays}</td>
                                <td>$${finalTotalToPay.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    };

    const renderTable = () => {
        tableBody.innerHTML = '';
        const workerToFilter = tableWorkerFilter ? tableWorkerFilter.value : '';
        const selectedMonthStr = filterMonth ? filterMonth.value : '';
        const selectedFortnight = filterFortnight ? filterFortnight.value : '';
        const selMonth = parseInt(selectedMonthStr, 10);

        const recordsToDisplay = records.filter(r => {
            // Protección contra datos corruptos (si se guardó un objeto DOM por error)
            if (typeof r.workerName !== 'string' || typeof r.date !== 'string') return false;

            const sameWorker = workerToFilter ? (r.workerName || '').trim().toUpperCase() === workerToFilter.trim().toUpperCase() : true;
            if (!sameWorker) return false;

            const date = r.date;
            if (!date) return false;
            const parts = date.split('-');
            if (parts.length < 3) return false;

            const rMonth = parseInt(parts[1], 10);
            const rDay = parseInt(parts[2], 10);

            if (selectedMonthStr && selectedMonthStr !== "ALL" && rMonth !== selMonth) return false;
            if (selectedFortnight === "1") return rDay <= 15;
            if (selectedFortnight === "2") return rDay > 15;
            return true;
        });

        enrichRecordsWithDailyCap(recordsToDisplay);

        if (recordsToDisplay.length === 0) {
            const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
            const mName = selectedMonthStr === "ALL" ? "Todos los Meses" : (monthNames[selMonth - 1] || 'este mes');
            const fName = selectedFortnight === "ALL" ? "Todas las Quincenas" : (selectedFortnight === "1" ? "1ª Quincena (1-15)" : "2ª Quincena (16-Fin)");

            tableBody.innerHTML = `
                <tr>
                    <td colspan="13" style="text-align: center; padding: 2.5rem 1rem; color: #64748b; background: #f8fafc;">
                        <i class="ph ph-calendar-x" style="font-size: 2.2rem; color: #cbd5e1; display: block; margin: 0 auto 0.5rem auto;"></i>
                        <strong style="font-size: 1.05rem; color: #1e293b; display: block; margin-bottom: 0.25rem;">
                            No hay turnos registrados ${workerToFilter ? `para <strong>${workerToFilter}</strong>` : ''}
                        </strong>
                        <span style="font-size: 0.85rem; color: #64748b;">
                            Filtro activo: <strong>${mName}</strong> (${fName}). 
                            ${workerToFilter ? 'Cambie de trabajador o seleccione <em>"Todos los trabajadores"</em> para ver otros registros.' : 'Utilice "Registrar Turno" o "Cargar Quincena Completa" para añadir registros.'}
                        </span>
                    </td>
                </tr>
            `;
            updateBulkSelectionState();
            return;
        }

        recordsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((rec) => {
            const ordinaryHours = rec._effectiveOrdHours || 0;
            const totalHours = Number.parseFloat(rec.totalHours) || 0;
            const extras = Math.max(0, totalHours - ordinaryHours).toFixed(2);
            const pending = (rec._pendingHours || 0).toFixed(2);
            const diffDisplay = extras > 0 ? `<span style="color: var(--color-success)">+${extras}h</span>` :
                pending > 0 ? `<span style="color: var(--color-danger)">-${pending}h</span>` : '-';

            const { dayName, isHoliday, holidayName } = getDayInfo(rec.date);
            const detail = getDetailedShiftPay(rec) || { recNoctQty: 0, totalShift: 0, ordPay: 0, extDiaQty: 0, extDiaVal: 0, recNoctVal: 0, extNoctQty: 0, extNoctVal: 0, recDomQty: 0, recDomVal: 0, extDomQty: 0, extDomVal: 0 };

            const isFalta = (parseFloat(rec.totalHours) === 0 && !rec.isTravelRecord);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="no-print" style="text-align: center;"><input type="checkbox" class="record-select" data-record-id="${String(rec.id)}" title="Seleccionar registro"></td>
                <td>
                    <strong>${rec.workerName}</strong>
                    <div style="font-size: 0.75rem; color: var(--color-accent-primary);">OP: ${rec.opNumber || '-'}</div>
                </td>
                <td>${dayName}</td>
                <td>
                    <div style="font-weight: 600;">${rec.date}</div>
                    ${isHoliday ? `<span class="badge" style="background:#fef08a; color:#854d0e; font-size:0.6rem; padding: 1px 4px; margin-top: 2px; display: inline-block;">FESTIVO: ${holidayName}</span>` : ''}
                </td>
                <td>
                    <span class="badge badge-${rec.location}">${(rec.location || '').toUpperCase()}</span>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">${rec.projectName || '-'}</div>
                    ${rec.esMedioDia && !rec.isTravelRecord ? '<span class="badge" style="background: #fef08a; color: #854d0e; margin-top: 4px;"> MEDIO DÍA </span>' : ''}
                    ${isFalta ? `<span class="badge" style="background: ${rec.absenceReason && rec.absenceReason !== 'injustificada' ? '#fef3c7' : '#fee2e2'}; color: ${rec.absenceReason && rec.absenceReason !== 'injustificada' ? '#92400e' : '#991b1b'}; margin-top: 4px;">${({ permiso: 'PERMISO', calamidad: 'CALAMIDAD DOMÉSTICA', incapacidad: 'INCAPACIDAD' })[rec.absenceReason] || 'FALTA INJUSTIFICADA'}</span>` : ''}
                    ${rec.isTravelRecord ? '<span class="badge" style="background: #e0e7ff; color: #4338ca; margin-top: 4px;"> VIAJE </span>' : ''}
                </td>
                <td><small>${isFalta ? 'N/A' : `${rec.timeIn || ''} - ${rec.timeOut || ''}`}</small></td>
                <td>
                    <span class="badge" style="background: #f1f5f9">${rec.isTravelRecord ? 'Viaje' : ((detail.recNoctQty > 0 || detail.extNoctQty > 0) ? 'Nocturno' : 'Diurno')}</span>
                    ${detail.recNoctQty > 0 ? `<div style="font-size:0.7rem; color:#475569; margin-top:3px;">Recargo: ${detail.recNoctQty.toFixed(2)} h ($${detail.recNoctVal.toLocaleString()})</div>` : ''}
                    ${detail.extNoctQty > 0 ? `<div style="font-size:0.7rem; color:#475569; margin-top:3px;">Extra nocturna: ${detail.extNoctQty.toFixed(2)} h ($${detail.extNoctVal.toLocaleString()})</div>` : ''}
                </td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : ordinaryHours + 'h'}</td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? (Number.parseFloat(rec.travelHours) || 0) + 'h' : totalHours + 'h'}</td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : diffDisplay}</td>
                <td><small>${rec.observations || '-'}</small></td>
                <td style="font-weight: 800; color: var(--color-success)">$${detail.totalShift.toLocaleString()}</td>
                <td class="no-pdf">
                    <button type="button" data-record-action="edit" data-record-id="${String(rec.id).replace(/&/g, '&amp;').replace(/\"/g, '&quot;')}" title="Editar turno" aria-label="Editar turno" style="background:none; border:none; color:var(--color-accent-primary); cursor:pointer; margin-right: 10px;">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button type="button" data-record-action="delete" data-record-id="${String(rec.id).replace(/&/g, '&amp;').replace(/\"/g, '&quot;')}" title="Eliminar turno" aria-label="Eliminar turno" style="background:none; border:none; color:var(--color-danger); cursor:pointer;">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

        updateBulkSelectionState();

        // Populate filter with actual workers from records if not already populated correctly
        const uniqueWorkersInRecords = [...new Set(records.map(r => r.workerName))];
        if (uniqueWorkersInRecords.length > 0 && !workerFilter.value) {
            // Optional: Auto-select if there's only one worker
            if (uniqueWorkersInRecords.length === 1) {
                workerFilter.value = uniqueWorkersInRecords[0];
            }
        }

        renderSummary();
    };

    function updateBulkSelectionState() {
        const checkboxes = [...document.querySelectorAll('.record-select')];
        const selected = checkboxes.filter(input => input.checked);
        if (selectedRecordsCount) selectedRecordsCount.textContent = `(${selected.length})`;
        if (btnDeleteSelected) btnDeleteSelected.disabled = selected.length === 0;
        if (selectAllRecords) {
            selectAllRecords.checked = checkboxes.length > 0 && selected.length === checkboxes.length;
            selectAllRecords.indeterminate = selected.length > 0 && selected.length < checkboxes.length;
        }
    }

    document.addEventListener('change', event => {
        if (event.target.matches('.record-select')) updateBulkSelectionState();
    });

    if (selectAllRecords) {
        selectAllRecords.addEventListener('change', () => {
            document.querySelectorAll('.record-select').forEach(input => {
                input.checked = selectAllRecords.checked;
            });
            updateBulkSelectionState();
        });
    }

    if (btnDeleteSelected) {
        btnDeleteSelected.addEventListener('click', () => {
            const selectedIds = new Set(
                [...document.querySelectorAll('.record-select:checked')].map(input => String(input.dataset.recordId))
            );
            if (!selectedIds.size) return;
            if (!confirm(`¿Borrar ${selectedIds.size} registro(s) seleccionado(s)? Esta acción no se puede deshacer.`)) return;

            markShiftRecordsDeleted([...selectedIds]);
            records = records.filter(record => !selectedIds.has(String(record.id)));
            saveRecords();
            renderTable();
            renderSummary();
        });
    }

    window.editRecord = (id) => {
        const rec = records.find(r => String(r.id) === String(id));
        if (!rec) return;
        document.getElementById('workerName').value = rec.workerName;
        document.getElementById('date').value = rec.date;
        document.getElementById('location').value = rec.location;
        document.getElementById('projectName').value = rec.projectName;
        document.getElementById('opNumber').value = rec.opNumber || '';
        document.getElementById('timeIn').value = rec.timeIn || '';
        document.getElementById('timeOut').value = rec.timeOut || '';
        if (recordTypeSelect) {
            recordTypeSelect.value = rec.isTravelRecord ? 'travel' : 'regular';
        }

        const isFalta = rec.totalHours == 0 && !rec.isTravelRecord;
        if (absenceReasonSelect) absenceReasonSelect.value = rec.absenceReason || 'injustificada';
        if (isHalfDayCheckbox) isHalfDayCheckbox.checked = rec.esMedioDia === true;
        if (isAbsentCheckbox) {
            isAbsentCheckbox.checked = isFalta;
            document.getElementById('timeIn').disabled = isFalta;
            document.getElementById('timeOut').disabled = isFalta;
        }
        syncAbsenceReasonVisibility();

        editIdInput.value = rec.id;
        btnSubmit.innerHTML = '<i class="ph ph-check-circle"></i> Actualizar Turno';
        btnSubmit.style.background = 'var(--color-warning)';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteRecord = (id) => {
        if (confirm('¿Eliminar registro?')) {
            markShiftRecordsDeleted([id]);
            records = records.filter(r => String(r.id) !== String(id));
            saveRecords();
            renderTable();
        }
    };

    if (tableBody) {
        tableBody.addEventListener('click', event => {
            const button = event.target.closest('[data-record-action]');
            if (!button || !tableBody.contains(button)) return;
            const { recordAction, recordId } = button.dataset;
            if (recordAction === 'edit') window.editRecord(recordId);
            if (recordAction === 'delete') window.deleteRecord(recordId);
        });
    }

    hourForm.onsubmit = (e) => {
        e.preventDefault();
        const workerName = document.getElementById('workerName').value;
        const date = document.getElementById('date').value;
        const location = document.getElementById('location').value;
        const projectName = document.getElementById('projectName').value;
        const opNumber = document.getElementById('opNumber').value;
        const timeIn = document.getElementById('timeIn').value;
        const timeOut = document.getElementById('timeOut').value;
        const observations = document.getElementById('observations').value;
        const isTravelRecord = recordTypeSelect ? (recordTypeSelect.value === 'travel') : false;

        const esMedioDia = isHalfDayCheckbox ? isHalfDayCheckbox.checked : false;
        const esFalta = isAbsentCheckbox ? isAbsentCheckbox.checked : false;
        const absenceReason = esFalta && absenceReasonSelect ? absenceReasonSelect.value : '';

        let totalHours = "0.00";
        let travelHoursCount = 0;
        let finalTimeIn = timeIn;
        let finalTimeOut = timeOut;

        if (esFalta && !isTravelRecord) {
            totalHours = "0.00";
            finalTimeIn = "";
            finalTimeOut = "";
        } else {
            if (!timeIn || !timeOut) return alert("Debe ingresar horas de entrada y salida (a menos que sea Falta).");
            const [hIn, mIn] = timeIn.split(':').map(Number);
            const [hOut, mOut] = timeOut.split(':').map(Number);
            
            if (isNaN(hIn) || isNaN(mIn) || isNaN(hOut) || isNaN(mOut)) {
                return alert("Formato de hora inválido. Use HH:MM");
            }

            let diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
            if (diff < 0 && hOut < 24) diff += 24 * 60;
            
            if (isTravelRecord) {
                travelHoursCount = parseFloat((diff / 60).toFixed(2));
                totalHours = "0.00";
            } else {
                totalHours = (diff / 60).toFixed(2);
                travelHoursCount = 0;
            }
        }

        const ordinaryHours = isTravelRecord ? 0 : getOrdinaryHours(date, location, esMedioDia, workerName);

        const editedRecord = editIdInput.value
            ? records.find(record => String(record.id) === String(editIdInput.value))
            : null;
        if (editIdInput.value && !editedRecord) return alert('No se encontró el turno que intenta actualizar. Recargue la tabla e inténtelo nuevamente.');
        const recordData = {
            id: editedRecord ? editedRecord.id : Date.now(),
            workerName, date, location, projectName, opNumber, timeIn: finalTimeIn, timeOut: finalTimeOut, totalHours, ordinaryHours, esMedioDia: isTravelRecord ? false : esMedioDia, travelHours: travelHoursCount, isTravelRecord, observations, absenceReason
        };

        if (editIdInput.value) {
            const index = records.findIndex(r => String(r.id) === String(editIdInput.value));
            if (index !== -1) {
                records[index] = recordData;
            }
            editIdInput.value = '';
            btnSubmit.innerHTML = '<i class="ph ph-plus-circle"></i> Registrar Turno';
            btnSubmit.style.background = 'var(--color-accent-primary)';
        } else {
            records.push(recordData);
        }
        saveRecords();

        // Auto-sincronizar filtros con la fecha del registro para que sea visible
        if (date) {
            const parts = date.split('-');
            if (parts.length >= 3) {
                const recMonth = parts[1];
                const recDay = parseInt(parts[2]);
                if (filterMonth) filterMonth.value = recMonth;
                if (filterFortnight) filterFortnight.value = recDay <= 15 ? "1" : "2";
            }
        }

        renderTable();
        hourForm.reset();
        inputDate.valueAsDate = new Date();

        // Notificación NO bloqueante (el alert() bloqueaba el repintado de la tabla)
        const toast = document.createElement('div');
        toast.textContent = '✅ Turno registrado correctamente';
        toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    exportPdfBtn.onclick = () => {
        if (typeof html2pdf === 'undefined') return alert('La librería de PDF todavía se está cargando. Intente de nuevo en un momento.');
        const element = document.getElementById('printableArea');
        const opt = {
            margin: 0.5,
            filename: 'Registros_Turnos.pdf',
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
        };
        const actions = document.querySelectorAll('.no-pdf');
        actions.forEach(a => a.style.display = 'none');
        html2pdf().set(opt).from(element).save().then(() => actions.forEach(a => a.style.display = ''));
    };

    if (btnGlobalSave) {
        btnGlobalSave.onclick = () => {
            saveRecords();
            // Notificación visual de guardado
            const toast = document.createElement('div');
            toast.innerHTML = '<i class="ph ph-floppy-disk"></i> Cambios guardados correctamente';
            toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);
        };
    }

    // --- 7. Event Listeners y Exportación Definitiva ---
    // Sincronizador bidireccional de trabajador entre filtros y detección de periodo
    const syncWorkerSelection = (selectedWorker, source) => {
        const workerUpper = (selectedWorker || '').trim().toUpperCase();
        
        // Mantener sincronizados ambos selectores
        if (source !== 'table' && tableWorkerFilter && tableWorkerFilter.value !== selectedWorker) {
            tableWorkerFilter.value = selectedWorker;
        }
        if (source !== 'summary' && workerFilter && workerFilter.value !== selectedWorker) {
            workerFilter.value = selectedWorker;
        }

        // Si se seleccionó un trabajador específico (no todos)
        if (workerUpper) {
            const currentSelMonth = parseInt(filterMonth ? filterMonth.value : '0', 10);
            const currentSelFortnight = filterFortnight ? filterFortnight.value : '1';

            const hasCurrentRecords = records.some(r => {
                if (!r.workerName || !r.date) return false;
                if (r.workerName.trim().toUpperCase() !== workerUpper) return false;
                const parts = r.date.split('-');
                if (parts.length < 3) return false;
                const rM = parseInt(parts[1], 10);
                const rD = parseInt(parts[2], 10);
                const isF1 = rD <= 15;
                return rM === currentSelMonth && ((currentSelFortnight === "1" && isF1) || (currentSelFortnight === "2" && !isF1));
            });

            // Si NO tiene registros en el periodo seleccionado actualmente, buscar su periodo con datos
            if (!hasCurrentRecords) {
                const workerAllRecords = records.filter(r => r.workerName && r.workerName.trim().toUpperCase() === workerUpper && r.date);
                if (workerAllRecords.length > 0) {
                    workerAllRecords.sort((a, b) => new Date(b.date) - new Date(a.date));
                    const latestDate = workerAllRecords[0].date;
                    const parts = latestDate.split('-');
                    if (parts.length >= 3) {
                        const newMonth = parts[1].padStart(2, '0');
                        const newDay = parseInt(parts[2], 10);
                        const newFortnight = newDay <= 15 ? "1" : "2";

                        if (filterMonth) filterMonth.value = newMonth;
                        if (filterFortnight) filterFortnight.value = newFortnight;

                        const monthNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                        const mName = monthNames[parseInt(newMonth, 10) - 1] || newMonth;
                        
                        const toast = document.createElement('div');
                        toast.innerHTML = `📅 Periodo ajustado a <strong>${mName} (${newFortnight === "1" ? "1ª Quincena" : "2ª Quincena"})</strong> para <strong>${workerUpper}</strong>`;
                        toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0284c7;color:white;padding:10px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 4000);
                    }
                }
            }
        }

        renderTable();
        renderSummary();
    };

    // Inicializar filtros con el periodo de los registros más recientes (o la fecha actual)
    const today = new Date();
    let currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    let currentFortnight = today.getDate() <= 15 ? "1" : "2";

    if (records && records.length > 0) {
        const sorted = [...records].filter(r => r.date).sort((a, b) => new Date(b.date) - new Date(a.date));
        if (sorted.length > 0) {
            const latestDate = sorted[0].date;
            const parts = latestDate.split('-');
            if (parts.length >= 3) {
                currentMonth = parts[1].padStart(2, '0');
                const day = parseInt(parts[2], 10);
                currentFortnight = day <= 15 ? "1" : "2";
            }
        }
    }

    if (filterMonth) filterMonth.value = currentMonth;
    if (filterFortnight) filterFortnight.value = currentFortnight;

    if (tableWorkerFilter) {
        tableWorkerFilter.addEventListener('change', () => {
            syncWorkerSelection(tableWorkerFilter.value, 'table');
        });
    }

    if (workerFilter) {
        workerFilter.addEventListener('change', () => {
            syncWorkerSelection(workerFilter.value, 'summary');
        });
    }

    if (payrollModeSelect) {
        payrollModeSelect.addEventListener('change', () => {
            renderSummary();
        });
    }

    window.applyNewBalance = (worker, newVal) => {
        if (confirm(`¿Mandar ${Math.abs(newVal - (shiftBalances[worker] || 0)).toFixed(1)}h a la cuenta de ${worker}? (Saldo final: ${newVal.toFixed(1)}h)`)) {
            shiftBalances[worker] = newVal;
            saveRecords();
            renderSummary();
        }
    };

    if (filterMonth) {
        filterMonth.addEventListener('change', () => {
            renderTable();
            renderSummary();
        });
    }

    if (filterFortnight) {
        filterFortnight.addEventListener('change', () => {
            renderTable();
            renderSummary();
        });
    }

    if (exportSummaryBtn) {
        exportSummaryBtn.onclick = () => {
            const worker = workerFilter.value;
            if (!worker) return alert('¡Atención! Debe seleccionar un trabajador en el Resumen de Nómina (abajo) antes de exportar.');

            if (typeof XLSX === 'undefined') {
                return alert('Error: La librería Excel no cargó. Por favor refresque la página (F5).');
            }

            const selectedMonth = filterMonth.value;
            const selectedFortnight = filterFortnight.value;

            const workerRecords = records.filter(r => {
                const sameWorker = (r.workerName || '').trim().toUpperCase() === worker.trim().toUpperCase();
                if (!sameWorker) return false;
                
                const parts = (r.date || "").split('-');
                if (parts.length < 3) return false;
                const rMonth = parts[1];
                const rDay = parseInt(parts[2]);
                
                if (rMonth !== selectedMonth) return false;
                if (selectedFortnight === "1") return rDay <= 15;
                return rDay > 15;
            });
            
            if (workerRecords.length === 0) return alert('No hay registros para este trabajador en el periodo seleccionado (Mes/Quincena).');

            enrichRecordsWithDailyCap(workerRecords);
            const equivalentDays = workerRecords.reduce((acc, r) => acc + (r._dayFraction || 0), 0);
            const quincenaBase = (workerRates[worker] && workerRates[worker].quincena) ? workerRates[worker].quincena : (1750905 / 2);
            const rates = calculateDynamicRates(quincenaBase, equivalentDays || 1);

            const wb = XLSX.utils.book_new();

            // 1. Crear Hoja de Resumen (Nómina)
            // Aquí replicamos la lógica de renderSummary para obtener los totales
            let aggregate = {
                extDia: { q: 0, v: 0 }, rNoct: { q: 0, v: 0 }, extNoct: { q: 0, v: 0 },
                rDom: { q: 0, v: 0 }, extDom: { q: 0, v: 0 }, travel: { q: 0, v: 0 }, totalExtra: 0,
                pendingHours: { q: 0, v: 0 }, ops: {}
            };

            workerRecords.forEach(r => {
                const d = getDetailedShiftPay(r, rates);
                if (!d) return;
                aggregate.extDia.q += d.extDiaQty; aggregate.extDia.v += d.extDiaVal;
                aggregate.rNoct.q += d.recNoctQty; aggregate.rNoct.v += d.recNoctVal;
                aggregate.extNoct.q += d.extNoctQty; aggregate.extNoct.v += d.extNoctVal;
                aggregate.rDom.q += d.recDomQty; aggregate.rDom.v += d.recDomVal;
                aggregate.extDom.q += d.extDomQty; aggregate.extDom.v += d.extDomVal;
                aggregate.travel.q += d.travelQty; aggregate.travel.v += d.travelVal;
                aggregate.totalExtra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);

                const pending = r._pendingHours || 0;
                const pendingVal = pending * rates.extDia;
                aggregate.pendingHours.q += pending;
                aggregate.pendingHours.v += pendingVal;

                const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
                if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
                aggregate.ops[opKey].days += r._dayFraction || 0;
                aggregate.ops[opKey].extra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);
                aggregate.ops[opKey].pending += pendingVal;
            });

            const baseAsignada = rates.quincena;
            let finalExtra = aggregate.totalExtra - aggregate.pendingHours.v;
            const totalToPay = baseAsignada + finalExtra;

            const summaryData = [
                ['RESUMEN DE NÓMINA', worker],
                [],
                ['CONCEPTO', 'VALOR UNIT.', 'CANTIDAD', 'TOTAL'],
                ['DÍAS LABORADOS (BASE ASIGNADA)', Math.round(rates.dia), equivalentDays + ' días', Math.round(baseAsignada)],
                ['EXTRA DIURNA 15%', rates.extDia, aggregate.extDia.q + ' h', aggregate.extDia.v],
                ['RECARGO NOCTURNO (9PM - 5AM)', rates.rNoct, aggregate.rNoct.q + ' h', aggregate.rNoct.v],
                ['EXTRA NOCTURNA 50%', rates.extNoct, aggregate.extNoct.q + ' h', aggregate.extNoct.v],
                ['RECARGO DOMINICAL 50%', rates.rDom, aggregate.rDom.q + ' h', aggregate.rDom.v],
                ['EXTRA DOMINICAL 75%', rates.extDom, aggregate.extDom.q + ' h', aggregate.extDom.v],
                ['HORAS DE VIAJE', rates.travel, aggregate.travel.q + ' h', aggregate.travel.v]
            ];

            if (aggregate.pendingHours.q > 0) {
                summaryData.push(['HORAS PENDIENTES (FALTANTES)', rates.extDia, aggregate.pendingHours.q + ' h', -aggregate.pendingHours.v]);
            }

            summaryData.push(
                [],
                [`TOTAL TRABAJO EXTRA ${aggregate.pendingHours.q > 0 ? '(CON DESCUENTO)' : ''}`, '', '', finalExtra],
                ['TOTAL A PAGAR', '', '', Math.round(totalToPay)],
                [],
                ['DESGLOSE POR OP'],
                ['OP | Proyecto', 'Ubicación', 'Días (Equiv)', 'Asignación Base + Extras']
            );

            Object.entries(aggregate.ops).forEach(([op, info]) => {
                const basePart = rates.dia * info.days;
                summaryData.push([op, info.location.toUpperCase(), info.days, Math.round(basePart + info.extra - info.pending)]);
            });

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Resumen Nómina");

            // Generar archivo Excel
            downloadExcelWorkbook(wb, `Nomina_${worker}_${selectedMonth}_Q${selectedFortnight}.xlsx`);
        };
    }

    if (printSummaryBtn) {
        printSummaryBtn.onclick = () => {
            const worker = workerFilter.value;
            if (!worker) return alert('Debe seleccionar un trabajador en el Resumen de Nómina antes de imprimir.');
            document.body.classList.add('print-summary-only');
            window.addEventListener('afterprint', () => {
                document.body.classList.remove('print-summary-only');
            }, { once: true });
            window.print();
        };
    }

    if (printRecordsBtn) {
        printRecordsBtn.onclick = () => {
            document.body.classList.add('print-records-only');
            window.addEventListener('afterprint', () => {
                document.body.classList.remove('print-records-only');
            }, { once: true });
            window.print();
        };
    }

    if (savePdfSummaryBtn) {
        savePdfSummaryBtn.onclick = () => {
            const worker = workerFilter.value;
            if (!worker) return alert('Debe seleccionar un trabajador en el Resumen de Nómina antes de guardar el PDF.');
            
            if (typeof html2pdf === 'undefined') {
                return alert('Error: La librería PDF no cargó. Refresque la página.');
            }
            
            const element = document.getElementById('payrollSummaryArea');
            if (!element) return alert('No hay resumen generado para guardar.');
            
            const selectedMonth = filterMonth.value;
            const selectedFortnight = filterFortnight.value;

            const opt = {
                margin:       0.5,
                filename:     `Nomina_${worker}_${selectedMonth}_Q${selectedFortnight}.pdf`,
                image:        { type: 'jpeg', quality: 0.98 },
                html2canvas:  { scale: 2 },
                jsPDF:        { unit: 'in', format: 'letter', orientation: 'portrait' }
            };

            const actions = document.querySelectorAll('.no-pdf');
            actions.forEach(a => a.style.display = 'none');
            
            html2pdf().set(opt).from(element).save().then(() => {
                actions.forEach(a => a.style.display = '');
            });
        };
    }

    if (exportFullReportBtn) {
        exportFullReportBtn.onclick = () => {
            // Usar tableWorkerFilter ya que este botón está en la sección de tabla
            const worker = tableWorkerFilter ? tableWorkerFilter.value : '';
            if (!worker) return alert('¡Atención! Debe seleccionar un trabajador en el filtro de la tabla para generar el reporte.');

            if (typeof XLSX === 'undefined') {
                return alert('Error: La librería Excel no cargó. Por favor refresque la página (F5).');
            }

            const selectedMonth = filterMonth.value;
            const selectedFortnight = filterFortnight.value;

            const workerRecords = records.filter(r => {
                const sameWorker = r.workerName === worker;
                if (!sameWorker) return false;
                
                const parts = (r.date || "").split('-');
                if (parts.length < 3) return false;
                const rMonth = parts[1];
                const rDay = parseInt(parts[2]);
                
                if (rMonth !== selectedMonth) return false;
                if (selectedFortnight === "1") return rDay <= 15;
                return rDay > 15;
            });

            if (workerRecords.length === 0) return alert('No hay registros para este trabajador en el periodo seleccionado (Mes/Quincena).');

            enrichRecordsWithDailyCap(workerRecords);

            // Reutilizar la lógica de exportar el resumen y añadir la hoja de detalles de turnos
            const rates = calculateDynamicRates(workerRates[worker]?.quincena || (1750905 / 2), 15);
            const wb = XLSX.utils.book_new();

            // Hoja 1: Resumen
            let aggregate = {
                extDia: { q: 0, v: 0 }, rNoct: { q: 0, v: 0 }, extNoct: { q: 0, v: 0 },
                rDom: { q: 0, v: 0 }, extDom: { q: 0, v: 0 }, travel: { q: 0, v: 0 }, totalExtra: 0,
                pendingHours: { q: 0, v: 0 }, ops: {}
            };

            workerRecords.forEach(r => {
                const d = getDetailedShiftPay(r);
                aggregate.extDia.q += d.extDiaQty; aggregate.extDia.v += d.extDiaVal;
                aggregate.rNoct.q += d.recNoctQty; aggregate.rNoct.v += d.recNoctVal;
                aggregate.extNoct.q += d.extNoctQty; aggregate.extNoct.v += d.extNoctVal;
                aggregate.rDom.q += d.recDomQty; aggregate.rDom.v += d.recDomVal;
                aggregate.extDom.q += d.extDomQty; aggregate.extDom.v += d.extDomVal;
                aggregate.travel.q += d.travelQty; aggregate.travel.v += d.travelVal;
                aggregate.totalExtra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);

                const pending = r._pendingHours || 0;
                const pendingVal = pending * rates.extDia;
                aggregate.pendingHours.q += pending;
                aggregate.pendingHours.v += pendingVal;

                const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
                if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
                aggregate.ops[opKey].days += r._dayFraction || 0;
                aggregate.ops[opKey].extra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);
                aggregate.ops[opKey].pending += pendingVal;
            });

            const equivalentDays = workerRecords.reduce((acc, r) => acc + (r._dayFraction || 0), 0);
            const baseAsignada = equivalentDays * rates.dia;

            let finalExtra = aggregate.totalExtra - aggregate.pendingHours.v;
            const totalToPay = baseAsignada + finalExtra;

            const summaryData = [
                ['REPORTE COMPLETO', worker],
                [],
                ['CONCEPTO', 'VALOR UNIT.', 'CANTIDAD', 'TOTAL'],
                ['DÍAS LABORADOS (BASE ASIGNADA)', Math.round(rates.dia), equivalentDays + ' días', Math.round(baseAsignada)],
                ['EXTRA DIURNA 15%', rates.extDia, aggregate.extDia.q + ' h', aggregate.extDia.v],
                ['RECARGO NOCTURNO', rates.rNoct, aggregate.rNoct.q + ' h', aggregate.rNoct.v],
                ['EXTRA NOCTURNA 50%', rates.extNoct, aggregate.extNoct.q + ' h', aggregate.extNoct.v],
                ['RECARGO DOMINICAL 50%', rates.rDom, aggregate.rDom.q + ' h', aggregate.rDom.v],
                ['EXTRA DOMINICAL 75%', rates.extDom, aggregate.extDom.q + ' h', aggregate.extDom.v],
                ['HORAS DE VIAJE', rates.travel, aggregate.travel.q + ' h', aggregate.travel.v]
            ];

            if (aggregate.pendingHours.q > 0) {
                summaryData.push(['HORAS PENDIENTES (FALTANTES)', rates.extDia, aggregate.pendingHours.q + ' h', -aggregate.pendingHours.v]);
            }

            summaryData.push(
                [],
                [`TOTAL TRABAJO EXTRA ${aggregate.pendingHours.q > 0 ? '(CON DESCUENTO)' : ''}`, '', '', finalExtra],
                ['TOTAL A PAGAR', '', '', Math.round(totalToPay)],
                [],
                ['DESGLOSE POR OP'],
                ['OP | Proyecto', 'Ubicación', 'Días (Equiv)', 'Asignación Base + Extras']
            );

            Object.entries(aggregate.ops).forEach(([op, info]) => {
                const basePart = rates.dia * info.days;
                summaryData.push([op, info.location.toUpperCase(), info.days, Math.round(basePart + info.extra - info.pending)]);
            });

            summaryData.push(
                [],
                [],
                ['DETALLE DE TURNOS'],
                ['Fecha', 'Día', 'OP / Proyecto', 'Ubicación', 'Entrada', 'Salida', 'Jornada Est.', 'Jornada Lab.', 'Ext. Diurna', 'Val. Ext. Diurna', 'Rec. Noct.', 'Val. Rec. Noct', 'Ext. Noct.', 'Val. Ext. Noct.', 'Rec. Dom.', 'Val. Rec. Dom.', 'Ext. Dom.', 'Val. Ext. Dom.', 'Hrs Faltantes', 'Descuento Falt.', 'Pago Turno']
            );

            const sortedRecords = [...workerRecords].sort((a, b) => new Date(b.date) - new Date(a.date));
            sortedRecords.forEach(rec => {
                const { dayName } = getDayInfo(rec.date);
                const detail = getDetailedShiftPay(rec);
                const pending = rec._pendingHours || 0;
                const pendingVal = pending * rates.extDia;

                summaryData.push([
                    rec.date,
                    dayName,
                    `${rec.opNumber || '-'} / ${rec.projectName}`,
                    rec.location.toUpperCase(),
                    rec.timeIn,
                    rec.timeOut,
                    rec._effectiveOrdHours || 0,
                    rec.totalHours,
                    detail.extDiaQty,
                    detail.extDiaVal,
                    detail.recNoctQty,
                    detail.recNoctVal,
                    detail.extNoctQty,
                    detail.extNoctVal,
                    detail.recDomQty,
                    detail.recDomVal,
                    detail.extDomQty,
                    detail.extDomVal,
                    pending.toFixed(2),
                    -pendingVal,
                    detail.totalShift
                ]);
            });

            const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
            XLSX.utils.book_append_sheet(wb, wsSummary, "Reporte Completo");

            downloadExcelWorkbook(wb, `Reporte_Completo_${worker}.xlsx`);
        };
    }

    const exportAllReports = () => {
        if (typeof XLSX === 'undefined') return alert('No está disponible la librería Excel. Compruebe la conexión y vuelva a intentar.');

        const month = filterMonth ? filterMonth.value : '';
        const fortnight = filterFortnight ? filterFortnight.value : '1';
        const periodRecords = records.filter(record => {
            const parts = String(record.date || '').split(/[-/]/);
            if (parts.length !== 3) return false;
            const monthPart = Number(parts[1]);
            const dayPart = Number(parts[0].length === 4 ? parts[2] : parts[0]);
            return monthPart === Number(month) && (fortnight === '1' ? dayPart <= 15 : dayPart > 15);
        });
        if (!periodRecords.length) return alert('No hay registros para el mes y la quincena seleccionados.');

        enrichRecordsWithDailyCap(periodRecords);
        const byWorker = new Map();
        periodRecords.forEach(record => {
            const key = (record.workerName || '').trim().toUpperCase();
            if (!byWorker.has(key)) byWorker.set(key, []);
            byWorker.get(key).push(record);
        });

        const workbook = XLSX.utils.book_new();
        const summaryRows = [[
            'Trabajador', 'Días equivalentes', 'Salario base quincenal', 'Horas ordinarias', 'Horas trabajadas',
            'Horas extra diurnas', 'Valor extra diurna', 'Recargo nocturno', 'Valor recargo nocturno',
            'Horas extra nocturnas', 'Valor extra nocturna', 'Recargo dominical/festivo', 'Valor recargo dominical/festivo',
            'Horas viaje', 'Valor viaje', 'Horas faltantes', 'Descuento faltantes', 'Total estimado a pagar', 'Saldo acumulado (h)'
        ]];
        const detailRows = [[
            'Fecha', 'Día', 'Trabajador', 'Ubicación', 'Proyecto', 'OP', 'Entrada', 'Salida', 'Jornada ordinaria (h)',
            'Horas trabajadas', 'Horas permiso', 'Extra diurna (h)', 'Valor extra diurna', 'Recargo nocturno (h)',
            'Valor recargo nocturno', 'Extra nocturna (h)', 'Valor extra nocturna', 'Recargo dominical/festivo (h)',
            'Valor recargo dominical/festivo', 'Horas viaje', 'Valor viaje', 'Motivo ausencia', 'Horas faltantes',
            'Descuento faltantes', 'Pago del turno', 'Observaciones'
        ]];
        const absenceRows = [['Fecha', 'Trabajador', 'Ubicación', 'Proyecto', 'OP', 'Motivo', 'Horas faltantes', 'Descuento']];
        const travelRows = [['Fecha', 'Trabajador', 'Ubicación', 'Proyecto', 'OP', 'Entrada', 'Salida', 'Horas de viaje', 'Valor viaje', 'Observaciones']];
        const reasonNames = { permiso: 'Permiso', calamidad: 'Calamidad doméstica', incapacidad: 'Incapacidad', injustificada: 'Falta no justificada' };

        [...byWorker.keys()].sort((a, b) => a.localeCompare(b)).forEach(worker => {
            const workerRecords = byWorker.get(worker);
            const equivalentDays = workerRecords.reduce((sum, record) => sum + (record._dayFraction || 0), 0);
            const baseSalary = workerRates[worker]?.quincena || (1750905 / 2);
            const rates = calculateDynamicRates(baseSalary, equivalentDays || 1);
            const totals = { ordinary: 0, worked: 0, extraDayH: 0, extraDay: 0, nightH: 0, night: 0, extraNightH: 0, extraNight: 0, holidayH: 0, holiday: 0, travelH: 0, travel: 0, pending: 0, deduction: 0, extraTotal: 0 };

            workerRecords.forEach(record => {
                const detail = getDetailedShiftPay(record, rates);
                const pending = record.isTravelRecord ? 0 : Math.max(0, Number(record._pendingHours) || 0);
                const discount = record.absenceReason === 'incapacidad' ? 0 : pending * rates.extDia;
                const worked = Number.parseFloat(record.realWorkedHours ?? record.totalHours) || 0;
                const permission = Number.parseFloat(record.permissionHours) || 0;
                const ordinary = Number.parseFloat(record.ordinaryHours) || 0;
                const extraTotal = detail.extDiaVal + detail.extNoctVal + detail.extDomVal + detail.recNoctVal + detail.recDomVal + detail.travelVal;
                const { dayName } = getDayInfo(record.date);

                totals.ordinary += ordinary;
                totals.worked += worked;
                totals.extraDayH += detail.extDiaQty; totals.extraDay += detail.extDiaVal;
                totals.nightH += detail.recNoctQty; totals.night += detail.recNoctVal;
                totals.extraNightH += detail.extNoctQty; totals.extraNight += detail.extNoctVal;
                totals.holidayH += detail.recDomQty + detail.extDomQty; totals.holiday += detail.recDomVal + detail.extDomVal;
                totals.travelH += detail.travelQty; totals.travel += detail.travelVal;
                totals.pending += pending; totals.deduction += discount; totals.extraTotal += extraTotal;

                const reason = reasonNames[record.absenceReason] || (pending > 0 ? 'Horas faltantes' : '');
                detailRows.push([
                    record.date, dayName, record.workerName, record.location, record.projectName, record.opNumber || '',
                    record.timeIn || '', record.timeOut || '', ordinary, worked, permission,
                    detail.extDiaQty, detail.extDiaVal, detail.recNoctQty, detail.recNoctVal,
                    detail.extNoctQty, detail.extNoctVal, detail.recDomQty + detail.extDomQty,
                    detail.recDomVal + detail.extDomVal, detail.travelQty, detail.travelVal, reason,
                    pending, discount, detail.totalShift, record.observations || ''
                ]);

                if (record.absenceReason || pending > 0 || (!record.isTravelRecord && worked === 0)) {
                    absenceRows.push([
                        record.date, record.workerName, record.location, record.projectName, record.opNumber || '',
                        reason || 'Falta no justificada', pending, discount
                    ]);
                }
                if (record.isTravelRecord || detail.travelQty > 0) {
                    travelRows.push([
                        record.date, record.workerName, record.location, record.projectName, record.opNumber || '',
                        record.timeIn || '', record.timeOut || '', detail.travelQty, detail.travelVal, record.observations || ''
                    ]);
                }
            });

            const totalPay = baseSalary + totals.extraTotal - totals.deduction;
            summaryRows.push([
                worker, equivalentDays, baseSalary, totals.ordinary, totals.worked,
                totals.extraDayH, totals.extraDay, totals.nightH, totals.night, totals.extraNightH, totals.extraNight,
                totals.holidayH, totals.holiday, totals.travelH, totals.travel, totals.pending, totals.deduction,
                totalPay, shiftBalances[worker] || 0
            ]);
        });

        const appendSheet = (rows, name, widths) => {
            const sheet = XLSX.utils.aoa_to_sheet(rows);
            sheet['!cols'] = widths.map(wch => ({ wch }));
            XLSX.utils.book_append_sheet(workbook, sheet, name);
        };
        appendSheet(summaryRows, 'Resumen nómina', [30, 16, 22, 18, 17, 18, 20, 18, 20, 19, 20, 23, 25, 14, 17, 17, 20, 22, 20]);
        appendSheet(detailRows, 'Detalle turnos', [13, 14, 28, 18, 28, 12, 12, 12, 18, 17, 15, 16, 18, 19, 20, 17, 19, 25, 27, 14, 17, 24, 16, 20, 18, 34]);
        appendSheet(absenceRows, 'Faltas y permisos', [13, 28, 18, 28, 12, 25, 17, 19]);
        appendSheet(travelRows, 'Horas de viaje', [13, 28, 18, 28, 12, 12, 12, 16, 18, 34]);

        const periodTag = `${month}_Q${fortnight}`;
        downloadExcelWorkbook(workbook, `Reportes_Completos_${periodTag}.xlsx`);
    };

    const exportAllReportsBtn = document.getElementById('exportAllReports');
    if (exportAllReportsBtn) exportAllReportsBtn.addEventListener('click', exportAllReports);

    // Funciones PDF removidas, dejamos solo la advertencia en caso de que quieran exportar la tabla simple como PDF
    function generatePDF(element, filename, isCustomContainer) {
        // Mantenida temporalmente solo por si se usa en "Solo Tabla", aunque ya no se recomienda
    }

    // --- 7. Inicialización y Exportación Final ---
    window.renderSummary = renderSummary; // Hacerlo global para el fail-safe del HTML
    console.log("%c ControlHoras v4.0 Cargado Correctamente ", "background: #10b981; color: white; padding: 5px; border-radius: 3px;");

    // (Filtros ya inicializados arriba en línea ~578-584)

    // Botón para resetear todos los filtros y ver la totalidad de registros
    const btnShowAllRecords = document.getElementById('btnShowAllRecords');
    if (btnShowAllRecords) {
        btnShowAllRecords.onclick = () => {
            if (filterMonth) filterMonth.value = "ALL";
            if (filterFortnight) filterFortnight.value = "ALL";
            if (tableWorkerFilter) tableWorkerFilter.value = "";
            renderTable();
            renderSummary();
            
            const toast = document.createElement('div');
            toast.innerHTML = '👁️ Mostrando <strong>TODOS</strong> los trabajadores y periodos registrados';
            toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:#0284c7;color:white;padding:10px 18px;border-radius:8px;font-weight:600;font-size:0.85rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3500);
        };
    }

    // Inicializar funciones base
    updateDatalists();
    updateWorkerSelects();
    try {
        if (records && records.length > 0) {
            const sorted = [...records].filter(r => r.date).sort((a, b) => new Date(b.date) - new Date(a.date));
            if (sorted.length > 0) {
                const latestRec = sorted[0];
                const parts = (latestRec.date || "").split('-');
                if (parts.length >= 3) {
                    const recMonth = parts[1].padStart(2, '0');
                    const recDay = parseInt(parts[2], 10);
                    const recFortnight = recDay <= 15 ? "1" : "2";
                    if (filterMonth) filterMonth.value = recMonth;
                    if (filterFortnight) filterFortnight.value = recFortnight;
                }
                if (latestRec.workerName) {
                    const wName = latestRec.workerName.trim().toUpperCase();
                    if (workerFilter && !workerFilter.value) workerFilter.value = wName;
                }
            }
            // Mostrar todos los trabajadores en la tabla por defecto para que nada quede oculto
            if (tableWorkerFilter) tableWorkerFilter.value = "";
        } else {
            if (filterMonth) filterMonth.value = "ALL";
            if (filterFortnight) filterFortnight.value = "ALL";
            if (tableWorkerFilter) tableWorkerFilter.value = "";
            const firstWorker = Object.keys(workerRates)[0] || "CAMILO DURAN";
            if (workerFilter && !workerFilter.value) workerFilter.value = firstWorker;
        }
        renderTable();
        renderSummary();
    } catch (err) {
        console.error("Error al renderizar tabla/resumen inicial:", err);
    }

    // --- LÓGICA DE CARGA MASIVA QUINCENAL ---
    const btnOpenBulk = document.getElementById('btn-open-bulk');
    const bulkModal = document.getElementById('bulkEntryModal');
    const btnCloseBulk = document.getElementById('btnCloseBulkModal');
    const bulkWorkerName = document.getElementById('bulkWorkerName');
    const btnGenerateBulkTable = document.getElementById('btnGenerateBulkTable');
    const bulkTableBody = document.getElementById('bulkTableBody');
    const bulkTableContainer = document.getElementById('bulkTableContainer');
    const btnSaveBulk = document.getElementById('btnSaveBulk');

    if (btnOpenBulk) {
        btnOpenBulk.onclick = () => {
            bulkModal.style.display = 'block';
            // Populate workers
            bulkWorkerName.innerHTML = '<option value="">Seleccione un trabajador...</option>' + 
                Object.keys(workerRates).map(w => `<option value="${w}">${w}</option>`).join('');
            
            // Set current month/fortnight
            const now = new Date();
            let m = (now.getMonth() + 1).toString().padStart(2, '0');
            document.getElementById('bulkMonth').value = m;
            document.getElementById('bulkFortnight').value = now.getDate() <= 15 ? '1' : '2';
            bulkTableContainer.style.display = 'none';
        };
    }

    if (btnCloseBulk) {
        btnCloseBulk.onclick = () => { bulkModal.style.display = 'none'; };
    }
    window.closeBulkModal = () => { if(bulkModal) bulkModal.style.display = 'none'; };

    if (btnGenerateBulkTable) {
        btnGenerateBulkTable.onclick = () => {
            const worker = bulkWorkerName.value;
            const month = document.getElementById('bulkMonth').value;
            const fortnight = document.getElementById('bulkFortnight').value;
            if (!worker) return alert('Seleccione un trabajador.');
            
            const year = new Date().getFullYear();
            let startDay = fortnight === '1' ? 1 : 16;
            let endDay = fortnight === '1' ? 15 : new Date(year, parseInt(month), 0).getDate();

            const glLoc = document.getElementById('bulkLocation').value;
            const glPrj = document.getElementById('bulkProjectName').value || '';
            const glOp = document.getElementById('bulkOpNumber').value || '';

            let html = '';
            for (let d = startDay; d <= endDay; d++) {
                const dateStr = `${year}-${month}-${d.toString().padStart(2, '0')}`;
                const { dayName, isHoliday, holidayName } = getDayInfo(dateStr);
                
                html += `
                    <tr data-date="${dateStr}" style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px;">
                            <div style="font-weight: 600;">${dateStr}</div>
                            <div style="font-size: 0.75rem; color: var(--color-text-secondary);">${dayName}${isHoliday ? ` - 🚩 ${holidayName}` : ''}</div>
                        </td>
                        <td style="padding: 8px;">
                            <select class="b-loc" style="width:100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;">
                                <option value="obra" ${glLoc==='obra'?'selected':''}>Obra</option>
                                <option value="planta" ${glLoc==='planta'?'selected':''}>Planta</option>
                                <option value="administracion" ${glLoc==='administracion'?'selected':''}>Administración</option>
                            </select>
                        </td>
                        <td style="padding: 8px;"><input type="text" class="b-prj" value="${glPrj.replace(/"/g, '&quot;')}" list="projectsList" style="width:100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px;"><input type="text" class="b-op" value="${glOp.replace(/"/g, '&quot;')}" list="opList" style="width:100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px; text-align: center;"><input type="checkbox" class="b-falta" style="width: 1.2rem; height: 1.2rem; accent-color: var(--color-danger);"><select class="b-absence-reason" aria-label="Motivo de falta" style="display:none; max-width:130px; margin-top:5px;"><option value="injustificada">No justificada</option><option value="permiso">Permiso</option><option value="calamidad">Calamidad doméstica</option><option value="incapacidad">Incapacidad</option></select></td>
                        <td style="padding: 8px; text-align: center;"><input type="checkbox" class="b-medio" style="width: 1.2rem; height: 1.2rem; accent-color: var(--color-warning);"></td>
                        <td style="padding: 8px; text-align: center;"><input type="checkbox" class="b-viaje" style="width: 1.2rem; height: 1.2rem; accent-color: var(--color-accent-primary);"></td>
                        <td style="padding: 8px;"><input type="time" class="b-in" style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px;"><input type="time" class="b-out" style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                    </tr>
                `;
            }
            bulkTableBody.innerHTML = html;
            bulkTableContainer.style.display = 'block';

            // Logica visual para deshabilitar entradas si es falta
            document.querySelectorAll('.b-falta').forEach(chk => {
                chk.addEventListener('change', function() {
                    const row = this.closest('tr');
                    row.querySelector('.b-in').disabled = this.checked;
                    row.querySelector('.b-out').disabled = this.checked;
                    row.querySelector('.b-absence-reason').style.display = this.checked ? 'block' : 'none';
                });
            });
        };
    }

    // Handlers para botones de acción rápida de carga masiva
    const btnAutoFillNormal = document.getElementById('btnAutoFillNormal');
    const bulkScheduleType = document.getElementById('bulkScheduleType');
    if (btnAutoFillNormal) {
        btnAutoFillNormal.onclick = () => {
            const schedule = bulkScheduleType ? bulkScheduleType.value : 'planta';
            const selectedWorker = (bulkWorkerName.value || '').trim().toUpperCase();
            const rows = bulkTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const dateStr = row.getAttribute('data-date');
                if (!dateStr) return;
                const dt = new Date(dateStr + 'T00:00:00');
                const dayOfWeek = dt.getDay(); // 0 = Domingo, 6 = Sábado
                const isFalta = row.querySelector('.b-falta').checked;
                
                const daySubtext = row.querySelector('td div:nth-child(2)').textContent;
                const isHoliday = daySubtext.includes('🚩');

                if (isFalta) return; // Respetar faltas marcadas

                if (dayOfWeek === 0 || isHoliday) {
                    row.querySelector('.b-in').value = '';
                    row.querySelector('.b-out').value = '';
                    return;
                } else if (dayOfWeek === 6) {
                    if (!selectedWorker.startsWith('DECCY BAYONA') && (schedule === 'planta' || schedule === 'obra')) {
                        row.querySelector('.b-in').value = '07:00';
                        row.querySelector('.b-out').value = '12:00';
                        row.querySelector('.b-loc').value = schedule;
                    } else {
                        row.querySelector('.b-in').value = '';
                        row.querySelector('.b-out').value = '';
                        if (schedule === 'administracion') row.querySelector('.b-loc').value = 'administracion';
                    }
                } else {
                    row.querySelector('.b-in').value = '07:00';
                    if (schedule === 'deccy') {
                        row.querySelector('.b-out').value = '16:00';
                        row.querySelector('.b-loc').value = 'administracion';
                    } else if (schedule === 'administracion') {
                        row.querySelector('.b-out').value = '17:00';
                        row.querySelector('.b-loc').value = 'administracion';
                    } else {
                        row.querySelector('.b-out').value = dayOfWeek === 1 ? '18:00' : '17:00';
                        row.querySelector('.b-loc').value = schedule;
                    }
                }
            });
        };
    }

    if (bulkTableBody) {
        bulkTableBody.addEventListener('change', event => {
            if (!event.target.matches('.b-loc')) return;
            const row = event.target.closest('tr');
            if (!row || row.querySelector('.b-falta').checked) return;
            const weekday = new Date(row.dataset.date + 'T00:00:00').getDay();
            const worker = (bulkWorkerName.value || '').trim().toUpperCase();
            if (weekday === 6 && worker.startsWith('DECCY BAYONA')) {
                row.querySelector('.b-in').value = '';
                row.querySelector('.b-out').value = '';
                return;
            }
            if (weekday === 6 && event.target.value === 'administracion') {
                row.querySelector('.b-in').value = '';
                row.querySelector('.b-out').value = '';
                return;
            }
            if (weekday === 6) {
                row.querySelector('.b-in').value = '07:00';
                row.querySelector('.b-out').value = '12:00';
                return;
            }
            if (weekday < 1 || weekday > 5) return;
            row.querySelector('.b-in').value = '07:00';
            row.querySelector('.b-out').value = event.target.value === 'administracion'
                ? (worker.startsWith('DECCY BAYONA') ? '16:00' : '17:00')
                : (event.target.value === 'obra' || event.target.value === 'planta' ? (weekday === 1 ? '18:00' : '17:00') : '');
        });
    }

    if (bulkWorkerName) {
        bulkWorkerName.addEventListener('change', () => {
            const worker = (bulkWorkerName.value || '').trim().toUpperCase();
            const note = document.getElementById('deccyScheduleNote');
            if (note) note.style.display = worker.startsWith('DECCY BAYONA') ? 'block' : 'none';
        });
    }

    const btnClearBulkTimes = document.getElementById('btnClearBulkTimes');
    if (btnClearBulkTimes) {
        btnClearBulkTimes.onclick = () => {
            const rows = bulkTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                row.querySelector('.b-in').value = '';
                row.querySelector('.b-out').value = '';
                row.querySelector('.b-falta').checked = false;
                row.querySelector('.b-absence-reason').style.display = 'none';
                row.querySelector('.b-medio').checked = false;
                row.querySelector('.b-viaje').checked = false;
                row.querySelector('.b-in').disabled = false;
                row.querySelector('.b-out').disabled = false;
            });
        };
    }

    if (btnSaveBulk) {
        btnSaveBulk.onclick = () => {
            const worker = bulkWorkerName.value;
            let addedCount = 0;
            const rows = bulkTableBody.querySelectorAll('tr');
            
            rows.forEach(row => {
                const date = row.getAttribute('data-date');
                const isFalta = row.querySelector('.b-falta').checked;
                const isMedio = row.querySelector('.b-medio').checked;
                const isViaje = row.querySelector('.b-viaje').checked;
                const absenceReason = isFalta ? row.querySelector('.b-absence-reason').value : '';
                const inVal = row.querySelector('.b-in').value;
                const outVal = row.querySelector('.b-out').value;
                
                const location = row.querySelector('.b-loc').value;
                const prj = row.querySelector('.b-prj').value || 'S/N';
                const op = row.querySelector('.b-op').value || 'S/N';

                if (!isFalta && !inVal && !outVal) return; // Fila ignorada (vacía)

                let totalHours = "0.00";
                let tIn = inVal;
                let tOut = outVal;
                let travelHoursCount = 0;

                if (isFalta && !isViaje) {
                    totalHours = "0.00";
                    tIn = "";
                    tOut = "";
                } else {
                    if (!tIn || !tOut) return; // Si marco entrada pero no salida o viceversa, ignoramos (lo ideal seria advertir)
                    const [hIn, mIn] = tIn.split(':').map(Number);
                    const [hOut, mOut] = tOut.split(':').map(Number);
                    if (isNaN(hIn) || isNaN(mIn) || isNaN(hOut) || isNaN(mOut)) return;

                    let diff = (hOut * 60 + mOut) - (hIn * 60 + mIn);
                    if (diff < 0 && hOut < 24) diff += 24 * 60;

                    if (isViaje) {
                        travelHoursCount = parseFloat((diff / 60).toFixed(2));
                        totalHours = "0.00";
                    } else {
                        totalHours = (diff / 60).toFixed(2);
                    }
                }

                const ordinaryHours = isViaje ? 0 : getOrdinaryHours(date, location, isMedio, worker);

                const recordData = {
                    id: Date.now() + Math.floor(Math.random()*10000), // Randomize id to avoid overlaps
                    workerName: worker, 
                    date: date, 
                    location: location, 
                    projectName: prj, 
                    opNumber: op, 
                    timeIn: tIn, 
                    timeOut: tOut, 
                    totalHours: totalHours, 
                    ordinaryHours: ordinaryHours, 
                    esMedioDia: isViaje ? false : isMedio, 
                    travelHours: travelHoursCount, 
                    isTravelRecord: isViaje,
                    absenceReason
                };

                // Si ya existe registro de ese trabajador ese dia, lo reemplazamos
                const existingIndex = records.findIndex(r => (r.workerName || '').trim().toUpperCase() === (worker || '').trim().toUpperCase() && r.date === date);
                if (existingIndex !== -1) {
                    records[existingIndex] = recordData;
                } else {
                    records.push(recordData);
                }
                addedCount++;
            });

            if (addedCount > 0) {
                saveRecords();
                
                const month = document.getElementById('bulkMonth').value;
                const fortnight = document.getElementById('bulkFortnight').value;
                
                if (filterMonth) filterMonth.value = month;
                if (filterFortnight) filterFortnight.value = fortnight;
                if (tableWorkerFilter) tableWorkerFilter.value = worker;
                if (workerFilter) workerFilter.value = worker;

                renderTable();
                renderSummary();
                bulkModal.style.display = 'none';
                
                const toast = document.createElement('div');
                toast.innerHTML = `<i class="ph ph-check-circle"></i> ${addedCount} turnos de ${worker} cargados y guardados correctamente.`;
                toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
            } else {
                alert('No se registró ningún turno. Asegúrese de llenar Entrada y Salida o marcar Falta en al menos un día.');
            }
        };
    }

    // --- LÓGICA DEL GENERADOR DE CÓDIGOS QR ---
    const btnOpenQrModal = document.getElementById('btn-open-qr-modal');
    const btnCloseQrModal = document.getElementById('btn-close-qr-modal');
    const modalQr = document.getElementById('modal-qr');
    const qrTypeSelect = document.getElementById('qrTypeSelect');
    const qrOpInput = document.getElementById('qrOpInput');
    const qrProjectInput = document.getElementById('qrProjectInput');
    const qrLocationInput = document.getElementById('qrLocationInput');
    const qrWorkerSelect = document.getElementById('qrWorkerSelect');
    const groupQrOp = document.getElementById('groupQrOp');
    const groupQrProject = document.getElementById('groupQrProject');
    const groupQrLocation = document.getElementById('groupQrLocation');
    const groupQrWorker = document.getElementById('groupQrWorker');
    const posterTitle = document.getElementById('posterTitle');
    const posterSub = document.getElementById('posterSub');
    const posterUrlPreview = document.getElementById('posterUrlPreview');
    const qrcodeDisplay = document.getElementById('qrcodeDisplay');
    const btnPrintQrPoster = document.getElementById('btnPrintQrPoster');
    const btnCopyQrUrl = document.getElementById('btnCopyQrUrl');

    if (btnOpenQrModal && modalQr) {
        btnOpenQrModal.addEventListener('click', () => {
            modalQr.style.display = 'flex';
            populateQrWorkers();
            generateQrCode();
        });
    }

    if (btnCloseQrModal && modalQr) {
        btnCloseQrModal.addEventListener('click', () => {
            modalQr.style.display = 'none';
        });
    }

    function populateQrWorkers() {
        if (!qrWorkerSelect) return;
        const workers = Object.keys(workerRates).sort();
        qrWorkerSelect.innerHTML = '<option value="">Seleccione trabajador...</option>' + 
            workers.map(w => `<option value="${w}">${w}</option>`).join('');
    }

    if (qrTypeSelect) {
        qrTypeSelect.addEventListener('change', () => {
            const type = qrTypeSelect.value;
            if (type === 'op') {
                groupQrOp.style.display = 'block';
                groupQrProject.style.display = 'block';
                groupQrLocation.style.display = 'block';
                groupQrWorker.style.display = 'none';
            } else if (type === 'location') {
                groupQrOp.style.display = 'none';
                groupQrProject.style.display = 'block';
                groupQrLocation.style.display = 'block';
                groupQrWorker.style.display = 'none';
            } else if (type === 'worker') {
                groupQrOp.style.display = 'none';
                groupQrProject.style.display = 'none';
                groupQrLocation.style.display = 'none';
                groupQrWorker.style.display = 'block';
            }
            generateQrCode();
        });
    }

    [qrOpInput, qrProjectInput, qrLocationInput, qrWorkerSelect].forEach(input => {
        if (input) {
            input.addEventListener('input', generateQrCode);
            input.addEventListener('change', generateQrCode);
        }
    });

    function generateQrCode() {
        if (!qrcodeDisplay) return;
        qrcodeDisplay.innerHTML = '';

        let baseUrl;
        if (window.location.protocol === 'file:') {
            baseUrl = window.location.href.split('#')[0].split('?')[0].replace(/index\.html$/i, '');
            if (!baseUrl.endsWith('/')) baseUrl += '/';
            baseUrl += 'registro_movil.html';
        } else {
            baseUrl = window.location.origin + window.location.pathname.split('#')[0].split('?')[0].replace(/index\.html$/i, '');
            if (!baseUrl.endsWith('/')) baseUrl += '/';
            baseUrl += 'registro_movil.html';
        }
        let targetUrl = baseUrl;
        let title = '';
        let subtitle = '';

        if (type === 'op') {
            const op = (qrOpInput.value || '1042').trim();
            const proj = (qrProjectInput.value || 'Planta Principal').trim();
            const loc = qrLocationInput ? qrLocationInput.value : 'planta';
            targetUrl += `?op=${encodeURIComponent(op)}&proyecto=${encodeURIComponent(proj)}&ubicacion=${loc}`;
            title = `ORDEN DE PRODUCCIÓN #${op}`;
            subtitle = `${proj} (${loc.toUpperCase()}) - Escanea para marcar Entrada/Salida`;
        } else if (type === 'location') {
            const proj = (qrProjectInput.value || 'Planta Principal').trim();
            const loc = qrLocationInput ? qrLocationInput.value : 'planta';
            targetUrl += `?proyecto=${encodeURIComponent(proj)}&ubicacion=${loc}`;
            title = `ESTACIÓN DE MARCAJE: ${proj.toUpperCase()}`;
            subtitle = `Ubicación ${loc.toUpperCase()} - Escanea para registrar tu turno`;
        } else if (type === 'worker') {
            const worker = qrWorkerSelect.value || 'TRABAJADOR';
            targetUrl += `?trabajador=${encodeURIComponent(worker)}`;
            title = `CARNET: ${worker}`;
            subtitle = `Paso rápido para marcar Entrada o Salida`;
        }

        const separator = targetUrl.includes('?') ? '&' : '?';
        targetUrl += `${separator}appv=20261023-2`;

        if (posterTitle) posterTitle.textContent = title;
        if (posterSub) posterSub.textContent = subtitle;
        if (posterUrlPreview) posterUrlPreview.textContent = targetUrl;

        // Renderizado doblemente garantizado del QR
        let rendered = false;
        if (typeof QRCode !== 'undefined') {
            try {
                new QRCode(qrcodeDisplay, {
                    text: targetUrl,
                    width: 180,
                    height: 180,
                    colorDark : "#0f172a",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
                rendered = true;
            } catch (e) {
                console.warn("QRCode local error, usando fallback imagen", e);
            }
        }

        if (!rendered) {
            qrcodeDisplay.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(targetUrl)}" alt="Código QR" style="width:180px;height:180px;display:block;margin:0 auto;border-radius:8px;">`;
        }
    }

    if (btnCopyQrUrl) {
        btnCopyQrUrl.addEventListener('click', () => {
            const url = posterUrlPreview ? posterUrlPreview.textContent : '';
            if (url) {
                navigator.clipboard.writeText(url);
                alert("Enlace copiado al portapapeles: " + url);
            }
        });
    }

    if (btnPrintQrPoster) {
        btnPrintQrPoster.addEventListener('click', () => {
            const posterContent = document.getElementById('printableQrPoster').outerHTML;
            const printWindow = window.open('', '_blank');
            printWindow.document.write(`
                <html>
                <head>
                    <title>Imprimir Cartel QR - DIMALCCO</title>
                    <style>
                        body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background: #fff; }
                        #printableQrPoster { border: 3px solid #0f172a !important; width: 80%; max-width: 450px; padding: 40px 20px !important; border-radius: 20px !important; text-align: center; }
                        h3 { font-size: 24px !important; margin: 15px 0 !important; }
                        p { font-size: 16px !important; color: #475569 !important; }
                        img { margin: 20px auto !important; width: 220px !important; height: 220px !important; }
                    </style>
                </head>
                <body onload="window.print(); window.close();">
                    ${posterContent}
                </body>
                </html>
            `);
            printWindow.document.close();
        });
    }
    // --- LÓGICA DE SINCRONIZACIÓN DE TURNOS MÓVILES ---
    const btnSyncMobile = document.getElementById('btn-sync-mobile');
    const modalSyncMobile = document.getElementById('modal-sync-mobile');
    const btnCloseSyncModal = document.getElementById('btn-close-sync-modal');
    const btnPullCloudData = document.getElementById('btnPullCloudData');
    const btnImportPastedShift = document.getElementById('btnImportPastedShift');
    const pasteShiftInput = document.getElementById('pasteShiftInput');

    if (btnSyncMobile && modalSyncMobile) {
        btnSyncMobile.addEventListener('click', () => {
            modalSyncMobile.style.display = 'flex';
        });
    }

    if (btnCloseSyncModal && modalSyncMobile) {
        btnCloseSyncModal.addEventListener('click', () => {
            modalSyncMobile.style.display = 'none';
        });
    }

    if (btnPullCloudData) {
        btnPullCloudData.addEventListener('click', async () => {
            btnPullCloudData.disabled = true;
            btnPullCloudData.innerHTML = '<i class="ph ph-spinner animate-spin"></i> Descargando de la Nube...';
            try {
                let downloadedCount = 0;
                if (typeof pullFromCloud === 'function') {
                    await pullFromCloud();
                }
                if (typeof pullMobileShiftsFromCloud === 'function') {
                    downloadedCount = await pullMobileShiftsFromCloud();
                }
                
                records = JSON.parse(localStorage.getItem('shiftRecords')) || [];

                // Auto-ajustar filtros al periodo más reciente descargado
                if (records.length > 0) {
                    const sorted = [...records].filter(r => r.date).sort((a, b) => new Date(b.date) - new Date(a.date));
                    if (sorted.length > 0) {
                        const parts = sorted[0].date.split('-');
                        if (parts.length >= 3) {
                            if (filterMonth) filterMonth.value = parts[1].padStart(2, '0');
                            if (filterFortnight) filterFortnight.value = parseInt(parts[2], 10) <= 15 ? "1" : "2";
                        }
                    }
                }

                updateWorkerSelects();
                renderTable();
                renderSummary();

                if (downloadedCount > 0) {
                    alert(`✅ ¡Sincronización completada! Se descargaron ${downloadedCount} nuevo(s) turno(s) marcados desde celulares.`);
                } else {
                    alert("✅ Registros sincronizados correctamente. Todos los turnos están al día.");
                }
            } catch (err) {
                alert("Información de sincronización: " + err.message);
            } finally {
                btnPullCloudData.disabled = false;
                btnPullCloudData.innerHTML = '<i class="ph ph-cloud-arrow-down" style="font-size: 20px;"></i> Descargar Registros de la Nube';
                if (modalSyncMobile) modalSyncMobile.style.display = 'none';
            }
        });
    }

    // Polling automático cada 12 segundos para recibir marcaciones móviles en tiempo real
    setInterval(async () => {
        if (typeof pullMobileShiftsFromCloud === 'function') {
            const count = await pullMobileShiftsFromCloud();
            if (count > 0) {
                records = JSON.parse(localStorage.getItem('shiftRecords')) || [];
                updateWorkerSelects();
                renderTable();
                renderSummary();

                const toast = document.createElement('div');
                toast.innerHTML = `🔔 <strong>${count} nuevo(s) turno(s) móvil(es) recibido(s) en tiempo real</strong>`;
                toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 20px;border-radius:8px;font-weight:600;font-size:0.9rem;z-index:9999;box-shadow:0 4px 14px rgba(0,0,0,0.2);';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
            }
        }
    }, 12000);

    if (btnImportPastedShift && pasteShiftInput) {
        btnImportPastedShift.addEventListener('click', () => {
            const raw = pasteShiftInput.value.trim();
            if (!raw) return alert("Pega primero el código del turno en el campo de texto.");
            try {
                const shiftObj = JSON.parse(raw);
                if (!shiftObj.workerName || !shiftObj.date) {
                    throw new Error("El código del turno no tiene un formato válido.");
                }
                const newRecord = {
                    id: Date.now().toString(),
                    workerName: shiftObj.workerName,
                    date: shiftObj.date,
                    location: shiftObj.location || 'planta',
                    projectName: shiftObj.projectName || 'Planta Principal',
                    opNumber: shiftObj.opNumber || '1042',
                    recordType: 'normal',
                    timeIn: shiftObj.timeIn || '07:00',
                    timeOut: shiftObj.timeOut || '',
                    isHalfDay: false,
                    isAbsent: false,
                    travelHours: 0,
                    notes: '[Importado vía Código Móvil]',
                    createdViaMobile: true
                };

                records = JSON.parse(localStorage.getItem('shiftRecords')) || [];
                records.push(newRecord);
                saveRecords();
                renderTable();
                pasteShiftInput.value = '';
                modalSyncMobile.style.display = 'none';
                alert(`✅ Turno de ${shiftObj.workerName} para OP #${shiftObj.opNumber} importado con éxito.`);
            } catch (err) {
                alert("Error al importar el turno: " + err.message);
            }
        });
    }

});

