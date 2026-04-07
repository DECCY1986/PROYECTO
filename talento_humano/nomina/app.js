/**
 * app.js — Lógica principal de la UI de Nómina Quincenal
 */

// ── Estado global ─────────────────────────────────────────────────────────────
let state = {
  periodo: {
    anio: new Date().getFullYear(),
    mes: new Date().getMonth() + 1,
    quincena: new Date().getDate() <= 15 ? '1' : '2',
  },
  empleados: [],          // { id, nombre, cedula, cargo, salarioMensual, novedades[] }
  empleadoSelId: null,   // id del empleado activo en el panel
};

let editandoEmpleadoId = null; // para edición
let editandoNovedadIdx = null; // para edición de novedad

// ── Persistencia ─────────────────────────────────────────────────────────────
const LS_EMPLEADOS = 'dimalcco_emp_v2';
const LS_NOVEDADES = 'dimalcco_nov_v2';
const LS_HISTORY = 'dimalcco_history_nomina';
const LS_KEY = 'nomina_state_v1'; // para estado local (filtros, periodo actual)

function guardarState() {
  localStorage.setItem(LS_KEY, JSON.stringify({ periodo: state.periodo, empleadoSelId: state.empleadoSelId }));
}

function cargarState() {
  // 1. Cargar estado local (periodo seleccionado)
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state.periodo = parsed.periodo || state.periodo;
      state.empleadoSelId = parsed.empleadoSelId || null;
    }
  } catch { /* ... */ }

  // 2. Cargar empleados desde el almacén unificado
  const rawEmp = localStorage.getItem(LS_EMPLEADOS);
  const emps = rawEmp ? JSON.parse(rawEmp) : [];

  // 3. Cargar novedades desde el almacén unificado
  const rawNov = localStorage.getItem(LS_NOVEDADES);
  const novs = rawNov ? JSON.parse(rawNov) : [];

  // 4. Mapear empleados al formato que espera Nómina, inyectando sus novedades del período
  state.empleados = emps.map(e => {
    // Filtrar novedades para este empleado y este mes
    const mesStr = String(state.periodo.mes).padStart(2, '0');
    const anioStr = String(state.periodo.anio);
    const prefix = `${anioStr}-${mesStr}`;
    const quincena = state.periodo.quincena;

    const novedadesEmp = novs.filter(n => n.cedula === e.cedula && n.fechaInicio.startsWith(prefix));

    // --- INTEGRACIÓN CON CONTROL DE HORARIOS ---
    const rawShifts = localStorage.getItem('shiftRecords');
    const shifts = rawShifts ? JSON.parse(rawShifts) : [];
    const shiftNovs = [];

  // --- Tarifas FIJAS (Solicitado por el usuario) ---
  const FIXED_QUINCENA = {
    "JULIO RODRIGUEZ": 1080000,
    "HENRY GONZALES": 1200000,
    "JUAN CARLOS MARTINEZ": 1230000,
    "PAOLA CANTOR": 1100000,
    "NEIDER CAMILO": 1100000
  };

  const getWorkerSalary = (name) => {
    const n = (name || "").trim().toUpperCase();
    if (FIXED_QUINCENA[n]) return FIXED_QUINCENA[n] * 2; // Retornar mensual
    return 1750905; // SMMLV fallback
  };

  // Filtrar turnos del empleado en la quincena actual
  const shiftRecords = shifts.filter(s => {
      const sName = (s.workerName || "").trim().toUpperCase();
      const eName = (e.nombre || "").trim().toUpperCase();
      if (sName !== eName) return false;
      if (!s.date.startsWith(prefix)) return false;
      const dia = parseInt(s.date.split('-')[2]);
      if (quincena === '1') return dia <= 15;
      return dia > 15;
    });

    if (shiftRecords.length > 0) {
      const fixedSal = getWorkerSalary(e.nombre);
      // Agregamos una función helper para obtener los detalles de pago (duplicada aquí para desacoplamiento)
      const getShiftDetails = (rec, sal) => {
        const vDia = (sal / 2) / 15;
        const vHora = vDia / 8;
       // Recargos sobre valor hora base (Ajustados según preferencia de usuario 15%/50%/50%/75%)
    const RECARGOS = {
        hora_extra_diurna: 0.15,   // +15%
        hora_extra_nocturna: 0.50,   // +50%
        hora_extra_festiva: 0.50,   // +50% (Sincronizado con 1.5x de ControlHoras)
        recargo_nocturno: 0.30,   // +30% (Sincronizado con $2.750 de ControlHoras)
        recargo_festivo: 0.50,   // +50%
    };
        const rates = {
          dia: vDia,
          hour: vHora,
          extDia: vHora * (1 + RECARGOS.hora_extra_diurna),
          rNoct: vHora * RECARGOS.recargo_nocturno,
          extNoct: vHora * (1 + RECARGOS.hora_extra_nocturna),
          rDom: vHora * RECARGOS.recargo_festivo,
          extDom: vHora * (1 + RECARGOS.hora_extra_festiva)
        };
        return rates;
      };

      const novedadesAuto = shiftRecords.map(rec => {
        const details = getShiftDetails(rec, fixedSal);
        const totalHours = parseFloat(rec.totalHours) || 0;
        const ordHours = parseFloat(rec.ordinaryHours) || 0;
        const travelHours = parseFloat(rec.travelHours) || 0;
        const isTravel = rec.isTravelRecord === true;
        const date = new Date(rec.date + 'T00:00:00');
        const isSunday = (date.getDay() === 0);

        let missingQty = 0;
        let extDiaQty = 0, recNoctQty = 0, extNoctQty = 0, recDomQty = 0, extDomQty = 0;

        if (isTravel) {
            return { missingQty: 0, extDiaQty: 0, recNoctQty: 0, extNoctQty: 0, recDomQty: 0, extDomQty: 0, travelQty: travelHours };
        }

        if (!rec.timeIn) {
            // Falta injustificada completa
            return { missingQty: ordHours, extDiaQty: 0, recNoctQty: 0, extNoctQty: 0, recDomQty: 0, extDomQty: 0, travelQty: 0 };
        }

        const [hIn, mIn] = rec.timeIn.split(':').map(Number);
        let currentTime = hIn * 60 + mIn;
        let hourCount = 0;

        while (hourCount < totalHours) {
            const currentHour = (Math.floor(currentTime / 60)) % 24;
            const isNight = (currentHour >= 21 || currentHour < 5);
            const isExtra = (hourCount >= ordHours);

            if (isSunday) {
                if (isExtra) extDomQty++;
                else recDomQty++;
            } else {
                if (isExtra) {
                    if (isNight) extNoctQty++;
                    else extDiaQty++;
                } else if (isNight) recNoctQty++;
            }
            currentTime += 60;
            hourCount++;
        }

        // Horas faltantes (si trabajó menos de las ordinarias)
        if (totalHours < ordHours) {
            missingQty = ordHours - totalHours;
        }

        return { missingQty, extDiaQty, recNoctQty, extNoctQty, recDomQty, extDomQty, travelQty: 0 };
      });

      let totals = { missing: 0, extDia: 0, recNoct: 0, extNoct: 0, recDom: 0, extDom: 0, travel: 0 };
      novedadesAuto.forEach(res => {
        totals.missing += (res.missingQty || 0);
        totals.extDia += (res.extDiaQty || 0);
        totals.recNoct += (res.recNoctQty || 0);
        totals.extNoct += (res.extNoctQty || 0);
        totals.recDom += (res.recDomQty || 0);
        totals.extDom += (res.extDomQty || 0);
        totals.travel += (res.travelQty || 0);
      });

      if (totals.missing > 0) shiftNovs.push({ tipo: 'hora_no_laborada', valor: totals.missing, auto: true });
      if (totals.travel > 0) shiftNovs.push({ tipo: 'hora_viaje', valor: totals.travel, auto: true });
      if (totals.extDia > 0) shiftNovs.push({ tipo: 'hora_extra_diurna', valor: totals.extDia, auto: true });
      if (totals.recNoct > 0) shiftNovs.push({ tipo: 'recargo_nocturno', valor: totals.recNoct, auto: true });
      if (totals.extNoct > 0) shiftNovs.push({ tipo: 'hora_extra_nocturna', valor: totals.extNoct, auto: true });
      if (totals.recDom > 0) shiftNovs.push({ tipo: 'recargo_festivo', valor: totals.recDom, auto: true });
      if (totals.extDom > 0) shiftNovs.push({ tipo: 'hora_extra_festiva', valor: totals.extDom, auto: true });
    }

    return {
      id: e.cedula,
      nombre: e.nombre,
      cedula: e.cedula,
      cargo: e.cargo,
      salarioMensual: parseAmount(e.salario),
      nivelARL: e.arl || 'I',
      fechaIngreso: e.fechaIngreso || null,
      novedades: [
        ...novedadesEmp.map(n => ({
          tipo: n.tipo === 'Horas Extra' ? n.subtipo : (NOMINA.TIPOS_NOVEDAD.find(tn => tn.label === n.tipo)?.value || n.tipo),
          valor: n.valor || n.dias,
          original: n
        })),
        ...shiftNovs
      ]
    };
  });

  if (state.empleados.length > 0 && !state.empleados.find(e => e.id === state.empleadoSelId)) {
    state.empleadoSelId = state.empleados[0].id;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const parseAmount = (val) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  return parseFloat(val.toString().replace(/\./g, '').replace(/,/g, '.')) || 0;
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

const $ = id => document.getElementById(id);

// ── Render Período ────────────────────────────────────────────────────────────
function renderPeriodo() {
  $('sel-anio').value = state.periodo.anio;
  $('sel-mes').value = state.periodo.mes;
  $('sel-quincena').value = state.periodo.quincena;
  actualizarTituloPeriodo();
}

function actualizarTituloPeriodo() {
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mes = meses[Number(state.periodo.mes) - 1];
  const q = state.periodo.quincena === '1' ? '1ª Quincena (1–15)' : '2ª Quincena (16–30)';
  $('titulo-periodo').textContent = `${q} · ${mes} ${state.periodo.anio}`;
}

// ── Render Lista de Empleados ─────────────────────────────────────────────────
function renderEmpleados() {
  const lista = $('lista-empleados');
  lista.innerHTML = '';

  if (state.empleados.length === 0) {
    lista.innerHTML = `<div class="empty-hint">Sin empleados.<br>Agrega el primero →</div>`;
    return;
  }

  state.empleados.forEach(emp => {
    const liq = NOMINA.liquidar(emp);
    const activo = emp.id === state.empleadoSelId ? 'activo' : '';
    const row = document.createElement('div');
    row.className = `empleado-item ${activo}`;
    row.innerHTML = `
      <div class="emp-info" data-id="${emp.id}">
        <span class="emp-nombre">${emp.nombre}</span>
        <span class="emp-cargo">${emp.cargo}</span>
        <span class="emp-neto">$${NOMINA.fmt(liq.neto)}</span>
      </div>
      <div class="emp-actions">
        <button class="btn-icon btn-editar-emp" data-id="${emp.id}" title="Editar empleado">✏️</button>
        <button class="btn-icon btn-eliminar-emp" data-id="${emp.id}" title="Eliminar empleado">🗑️</button>
      </div>
    `;
    lista.appendChild(row);
  });

  // Eventos
  lista.querySelectorAll('.emp-info').forEach(el => {
    el.addEventListener('click', () => seleccionarEmpleado(el.dataset.id));
  });
  lista.querySelectorAll('.btn-editar-emp').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); abrirModalEmpleado(btn.dataset.id); });
  });
  lista.querySelectorAll('.btn-eliminar-emp').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); eliminarEmpleado(btn.dataset.id); });
  });
}

