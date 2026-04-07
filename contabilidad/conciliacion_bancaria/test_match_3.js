const fs = require('fs');
const parsers = require('./parsers.js');
const { excelDateToISO } = parsers; // if exported? no, we have to eval or include

const code = fs.readFileSync('./parsers.js', 'utf8');
const reconcilerCode = fs.readFileSync('./reconciler.js', 'utf8');

// evaluate them to access functions internally
eval(code + '\n' + reconcilerCode);

console.log('--- TEST TONUMBER ---');
console.log('Helisa:', toNumber('$8,074.00'));
console.log('Banco: ', toNumber('$ 8.074,00'));

console.log('\n--- TEST DATES ---');
console.log('Helisa Date:', excelDateToISO('28/02/2026'));
console.log('Banco Date:', excelDateToISO('2026-02-25'));
console.log('Days Diff:', daysDiff('2026-02-25', '2026-02-28'));

console.log('\n--- SIMULATING RECONCILIATION ---');
const bMov = {
    fecha: '2026-02-25',
    descripcion: 'CORRECCION IMPTO DECRETO',
    referencia: '-',
    debito: 8074,
    credito: 0,
    saldo: 0,
    origen: 'Bancolombia'
};
const hMov = {
    fecha: '2026-02-28',
    comprobante: '123',
    descripcion: 'CUOTA DE M CC 31122519 860,003,020-. BBVA / BANCO BILBAO VIZCAYA ...',
    debito: 8074,
    credito: 0,
    monto: -8074,
    origen: 'Helisa'
};

const result = reconcile([bMov], [hMov]);
console.log('Matched:', result.matched.length);
console.log('Differences:', result.matched.length > 0 ? result.matched[0].diferencia_monto : 'N/A');
