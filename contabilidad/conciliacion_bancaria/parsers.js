// ============================================================
//  PARSERS.JS — Normalización de extractos bancarios y Helisa
// ============================================================

/**
 * Convierte un valor de fecha de Excel (serial numérico o texto) a "YYYY-MM-DD"
 */
function excelDateToISO(value) {
    if (!value) return '';
    // Si es número serial de Excel
    if (typeof value === 'number') {
        // Detectar si el banco mandó la fecha como un número YYYYMMDD (Ej: 20260224)
        if (value > 19000000 && value < 21000000) {
            const strVal = String(value);
            return `${strVal.substring(0, 4)}-${strVal.substring(4, 6)}-${strVal.substring(6, 8)}`;
        }

        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return date.toISOString().split('T')[0];
    }

    // Limpiar string y extraer solo la parte de fecha, ignorando horas si existen
    let str = String(value).trim().split(' ')[0];

    // Check if it's an 8-digit string like "20260224"
    if (str.length === 8 && /^\d{8}$/.test(str)) {
        return `${str.substring(0, 4)}-${str.substring(4, 6)}-${str.substring(6, 8)}`;
    }

    // Intenta varios formatos comunes en Colombia: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD
    const iso = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (iso) return str;
    const col = str.match(/^(\d{2})[\/\-](\d{2})[\/\-](\d{4})$/);
    if (col) return `${col[3]}-${col[2]}-${col[1]}`;

    // Fecha texto como "02/03/2026" o "02.03.2026"
    const parts = str.split(/[\/\-\.]/);
    if (parts.length >= 3) {
        let [p1, p2, p3] = parts;
        if (p3.length === 4) return `${p3}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
        if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
    }
    return str;
}

/**
 * Convierte un valor a número. Detecta automáticamente el formato:
 *   530937.94     → punto es decimal (Helisa)
 *   1.234.567,89  → puntos son miles, coma es decimal (Colombia)
 *   1,234,567.89  → comas son miles, punto es decimal (EEUU)
 *   -530937.94    → número negativo con punto decimal
 */
function toNumber(value) {
    if (value === null || value === undefined || value === '') return 0;
    if (typeof value === 'number') return value;

    let str = String(value).trim().replace(/[$\\s]/g, '');
    if (str === '' || str === '-') return 0;

    // Detectar signo negativo (puede ser con paréntesis o guión)
    let neg = false;
    if (str.startsWith('(') && str.endsWith(')')) { neg = true; str = str.slice(1, -1); }
    if (str.startsWith('-')) { neg = true; str = str.slice(1); }
    if (str.endsWith('-.') || str.endsWith('.-') || str.endsWith('-')) {
        neg = true;
        str = str.replace(/-\\.$|-\\.-$|-$/, '');
    }

    const dots = (str.match(/\\./g) || []).length;
    const commas = (str.match(/,/g) || []).length;

    let clean;

    if (dots > 0 && commas > 0) {
        // Encontrar cuál es el decimal (el último símbolo)
        const lastDot = str.lastIndexOf('.');
        const lastComma = str.lastIndexOf(',');
        if (lastDot > lastComma) {
            // El punto está después de la coma -> punto decimal, comas de miles
            clean = str.replace(/,/g, '');
        } else {
            // La coma está después del punto -> coma decimal, puntos de miles
            clean = str.replace(/\./g, '').replace(',', '.');
        }
    } else if (dots === 1 && commas === 0) {
        // "530937.94" o "530937.9" → punto es decimal
        clean = str;
    } else if (commas === 1 && dots === 0) {
        // "530937,94" → coma es decimal
        clean = str.replace(',', '.');
    } else if (dots > 1 && commas === 0) {
        // "1.234.567" → puntos solo son miles, sin decimales
        clean = str.replace(/\./g, '');
    } else if (commas > 1 && dots === 0) {
        // "1,234,567" → comas solo son miles
        clean = str.replace(/,/g, '');
    } else {
        // Sin puntos ni comas: "530937"
        clean = str;
    }

    const num = parseFloat(clean) || 0;
    return neg ? -num : num;
}

/**
 * Busca la fila de encabezados en una hoja buscando palabras clave
 */
function findHeaderRow(sheet, keywords, maxRows = 20) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    for (let r = range.s.r; r <= Math.min(range.e.r, maxRows); r++) {
        const rowVals = [];
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            rowVals.push(cell ? String(cell.v).toLowerCase().trim() : '');
        }
        const found = keywords.filter(k => rowVals.some(v => v.includes(k)));
        if (found.length >= Math.ceil(keywords.length * 0.6)) {
            return { headerRow: r, headers: rowVals };
        }
    }
    return null;
}

/**
 * Convierte una hoja de Excel a array de objetos usando la fila de encabezados
 */
function sheetToObjects(sheet, headerRow, headers) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    const rows = [];
    for (let r = headerRow + 1; r <= range.e.r; r++) {
        const obj = {};
        for (let c = range.s.c; c <= range.e.c; c++) {
            const cell = sheet[XLSX.utils.encode_cell({ r, c })];
            obj[headers[c - range.s.c]] = cell ? cell.v : '';
        }
        rows.push(obj);
    }
    return rows;
}

/**
 * Agrupa movimientos financieros (GMF, 4x1000) por fecha, consolidando sus montos
 * en un solo registro diario.
 */
function agruparMovimientosFinancieros(movimientos) {
    const result = [];
    const gruposGMF = {}; // Fecha -> Movimiento consolidado

    const isGMF = (desc) => {
        const d = String(desc || '').toLowerCase();
        return d.includes('gmf') || d.includes('4x1000') || d.includes('4 x 1000') || d.includes('4x1.000') || d.includes('4 x 1.000') || d.includes('gravamen') || (d.includes('impuesto') && (d.includes('financiero') || d.includes('4')));
    };

    // Primero procesamos agrupando GMF
    for (const m of movimientos) {
        if (isGMF(m.descripcion)) {
            const key = m.fecha;
            if (!gruposGMF[key]) {
                gruposGMF[key] = {
                    ...m,
                    descripcion: 'GMF / MOVIEMIENTOS FINANCIEROS (CONSOLIDADO)',
                    referencia: 'Consolidado',
                    comprobante: m.comprobante || 'Consolidado'
                };
            } else {
                gruposGMF[key].debito += m.debito;
                gruposGMF[key].credito += m.credito;
            }
        } else {
            result.push(m);
        }
    }

    // Volcamos los consolidados GMF al resultado
    for (const key in gruposGMF) {
        result.push(gruposGMF[key]);
    }

    // Devolvemos el array original pero con los GMF consolidados, ordenado por fecha de nuevo (opcional, pues se ordena en reconciliador)
    return result;
}

// ─────────────────────────────────────────────────────────────
//  PARSER BANCOLOMBIA
//  Soporta 2 formatos de exportación:
//  A) Dos columnas: Débito | Crédito  (ambas positivas)
//  B) Una columna: Valor/Importe      (positivos=entradas, negativos=salidas)
//  Columnas: Fecha | Descripción | [Referencia] | Débito | Crédito | Saldo
// ─────────────────────────────────────────────────────────────
function parseBancolombia(workbook) {
    let found = null;
    let sheet = null;

    // Buscar en todas las hojas la que tenga los encabezados
    for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        let f = findHeaderRow(s, ['fecha', 'débito', 'crédito']);
        if (!f) f = findHeaderRow(s, ['fecha', 'debito', 'credito']);
        if (!f) f = findHeaderRow(s, ['fecha', 'importe']);
        if (!f) f = findHeaderRow(s, ['fecha', 'valor', 'saldo']);
        if (!f) f = findHeaderRow(s, ['fecha', 'monto']);
        
        if (f) {
            found = f;
            sheet = s;
            break;
        }
    }

    if (!found) throw new Error(
        'Bancolombia: no se encontró la fila de encabezados en ninguna hoja. ' +
        'El archivo debe tener columnas de Fecha y Débito/Crédito o Importe.'
    );

    const rows = sheetToObjects(sheet, found.headerRow, found.headers);
    const result = [];

    for (const row of rows) {
        const keys = Object.keys(row);
        const fechaKey = keys.find(k => k.includes('fecha'));
        const descKey = keys.find(k => k.includes('descripci') || k.includes('concepto') || k.includes('detalle'));
        const refKey = keys.find(k => k.includes('referencia') || k.includes('ref') || k.includes('número') || k.includes('numero'));
        const debKey = keys.find(k => k.includes('débito') || k.includes('debito') || k.includes('cargo'));
        const credKey = keys.find(k => k.includes('crédito') || k.includes('credito') || k.includes('abono'));
        // Columna única con signo (positivo=entrada, negativo=salida)
        const importeKey = !debKey && !credKey
            ? keys.find(k => k.includes('importe') || k.includes('valor') || k.includes('monto'))
            : null;
        const saldoKey = keys.find(k => k.includes('saldo'));

        if (!fechaKey || !row[fechaKey]) continue;
        const fecha = excelDateToISO(row[fechaKey]);
        if (!fecha) continue;

        let debito, credito;

        if (importeKey) {
            // Formato columna única: positivo=entrada(crédito), negativo=salida(débito)
            const monto = toNumber(row[importeKey]);
            if (monto === 0) continue;
            debito = monto < 0 ? Math.abs(monto) : 0;
            credito = monto > 0 ? monto : 0;
        } else {
            // Formato dos columnas: ambas positivas
            debito = toNumber(row[debKey]);
            credito = toNumber(row[credKey]);
            if (debito === 0 && credito === 0) continue;
        }

        result.push({
            fecha,
            descripcion: row[descKey] ? String(row[descKey]).trim() : '',
            referencia: row[refKey] ? String(row[refKey]).trim() : '',
            debito,
            credito,
            saldo: toNumber(row[saldoKey]),
            origen: 'Bancolombia'
        });
    }

    if (result.length === 0) throw new Error(
        'Bancolombia: no se encontraron movimientos. ' +
        'Verifique que las columnas de Débito/Crédito o Importe tengan valores numéricos.'
    );
    return agruparMovimientosFinancieros(result);
}

// ─────────────────────────────────────────────────────────────
//  PARSER BBVA
//  Soporta 2 formatos:
//  A) Columna única Importe: positivo=entrada, negativo=salida
//  B) Dos columnas: Débito | Crédito (ambas positivas)
//  Columnas: Fecha Operación | Fecha Valor | Concepto | Importe | Saldo
// ─────────────────────────────────────────────────────────────
function parseBBVA(workbook) {
    let found = null;
    let sheet = null;

    // Buscar en todas las hojas (BBVA a veces pone carátulas)
    for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        let f = findHeaderRow(s, ['fecha', 'importe']);
        if (!f) f = findHeaderRow(s, ['fecha', 'débito', 'crédito']);
        if (!f) f = findHeaderRow(s, ['fecha', 'debito', 'credito']);
        if (!f) f = findHeaderRow(s, ['fecha', 'monto']);
        if (!f) f = findHeaderRow(s, ['fecha', 'valor']);
        
        if (f) {
            found = f;
            sheet = s;
            break;
        }
    }

    if (!found) throw new Error(
        'BBVA: no se encontró la fila de encabezados en ninguna hoja. ' +
        'Asegúrese de exportar el archivo desde la opción de Extractos o Movimientos en formato Excel.'
    );

    const rows = sheetToObjects(sheet, found.headerRow, found.headers);
    const result = [];

    for (const row of rows) {
        const keys = Object.keys(row);
        // Fecha: preferir "Fecha Operación" sobre "Fecha Valor"
        const fechaKey = keys.find(k => k.includes('fecha operaci'))
            || keys.find(k => k.includes('fecha'));
        const descKey = keys.find(k => k.includes('concepto') || k.includes('descripci') || k.includes('detalle'));
        const debKey = keys.find(k => k.includes('débito') || k.includes('debito') || k.includes('cargo'));
        const credKey = keys.find(k => k.includes('crédito') || k.includes('credito') || k.includes('abono'));
        // Columna única con signo (se usa si no hay débito Y crédito separados)
        const importeKey = (!debKey || !credKey)
            ? keys.find(k => k.includes('importe') || k.includes('monto') || k.includes('valor'))
            : null;
        const saldoKey = keys.find(k => k.includes('saldo'));

        if (!fechaKey || !row[fechaKey]) continue;
        const fecha = excelDateToISO(row[fechaKey]);
        if (!fecha) continue;

        let debito, credito;

        if (importeKey) {
            // Formato columna única: positivo=entrada(crédito), negativo=salida(débito)
            const monto = toNumber(row[importeKey]);
            if (monto === 0) continue;
            debito = monto < 0 ? Math.abs(monto) : 0;
            credito = monto > 0 ? monto : 0;
        } else {
            debito = toNumber(row[debKey]);
            credito = toNumber(row[credKey]);
            if (debito === 0 && credito === 0) continue;
        }

        result.push({
            fecha,
            descripcion: row[descKey] ? String(row[descKey]).trim() : '',
            referencia: '',
            debito,
            credito,
            saldo: toNumber(row[saldoKey]),
            origen: 'BBVA'
        });
    }

    if (result.length === 0) throw new Error(
        'BBVA: no se encontraron movimientos. ' +
        'Verifique que la columna Importe tenga valores numéricos.'
    );
    return agruparMovimientosFinancieros(result);
}

// ─────────────────────────────────────────────────────────────
//  PARSER HELISA — Soporta 2 formatos:
//  A) Libro Auxiliar (más común): bloques por cuenta con filas
//     de encabezado de cuenta, movimientos y totales
//  B) Movimiento de Bancos: tabla simple con encabezados fijos
//
//  Columnas que busca: Fecha | Comprobante/Doc | Descripción |
//                      Débito | Crédito | (Saldo opcional)
// ─────────────────────────────────────────────────────────────
function parseHelisa(workbook) {
    let sheet = null;
    let matrix = null;
    let range = null;

    // Buscar la hoja que parezca tener el movimiento de bancos
    for (const name of workbook.SheetNames) {
        const s = workbook.Sheets[name];
        if (!s || !s['!ref']) continue;
        
        const r = XLSX.utils.decode_range(s['!ref']);
        // Una matriz rápida para ver si tiene contenido
        const m = [];
        for (let ri = r.s.r; ri <= Math.min(r.e.r, 20); ri++) {
            const rowData = [];
            for (let ci = r.s.c; ci <= r.e.c; ci++) {
                const cell = s[XLSX.utils.encode_cell({ r: ri, c: ci })];
                rowData.push(cell ? String(cell.v ?? '').trim().toLowerCase() : '');
            }
            m.push(rowData);
        }

        // ¿Parece Helisa? (Busca Fecha, Débito, Crédito)
        const hasHeaders = m.some(row => 
            row.includes('fecha') && 
            (row.includes('debito') || row.includes('débito')) && 
            (row.includes('credito') || row.includes('crédito'))
        );

        if (hasHeaders) {
            sheet = s;
            range = r;
            // Re-escaneo completo de la matriz para la hoja ganadora
            matrix = [];
            for (let ri = r.s.r; ri <= r.e.r; ri++) {
                const fullRow = [];
                for (let ci = r.s.c; ci <= r.e.c; ci++) {
                    const cell = s[XLSX.utils.encode_cell({ r: ri, c: ci })];
                    fullRow.push(cell ? String(cell.v ?? '').trim() : '');
                }
                matrix.push(fullRow);
            }
            break;
        }
    }

    if (!sheet) throw new Error('Helisa: no se encontró una hoja válida con movimientos de bancos (Fecha, Débito, Crédito).');

    const result = [];

    // ── Paso 2: buscar la fila de encabezados ───────────────────
    // Palabras clave que identifican la fila de títulos de columna
    const KEYWORDS_FECHA = ['fecha'];
    const KEYWORDS_DEBITO = ['débito', 'debito', 'debe'];
    const KEYWORDS_CREDITO = ['crédito', 'credito', 'haber'];
    const KEYWORDS_SALDO = ['saldo'];
    const KEYWORDS_TERCERO = ['tercero', 'nombre', 'nit', 'beneficiario', 'razón social', 'razon social'];

    let headerRowIdx = -1;
    let colFecha = -1, colComp = -1, colDesc = -1, colDeb = -1, colCred = -1, colSaldo = -1, colTercero = -1;

    for (let r = 0; r < Math.min(matrix.length, 40); r++) {
        const row = matrix[r].map(v => v.toLowerCase());
        const hasFecha = row.some(v => KEYWORDS_FECHA.some(k => v.includes(k)));
        const hasDebito = row.some(v => KEYWORDS_DEBITO.some(k => v.includes(k)));
        const hasCredito = row.some(v => KEYWORDS_CREDITO.some(k => v.includes(k)));

        if (hasFecha && hasDebito && hasCredito) {
            headerRowIdx = r;
            // Mapear índices de columna
            row.forEach((v, ci) => {
                if (KEYWORDS_FECHA.some(k => v.includes(k)) && colFecha === -1) colFecha = ci;
                if ((v.includes('comprobante') || v.includes('comp') || v.includes('doc') || v.includes('número') || v.includes('numero')) && colComp === -1) colComp = ci;
                if ((v.includes('descripci') || v.includes('concepto') || v.includes('glosa') || v.includes('detalle')) && colDesc === -1) colDesc = ci;
                if (KEYWORDS_DEBITO.some(k => v.includes(k)) && colDeb === -1) colDeb = ci;
                if (KEYWORDS_CREDITO.some(k => v.includes(k)) && colCred === -1) colCred = ci;
                if (KEYWORDS_SALDO.some(k => v.includes(k)) && colSaldo === -1) colSaldo = ci;
                if (KEYWORDS_TERCERO.some(k => v.includes(k)) && colTercero === -1) colTercero = ci;
            });
            break;
        }
    }

    if (headerRowIdx === -1) throw new Error(
        'Helisa: no se encontró la fila de encabezados. Verifique que el archivo contenga columnas de Fecha, Débito y Crédito.'
    );

    // ── Paso 3: recorrer filas de datos ─────────────────────────
    for (let r = headerRowIdx + 1; r < matrix.length; r++) {
        const row = matrix[r];

        const rowText = row.join(' ').toLowerCase();
        const esFilaTotal = row.some(v => {
            const val = String(v).trim().toLowerCase();
            return val === 'total' || val.startsWith('total ') || val.startsWith('totales');
        });

        if (
            esFilaTotal ||
            rowText.includes('saldo anterior') ||
            rowText.includes('saldo inicial') ||
            rowText.includes('saldo final') ||
            rowText.trim() === '' ||
            row.every(v => v === '')
        ) continue;

        // Obtener fecha
        const fechaRaw = colFecha >= 0 ? row[colFecha] : '';
        const fecha = excelDateToISO(fechaRaw);
        if (!fecha || fecha.length < 8) continue;

        // Obtener montos
        let debito = colDeb >= 0 ? toNumber(row[colDeb]) : 0;
        let credito = colCred >= 0 ? toNumber(row[colCred]) : 0;

        // Fallback: si Helisa desplazó las columnas (por celdas combinadas), buscar en el resto de la fila
        if (debito === 0 && credito === 0) {
            const numsEncontrados = [];

            for (let i = 0; i < row.length; i++) {
                if (i === colFecha || i === colComp) continue;

                const cellVal = String(row[i]).trim();
                if (!cellVal || cellVal === '-') continue;

                // Excluir obvios NITs o cadenas con letras
                if (cellVal.includes('-.') || cellVal.includes('.-') || cellVal.endsWith('-') || cellVal.match(/[a-zA-Z]/)) continue;

                const num = toNumber(cellVal);
                if (num !== 0 && !isNaN(num)) {
                    numsEncontrados.push({ index: i, val: num });
                }
            }

            if (numsEncontrados.length > 0) {
                // Identificar si el último número es en realidad el Saldo
                let cantidadNumerosValidos = numsEncontrados.length;
                const ultimoNum = numsEncontrados[numsEncontrados.length - 1];
                const safeSaldoIndex = colSaldo !== -1 ? (colSaldo - 1) : Math.max(colDeb, colCred);

                // Si el último número está en o después de la zona de Saldo, lo ignoramos para transacciones
                if (ultimoNum.index >= safeSaldoIndex) {
                    cantidadNumerosValidos--;
                }

                // Si queda al menos un número que no es Saldo, tomamos el ÚLTIMO (más a la derecha)
                // Esto garantiza que salteamos teléfonos, NITs o números de serie en la descripción.
                if (cantidadNumerosValidos > 0) {
                    const montoReal = numsEncontrados[cantidadNumerosValidos - 1].val;
                    if (montoReal < 0) {
                        credito = Math.abs(montoReal);
                    } else {
                        debito = Math.abs(montoReal); // Asignamos como débito temporal (se ajustará luego según el banco)
                    }
                }
            }
        }

        if (debito === 0 && credito === 0) continue;

        result.push({
            fecha,
            comprobante: colComp >= 0 ? row[colComp] : '',
            tercero: colTercero >= 0 ? String(row[colTercero] || '').trim() : '',
            descripcion: colDesc >= 0 ? row[colDesc] : '',
            debito,
            credito,
            monto: credito - debito,
            origen: 'Helisa',
            _raw: row
        });
    }

    if (result.length === 0) throw new Error(
        'Helisa: no se encontraron movimientos con valor. ' +
        'Verifique que el archivo pertenece al período y cuenta correctos, ' +
        'y que las columnas de Débito/Crédito tengan valores numéricos.'
    );

    return agruparMovimientosFinancieros(result);
}
