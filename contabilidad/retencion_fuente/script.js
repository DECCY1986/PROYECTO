// ═══════════════════════════════════════════
// CONFIGURACIÓN DE CONCEPTOS
// ═══════════════════════════════════════════
const MESES = {
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
    '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
};

const CFG = {
    pj: [
        {
            id: 'honorarios_pj', label: 'Honorarios', rgl_b: 29, rgl_r: 42,
            tarifas: [{ l: '11%', v: .11 }]
        },
        {
            id: 'comisiones_pj', label: 'Comisiones', rgl_b: 30, rgl_r: 43,
            tarifas: [{ l: '11%', v: .11 }]
        },
        {
            id: 'servicios_pj', label: 'Servicios', rgl_b: 31, rgl_r: 44,
            tarifas: [{ l: '1% (servicios en gral. PN-PJ exon.)', v: .01 }, { l: '4% (servicios en general)', v: .04 }, { l: '6% (servicios especiales)', v: .06 }]
        },
        {
            id: 'rendimientos_pj', label: 'Rendimientos financieros e intereses', rgl_b: 32, rgl_r: 45,
            tarifas: [{ l: '7%', v: .07 }]
        },
        {
            id: 'arrendamientos_pj', label: 'Arrendamientos (muebles e inmuebles)', rgl_b: 33, rgl_r: 46,
            tarifas: [{ l: '3.5% (inmuebles)', v: .035 }, { l: '4% (muebles)', v: .04 }]
        },
        {
            id: 'regalias_pj', label: 'Regalías y explotación de la propiedad intelectual', rgl_b: 34, rgl_r: 47,
            tarifas: [{ l: '11%', v: .11 }]
        },
        {
            id: 'dividendos_pj', label: 'Dividendos y participaciones', rgl_b: 35, rgl_r: 48,
            tarifas: [{ l: '10% (gravados)', v: .10 }, { l: '15% (año gravable >2022)', v: .15 }]
        },
        {
            id: 'compras_pj', label: 'Compras', rgl_b: 36, rgl_r: 49,
            tarifas: [{ l: '2.5% (declarantes renta)', v: .025 }, { l: '3.5% (no declarantes)', v: .035 }, { l: '0.1% (combustibles)', v: .001 }]
        },
        {
            id: 'tarjetas_pj', label: 'Transacciones tarjetas débito/crédito', rgl_b: 37, rgl_r: 50,
            tarifas: [{ l: '1.5%', v: .015 }]
        },
        {
            id: 'contratos_pj', label: 'Contratos de construcción y urbanización', rgl_b: 38, rgl_r: 51,
            tarifas: [{ l: '2%', v: .02 }]
        },
        {
            id: 'loterias_pj', label: 'Loterías, rifas, apuestas y similares', rgl_b: 39, rgl_r: 52,
            tarifas: [{ l: '17%', v: .17 }]
        },
        {
            id: 'hidrocarburos_pj', label: 'Hidrocarburos, carbón y demás productos mineros', rgl_b: 40, rgl_r: 53,
            tarifas: [{ l: '1%', v: .01 }]
        },
        {
            id: 'otros_pj', label: 'Otros pagos sujetos a retención', rgl_b: 41, rgl_r: 54,
            tarifas: [{ l: 'Manual', v: null }]
        },
        {
            id: 'ext_sin_pj', label: 'Pagos al exterior – Sin convenio', rgl_b: 55, rgl_r: 68,
            tarifas: [{ l: '20%', v: .20 }, { l: '33%', v: .33 }, { l: 'Manual', v: null }]
        },
        {
            id: 'ext_con_pj', label: 'Pagos al exterior – Con convenio vigente', rgl_b: 56, rgl_r: 69,
            tarifas: [{ l: 'Manual (según convenio)', v: null }]
        },
    ],
    auto: [
        {
            id: 'auto_ventas', label: 'Ventas', rgl_b: 58, rgl_r: 71,
            tarifas: [{ l: '0.55% (CIIU 1630)', v: .0055 }, { l: '1.1%', v: .011 }, { l: '0.8%', v: .008 }, { l: '0.4%', v: .004 }]
        },
        {
            id: 'auto_honorarios', label: 'Honorarios', rgl_b: 59, rgl_r: 72,
            tarifas: [{ l: '11%', v: .11 }]
        },
        {
            id: 'auto_comisiones', label: 'Comisiones', rgl_b: 60, rgl_r: 73,
            tarifas: [{ l: '11%', v: .11 }]
        },
        {
            id: 'auto_servicios', label: 'Servicios', rgl_b: 61, rgl_r: 74,
            tarifas: [{ l: '4%', v: .04 }]
        },
        {
            id: 'auto_rendimientos', label: 'Rendimientos financieros', rgl_b: 62, rgl_r: 75,
            tarifas: [{ l: '7%', v: .07 }]
        },
        {
            id: 'auto_otros', label: 'Otros conceptos', rgl_b: 63, rgl_r: 76,
            tarifas: [{ l: 'Manual', v: null }]
        },
    ],
    pn: [
        {
            id: 'trabajo_pn', label: 'Rentas de trabajo (salarios)', rgl_b: 77, rgl_r: 93,
            tarifas: [{ l: 'Tabla progresiva (manual)', v: null }]
        },
        {
            id: 'pensiones_pn', label: 'Rentas de pensiones', rgl_b: 78, rgl_r: 94,
            tarifas: [{ l: 'Tabla progresiva (manual)', v: null }]
        },
        {
            id: 'honorarios_pn', label: 'Honorarios', rgl_b: 79, rgl_r: 95,
            tarifas: [{ l: '11% (declarante renta)', v: .11 }, { l: '10%', v: .10 }]
        },
        {
            id: 'comisiones_pn', label: 'Comisiones', rgl_b: 80, rgl_r: 96,
            tarifas: [{ l: '11% (declarante renta)', v: .11 }, { l: '10%', v: .10 }]
        },
        {
            id: 'servicios_pn', label: 'Servicios', rgl_b: 81, rgl_r: 97,
            tarifas: [{ l: '4% (general)', v: .04 }, { l: '6% (especiales)', v: .06 }]
        },
        {
            id: 'rendimientos_pn', label: 'Rendimientos financieros e intereses', rgl_b: 82, rgl_r: 98,
            tarifas: [{ l: '7%', v: .07 }]
        },
        {
            id: 'arrendamientos_pn', label: 'Arrendamientos (muebles e inmuebles)', rgl_b: 83, rgl_r: 99,
            tarifas: [{ l: '3.5% (inmuebles)', v: .035 }, { l: '4% (muebles)', v: .04 }]
        },
        {
            id: 'regalias_pn', label: 'Regalías y explotación de la propiedad intelectual', rgl_b: 84, rgl_r: 100,
            tarifas: [{ l: '11%', v: .11 }]
        },
        {
            id: 'dividendos_pn', label: 'Dividendos y participaciones', rgl_b: 85, rgl_r: 101,
            tarifas: [{ l: '10% (gravados)', v: .10 }, { l: '15% (año grav. >2022)', v: .15 }]
        },
        {
            id: 'compras_pn', label: 'Compras', rgl_b: 86, rgl_r: 102,
            tarifas: [{ l: '2.5% (declarante)', v: .025 }, { l: '3.5% (no declarante)', v: .035 }]
        },
        {
            id: 'tarjetas_pn', label: 'Transacciones tarjetas débito/crédito', rgl_b: 87, rgl_r: 103,
            tarifas: [{ l: '1.5%', v: .015 }]
        },
        {
            id: 'contratos_pn', label: 'Contratos de construcción', rgl_b: 88, rgl_r: 104,
            tarifas: [{ l: '1%', v: .01 }, { l: '2%', v: .02 }]
        },
        {
            id: 'enajenacion_pn', label: 'Enajenación de activos fijos (notarios/tránsito)', rgl_b: 89, rgl_r: 105,
            tarifas: [{ l: '1%', v: .01 }]
        },
        {
            id: 'loterias_pn', label: 'Loterías, rifas, apuestas y similares', rgl_b: 90, rgl_r: 106,
            tarifas: [{ l: '20%', v: .20 }]
        },
        {
            id: 'hidrocarburos_pn', label: 'Hidrocarburos, carbón y demás productos mineros', rgl_b: 91, rgl_r: 107,
            tarifas: [{ l: '1%', v: .01 }]
        },
        {
            id: 'otros_pn', label: 'Otros pagos sujetos a retención', rgl_b: 92, rgl_r: 108,
            tarifas: [{ l: 'Manual', v: null }]
        },
        {
            id: 'ext_sin_pn', label: 'Pagos al exterior – Sin convenio', rgl_b: 109, rgl_r: 118,
            tarifas: [{ l: '20%', v: .20 }]
        },
        {
            id: 'ext_con_pn', label: 'Pagos al exterior – Con convenio vigente', rgl_b: 110, rgl_r: 119,
            tarifas: [{ l: 'Manual (según convenio)', v: null }]
        },
    ],
    iva: [
        {
            id: 'iva_responsables', label: 'A responsables del IVA (renglón 131)', rgl_b: 131, rgl_r: 131,
            tarifas: [{ l: '15% del IVA facturado', v: .15 }, { l: 'Manual', v: null }]
        },
        {
            id: 'iva_no_residentes', label: 'Servicios a no residentes/no domiciliados (renglón 132)', rgl_b: 132, rgl_r: 132,
            tarifas: [{ l: '100% del IVA', v: 1.0 }, { l: 'Manual', v: null }]
        },
        {
            id: 'timbre', label: 'Retenciones impuesto de timbre nacional (renglón 135)', rgl_b: 135, rgl_r: 135,
            tarifas: [{ l: 'Manual', v: null }]
        },
    ]
};

