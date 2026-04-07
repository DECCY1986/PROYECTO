document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Inicialización de Datos (localStorage) ---
    let transactions = JSON.parse(localStorage.getItem('taxTransactions_publicidad')) || [
        { id: 1, concept: 'Pago ISR - Febrero', amount: 15300, date: '2026-02-15', type: 'renta' },
        { id: 2, concept: 'Pago IVA - Febrero', amount: 6100, date: '2026-02-15', type: 'iva' },
        { id: 3, concept: 'Pago ISR - Enero', amount: 14800, date: '2026-01-17', type: 'renta' }
    ];

    // Configuración de vencimientos (Días fijos de cada mes para simplificar)
    const deadlineConfig = {
        iva: {
            label: 'IVA Cuatrimestral (NIT 5)',
            schedule: [
                { month: 4, day: 19 }, // Mayo (0-indexed: 4)
                { month: 8, day: 15 }, // Septiembre (0-indexed: 8)
                { month: 0, day: 19 }  // Enero (0-indexed: 0)
            ],
            color: '#3b82f6'
        },
        retencion: {
            label: 'Retención Fuente (NIT 5)',
            schedule: [
                { month: 1, day: 16 }, // Feb
                { month: 2, day: 16 }, // Mar
                { month: 3, day: 20 }, // Abr
                { month: 4, day: 19 }, // May
                { month: 5, day: 17 }, // Jun
                { month: 6, day: 15 }, // Jul
                { month: 7, day: 19 }, // Ago
                { month: 8, day: 15 }, // Sep
                { month: 9, day: 16 }, // Oct
                { month: 10, day: 18 }, // Nov
                { month: 11, day: 16 }, // Dic
                { month: 0, day: 19 }  // Ene (2027)
            ],
            color: '#f59e0b'
        },
        renta: { label: 'Renta Anual', day: 25, month: 3, color: '#10b981' }, // Marzo
        reteica_soacha: {
            label: 'ReteICA Soacha',
            schedule: [
                { month: 1, day: 27 }, // Feb (Ene)
                { month: 2, day: 31 }, // Mar (Feb)
                { month: 3, day: 30 }, // Abr (Mar)
                { month: 4, day: 29 }, // May (Abr)
                { month: 5, day: 30 }, // Jun (May)
                { month: 6, day: 31 }, // Jul (Jun)
                { month: 7, day: 31 }, // Ago (Jul)
                { month: 8, day: 30 }, // Sep (Ago)
                { month: 9, day: 30 }, // Oct (Sep)
                { month: 10, day: 30 },// Nov (Oct)
                { month: 11, day: 30 },// Dic (Nov)
                { month: 0, day: 29 }  // Ene 2027 (Dic)
            ],
            color: '#6366f1'
        },
        reteica_bogota: {
            label: 'ReteICA Bogotá',
            schedule: [
                { month: 2, day: 20 }, // Mar (Bim 1)
                { month: 4, day: 22 }, // May (Bim 2)
                { month: 6, day: 17 }, // Jul (Bim 3)
                { month: 8, day: 18 }, // Sep (Bim 4)
                { month: 10, day: 20 },// Nov (Bim 5)
                { month: 0, day: 15 }  // Ene 2027 (Bim 6)
            ],
            color: '#8b5cf6'
        },
        autoretencion_soacha: {
            label: 'Autoretención Soacha',
            schedule: [
                { month: 2, day: 27 }, // Mar (Bim 1)
                { month: 4, day: 29 }, // May (Bim 2)
                { month: 6, day: 31 }, // Jul (Bim 3)
                { month: 8, day: 25 }, // Sep (Bim 4)
                { month: 10, day: 27 },// Nov (Bim 5)
                { month: 0, day: 29 }  // Ene 2027 (Bim 6)
            ],
            color: '#ec4899'
        },
        autoretencion_bogota: {
            label: 'Autoretención Bogotá',
            schedule: [
                { month: 3, day: 10 }, // Abr (Bim 1)
                { month: 5, day: 12 }, // Jun (Bim 2)
                { month: 7, day: 21 }, // Ago (Bim 3)
                { month: 9, day: 9 },  // Oct (Bim 4)
                { month: 11, day: 11 },// Dic (Bim 5)
                { month: 1, day: 12 }  // Feb 2027 (Bim 6)
            ],
            color: '#f43f5e'
        },
        ica_anual: { label: 'ICA Anual', day: 30, month: 1, color: '#14b8a6' }, // Enero
        ingreso_general: { label: 'Ingresos Tarifa General (19%)', color: '#10b981' },
        ingreso_aiu: { label: 'Ingresos por AIU (19%)', color: '#34d399' },
        ingreso_no_gravado: { label: 'Ingresos No Gravados', color: '#6ee7b7' },
        devolucion_venta: { label: 'Devolución de Venta', color: '#f43f5e' },
        iva_descontable: { label: 'IVA Descontable (Sujeto a Prorrateo)', color: '#8b5cf6' }
    };

    const saveToLocalStorage = () => {
        localStorage.setItem('taxTransactions_publicidad', JSON.stringify(transactions));
    };

    // --- 2. Referencias del DOM ---
    const taxChartCtx = document.getElementById('taxChart').getContext('2d');
    const distChartCtx = document.getElementById('distributionChart').getContext('2d');
    const transactionList = document.querySelector('.transaction-list');
    const deadlinesList = document.getElementById('deadlinesList');
    // const totalPaidEl = document.querySelectorAll('.metric-value')[0]; // Changed to ID
    const totalPaidEl = document.getElementById('totalPaid');
    const netIncomeEl = document.getElementById('netIncome');
    const netIVAEl = document.getElementById('netIVA');
    const newPaymentBtn = document.getElementById('openModalBtn');
    const viewSelect = document.getElementById('viewSelect');
    const yearSelect = document.getElementById('yearSelect');
    const modal = document.getElementById('paymentModal');
    const closeModalBtn = document.getElementById('closeModal');
    const cancelModalBtn = document.getElementById('cancelBtn');
    const paymentForm = document.getElementById('paymentForm');

    let taxChart, distChart;

    // --- 3. Lógica de Gráficos ---
    const initCharts = () => {
        const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const view = viewSelect.value;

        // --- A. Gráfico Principal (Evolución) ---
        let datasets = [];

        if (view === 'total') {
            const monthlyData = new Array(12).fill(0);
            transactions.forEach(t => {
                const monthIndex = new Date(t.date).getMonth();
                monthlyData[monthIndex] += t.amount;
            });
            datasets = [{
                label: 'Total Pagado',
                data: monthlyData,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4
            }];
        } else {
            // Generar un dataset por cada tipo de impuesto
            const dataByCategory = {};
            Object.keys(deadlineConfig).forEach(type => {
                dataByCategory[type] = new Array(12).fill(0);
            });

            transactions.forEach(t => {
                if (dataByCategory[t.type]) {
                    const monthIndex = new Date(t.date).getMonth();
                    dataByCategory[t.type][monthIndex] += t.amount;
                }
            });

            datasets = Object.entries(dataByCategory).map(([type, data]) => ({
                label: deadlineConfig[type].label,
                data: data,
                backgroundColor: deadlineConfig[type].color,
                borderColor: deadlineConfig[type].color,
                borderWidth: 1
            })).filter(ds => ds.data.some(val => val > 0)); // Solo mostrar los que tienen datos
        }

        if (taxChart) taxChart.destroy();
        taxChart = new Chart(taxChartCtx, {
            type: view === 'total' ? 'line' : 'bar',
            data: {
                labels: months,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: view === 'category',
                        position: 'bottom',
                        labels: { usePointStyle: true, font: { size: 10 } }
                    }
                },
                scales: {
                    x: { stacked: view === 'category' },
                    y: { stacked: view === 'category', beginAtZero: true }
                }
            }
        });

        // --- B. Gráfico de Distribución (Doughnut) ---
        const typeTotals = {};
        transactions.forEach(t => {
            const label = deadlineConfig[t.type]?.label || 'Otros';
            typeTotals[label] = (typeTotals[label] || 0) + t.amount;
        });

        if (distChart) distChart.destroy();
        distChart = new Chart(distChartCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(typeTotals),
                datasets: [{
                    data: Object.values(typeTotals),
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#14b8a6'],
                    borderWidth: 0,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '70%',
                plugins: {
                    legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 10 } } }
                }
            }
        });
    };

    // --- 4. Renderizado de Interfaz ---
    const renderUI = () => {
        // A. Transacciones Recientes
        const sorted = [...transactions].sort((a, b) => new Date(b.date) - new Date(a.date));
        transactionList.innerHTML = '';
        let total = 0;

        sorted.forEach((t, index) => {
            total += t.amount;
            const li = document.createElement('li');
            li.className = 'transaction-item';

            let icon = 'files';
            const typeLower = t.type.toLowerCase();
            if (typeLower.includes('iva')) icon = 'shopping-cart';
            else if (typeLower.includes('ingreso')) icon = 'trend-up';
            else if (typeLower.includes('retencion')) icon = 'hand-coins';
            else if (typeLower.includes('renta')) icon = 'bank';
            else if (typeLower.includes('ica')) icon = 'buildings';

            li.innerHTML = `
                <div class="tx-info">
                    <div class="tx-icon generic"><i class="ph ph-${icon}"></i></div>
                    <div class="tx-details">
                        <h4>${t.concept}</h4>
                        <span>Pagado el ${new Date(t.date).toLocaleDateString('es-ES')}</span>
                    </div>
                </div>
                <div class="tx-actions">
                    <div class="tx-amount negative">-$${t.amount.toLocaleString()}</div>
                    <button class="delete-btn" data-id="${t.id}"><i class="ph ph-trash"></i></button>
                </div>
            `;
            transactionList.appendChild(li);
        });

        // B. Calendario de Vencimientos
        deadlinesList.innerHTML = '';
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        Object.entries(deadlineConfig).forEach(([key, cfg]) => {
            let dueDate;

            if (cfg.schedule) {
                // Encontrar la próxima fecha en el calendario programado
                const possibleDates = cfg.schedule.map(s => {
                    let d = new Date(currentYear, s.month, s.day);
                    if (d < now) d.setFullYear(currentYear + 1);
                    return d;
                });
                dueDate = possibleDates.sort((a, b) => a - b)[0];
            } else {
                dueDate = new Date(currentYear, cfg.month !== undefined ? cfg.month : currentMonth, cfg.day);
                if (dueDate < now && cfg.month === undefined) dueDate.setMonth(currentMonth + 1);
            }

            const daysLeft = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

            const li = document.createElement('li');
            li.className = 'deadline-item';
            li.style.borderLeftColor = cfg.color;
            li.innerHTML = `
                <div class="deadline-info">
                    <h4>${cfg.label}</h4>
                    <span>Vence el ${dueDate.toLocaleDateString('es-ES')}</span>
                </div>
                <div class="deadline-tag ${daysLeft < 5 ? 'urgent' : ''}">${daysLeft} días</div>
            `;
            deadlinesList.appendChild(li);
        });

        totalPaidEl.textContent = `$${total.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

        // C. Cálculo de IVA (Paso a Paso solicitado por Usuario)
        // 1 & 2. Ingresos y sus IVA respectivos
        const incGeneral = transactions.filter(t => t.type === 'ingreso_general').reduce((sum, t) => sum + t.amount, 0);
        const ivaGeneralValue = incGeneral * 0.19;

        const incAIU = transactions.filter(t => t.type === 'ingreso_aiu').reduce((sum, t) => sum + t.amount, 0);
        const ivaAIUValue = incAIU * 0.19;

        // 3. Ingresos No Gravados
        const incNoGravado = transactions.filter(t => t.type === 'ingreso_no_gravado').reduce((sum, t) => sum + t.amount, 0);
        const returns = transactions.filter(t => t.type === 'devolucion_venta').reduce((sum, t) => sum + t.amount, 0);

        // 4. TOTAL DE INGRESOS
        const totalIncome = incGeneral + incAIU + incNoGravado;
        const netIncomeValue = totalIncome - returns;

        // 5. Total de IVA Generado
        const totalIVAGenerado = ivaGeneralValue + ivaAIUValue;

        // 6. TARIFA DE PRORRATEO: Proporción de ingresos con IVA frente al total
        // (Ingresos General + Ingresos AIU) / Total Ingresos
        const ingresosConIVA = incGeneral + incAIU;
        let prorationFactor = totalIncome > 0 ? ingresosConIVA / totalIncome : 1;

        // 7. IVA Descontable Aplicable
        const ivaDescontableBase = transactions.filter(t => t.type === 'iva_descontable').reduce((sum, t) => sum + t.amount, 0);
        const ivaDescontableAplicable = ivaDescontableBase * prorationFactor;

        // 8. IVA a Pagar (Resultado final)
        const netIVAValue = totalIVAGenerado - ivaDescontableAplicable;

        netIncomeEl.textContent = `$${netIncomeValue.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
        netIVAEl.innerHTML = `
            $${Math.max(0, netIVAValue).toLocaleString(undefined, { minimumFractionDigits: 2 })} 
            <small style="font-size: 0.6em; opacity: 0.8; display: block;">
                Factor: ${(prorationFactor * 100).toFixed(1)}% | Gen: $${totalIVAGenerado.toLocaleString()}
            </small>
        `;

        initCharts();

        // Delegation for Deletion
        transactionList.onclick = (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            if (!deleteBtn) return;

            const id = parseInt(deleteBtn.getAttribute('data-id'));
            if (confirm('¿Eliminar registro?')) {
                if (!Array.isArray(transactions)) {
                    console.error('Error: transitions is not an array', transactions);
                    return;
                }
                transactions = transactions.filter(t => t.id !== id);
                saveToLocalStorage();
                renderUI();
            }
        };
    };

    // --- 5. Manejo del Modal ---
    const toggleModal = () => modal.classList.toggle('active');
    newPaymentBtn.onclick = toggleModal;
    closeModalBtn.onclick = toggleModal;
    cancelModalBtn.onclick = toggleModal;

    viewSelect.onchange = initCharts;
    yearSelect.onchange = initCharts;

    paymentForm.onsubmit = (e) => {
        e.preventDefault();
        const newPayment = {
            id: Date.now(),
            concept: document.getElementById('concept').value,
            amount: parseFloat(document.getElementById('amount').value),
            date: document.getElementById('date').value,
            type: document.getElementById('type').value
        };
        transactions.push(newPayment);
        saveToLocalStorage();
        renderUI();
        toggleModal();
        paymentForm.reset();
    };

    renderUI();
});
