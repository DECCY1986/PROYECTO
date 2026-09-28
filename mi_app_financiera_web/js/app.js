// --- DOM ELEMENTS ---
const balanceDisplay = document.getElementById('balance-display');
const balanceProjectedDisplay = document.getElementById('balance-projected-display');
const totalExpensesDisplay = document.getElementById('total-expenses-display');
const totalExpensesProjectedDisplay = document.getElementById('total-expenses-projected-display');
const totalIncomeDisplay = document.getElementById('total-income-display');
const totalIncomeProjectedDisplay = document.getElementById('total-income-projected-display');
const budgetsHorizontalList = document.getElementById('budgets-horizontal-list');
const recentTransactionsList = document.getElementById('recent-transactions-list');
const largeBudgetList = document.getElementById('large-budget-list');
const fullTransactionsList = document.getElementById('full-transactions-list');

// Modal elements
const modalOverlay = document.getElementById('modal-overlay');
const openModalBtn = document.getElementById('open-modal-btn');
const saveTransactionBtn = document.getElementById('save-transaction-btn');
const toggleExpenseBtn = document.getElementById('toggle-expense');
const toggleIncomeBtn = document.getElementById('toggle-income');
const toggleExecutedBtn = document.getElementById('toggle-executed');
const toggleProjectedBtn = document.getElementById('toggle-projected');
const inputDesc = document.getElementById('input-desc');
const inputMonto = document.getElementById('input-monto');
const inputCategory = document.getElementById('input-category');

let isExpense = true;
let isTransactionExecuted = true;
let currentTxFilter = 'todos';
let currentTxTypeFilter = 'todos';

// --- NAVIGATION ---
function switchTab(tabId) {
    // Update active view
    document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
    document.getElementById(`view-${tabId}`).classList.add('active');

    // Update active nav item
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item) => {
        item.classList.remove('active');
    });

    if (tabId === 'inicio') navItems[0].classList.add('active');
    else if (tabId === 'presupuestos') navItems[1].classList.add('active');
    else if (tabId === 'deudas') navItems[3].classList.add('active');
    else if (tabId === 'movimientos') navItems[4].classList.add('active'); 
    
    // Scroll view back to top
    document.querySelector('.views-container').scrollTop = 0;
    
    // Render view dynamic content
    renderApp();
}

window.switchTab = switchTab; // export to global for html inline onclick

// --- MODAL ACTIONS ---
openModalBtn.addEventListener('click', () => {
    isExpense = true;
    isTransactionExecuted = true;
    toggleExpenseBtn.classList.add('active', 'expense');
    toggleIncomeBtn.classList.remove('active', 'income');
    toggleExecutedBtn.classList.add('active', 'executed');
    toggleProjectedBtn.classList.remove('active', 'projected');
    inputDesc.value = '';
    inputMonto.value = '';
    updateCategoryOptions();
    modalOverlay.classList.add('active');
});

modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        modalOverlay.classList.remove('active');
    }
});

toggleExpenseBtn.addEventListener('click', () => {
    isExpense = true;
    toggleExpenseBtn.classList.add('active', 'expense');
    toggleIncomeBtn.classList.remove('active', 'income');
    updateCategoryOptions();
});

toggleIncomeBtn.addEventListener('click', () => {
    isExpense = false;
    toggleIncomeBtn.classList.add('active', 'income');
    toggleExpenseBtn.classList.remove('active', 'expense');
    updateCategoryOptions();
});

toggleExecutedBtn.addEventListener('click', () => {
    isTransactionExecuted = true;
    toggleExecutedBtn.classList.add('active', 'executed');
    toggleProjectedBtn.classList.remove('active', 'projected');
});

toggleProjectedBtn.addEventListener('click', () => {
    isTransactionExecuted = false;
    toggleProjectedBtn.classList.add('active', 'projected');
    toggleExecutedBtn.classList.remove('active', 'executed');
});

function updateCategoryOptions() {
    inputCategory.innerHTML = '';
    let list = [];
    if (isExpense) {
        list = state.categorias.map(c => c.nombre);
    } else {
        list = ['Ingresos', 'Transferencia', 'Otro'];
    }
    
    list.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        inputCategory.appendChild(opt);
    });
}