// ═══════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════
let state = {};

function getStorageKey() {
    const per = document.getElementById('enc_periodo')?.value || 'XX';
    const anio = document.getElementById('enc_anio')?.value || '2026';
    return `dimalcco_f350_${anio}_${per}`;
}

function initState() {
    const key = getStorageKey();
    const saved = localStorage.getItem(key);
    if (saved) {
        try { 
            const parsed = JSON.parse(saved);
            if (Object.keys(parsed).length > 0) {
                state = parsed; 
                return;
            }
        } catch (e) { console.error("Error al cargar estado:", e); }
    }
    
    // Inicialización Limpia si no hay datos
    state = {};
    ['pj', 'auto', 'pn', 'iva'].forEach(grp => {
        CFG[grp].forEach(c => { state[c.id] = { rows: [], excesos: [] }; });
    });
    state.exceso_renta = { rows: [] };
}

function saveState() {
    // PROTECCIÓN: No guardar si el estado está vacío (prevención de borrado accidental)
    const hasData = Object.values(state).some(c => (c.rows && c.rows.length > 0) || (c.excesos && c.excesos.length > 0));
    
    // Si el estado está vacío y no fue una acción explícita de "Reiniciar", no guardamos sobre la clave del periodo
    const key = getStorageKey();
    localStorage.setItem(key, JSON.stringify(state));
    
    // Guardar también en una clave global por compatibilidad si es necesario
    localStorage.setItem('dimalcco_f350_last', JSON.stringify(state));

    const btn = document.querySelector('.save-btn:last-child');
    if (btn) {
        btn.textContent = '✅ Guardado'; setTimeout(() => btn.textContent = '💾 Guardar', 2000);
    }
    
    // Sincronización Automática con el Portal Principal
    if (window.parent && window.parent.postMessage) {
        window.parent.postMessage({ type: 'sync_cloud', module: 'retefuente', data: state }, '*');
    }
}

function getConcepto(id) {
    if (!state[id]) state[id] = { rows: [], excesos: [] };
    return state[id];
}

