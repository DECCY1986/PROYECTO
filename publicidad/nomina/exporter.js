/**
 * exporter.js — Exportación de nómina a PDF (jsPDF) y Excel (SheetJS)
 */

const EXPORTER = (() => {
    const { fmt } = NOMINA;

    // ── Helpers ───────────────────────────────────────────────────────────────
    function periodoStr(periodo) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const mes = meses[Number(periodo.mes) - 1] || periodo.mes;
        const q = periodo.quincena === '1' ? '1ª quincena (1–15)' : '2ª quincena (16–30)';
        return `${q} de ${mes} ${periodo.anio}`;
    }

    // ── PDF ───────────────────────────────────────────────────────────────────
    function exportarPDF(liquidaciones, periodo) {
        if (typeof jspdf === 'undefined') {
            alert('La biblioteca jsPDF no está disponible. Verifica tu conexión a Internet.');
            return;
        }
        const { jsPDF } = jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const periStr = periodoStr(periodo);
        const margen = 15;
        const ancho = 210 - margen * 2;

        // ── Portada / Resumen consolidado ─────────────────────────────────────
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, 210, 45, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(255, 255, 255);
        doc.text('NÓMINA QUINCENAL', 105, 18, { align: 'center' });

        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text(periStr, 105, 28, { align: 'center' });

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Generado: ${new Date().toLocaleDateString('es-CO')}`, 105, 36, { align: 'center' });

        // Tabla resumen
        let y = 55;
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('RESUMEN CONSOLIDADO', margen, y);
        y += 6;

        const resumenRows = liquidaciones.map(liq => [
            liq.empleado.nombre,
            liq.empleado.cargo,
            `$${fmt(liq.devengado)}`,
            `$${fmt(liq.deducciones)}`,
            `$${fmt(liq.neto)}`,
        ]);

        const totDev = liquidaciones.reduce((a, l) => a + l.devengado, 0);
        const totDed = liquidaciones.reduce((a, l) => a + l.deducciones, 0);
        const totNet = liquidaciones.reduce((a, l) => a + l.neto, 0);

        doc.autoTable({
            startY: y,
            head: [['Empleado', 'Cargo', 'Devengado', 'Deducciones', 'Neto a Pagar']],
            body: resumenRows,
            foot: [['', 'TOTAL', `$${fmt(totDev)}`, `$${fmt(totDed)}`, `$${fmt(totNet)}`]],
            margin: { left: margen, right: margen },
            headStyles: { fillColor: [99, 102, 241], textColor: 255, fontStyle: 'bold' },
            footStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold' },
            alternateRowStyles: { fillColor: [241, 245, 249] },
            styles: { fontSize: 9, cellPadding: 3 },
        });

        // ── Detalle por empleado ──────────────────────────────────────────────
        liquidaciones.forEach(liq => {
            doc.addPage();

            // Cabecera empleado
            doc.setFillColor(30, 41, 59);
            doc.rect(0, 0, 210, 40, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(14);
            doc.setTextColor(255, 255, 255);
            doc.text(liq.empleado.nombre.toUpperCase(), 105, 16, { align: 'center' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`${liq.empleado.cargo} | CC: ${liq.empleado.cedula}`, 105, 25, { align: 'center' });
            doc.text(periStr, 105, 33, { align: 'center' });

            let dy = 50;

            // Devengados
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('DEVENGADO', margen, dy); dy += 5;

            const devRows = [
                ['Salario base quincenal', `$${fmt(liq.baseQ)}`],
                ...(liq.tieneAuxTransporte ? [['Auxilio de transporte', `$${fmt(liq.auxQ)}`]] : []),
                ...liq.detalleNovedades.filter(n => n.adicion > 0).map(n => [n.descripcion, `$${fmt(n.adicion)}`]),
            ];
            doc.autoTable({
                startY: dy,
                body: devRows,
                foot: [['Total devengado', `$${fmt(liq.devengado)}`]],
                margin: { left: margen, right: margen },
                footStyles: { fillColor: [16, 185, 129], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: 'right' } },
            });
            dy = doc.lastAutoTable.finalY + 8;

            // Deducciones
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text('DEDUCCIONES', margen, dy); dy += 5;
            const dedRows = [
                ['Salud (4%)', `$${fmt(liq.saludQ)}`],
                ['Pensión (4%)', `$${fmt(liq.pensionQ)}`],
                ...liq.detalleNovedades.filter(n => n.deduccion > 0).map(n => [n.descripcion, `$${fmt(n.deduccion)}`]),
            ];
            doc.autoTable({
                startY: dy,
                body: dedRows,
                foot: [['Total deducciones', `$${fmt(liq.deducciones)}`]],
                margin: { left: margen, right: margen },
                footStyles: { fillColor: [239, 68, 68], textColor: 255, fontStyle: 'bold' },
                styles: { fontSize: 9 },
                columnStyles: { 1: { halign: 'right' } },
            });
            dy = doc.lastAutoTable.finalY + 8;

            // Neto
            doc.setFillColor(99, 102, 241);
            doc.roundedRect(margen, dy, ancho, 14, 3, 3, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(255, 255, 255);
            doc.text('NETO A PAGAR', margen + 5, dy + 9);
            doc.text(`$${fmt(liq.neto)}`, margen + ancho - 5, dy + 9, { align: 'right' });
        });

        doc.save(`nomina_${periStr.replace(/\s+/g, '_')}.pdf`);
    }

    // ── Excel ─────────────────────────────────────────────────────────────────
    function exportarExcel(liquidaciones, periodo) {
        if (typeof XLSX === 'undefined') {
            alert('La biblioteca SheetJS no está disponible. Verifica tu conexión a Internet.');
            return;
        }
        const periStr = periodoStr(periodo);
        const wb = XLSX.utils.book_new();

        // Hoja resumen
        const resumenData = [
            [`NÓMINA QUINCENAL — ${periStr}`],
            [],
            ['Empleado', 'Cédula', 'Cargo', 'Salario Mensual', 'Base Quincenal',
                'Aux. Transporte', 'Adiciones', 'Salud', 'Pensión', 'Otras Deducciones',
                'Total Devengado', 'Total Deducciones', 'Neto a Pagar'],
            ...liquidaciones.map(liq => [
                liq.empleado.nombre,
                liq.empleado.cedula,
                liq.empleado.cargo,
                liq.empleado.salarioMensual,
                liq.baseQ,
                liq.auxQ,
                liq.totalAdiciones,
                liq.saludQ,
                liq.pensionQ,
                liq.totalDeducciones,
                liq.devengado,
                liq.deducciones,
                liq.neto,
            ]),
            [],
            ['', '', '', '', '', '', '', '', '', '',
                liquidaciones.reduce((a, l) => a + l.devengado, 0),
                liquidaciones.reduce((a, l) => a + l.deducciones, 0),
                liquidaciones.reduce((a, l) => a + l.neto, 0),
            ],
        ];

        const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);
        wsResumen['!cols'] = [
            { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 16 }, { wch: 16 },
            { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 18 },
            { wch: 17 }, { wch: 18 }, { wch: 14 },
        ];
        XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

        // Hoja individual por empleado
        liquidaciones.forEach(liq => {
            const rows = [
                [`LIQUIDACIÓN — ${liq.empleado.nombre}`],
                [`Período: ${periStr}`],
                [`Cédula: ${liq.empleado.cedula}   |   Cargo: ${liq.empleado.cargo}   |   Salario Mensual: $${fmt(liq.empleado.salarioMensual)}`],
                [],
                ['CONCEPTO', 'TIPO', 'VALOR'],
                ['Salario base quincenal', 'Devengado', liq.baseQ],
                ...(liq.tieneAuxTransporte ? [['Auxilio de transporte', 'Devengado', liq.auxQ]] : []),
                ...liq.detalleNovedades.filter(n => n.adicion > 0).map(n => [n.descripcion, 'Adición', n.adicion]),
                ['Salud (4%)', 'Deducción', -liq.saludQ],
                ['Pensión (4%)', 'Deducción', -liq.pensionQ],
                ...liq.detalleNovedades.filter(n => n.deduccion > 0).map(n => [n.descripcion, 'Deducción', -n.deduccion]),
                [],
                ['TOTAL DEVENGADO', '', liq.devengado],
                ['TOTAL DEDUCCIONES', '', liq.deducciones],
                ['NETO A PAGAR', '', liq.neto],
            ];
            const sheetName = liq.empleado.nombre.substring(0, 31).replace(/[\\/?*[\]:]/g, '');
            const ws = XLSX.utils.aoa_to_sheet(rows);
            ws['!cols'] = [{ wch: 35 }, { wch: 14 }, { wch: 16 }];
            XLSX.utils.book_append_sheet(wb, ws, sheetName);
        });

        XLSX.writeFile(wb, `nomina_${periStr.replace(/\s+/g, '_')}.xlsx`);
    }

    return { exportarPDF, exportarExcel, exportarParafiscalesExcel, exportarPrestacionesExcel };

    // ── Parafiscales (solo aportes empleador) ────────────────────────────────
    function exportarParafiscalesExcel(liquidaciones, periodo) {
        if (typeof XLSX === 'undefined') {
            alert('La biblioteca SheetJS no está disponible. Verifica tu conexión a Internet.');
            return;
        }
        if (liquidaciones.length === 0) { alert('No hay empleados para exportar.'); return; }

        const periStr = periodoStr(periodo);
        const wb = XLSX.utils.book_new();

        const cabecera = [
            [`PARAFISCALES Y APORTES EMPLEADOR — ${periStr}`],
            [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
            [],
            [
                'Empleado', 'Cédula', 'Cargo', 'Nivel ARL',
                'Salario Mensual', 'Base Quincenal',
                'Salud Empleador (8.5%)',
                'Pensión Empleador (12%)',
                'ARL (tarifa según nivel)',
                'Caja Comp. (4%)',
                'SENA', 'ICBF',
                'Total Aportes Empleador',
                'Neto Empleado',
                'Costo Total Empleador',
            ],
        ];

        const filas = liquidaciones.map(liq => {
            const p = liq.paraQ;
            return [
                liq.empleado.nombre,
                liq.empleado.cedula,
                liq.empleado.cargo,
                `Nivel ${p.nivelARL} (${(p.arlTasa * 100).toFixed(3)}%)`,
                liq.empleado.salarioMensual,
                liq.baseQ,
                p.saludEmpr,
                p.pensionEmpr,
                p.arl,
                p.caja,
                0,   // SENA — exonerado
                0,   // ICBF — exonerado
                liq.totalParaQ,
                liq.neto,
                liq.costoTotalQ,
            ];
        });

        const totales = [
            'TOTAL', '', '', '',
            liquidaciones.reduce((a, l) => a + l.empleado.salarioMensual, 0),
            liquidaciones.reduce((a, l) => a + l.baseQ, 0),
            liquidaciones.reduce((a, l) => a + l.paraQ.saludEmpr, 0),
            liquidaciones.reduce((a, l) => a + l.paraQ.pensionEmpr, 0),
            liquidaciones.reduce((a, l) => a + l.paraQ.arl, 0),
            liquidaciones.reduce((a, l) => a + l.paraQ.caja, 0),
            0, 0,
            liquidaciones.reduce((a, l) => a + l.totalParaQ, 0),
            liquidaciones.reduce((a, l) => a + l.neto, 0),
            liquidaciones.reduce((a, l) => a + l.costoTotalQ, 0),
        ];

        const ws = XLSX.utils.aoa_to_sheet([...cabecera, ...filas, [], totales]);
        ws['!cols'] = [
            { wch: 25 }, { wch: 14 }, { wch: 20 }, { wch: 20 },
            { wch: 16 }, { wch: 16 },
            { wch: 22 }, { wch: 22 }, { wch: 22 }, { wch: 16 },
            { wch: 8 }, { wch: 8 },
            { wch: 22 }, { wch: 16 }, { wch: 22 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Parafiscales');
        XLSX.writeFile(wb, `parafiscales_${periStr.replace(/\s+/g, '_')}.xlsx`);
    }

    // ── Prestaciones sociales ─────────────────────────────────────────
    function exportarPrestacionesExcel(liquidaciones, periodo) {
        if (typeof XLSX === 'undefined') {
            alert('La biblioteca SheetJS no está disponible. Verifica tu conexión a Internet.');
            return;
        }
        if (liquidaciones.length === 0) { alert('No hay empleados para exportar.'); return; }

        const periStr = periodoStr(periodo);
        const wb = XLSX.utils.book_new();

        const cabecera = [
            [`PROVISIÓN DE PRESTACIONES SOCIALES — ${periStr}`],
            [`Generado: ${new Date().toLocaleDateString('es-CO')}`],
            [`Nota: valores quincenales (provisionados cada 15 días)`],
            [],
            [
                'Empleado', 'Cédula', 'Cargo',
                'Salario Mensual',
                'Aux. Transp. (base ces.)',
                'Prima de Servicios (8.33%)',
                'Cesantías (8.33%)',
                'Intereses Cesantías (1%)',
                'Vacaciones (4.17%)',
                'Total Quincenal',
                'Total Mensual (x2)',
            ],
        ];

        const filas = liquidaciones.map(liq => {
            const ps = liq.prestQ;
            return [
                liq.empleado.nombre,
                liq.empleado.cedula,
                liq.empleado.cargo,
                liq.empleado.salarioMensual,
                liq.tieneAuxTransporte ? liq.auxQ : 0,
                ps.prima,
                ps.cesantias,
                ps.intCes,
                ps.vacaciones,
                ps.total,
                ps.total * 2,
            ];
        });

        const sum = f => liquidaciones.reduce((a, l) => a + f(l), 0);
        const totales = [
            'TOTAL', '', '',
            sum(l => l.empleado.salarioMensual),
            sum(l => l.tieneAuxTransporte ? l.auxQ : 0),
            sum(l => l.prestQ.prima),
            sum(l => l.prestQ.cesantias),
            sum(l => l.prestQ.intCes),
            sum(l => l.prestQ.vacaciones),
            sum(l => l.prestQ.total),
            sum(l => l.prestQ.total * 2),
        ];

        const ws = XLSX.utils.aoa_to_sheet([...cabecera, ...filas, [], totales]);
        ws['!cols'] = [
            { wch: 25 }, { wch: 14 }, { wch: 20 },
            { wch: 16 }, { wch: 24 },
            { wch: 24 }, { wch: 18 }, { wch: 22 }, { wch: 18 },
            { wch: 18 }, { wch: 18 },
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Prestaciones');
        XLSX.writeFile(wb, `prestaciones_${periStr.replace(/\s+/g, '_')}.xlsx`);
    }
})();
