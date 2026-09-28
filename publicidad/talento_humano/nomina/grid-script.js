document.addEventListener('DOMContentLoaded', () => {
    const gridBody = document.getElementById('gridBody');
    const filterMonth = document.getElementById('filterMonth');
    const filterFortnight = document.getElementById('filterFortnight');
    const workerSearch = document.getElementById('workerSearch');
    const btnSave = document.getElementById('btn-save-all');
    const btnExport = document.getElementById('btn-export-excel');
    const toast = document.getElementById('toast');

    // Individual View Elements
    const individualView = document.getElementById('individualView');
    const selectedWorkerName = document.getElementById('selectedWorkerName');
    const selectedWorkerBase = document.getElementById('selectedWorkerBase');
    const btnCloseDetail = document.getElementById('btnCloseDetail');
    const btnApplyDetail = document.getElementById('btnApplyDetail');
    const detailTotalExtras = document.getElementById('detailTotalExtras');
    const detailTotalNeto = document.getElementById('detailTotalNeto');

    // New Worker Modal Elements
    const btnAddWorker = document.getElementById('btn-add-worker');
    const modalNewWorker = document.getElementById('modalNewWorker');
    const btnCloseNewWorker = document.getElementById('btnCloseNewWorker');
    const btnSaveNewWorker = document.getElementById('btnSaveNewWorker');
    const newWorkerName = document.getElementById('newWorkerName');
    const newWorkerSalary = document.getElementById('newWorkerSalary');

    // Distribution Modal Elements
    const modalDistribution = document.getElementById('modalDistribution');
    const distWorkerName = document.getElementById('distWorkerName');
    const distTotalToSplit = document.getElementById('distTotalToSplit');
    const distRowsContainer = document.getElementById('distRowsContainer');
    const btnAddDistRow = document.getElementById('btnAddDistRow');
    const btnSaveDist = document.getElementById('btnSaveDist');
    const btnCloseDist = document.getElementById('btnCloseDist');
    const distCurrentSum = document.getElementById('distCurrentSum');
    const distDiff = document.getElementById('distDiff');

    // Totales elements
    const totalSalariosEl = document.getElementById('totalSalarios');
    const totalExtrasEl = document.getElementById('totalExtras');
    const totalBonosEl = document.getElementById('totalBonos');
    const totalDescuentosEl = document.getElementById('totalDescuentos');
    const totalGralEl = document.getElementById('totalGral');

    let currentEditingWorker = null;
    let currentDistWorker = null;

    // Constantes de Nómina 2026
    const SMLV = 1750905;
    const AUX_TRANSP = 249095;
    const SEG_SOCIAL_RATE = 0.04; // Ajustado a 4% según solicitud

    // Trabajadores dinámicos (Ahora como ARRAY para mantener el orden manual)
    let workersList = []; // Array de objetos { name, salary }

    const loadWorkers = () => {
        const saved = localStorage.getItem('dimalcco_publicidad_nomina_workers_v1');
        if (saved) {
            workersList = JSON.parse(saved);
            // Migración de objeto a array si es necesario
            if (!Array.isArray(workersList)) {
                const oldObj = workersList;
                workersList = Object.keys(oldObj).map(name => ({ name, salary: oldObj[name] }));
                saveWorkers();
            }
        } else {
            // Inicializar con la base fija si no hay nada
            const initialWorkers = {
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
            workersList = Object.keys(initialWorkers).map(name => ({ name, salary: initialWorkers[name] }));
            saveWorkers();
        }
    };

    const saveWorkers = () => {
        localStorage.setItem('dimalcco_publicidad_nomina_workers_v1', JSON.stringify(workersList));
    };

    let payrollData = {}; // key: period_tag, value: array of records

    const loadData = () => {
        const saved = localStorage.getItem('dimalcco_publicidad_nomina_grid_v1');
        if (saved) payrollData = JSON.parse(saved);
    };

    const getPeriodTag = () => `${filterMonth.value}-Q${filterFortnight.value}`;
    const fmt = (val) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(val);
    
    const parseNum = (val) => {
        if (val === null || val === undefined || val === '') return 0;
        if (typeof val === 'number') return val;
        
        let s = val.toString().trim();
        if (s.includes('.') && s.includes(',')) {
            s = s.replace(/\./g, '').replace(',', '.');
        } else if (s.includes('.') && !s.includes(',')) {
            s = s.replace(/\./g, '');
        } else if (s.includes(',')) {
            s = s.replace(',', '.');
        }
        
        s = s.replace(/[^0-9.]/g, '');
        const res = parseFloat(s);
        return isNaN(res) ? 0 : res;
    };

    const calculateRates = (quincenaTotal) => {
        const vDia = quincenaTotal / 15;
        const vHora = vDia / 8;
        return {
            extDia: vHora * 1.15,
            rNoct: vHora * 0.30,
            extNoct: vHora * 1.50,
            rDom: vHora * 0.50,
            extDom: vHora * 1.50,
            travel: vHora * 0.50
        };
    };

    const showToast = (msg) => {
        toast.textContent = msg;
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 3000);
    };

    const updateTotals = () => {
        let sumSalarios = 0, sumExtras = 0, sumBonos = 0, sumDescuentos = 0;
        gridBody.querySelectorAll('tr').forEach(row => {
            if (row.style.display === 'none') return;
            const salarioBase = parseNum(row.querySelector('.inp-salario').value);
            const extras = parseNum(row.querySelector('.inp-extras').value);
            const bonos = parseNum(row.querySelector('.inp-bonos').value);
            const descuentos = parseNum(row.querySelector('.inp-descuentos').value);
            
            // Revertido a lógica simple para la grilla (sin afectar liquidación con constantes)
            const total = salarioBase + extras + bonos - descuentos;
            row.querySelector('.cell-total').textContent = fmt(total);
            
            sumSalarios += salarioBase;
            sumExtras += extras;
            sumBonos += bonos;
            sumDescuentos += descuentos;
        });
        totalSalariosEl.textContent = fmt(sumSalarios);
        totalExtrasEl.textContent = fmt(sumExtras);
        totalBonosEl.textContent = fmt(sumBonos);
        totalDescuentosEl.textContent = fmt(sumDescuentos);
        
        totalGralEl.textContent = fmt(sumSalarios + sumExtras + sumBonos - sumDescuentos);
    };

    const updateIndividualTotals = () => {
        if (!currentEditingWorker) return;
        const wObj = workersList.find(w => w.name === currentEditingWorker);
        const salarioQ = wObj ? wObj.salary : 0;
        const rates = calculateRates(salarioQ);
        let totalExtras = 0;

        individualView.querySelectorAll('.calc-row[data-type]').forEach(row => {
            const type = row.dataset.type;
            const qty = parseFloat(row.querySelector('.qty-input').value) || 0;
            const unit = rates[type] || 0;
            const sub = qty * unit;
            row.querySelector('.unit-val').textContent = fmt(unit);
            row.querySelector('.subtotal-val').textContent = fmt(sub);
            totalExtras += sub;
        });

        detailTotalExtras.dataset.raw = totalExtras;
        detailTotalExtras.textContent = fmt(totalExtras);
        detailTotalNeto.textContent = fmt(salarioQ + totalExtras);
    };

    const openIndividualCalc = (worker) => {
        currentEditingWorker = worker;
        selectedWorkerName.textContent = worker;
        const wObj = workersList.find(w => w.name === worker);
        const salarioQ = wObj ? wObj.salary : 0;
        selectedWorkerBase.textContent = `Salario Quincenal: ${fmt(salarioQ)}`;
        
        individualView.querySelectorAll('.qty-input').forEach(input => input.value = 0);
        updateIndividualTotals();
        
        individualView.style.display = 'block';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Distribución Logic ---
    const updateDistTotals = () => {
        const totalToSplit = parseNum(distTotalToSplit.textContent);
        let currentSum = 0;
        distRowsContainer.querySelectorAll('.dist-row').forEach(row => {
            currentSum += parseNum(row.querySelector('.dist-amount').value);
        });
        
        const diff = totalToSplit - currentSum;
        distCurrentSum.textContent = fmt(currentSum);
        distDiff.textContent = fmt(diff);
        distDiff.style.color = Math.abs(diff) < 1 ? 'var(--secondary)' : 'var(--primary)';
    };

    const addDistRow = (op = '', amount = 0) => {
        const div = document.createElement('div');
        div.className = 'dist-row animate-fade';
        div.innerHTML = `
            <input type="text" class="dist-input dist-op" placeholder="OP #" value="${op}">
            <input type="text" class="dist-input dist-amount" placeholder="Monto" value="${fmt(amount)}">
            <button class="btn-clear btn-del-dist"><i class="ph ph-trash"></i></button>
        `;
        const amountInput = div.querySelector('.dist-amount');
        amountInput.addEventListener('input', updateDistTotals);
        amountInput.addEventListener('focus', () => {
            const raw = parseNum(amountInput.value);
            amountInput.value = raw === 0 ? '' : raw;
            amountInput.select();
        });
        amountInput.addEventListener('blur', () => {
            amountInput.value = fmt(parseNum(amountInput.value));
            updateDistTotals();
        });
        
        div.querySelector('.btn-del-dist').addEventListener('click', () => {
            div.remove();
            updateDistTotals();
        });
        distRowsContainer.appendChild(div);
        updateDistTotals();
    };

    const openDistModal = (worker) => {
        currentDistWorker = worker;
        distWorkerName.textContent = worker;
        
        const tag = getPeriodTag();
        const records = payrollData[tag] || [];
        const rec = records.find(r => r.worker === worker);
        
        const row = gridBody.querySelector(`tr[data-worker="${worker}"]`);
        const total = parseNum(row.querySelector('.cell-total').textContent);
        distTotalToSplit.textContent = fmt(total);
        
        distRowsContainer.innerHTML = '';
        if (rec && rec.distribution && rec.distribution.length > 0) {
            rec.distribution.forEach(d => addDistRow(d.op, d.amount));
        } else {
            addDistRow('', total);
        }
        
        modalDistribution.style.display = 'flex';
    };

    const renderGrid = () => {
        const tag = getPeriodTag();
        const records = payrollData[tag] || [];
        gridBody.innerHTML = '';
        
        workersList.forEach((wObj, index) => {
            const worker = wObj.name;
            const savedRec = records.find(r => r.worker === worker);
            const salario = savedRec ? savedRec.salario : wObj.salary;
            const extras = savedRec ? savedRec.extras : 0;
            const bonos = savedRec ? (savedRec.bonos || 0) : 0;
            const descuentos = savedRec ? (savedRec.descuentos || 0) : 0;

            const tr = document.createElement('tr');
            tr.dataset.worker = worker;
            tr.innerHTML = `
                <td style="color: var(--text-muted); font-size: 0.8rem;">
                    <div style="display: flex; flex-direction: column; align-items: center; gap: 2px;">
                        <button class="btn-move-up btn-clear" style="padding:0; height:12px; font-size: 10px;" title="Subir"><i class="ph ph-caret-up"></i></button>
                        <span>${index + 1}</span>
                        <button class="btn-move-down btn-clear" style="padding:0; height:12px; font-size: 10px;" title="Bajar"><i class="ph ph-caret-down"></i></button>
                    </div>
                </td>
                <td class="font-bold worker-name-cell">${worker}</td>
                <td><input type="text" class="grid-input inp-salario" value="${fmt(salario)}"></td>
                <td><input type="text" class="grid-input inp-extras" value="${fmt(extras)}"></td>
                <td><input type="text" class="grid-input inp-bonos" value="${fmt(bonos)}"></td>
                <td><input type="text" class="grid-input inp-descuentos" value="${fmt(descuentos)}"></td>
                <td class="text-right font-bold cell-total" style="color: var(--primary);">${fmt(salario + extras + bonos - descuentos)}</td>
                <td class="text-right">
                    <div style="display: flex; gap: 0.5rem; justify-content: flex-end;">
                        <button class="btn-calc" style="background:none; border:none; color: var(--primary); cursor:pointer; font-size: 1.2rem;" title="Calculadora Detallada">
                            <i class="ph ph-calculator"></i>
                        </button>
                        <button class="btn-dist" style="background:none; border:none; color: var(--secondary); cursor:pointer; font-size: 1.2rem;" title="Distribuir por OP">
                            <i class="ph ph-list-numbers"></i>
                        </button>
                        <button class="btn-print" style="background:none; border:none; color: #f59e0b; cursor:pointer; font-size: 1.2rem;" title="Imprimir Recibo">
                            <i class="ph ph-printer"></i>
                        </button>
                        <button class="btn-del-worker" style="background:none; border:none; color: #ef4444; cursor:pointer; font-size: 1.2rem;" title="Eliminar Trabajador">
                            <i class="ph ph-trash"></i>
                        </button>
                    </div>
                </td>
            `;
            
            tr.querySelectorAll('input').forEach(input => {
                input.addEventListener('input', updateTotals);
                input.addEventListener('focus', () => {
                    const raw = parseNum(input.value);
                    input.value = raw === 0 ? '' : raw;
                    input.select();
                });
                input.addEventListener('blur', () => {
                    input.value = fmt(parseNum(input.value));
                    updateTotals();
                });
            });

            tr.querySelector('.btn-calc').addEventListener('click', () => openIndividualCalc(worker));
            tr.querySelector('.btn-dist').addEventListener('click', () => openDistModal(worker));
            tr.querySelector('.btn-print').addEventListener('click', () => printIndividualReceipt(worker));
            
            tr.querySelector('.btn-move-up').addEventListener('click', () => {
                if (index > 0) {
                    const temp = workersList[index];
                    workersList[index] = workersList[index - 1];
                    workersList[index - 1] = temp;
                    saveWorkers();
                    renderGrid();
                }
            });
            tr.querySelector('.btn-move-down').addEventListener('click', () => {
                if (index < workersList.length - 1) {
                    const temp = workersList[index];
                    workersList[index] = workersList[index + 1];
                    workersList[index + 1] = temp;
                    saveWorkers();
                    renderGrid();
                }
            });

            tr.querySelector('.btn-del-worker').addEventListener('click', () => {
                if (confirm(`¿Eliminar a ${worker} de la lista de trabajadores?`)) {
                    workersList.splice(index, 1);
                    saveWorkers();
                    renderGrid();
                }
            });

            gridBody.appendChild(tr);
        });
        updateTotals();
    };

    const generateReceiptPage = (doc, worker, isNewPage) => {
        if (isNewPage) doc.addPage();
        
        const tag = getPeriodTag();
        const row = gridBody.querySelector(`tr[data-worker="${worker}"]`);
        if (!row) return;

        const salarioGrid = parseNum(row.querySelector('.inp-salario').value);
        const extras = parseNum(row.querySelector('.inp-extras').value);
        const bonos = parseNum(row.querySelector('.inp-bonos').value);
        const descuentos = parseNum(row.querySelector('.inp-descuentos').value);
        
        const sueldoBase = SMLV / 2;
        const auxTransp = AUX_TRANSP / 2;
        const segSocial = SMLV * SEG_SOCIAL_RATE;
        const diferencia = salarioGrid - sueldoBase - auxTransp + segSocial;
        const total = salarioGrid + extras + bonos - descuentos;
        
        const records = payrollData[tag] || [];
        const rec = records.find(r => r.worker === worker);

        // Header
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.text("DIMALCCO PUBLICIDAD", 105, 15, { align: "center" });
        doc.setFontSize(10);
        doc.text("Comprobante de Pago de Nómina", 105, 22, { align: "center" });
        
        doc.setLineWidth(0.5);
        doc.line(15, 28, 195, 28);

        // Worker Info
        doc.setFont("helvetica", "bold");
        doc.text("Trabajador:", 15, 40);
        doc.setFont("helvetica", "normal");
        doc.text(worker, 45, 40);

        doc.setFont("helvetica", "bold");
        doc.text("Periodo:", 15, 47);
        doc.setFont("helvetica", "normal");
        doc.text(tag, 45, 47);

        // Table Breakdown
        const tableBody = [
            ["Salario (SMLV/2)", "", fmt(sueldoBase)],
            ["Diferencia de Salario / Ajuste", "", fmt(diferencia)],
            ["Auxilio de Transporte / 2", "", fmt(auxTransp)],
            ["Horas Extras y Recargos", "", fmt(extras)],
            ["Bonificaciones / Otros Pagos", "", fmt(bonos)],
            ["Descuentos / Otros Conceptos", "", fmt(descuentos)],
            ["Descuentos por Seguridad Social (SMLV*4%)", "", { content: `-${fmt(segSocial)}`, styles: { textColor: [239, 68, 68] } }],
            [{ content: "TOTAL NETO A PAGAR", styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }, "", { content: fmt(total), styles: { fontStyle: 'bold', fillColor: [240, 240, 240] } }]
        ];

        doc.autoTable({
            startY: 55,
            head: [['Concepto', 'Detalle', 'Valor']],
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] }
        });

        // OP Distribution
        if (rec && rec.distribution && rec.distribution.length > 0) {
            doc.text("Distribución por Orden de Producción (OP):", 15, doc.lastAutoTable.finalY + 15);
            const distBody = rec.distribution.map(d => [d.op, fmt(d.amount)]);
            doc.autoTable({
                startY: doc.lastAutoTable.finalY + 20,
                head: [['Número OP', 'Monto Asignado']],
                body: distBody,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }
            });
        }

        // Signatures
        const finalY = doc.lastAutoTable.finalY + 40;
        doc.line(15, finalY, 80, finalY);
        doc.text("Firma del Trabajador", 15, finalY + 5);
        
        doc.line(130, finalY, 195, finalY);
        doc.text("Autorizado por DIMALCCO Publicidad", 130, finalY + 5);
    };

    const printIndividualReceipt = (worker) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        generateReceiptPage(doc, worker, false);
        const tag = getPeriodTag();
        doc.save(`Recibo_${worker.replace(/\s+/g, '_')}_${tag}.pdf`);
    };

    const exportAllReceipts = () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let count = 0;
        
        workersList.forEach((wObj, index) => {
            const row = gridBody.querySelector(`tr[data-worker="${wObj.name}"]`);
            if (row && row.style.display !== 'none') {
                generateReceiptPage(doc, wObj.name, count > 0);
                count++;
            }
        });
        
        if (count === 0) return alert("No hay trabajadores visibles para exportar.");
        
        const tag = getPeriodTag();
        doc.save(`Nomina_Completa_Recibos_${tag}.pdf`);
        showToast("PDF consolidado generado con éxito.");
    };

    const btnExportAllPdf = document.getElementById('btn-export-all-pdf');
    btnExportAllPdf.addEventListener('click', exportAllReceipts);

    workerSearch.addEventListener('input', (e) => {
        const term = e.target.value.trim().toUpperCase();
        gridBody.querySelectorAll('tr').forEach(row => {
            const name = row.dataset.worker.toUpperCase();
            row.style.display = name.includes(term) ? '' : 'none';
        });
        updateTotals();
    });

    btnCloseDetail.addEventListener('click', () => {
        individualView.style.display = 'none';
        currentEditingWorker = null;
    });

    individualView.querySelectorAll('.qty-input').forEach(input => {
        input.addEventListener('input', updateIndividualTotals);
    });

    btnApplyDetail.addEventListener('click', () => {
        if (!currentEditingWorker) return;
        const totalExtras = parseFloat(detailTotalExtras.dataset.raw) || 0;
        const row = gridBody.querySelector(`tr[data-worker="${currentEditingWorker}"]`);
        if (row) {
            row.querySelector('.inp-extras').value = fmt(Math.round(totalExtras));
            updateTotals();
            showToast(`Extras actualizadas para ${currentEditingWorker}`);
            individualView.style.display = 'none';
            currentEditingWorker = null;
        }
    });

    // Eventos Trabajadores
    btnAddWorker.addEventListener('click', () => {
        newWorkerName.value = '';
        newWorkerSalary.value = '';
        modalNewWorker.style.display = 'flex';
    });

    btnCloseNewWorker.addEventListener('click', () => modalNewWorker.style.display = 'none');

    btnSaveNewWorker.addEventListener('click', () => {
        const name = newWorkerName.value.trim().toUpperCase();
        const salary = parseNum(newWorkerSalary.value);
        if (!name || salary <= 0) return alert("Ingrese nombre y salario válido");
        
        workersList.push({ name, salary });
        saveWorkers();
        renderGrid();
        modalNewWorker.style.display = 'none';
        showToast(`Trabajador ${name} agregado.`);
    });

    newWorkerSalary.addEventListener('blur', () => {
        newWorkerSalary.value = fmt(parseNum(newWorkerSalary.value));
    });

    // Eventos Distribución
    btnAddDistRow.addEventListener('click', () => addDistRow());
    btnCloseDist.addEventListener('click', () => modalDistribution.style.display = 'none');
    btnSaveDist.addEventListener('click', () => {
        const dists = [];
        distRowsContainer.querySelectorAll('.dist-row').forEach(row => {
            const op = row.querySelector('.dist-op').value.trim();
            const amount = parseNum(row.querySelector('.dist-amount').value);
            if (op && amount > 0) dists.push({ op, amount });
        });
        
        const tag = getPeriodTag();
        if (!payrollData[tag]) payrollData[tag] = [];
        let rec = payrollData[tag].find(r => r.worker === currentDistWorker);
        if (!rec) {
            const row = gridBody.querySelector(`tr[data-worker="${currentDistWorker}"]`);
            rec = {
                worker: currentDistWorker,
                salario: parseNum(row.querySelector('.inp-salario').value),
                extras: parseNum(row.querySelector('.inp-extras').value),
                bonos: parseNum(row.querySelector('.inp-bonos').value),
                descuentos: parseNum(row.querySelector('.inp-descuentos').value),
                distribution: dists
            };
            payrollData[tag].push(rec);
        } else {
            rec.distribution = dists;
        }
        
        modalDistribution.style.display = 'none';
        showToast(`Distribución guardada para ${currentDistWorker}`);
    });

    btnSave.addEventListener('click', () => {
        const tag = getPeriodTag();
        const records = payrollData[tag] || [];
        
        gridBody.querySelectorAll('tr').forEach(row => {
            const worker = row.dataset.worker;
            const salario = parseNum(row.querySelector('.inp-salario').value);
            const extras = parseNum(row.querySelector('.inp-extras').value);
            const bonos = parseNum(row.querySelector('.inp-bonos').value);
            const descuentos = parseNum(row.querySelector('.inp-descuentos').value);
            
            // Actualizar la lista maestra
            const wObj = workersList.find(w => w.name === worker);
            if (wObj) wObj.salary = salario;

            let rec = records.find(r => r.worker === worker);
            if (rec) {
                rec.salario = salario;
                rec.extras = extras;
                rec.bonos = bonos;
                rec.descuentos = descuentos;
            } else {
                records.push({ worker, salario, extras, bonos, descuentos, distribution: [] });
            }
        });
        
        payrollData[tag] = records;
        saveWorkers();
        localStorage.setItem('dimalcco_publicidad_nomina_grid_v1', JSON.stringify(payrollData));
        showToast('Nómina y Salarios Base actualizados.');
    });

    btnExport.addEventListener('click', () => {
        const tag = getPeriodTag();
        const data = [
            ["DIMALCCO PUBLICIDAD - NOMINA COMPLETA"], 
            ["Periodo: " + tag], 
            [], 
            ["Trabajador", "Salario Q.", "Extras", "Bonos", "Descuentos", "Neto Total", "Número OP", "Valor Asignado OP"]
        ];
        
        const records = payrollData[tag] || [];
        workersList.forEach((wObj) => {
            const worker = wObj.name;
            const row = gridBody.querySelector(`tr[data-worker="${worker}"]`);
            if (!row || row.style.display === 'none') return;

            const s = parseNum(row.querySelector('.inp-salario').value);
            const e = parseNum(row.querySelector('.inp-extras').value);
            const b = parseNum(row.querySelector('.inp-bonos').value);
            const d = parseNum(row.querySelector('.inp-descuentos').value);
            const total = s + e + b - d;

            const rec = records.find(r => r.worker === worker);
            
            if (rec && rec.distribution && rec.distribution.length > 0) {
                rec.distribution.forEach(dist => {
                    data.push([worker, s, e, b, d, total, dist.op, dist.amount]);
                });
            } else {
                data.push([worker, s, e, b, d, total, "Sin OP", total]);
            }
        });
        
        const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(wb, ws, "Nomina_Completa");
        XLSX.writeFile(wb, `Nomina_Completa_${tag}.xlsx`);
    });

    filterMonth.addEventListener('change', renderGrid);
    filterFortnight.addEventListener('change', renderGrid);
    loadWorkers();
    loadData();
    renderGrid();
});