// ═══════════════════════════════════════════
// NAVEGACIÓN
// ═══════════════════════════════════════════
function showTab(id) {
    document.querySelectorAll('.tab').forEach((t, i) => {
        const ids = ['enc', 'pj', 'pn', 'auto', 'iva', 'res', 'exp'];
        t.classList.toggle('on', ids[i] === id);
    });
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('on'));
    document.getElementById('panel-' + id).classList.add('on');
    if (id === 'res') renderResumen();
    if (id === 'exp') renderExportPreview();
}

// ═══════════════════════════════════════════
// ENCABEZADO
// ═══════════════════════════════════════════
function updateEnc() {
    const nit = document.getElementById('enc_nit').value;
    const dv = document.getElementById('enc_dv').value;
    const rs = document.getElementById('enc_rs').value;
    const per = document.getElementById('enc_periodo').value;
    const anio = document.getElementById('enc_anio').value;
    
    document.getElementById('nitDisplay').textContent = nit.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    document.getElementById('dvDisplay').textContent = dv;
    document.getElementById('rsDisplay').textContent = rs;
    document.getElementById('pLabel').textContent = `${MESES[per]} ${anio}`;

    // Al cambiar el periodo, volvemos a cargar el estado de ese periodo específico
    initState();
    renderGroup('pj', 'pjCards');
    renderGroup('auto', 'autoCards');
    renderGroup('pn', 'pnCards');
    renderGroup('iva', 'ivaCards');
}

function toggleCorr() {
    const c = document.getElementById('enc_corr').value === 'si';
    document.getElementById('formAnteriorFg').style.display = c ? 'block' : 'none';
}

// ═══════════════════════════════════════════
// RENDER CARDS
// ═══════════════════════════════════════════
function renderConceptoCard(cfg, groupKey) {
    const c = getConcepto(cfg.id);
    const totalBase = c.rows.reduce((s, r) => s + parseNum(r.base), 0);
    const totalRet = c.rows.reduce((s, r) => s + parseNum(r.ret), 0);
    const totalExc = c.excesos.reduce((s, r) => s + parseNum(r.ret), 0);

    const tarifaOpts = cfg.tarifas.map((t, i) =>
        `<option value="${t.v || ''}" ${i === 0 ? 'selected' : ''}>${t.l}</option>`
    ).join('');

    const rowsHtml = c.rows.map((r, i) => `
    <tr>
      <td><input type="text" value="${esc(r.nombre || '')}" oninput="updateRow('${cfg.id}',${i},'nombre',this.value)" placeholder="Nombre/Razón Social" style="min-width:140px"></td>
      <td><input type="text" value="${esc(r.nit || '')}" oninput="updateRow('${cfg.id}',${i},'nit',this.value)" placeholder="NIT/CC" style="min-width:95px"></td>
      <td><select onchange="updateRow('${cfg.id}',${i},'tarifa',this.value);recalcRow('${cfg.id}',${i},'base')" style="min-width:120px">${cfg.tarifas.map(t => `<option value="${t.v || ''}" ${String(r.tarifa) === String(t.v || '') ? 'selected' : ''}>${t.l}</option>`).join('')}</select></td>
      <td><input type="text" class="num" value="${r.base || ''}" oninput="updateRow('${cfg.id}',${i},'base',this.value);recalcRow('${cfg.id}',${i},'base')" placeholder="0" style="min-width:110px"></td>
      <td class="ret-val">
        ${r.tarifa ? `<span id="retspan_${cfg.id}_${i}">$ ${fmt(parseNum(r.ret))}</span><input type="hidden" value="${r.ret || 0}">` :
            `<input type="text" class="num" value="${r.ret || ''}" oninput="updateRow('${cfg.id}',${i},'ret',this.value);recalcRow('${cfg.id}',${i},'ret')" placeholder="0" style="min-width:110px">`}
      </td>
      <td><button class="btn btn-del" onclick="removeRow('${cfg.id}',${i})">✕</button></td>
    </tr>
  `).join('');

    const hasData = totalRet > 0 || totalBase > 0;
    return `
    <div class="card ${hasData ? '' : 'cls'}" id="card_${cfg.id}">
      <div class="card-hd" onclick="toggleCard('${cfg.id}')">
        <h3>
          ${cfg.label}
          ${totalRet > 0 ? `<span class="st">Ret: $ ${fmt(totalRet - totalExc)}</span>` : ''}
          <small style="color:var(--muted);font-size:10.5px;font-weight:400">Rgl. ${cfg.rgl_b} / ${cfg.rgl_r}</small>
        </h3>
        <span class="cv">▾</span>
      </div>
      <div class="card-bd">
        <div class="tbl-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre / Razón Social</th>
                <th>NIT / CC</th>
                <th>Tarifa</th>
                <th>Base Gravable ($)</th>
                <th>Retención ($)</th>
                <th></th>
              </tr>
            </thead>
            <tbody id="tbody_${cfg.id}">${rowsHtml}</tbody>
            ${c.rows.length > 0 ? `
            <tfoot>
              <tr class="sub-row">
                <td colspan="3"><strong>SUBTOTAL</strong></td>
                <td style="text-align:right;font-variant-numeric:tabular-nums" id="sub_base_${cfg.id}">$ ${fmt(totalBase)}</td>
                <td style="text-align:right;font-variant-numeric:tabular-nums" id="sub_ret_${cfg.id}">$ ${fmt(totalRet)}</td>
                <td></td>
              </tr>
            </tfoot>` : ''}
          </table>
        </div>
        <div class="tbl-actions">
          <button class="btn btn-add" onclick="addRow('${cfg.id}','${groupKey}')">+ Agregar beneficiario</button>
        </div>
        ${renderExcesos(cfg, c, totalExc)}
      </div>
    </div>`;
}