// Save new transaction
saveTransactionBtn.addEventListener('click', () => {
    const desc = inputDesc.value.trim();
    const monto = parseFloat(inputMonto.value);
    const cat = inputCategory.value;

    if (!desc || isNaN(monto) || monto <= 0 || !cat) {
        alert('Por favor completa todos los campos correctamente.');
        return;
    }

    const newTx = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
        descripcion: desc,
        monto: monto,
        categoria: cat,
        fecha: new Date().toISOString(),
        esIngreso: !isExpense,
        estado: isTransactionExecuted ? 'ejecutado' : 'proyectado'
    };

    // Update App State
    state.transacciones.unshift(newTx);

    saveToLocalStorage();
    renderApp();
    modalOverlay.classList.remove('active');
});

// --- RENDER FUNCTIONS ---
function renderApp() {
    // Compute executed totals (for main cash balances)
    const totalExpensesExecuted = state.transacciones
        .filter(tx => !tx.esIngreso && tx.estado === 'ejecutado')
        .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
    const totalIncomeExecuted = state.transacciones
        .filter(tx => tx.esIngreso && tx.estado === 'ejecutado')
        .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
    const saldoTotalExecuted = totalIncomeExecuted - totalExpensesExecuted;

    // Compute projected additions (executed + projected)
    const totalExpensesProjected = state.transacciones
        .filter(tx => !tx.esIngreso && tx.estado === 'proyectado')
        .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
    const totalIncomeProjected = state.transacciones
        .filter(tx => tx.esIngreso && tx.estado === 'proyectado')
        .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
    const saldoTotalProjected = (totalIncomeExecuted + totalIncomeProjected) - (totalExpensesExecuted + totalExpensesProjected);

    // Update balance displays
    balanceDisplay.textContent = formatCOP(saldoTotalExecuted);
    balanceProjectedDisplay.textContent = `Proyectado: ${formatCOP(saldoTotalProjected)}`;
    
    totalExpensesDisplay.textContent = formatCOP(totalExpensesExecuted);
    totalExpensesProjectedDisplay.textContent = `Proy: ${formatCOP(totalExpensesExecuted + totalExpensesProjected)}`;
    
    totalIncomeDisplay.textContent = formatCOP(totalIncomeExecuted);
    totalIncomeProjectedDisplay.textContent = `Proy: ${formatCOP(totalIncomeExecuted + totalIncomeProjected)}`;

    // Render Horizontal budget cards (Inicio)
    budgetsHorizontalList.innerHTML = '';
    state.categorias.forEach(cat => {
        const gastadoEjecutado = state.transacciones
            .filter(tx => !tx.esIngreso && tx.categoria === cat.nombre && tx.estado === 'ejecutado')
            .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
        const gastadoProyectado = state.transacciones
            .filter(tx => !tx.esIngreso && tx.categoria === cat.nombre && tx.estado === 'proyectado')
            .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
        const gastadoTotal = gastadoEjecutado + gastadoProyectado;

        const pctEjecutado = gastadoEjecutado / cat.limite;
        const pctTotal = gastadoTotal / cat.limite;

        const exceededEjecutado = pctEjecutado >= 1.0;
        const exceededTotal = pctTotal >= 1.0;
        const isDeuda = cat.nombre.toLowerCase().includes('deuda');
        const progressColor = isDeuda ? '#66BB6A' : (exceededTotal ? '#E07A7A' : '#D4A5A5');
        
        let labelText = isDeuda 
            ? `Abonado: ${formatCOP(gastadoEjecutado)} / ${formatCOP(cat.limite)}` 
            : `${formatCOP(gastadoEjecutado)} / ${formatCOP(cat.limite)}`;
        
        if (gastadoProyectado > 0) {
            labelText = isDeuda
                ? `Abonado: ${formatCOP(gastadoEjecutado)} (+${formatCOP(gastadoProyectado)} proy) / ${formatCOP(cat.limite)}`
                : `${formatCOP(gastadoEjecutado)} (+${formatCOP(gastadoProyectado)} proy) / ${formatCOP(cat.limite)}`;
        }
        
        const card = document.createElement('div');
        card.className = 'budget-card-small';
        card.style.backgroundColor = `${cat.color}59`; // opacity 35% in hex
        card.style.borderColor = `${cat.color}99`; // opacity 60%
        
        card.innerHTML = `
            <h4>${cat.nombre}</h4>
            <div class="progress-container">
                <div class="progress-bar">
                    <div class="progress-fill-projected" style="width: ${Math.min(pctTotal * 100, 100)}%; background-color: ${progressColor}; opacity: 0.4;"></div>
                    <div class="progress-fill" style="width: ${Math.min(pctEjecutado * 100, 100)}%; background-color: ${progressColor};"></div>
                </div>
                <div class="budget-values" style="color: ${exceededTotal && !isDeuda ? '#E07A7A' : '#555555'}">
                    ${labelText}
                </div>
            </div>
        `;
        budgetsHorizontalList.appendChild(card);
    });

    // Render "Otros" virtual budget card if there are uncategorized expenses
    const activeCategoryNames = state.categorias.map(c => c.nombre);
    const otrosGastadoEjecutado = state.transacciones
        .filter(tx => !tx.esIngreso && tx.estado === 'ejecutado' && !activeCategoryNames.includes(tx.categoria))
        .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
    const otrosGastadoProyectado = state.transacciones
        .filter(tx => !tx.esIngreso && tx.estado === 'proyectado' && !activeCategoryNames.includes(tx.categoria))
        .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);

    if (otrosGastadoEjecutado + otrosGastadoProyectado > 0) {
        let labelText = `${formatCOP(otrosGastadoEjecutado)}`;
        if (otrosGastadoProyectado > 0) {
            labelText += ` (+${formatCOP(otrosGastadoProyectado)} proy)`;
        }
        
        const card = document.createElement('div');
        card.className = 'budget-card-small';
        card.style.backgroundColor = `#EDF2F459`; // soft gray
        card.style.borderColor = `#EDF2F499`;
        
        card.innerHTML = `
            <h4>⚙️ Otros (Sin categoría)</h4>
            <div class="progress-container">
                <div style="font-size: 11px; font-weight: 700; margin-bottom: 6px; color: var(--text-main);">
                    ${labelText}
                </div>
                <div class="budget-values" style="color: var(--text-muted); font-size: 10px;">
                    Gastos sin presupuesto
                </div>
            </div>
        `;
        budgetsHorizontalList.appendChild(card);
    }

    // Render Recent Transactions (Inicio - limit to 3)
    recentTransactionsList.innerHTML = '';
    const recentTxs = state.transacciones.slice(0, 3);
    if (recentTxs.length === 0) {
        recentTransactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>No hay movimientos registrados.</p>
            </div>
        `;
    } else {
        recentTxs.forEach(tx => {
            recentTransactionsList.appendChild(createTransactionRow(tx));
        });
    }

    // Render Large budgets (Presupuestos tab)
    largeBudgetList.innerHTML = '';
    state.categorias.forEach(cat => {
        const gastadoEjecutado = state.transacciones
            .filter(tx => !tx.esIngreso && tx.categoria === cat.nombre && tx.estado === 'ejecutado')
            .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
        const gastadoProyectado = state.transacciones
            .filter(tx => !tx.esIngreso && tx.categoria === cat.nombre && tx.estado === 'proyectado')
            .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
        const gastadoTotal = gastadoEjecutado + gastadoProyectado;

        const pctEjecutado = gastadoEjecutado / cat.limite;
        const pctTotal = gastadoTotal / cat.limite;

        const restanteEjecutado = cat.limite - gastadoEjecutado;
        const restanteTotal = cat.limite - gastadoTotal;

        const isDeuda = cat.nombre.toLowerCase().includes('deuda');
        
        const exceededEjecutado = isDeuda ? false : (restanteEjecutado < 0);
        const exceededTotal = isDeuda ? false : (restanteTotal < 0);
        
        const isSaldado = isDeuda && restanteEjecutado <= 0;

        let badgeText = `${Math.round(pctEjecutado * 100)}% usado`;
        if (gastadoProyectado > 0) {
            badgeText = `${Math.round(pctEjecutado * 100)}% ejec. | ${Math.round(pctTotal * 100)}% total`;
        }
        let badgeClass = exceededTotal ? 'exceeded' : 'normal';
        let customStyle = '';
        
        if (isDeuda) {
            badgeText = isSaldado ? 'Saldado 🎉' : `${Math.round(pctEjecutado * 100)}% pagado`;
            badgeClass = isSaldado ? 'normal' : ''; 
            if (!isSaldado) {
                customStyle = 'background-color: #FFEFC2; color: #B78A00;';
            }
        }

        const cardLarge = document.createElement('div');
        cardLarge.className = 'budget-card-large';
        cardLarge.innerHTML = `
            <div class="budget-card-header">
                <span class="budget-title-large">${cat.nombre}</span>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span class="budget-badge ${badgeClass}" style="${customStyle}">
                        ${badgeText}
                    </span>
                    <button class="btn-edit-cat" onclick="openEditCategoryModal('${cat.nombre}', event)" title="Editar categoría">
                        <i class="fa-solid fa-pen"></i>
                    </button>
                </div>
            </div>
            <div class="progress-bar-large">
                <div class="progress-fill-large-projected" style="width: ${Math.min(pctTotal * 100, 100)}%; background-color: ${isDeuda ? '#66BB6A' : (exceededTotal ? '#E07A7A' : cat.color)}; opacity: 0.4;"></div>
                <div class="progress-fill-large" style="width: ${Math.min(pctEjecutado * 100, 100)}%; background-color: ${isDeuda ? '#66BB6A' : (exceededEjecutado ? '#E07A7A' : cat.color)};"></div>
            </div>
            <div class="budget-info-row">
                <div class="budget-info-item">
                    <span class="budget-info-label">${isDeuda ? 'Abonado' : 'Gastado Ejec.'}</span>
                    <span class="budget-info-value">${formatCOP(gastadoEjecutado)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="budget-info-label">Gastado Total</span>
                    <span class="budget-info-value" style="color: var(--text-muted);">${formatCOP(gastadoTotal)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="budget-info-label">${isDeuda ? 'Deuda Total' : 'Límite'}</span>
                    <span class="budget-info-value">${formatCOP(cat.limite)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="budget-info-label">${isDeuda ? 'Por Pagar' : (exceededEjecutado ? 'Exceso' : 'Disp. Ejec.')}</span>
                    <span class="budget-info-value" style="color: ${isSaldado || (!isDeuda && !exceededEjecutado) ? '#66BB6A' : '#E07A7A'}">
                        ${formatCOP(Math.max(0, restanteEjecutado))}
                    </span>
                </div>
            </div>
        `;
        largeBudgetList.appendChild(cardLarge);
    });

    // Render "Otros" large budget card if there are uncategorized expenses
    if (otrosGastadoEjecutado + otrosGastadoProyectado > 0) {
        const otrosTotal = otrosGastadoEjecutado + otrosGastadoProyectado;
        const cardLarge = document.createElement('div');
        cardLarge.className = 'budget-card-large';
        cardLarge.style.borderLeft = `6px solid #999999`;
        cardLarge.innerHTML = `
            <div class="budget-card-header">
                <div>
                    <span class="budget-title-large" style="display: block; font-size: 16px;">⚙️ Otros (Sin categoría)</span>
                    <span style="font-size: 11px; color: var(--text-muted);">Gastos fuera de presupuestos activos</span>
                </div>
            </div>
            <div class="budget-info-row" style="margin-top: 10px;">
                <div class="budget-info-item">
                    <span class="budget-info-label">Gastado Ejec.</span>
                    <span class="budget-info-value">${formatCOP(otrosGastadoEjecutado)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="budget-info-label">Gastado Total</span>
                    <span class="budget-info-value" style="color: var(--text-muted);">${formatCOP(otrosTotal)}</span>
                </div>
                <div class="budget-info-item">
                    <span class="budget-info-label">Límite</span>
                    <span class="budget-info-value" style="color: var(--text-muted);">N/A</span>
                </div>
                <div class="budget-info-item">
                    <span class="budget-info-label">Disponible</span>
                    <span class="budget-info-value" style="color: var(--text-muted);">N/A</span>
                </div>
            </div>
        `;
        largeBudgetList.appendChild(cardLarge);
    }

    // Render All Transactions (Movimientos tab)
    fullTransactionsList.innerHTML = '';
    const filteredTxs = state.transacciones.filter(tx => {
        // Apply state filter (todos / ejecutado / proyectado)
        if (currentTxFilter !== 'todos' && tx.estado !== currentTxFilter) {
            return false;
        }
        // Apply type filter (todos / gastos / ingresos)
        if (currentTxTypeFilter === 'gastos' && tx.esIngreso) {
            return false;
        }
        if (currentTxTypeFilter === 'ingresos' && !tx.esIngreso) {
            return false;
        }
        return true;
    });

    if (filteredTxs.length === 0) {
        fullTransactionsList.innerHTML = `
            <div class="empty-state">
                <i class="fa-regular fa-folder-open"></i>
                <p>No hay movimientos registrados.</p>
            </div>
        `;
    } else {
        filteredTxs.forEach(tx => {
            fullTransactionsList.appendChild(createTransactionRow(tx));
        });
    }

    // Render Deudas (Deudas tab)
    const deudasList = document.getElementById('deudas-list');
    if (deudasList) {
        deudasList.innerHTML = '';
        const debtCategories = state.categorias.filter(cat => cat.nombre.toLowerCase().includes('deuda'));
        
        if (debtCategories.length === 0) {
            deudasList.innerHTML = `
                <div class="empty-state">
                    <i class="fa-solid fa-hand-holding-dollar"></i>
                    <p>No tienes deudas registradas.</p>
                    <p style="font-size: 12px; margin-top: 4px;">Crea una categoría con la palabra "Deuda" para gestionarla aquí.</p>
                </div>
            `;
        } else {
            debtCategories.forEach(cat => {
                const gastadoEjecutado = state.transacciones
                    .filter(tx => !tx.esIngreso && tx.categoria === cat.nombre && tx.estado === 'ejecutado')
                    .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
                const gastadoProyectado = state.transacciones
                    .filter(tx => !tx.esIngreso && tx.categoria === cat.nombre && tx.estado === 'proyectado')
                    .reduce((sum, tx) => sum + Number(tx.monto || 0), 0);
                const gastadoTotal = gastadoEjecutado + gastadoProyectado;

                const pctEjecutado = gastadoEjecutado / cat.limite;
                const pctTotal = gastadoTotal / cat.limite;
                const restanteEjecutado = cat.limite - gastadoEjecutado;
                const isSaldado = restanteEjecutado <= 0;

                const cardDeuda = document.createElement('div');
                cardDeuda.className = 'budget-card-large';
                cardDeuda.style.borderLeft = `6px solid ${cat.color}`;
                cardDeuda.innerHTML = `
                    <div class="budget-card-header">
                        <div>
                            <span class="budget-title-large" style="display: block; font-size: 16px;">${cat.nombre}</span>
                            <span style="font-size: 11px; color: var(--text-muted);">Progreso del pago</span>
                        </div>
                        <span class="budget-badge ${isSaldado ? 'normal' : ''}" style="${!isSaldado ? 'background-color: #FFEFC2; color: #B78A00;' : ''}">
                            ${isSaldado ? 'Saldado 🎉' : `${Math.round(pctEjecutado * 100)}% pagado`}
                        </span>
                    </div>
                    <div class="progress-bar-large" style="height: 8px;">
                        <div class="progress-fill-large-projected" style="width: ${Math.min(pctTotal * 100, 100)}%; background-color: #66BB6A; opacity: 0.4;"></div>
                        <div class="progress-fill-large" style="width: ${Math.min(pctEjecutado * 100, 100)}%; background-color: #66BB6A;"></div>
                    </div>
                    <div class="budget-info-row">
                        <div class="budget-info-item">
                            <span class="budget-info-label">Abonado Real</span>
                            <span class="budget-info-value" style="color: #66BB6A;">${formatCOP(gastadoEjecutado)}</span>
                        </div>
                        <div class="budget-info-item">
                            <span class="budget-info-label">Total Abonos+Proy</span>
                            <span class="budget-info-value" style="color: var(--text-muted);">${formatCOP(gastadoTotal)}</span>
                        </div>
                        <div class="budget-info-item">
                            <span class="budget-info-label">Deuda Inicial</span>
                            <span class="budget-info-value">${formatCOP(cat.limite)}</span>
                        </div>
                        <div class="budget-info-item">
                            <span class="budget-info-label">Falta Pagar</span>
                            <span class="budget-info-value" style="color: ${isSaldado ? '#66BB6A' : '#E07A7A'};">
                                ${formatCOP(Math.max(0, restanteEjecutado))}
                            </span>
                        </div>
                    </div>
                `;
                deudasList.appendChild(cardDeuda);
            });
        }
    }
}

function createTransactionRow(tx) {
    const dateObj = new Date(tx.fecha);
    const formattedDate = `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const isProjected = tx.estado === 'proyectado';
    
    const item = document.createElement('div');
    item.className = `transaction-item ${isProjected ? 'projected' : ''}`;
    
    const stateBadge = isProjected ? `<span class="tx-state-badge">Proyectado</span>` : '';
    
    const executeBtn = isProjected ? `
        <button class="btn-execute-tx" onclick="executeTransaction('${tx.id}', event)" title="Marcar como ejecutado">
            <i class="fa-solid fa-check"></i>
        </button>
    ` : '';
    
    item.innerHTML = `
        <div class="tx-icon-wrapper ${tx.esIngreso ? 'income' : 'expense'}">
            <i class="fa-solid ${tx.esIngreso ? 'fa-arrow-up' : 'fa-arrow-down'}"></i>
        </div>
        <div class="tx-details">
            <div class="tx-title">${tx.descripcion}</div>
            <div class="tx-category">${tx.categoria} ${stateBadge}</div>
        </div>
        <div class="tx-amount-time">
            <div class="tx-amount ${tx.esIngreso ? 'income' : 'expense'}">
                ${tx.esIngreso ? '+' : '-'}${formatCOP(tx.monto)}
            </div>
            <div class="tx-date">${formattedDate}</div>
        </div>
        <div class="tx-actions" style="display: flex; gap: 4px; align-items: center;">
            ${executeBtn}
            <button class="btn-delete-tx" onclick="deleteTransaction('${tx.id}', event)" title="Eliminar movimiento">
                <i class="fa-regular fa-trash-can"></i>
            </button>
        </div>
    `;
    return item;
}

window.deleteTransaction = function(id, event) {
    event.stopPropagation();
    if (!confirm('¿Estás seguro de que deseas eliminar este movimiento?')) {
        return;
    }
    
    const idx = state.transacciones.findIndex(tx => tx.id === id);
    if (idx === -1) return;
    
    // Remove from array
    state.transacciones.splice(idx, 1);
    
    // Save & re-render
    saveToLocalStorage();
    renderApp();
};

window.executeTransaction = function(id, event) {
    event.stopPropagation();
    const tx = state.transacciones.find(t => t.id === id);
    if (!tx) return;
    tx.estado = 'ejecutado';
    saveToLocalStorage();
    renderApp();
};

window.setTxFilter = function(filterValue, buttonEl) {
    currentTxFilter = filterValue;
    document.querySelectorAll('.filter-btn:not(.type-btn)').forEach(btn => btn.classList.remove('active'));
    buttonEl.classList.add('active');
    renderApp();
};

window.setTxTypeFilter = function(typeValue, buttonEl) {
    currentTxTypeFilter = typeValue;
    document.querySelectorAll('.type-btn').forEach(btn => btn.classList.remove('active'));
    buttonEl.classList.add('active');
    renderApp();
};

// --- BUDGET CATEGORY ACTIONS ---
const modalCategoryOverlay = document.getElementById('modal-category-overlay');
const openAddCatBtn = document.getElementById('open-add-cat-btn');
const saveCategoryBtn = document.getElementById('save-category-btn');
const deleteCategoryBtn = document.getElementById('delete-category-btn');
const catInputNombre = document.getElementById('cat-input-nombre');
const catInputLimite = document.getElementById('cat-input-limite');
const catColorSelector = document.getElementById('cat-color-selector');

let activeColor = '#E8AEB7';
let editingCategoryName = null; // null means we are adding new category

// Setup color selector dots
catColorSelector.addEventListener('click', (e) => {
    if (e.target.classList.contains('color-dot')) {
        document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
        e.target.classList.add('active');
        activeColor = e.target.getAttribute('data-color');
    }
});

openAddCatBtn.addEventListener('click', () => {
    editingCategoryName = null;
    document.getElementById('category-modal-title').textContent = 'Nueva categoría';
    catInputNombre.value = '';
    catInputLimite.value = '';
    deleteCategoryBtn.style.display = 'none';
    // Reset to first color
    document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
    document.querySelector('.color-dot').classList.add('active');
    activeColor = '#E8AEB7';
    
    modalCategoryOverlay.classList.add('active');
});

const openAddDeudaBtn = document.getElementById('open-add-deuda-btn');
if (openAddDeudaBtn) {
    openAddDeudaBtn.addEventListener('click', () => {
        editingCategoryName = null;
        document.getElementById('category-modal-title').textContent = 'Nueva deuda';
        catInputNombre.value = '💳 Deuda ';
        catInputLimite.value = '';
        deleteCategoryBtn.style.display = 'none';
        
        // Select color dot (e.g. pink-rose)
        document.querySelectorAll('.color-dot').forEach(dot => dot.classList.remove('active'));
        document.querySelector('.color-dot').classList.add('active');
        activeColor = '#E8AEB7';
        
        modalCategoryOverlay.classList.add('active');
    });
}

window.openEditCategoryModal = function(catName, event) {
    event.stopPropagation();
    editingCategoryName = catName;
    
    const cat = state.categorias.find(c => c.nombre === catName);
    if (!cat) return;

    document.getElementById('category-modal-title').textContent = 'Editar categoría';
    catInputNombre.value = cat.nombre;
    catInputLimite.value = cat.limite;
    deleteCategoryBtn.style.display = 'block';

    // Select color dot
    document.querySelectorAll('.color-dot').forEach(dot => {
        dot.classList.remove('active');
        if (dot.getAttribute('data-color') === cat.color) {
            dot.classList.add('active');
            activeColor = cat.color;
        }
    });

    modalCategoryOverlay.classList.add('active');
};

modalCategoryOverlay.addEventListener('click', (e) => {
    if (e.target === modalCategoryOverlay) {
        modalCategoryOverlay.classList.remove('active');
    }
});

// Save Category (Add or Edit)
saveCategoryBtn.addEventListener('click', () => {
    const nombre = catInputNombre.value.trim();
    const limite = parseFloat(catInputLimite.value);

    if (!nombre || isNaN(limite) || limite <= 0) {
        alert('Por favor completa todos los campos correctamente.');
        return;
    }

    if (editingCategoryName) {
        // Editing existing category
        const idx = state.categorias.findIndex(c => c.nombre === editingCategoryName);
        if (idx !== -1) {
            // Update transactions category name if it was renamed
            if (editingCategoryName !== nombre) {
                state.transacciones.forEach(tx => {
                    if (tx.categoria === editingCategoryName) {
                        tx.categoria = nombre;
                    }
                });
            }
            state.categorias[idx].nombre = nombre;
            state.categorias[idx].limite = limite;
            state.categorias[idx].color = activeColor;
        }
    } else {
        // Adding a new category
        if (state.categorias.some(c => c.nombre.toLowerCase() === nombre.toLowerCase())) {
            alert('Ya existe una categoría con este nombre.');
            return;
        }
        state.categorias.push({
            nombre: nombre,
            limite: limite,
            color: activeColor
        });
    }

    saveToLocalStorage();
    renderApp();
    modalCategoryOverlay.classList.remove('active');
});

// Delete Category
deleteCategoryBtn.addEventListener('click', () => {
    if (!editingCategoryName) return;

    if (confirm(`¿Estás seguro de que deseas eliminar la categoría "${editingCategoryName}"?\\nLos movimientos existentes en esta categoría se moverán a "Otro".`)) {
        
        // Move matching transactions to 'Otro'
        state.transacciones.forEach(tx => {
            if (tx.categoria === editingCategoryName) {
                tx.categoria = 'Otro';
            }
        });

        // Remove category
        state.categorias = state.categorias.filter(c => c.nombre !== editingCategoryName);

        saveToLocalStorage();
        renderApp();
        modalCategoryOverlay.classList.remove('active');
    }
});

// Initialize App
renderApp();
