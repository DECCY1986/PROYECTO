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
const LS_KEY = 'nomina_state_v1_publicidad';

function guardarState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function cargarState() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      state = { ...state, ...parsed };
    }
  } catch { /* ignorar */ }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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
      <button class="btn btn-primary" id="btn-add-novedad">+ Novedad</button>
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
      tr.innerHTML = `
        <td>${n.descripcion}</td>
        <td><span class="badge badge-${n.adicion > 0 ? 'adicion' : 'deduccion'}">${n.adicion > 0 ? 'Adición' : 'Deducción'}</span></td>
        <td class="num green">${n.adicion > 0 ? '$' + NOMINA.fmt(n.adicion) : '—'}</td>
        <td class="num red">${n.deduccion > 0 ? '$' + NOMINA.fmt(n.deduccion) : '—'}</td>
        <td class="acciones-col">
          <button class="btn-icon btn-del-nov" data-idx="${idx}" title="Eliminar">🗑️</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('.btn-del-nov').forEach(btn => {
      btn.addEventListener('click', () => eliminarNovedad(emp.id, Number(btn.dataset.idx)));
    });
  }

  $('btn-add-novedad').addEventListener('click', () => abrirModalNovedad(emp.id));

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
function abrirModalNovedad(empId) {
  $('modal-nov-emp-id').value = empId;
  $('sel-tipo-novedad').value = NOMINA.TIPOS_NOVEDAD[0].value;
  $('inp-valor-novedad').value = '';
  actualizarLabelNovedad();
  $('modal-novedad').classList.add('visible');
  $('inp-valor-novedad').focus();
}

function cerrarModalNovedad() {
  $('modal-novedad').classList.remove('visible');
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

  emp.novedades.push({ tipo, valor });
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

// ── Limpiar datos ─────────────────────────────────────────────────────────────
function limpiarDatos() {
  if (!confirm('¿Borrar todos los empleados y novedades? Esta acción no se puede deshacer.')) return;
  state.empleados = [];
  state.empleadoSelId = null;
  guardarState();
  renderEmpleados();
  renderPanelNovedades();
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
      renderEmpleados();   // actualiza netos (aunque no cambian por cambio de período)
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

  // Exportar / limpiar
  $('btn-export-pdf').addEventListener('click', exportarPDF);
  $('btn-export-excel').addEventListener('click', exportarExcel);
  $('btn-export-para').addEventListener('click', exportarParafiscales);
  $('btn-export-prest').addEventListener('click', exportarPrestaciones);
  $('btn-limpiar').addEventListener('click', limpiarDatos);

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
});