function renderExcesos(cfg, c, totalExc) {
    const rowsHtml = c.excesos.map((r, i) => `
    <tr>
      <td><input type="text" value="${esc(r.nombre || '')}" oninput="updateExceso('${cfg.id}',${i},'nombre',this.value)" placeholder="Nombre" style="min-width:140px"></td>
      <td><input type="text" value="${esc(r.nit || '')}" oninput="updateExceso('${cfg.id}',${i},'nit',this.value)" placeholder="NIT/CC" style="min-width:95px"></td>
      <td><input type="text" class="num" value="${r.ret || ''}" oninput="updateExceso('${cfg.id}',${i},'ret',this.value)" placeholder="0" style="min-width:110px"></td>
      <td><button class="btn btn-del" onclick="removeExceso('${cfg.id}',${i})">✕</button></td>
    </tr>`).join('');

    return `
    <div class="exceso-section">
      <h4>♻ Retenciones practicadas en exceso / indebidas / operaciones anuladas</h4>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Nombre</th><th>NIT/CC</th><th>Valor Exceso ($)</th><th></th></tr></thead>
          <tbody>${rowsHtml}</tbody>
          ${c.excesos.length > 0 ? `<tfoot><tr class="sub-row"><td colspan="2"><strong>Total excesos</strong></td><td style="text-align:right">$ ${fmt(totalExc)}</td><td></td></tr></tfoot>` : ''}
        </table>
      </div>
      <button class="btn btn-add" style="margin-top:6px" onclick="addExceso('${cfg.id}','${cfg.rgl_b}_grp')">+ Agregar exceso</button>
    </div>`;
}

function renderGroup(groupKey, containerId) {
    const html = CFG[groupKey].map(c => renderConceptoCard(c, groupKey)).join('');
    document.getElementById(containerId).innerHTML = html;
}

function rerenderCard(conceptId, groupKey) {
    const cfg = [...CFG.pj, ...CFG.auto, ...CFG.pn, ...CFG.iva].find(c => c.id === conceptId);
    if (!cfg) return;
    const card = document.getElementById('card_' + conceptId);
    if (!card) return;
    const was_cls = card.classList.contains('cls');
    card.outerHTML = renderConceptoCard(cfg, groupKey);
    const newCard = document.getElementById('card_' + conceptId);
    if (was_cls) newCard.classList.add('cls');
}

// ═══════════════════════════════════════════
// ROW OPERATIONS
// ═══════════════════════════════════════════
function addRow(cid, grp) {
    const c = getConcepto(cid);
    const cfg = [...CFG.pj, ...CFG.auto, ...CFG.pn, ...CFG.iva].find(x => x.id === cid);
    const defTarifa = cfg.tarifas[0].v;
    c.rows.push({ nombre: '', nit: '', tarifa: defTarifa, base: '', ret: '' });
    rerenderCard(cid, grp);
}

function removeRow(cid, idx) {
    const grp = findGrp(cid);
    getConcepto(cid).rows.splice(idx, 1);
    rerenderCard(cid, grp);
}

function updateRow(cid, idx, field, val) {
    getConcepto(cid).rows[idx][field] = val;
}

function recalcRow(cid, idx, changed) {
    const c = getConcepto(cid);
    const row = c.rows[idx];
    const tarifa = parseFloat(row.tarifa);
    if (isNaN(tarifa) || tarifa === 0) return;

    if (changed === 'base') {
        const base = parseNum(row.base);
        row.ret = Math.round(base * tarifa);
    } else {
        const ret = parseNum(row.ret);
        row.base = Math.round(ret / tarifa);
    }

    // ACTUALIZACIÓN QUIRÚRGICA: Actualizar solo el span de retención de la fila
    const retSpan = document.getElementById(`retspan_${cid}_${idx}`);
    if (retSpan) {
        retSpan.textContent = `$ ${fmt(parseNum(row.ret))}`;
    }

    // Actualizar Subtotales de la tabla sin re-renderizar
    const totalBase = c.rows.reduce((s, r) => s + parseNum(r.base), 0);
    const totalRet = c.rows.reduce((s, r) => s + parseNum(r.ret), 0);
    
    const subBaseEl = document.getElementById(`sub_base_${cid}`);
    const subRetEl = document.getElementById(`sub_ret_${cid}`);
    if (subBaseEl) subBaseEl.textContent = `$ ${fmt(totalBase)}`;
    if (subRetEl) subRetEl.textContent = `$ ${fmt(totalRet)}`;

    // Actualizar el indicador de la cabecera (ST)
    const totalExc = c.excesos.reduce((s, r) => s + parseNum(r.ret), 0);
    const card = document.getElementById('card_' + cid);
    if (card) {
        const st = card.querySelector('.st');
        if (st) {
            st.textContent = `Ret: $ ${fmt(totalRet - totalExc)}`;
        }
    }
}

function addExceso(cid) {
    const c = getConcepto(cid);
    const grp = findGrp(cid);
    c.excesos.push({ nombre: '', nit: '', ret: '' });
    rerenderCard(cid, grp);
}

function removeExceso(cid, idx) {
    const grp = findGrp(cid);
    getConcepto(cid).excesos.splice(idx, 1);
    rerenderCard(cid, grp);
}

function updateExceso(cid, idx, field, val) {
    const c = getConcepto(cid);
    c.excesos[idx][field] = val;
    
    if (field === 'ret') {
        const totalBase = c.rows.reduce((s, r) => s + parseNum(r.base), 0);
        const totalRet = c.rows.reduce((s, r) => s + parseNum(r.ret), 0);
        const totalExc = c.excesos.reduce((s, r) => s + parseNum(r.ret), 0);

        const card = document.getElementById('card_' + cid);
        if (card) {
            const st = card.querySelector('.st');
            if (st) st.textContent = `Ret: $ ${fmt(totalRet - totalExc)}`;
        }
    }
}

function toggleCard(cid) {
    document.getElementById('card_' + cid).classList.toggle('cls');
}

