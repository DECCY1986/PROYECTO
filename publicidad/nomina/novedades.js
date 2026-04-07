/**
 * novedades.js — Motor de cálculo de nómina quincenal (Colombia)
 * SMMLV 2026: $1,750,905 | Aux. transporte 2026: $249,095
 */

const NOMINA = (() => {
    // ── Constantes legales 2026 (Decretos 1469 y 1470 del 29-dic-2025) ──────
    const SMMLV = 1_750_905;
    const AUX_TRANSPORTE = 249_095;
    const SALUD_EMP = 0.04;    // 4%  empleado
    const PENSION_EMP = 0.04;    // 4%  empleado

    // Aportes empleador
    const SALUD_EMPR = 0.085;   // 8.5% empleador
    const PENSION_EMPR = 0.12;    // 12%  empleador
    const CAJA_COMP = 0.04;    // 4%   Caja de Compensación
    const SENA = 0.02;    // 2%   SENA  (exonerado)
    const ICBF = 0.03;    // 3%   ICBF  (exonerado)

    // Tarifas ARL por nivel de riesgo
    const ARL_TARIFAS = {
        'I': 0.00522,  // 0.522%
        'II': 0.01044,  // 1.044%
        'III': 0.02436,  // 2.436%
        'IV': 0.04350,  // 4.350%
        'V': 0.06960,  // 6.960%
    };

    // Provisión de prestaciones sociales (sobre salario mensual)
    const PRIMA_SERV = 1 / 12;   // 8.33%  — un mes/año
    const CESANTIAS = 1 / 12;   // 8.33%  — un mes/año
    const INT_CESANT = 0.01;     // 1%     — 12% de las cesarías anuales
    const VACACIONES = 1 / 24;   // 4.17%  — 15 días/año

    // Recargos sobre valor hora base
    const RECARGOS = {
        hora_extra_diurna: 0.25,   // +25%
        hora_extra_nocturna: 0.75,   // +75%
        hora_extra_festiva: 1.00,   // +100%
        recargo_nocturno: 0.35,   // +35%
        recargo_festivo: 0.75,   // +75%
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    function valorDia(salarioMensual) {
        return salarioMensual / 30;
    }

    function valorHora(salarioMensual) {
        return salarioMensual / 240;
    }

    function tieneAuxTransporte(salarioMensual) {
        return salarioMensual <= SMMLV * 2;
    }

    // ── Cálculo individual de una novedad ────────────────────────────────────
    /**
     * @param {object} novedad
     * @param {number} salarioMensual
     * @returns {{ adicion: number, deduccion: number, descripcion: string }}
     */
    function calcularNovedad(novedad, salarioMensual) {
        const vDia = valorDia(salarioMensual);
        const vHora = valorHora(salarioMensual);
        let adicion = 0, deduccion = 0, descripcion = '';

        switch (novedad.tipo) {
            case 'ausencia_injustificada': {
                const dias = Number(novedad.valor) || 0;
                deduccion = dias * vDia;
                descripcion = `Ausencia injustificada (${dias} día${dias !== 1 ? 's' : ''})`;
                break;
            }
            case 'incapacidad': {
                // Primeros 2 días: empleador paga el 100%  → no descuenta
                // Del día 3 al 90: EPS paga 66.67% → descuento al empleado del 33.33%
                const dias = Number(novedad.valor) || 0;
                const diasDescontados = Math.max(0, dias - 2);
                deduccion = diasDescontados * vDia * 0.3333;
                descripcion = `Incapacidad (${dias} día${dias !== 1 ? 's' : ''})`;
                break;
            }
            case 'vacaciones': {
                // En quincena: la mitad del disfrute se puede pagar aquí.
                // Valor vacaciones = salario/2 por 15 días de disfrute (proporcional)
                const dias = Number(novedad.valor) || 0;
                adicion = dias * vDia * 0.5; // 50% sobre valor día (descanso remunerado)
                descripcion = `Vacaciones (${dias} día${dias !== 1 ? 's' : ''})`;
                break;
            }
            case 'hora_extra_diurna': {
                const horas = Number(novedad.valor) || 0;
                adicion = horas * vHora * (1 + RECARGOS.hora_extra_diurna);
                descripcion = `Horas extra diurnas (${horas} h)`;
                break;
            }
            case 'hora_extra_nocturna': {
                const horas = Number(novedad.valor) || 0;
                adicion = horas * vHora * (1 + RECARGOS.hora_extra_nocturna);
                descripcion = `Horas extra nocturnas (${horas} h)`;
                break;
            }
            case 'hora_extra_festiva': {
                const horas = Number(novedad.valor) || 0;
                adicion = horas * vHora * (1 + RECARGOS.hora_extra_festiva);
                descripcion = `Horas extra festivas (${horas} h)`;
                break;
            }
            case 'recargo_nocturno': {
                const horas = Number(novedad.valor) || 0;
                adicion = horas * vHora * RECARGOS.recargo_nocturno;
                descripcion = `Recargo nocturno (${horas} h)`;
                break;
            }
            case 'recargo_festivo': {
                const horas = Number(novedad.valor) || 0;
                adicion = horas * vHora * RECARGOS.recargo_festivo;
                descripcion = `Recargo festivo (${horas} h)`;
                break;
            }
            case 'bono':
            case 'auxilio': {
                adicion = Number(novedad.valor) || 0;
                descripcion = novedad.tipo === 'bono'
                    ? `Bono/Comisión ($${fmt(adicion)})`
                    : `Auxilio ($${fmt(adicion)})`;
                break;
            }
            case 'prestamo':
            case 'descuento': {
                deduccion = Number(novedad.valor) || 0;
                descripcion = novedad.tipo === 'prestamo'
                    ? `Préstamo/Libranza ($${fmt(deduccion)})`
                    : `Descuento ($${fmt(deduccion)})`;
                break;
            }
            default:
                descripcion = 'Novedad desconocida';
        }

        return { adicion, deduccion, descripcion };
    }

    // Empleador exonerado de SENA e ICBF (Ley 1607/2012)
    function calcularParafiscalesMes(salarioMensual, nivelARL) {
        const arlTasa = ARL_TARIFAS[nivelARL] || ARL_TARIFAS['I'];
        const isExempt = salarioMensual < (10 * SMMLV);
        return {
            nivelARL: nivelARL || 'I',
            arlTasa,
            saludEmpr: isExempt ? 0 : (salarioMensual * SALUD_EMPR),
            pensionEmpr: salarioMensual * PENSION_EMPR,
            arl: salarioMensual * arlTasa,
            caja: salarioMensual * CAJA_COMP,
            sena: 0,   // Exonerado
            icbf: 0,   // Exonerado
            aplicaSenaIcbf: !isExempt,
        };
    }

    // Provisión mensual de prestaciones sociales (costo empleador)
    function calcularPrestacionesMes(salarioMensual, auxTransporteMes) {
        // Base para cesantías incluye aux. transporte
        const baseCes = salarioMensual + auxTransporteMes;
        const prima = salarioMensual * PRIMA_SERV;
        const cesantias = baseCes * CESANTIAS;
        const intCes = cesantias * INT_CESANT;  // 1% mensual de las cesarías
        const vacaciones = salarioMensual * VACACIONES;
        return {
            prima, cesantias, intCes, vacaciones,
            total: prima + cesantias + intCes + vacaciones
        };
    }

    // ── Liquidación completa de un empleado ──────────────────────────────────
    /**
     * @param {object} empleado  { nombre, cedula, cargo, salarioMensual, novedades[] }
     * @returns {object}         Detalle completo de la liquidación
     */
    function liquidar(empleado) {
        const sal = Number(empleado.salarioMensual) || 0;
        const baseQ = sal / 2;
        const auxQ = tieneAuxTransporte(sal) ? AUX_TRANSPORTE / 2 : 0;

        // Novedades
        let totalAdiciones = 0;
        let totalDeducciones = 0;
        const detalleNovedades = (empleado.novedades || []).map(nov => {
            const r = calcularNovedad(nov, sal);
            totalAdiciones += r.adicion;
            totalDeducciones += r.deduccion;
            return { ...nov, ...r };
        });

        // Seguridad social empleado (por quincena)
        const saludQ = sal * SALUD_EMP / 2;
        const pensionQ = sal * PENSION_EMP / 2;

        // Totales empleado
        const devengado = baseQ + auxQ + totalAdiciones;
        const deducciones = saludQ + pensionQ + totalDeducciones;
        const neto = devengado - deducciones;

        // Parafiscales con nivel ARL del empleado
        const nivelARL = empleado.nivelARL || 'I';
        const paraMes = calcularParafiscalesMes(sal, nivelARL);
        const paraQ = {
            nivelARL,
            arlTasa: paraMes.arlTasa,
            saludEmpr: paraMes.saludEmpr / 2,
            pensionEmpr: paraMes.pensionEmpr / 2,
            arl: paraMes.arl / 2,
            caja: paraMes.caja / 2,
            sena: 0, icbf: 0,
            aplicaSenaIcbf: false,
        };
        const totalParaQ = paraQ.saludEmpr + paraQ.pensionEmpr + paraQ.arl + paraQ.caja;

        // Provisión de prestaciones sociales (quincenal)
        const auxMes = tieneAuxTransporte(sal) ? AUX_TRANSPORTE : 0;
        const prestMes = calcularPrestacionesMes(sal, auxMes);
        const prestQ = {
            prima: prestMes.prima / 2,
            cesantias: prestMes.cesantias / 2,
            intCes: prestMes.intCes / 2,
            vacaciones: prestMes.vacaciones / 2,
            total: prestMes.total / 2,
        };

        const costoTotalQ = neto + totalParaQ + prestQ.total;

        return {
            empleado,
            baseQ, auxQ,
            tieneAuxTransporte: auxQ > 0,
            totalAdiciones, totalDeducciones,
            saludQ, pensionQ,
            devengado, deducciones, neto,
            detalleNovedades,
            paraQ, totalParaQ,
            prestQ,
            costoTotalQ,
        };
    }

    // ── Liquidar lista completa ───────────────────────────────────────────────
    function liquidarTodos(empleados) {
        return empleados.map(liquidar);
    }

    // ── Formato moneda ────────────────────────────────────────────────────────
    function fmt(n) {
        return Number(n).toLocaleString('es-CO', {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        });
    }

    return {
        liquidar,
        liquidarTodos,
        tieneAuxTransporte,
        SMMLV,
        AUX_TRANSPORTE,
        ARL_TARIFAS,
        fmt,
        TIPOS_NOVEDAD: [
            { value: 'ausencia_injustificada', label: 'Ausencia injustificada', unidad: 'días', efecto: 'deducción' },
            { value: 'incapacidad', label: 'Incapacidad', unidad: 'días', efecto: 'deducción' },
            { value: 'vacaciones', label: 'Vacaciones', unidad: 'días', efecto: 'adición' },
            { value: 'hora_extra_diurna', label: 'Hora extra diurna', unidad: 'horas', efecto: 'adición' },
            { value: 'hora_extra_nocturna', label: 'Hora extra nocturna', unidad: 'horas', efecto: 'adición' },
            { value: 'hora_extra_festiva', label: 'Hora extra festiva', unidad: 'horas', efecto: 'adición' },
            { value: 'recargo_nocturno', label: 'Recargo nocturno', unidad: 'horas', efecto: 'adición' },
            { value: 'recargo_festivo', label: 'Recargo festivo', unidad: 'horas', efecto: 'adición' },
            { value: 'bono', label: 'Bono / Comisión', unidad: '$', efecto: 'adición' },
            { value: 'auxilio', label: 'Auxilio', unidad: '$', efecto: 'adición' },
            { value: 'prestamo', label: 'Préstamo / Libranza', unidad: '$', efecto: 'deducción' },
            { value: 'descuento', label: 'Descuento', unidad: '$', efecto: 'deducción' },
        ],
    };
})();
