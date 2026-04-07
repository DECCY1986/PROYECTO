// ============================================================
//  RECONCILER.JS — Motor de conciliación bancaria
// ============================================================

const TOLERANCE_AMOUNT = 1;   // diferencia máxima en pesos permitida
const TOLERANCE_DAYS = 15;  // diferencia máxima en días (banco vs Helisa pueden diferir 4-10 días)

/**
 * Diferencia en días entre dos fechas ISO (valor absoluto)
 */
function daysDiff(a, b) {
    const da = new Date(a + 'T00:00:00');
    const db = new Date(b + 'T00:00:00');
    return Math.abs((da - db) / 86400000);
}

/**
 * Principal: cruza movimientos bancarios contra Helisa
 *
 * NOTA CONTABLE IMPORTANTE:
 *   El banco y el Libro Auxiliar de Helisa usan signos OPUESTOS:
 *   - Banco crédito (abono)  ↔  Helisa DÉBITO   (aumenta activo cuenta bancaria)
 *   - Banco débito  (cargo)  ↔  Helisa CRÉDITO  (disminuye activo cuenta bancaria)
 *   Por eso el cruce se hace sobre VALOR ABSOLUTO (débito o crédito, el que sea > 0).
 *
 * @param {Array} bankMovements   — salida de parseBancolombia o parseBBVA
 * @param {Array} helisaMovements — salida de parseHelisa
 * @returns {{ matched, onlyBank, onlyHelisa, summary }}
 */
function reconcile(bankMovements, helisaMovements) {

    // Valor bruto de un movimiento (el que sea mayor de 0)
    const bruto = m => m.debito > 0 ? m.debito : m.credito;

    const usedHelisa = new Set();
    const matched = [];
    const onlyBank = [];

    // Ordenar por fecha
    const bankSorted = [...bankMovements].sort((a, b) => a.fecha.localeCompare(b.fecha));
    const helisaSorted = [...helisaMovements].sort((a, b) => a.fecha.localeCompare(b.fecha));

    for (const bMov of bankSorted) {
        const bMonto = bruto(bMov);
        if (bMonto === 0) continue;

        let bestMatch = null;
        let bestScore = Infinity;

        for (let i = 0; i < helisaSorted.length; i++) {
            if (usedHelisa.has(i)) continue;
            const hMov = helisaSorted[i];
            const hMonto = bruto(hMov);
            if (hMonto === 0) continue;

            // 1. Diferencia de monto (valor absoluto)
            const diffMonto = Math.abs(bMonto - hMonto);
            if (diffMonto > TOLERANCE_AMOUNT) continue;

            // 2. Diferencia de fechas
            const diffDias = daysDiff(bMov.fecha, hMov.fecha);
            if (diffDias > TOLERANCE_DAYS) continue;

            // Puntaje: menor = mejor. Prioriza fecha exacta y monto exacto.
            const score = diffDias * 10 + diffMonto;
            if (score < bestScore) {
                bestScore = score;
                bestMatch = { index: i, hMov };
            }
        }

        if (bestMatch) {
            usedHelisa.add(bestMatch.index);
            const h = bestMatch.hMov;
            matched.push({
                banco_fecha: bMov.fecha,
                banco_descripcion: bMov.descripcion,
                banco_referencia: bMov.referencia || '',
                banco_debito: bMov.debito,
                banco_credito: bMov.credito,
                banco_saldo: bMov.saldo || 0,
                helisa_fecha: h.fecha,
                helisa_comprobante: h.comprobante || '',
                helisa_descripcion: h.descripcion || '',
                helisa_debito: h.debito,
                helisa_credito: h.credito,
                diferencia_dias: daysDiff(bMov.fecha, h.fecha),
                diferencia_monto: round2(bMonto - bruto(h)),
                estado: 'CONCILIADO'
            });
        } else {
            onlyBank.push({
                fecha: bMov.fecha,
                descripcion: bMov.descripcion,
                referencia: bMov.referencia || '',
                debito: bMov.debito,
                credito: bMov.credito,
                saldo: bMov.saldo || 0,
                tipo: 'En banco, no en Helisa',
                origen: bMov.origen
            });
        }
    }

    // Movimientos de Helisa que no cruzaron con ningún movimiento bancario
    const onlyHelisa = helisaSorted
        .filter((_, i) => !usedHelisa.has(i))
        .map(h => ({
            fecha: h.fecha,
            comprobante: h.comprobante || '',
            tercero: h.tercero || '',
            descripcion: h.descripcion || '',
            debito: h.debito,
            credito: h.credito,
            tipo: 'En Helisa, no en banco',
            origen: 'Helisa'
        }))
        .sort((a, b) => (a.tercero || '').localeCompare(b.tercero || ''));

    // ── Resumen ──────────────────────────────────────────────
    const entradasBanco = bankMovements.reduce((s, m) => s + (m.credito || 0), 0);
    const salidasBanco = bankMovements.reduce((s, m) => s + (m.debito || 0), 0);
    const totalBanco = entradasBanco + salidasBanco;

    const entradasHelisa = helisaMovements.reduce((s, m) => s + (m.debito || 0), 0);
    const salidasHelisa = helisaMovements.reduce((s, m) => s + (m.credito || 0), 0);
    const totalHelisa = entradasHelisa + salidasHelisa;

    const summary = {
        entradasBanco: round2(entradasBanco),
        salidasBanco: round2(salidasBanco),
        totalBanco: round2(totalBanco),
        entradasHelisa: round2(entradasHelisa),
        salidasHelisa: round2(salidasHelisa),
        totalHelisa: round2(totalHelisa),
        diferencia: round2(totalBanco - totalHelisa),
        conciliados: matched.length,
        soloBanco: onlyBank.length,
        soloHelisa: onlyHelisa.length,
        totalMovsBanco: bankMovements.length,
        totalMovsHelisa: helisaMovements.length,
        porcentajeCruce: bankMovements.length
            ? Math.round((matched.length / bankMovements.length) * 100)
            : 0
    };

    return { matched, onlyBank, onlyHelisa, summary };
}

function round2(n) {
    return Math.round((n || 0) * 100) / 100;
}