function findGrp(cid) {
    for (const g of ['pj', 'auto', 'pn', 'iva']) {
        if (CFG[g].find(c => c.id === cid)) return g;
    }
    return 'pj';
}

// ═══════════════════════════════════════════
// CALCULAR TOTALES
// ═══════════════════════════════════════════
function getTotales(cid) {
    const c = getConcepto(cid);
    const base = c.rows.reduce((s, r) => s + parseNum(r.base), 0);
    const ret = c.rows.reduce((s, r) => s + parseNum(r.ret), 0);
    const exc = c.excesos.reduce((s, r) => s + parseNum(r.ret), 0);
    return { base, ret, exc, retNeta: Math.max(0, ret - exc) };
}

function getGroupTotales(grp) {
    const base = CFG[grp].reduce((s, c) => s + getTotales(c.id).base, 0);
    const ret = CFG[grp].reduce((s, c) => s + getTotales(c.id).ret, 0);
    const exc = CFG[grp].reduce((s, c) => s + getTotales(c.id).exc, 0);
    return { base, ret, exc, retNeta: Math.max(0, ret - exc) };
}

// ═══════════════════════════════════════════
// EXCESO GENERAL RENTA (renglón 129)
// ═══════════════════════════════════════════
function renderExcesoGeneral() {
    const c = state.exceso_renta;
    const totalExc = c.rows.reduce((s, r) => s + parseNum(r.ret), 0);
    const rowsHtml = c.rows.map((r, i) => `
    <tr>
      <td><input type="text" value="${esc(r.nombre || '')}" oninput="state.exceso_renta.rows[${i}].nombre=this.value" placeholder="Nombre"></td>
      <td><input type="text" value="${esc(r.nit || '')}" oninput="state.exceso_renta.rows[${i}].nit=this.value" placeholder="NIT/CC"></td>
      <td><input type="number" class="num" value="${r.ret || ''}" oninput="state.exceso_renta.rows[${i}].ret=this.value;renderExcesoSection()" placeholder="0"></td>
      <td><button class="btn btn-del" onclick="state.exceso_renta.rows.splice(${i}, 1);renderExcesoSection()">✕</button></td>
    </tr>`).join('');
    const el = document.getElementById('excesoRentaSection');
    if (el) el.innerHTML = `
    <table><thead><tr><th>Nombre</th><th>NIT/CC</th><th>Valor ($)</th><th></th></tr></thead>
    <tbody>${rowsHtml}</tbody>
    ${c.rows.length ? `<tfoot><tr class="sub-row"><td colspan="2"><strong>Total renglón 129</strong></td><td style="text-align:right">$ ${fmt(totalExc)}</td><td></td></tr></tfoot>` : ''}</table>
    <button class="btn btn-add" style="margin-top:6px" onclick="state.exceso_renta.rows.push({nombre:'',nit:'',ret:''});renderExcesoSection()">+ Agregar exceso</button>`;
}

function renderExcesoSection() { renderExcesoGeneral(); }

