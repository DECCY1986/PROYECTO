// ============================================================
//  EXPORTER.JS — Genera el Excel de conciliación bancaria
//  Formato profesional: Helisa (Libros) vs Banco lado a lado
//  NOTA: Todos los valores monetarios se escriben como NÚMEROS
//        reales para que Excel pueda operar con ellos.
// ============================================================

/**
 * Exporta los resultados de la conciliación a un archivo .xlsx
 *
 * @param {Object}  result       — { matched, onlyBank, onlyHelisa, summary }
 * @param {string}  cuenta       — nombre/número de cuenta
 * @param {string}  banco        — 'Bancolombia' | 'BBVA'
 * @param {Object}  saldos       — { saldoInicialBanco, saldoInicialHelisa }
 * @param {string}  periodo      — ej: 'ENERO 2026'
 */
function exportToExcel(result, cuenta, banco, saldos, periodo) {
    const wb = XLSX.utils.book_new();
    const fechaExport = new Date().toISOString().split('T')[0];

    // ── Calcular totales ──────────────────────────────────────
    // Totales por tipo para Helisa
    const helisaDebitos = result.matched.reduce((a, m) => a + (m.helisa_debito || 0), 0)
        + result.onlyHelisa.reduce((a, m) => a + (m.debito || 0), 0);
    const helisaCreditos = result.matched.reduce((a, m) => a + (m.helisa_credito || 0), 0)
        + result.onlyHelisa.reduce((a, m) => a + (m.credito || 0), 0);

    // Totales por tipo para Banco
    const bancoDebitos = result.matched.reduce((a, m) => a + (m.banco_debito || 0), 0)
        + result.onlyBank.reduce((a, m) => a + (m.debito || 0), 0);
    const bancoCreditos = result.matched.reduce((a, m) => a + (m.banco_credito || 0), 0)
        + result.onlyBank.reduce((a, m) => a + (m.credito || 0), 0);

    const sIB = saldos?.saldoInicialBanco || 0;
    const sIH = saldos?.saldoInicialHelisa || 0;

    const saldoFinalHelisa = r2(sIH + helisaDebitos - helisaCreditos);
    const saldoFinalBanco = r2(sIB + bancoDebitos - bancoCreditos);

    // Partidas pendientes totales
    const totalPartidasBanco = r2(result.onlyBank.reduce((a, m) => a + ((m.credito || 0) - (m.debito || 0)), 0));
    const totalPartidasHelisa = r2(result.onlyHelisa.reduce((a, m) => a + ((m.debito || 0) - (m.credito || 0)), 0));
    const diferencia = r2(saldoFinalBanco - saldoFinalHelisa);

    // ═══════════════════════════════════════════════════════════
    //  HOJA 1: CONCILIACIÓN BANCARIA (formato profesional)
    //  Todos los valores son NÚMEROS (no strings formateados)
    // ═══════════════════════════════════════════════════════════
    const data = [];

    // Fila 1: Título (row 0)
    data.push([`CONCILIACION BANCARIA ${periodo || ''}`, '', '', '', '', '', '']);
    // Fila 2: vacía
    data.push([]);
    // Fila 3: Encabezados
    data.push(['', 'HELISA', '', '', '', banco.toUpperCase(), '', 'DIFERENCIA']);
    // Fila 4: Sub-encabezados
    data.push(['', 'LIBROS', '', '', '', 'BANCO', '', '']);
    // Fila 5: vacía
    data.push([]);

    // Saldos iniciales (row 5)
    data.push(['SALDO INICIAL', '', r2(sIH), '', 'SALDO INICIAL', '', r2(sIB), r2(sIB - sIH)]);
    data.push([]);

    // Débitos (row 7)
    data.push(['DEBITOS', '', r2(helisaDebitos), '', 'DEBITOS', '', r2(bancoDebitos), r2(bancoDebitos - helisaDebitos)]);
    data.push([]);

    // Créditos (row 9)
    data.push(['CREDITOS', '', r2(helisaCreditos), '', 'CREDITOS', '', r2(bancoCreditos), r2(bancoCreditos - helisaCreditos)]);
    data.push([]);

    // Saldo final (row 11)
    data.push(['SALDO FINAL', '', r2(saldoFinalHelisa), '', 'SALDO FINAL', '', r2(saldoFinalBanco), r2(saldoFinalBanco - saldoFinalHelisa)]);
    data.push([]);
    data.push([]);

    // ── Partidas pendientes por contabilizar ───────────────────
    data.push(['Partida Pendiente por Contabilizar', 'Valor', '', 'Fecha', 'Descripción', '', '', '']);
    data.push([]);

    // Listar partidas solo en banco
    if (result.onlyBank.length > 0) {
        data.push(['PARTIDAS EN BANCO NO EN LIBROS', '', '', '', '', '', '', '']);
        result.onlyBank.forEach(m => {
            const val = r2((m.credito || 0) - (m.debito || 0));
            data.push(['', val, '', m.fecha || '', m.descripcion || '', '', '', '']);
        });
        data.push(['Subtotal Banco', r2(totalPartidasBanco), '', '', '', '', '', '']);
        data.push([]);
    }

    // Listar partidas solo en Helisa
    if (result.onlyHelisa.length > 0) {
        data.push(['PARTIDAS EN LIBROS NO EN BANCO', '', '', '', '', '', '', '']);
        result.onlyHelisa.forEach(m => {
            const val = r2((m.debito || 0) - (m.credito || 0));
            data.push(['', val, '', m.fecha || '', m.descripcion || '', m.comprobante || '', '', '']);
        });
        data.push(['Subtotal Helisa', r2(totalPartidasHelisa), '', '', '', '', '', '']);
        data.push([]);
    }

    // Resumen final
    data.push([]);
    data.push(['Total Partidas Por Contabilizar', r2(totalPartidasHelisa + totalPartidasBanco), '', '', 'DIFERENCIA', '', diferencia, '']);

    const ws1 = XLSX.utils.aoa_to_sheet(data);

    // Formato de columnas
    ws1['!cols'] = [
        { wch: 40 },  // A
        { wch: 20 },  // B
        { wch: 22 },  // C
        { wch: 14 },  // D
        { wch: 40 },  // E
        { wch: 18 },  // F
        { wch: 22 },  // G
        { wch: 22 }   // H (diferencia)
    ];

    // Merge del título
    ws1['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }
    ];

    // Aplicar formato numérico (#,##0.00) a todas las celdas numéricas
    applyNumberFormat(ws1);

    XLSX.utils.book_append_sheet(wb, ws1, 'Conciliación');

    // ═══════════════════════════════════════════════════════════
    //  HOJA 2: DETALLE CONCILIADOS
    // ═══════════════════════════════════════════════════════════
    const matchedHeaders = [
        'Fecha Banco', 'Descripción Banco', 'Referencia', 'Débito Banco', 'Crédito Banco',
        'Fecha Helisa', 'Comprobante', 'Descripción Helisa', 'Débito Helisa', 'Crédito Helisa',
        'Dif. Días'
    ];
    const matchedData = result.matched.map(m => [
        m.banco_fecha, m.banco_descripcion, m.banco_referencia || '',
        m.banco_debito || 0, m.banco_credito || 0,
        m.helisa_fecha, m.helisa_comprobante || '', m.helisa_descripcion || '',
        m.helisa_debito || 0, m.helisa_credito || 0,
        m.diferencia_dias || 0
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([matchedHeaders, ...matchedData]);
    ws2['!cols'] = [
        { wch: 12 }, { wch: 35 }, { wch: 15 }, { wch: 16 }, { wch: 16 },
        { wch: 12 }, { wch: 15 }, { wch: 35 }, { wch: 16 }, { wch: 16 },
        { wch: 10 }
    ];
    applyNumberFormat(ws2);
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle Conciliados');

    // ═══════════════════════════════════════════════════════════
    //  HOJA 3: DIFERENCIAS
    // ═══════════════════════════════════════════════════════════
    const difHeaders = ['Tipo', 'Fecha', 'Descripción', 'Ref / Comprobante', 'Débito', 'Crédito', 'Concepto', 'Tercero / Proveedor', 'Origen'];
    const difData = [
        ...result.onlyBank.map(m => [
            m.tipo || 'En banco, no en Helisa', m.fecha, m.descripcion || '', m.referencia || '',
            m.debito || 0, m.credito || 0, m.concepto || '', m.tercero || '', m.origen || 'Banco'
        ]),
        ...result.onlyHelisa.map(m => [
            m.tipo || 'En Helisa, no en banco', m.fecha, m.descripcion || '', m.comprobante || '',
            m.debito || 0, m.credito || 0, m.concepto || '', m.tercero || '', m.origen || 'Helisa'
        ])
    ];
    const ws3 = XLSX.utils.aoa_to_sheet([difHeaders, ...difData]);
    ws3['!cols'] = [
        { wch: 28 }, { wch: 12 }, { wch: 40 }, { wch: 20 },
        { wch: 16 }, { wch: 16 }, { wch: 35 }, { wch: 35 }, { wch: 14 }
    ];
    applyNumberFormat(ws3);
    XLSX.utils.book_append_sheet(wb, ws3, 'Diferencias');

    // ── Descargar ──────────────────────────────────────────────
    const fileName = `conciliacion_${banco}_${cuenta.replace(/\s+/g, '_')}_${fechaExport}.xlsx`;
    XLSX.writeFile(wb, fileName);
    return fileName;
}

/**
 * Aplica formato numérico (#,##0.00) a las celdas que contienen números
 */
function applyNumberFormat(ws) {
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1');
    for (let r = range.s.r; r <= range.e.r; r++) {
        for (let c = range.s.c; c <= range.e.c; c++) {
            const addr = XLSX.utils.encode_cell({ r, c });
            const cell = ws[addr];
            if (cell && typeof cell.v === 'number') {
                cell.t = 'n';
                cell.z = '#,##0.00';
            }
        }
    }
}

function r2(n) {
    return Math.round((n || 0) * 100) / 100;
}
