const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

var UVT = 52374;
var CONCEPTOS_BIEN = [
  {k:'compras_general', label:'Compras generales (no productores)', tarPJ:0.025, tarPN_decl:0.025, tarPN_no_decl:0.035, baseMinUVT:27},
  {k:'compras_productores', label:'Compras a productores agropecuarios sin proceso industrial', tarPJ:0.015, tarPN_decl:0.015, tarPN_no_decl:0.015, baseMinUVT:92},
  {k:'compras_cafe', label:'Compras de café pergamino o cereza', tarPJ:0.005, tarPN_decl:0.005, tarPN_no_decl:0.005, baseMinUVT:160},
  {k:'compras_oro', label:'Compras de oro', tarPJ:0.01, tarPN_decl:0.01, tarPN_no_decl:0.01, baseMinUVT:0},
  {k:'compras_combustible', label:'Combustibles derivados del petróleo', tarPJ:0.001, tarPN_decl:0.001, tarPN_no_decl:0.001, baseMinUVT:0},
  {k:'adquis_vehiculos', label:'Adquisición de vehículos', tarPJ:0.01, tarPN_decl:0.01, tarPN_no_decl:0.01, baseMinUVT:27},
  {k:'adquis_inmueble_no_vivienda', label:'Adquisición bienes raíces uso diferente a vivienda', tarPJ:0.025, tarPN_decl:0.025, tarPN_no_decl:0.025, baseMinUVT:27},
  {k:'arrend_mueble', label:'Arrendamiento bien mueble', tarPJ:0.04, tarPN_decl:0.04, tarPN_no_decl:0.04, baseMinUVT:0},
  {k:'transporte_carga', label:'Transporte de carga', tarPJ:0.01, tarPN_decl:0.01, tarPN_no_decl:0.01, baseMinUVT:4},
  {k:'custom', label:'Otro / Personalizado', tarPJ:0, tarPN_decl:0, tarPN_no_decl:0, baseMinUVT:0}
];
var CONCEPTOS_SERV = [
  {k:'honorarios', label:'Honorarios (intelectuales)', tarPJ:0.11, tarPN_decl:0.11, tarPN_no_decl:0.10, baseMinUVT:0},
  {k:'comisiones', label:'Comisiones', tarPJ:0.11, tarPN_decl:0.11, tarPN_no_decl:0.10, baseMinUVT:0},
  {k:'serv_tec_oblig', label:'Servicios técnicos (oblig. llevar contabilidad)', tarPJ:0.06, tarPN_decl:0.06, tarPN_no_decl:0.06, baseMinUVT:4},
  {k:'serv_generales', label:'Servicios generales', tarPJ:0.04, tarPN_decl:0.04, tarPN_no_decl:0.06, baseMinUVT:4},
  {k:'serv_salud_ips', label:'Servicios integrales de salud (IPS)', tarPJ:0.02, tarPN_decl:0.02, tarPN_no_decl:0.02, baseMinUVT:4},
  {k:'serv_sismica', label:'Servicios de sísmica', tarPJ:0.06, tarPN_decl:0.06, tarPN_no_decl:0.06, baseMinUVT:0},
  {k:'serv_software', label:'Software y diseño web (declarante)', tarPJ:0.035, tarPN_decl:0.035, tarPN_no_decl:0.035, baseMinUVT:0},
  {k:'consultoria_obras', label:'Consultoría de obras públicas', tarPJ:0.02, tarPN_decl:0.02, tarPN_no_decl:0.02, baseMinUVT:0},
  {k:'consultoria_ing', label:'Consultoría ingeniería de infraestructura', tarPJ:0.06, tarPN_decl:0.06, tarPN_no_decl:0.10, baseMinUVT:0},
  {k:'rend_financieros', label:'Rendimientos financieros', tarPJ:0.07, tarPN_decl:0.07, tarPN_no_decl:0.07, baseMinUVT:0},
  {k:'transporte_pas_terrestre', label:'Transporte de pasajeros terrestre', tarPJ:0.035, tarPN_decl:0.035, tarPN_no_decl:0.035, baseMinUVT:27},
  {k:'transporte_pas_aereo', label:'Transporte de pasajeros aéreo/marítimo', tarPJ:0.01, tarPN_decl:0.01, tarPN_no_decl:0.01, baseMinUVT:4},
  {k:'arrend_inmueble', label:'Arrendamiento bien raíz', tarPJ:0.035, tarPN_decl:0.035, tarPN_no_decl:0.035, baseMinUVT:27},
  {k:'serv_aseo_vig', label:'Servicios de aseo y vigilancia (sobre AIU)', tarPJ:0.02, tarPN_decl:0.02, tarPN_no_decl:0.02, baseMinUVT:4},
  {k:'serv_temporal', label:'Servicios de empresa temporal (sobre AIU)', tarPJ:0.01, tarPN_decl:0.01, tarPN_no_decl:0.01, baseMinUVT:4},
  {k:'restaurante', label:'Restaurantes y hoteles', tarPJ:0.035, tarPN_decl:0.035, tarPN_no_decl:0.035, baseMinUVT:4},
  {k:'custom', label:'Otro / Personalizado', tarPJ:0, tarPN_decl:0, tarPN_no_decl:0, baseMinUVT:0}
];

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('liquidadorForm');
    
    // Elementos de entrada fijos
    const subtotalInput = document.getElementById('subtotal');
    const itemsList = document.getElementById('itemsList');
    const btnAddItem = document.getElementById('btnAddItem');
    const abonosInput = document.getElementById('abonos');

    // Nuevos campos avanzados
    const iTipoOp = document.getElementById('iTipoOp');
    const iConcepto = document.getElementById('iConcepto');
    const iProveedor = document.getElementById('iProveedor');
    const iComprador = document.getElementById('iComprador');
    const iCiudad = document.getElementById('iCiudad');
    const iICA = document.getElementById('iICA');
    const iAplicaICA = document.getElementById('iAplicaICA');
    const iAutorret = document.getElementById('iAutorret');
    const iCIIU = document.getElementById('iCIIU');
    const gCIIU = document.getElementById('gCIIU');
    const customRetefuente = document.getElementById('customRetefuente');

    // AIU
    const isAIUCheck = document.getElementById('isAIU');
    const aiuFields = document.getElementById('aiuFields');
    const aiuAdminInput = document.getElementById('aiuAdmin');
    const aiuImprevInput = document.getElementById('aiuImprev');
    const aiuUtilidadInput = document.getElementById('aiuUtilidad');
    const aiuBaseTaxSelect = document.getElementById('aiuBaseTax');

    // Elementos de resultado
    const resSubtotal = document.getElementById('resSubtotal');
    const summaryAiu = document.getElementById('summaryAiu');
    const resBaseAIU = document.getElementById('resBaseAIU');
    const resIVA = document.getElementById('resIVA');
    const resTotalGross = document.getElementById('resTotalGross');
    const resRetefuente = document.getElementById('resRetefuente');
    const resReteIVA = document.getElementById('resReteIVA');
    const resReteICA = document.getElementById('resReteICA');
    const resTotalDeductions = document.getElementById('resTotalDeductions');
    const resNetToPay = document.getElementById('resNetToPay');
    const resAbonos = document.getElementById('resAbonos');
    const resBalance = document.getElementById('resBalance');
    const matrizTable = document.getElementById('matriz');
    const notasDiv = document.getElementById('notas');

    // Botones
    const btnPrint = document.getElementById('btnPrint');
    const btnExport = document.getElementById('btnExport');

    // Formateador de moneda
    const formatter = new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 2
    });

    // Actualizar conceptos dinámicamente
    const actualizarConceptos = () => {
        const tipo = iTipoOp.value;
        const lista = tipo === 'bien' ? CONCEPTOS_BIEN : CONCEPTOS_SERV;
        iConcepto.innerHTML = '';
        lista.forEach(c => {
            const op = document.createElement('option');
            op.value = c.k;
            op.innerHTML = c.label;
            iConcepto.appendChild(op);
        });
        toggleCustomRetefuente();
        calculate();
    };

    const toggleCustomRetefuente = () => {
        if (iConcepto.value === 'custom') {
            customRetefuente.classList.add('show');
        } else {
            customRetefuente.classList.remove('show');
        }
    };

    const prefilICA = () => {
        const v = iCiudad.value;
        iICA.value = v;
        calculate();
    };

    // Helper para buscar concepto
    const buscarConcepto = (k) => {
        const todos = CONCEPTOS_BIEN.concat(CONCEPTOS_SERV);
        return todos.find(c => c.k === k) || null;
    };

    // Cálculos normativos
    const calcRetefuente = (base, concepto, proveedor, comprador) => {
        const c = buscarConcepto(concepto);
        if (!c) return { aplica: false, tarifa: 0, valor: 0, nota: 'Concepto no encontrado' };
        
        // Comprador RST no practica retefuente renta general (Art. 911 ET)
        if (comprador === 'rst_compr') return { aplica: false, tarifa: 0, valor: 0, nota: 'Régimen Simple no practica retefuente renta (Art. 911 ET)' };
        if (comprador === 'no_agente') return { aplica: false, tarifa: 0, valor: 0, nota: 'No eres agente de retención (PN sin patrimonio o ingresos brutos > 30.000 UVT)' };
        
        // Proveedor autorretenedor o RST: no se le retiene
        if (proveedor === 'autorretenedor') return { aplica: false, tarifa: 0, valor: 0, nota: 'Autorretenedor — el proveedor se autorretiene' };
        if (proveedor === 'rst') return { aplica: false, tarifa: 0, valor: 0, nota: 'Régimen Simple — no sujeto a retefuente renta (Art. 911 ET)' };
        
        // No residente: retención según Art. 408 ET, fija 20%
        if (proveedor === 'no_residente') return { aplica: true, tarifa: 0.20, valor: Math.round(base * 0.20), nota: 'No residente — Art. 408 ET (tarifa estándar 20 %)' };
        
        // Concepto personalizado
        if (concepto === 'custom') {
            const customRate = (parseFloat(customRetefuente.value) || 0) / 100;
            return { aplica: customRate > 0, tarifa: customRate, valor: Math.round(base * customRate), nota: 'Tarifa personalizada' };
        }

        // Base mínima
        const baseMin = c.baseMinUVT * UVT;
        if (c.baseMinUVT > 0 && base < baseMin) {
            return { aplica: false, tarifa: 0, valor: 0, nota: 'Base inferior al mínimo de ' + c.baseMinUVT + ' UVT ($' + baseMin.toLocaleString('es-CO') + ')' };
        }
        
        // Tarifa según proveedor
        let tarifa = 0;
        if (proveedor === 'pj') tarifa = c.tarPJ;
        else if (proveedor === 'pn_decl') tarifa = c.tarPN_decl;
        else if (proveedor === 'pn_no_decl') tarifa = c.tarPN_no_decl;
        else tarifa = c.tarPJ;
        
        return { aplica: true, tarifa: tarifa, valor: Math.round(base * tarifa), nota: '' };
    };

    const calcReteIVA = (base, ivaValue, comprador, proveedor) => {
        if (ivaValue <= 0) return { aplica: false, tarifa: 0, valor: 0, iva: 0, nota: 'Operación sin IVA gravado — no se practica reteIVA' };
        
        // Comprador no es responsable del IVA o es RST → no practica reteIVA
        if (comprador === 'no_agente') return { aplica: false, tarifa: 0, valor: 0, iva: ivaValue, nota: 'Comprador no es responsable del IVA — no practica reteIVA' };
        if (comprador === 'rst_compr') return { aplica: false, tarifa: 0, valor: 0, iva: ivaValue, nota: 'Régimen Simple no practica reteIVA (Art. 911 ET)' };
        
        // Proveedor del exterior — Art. 437-2 num 3: 100% del IVA teórico
        if (proveedor === 'no_residente') return { aplica: true, tarifa: 1.0, valor: ivaValue, iva: ivaValue, nota: 'No residente — reteIVA 100% (Art. 437-2 num 3 ET)' };
        
        // Proveedor autorretenedor — no se le practica reteIVA
        if (proveedor === 'autorretenedor') return { aplica: false, tarifa: 0, valor: 0, iva: ivaValue, nota: 'Autorretenedor — no se le practica reteIVA' };
        
        // Proveedor RST y comprador responsable del IVA → 15% (Art. 437-2 num 9 ET)
        if (proveedor === 'rst') return { aplica: true, tarifa: 0.15, valor: Math.round(ivaValue * 0.15), iva: ivaValue, nota: 'Compra al Régimen Simple — reteIVA 15% (Art. 437-2 num 9 ET)' };
        
        // Comprador es entidad pública o gran contribuyente → 15% al responsable común (nums 1 y 2)
        if (comprador === 'gran' || comprador === 'publico') {
            return { aplica: true, tarifa: 0.15, valor: Math.round(ivaValue * 0.15), iva: ivaValue, nota: 'Comprador Gran Contribuyente o Entidad Pública — reteIVA 15% (Art. 437-2 nums 1 y 2 ET)' };
        }
        
        return { aplica: false, tarifa: 0, valor: 0, iva: ivaValue, nota: 'Operación entre responsables comunes — no se practica reteIVA (Art. 437-2 ET)' };
    };

    const calcReteICA = (base, tarifaPorMil, aplica, proveedor, comprador) => {
        // RST proveedor: exento de reteICA (Art. 911 ET parágrafo)
        if (proveedor === 'rst') return { aplica: false, tarifa: 0, valor: 0, nota: 'Régimen Simple — no sujeto a reteICA (Art. 911 ET)' };
        // RST comprador: no practica reteICA
        if (comprador === 'rst_compr') return { aplica: false, tarifa: 0, valor: 0, nota: 'Régimen Simple no practica reteICA (Art. 911 ET)' };
        if (!aplica || tarifaPorMil <= 0) return { aplica: false, tarifa: 0, valor: 0, nota: 'No aplica o desactivado' };
        
        const tarifa = tarifaPorMil / 1000;
        return { aplica: true, tarifa: tarifa, valor: Math.round(base * tarifa), nota: '' };
    };

    const calcAutorret = (base, esAutorret, ciiuTar, comprador) => {
        if (comprador === 'rst_compr') return { aplica: false, tarifa: 0, valor: 0, nota: 'Régimen Simple — no es autorretenedor (Art. 911 ET)' };
        if (!esAutorret || ciiuTar <= 0) return { aplica: false, tarifa: 0, valor: 0, nota: 'No aplica' };
        return { aplica: true, tarifa: ciiuTar, valor: Math.round(base * ciiuTar), nota: 'Autorretención especial de renta por sector CIIU' };
    };

    const renderRow = (nombre, r, base) => {
        const cls = r.aplica ? 'aplica' : 'no-aplica';
        const badge = r.aplica ? '<span class="badge-aplica">Aplica</span>' : '<span class="badge-no">No aplica</span>';
        const tarifa = r.aplica ? (r.tarifa >= 1 ? '100 %' : (r.tarifa * 100).toFixed(2) + ' %') : '—';
        const baseTxt = r.aplica ? formatter.format(base) : '—';
        const nota = r.nota || '';
        return `<tr class="${cls}">
            <td><strong>${nombre}</strong></td>
            <td class="num">${baseTxt}</td>
            <td class="num">${tarifa}</td>
            <td>${badge}${nota ? '<br><span style="font-size:0.72rem; opacity:0.7;">' + nota + '</span>' : ''}</td>
            <td class="num">${r.aplica ? formatter.format(r.valor) : '—'}</td>
        </tr>`;
    };

    // Función para calcular
    const calculate = () => {
        let subtotal = 0;
        let ivaValue = 0;
        let firstIvaRate = 0.19;

        // Sumar todos los ítems dinámicos
        const rows = document.querySelectorAll('.item-row');
        rows.forEach((row, idx) => {
            const val = parseFloat(row.querySelector('.item-value').value) || 0;
            const rate = parseFloat(row.querySelector('.item-iva-rate').value) || 0;
            
            if (idx === 0) {
                firstIvaRate = rate;
            }

            subtotal += val;
            ivaValue += val * rate;
        });

        // Actualizar los inputs ocultos y etiquetas de resumen de ítems
        subtotalInput.value = subtotal;
        document.getElementById('lblSubtotalSum').textContent = formatter.format(subtotal);
        document.getElementById('lblIvaSum').textContent = formatter.format(ivaValue);

        const abonos = parseFloat(abonosInput.value) || 0;
        
        // AIU Logic
        let baseIVA = subtotal;
        let baseRetencion = subtotal;
        let totalAIU = 0;
        let isAiuActive = isAIUCheck.checked;

        if (isAiuActive) {
            const aiuAdmin = parseFloat(aiuAdminInput.value) || 0;
            const aiuImprev = parseFloat(aiuImprevInput.value) || 0;
            const aiuUtilidad = parseFloat(aiuUtilidadInput.value) || 0;
            totalAIU = aiuAdmin + aiuImprev + aiuUtilidad;
            const aiuBaseTax = aiuBaseTaxSelect.value;

            // En AIU el IVA siempre se calcula sobre la utilidad aplicando la tarifa del servicio
            baseIVA = aiuUtilidad;
            ivaValue = baseIVA * firstIvaRate;

            if (aiuBaseTax === 'total_aiu') {
                baseRetencion = totalAIU;
            } else if (aiuBaseTax === 'utilidad') {
                baseRetencion = aiuUtilidad;
            } else if (aiuBaseTax === 'subtotal') {
                baseRetencion = subtotal;
            }
            
            summaryAiu.style.display = 'flex';
            resBaseAIU.textContent = formatter.format(baseRetencion);
        } else {
            summaryAiu.style.display = 'none';
        }
        
        // 1. IVA y Total Bruto
        const totalGross = subtotal + (isAiuActive ? totalAIU : 0) + ivaValue;

        const concepto = iConcepto.value;
        const proveedor = iProveedor.value;
        const comprador = iComprador.value;
        const ica = parseFloat(iICA.value) || 0;
        const aplicaICA = iAplicaICA.checked;
        const esAutorret = iAutorret.value === 'si';
        const ciiuTar = parseFloat(iCIIU.value) || 0.0055;

        // Cálculos normativos avanzados
        const rte = calcRetefuente(baseRetencion, concepto, proveedor, comprador);
        const iva = calcReteIVA(baseRetencion, ivaValue, comprador, proveedor);
        const rica = calcReteICA(baseRetencion, ica, aplicaICA, proveedor, comprador);
        const auto = calcAutorret(baseRetencion, esAutorret, ciiuTar, comprador);

        // Totales de retenciones que afectan al proveedor (Renta, IVA, ICA)
        const totalDeductions = rte.valor + iva.valor + rica.valor;
        const netToPay = totalGross - totalDeductions;
        const finalBalance = netToPay - abonos;

        // Actualizar UI - Resumen General
        resSubtotal.textContent = formatter.format(subtotal);
        resIVA.textContent = formatter.format(ivaValue);
        resTotalGross.textContent = formatter.format(totalGross);
        
        resRetefuente.textContent = `- ${formatter.format(rte.valor)}`;
        resReteIVA.textContent = `- ${formatter.format(iva.valor)}`;
        resReteICA.textContent = `- ${formatter.format(rica.valor)}`;
        
        resTotalDeductions.textContent = `- ${formatter.format(totalDeductions)}`;
        resNetToPay.textContent = formatter.format(netToPay);
        resAbonos.textContent = `- ${formatter.format(abonos)}`;
        resBalance.textContent = formatter.format(finalBalance);

        // Generar filas de la matriz detallada
        let matrixRows = '';
        matrixRows += renderRow('Retefuente renta', rte, baseRetencion);
        matrixRows += renderRow('ReteIVA', iva, ivaValue);
        matrixRows += renderRow('ReteICA', rica, baseRetencion);
        matrixRows += renderRow('Autorretención especial', auto, baseRetencion);
        matrixRows += `<tr class="total-row"><td colspan="4">TOTAL retenido al proveedor (renta + IVA + ICA)</td><td class="num">${formatter.format(totalDeductions)}</td></tr>`;
        
        if (auto.aplica) {
            matrixRows += `<tr><td colspan="4" style="font-style:italic; color:var(--text-secondary); font-size:0.8rem; padding:8px 12px">Autorretención no se descuenta al proveedor — el comprador la declara y paga directamente</td><td class="num" style="font-weight:600">${formatter.format(auto.valor)}</td></tr>`;
        }
        
        matrizTable.innerHTML = `<thead><tr><th>Retención</th><th class="num">Base</th><th class="num">Tarifa</th><th>Estado / Nota</th><th class="num">Valor</th></tr></thead><tbody>${matrixRows}</tbody>`;

        // Generar notas/explicaciones de las retenciones que no aplicaron
        const notas = [];
        if (!rte.aplica && rte.nota) notas.push('<strong>Retefuente renta:</strong> ' + rte.nota);
        if (!iva.aplica && iva.nota) notas.push('<strong>ReteIVA:</strong> ' + iva.nota);
        if (!rica.aplica && rica.nota) notas.push('<strong>ReteICA:</strong> ' + rica.nota);
        if (!auto.aplica && auto.nota) notas.push('<strong>Autorretención:</strong> ' + auto.nota);
        
        if (notas.length > 0) {
            notasDiv.innerHTML = notas.join('<br>');
            notasDiv.style.display = 'block';
        } else {
            notasDiv.style.display = 'none';
        }
    };

    // Función para crear filas de ítems dinámicos
    const addItemRow = (desc = "", value = "", ivaRate = "0.19") => {
        const itemId = 'item-' + uid();
        const row = document.createElement('div');
        row.className = 'item-row';
        row.id = itemId;
        row.style.display = 'flex';
        row.style.gap = '10px';
        row.style.alignItems = 'center';
        row.style.width = '100%';

        row.innerHTML = `
            <input type="text" class="item-desc" value="${desc}" placeholder="Descripción del ítem (ej. Licencia)" style="flex:2;">
            <div class="input-wrapper" style="flex:1.2;">
                <span class="currency-symbol">$</span>
                <input type="number" class="item-value" value="${value}" placeholder="0.00" step="0.01" required>
            </div>
            <select class="item-iva-rate custom-select" style="flex:0.8;">
                <option value="0.19" ${ivaRate === '0.19' ? 'selected' : ''}>19%</option>
                <option value="0.05" ${ivaRate === '0.05' ? 'selected' : ''}>5%</option>
                <option value="0" ${ivaRate === '0' ? 'selected' : ''}>0%</option>
            </select>
            <button type="button" class="btn-remove-item" onclick="removeItemRow('${itemId}')">
                <i class="ph ph-trash"></i>
            </button>
        `;

        itemsList.appendChild(row);

        // Escuchar cambios para recalcular
        row.querySelector('.item-value').addEventListener('input', calculate);
        row.querySelector('.item-iva-rate').addEventListener('change', calculate);
        row.querySelector('.item-desc').addEventListener('input', calculate);

        calculate();
    };

    // Agregar nuevo ítem al hacer clic
    btnAddItem.addEventListener('click', () => {
        addItemRow("", "", "0.19");
    });

    // Eliminar fila de ítem
    window.removeItemRow = (id) => {
        const rows = document.querySelectorAll('.item-row');
        if(rows.length <= 1) {
            alert("❌ Debes tener al menos un ítem en la factura.");
            return;
        }
        const row = document.getElementById(id);
        if(row) {
            row.remove();
            calculate();
        }
    };

    // Escuchar cambios de campos fijos
    const fixedInputs = form.querySelectorAll('input:not(.item-desc):not(.item-value), select:not(.item-iva-rate)');
    fixedInputs.forEach(input => {
        input.addEventListener('input', calculate);
        input.addEventListener('change', calculate);
    });

    iTipoOp.addEventListener('change', actualizarConceptos);
    iConcepto.addEventListener('change', () => {
        toggleCustomRetefuente();
        calculate();
    });
    iCiudad.addEventListener('change', prefilICA);
    iAutorret.addEventListener('change', () => {
        gCIIU.style.display = iAutorret.value === 'si' ? 'grid' : 'none';
        calculate();
    });
    customRetefuente.addEventListener('input', calculate);
    
    // AIU UI Toggle
    isAIUCheck.addEventListener('change', (e) => {
        if (e.target.checked) {
            aiuFields.style.display = 'block';
        } else {
            aiuFields.style.display = 'none';
        }
        calculate();
    });

    // Botones de acción
    btnPrint.addEventListener('click', () => {
        window.print();
    });

    btnExport.addEventListener('click', () => {
        // Change button state
        const originalText = btnExport.innerHTML;
        btnExport.innerHTML = '<i class="ph ph-spinner ph-spin"></i> Generando PDF...';
        btnExport.disabled = true;

        const element = document.querySelector('.calculator-grid');
        
        const invoiceNum = document.getElementById('invoiceNum').value || '';
        const providerName = document.getElementById('providerName').value || '';
        let fileName = 'Liquidador_Retenciones';
        if (invoiceNum) fileName += `_Factura_${invoiceNum}`;
        else if (providerName) fileName += `_${providerName.replace(/\s+/g, '_')}`;
        fileName += '.pdf';
        
        // Obtener dimensiones reales del elemento para forzar una sola hoja
        const elementWidth = element.scrollWidth;
        const elementHeight = element.scrollHeight;

        // Opciones para generar en una sola hoja asegurando que el PDF tome el tamaño exacto del contenido
        const opt = {
            margin:       15, // 15px de margen
            filename:     fileName,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { scale: 2, backgroundColor: '#0f172a' }, // Fondo oscuro
            jsPDF:        { unit: 'px', format: [elementWidth + 30, elementHeight + 60], orientation: elementWidth > elementHeight ? 'landscape' : 'portrait' }
        };

        html2pdf().set(opt).from(element).save().then(() => {
            // Restore button state
            btnExport.innerHTML = originalText;
            btnExport.disabled = false;
        });
    });

    // Inicializar
    actualizarConceptos();
    addItemRow("Ítem 1", "", "0.19");
    calculate();
});