// ═══════════════════════════════════════════
// RESUMEN F350
// ═══════════════════════════════════════════
function renderResumen() {
    const per = document.getElementById('enc_periodo').value;
    const anio = document.getElementById('enc_anio').value;

    let rows = '';
    const mkRow = (rgl_b, rgl_r, label, cid, cls = '') => {
        const t = getTotales(cid);
        const base = t.base; const ret = t.ret - t.exc;
        return `<tr class="${cls}">
      <td class="rgl">${rgl_b}</td>
      <td class="concepto">${label}</td>
      <td class="val ${base ? 'nz' : 'z'}">$ ${fmt(base)}</td>
      <td class="rgl">${rgl_r}</td>
      <td class="val ${ret ? 'nz' : 'z'}">$ ${fmt(Math.max(0, ret))}</td>
    </tr>`;
    };

    const mkSec = (label) => `<tr class="sec-hd"><td colspan="5">${label}</td></tr>`;
    const mkTotal = (label, rgl, val) => `<tr class="total-row">
    <td class="rgl">${rgl}</td>
    <td class="concepto">${label}</td>
    <td></td>
    <td></td>
    <td class="val">${fmt(val)}</td>
  </tr>`;

    // PJ
    rows += mkSec('RETENCIONES A PERSONAS JURÍDICAS');
    CFG.pj.forEach(c => { rows += mkRow(c.rgl_b, c.rgl_r, c.label, c.id); });
    const totPJ = getGroupTotales('pj');
    rows += mkTotal('Total retenciones renta PJ', '—', totPJ.retNeta);

    // Autorretenciones
    rows += mkSec('AUTORRETENCIONES (Art. 114-1 E.T.)');
    CFG.auto.forEach(c => { rows += mkRow(c.rgl_b, c.rgl_r, c.label, c.id); });
    const totAuto = getGroupTotales('auto');
    rows += mkTotal('Total autorretenciones', '—', totAuto.retNeta);

    // PN
    rows += mkSec('RETENCIONES A PERSONAS NATURALES');
    CFG.pn.forEach(c => { rows += mkRow(c.rgl_b, c.rgl_r, c.label, c.id); });
    const totPN = getGroupTotales('pn');
    rows += mkTotal('Total retenciones renta PN', '—', totPN.retNeta);

    // Exceso general renta (rgl 129)
    const excRenta = state.exceso_renta.rows.reduce((s, r) => s + parseNum(r.ret), 0);
    rows += `<tr><td class="rgl">129</td><td class="concepto">Menos retenciones en exceso / indebidas / operaciones anuladas</td><td></td><td></td><td class="val ${excRenta ? 'nz' : 'z'}">$ ${fmt(excRenta)}</td></tr>`;

    // Total renta
    const totalRenta = Math.max(0, totPJ.retNeta + totAuto.retNeta + totPN.retNeta - excRenta);
    rows += `<tr class="total-row"><td class="rgl">130</td><td class="concepto"><strong>TOTAL RETENCIONES RENTA Y COMPLEMENTARIOS</strong></td><td></td><td></td><td class="val">$ ${fmt(totalRenta)}</td></tr>`;

    // IVA y Timbre
    rows += mkSec('RETENCIONES IVA Y TIMBRE');
    const iva_res = getTotales('iva_responsables');
    const iva_nr = getTotales('iva_no_residentes');
    const timbre = getTotales('timbre');
    rows += `<tr><td class="rgl">131</td><td class="concepto">Ret. IVA a responsables</td><td></td><td class="rgl">131</td><td class="val ${iva_res.retNeta ? 'nz' : 'z'}">$ ${fmt(iva_res.retNeta)}</td></tr>`;
    rows += `<tr><td class="rgl">132</td><td class="concepto">Ret. IVA servicios no residentes</td><td></td><td class="rgl">132</td><td class="val ${iva_nr.retNeta ? 'nz' : 'z'}">$ ${fmt(iva_nr.retNeta)}</td></tr>`;
    const totIVA = Math.max(0, iva_res.retNeta + iva_nr.retNeta);
    rows += `<tr class="total-row"><td class="rgl">134</td><td class="concepto"><strong>TOTAL RETENCIONES IVA</strong></td><td></td><td></td><td class="val">$ ${fmt(totIVA)}</td></tr>`;
    rows += `<tr><td class="rgl">135</td><td class="concepto">Ret. impuesto de timbre nacional</td><td></td><td class="rgl">135</td><td class="val ${timbre.retNeta ? 'nz' : 'z'}">$ ${fmt(timbre.retNeta)}</td></tr>`;

    // Gran Total
    const totalAbsoluto = totalRenta + totIVA + timbre.retNeta;
    rows += mkTotal('TOTAL RETENCIONES (Rgl 136)', '136', totalAbsoluto);
    rows += `<tr class="total-row"><td class="rgl">137</td><td class="concepto">Sanciones</td><td></td><td></td><td class="val">$ 0</td></tr>`;
    rows += `<tr class="total-row" style="font-size:15px;border-top:2px solid var(--gold)">
    <td class="rgl">138</td><td class="concepto"><strong style="color:var(--gold2)">TOTAL RETENCIONES + SANCIONES · PAGO TOTAL</strong></td>
    <td></td><td></td><td class="val" style="color:var(--gold2);font-size:16px">$ ${fmt(totalAbsoluto)}</td>
  </tr>`;

    document.getElementById('f350summary').innerHTML = `
    <div class="info-bar">📄 Período: <strong>${MESES[per]} ${anio}</strong> · NIT: <strong>${document.getElementById('enc_nit').value}-${document.getElementById('enc_dv').value}</strong> · ${document.getElementById('enc_rs').value}</div>
    <div style="overflow-x:auto">
      <table class="f350-tbl">
        <thead><tr><th>Rgl.</th><th>Concepto</th><th>Base Gravable</th><th>Rgl.</th><th>Retención</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
}

function renderExportPreview() {
    renderResumen();
    document.getElementById('expPreview').innerHTML = document.getElementById('f350summary').innerHTML;
}

// ═══════════════════════════════════════════
// EXPORT EXCEL
// ═══════════════════════════════════════════
function exportF350Excel() {
    const per = document.getElementById('enc_periodo').value;
    const anio = document.getElementById('enc_anio').value;
    const nit = document.getElementById('enc_nit').value;
    const rs = document.getElementById('enc_rs').value;

    const wb = XLSX.utils.book_new();

    // Hoja 1: Resumen F350
    const resData = [
        [`FORMULARIO 350 - RETENCIÓN EN LA FUENTE`],
        [`${rs} - NIT: ${nit}-${document.getElementById('enc_dv').value}`],
        [`Período: ${MESES[per]} ${anio}`], [],
        ['Renglón', 'Concepto', 'Base Gravable', 'Renglón Ret.', 'Retención'],
    ];

    const addExcelRow = (rgl_b, rgl_r, label, cid) => {
        const t = getTotales(cid);
        resData.push([rgl_b, label, t.base, rgl_r, Math.max(0, t.ret - t.exc)]);
    };

    resData.push(['', '--- RETENCIONES PERSONAS JURÍDICAS ---', '', '', '']);
    CFG.pj.forEach(c => addExcelRow(c.rgl_b, c.rgl_r, c.label, c.id));
    const totPJ = getGroupTotales('pj');
    resData.push(['', 'Total Retenciones Renta PJ', '', '', totPJ.retNeta]);

    resData.push(['', '--- AUTORRETENCIONES Art. 114-1 ---', '', '', '']);
    CFG.auto.forEach(c => addExcelRow(c.rgl_b, c.rgl_r, c.label, c.id));
    const totAuto = getGroupTotales('auto');
    resData.push(['', 'Total Autorretenciones', '', '', totAuto.retNeta]);

    resData.push(['', '--- RETENCIONES PERSONAS NATURALES ---', '', '', '']);
    CFG.pn.forEach(c => addExcelRow(c.rgl_b, c.rgl_r, c.label, c.id));
    const totPN = getGroupTotales('pn');
    resData.push(['', 'Total Retenciones Renta PN', '', '', totPN.retNeta]);

    const excRenta = state.exceso_renta.rows.reduce((s, r) => s + parseNum(r.ret), 0);
    resData.push([129, 'Menos retenciones en exceso/indebidas/anuladas', '', '', excRenta]);

    const totalRenta = Math.max(0, totPJ.retNeta + totAuto.retNeta + totPN.retNeta - excRenta);
    resData.push([130, 'TOTAL RETENCIONES RENTA Y COMPLEMENTARIOS', '', '', totalRenta]);

    resData.push(['', '--- RETENCIONES IVA Y TIMBRE ---', '', '', '']);
    resData.push([131, 'Ret. IVA a responsables', '', '131', getTotales('iva_responsables').retNeta]);
    resData.push([132, 'Ret. IVA servicios no residentes', '', '132', getTotales('iva_no_residentes').retNeta]);
    const totIVA = Math.max(0, getTotales('iva_responsables').retNeta + getTotales('iva_no_residentes').retNeta);
    resData.push([134, 'TOTAL RETENCIONES IVA', '', '', totIVA]);
    resData.push([135, 'Ret. timbre nacional', '', '135', getTotales('timbre').retNeta]);

    const totalAbs = totalRenta + totIVA + getTotales('timbre').retNeta;
    resData.push([136, 'TOTAL RETENCIONES', '', '', totalAbs]);
    resData.push([137, 'Sanciones', '', '', 0]);
    resData.push([138, 'TOTAL RETENCIONES + SANCIONES = PAGO TOTAL', '', '', totalAbs]);

    const ws1 = XLSX.utils.aoa_to_sheet(resData);
    ws1['!cols'] = [{ wch: 10 }, { wch: 55 }, { wch: 18 }, { wch: 12 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumen F350');

    // Hoja 2: Detalle PJ
    const detPJ = [['Concepto', 'Renglón Base', 'Renglón Ret.', 'Nombre Beneficiario', 'NIT/CC', 'Tarifa', 'Base Gravable', 'Retención Practicada', 'Exceso/Anulación']];
    CFG.pj.forEach(cfg => {
        const c = getConcepto(cfg.id);
        c.rows.forEach(r => {
            detPJ.push([cfg.label, cfg.rgl_b, cfg.rgl_r, r.nombre, r.nit, r.tarifa ? (parseFloat(r.tarifa) * 100).toFixed(1) + '%' : 'manual', parseNum(r.base), parseNum(r.ret), 0]);
        });
        c.excesos.forEach(r => {
            detPJ.push([cfg.label + ' (EXCESO)', cfg.rgl_b, cfg.rgl_r, r.nombre, r.nit, '', 0, 0, parseNum(r.ret)]);
        });
    });
    const ws2 = XLSX.utils.aoa_to_sheet(detPJ);
    ws2['!cols'] = [{ wch: 35 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws2, 'Detalle PJ');

    // Hoja 3: Detalle PN
    const detPN = [['Concepto', 'Renglón Base', 'Renglón Ret.', 'Nombre Beneficiario', 'CC/NIT', 'Tarifa', 'Base Gravable', 'Retención Practicada']];
    CFG.pn.forEach(cfg => {
        const c = getConcepto(cfg.id);
        c.rows.forEach(r => {
            detPN.push([cfg.label, cfg.rgl_b, cfg.rgl_r, r.nombre, r.nit, r.tarifa ? (parseFloat(r.tarifa) * 100).toFixed(1) + '%' : 'manual', parseNum(r.base), parseNum(r.ret)]);
        });
    });
    const ws3 = XLSX.utils.aoa_to_sheet(detPN);
    ws3['!cols'] = [{ wch: 40 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 15 }, { wch: 10 }, { wch: 16 }, { wch: 18 }];
    XLSX.utils.book_append_sheet(wb, ws3, 'Detalle PN');

    // Hoja 4: Autorretenciones
    const detAuto = [['Concepto', 'Renglón Base', 'Renglón Ret.', 'Tarifa', 'Base Gravable', 'Autorretención']];
    CFG.auto.forEach(cfg => {
        const c = getConcepto(cfg.id);
        c.rows.forEach(r => {
            detAuto.push([cfg.label, cfg.rgl_b, cfg.rgl_r, r.tarifa ? (parseFloat(r.tarifa) * 100).toFixed(1) + '%' : 'manual', parseNum(r.base), parseNum(r.ret)]);
        });
    });
    const ws4 = XLSX.utils.aoa_to_sheet(detAuto);
    XLSX.utils.book_append_sheet(wb, ws4, 'Autorretenciones');

    const fname = `F350_DIMALCCO_${anio}_P${per}_${Date.now()}.xlsx`;
    XLSX.writeFile(wb, fname);
}

function exportDetalle() {
    const per = document.getElementById('enc_periodo').value;
    const anio = document.getElementById('enc_anio').value;
    exportF350Excel();
}

// ═══════════════════════════════════════════
// ACCIONES GLOBALES
// ═══════════════════════════════════════════
function resetMonth() {
    if (confirm('¿Estás seguro de que deseas eliminar TODOS los datos del periodo actual? Esta acción borrará registros de PJ, PN, Auto e IVA.')) {
        state = {};
        ['pj', 'auto', 'pn', 'iva'].forEach(grp => {
            CFG[grp].forEach(c => { state[c.id] = { rows: [], excesos: [] }; });
        });
        state.exceso_renta = { rows: [] };
        saveState();
        location.reload();
    }
}

// ═══════════════════════════════════════════
let tempImportData = [];
function closeImport() { document.getElementById('modalImportPreview').style.display = 'none'; }

document.getElementById('excelFile').onchange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = new Uint8Array(evt.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            let allData = [];
            for (const sheetName of workbook.SheetNames) {
                const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
                if (jsonData && jsonData.length > 0) { allData = jsonData; break; }
            }
            if (allData.length === 0) throw new Error('No se encontraron datos.');
            processExcelImport(allData);
        } catch (err) { alert(`Error: ${err.message}`); }
        e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
};

function processExcelImport(data) {
    tempImportData = [];
    const allC = [...CFG.pj, ...CFG.auto, ...CFG.pn, ...CFG.iva];
    
    data.forEach(row => {
        // Normalizar nombres de columnas a minúsculas y sin espacios raros
        const norm = {};
        Object.keys(row).forEach(k => {
            let key = k.toLowerCase().trim()
                .replace(/[\/]/g, '_')   // Categoria / Renglón -> Categoria _ Renglón
                .replace(/\s+/g, '_');   // Espacios a underscores
            norm[key] = row[k];
        });
        
        const nombre = String(norm['proveedor'] || norm['nombre'] || norm['tercero'] || '');
        const nit = String(norm['nit'] || norm['identificacion'] || norm['cedula'] || '');
        const base = parseNum(norm['base'] || norm['monto'] || 0);
        const retManual = parseNum(norm['retencion'] || norm['valor_retencion'] || 0);
        const tarifaExcel = parseNum(String(norm['tarifa'] || '').replace('%','')) / 100;
        const categoriaTxt = String(norm['categoria___renglón_f350'] || norm['categoria'] || '').toLowerCase();

        if (base > 0 && (nombre || nit)) {
            // Lógica de detección automática de Categoría F350 basada en el texto del Excel
            let suggestedId = '';
            
            // Intentar match con los labels de la configuración
            const found = allC.find(c => categoriaTxt.includes(c.label.toLowerCase()) || categoriaTxt.includes(c.id.toLowerCase()));
            
            if (found) {
                suggestedId = found.id;
            } else {
                // Heurística si no hay match directo
                const isPJ = nit.length > 10 || nit.startsWith('8') || nit.startsWith('9');
                if (categoriaTxt.includes('honorario')) suggestedId = isPJ ? 'honorarios_pj' : 'honorarios_pn';
                else if (categoriaTxt.includes('servicio')) suggestedId = isPJ ? 'servicios_pj' : 'servicios_pn';
                else if (categoriaTxt.includes('compra')) suggestedId = isPJ ? 'compras_pj' : 'compras_pn';
                else if (categoriaTxt.includes('auto')) suggestedId = 'auto_ventas';
                else suggestedId = isPJ ? 'compras_pj' : 'compras_pn'; // Default
            }

            tempImportData.push({ 
                nombre, 
                nit, 
                base, 
                retManual, 
                tarifaExcel, 
                suggestedId 
            });
        }
    });

    if (tempImportData.length > 0) {
        renderImportPreview();
        document.getElementById('modalImportPreview').style.display = 'flex';
    } else {
        alert('No se detectaron datos válidos. El archivo debe tener columnas como: PROVEEDOR, NIT, BASE.');
    }
}

function renderImportPreview() {
    const container = document.getElementById('importPreviewBody');
    const allC = [...CFG.pj, ...CFG.auto, ...CFG.pn, ...CFG.iva];
    
    // Crear mapa de renglones para búsqueda rápida
    const rglMap = {};
    allC.forEach(c => { rglMap[c.rgl_b] = c.id; rglMap[c.rgl_r] = c.id; });

    container.innerHTML = tempImportData.map((item, i) => {
        const currentCfg = allC.find(x => x.id === item.suggestedId) || allC[0];
        return `
        <tr>
            <td><input type="text" value="${esc(item.nombre)}" oninput="tempImportData[${i}].nombre=this.value"></td>
            <td><input type="text" value="${esc(item.nit)}" oninput="tempImportData[${i}].nit=this.value"></td>
            <td class="val">Base: $ ${fmt(item.base)}<br><small style="color:var(--gold)">Ret: $ ${fmt(item.retManual)}</small></td>
            <td>
                <div style="display:flex; gap:5px;">
                    <input type="text" placeholder="Rgl" value="${currentCfg.rgl_b}" 
                        style="width:40px; text-align:center; padding:2px;"
                        oninput="updateByRgl(${i}, this.value)">
                    <select id="sel_imp_${i}" onchange="tempImportData[${i}].suggestedId=this.value" style="font-size:11px; flex:1">
                        ${allC.map(c => `<option value="${c.id}" ${c.id === item.suggestedId ? 'selected' : ''}>${c.label} (Rgl ${c.rgl_b})</option>`).join('')}
                    </select>
                </div>
            </td>
            <td style="text-align:center"><input type="checkbox" checked id="chk_imp_${i}"></td>
        </tr>`;
    }).join('');
}

function updateByRgl(idx, val) {
    const allC = [...CFG.pj, ...CFG.auto, ...CFG.pn, ...CFG.iva];
    const found = allC.find(c => String(c.rgl_b) === String(val) || String(c.rgl_r) === String(val));
    if (found) {
        tempImportData[idx].suggestedId = found.id;
        const select = document.getElementById(`sel_imp_${idx}`);
        if (select) select.value = found.id;
    }
}

document.getElementById('confirmBulkImport').onclick = () => {
    let added = 0;
    tempImportData.forEach((item, i) => {
        if (document.getElementById(`chk_imp_${i}`).checked) {
            const conceptId = item.suggestedId;
            const c = getConcepto(conceptId);
            const cfg = [...CFG.pj, ...CFG.auto, ...CFG.pn, ...CFG.iva].find(x => x.id === conceptId);
            
            // Usar retención del Excel si existe, sino calcular
            let ret = item.retManual > 0 ? item.retManual : Math.round(item.base * (item.tarifaExcel || cfg.tarifas[0].v || 0));

            c.rows.push({
                nombre: item.nombre,
                nit: item.nit,
                tarifa: item.tarifaExcel || cfg.tarifas[0].v || '',
                base: item.base,
                ret: ret
            });
            added++;
        }
    });

    if (added > 0) {
        saveState();
        renderGroup('pj', 'pjCards');
        renderGroup('auto', 'autoCards');
        renderGroup('pn', 'pnCards');
        renderGroup('iva', 'ivaCards');
        closeImport();
        alert(`Se importaron ${added} registros exitosamente.`);
    }
};

// ═══════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════
function parseNum(v) { const n = parseFloat(String(v).replace(/[^0-9.-]/g, '')); return isNaN(n) ? 0 : n; }
function fmt(n) { return Math.round(n).toLocaleString('es-CO'); }
function esc(s) { return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;'); }

// ═══════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    initState();
    updateEnc();
    renderGroup('pj', 'pjCards');
    renderGroup('auto', 'autoCards');
    renderGroup('pn', 'pnCards');
    renderGroup('iva', 'ivaCards');
    setInterval(saveState, 60000);
});
