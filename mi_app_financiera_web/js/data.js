// --- HELPERS ---
const formatCOP = (num) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(num);
};

// --- APP STATE & INITIAL DATA ---
let state = {
    saldoTotal: 850000,
    categorias: [
        { nombre: '🏠 Hogar & Servicios', limite: 300000, color: '#E8AEB7' },
        { nombre: '☕ Gustitos & Salidas', limite: 150000, color: '#B5E2FA' },
        { nombre: '🚗 Transporte', limite: 100000, color: '#EDF2F4' },
        { nombre: '🌸 Cuidado Personal', limite: 200000, color: '#F1C0E8' },
        { nombre: '💳 Deudas', limite: 200000, color: '#E8AEB7' },
        { nombre: '💰 Ahorro', limite: 500000, color: '#CCD5AE' }
    ],
    transacciones: [
        { id: '1', descripcion: 'Mercado semanal', monto: 85000, categoria: '🏠 Hogar & Servicios', fecha: new Date(Date.now() - 86400000 * 1).toISOString(), esIngreso: false, estado: 'ejecutado' },
        { id: '2', descripcion: 'Salario quincenal', monto: 1200000, categoria: 'Ingresos', fecha: new Date(Date.now() - 86400000 * 2).toISOString(), esIngreso: true, estado: 'ejecutado' },
        { id: '3', descripcion: 'Café con amiga', monto: 18000, categoria: '☕ Gustitos & Salidas', fecha: new Date(Date.now() - 86400000 * 3).toISOString(), esIngreso: false, estado: 'ejecutado' },
        { id: '4', descripcion: 'TransMilenio semana', monto: 40000, categoria: '🚗 Transporte', fecha: new Date(Date.now() - 86400000 * 4).toISOString(), esIngreso: false, estado: 'ejecutado' },
        { id: '5', descripcion: 'Crema facial', monto: 35000, categoria: '🌸 Cuidado Personal', fecha: new Date(Date.now() - 86400000 * 5).toISOString(), esIngreso: false, estado: 'ejecutado' },
        { id: '6', descripcion: 'Factura Internet', monto: 120000, categoria: '🏠 Hogar & Servicios', fecha: new Date(Date.now() + 86400000 * 2).toISOString(), esIngreso: false, estado: 'proyectado' },
        { id: '7', descripcion: 'Freelance diseño', monto: 350000, categoria: 'Ingresos', fecha: new Date(Date.now() + 86400000 * 3).toISOString(), esIngreso: true, estado: 'proyectado' }
    ]
};

// Load data from localStorage if exists
if (localStorage.getItem('mi_bolsa_state')) {
    state = JSON.parse(localStorage.getItem('mi_bolsa_state'));
    // Migración: Asegurar que todas las transacciones antiguas en localStorage tengan un ID y un estado
    let migrado = false;
    if (state.transacciones) {
        state.transacciones.forEach((tx, idx) => {
            if (!tx.id) {
                tx.id = 'tx_' + idx + '_' + Date.now();
                migrado = true;
            }
            if (!tx.estado) {
                tx.estado = 'ejecutado';
                migrado = true;
            }
        });
    }
    // Sincronizar categoría 'Deudas'
    if (state.categorias && !state.categorias.some(c => c.nombre.includes('Deudas'))) {
        state.categorias.push({ nombre: '💳 Deudas', limite: 200000, color: '#E8AEB7' });
        migrado = true;
    }
    // Sincronizar categoría 'Ahorro'
    if (state.categorias && !state.categorias.some(c => c.nombre.includes('Ahorro'))) {
        state.categorias.push({ nombre: '💰 Ahorro', limite: 500000, color: '#CCD5AE' });
        migrado = true;
    }
    if (migrado) {
        saveToLocalStorage();
    }
} else {
    saveToLocalStorage();
}

function saveToLocalStorage() {
    localStorage.setItem('mi_bolsa_state', JSON.stringify(state));
}
