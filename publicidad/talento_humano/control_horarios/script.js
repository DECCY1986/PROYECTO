document.addEventListener('DOMContentLoaded', () => {
    const hourForm = document.getElementById('hourForm');
    const tableBody = document.getElementById('tableBody');
    const payrollSummaryArea = document.getElementById('payrollSummaryArea');
    const workerFilter = document.getElementById('workerFilter');
    const tableWorkerFilter = document.getElementById('tableWorkerFilter');
    const payrollModeSelect = document.getElementById('payrollMode');
    const clearDataBtn = document.getElementById('clearData');
    const inputDate = document.getElementById('date');
    const exportPdfBtn = document.getElementById('exportPdf');
    const exportSummaryBtn = document.getElementById('exportSummary');
    const savePdfSummaryBtn = document.getElementById('savePdfSummary');
    const printSummaryBtn = document.getElementById('printSummary');
    const exportFullReportBtn = document.getElementById('exportFullReport');
    const btnGlobalSave = document.getElementById('btn-global-save');
    const editIdInput = document.getElementById('editId');
    const projectsList = document.getElementById('projectsList');
    const opList = document.getElementById('opList');
    const filterMonth = document.getElementById('filterMonth');
    const filterFortnight = document.getElementById('filterFortnight');
    const isHalfDayCheckbox = document.getElementById('isHalfDay');
    const isAbsentCheckbox = document.getElementById('isAbsent');
    const recordTypeSelect = document.getElementById('recordType');
    const btnSubmit = hourForm.querySelector('button[type="submit"]');
    if (hourForm) hourForm.noValidate = true;

    // --- Helpers ---
    const parseAmount = (val) => {
        if (typeof val === 'number') return val;
        if (!val) return 0;
        const normalized = val.toString().replace(/\./g, '').replace(/,/g, '.');
        return parseFloat(normalized) || 0;
    };

    const showToast = (message, type = 'success') => {
        const toast = document.createElement('div');
        toast.textContent = message;
        const bg = type === 'error' ? '#ef4444' : '#10b981';
        toast.style.cssText = `position:fixed;top:20px;right:20px;background:${bg};color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;`;
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 3000);
    };

    const readJsonStorage = (key, fallback) => {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : fallback;
        } catch (err) {
            console.warn(`No se pudo leer ${key}. Se usara un valor limpio.`, err);
            return fallback;
        }
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
        "JULIO PIERNAGORDA": 1000000,
        "DIEGO VELANDIA": 1265000,
        "JORGE GILBERTO RODRIGUEZ AGUILERA": 1350000,
        "HENRY GONZALES": 1320000,
        "JOSE MANUEL FORERO": 1210000
    };

    let workerRates = readJsonStorage('workerRates', null);
    if (!workerRates) {
        workerRates = {};
        Object.entries(FIXED_QUINCENA).forEach(([name, quincena]) => {
            workerRates[name] = { quincena: quincena };
        });
        localStorage.setItem('workerRates', JSON.stringify(workerRates));
    }

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
        // No sincronizar con Personal según instrucción: "no integres esos dos modulos"
        console.log("Carga de trabajadores desde Personal desactivada. Usando base fija.");
    };

    const syncTimeFieldState = () => {
        const timeIn = document.getElementById('timeIn');
        const timeOut = document.getElementById('timeOut');
        if (!timeIn || !timeOut) return;

        const isAbsence = isAbsentCheckbox ? isAbsentCheckbox.checked : false;
        const needsTime = !isAbsence;
        timeIn.disabled = isAbsence;
        timeOut.disabled = isAbsence;
        timeIn.required = needsTime;
        timeOut.required = needsTime;

        if (isAbsence) {
            timeIn.value = '';
            timeOut.value = '';
        }
    };

    // Actualizar el select de trabajadores en el HTML
    const updateWorkerSelects = () => {
        const selects = [
            document.getElementById('workerName'),
            document.getElementById('tableWorkerFilter'),
            document.getElementById('workerFilter'),
            document.getElementById('bulkWorkerName')
        ];
        const sortedWorkers = Object.keys(workerRates).sort((a, b) => a.localeCompare(b));
        const options = '<option value="">Seleccione un trabajador...</option>' +
            sortedWorkers.map(w => `<option value="${w}">${w}</option>`).join('');
        
        selects.forEach(s => {
            if (s) {
                const currentVal = s.value;
                s.innerHTML = options;
                s.value = currentVal;
            }
        });
    };

    const parseDateParts = (dateStr) => {
        if (!dateStr || typeof dateStr !== 'string') return null;
        let y = 0, m = 0, d = 0;
        if (dateStr.includes('-')) {
            const p = dateStr.split('-');
            if (p[0].length === 4) {
                y = parseInt(p[0]); m = parseInt(p[1]); d = parseInt(p[2]);
            } else {
                d = parseInt(p[0]); m = parseInt(p[1]); y = parseInt(p[2]);
            }
        } else if (dateStr.includes('/')) {
            const p = dateStr.split('/');
            if (p[0].length === 4) {
                y = parseInt(p[0]); m = parseInt(p[1]); d = parseInt(p[2]);
            } else {
                d = parseInt(p[0]); m = parseInt(p[1]); y = parseInt(p[2]);
            }
        }
        if (!y || !m || !d) return null;
        return {
            year: String(y),
            month: String(m).padStart(2, '0'),
            day: d
        };
    };

    var records = window.records = readJsonStorage('publicidad_shiftRecords', null) || readJsonStorage('shiftRecords', []);
    if (!Array.isArray(records)) records = [];
    var shiftBalances = window.shiftBalances = readJsonStorage('shiftBalances', {}) || {}; 
    window.manualCrossHoursVal = 0; // Para el modo parcial
    window.lastRenderedWorker = "";

    const saveRecords = () => {
        const jsonRecords = JSON.stringify(records);
        window.records = records;
        localStorage.setItem('shiftRecords', jsonRecords);
        localStorage.setItem('publicidad_shiftRecords', jsonRecords);
        localStorage.setItem('shiftBalances', JSON.stringify(shiftBalances));
        updateDatalists();
        
        try { window.dispatchEvent(new Event('storage')); } catch(err) {}
        if (window.parent && window.parent !== window) {
            window.parent.postMessage('sync_cloud', '*');
        }
    };

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

    const getOrdinaryHours = (dateStr, location, esMedioDia = false) => {
        const { day, isHoliday } = getDayInfo(dateStr);
        
        // En días festivos la jornada ordinaria es 0 (se paga todo como extra/recargo)
        if (isHoliday) return 0;

        let hours = 0;
        if (location === 'obra') {
            if (day >= 1 && day <= 5) hours = 10;
            else if (day === 6) hours = 5;
        } else {
            if (day === 1 || day === 2) hours = 11;
            else if (day >= 3 && day <= 5) hours = 10;
            else if (day === 6) hours = 5;
        }
        return esMedioDia ? hours / 2 : hours;
    };

    const getOrdinaryHoursFallback = (dateStr, location, esMedioDia = false) => {
        if (typeof getOrdinaryHours === 'function') {
            return getOrdinaryHours(dateStr, location, esMedioDia);
        }
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDay();
        if (day === 0) return 0;
        let hours = 0;
        if (location === 'obra') {
            if (day >= 1 && day <= 5) hours = 10;
            else if (day === 6) hours = 5;
        } else {
            if (day === 1 || day === 2) hours = 11;
            else if (day >= 3 && day <= 5) hours = 10;
            else if (day === 6) hours = 5;
        }
        return esMedioDia ? hours / 2 : hours;
    };

    const enrichRecordsWithDailyCap = (recordsList) => {
        if (!Array.isArray(recordsList)) return recordsList;

        recordsList.forEach(r => {
            delete r._effectiveOrdHours;
            delete r._pendingHours;
            delete r._extraHours;
            delete r._dayFraction;
        });

        const groups = {};
        recordsList.forEach(r => {
            if (r.isTravelRecord) {
                r._effectiveOrdHours = 0;
                r._pendingHours = 0;
                r._extraHours = 0;
                r._dayFraction = 0;
                return;
            }

            const worker = (r.workerName || '').trim().toUpperCase();
            const date = r.date;
            if (!worker || !date) return;

            const key = `${worker}_${date}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(r);
        });

        Object.values(groups).forEach(group => {
            if (group.length === 0) return;

            group.sort((a, b) => {
                const tA = a.timeIn || '00:00';
                const tB = b.timeIn || '00:00';
                return tA.localeCompare(tB);
            });

            const dateStr = group[0].date;
            let targetOrd = 0;
            group.forEach(r => {
                const ordCalc = parseFloat(r.ordinaryHours);
                const target = (!isNaN(ordCalc) && ordCalc > 0 && !r.esMedioDia) 
                    ? ordCalc 
                    : getOrdinaryHoursFallback(dateStr, r.location, r.esMedioDia);
                if (target > targetOrd) targetOrd = target;
            });

            let accumulatedOrd = 0;

            group.forEach((r, index) => {
                const totalWorked = parseFloat(r.totalHours) || 0;

                if (targetOrd === 0) {
                    r._effectiveOrdHours = 0;
                    r._pendingHours = 0;
                    r._extraHours = totalWorked;
                    r._dayFraction = 0;
                } else {
                    const neededOrd = Math.max(0, targetOrd - accumulatedOrd);
                    const effectiveOrd = Math.max(0, Math.min(totalWorked, neededOrd));
                    accumulatedOrd += effectiveOrd;

                    r._effectiveOrdHours = effectiveOrd;
                    r._extraHours = Math.max(0, totalWorked - effectiveOrd);
                    r._dayFraction = effectiveOrd / targetOrd;
                    r._pendingHours = 0;

                    const isLast = (index === group.length - 1);
                    if (isLast) {
                        if (accumulatedOrd < targetOrd) {
                            r._pendingHours = targetOrd - accumulatedOrd;
                            r._dayFraction += (targetOrd - accumulatedOrd) / targetOrd;
                        }
                    }
                }
            });
        });

        return recordsList;
    };

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
        const ordHours = (record._effectiveOrdHours !== undefined) ? record._effectiveOrdHours : (parseFloat(record.ordinaryHours) || 0);
        const dayFraction = (record._dayFraction !== undefined) ? record._dayFraction : (record.esMedioDia ? 0.5 : 1);
        const { isSunday, isHoliday } = getDayInfo(record.date);
        const isSunOrHol = isSunday || isHoliday;
        const esMedioDia = record.esMedioDia === true;
        
        // El pago ordinario base se calcula proporcional al peso del turno en la jornada ordinaria del día.
        let tarifaDiaria = safeRates.dia * dayFraction;
        if ((totalHours === 0 && !record.timeIn) || record.isTravelRecord) tarifaDiaria = 0;
        
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
            const pending = record.isTravelRecord ? 0 : ((record._pendingHours !== undefined) ? record._pendingHours : ordHours);
            const pendingVal = pending * (safeRates.extDia || 0);
            details.totalShift = details.rawPay - pendingVal;
            return details;
        }

        const [hIn, mIn] = (record.timeIn || "00:00").split(':').map(Number);
        const ratesForCalcs = safeRates;
        let currentTime = hIn * 60 + mIn;
        let hourCount = 0;

        // Skip normal extra calculation if it's a travel-only record
        if (!record.isTravelRecord) {
            while (hourCount < totalHours) {
                const fraction = Math.min(1, totalHours - hourCount);
                const currentHour = (Math.floor(currentTime / 60)) % 24;
                const isNight = (currentHour >= 21 || currentHour < 5);

                if (hourCount < ordHours) {
                    const ordFraction = Math.min(fraction, ordHours - hourCount);
                    if (isSunOrHol) {
                        details.recDomQty  += ordFraction;
                        details.recDomVal  += ordFraction * ratesForCalcs.rDom;
                    } else if (isNight) {
                        details.recNoctQty += ordFraction;
                        details.recNoctVal += ordFraction * ratesForCalcs.rNoct;
                    }
                    const extraFraction = fraction - ordFraction;
                    if (extraFraction > 0) {
                        if (isSunOrHol) {
                            details.extDomQty  += extraFraction;
                            details.extDomVal  += extraFraction * ratesForCalcs.extDom;
                        } else if (isNight) {
                            details.extNoctQty += extraFraction;
                            details.extNoctVal += extraFraction * ratesForCalcs.extNoct;
                        } else {
                            details.extDiaQty  += extraFraction;
                            details.extDiaVal  += extraFraction * ratesForCalcs.extDia;
                        }
                    }
                } else {
                    if (isSunOrHol) {
                        details.extDomQty  += fraction;
                        details.extDomVal  += fraction * ratesForCalcs.extDom;
                    } else if (isNight) {
                        details.extNoctQty += fraction;
                        details.extNoctVal += fraction * ratesForCalcs.extNoct;
                    } else {
                        details.extDiaQty  += fraction;
                        details.extDiaVal  += fraction * ratesForCalcs.extDia;
                    }
                }

                currentTime += 60;
                hourCount++;
            }
        }

        const pending = (record._pendingHours !== undefined) ? record._pendingHours : Math.max(0, ordHours - totalHours);
        const pendingVal = pending * ratesForCalcs.extDia;

        details.rawPay = details.ordPay + details.extDiaVal + details.recNoctVal + details.extNoctVal + details.recDomVal + details.extDomVal + details.travelVal;
        details.totalShift = details.rawPay - pendingVal;
        return details;
    };

    const renderSummary = () => {
        const worker = (workerFilter.value || "").trim().toUpperCase();
        if (!worker) {
            payrollSummaryArea.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-tertiary);">Seleccione un trabajador para ver su resumen de nómina.</div>';
            return;
        }

        const workerRecords = records.filter(r => {
            if (typeof r.workerName !== 'string' || typeof r.date !== 'string') return false;
            const sameWorker = (r.workerName || "").trim().toUpperCase() === worker;
            if (!sameWorker) return false;
            
            const parsed = parseDateParts(r.date);
            if (!parsed) return false;
            
            const selectedMonth = filterMonth.value;
            const selectedFortnight = filterFortnight.value;
            
            if (parsed.month !== selectedMonth) return false;
            if (selectedFortnight === "1") return parsed.day <= 15;
            return parsed.day > 15;
        });

        enrichRecordsWithDailyCap(workerRecords);

        // We calculate equivalent worked days first to determine dynamic daily rate
        const equivalentDays = workerRecords.reduce((acc, r) => acc + (r.isTravelRecord ? 0 : (r._dayFraction !== undefined ? r._dayFraction : (r.esMedioDia ? 0.5 : 1))), 0);
        
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

            const pending = r.isTravelRecord ? 0 : ((r._pendingHours !== undefined) ? r._pendingHours : Math.max(0, r.ordinaryHours - r.totalHours));
            const pendingVal = pending * rates.extDia;
            aggregate.totalPendingHours.q += pending;
            aggregate.totalPendingHours.v += pendingVal;

            const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
            if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
            aggregate.ops[opKey].days += r.isTravelRecord ? 0 : ((r._dayFraction !== undefined) ? r._dayFraction : (r.esMedioDia ? 0.5 : 1));
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

                <div class="payroll-row">
                    <div class="payroll-cell">HORAS EXTRAS Y RECARGOS (BRUTO)</div>
                    <div class="payroll-cell value">-</div>
                    <div class="payroll-cell value">${(aggregate.extDia.q + aggregate.extNoct.q + aggregate.extDom.q).toFixed(1)} h</div>
                    <div class="payroll-cell value">$${aggregate.totalExtraMoney.toLocaleString()}</div>
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
        const selectedMonth = filterMonth.value;
        const selectedFortnight = filterFortnight.value;

        const recordsToDisplay = records.filter(r => {
            // Protección contra datos corruptos (si se guardó un objeto DOM por error)
            if (typeof r.workerName !== 'string' || typeof r.date !== 'string') return false;

            const sameWorker = workerToFilter ? (r.workerName || '').trim().toUpperCase() === workerToFilter.trim().toUpperCase() : true;
            if (!sameWorker) return false;

            const parsed = parseDateParts(r.date);
            if (!parsed) return false;

            if (parsed.month !== selectedMonth) return false;
            if (selectedFortnight === "1") return parsed.day <= 15;
            return parsed.day > 15;
        });

        enrichRecordsWithDailyCap(recordsToDisplay);

        recordsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((rec) => {
            const effOrd = rec._effectiveOrdHours !== undefined ? rec._effectiveOrdHours : (parseFloat(rec.ordinaryHours) || 0);
            const effPending = rec._pendingHours !== undefined ? rec._pendingHours : Math.max(0, effOrd - rec.totalHours);
            const extras = Math.max(0, rec.totalHours - effOrd).toFixed(2);
            const pending = effPending.toFixed(2);
            const diffDisplay = extras > 0 ? `<span style="color: var(--color-success)">+${extras}h</span>` :
                pending > 0 ? `<span style="color: var(--color-danger)">-${pending}h</span>` : '-';

            const { dayName, isHoliday, holidayName } = getDayInfo(rec.date);
            const detail = getDetailedShiftPay(rec) || { recNoctQty: 0, totalShift: 0, ordPay: 0, extDiaQty: 0, extDiaVal: 0, recNoctVal: 0, extNoctQty: 0, extNoctVal: 0, recDomQty: 0, recDomVal: 0, extDomQty: 0, extDomVal: 0 };

            const isFalta = (parseFloat(rec.totalHours) === 0 && !rec.isTravelRecord);

            const tr = document.createElement('tr');
            tr.innerHTML = `
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
                    ${isFalta ? '<span class="badge" style="background: #fee2e2; color: #991b1b; margin-top: 4px;"> FALTA INJUSTIFICADA </span>' : ''}
                    ${rec.isTravelRecord ? '<span class="badge" style="background: #e0e7ff; color: #4338ca; margin-top: 4px;"> VIAJE </span>' : ''}
                </td>
                <td><small>${isFalta ? 'N/A' : `${rec.timeIn || ''} - ${rec.timeOut || ''}`}</small></td>
                <td><span class="badge" style="background: #f1f5f9">${rec.isTravelRecord ? 'Viaje' : (detail.recNoctQty > 0 ? 'Nocturno' : 'Diurno')}</span></td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : effOrd + 'h'}</td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : (rec.realWorkedHours || rec.totalHours) + 'h'}${rec.permissionHours > 0 ? ` <br><small style="color: var(--color-accent-primary);">+${rec.permissionHours}h Perm.</small>` : ''}</td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : diffDisplay}</td>
                <td><small>${rec.observations || '-'}</small></td>
                <td style="font-weight: 800; color: var(--color-success)">$${detail.totalShift.toLocaleString()}</td>
                <td class="no-pdf">
                    <button onclick="editRecord(${rec.id})" style="background:none; border:none; color:var(--color-accent-primary); cursor:pointer; margin-right: 10px;">
                        <i class="ph ph-pencil-simple"></i>
                    </button>
                    <button onclick="deleteRecord(${rec.id})" style="background:none; border:none; color:var(--color-danger); cursor:pointer;">
                        <i class="ph ph-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(tr);
        });

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

    window.editRecord = (id) => {
        const rec = records.find(r => r.id === id);
        if (!rec) return;
        document.getElementById('workerName').value = rec.workerName;
        document.getElementById('date').value = rec.date;
        document.getElementById('location').value = rec.location;
        document.getElementById('projectName').value = rec.projectName;
        document.getElementById('opNumber').value = rec.opNumber || '';
        document.getElementById('timeIn').value = rec.timeIn || '';
        document.getElementById('timeOut').value = rec.timeOut || '';
        document.getElementById('observations').value = rec.observations || '';
        document.getElementById('permissionHours').value = rec.permissionHours || '';
        
        if (recordTypeSelect) {
            recordTypeSelect.value = rec.isTravelRecord ? 'travel' : 'regular';
        }

        const isFalta = rec.totalHours == 0 && !rec.isTravelRecord;
        if (isHalfDayCheckbox) isHalfDayCheckbox.checked = rec.esMedioDia === true;
        if (isAbsentCheckbox) {
            isAbsentCheckbox.checked = isFalta;
            document.getElementById('timeIn').disabled = isFalta;
            document.getElementById('timeOut').disabled = isFalta;
        }

        editIdInput.value = rec.id;
        btnSubmit.innerHTML = '<i class="ph ph-check-circle"></i> Actualizar Turno';
        btnSubmit.style.background = 'var(--color-warning)';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    window.deleteRecord = (id) => {
        if (confirm('¿Eliminar registro?')) {
            records = records.filter(r => r.id !== id);
            saveRecords();
            renderTable();
        }
    };

    const normalizeTimeVal = (val) => {
        if (!val) return '';
        val = val.trim().toLowerCase();
        let isPM = val.includes('pm') || val.includes('p.m.');
        let isAM = val.includes('am') || val.includes('a.m.');
        val = val.replace(/p\.?m\.?|a\.?m\.?/g, '').trim();

        let h = 0, m = 0;
        if (val.includes(':')) {
            const parts = val.split(':');
            h = parseInt(parts[0]) || 0;
            m = parseInt(parts[1]) || 0;
        } else if (/^\d{3,4}$/.test(val)) {
            const padded = val.padStart(4, '0');
            h = parseInt(padded.slice(0, 2)) || 0;
            m = parseInt(padded.slice(2)) || 0;
        } else if (/^\d{1,2}$/.test(val)) {
            h = parseInt(val) || 0;
            m = 0;
        }

        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const processShiftSubmission = () => {
        const workerName = (document.getElementById('workerName').value || '').trim();
        const date = (document.getElementById('date').value || '').trim();
        const location = (document.getElementById('location').value || '').trim();
        const projectName = (document.getElementById('projectName').value || '').trim();
        const opNumber = (document.getElementById('opNumber').value || '').trim();
        const rawTimeIn = document.getElementById('timeIn').value;
        const rawTimeOut = document.getElementById('timeOut').value;
        const observations = (document.getElementById('observations').value || '').trim();
        const isTravelRecord = recordTypeSelect ? (recordTypeSelect.value === 'travel') : false;

        const esMedioDia = isHalfDayCheckbox ? isHalfDayCheckbox.checked : false;
        const esFalta = isAbsentCheckbox ? isAbsentCheckbox.checked : false;
        const permissionHours = parseFloat(document.getElementById('permissionHours').value) || 0;

        if (!workerName) return alert("Por favor seleccione un trabajador.");
        if (!date) return alert("Por favor seleccione una fecha.");
        if (!projectName) return alert("Por favor ingrese el nombre de la Obra / Planta.");
        if (!opNumber) return alert("Por favor ingrese el N° de la OP.");

        let finalTimeIn = "";
        let finalTimeOut = "";
        let totalHours = "0.00";
        let travelHoursCount = 0;

        if (esFalta && !isTravelRecord) {
            totalHours = "0.00";
            finalTimeIn = "";
            finalTimeOut = "";
        } else {
            if (!rawTimeIn || !rawTimeOut) return alert("Debe ingresar Hora de Entrada y Hora de Salida (a menos que sea Falta).");
            finalTimeIn = normalizeTimeVal(rawTimeIn);
            finalTimeOut = normalizeTimeVal(rawTimeOut);

            const [hIn, mIn] = finalTimeIn.split(':').map(Number);
            const [hOut, mOut] = finalTimeOut.split(':').map(Number);

            if (isNaN(hIn) || isNaN(mIn) || isNaN(hOut) || isNaN(mOut)) {
                return alert("Formato de hora inválido. Ejemplo: 07:00 o 17:00");
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

        const baseOrd = isTravelRecord ? 0 : getOrdinaryHours(date, location, esMedioDia);
        const existingSameDay = records.filter(r => {
            if (editIdInput.value && r.id === parseInt(editIdInput.value)) return false;
            return (r.workerName || '').trim().toUpperCase() === workerName.toUpperCase() && r.date === date && !r.isTravelRecord;
        });
        let sumWorkedExisting = 0;
        existingSameDay.forEach(r => {
            sumWorkedExisting += parseFloat(r.totalHours) || 0;
        });
        const remainingOrd = Math.max(0, baseOrd - sumWorkedExisting);
        const ordinaryHours = isTravelRecord ? 0 : Math.min(baseOrd, remainingOrd);

        const effectiveWorkedHours = (parseFloat(totalHours) + permissionHours).toFixed(2);

        const recordData = {
            id: editIdInput.value ? parseInt(editIdInput.value) : Date.now(),
            workerName, date, location, projectName, opNumber, 
            timeIn: finalTimeIn, timeOut: finalTimeOut, 
            totalHours: effectiveWorkedHours,
            realWorkedHours: totalHours,
            ordinaryHours, 
            esMedioDia: isTravelRecord ? false : esMedioDia, 
            travelHours: travelHoursCount, 
            isTravelRecord, 
            observations,
            permissionHours
        };

        if (editIdInput.value) {
            const index = records.findIndex(r => r.id === parseInt(editIdInput.value));
            if (index !== -1) {
                records[index] = recordData;
            }
            editIdInput.value = '';
            if (btnSubmit) {
                btnSubmit.innerHTML = '<i class="ph ph-plus-circle"></i> Registrar Turno';
                btnSubmit.style.background = 'var(--color-accent-primary)';
            }
        } else {
            records.push(recordData);
        }
        saveRecords();

        if (date) {
            const parts = date.split('-');
            if (parts.length >= 3) {
                const recMonth = parts[1];
                const recDay = parseInt(parts[2]);
                if (filterMonth) filterMonth.value = recMonth;
                if (filterFortnight) filterFortnight.value = recDay <= 15 ? "1" : "2";
            }
        }
        if (workerName) {
            if (tableWorkerFilter) tableWorkerFilter.value = workerName;
            if (workerFilter) workerFilter.value = workerName;
        }

        try {
            renderTable();
        } catch (err) {
            console.error("El turno se guardo, pero hubo un error al actualizar la tabla:", err);
            showToast('Turno guardado. Recarga la pagina si no aparece en la tabla.', 'error');
        }
        hourForm.reset();
        if (inputDate) {
            try { inputDate.value = date; } catch(err) {}
        }
        syncTimeFieldState();

        showToast('Turno registrado correctamente');
    };

    if (hourForm) {
        hourForm.addEventListener('submit', (e) => {
            e.preventDefault();
            if (hourForm.checkValidity && !hourForm.checkValidity()) {
                hourForm.reportValidity();
                return;
            }
            processShiftSubmission();
        });
    }

    if (exportPdfBtn) exportPdfBtn.onclick = () => {
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
            showToast('Cambios guardados correctamente');
        };
    }

    // --- 7. Event Listeners y Exportación Definitiva ---
    // Initialize filters to current month and fortnight
    const today = new Date();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentDay = today.getDate();
    const currentFortnight = currentDay <= 15 ? "1" : "2";

    if (filterMonth) filterMonth.value = currentMonth;
    if (filterFortnight) filterFortnight.value = currentFortnight;
    if (inputDate && !inputDate.value) inputDate.value = today.toISOString().slice(0, 10);

    if (workerFilter) {
        workerFilter.addEventListener('change', () => {
            console.log("Cambiando a trabajador:", workerFilter.value);
            renderSummary();
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
        });
    }

    if (filterFortnight) {
        filterFortnight.addEventListener('change', () => {
            renderTable();
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

            const equivalentDays = workerRecords.reduce((acc, r) => acc + (r.esMedioDia ? 0.5 : 1), 0);
            const quincenaBase = (workerRates[worker] && workerRates[worker].quincena) ? workerRates[worker].quincena : (1750905 / 2);
            const rates = calculateDynamicRates(quincenaBase, equivalentDays || 1);

            const wb = XLSX.utils.book_new();

            // 1. Crear Hoja de Resumen (Nómina)
            // Aquí replicamos la lógica de renderSummary para obtener los totales
            let aggregate = {
                extDia: { q: 0, v: 0 }, rNoct: { q: 0, v: 0 }, extNoct: { q: 0, v: 0 },
                rDom: { q: 0, v: 0 }, extDom: { q: 0, v: 0 }, totalExtra: 0,
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
                aggregate.totalExtra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal);

                const pending = Math.max(0, r.ordinaryHours - r.totalHours);
                const pendingVal = pending * rates.extDia;
                aggregate.pendingHours.q += pending;
                aggregate.pendingHours.v += pendingVal;

                const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
                if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
                aggregate.ops[opKey].days += r.esMedioDia ? 0.5 : 1;
                aggregate.ops[opKey].extra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal);
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
            XLSX.writeFile(wb, `Nomina_${worker}_${selectedMonth}_Q${selectedFortnight}.xlsx`);
        };
    }

    if (printSummaryBtn) {
        printSummaryBtn.onclick = () => {
            const worker = workerFilter.value;
            if (!worker) return alert('Debe seleccionar un trabajador en el Resumen de Nómina antes de imprimir.');
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

            // Reutilizar la lógica de exportar el resumen y añadir la hoja de detalles de turnos
            const rates = calculateDynamicRates(workerRates[worker]?.quincena || (1750905 / 2), 15);
            const wb = XLSX.utils.book_new();

            // Hoja 1: Resumen
            let aggregate = {
                extDia: { q: 0, v: 0 }, rNoct: { q: 0, v: 0 }, extNoct: { q: 0, v: 0 },
                rDom: { q: 0, v: 0 }, extDom: { q: 0, v: 0 }, totalExtra: 0,
                pendingHours: { q: 0, v: 0 }, ops: {}
            };

            workerRecords.forEach(r => {
                const d = getDetailedShiftPay(r);
                aggregate.extDia.q += d.extDiaQty; aggregate.extDia.v += d.extDiaVal;
                aggregate.rNoct.q += d.recNoctQty; aggregate.rNoct.v += d.recNoctVal;
                aggregate.extNoct.q += d.extNoctQty; aggregate.extNoct.v += d.extNoctVal;
                aggregate.rDom.q += d.recDomQty; aggregate.rDom.v += d.recDomVal;
                aggregate.extDom.q += d.extDomQty; aggregate.extDom.v += d.extDomVal;
                aggregate.totalExtra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal);

                const pending = Math.max(0, r.ordinaryHours - r.totalHours);
                const pendingVal = pending * rates.extDia;
                aggregate.pendingHours.q += pending;
                aggregate.pendingHours.v += pendingVal;

                const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
                if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
                aggregate.ops[opKey].days += r.esMedioDia ? 0.5 : 1;
                aggregate.ops[opKey].extra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal);
                aggregate.ops[opKey].pending += pendingVal;
            });

            const equivalentDays = workerRecords.reduce((acc, r) => acc + (r.esMedioDia ? 0.5 : 1), 0);
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
                const pending = Math.max(0, rec.ordinaryHours - rec.totalHours);
                const pendingVal = pending * rates.extDia;

                summaryData.push([
                    rec.date,
                    dayName,
                    `${rec.opNumber || '-'} / ${rec.projectName}`,
                    rec.location.toUpperCase(),
                    rec.timeIn,
                    rec.timeOut,
                    rec.ordinaryHours,
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

            XLSX.writeFile(wb, `Reporte_Completo_${worker}.xlsx`);
        };
    }

    // Funciones PDF removidas, dejamos solo la advertencia en caso de que quieran exportar la tabla simple como PDF
    function generatePDF(element, filename, isCustomContainer) {
        // Mantenida temporalmente solo por si se usa en "Solo Tabla", aunque ya no se recomienda
    }

    // --- 7. Inicialización y Exportación Final ---
    window.renderSummary = renderSummary; // Hacerlo global para el fail-safe del HTML
    console.log("%c ControlHoras v4.0 Cargado Correctamente ", "background: #10b981; color: white; padding: 5px; border-radius: 3px;");

    // (Filtros ya inicializados arriba en línea ~578-584)

    // Inicializar funciones base
    updateDatalists();
    updateWorkerSelects();
    try {
        renderTable();
    } catch (err) {
        console.error("Error al renderizar tabla inicial:", err);
        tableBody.innerHTML = '<tr><td colspan="11" style="text-align:center;color:#dc2626;padding:1rem;">Error al cargar registros. Puede que haya datos corruptos en el almacenamiento local.</td></tr>';
    }
    if (workerFilter && workerFilter.value) {
        try { renderSummary(); } catch (err) { console.error("Error al renderizar resumen:", err); }
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
                            </select>
                        </td>
                        <td style="padding: 8px;"><input type="text" class="b-prj" value="${glPrj.replace(/"/g, '&quot;')}" list="projectsList" style="width:100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px;"><input type="text" class="b-op" value="${glOp.replace(/"/g, '&quot;')}" list="opList" style="width:100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px; text-align: center;"><input type="checkbox" class="b-falta" style="width: 1.2rem; height: 1.2rem; accent-color: var(--color-danger);"></td>
                        <td style="padding: 8px; text-align: center;"><input type="checkbox" class="b-medio" style="width: 1.2rem; height: 1.2rem; accent-color: var(--color-warning);"></td>
                        <td style="padding: 8px; text-align: center;"><input type="checkbox" class="b-viaje" style="width: 1.2rem; height: 1.2rem; accent-color: var(--color-accent-primary);"></td>
                        <td style="padding: 8px;"><input type="time" class="b-in" style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px;"><input type="text" class="b-out" placeholder="MM:HH" pattern="^([0-9]+):([0-5][0-9])$" title="Formato HH:MM (ej. 26:30)" style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
                        <td style="padding: 8px;"><input type="number" class="b-perm" step="0.5" min="0" style="width: 100%; padding: 4px; border: 1px solid #cbd5e1; border-radius: 4px;"></td>
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
                });
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
                const inVal = row.querySelector('.b-in').value;
                const outVal = row.querySelector('.b-out').value;
                const permVal = parseFloat(row.querySelector('.b-perm').value) || 0;
                
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

                const ordinaryHours = isViaje ? 0 : getOrdinaryHours(date, location, isMedio);
                const effectiveWorkedHours = (parseFloat(totalHours) + permVal).toFixed(2);

                const recordData = {
                    id: Date.now() + Math.floor(Math.random()*10000), // Randomize id to avoid overlaps
                    workerName: worker, 
                    date: date, 
                    location: location, 
                    projectName: prj, 
                    opNumber: op, 
                    timeIn: tIn, 
                    timeOut: tOut, 
                    totalHours: effectiveWorkedHours, 
                    realWorkedHours: totalHours,
                    ordinaryHours: ordinaryHours, 
                    esMedioDia: isViaje ? false : isMedio, 
                    travelHours: travelHoursCount, 
                    isTravelRecord: isViaje,
                    permissionHours: permVal
                };

                // Si ya existe registro de ese trabajador ese dia, lo reemplazamos
                const existingIndex = records.findIndex(r => r.workerName === worker && r.date === date);
                if (existingIndex !== -1) {
                    records[existingIndex] = recordData;
                } else {
                    records.push(recordData);
                }
                addedCount++;
            });

            if (addedCount > 0) {
                saveRecords();
                renderTable();
                bulkModal.style.display = 'none';
                
                const toast = document.createElement('div');
                toast.innerHTML = `<i class="ph ph-check-circle"></i> ${addedCount} turnos registrados correctamente.`;
                toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 4000);
            } else {
                alert('No se registró ningún turno. Asegúrese de llenar Entrada y Salida o marcar Falta en al menos un día.');
            }
        };
    }

    // --- REPORTES GLOBALES ---
    const btnShowReports = document.getElementById('btn-show-reports');
    const globalReportModal = document.getElementById('globalReportModal');
    const btnCloseReportModal = document.getElementById('btnCloseReportModal');
    const globalReportTableBody = document.getElementById('globalReportTableBody');
    const btnExportGlobalReport = document.getElementById('btnExportGlobalReport');
    const reportPeriodText = document.getElementById('reportPeriodText');

    console.log("Sistema de reportes inicializado:", {
        btnShowReports: !!btnShowReports,
        globalReportModal: !!globalReportModal,
        reportPeriodText: !!reportPeriodText
    });

    const renderGlobalReport = () => {
        try {
            const selectedMonth = filterMonth ? filterMonth.value : "01";
            const selectedFortnight = filterFortnight ? filterFortnight.value : "1";
            const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
            
            if (reportPeriodText) {
                const year = new Date().getFullYear();
                const monthName = monthNames[parseInt(selectedMonth) - 1] || "Mes";
                reportPeriodText.innerText = `Periodo: ${selectedFortnight === '1' ? '1ra Quincena' : '2da Quincena'} de ${monthName} de ${year}`;
            }

            if (!globalReportTableBody) return;
            globalReportTableBody.innerHTML = '';
            
            const workers = Object.keys(workerRates);
            console.log(`Generando reporte para ${workers.length} trabajadores...`);
            
            workers.forEach(worker => {
                const workerRecords = records.filter(r => {
                    if (!r.workerName || !r.date) return false;
                    const sameWorker = r.workerName.trim().toUpperCase() === worker.trim().toUpperCase();
                    if (!sameWorker) return false;
                    
                    const parts = r.date.split('-');
                    if (parts.length < 3) return false;
                    const rMonth = parts[1];
                    const rDay = parseInt(parts[2]);
                    
                    if (rMonth !== selectedMonth) return false;
                    if (selectedFortnight === "1") return rDay <= 15;
                    return rDay > 15;
                });

                let stats = {
                    daysLab: 0,
                    hrsOrd: 0,
                    hrsWorked: 0,
                    hrsPermission: 0,
                    hrsPending: 0,
                    hrsExtra: 0
                };

                workerRecords.forEach(r => {
                    if (r.isTravelRecord) return;
                    
                    const ord = parseFloat(r.ordinaryHours) || 0;
                    const wrk = parseFloat(r.realWorkedHours || r.totalHours) || 0;
                    const prm = parseFloat(r.permissionHours) || 0;
                    
                    stats.daysLab += (r.esMedioDia ? 0.5 : 1);
                    stats.hrsOrd += ord;
                    stats.hrsWorked += wrk;
                    stats.hrsPermission += prm;
                    
                    const totalEff = wrk + prm;
                    const pending = Math.max(0, ord - totalEff);
                    const extra = Math.max(0, totalEff - ord);
                    
                    stats.hrsPending += pending;
                    stats.hrsExtra += extra;
                });

                const balance = shiftBalances[worker] || 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); font-weight: 600;">${worker}</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center;">${stats.daysLab}</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center;">${stats.hrsOrd.toFixed(1)}h</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center;">${stats.hrsWorked.toFixed(1)}h</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--color-accent-primary);">${stats.hrsPermission.toFixed(1)}h</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center; color: ${stats.hrsPending > 0 ? 'var(--color-danger)' : 'inherit'}; font-weight: ${stats.hrsPending > 0 ? '700' : 'normal'}">${stats.hrsPending.toFixed(1)}h</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center; color: var(--color-success); font-weight: 600;">${stats.hrsExtra.toFixed(1)}h</td>
                    <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center; font-weight: 700; color: ${balance < 0 ? 'var(--color-danger)' : 'var(--color-success)'}">${balance.toFixed(1)}h</td>
                `;
                globalReportTableBody.appendChild(tr);
            });

            if (workers.length === 0) {
                globalReportTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--color-text-tertiary);">No hay trabajadores registrados.</td></tr>';
            }
        } catch (error) {
            console.error("Error al renderizar reporte global:", error);
        }
    };

    if (btnShowReports) {
        btnShowReports.addEventListener('click', (e) => {
            e.preventDefault();
            console.log("Clic detectado en botón de reportes");
            renderGlobalReport();
            if (globalReportModal) globalReportModal.style.display = 'block';
        });
    }

    if (btnCloseReportModal) {
        btnCloseReportModal.addEventListener('click', () => {
            if (globalReportModal) globalReportModal.style.display = 'none';
        });
    }

    if (btnExportGlobalReport) {
        btnExportGlobalReport.addEventListener('click', () => {
            if (typeof XLSX === 'undefined') return alert('Librería Excel no disponible.');
            
            const wb = XLSX.utils.book_new();
            const data = [
                ['REPORTE GLOBAL DE HORAS PENDIENTES'],
                [reportPeriodText ? reportPeriodText.innerText : ''],
                [],
                ['Trabajador', 'Días Lab.', 'Horas Ordinarias', 'Horas Trabajadas', 'Horas Pendientes', 'Horas Extra', 'Saldo Acumulado']
            ];

            const rows = globalReportTableBody.querySelectorAll('tr');
            rows.forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length < 7) return;
                data.push([
                    cells[0].innerText,
                    cells[1].innerText,
                    cells[2].innerText,
                    cells[3].innerText,
                    cells[4].innerText,
                    cells[5].innerText,
                    cells[6].innerText
                ]);
            });

            const ws = XLSX.utils.aoa_to_sheet(data);
            XLSX.utils.book_append_sheet(wb, ws, "Reporte Global");
            const month = filterMonth ? filterMonth.value : "00";
            const fort = filterFortnight ? filterFortnight.value : "0";
            XLSX.writeFile(wb, `Reporte_Horas_Pendientes_${month}_Q${fort}.xlsx`);
        });
    }

    // --- GESTIÓN DE TRABAJADORES ---
    const btnShowWorkers = document.getElementById('btn-show-workers');
    const workersModal = document.getElementById('workersModal');
    const btnCloseWorkersModal = document.getElementById('btnCloseWorkersModal');
    const addWorkerForm = document.getElementById('addWorkerForm');
    const workersTableBody = document.getElementById('workersTableBody');

    const renderWorkersTable = () => {
        if (!workersTableBody) return;
        workersTableBody.innerHTML = '';
        const sortedWorkers = Object.entries(workerRates).sort((a, b) => a[0].localeCompare(b[0]));
        sortedWorkers.forEach(([name, data]) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td style="padding: 12px; border-bottom: 1px solid var(--border-color); font-weight: 600;">${name}</td>
                <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center;">$${data.quincena.toLocaleString()}</td>
                <td style="padding: 12px; border-bottom: 1px solid var(--border-color); text-align: center;">
                    <button type="button" class="btn-delete-worker" data-name="${name}" style="background: none; border: none; color: var(--color-danger); cursor: pointer; padding: 4px;">
                        <i class="ph ph-trash" style="font-size: 1.2rem;"></i>
                    </button>
                </td>
            `;
            workersTableBody.appendChild(tr);
        });

        document.querySelectorAll('.btn-delete-worker').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const workerToDelete = e.currentTarget.getAttribute('data-name');
                if (confirm(`¿Seguro que deseas eliminar a ${workerToDelete}? Esto no borrará sus registros, pero ya no aparecerá en las listas.`)) {
                    delete workerRates[workerToDelete];
                    localStorage.setItem('workerRates', JSON.stringify(workerRates));
                    updateWorkerSelects();
                    renderWorkersTable();
                }
            });
        });
    };

    if (btnShowWorkers) {
        btnShowWorkers.addEventListener('click', (e) => {
            e.preventDefault();
            if (workersModal) {
                renderWorkersTable();
                workersModal.style.display = 'block';
            }
        });
    }

    if (btnCloseWorkersModal) {
        btnCloseWorkersModal.addEventListener('click', () => {
            if (workersModal) workersModal.style.display = 'none';
        });
    }

    if (addWorkerForm) {
        addWorkerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const nameInput = document.getElementById('newWorkerName');
            const quincenaInput = document.getElementById('newWorkerQuincena');
            const name = nameInput.value.trim().toUpperCase();
            const quincena = parseFloat(quincenaInput.value);

            if (name && !isNaN(quincena)) {
                workerRates[name] = { quincena: quincena };
                localStorage.setItem('workerRates', JSON.stringify(workerRates));
                updateWorkerSelects();
                renderWorkersTable();
                
                nameInput.value = '';
                quincenaInput.value = '';
                
                // Show toast notification
                const toast = document.createElement('div');
                toast.innerHTML = `<i class="ph ph-check-circle"></i> Trabajador agregado correctamente.`;
                toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 3000);
            }
        });
    }

});