// ── Selección de Empleado ─────────────────────────────────────────────────────
function seleccionarEmpleado(id) {
  state.empleadoSelId = id;
  renderEmpleados();
  renderPanelNovedades();
}

// ── Panel de Novedades ────────────────────────────────────────────────────────
function renderPanelNovedades() {
  const panel = $('panel-novedades');
  const emp = state.empleados.find(e => e.id === state.empleadoSelId);

  if (!emp) {
    panel.innerHTML = `<div class="panel-vacio">
      <div class="panel-vacio-icon">👆</div>
      <p>Selecciona un empleado para ver y registrar sus novedades.</p>
    </div>`;
    $('panel-resumen').innerHTML = '';
    return;
  }

  const liq = NOMINA.liquidar(emp);

  // Encabezado del panel
  panel.innerHTML = `
    <div class="panel-header">
      <div>
        <h2 class="panel-nombre">${emp.nombre}</h2>
        <p class="panel-sub">${emp.cargo} · CC ${emp.cedula} · Salario $${NOMINA.fmt(emp.salarioMensual)}/mes${emp.fechaIngreso ? ` · 📅 Ingreso: ${emp.fechaIngreso}` : ''}</p>
      </div>
      <div style="display: flex; gap: 0.5rem;">
        <button class="btn btn-outline" id="btn-export-individual" title="Descargar comprobante individual">📥 Recibo</button>
        <button class="btn btn-primary" id="btn-add-novedad">+ Novedad</button>
      </div>
    </div>

    <div class="novedades-tabla-wrap">
      <table class="novedades-tabla" id="tabla-novedades">
        <thead>
          <tr>
            <th>Descripción</th>
            <th>Tipo</th>
            <th class="num">Adición</th>
            <th class="num">Deducción</th>
            <th></th>
          </tr>
        </thead>
        <tbody id="tbody-novedades"></tbody>
      </table>
    </div>
  `;

  const tbody = $('tbody-novedades');
  if (emp.novedades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-row">Sin novedades registradas.</td></tr>`;
  } else {
    liq.detalleNovedades.forEach((n, idx) => {
      const tr = document.createElement('tr');
      const isAuto = n.novedad?.auto === true;
      tr.innerHTML = `
        <td>${n.descripcion}${isAuto ? ' <small style="color:var(--accent,#f59e0b)">[Horario]</small>' : ''}</td>
        <td><span class="badge badge-${n.adicion > 0 ? 'adicion' : 'deduccion'}">${n.adicion > 0 ? 'Adición' : 'Deducción'}</span></td>
        <td class="num green">${n.adicion > 0 ? '$' + NOMINA.fmt(n.adicion) : '—'}</td>
        <td class="num red">${n.deduccion > 0 ? '$' + NOMINA.fmt(n.deduccion) : '—'}</td>
        <td class="acciones-col">
          ${isAuto ? '' : `
            <button class="btn-icon btn-edit-nov" data-idx="${idx}" title="Editar">✏️</button>
            <button class="btn-icon btn-del-nov" data-idx="${idx}" title="Eliminar">🗑️</button>
          `}
        </td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-del-nov').forEach(btn => {
      btn.addEventListener('click', () => eliminarNovedad(emp.id, Number(btn.dataset.idx)));
    });
    tbody.querySelectorAll('.btn-edit-nov').forEach(btn => {
      btn.addEventListener('click', () => editarNovedad(emp.id, Number(btn.dataset.idx)));
    });
  }

  $('btn-add-novedad').addEventListener('click', () => abrirModalNovedad(emp.id));
  $('btn-export-individual').addEventListener('click', () => exportarReciboIndividual(emp.id));

  // Resumen de liquidación
  renderResumen(liq);
}

// ── Resumen ───────────────────────────────────────────────────────────────────
function renderResumen(liq) {
  const r = $('panel-resumen');
  const p = liq.paraQ;
  const ps = liq.prestQ;
  const fmt = NOMINA.fmt;
  const arlPct = (p.arlTasa * 100).toFixed(3);

  r.innerHTML = `
    <div class="resumen-seccion-label">💼 Perspectiva del Empleado</div>
    <div class="resumen-grid">
      <div class="resumen-card card-devengado">
        <div class="card-label">Total Devengado</div>
        <div class="card-valor">$${fmt(liq.devengado)}</div>
        <div class="card-desglose">
          <span>Base: $${fmt(liq.baseQ)}</span>
          ${liq.tieneAuxTransporte ? `<span>Aux. Transp.: $${fmt(liq.auxQ)}</span>` : ''}
          ${liq.totalAdiciones > 0 ? `<span>Novedades +: $${fmt(liq.totalAdiciones)}</span>` : ''}
        </div>
      </div>
      <div class="resumen-card card-deduccion">
        <div class="card-label">Deducciones Empleado</div>
        <div class="card-valor">$${fmt(liq.deducciones)}</div>
        <div class="card-desglose">
          <span>Salud (4%): $${fmt(liq.saludQ)}</span>
          <span>Pensión (4%): $${fmt(liq.pensionQ)}</span>
          ${liq.totalDeducciones > 0 ? `<span>Novedades −: $${fmt(liq.totalDeducciones)}</span>` : ''}
        </div>
      </div>
      <div class="resumen-card card-neto">
        <div class="card-label">Neto a Pagar</div>
        <div class="card-valor neto-valor">$${fmt(liq.neto)}</div>
      </div>
    </div>

    <div class="resumen-seccion-label">🏢 Aportes Empleador (Parafiscales)</div>
    <div class="resumen-grid">
      <div class="resumen-card card-seguridad">
        <div class="card-label">Seguridad Social Empleador</div>
        <div class="card-valor">$${fmt(p.saludEmpr + p.pensionEmpr + p.arl)}</div>
        <div class="card-desglose">
          <span>Salud (8.5%): $${fmt(p.saludEmpr)}</span>
          <span>Pensión (12%): $${fmt(p.pensionEmpr)}</span>
          <span>ARL Nivel ${p.nivelARL} (${arlPct}%): $${fmt(p.arl)}</span>
        </div>
      </div>
      <div class="resumen-card card-parafiscal">
        <div class="card-label">Parafiscales</div>
        <div class="card-valor">$${fmt(p.caja)}</div>
        <div class="card-desglose">
          <span>Caja Comp. (4%): $${fmt(p.caja)}</span>
          <span class="exento-label">SENA/ICBF: exonerado</span>
        </div>
      </div>
      <div class="resumen-card card-costo-total">
        <div class="card-label">Subtotal Aportes Empleador</div>
        <div class="card-valor">$${fmt(liq.totalParaQ)}</div>
        <div class="card-desglose">
          <span>SS: $${fmt(p.saludEmpr + p.pensionEmpr + p.arl)}</span>
          <span>Caja: $${fmt(p.caja)}</span>
        </div>
      </div>
    </div>

    <div class="resumen-seccion-label">📅 Provisión Prestaciones Sociales</div>
    <div class="resumen-grid">
      <div class="resumen-card card-prest-a">
        <div class="card-label">Prima + Cesantías</div>
        <div class="card-valor">$${fmt(ps.prima + ps.cesantias)}</div>
        <div class="card-desglose">
          <span>Prima (8.33%): $${fmt(ps.prima)}</span>
          <span>Cesantías (8.33%): $${fmt(ps.cesantias)}</span>
        </div>
      </div>
      <div class="resumen-card card-prest-b">
        <div class="card-label">Intereses + Vacaciones</div>
        <div class="card-valor">$${fmt(ps.intCes + ps.vacaciones)}</div>
        <div class="card-desglose">
          <span>Int. Cesantías (1%): $${fmt(ps.intCes)}</span>
          <span>Vacaciones (4.17%): $${fmt(ps.vacaciones)}</span>
        </div>
      </div>
      <div class="resumen-card card-costo-total">
        <div class="card-label">Costo Total Empleador</div>
        <div class="card-valor costo-valor">$${fmt(liq.costoTotalQ)}</div>
        <div class="card-desglose">
          <span>Neto: $${fmt(liq.neto)}</span>
          <span>Aportes: $${fmt(liq.totalParaQ)}</span>
          <span>Prestaciones: $${fmt(ps.total)}</span>
        </div>
      </div>
    </div>
  `;
}


// ── Modal Empleado ────────────────────────────────────────────────────────────
function abrirModalEmpleado(idEditar = null) {
  editandoEmpleadoId = idEditar;
  const emp = idEditar ? state.empleados.find(e => e.id === idEditar) : null;

  $('modal-emp-titulo').textContent = emp ? 'Editar Empleado' : 'Nuevo Empleado';
  $('inp-nombre').value = emp?.nombre || '';
  $('inp-cedula').value = emp?.cedula || '';
  $('inp-cargo').value = emp?.cargo || '';
  $('inp-salario').value = emp?.salarioMensual || '';
  $('sel-nivel-arl').value = emp?.nivelARL || 'I';

  // Fecha de ingreso: editable solo al crear, solo lectura al editar
  const inpFecha = $('inp-fecha-ingreso');
  const hintFecha = $('hint-fecha-ingreso');
  if (emp) {
    // Editando: mostrar fecha guardada, deshabilitar campo
    inpFecha.value = emp.fechaIngreso || '';
    inpFecha.disabled = true;
    hintFecha.style.display = 'block';
    hintFecha.textContent = emp.fechaIngreso
      ? `Ingreso registrado: ${emp.fechaIngreso}. No editable.`
      : 'Sin fecha de ingreso registrada.';
  } else {
    // Nuevo empleado: campo habilitado
    inpFecha.value = '';
    inpFecha.disabled = false;
    hintFecha.style.display = 'block';
    hintFecha.textContent = 'Fecha desde que el empleado ingresa a la empresa.';
  }

  $('modal-empleado').classList.add('visible');
  $('inp-nombre').focus();
}

function cerrarModalEmpleado() {
  $('modal-empleado').classList.remove('visible');
  editandoEmpleadoId = null;
}

function guardarEmpleado() {
  const nombre = $('inp-nombre').value.trim();
  const cedula = $('inp-cedula').value.trim();
  const cargo = $('inp-cargo').value.trim();
  const salario = Number($('inp-salario').value);
  const nivelARL = $('sel-nivel-arl').value || 'I';
  const fechaIngreso = $('inp-fecha-ingreso').value || null;

  if (!nombre || !cedula || !cargo || !salario || salario <= 0) {
    alert('Por favor completa todos los campos con valores válidos.');
    return;
  }

  if (editandoEmpleadoId) {
    const emp = state.empleados.find(e => e.id === editandoEmpleadoId);
    if (emp) {
      emp.nombre = nombre; emp.cedula = cedula;
      emp.cargo = cargo; emp.salarioMensual = salario;
      emp.nivelARL = nivelARL;
      // fechaIngreso no se modifica al editar
    }
  } else {
    state.empleados.push({ id: uid(), nombre, cedula, cargo, salarioMensual: salario, nivelARL, fechaIngreso, novedades: [] });
    if (!state.empleadoSelId) state.empleadoSelId = state.empleados[0].id;
  }

  cerrarModalEmpleado();
  guardarState();
  renderEmpleados();
  renderPanelNovedades();
}

function eliminarEmpleado(id) {
  if (!confirm('¿Eliminar este empleado y todas sus novedades?')) return;
  state.empleados = state.empleados.filter(e => e.id !== id);
  if (state.empleadoSelId === id) state.empleadoSelId = state.empleados[0]?.id || null;
  guardarState();
  renderEmpleados();
  renderPanelNovedades();
}

// ── Modal Novedad ─────────────────────────────────────────────────────────────
function abrirModalNovedad(empId, esEdicion = false) {
  $('modal-nov-emp-id').value = empId;
  if (!esEdicion) {
    editandoNovedadIdx = null;
    $('sel-tipo-novedad').value = NOMINA.TIPOS_NOVEDAD[0].value;
    $('inp-valor-novedad').value = '';
    $('modal-novedad').querySelector('h3').textContent = 'Registrar Novedad';
    $('btn-guardar-nov').textContent = 'Registrar';
  } else {
    $('modal-novedad').querySelector('h3').textContent = 'Editar Novedad';
    $('btn-guardar-nov').textContent = 'Actualizar';
  }
  actualizarLabelNovedad();
  $('modal-novedad').classList.add('visible');
  $('inp-valor-novedad').focus();
}

function editarNovedad(empId, idx) {
  const emp = state.empleados.find(e => e.id === empId);
  if (!emp) return;
  const nov = emp.novedades[idx];
  if (!nov) return;

  editandoNovedadIdx = idx;
  $('sel-tipo-novedad').value = nov.tipo;
  $('inp-valor-novedad').value = nov.valor;
  
  abrirModalNovedad(empId, true);
}

function cerrarModalNovedad() {
  $('modal-novedad').classList.remove('visible');
  editandoNovedadIdx = null;
}

function actualizarLabelNovedad() {
  const tipo = NOMINA.TIPOS_NOVEDAD.find(t => t.value === $('sel-tipo-novedad').value);
  $('label-unidad-novedad').textContent = tipo ? tipo.unidad : 'valor';
}

function guardarNovedad() {
  const empId = $('modal-nov-emp-id').value;
  const tipo = $('sel-tipo-novedad').value;
  const valor = Number($('inp-valor-novedad').value);

  if (!tipo || isNaN(valor) || valor <= 0) {
    alert('Por favor selecciona el tipo e ingresa un valor mayor a cero.');
    return;
  }

  const emp = state.empleados.find(e => e.id === empId);
  if (!emp) return;

  if (editandoNovedadIdx !== null) {
    emp.novedades[editandoNovedadIdx] = { tipo, valor };
  } else {
    emp.novedades.push({ tipo, valor });
  }

  cerrarModalNovedad();
  guardarState();
  renderEmpleados();
  renderPanelNovedades();
}

function eliminarNovedad(empId, idx) {
  const emp = state.empleados.find(e => e.id === empId);
  if (!emp) return;
  emp.novedades.splice(idx, 1);
  guardarState();
  renderEmpleados();
  renderPanelNovedades();
}

// ── Exportaciones ─────────────────────────────────────────────────────────────
function exportarPDF() {
  const liquidaciones = NOMINA.liquidarTodos(state.empleados);
  if (liquidaciones.length === 0) { alert('No hay empleados para exportar.'); return; }
  EXPORTER.exportarPDF(liquidaciones, state.periodo);
}

function exportarExcel() {
  const liquidaciones = NOMINA.liquidarTodos(state.empleados);
  if (liquidaciones.length === 0) { alert('No hay empleados para exportar.'); return; }
  EXPORTER.exportarExcel(liquidaciones, state.periodo);
}

function exportarParafiscales() {
  const liquidaciones = NOMINA.liquidarTodos(state.empleados);
  if (liquidaciones.length === 0) { alert('No hay empleados para exportar.'); return; }
  EXPORTER.exportarParafiscalesExcel(liquidaciones, state.periodo);
}

function exportarPrestaciones() {
  const liquidaciones = NOMINA.liquidarTodos(state.empleados);
  if (liquidaciones.length === 0) { alert('No hay empleados para exportar.'); return; }
  EXPORTER.exportarPrestacionesExcel(liquidaciones, state.periodo);
}

function exportarReciboIndividual(id) {
  const emp = state.empleados.find(e => e.id === id);
  if (!emp) return;
  const liq = NOMINA.liquidar(emp);
  EXPORTER.exportarReciboPDF(liq, state.periodo);
}

// ── Limpiar datos ─────────────────────────────────────────────────────────────
// ── Cerrar y Archivar Nómina ──────────────────────────────────────────────────
function cerrarYArchivarNomina() {
  if (state.empleados.length === 0) return alert('No hay datos para archivar.');
  
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[Number(state.periodo.mes) - 1];
  const qStr = state.periodo.quincena === '1' ? '1Q' : '2Q';
  const tag = `${state.periodo.anio}-${state.periodo.mes}-${qStr}`;

  if (!confirm(`¿Desea cerrar y archivar la nómina de ${mesNombre} (${qStr})?\n\nEsto guardará una copia histórica y permitirá iniciar el siguiente período.`)) return;

  const historial = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];
  
  // Calcular resumen total
  const liqTodos = NOMINA.liquidarTodos(state.empleados);
  const totalNeto = liqTodos.reduce((sum, l) => sum + l.neto, 0);
  const totalCosto = liqTodos.reduce((sum, l) => sum + l.costoTotalQ, 0);

  const registro = {
    id: uid(),
    tag: tag,
    fechaCierre: new Date().toISOString(),
    periodo: { ...state.periodo },
    resumen: {
      empleados: liqTodos.length,
      totalNeto: totalNeto,
      totalCosto: totalCosto
    },
    detalle: liqTodos // Guardamos todo el detalle de liquidación
  };

  historial.push(registro);
  localStorage.setItem(LS_HISTORY, JSON.stringify(historial));

  alert('Nómina archivada con éxito en el histórico.');
  
  // Opcional: Avanzar período
  if (state.periodo.quincena === '1') {
    state.periodo.quincena = '2';
  } else {
    state.periodo.quincena = '1';
    state.periodo.mes = Number(state.periodo.mes) + 1;
    if (state.periodo.mes > 12) {
      state.periodo.mes = 1;
      state.periodo.anio = Number(state.periodo.anio) + 1;
    }
  }
  
  guardarState();
  location.reload(); // Recargar para limpiar y mostrar nuevo período
}

function limpiarDatos() {
  if (!confirm('¿Borrar el estado local? Esto no borrará los empleados del sistema central.')) return;
  state.empleadoSelId = null;
  localStorage.removeItem(LS_KEY);
  location.reload();
}

// ── Inicialización ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  cargarState();

  // Periodo
  renderPeriodo();
  ['sel-anio', 'sel-mes', 'sel-quincena'].forEach(id => {
    $(id).addEventListener('change', () => {
      state.periodo.anio = $('sel-anio').value;
      state.periodo.mes = $('sel-mes').value;
      state.periodo.quincena = $('sel-quincena').value;
      actualizarTituloPeriodo();
      guardarState();
      cargarState();       // RE-SINCRONIZAR con Control de Horarios para el nuevo período
      renderEmpleados();   
      renderPanelNovedades();
    });
  });

  // Botón agregar empleado
  $('btn-nuevo-empleado').addEventListener('click', () => abrirModalEmpleado());

  // Modal empleado
  $('btn-guardar-emp').addEventListener('click', guardarEmpleado);
  $('btn-cancelar-emp').addEventListener('click', cerrarModalEmpleado);
  $('modal-empleado').addEventListener('click', e => { if (e.target === $('modal-empleado')) cerrarModalEmpleado(); });

  // Modal novedad
  $('sel-tipo-novedad').addEventListener('change', actualizarLabelNovedad);
  $('btn-guardar-nov').addEventListener('click', guardarNovedad);
  $('btn-cancelar-nov').addEventListener('click', cerrarModalNovedad);
  $('modal-novedad').addEventListener('click', e => { if (e.target === $('modal-novedad')) cerrarModalNovedad(); });

  // Enter en modales
  ['inp-nombre', 'inp-cedula', 'inp-cargo', 'inp-salario'].forEach(id => {
    $(id)?.addEventListener('keydown', e => { if (e.key === 'Enter') guardarEmpleado(); });
  });
  $('inp-valor-novedad').addEventListener('keydown', e => { if (e.key === 'Enter') guardarNovedad(); });

  // Exportar / limpiar / archivar
  $('btn-export-pdf').addEventListener('click', exportarPDF);
  $('btn-export-excel').addEventListener('click', exportarExcel);
  $('btn-export-para').addEventListener('click', exportarParafiscales);
  $('btn-export-prest').addEventListener('click', exportarPrestaciones);
  $('btn-limpiar').addEventListener('click', limpiarDatos);
  $('btn-archivar').addEventListener('click', cerrarYArchivarNomina);

  // Botón GUARDAR manual (Solicitado por el usuario)
  $('btn-guardar-global').addEventListener('click', () => {
    guardarState();
    // Notificación visual de guardado
    const toast = document.createElement('div');
    toast.innerHTML = '<span style="margin-right:8px;">💾</span> Cambios guardados correctamente';
    toast.style.cssText = 'position:fixed;top:20px;right:20px;background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;font-size:0.95rem;z-index:9999;box-shadow:0 4px 12px rgba(0,0,0,0.15);animation:fadeIn 0.3s ease;';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  });

  // Llenar select de tipos de novedad
  const selTipo = $('sel-tipo-novedad');
  NOMINA.TIPOS_NOVEDAD.forEach(t => {
    const opt = document.createElement('option');
    opt.value = t.value;
    opt.textContent = `${t.label} (${t.unidad}) — ${t.efecto}`;
    selTipo.appendChild(opt);
  });

  // Render inicial
  renderEmpleados();
  renderPanelNovedades();
  renderHistorial();
});

// ── Render Historial ──────────────────────────────────────────────────────────
function renderHistorial() {
  const historial = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];
  const panel = $('panel-history');
  const list = $('history-list');
  
  if (historial.length === 0) {
    panel.style.display = 'none';
    return;
  }
  
  panel.style.display = 'block';
  list.innerHTML = historial.reverse().map(h => `
    <div class="resumen-card" style="border-left: 4px solid #3b82f6; cursor: pointer;" onclick="verHistorico('${h.id}')">
      <div class="card-label">${h.tag}</div>
      <div class="card-valor">$${NOMINA.fmt(h.resumen.totalNeto)}</div>
      <div class="card-desglose">
        <span>${h.resumen.empleados} empleados</span>
        <span>Cerrado: ${new Date(h.fechaCierre).toLocaleDateString()}</span>
      </div>
    </div>
  `).join('');
}

function verHistorico(id) {
  const historial = JSON.parse(localStorage.getItem(LS_HISTORY)) || [];
  const h = historial.find(item => item.id === id);
  if (!h) return;
  
  alert(`📋 Detalle Histórico: ${h.tag}\n\n` + 
        `Fecha Cierre: ${new Date(h.fechaCierre).toLocaleString()}\n` +
        `Total Neto Pagado: $${NOMINA.fmt(h.resumen.totalNeto)}\n` +
        `Total Costo Empresa: $${NOMINA.fmt(h.resumen.totalCosto)}\n\n` +
        `Para ver el detalle completo, use la exportación de Excel del histórico.`);
}
