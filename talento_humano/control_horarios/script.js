document.addEventListener('DOMContentLoaded', () => {
    const hourForm = document.getElementById('hourForm');
    const tableBody = document.getElementById('tableBody');
    const payrollSummaryArea = document.getElementById('payrollSummaryArea');
    const workerFilter = document.getElementById('workerFilter');
    const tableWorkerFilter = document.getElementById('tableWorkerFilter');
    const crossPendingCheckbox = document.getElementById('crossPendingHours');
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
        "JULIO PIERNAGORDA": 1000000,
        "DIEGO VELANDIA": 1265000,
        "JORGE GILBERTO RODRIGUEZ AGUILERA": 1350000,
        "HENRY GONZALES": 1320000
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
        // No sincronizar con Personal según instrucción: "no integres esos dos modulos"
        console.log("Carga de trabajadores desde Personal desactivada. Usando base fija.");
    };

    // Actualizar el select de trabajadores en el HTML
    const updateWorkerSelects = () => {
        const selects = [document.getElementById('workerName'), document.getElementById('tableWorkerFilter'), document.getElementById('workerFilter')];
        const options = '<option value="">Seleccione un trabajador...</option>' + 
            Object.keys(workerRates).map(w => `<option value="${w}">${w}</option>`).join('');
        
        selects.forEach(s => {
            if (s) {
                const currentVal = s.value;
                s.innerHTML = options;
                s.value = currentVal;
            }
        });
    };

    updateWorkerSelects();

    window.records = JSON.parse(localStorage.getItem('shiftRecords')) || [];

    const saveRecords = () => {
        localStorage.setItem('shiftRecords', JSON.stringify(records));
        updateDatalists();
    };

    const updateDatalists = () => {
        const projects = [...new Set(records.map(r => r.projectName))];
        const ops = [...new Set(records.map(r => r.opNumber))];
        if (projectsList) projectsList.innerHTML = projects.map(p => `<option value="${p}">`).join('');
        if (opList) opList.innerHTML = ops.map(o => `<option value="${o}">`).join('');
    };

    const getDayInfo = (dateStr) => {
        const date = new Date(dateStr + 'T00:00:00');
        const day = date.getDay();
        const isSunday = (day === 0);
        const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][day];
        return { day, dayName, isSunday };
    };

    const getOrdinaryHours = (dateStr, location, esMedioDia = false) => {
        const { day } = getDayInfo(dateStr);
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
        const ordHours = parseFloat(record.ordinaryHours) || 0;
        const { isSunday } = getDayInfo(record.date);
        const esMedioDia = record.esMedioDia === true;
        
        // El pago ordinario base será 1 día completo (o medio si es medio día).
        // Si no hay horas, el detalle valdrá 0.
        let tarifaDiaria = esMedioDia ? safeRates.dia / 2 : safeRates.dia;
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
            totalShift: tarifaDiaria + travelVal
        };

        if (totalHours === 0) return details; // Absent case

        const [hIn, mIn] = (record.timeIn || "00:00").split(':').map(Number);
        const ratesForCalcs = safeRates;
        let currentTime = hIn * 60 + mIn;
        let hourCount = 0;

        // Skip normal extra calculation if it's a travel-only record
        if (!record.isTravelRecord) {
            while (hourCount < totalHours) {
                const currentHour = (Math.floor(currentTime / 60)) % 24;
                const isNight = (currentHour >= 21 || currentHour < 5);
                const currentDayInfo = getDayInfo(record.date, Math.floor(currentTime / 60));

                if (hourCount < ordHours) {
                    // Horas Ordinarias
                    if (currentDayInfo.isSunday) {
                        details.recDomQty++;
                        details.recDomVal += ratesForCalcs.rDom;
                    } else if (isNight) {
                        details.recNoctQty++;
                        details.recNoctVal += ratesForCalcs.rNoct;
                    }
                } else {
                    // Horas Extras
                    if (currentDayInfo.isSunday) {
                        details.extDomQty++;
                        details.extDomVal += ratesForCalcs.extDom;
                    } else if (isNight) {
                        details.extNoctQty++;
                        details.extNoctVal += ratesForCalcs.extNoct;
                    } else {
                        details.extDiaQty++;
                        details.extDiaVal += ratesForCalcs.extDia;
                    }
                }

                currentTime += 60;
                hourCount++;
            }
        }

        const pending = Math.max(0, ordHours - totalHours);
        const pendingVal = pending * ratesForCalcs.extDia;

        details.totalShift = details.ordPay + details.extDiaVal + details.recNoctVal + details.extNoctVal + details.recDomVal + details.extDomVal + details.travelVal - pendingVal;
        return details;
    };

    const renderSummary = () => {
        const worker = (workerFilter.value || "").trim().toUpperCase();
        if (!worker) {
            payrollSummaryArea.innerHTML = '<div style="padding: 2rem; text-align: center; color: var(--color-text-tertiary);">Seleccione un trabajador para ver su resumen de nómina.</div>';
            return;
        }

        const workerRecords = records.filter(r => {
            const sameWorker = (r.workerName || "").trim().toUpperCase() === worker;
            if (!sameWorker) return false;
            
            // Filter by Period (Month/Fortnight)
            const date = r.date; // YYYY-MM-DD
            if (!date) return false;
            const parts = date.split('-');
            const rMonth = parts[1];
            const rDay = parseInt(parts[2]);
            const rYear = parts[0];
            
            const selectedMonth = filterMonth.value;
            const selectedFortnight = filterFortnight.value;
            
            if (rMonth !== selectedMonth) return false;
            if (selectedFortnight === "1") return rDay <= 15;
            return rDay > 15;
        });

        // We calculate equivalent worked days first to determine dynamic daily rate
        const equivalentDays = workerRecords.reduce((acc, r) => acc + (r.isTravelRecord ? 0 : (r.esMedioDia ? 0.5 : 1)), 0);
        
        const quincenaBase = (workerRates[worker] && workerRates[worker].quincena) ? workerRates[worker].quincena : (1750905 / 2);
        const rates = calculateDynamicRates(quincenaBase, equivalentDays || 1); 

        let aggregate = {
            totalDays: new Set(workerRecords.filter(r => !r.isTravelRecord).map(r => r.date)).size,
            extDia: { q: 0, v: 0 }, rNoct: { q: 0, v: 0 }, extNoct: { q: 0, v: 0 },
            rDom: { q: 0, v: 0 }, extDom: { q: 0, v: 0 }, travel: { q: 0, v: 0 },
            totalExtra: 0, totalPay: 0,
            pendingHours: { q: 0, v: 0 },
            ops: {}
        };

        workerRecords.forEach(r => {
            const d = getDetailedShiftPay(r, rates);
            if (!d) { // Handle case where getDetailedShiftPay returns null due to missing rates
                console.warn(`Skipping record for ${r.workerName} on ${r.date} due to missing rates or invalid data.`);
                return;
            }
            aggregate.extDia.q += d.extDiaQty; aggregate.extDia.v += d.extDiaVal;
            aggregate.rNoct.q += d.recNoctQty; aggregate.rNoct.v += d.recNoctVal;
            aggregate.extNoct.q += d.extNoctQty; aggregate.extNoct.v += d.extNoctVal;
            aggregate.rDom.q += d.recDomQty; aggregate.rDom.v += d.recDomVal;
            aggregate.extDom.q += d.extDomQty; aggregate.extDom.v += d.extDomVal;
            aggregate.travel.q += d.travelQty; aggregate.travel.v += d.travelVal;
            aggregate.totalExtra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);

            const pending = r.isTravelRecord ? 0 : Math.max(0, r.ordinaryHours - r.totalHours);
            const pendingVal = pending * rates.extDia;
            aggregate.pendingHours.q += pending;
            aggregate.pendingHours.v += pendingVal;

            // Calculate correct total pay for this day based on whether it was half day
            const dailyAdjusment = r.isTravelRecord ? 0 : (r.esMedioDia ? rates.dia / 2 : rates.dia);
            aggregate.totalPay += dailyAdjusment + d.totalShift - d.ordPay; // total pay minus the default 'ordPay' included in totalShift to avoid double counting

            const opKey = `${r.opNumber || 'S/N'} | ${r.projectName}`;
            if (!aggregate.ops[opKey]) aggregate.ops[opKey] = { days: 0, extra: 0, location: r.location, pending: 0 };
            aggregate.ops[opKey].days += r.isTravelRecord ? 0 : (r.esMedioDia ? 0.5 : 1);
            aggregate.ops[opKey].extra += (d.extDiaVal + d.extNoctVal + d.extDomVal + d.recNoctVal + d.recDomVal + d.travelVal);
            aggregate.ops[opKey].pending += pendingVal;
        });

        const baseAsignada = rates.quincena; // El valor asignado ya no se multiplica por rates.dia, porque rates.dia * equivalentDays = quincena (por definición de la nueva fórmula).


        let finalExtra = aggregate.totalExtra - aggregate.pendingHours.v;
        const finalTotalToPay = baseAsignada + finalExtra;

        payrollSummaryArea.innerHTML = `
            <div class="payroll-card" id="summaryCapture">
                <div class="payroll-header">Resumen de Nómina: ${worker}</div>
                
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
                    <div class="payroll-cell">EXTRA DIURNA 15%</div>
                    <div class="payroll-cell value">$${rates.extDia.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.extDia.q} h</div>
                    <div class="payroll-cell value">$${aggregate.extDia.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row">
                    <div class="payroll-cell">RECARGO NOCTURNO (9PM - 5AM)</div>
                    <div class="payroll-cell value">$${rates.rNoct.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.rNoct.q} h</div>
                    <div class="payroll-cell value">$${aggregate.rNoct.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row">
                    <div class="payroll-cell">EXTRA NOCTURNA 50%</div>
                    <div class="payroll-cell value">$${rates.extNoct.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.extNoct.q} h</div>
                    <div class="payroll-cell value">$${aggregate.extNoct.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row">
                    <div class="payroll-cell">RECARGO DOMINICAL 50%</div>
                    <div class="payroll-cell value">$${rates.rDom.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.rDom.q} h</div>
                    <div class="payroll-cell value">$${aggregate.rDom.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row">
                    <div class="payroll-cell">EXTRA DOMINICAL 75%</div>
                    <div class="payroll-cell value">$${rates.extDom.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.extDom.q} h</div>
                    <div class="payroll-cell value">$${aggregate.extDom.v.toLocaleString()}</div>
                </div>

                <div class="payroll-row">
                    <div class="payroll-cell">HORAS DE VIAJE (0.5x)</div>
                    <div class="payroll-cell value">$${rates.travel.toLocaleString()}</div>
                    <div class="payroll-cell value">${aggregate.travel.q} h</div>
                    <div class="payroll-cell value">$${Math.round(aggregate.travel.v).toLocaleString()}</div>
                </div>

                ${aggregate.pendingHours.q > 0 ? `
                <div class="payroll-row">
                    <div class="payroll-cell" style="color: #dc2626;">HORAS PENDIENTES (FALTANTES)</div>
                    <div class="payroll-cell value" style="color: #dc2626;">$${rates.extDia.toLocaleString()}</div>
                    <div class="payroll-cell value" style="color: #dc2626;">${aggregate.pendingHours.q.toFixed(2)} h</div>
                    <div class="payroll-cell value" style="color: #dc2626;">-$${aggregate.pendingHours.v.toLocaleString()}</div>
                </div>
                ` : ''}

                <div class="payroll-row payroll-total-row">
                    <div class="payroll-cell">TOTAL TRABAJO EXTRA ${aggregate.pendingHours.v > 0 ? '(CON DESCUENTO DE PENDIENTES)' : ''}</div>
                    <div class="payroll-cell"></div><div class="payroll-cell"></div>
                    <div class="payroll-cell value">$${finalExtra.toLocaleString()}</div>
                </div>

                <div class="payroll-row payroll-total-row" style="background: #e2e8f0;">
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
            const sameWorker = workerToFilter ? (r.workerName || '').trim().toUpperCase() === workerToFilter.trim().toUpperCase() : true;
            if (!sameWorker) return false;

            const date = r.date;
            if (!date) return false;
            const parts = date.split('-');
            const rMonth = parts[1];
            const rDay = parseInt(parts[2]);

            if (rMonth !== selectedMonth) return false;
            if (selectedFortnight === "1") return rDay <= 15;
            return rDay > 15;
        });

        recordsToDisplay.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach((rec) => {
            const extras = Math.max(0, rec.totalHours - rec.ordinaryHours).toFixed(2);
            const pending = Math.max(0, rec.ordinaryHours - rec.totalHours).toFixed(2);
            const diffDisplay = extras > 0 ? `<span style="color: var(--color-success)">+${extras}h</span>` :
                pending > 0 ? `<span style="color: var(--color-danger)">-${pending}h</span>` : '-';

            const { dayName } = getDayInfo(rec.date);
            const detail = getDetailedShiftPay(rec) || { recNoctQty: 0, totalShift: 0, ordPay: 0, extDiaQty: 0, extDiaVal: 0, recNoctVal: 0, extNoctQty: 0, extNoctVal: 0, recDomQty: 0, recDomVal: 0, extDomQty: 0, extDomVal: 0 };

            const isFalta = (parseFloat(rec.totalHours) === 0 && !rec.isTravelRecord);

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>
                    <strong>${rec.workerName}</strong>
                    <div style="font-size: 0.75rem; color: var(--color-accent-primary);">OP: ${rec.opNumber || '-'}</div>
                </td>
                <td>${dayName}</td>
                <td>${rec.date}</td>
                <td>
                    <span class="badge badge-${rec.location}">${(rec.location || '').toUpperCase()}</span>
                    <div style="font-size: 0.75rem; color: var(--color-text-secondary); margin-top: 4px;">${rec.projectName || '-'}</div>
                    ${rec.esMedioDia && !rec.isTravelRecord ? '<span class="badge" style="background: #fef08a; color: #854d0e; margin-top: 4px;"> MEDIO DÍA </span>' : ''}
                    ${isFalta ? '<span class="badge" style="background: #fee2e2; color: #991b1b; margin-top: 4px;"> FALTA INJUSTIFICADA </span>' : ''}
                    ${rec.isTravelRecord ? '<span class="badge" style="background: #e0e7ff; color: #4338ca; margin-top: 4px;"> VIAJE </span>' : ''}
                </td>
                <td><small>${isFalta ? 'N/A' : `${rec.timeIn || ''} - ${rec.timeOut || ''}`}</small></td>
                <td><span class="badge" style="background: #f1f5f9">${rec.isTravelRecord ? 'Viaje' : (detail.recNoctQty > 0 ? 'Nocturno' : 'Diurno')}</span></td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : rec.ordinaryHours + 'h'}</td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? rec.travelHours + 'h' : rec.totalHours + 'h'}</td>
                <td style="font-weight: 700;">${rec.isTravelRecord ? '-' : diffDisplay}</td>
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

    hourForm.onsubmit = (e) => {
        e.preventDefault();
        const workerName = document.getElementById('workerName').value;
        const date = document.getElementById('date').value;
        const location = document.getElementById('location').value;
        const projectName = document.getElementById('projectName').value;
        const opNumber = document.getElementById('opNumber').value;
        const timeIn = document.getElementById('timeIn').value;
        const timeOut = document.getElementById('timeOut').value;
        const isTravelRecord = recordTypeSelect ? (recordTypeSelect.value === 'travel') : false;

        const esMedioDia = isHalfDayCheckbox ? isHalfDayCheckbox.checked : false;
        const esFalta = isAbsentCheckbox ? isAbsentCheckbox.checked : false;

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
            // Solo cruza la medianoche asumiendo 24h si la hora de salida es estrictamente < 24.
            // Si ponen 26:00, la diferencia ya es correcta y no necesitamos sumar 24h
            if (diff < 0 && hOut < 24) diff += 24 * 60;
            
            if (isTravelRecord) {
                travelHoursCount = parseFloat((diff / 60).toFixed(2));
                totalHours = "0.00";
            } else {
                totalHours = (diff / 60).toFixed(2);
                travelHoursCount = 0;
            }
        }

        const ordinaryHours = isTravelRecord ? 0 : getOrdinaryHours(date, location, esMedioDia);

        const recordData = {
            id: editIdInput.value ? parseInt(editIdInput.value) : Date.now(),
            workerName, date, location, projectName, opNumber, timeIn: finalTimeIn, timeOut: finalTimeOut, totalHours, ordinaryHours, esMedioDia: isTravelRecord ? false : esMedioDia, travelHours: travelHoursCount, isTravelRecord
        };

        if (editIdInput.value) {
            const index = records.findIndex(r => r.id === parseInt(editIdInput.value));
            records[index] = recordData;
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
    // Initialize filters to current month and fortnight
    const today = new Date();
    const currentMonth = (today.getMonth() + 1).toString().padStart(2, '0');
    const currentDay = today.getDate();
    const currentFortnight = currentDay <= 15 ? "1" : "2";

    if (filterMonth) filterMonth.value = currentMonth;
    if (filterFortnight) filterFortnight.value = currentFortnight;

    if (workerFilter) {
        workerFilter.addEventListener('change', () => {
            console.log("Cambiando a trabajador:", workerFilter.value);
            renderSummary();
        });
    }

    if (tableWorkerFilter) {
        tableWorkerFilter.addEventListener('change', () => {
            renderTable();
        });
    }

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
                
                html += `
                    <tr data-date="${dateStr}" style="border-bottom: 1px solid #e2e8f0;">
                        <td style="padding: 8px;">${dateStr}</td>
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
                    isTravelRecord: isViaje
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

});

