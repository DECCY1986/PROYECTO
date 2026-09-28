/* ═══════════════════════════════════════════════════════════════
   DIMALCCO SAS — compras-app.js  v1.0  |  09-Jul-2026
   Controlador SPA: Hub + M1 Proveedores + M2 Compras +
   M3 Almacén + M4 SST + M5 Reportes + Config
   ═══════════════════════════════════════════════════════════════ */
'use strict';

/* ──────────────────────────────────────
   TOAST
────────────────────────────────────── */
function toast(msg, type = 'info') {
  const ct = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = `toast toast-${type}`;
  const icons = { success: 'ph-check-circle', error: 'ph-x-circle', warning: 'ph-warning', info: 'ph-info' };
  t.innerHTML = `<i class="ph ${icons[type] || icons.info}"></i> ${msg}`;
  ct.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateX(100%)'; setTimeout(() => t.remove(), 300); }, 3500);
}

/* ──────────────────────────────────────
   CSV EXPORT
────────────────────────────────────── */
function exportCSV(headers, rows, filename) {
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [headers.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))].join('\n');
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

/* ──────────────────────────────────────
   APP CONTROLLER
────────────────────────────────────── */
const App = {
  currentView: 'hub',
  tabs: { m2: 'oc', m3: 'recepcion', m5: 'otif' },
  search: { m1: '', m2oc: '', m2items: '', m3inv: '', m4: '', m5audit: '' },

  /* ── INIT ── */
  init() {
    initDatos();
    this.startClock();
    this.navigate('hub');
    this.updateBadges();
    const auto = Ordenes.generarAutomaticas();
    if (auto.length) toast(`${auto.length} OC generada(s) automáticamente por punto de reorden`, 'info');
    document.getElementById('modal-backdrop').addEventListener('click', e => {
      if (e.target.id === 'modal-backdrop') App.closeModal();
    });
  },

  /* ── NAVIGATION ── */
  navigate(view) {
    this.currentView = view;
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    const el = document.getElementById('view-' + view);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.view === view);
    });
    const titles = {
      hub: '<i class="ph ph-squares-four"></i> Panel Principal',
      m1: '<i class="ph ph-users"></i> M1 · Proveedores',
      m2: '<i class="ph ph-shopping-bag"></i> M2 · Compras',
      m3: '<i class="ph ph-package"></i> M3 · Almacén',
      m4: '<i class="ph ph-shield-warning"></i> M4 · SST-Compras',
      m5: '<i class="ph ph-chart-line-up"></i> M5 · Reportes',
      config: '<i class="ph ph-gear"></i> Configuración',
    };
    document.getElementById('topbar-title').innerHTML = titles[view] || '';
    const renderers = { hub: 'renderHub', m1: 'renderM1', m2: 'renderM2', m3: 'renderM3', m4: 'renderM4', m5: 'renderM5', config: 'renderConfig' };
    if (renderers[view]) this[renderers[view]]();
    this.updateBadges();
  },

  /* ── BADGES ── */
  updateBadges() {
    const alertas = Proveedores.getAlertasVencimiento().filter(a => a.status === 'vencido');
    const bA = document.getElementById('badge-alertas');
    const total = alertas.length + Items.checkReorden().length;
    if (total > 0) { bA.textContent = total; bA.classList.remove('hidden'); } else { bA.classList.add('hidden'); }

    const ocPend = Ordenes.getAll().filter(o => ['BORRADOR', 'EMITIDA', 'EN_TRANSITO'].includes(o.estado)).length;
    const bOC = document.getElementById('badge-oc-pendientes');
    if (ocPend > 0) { bOC.textContent = ocPend; bOC.classList.remove('hidden'); } else { bOC.classList.add('hidden'); }

    const sstIssues = alertas.length;
    const bSST = document.getElementById('badge-sst');
    if (sstIssues > 0) { bSST.textContent = sstIssues; bSST.classList.remove('hidden'); } else { bSST.classList.add('hidden'); }
  },

  /* ── CLOCK ── */
  startClock() {
    const tick = () => {
      const n = new Date();
      document.getElementById('topbar-clock').textContent = n.toLocaleString('es-CO', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    };
    tick(); setInterval(tick, 1000);
  },

  /* ── MODAL ── */
  openModal(html, size = '') {
    const box = document.getElementById('modal-box');
    box.className = 'modal' + (size ? ' ' + size : '');
    box.innerHTML = html;
    document.getElementById('modal-backdrop').classList.add('open');
  },
  closeModal() {
    document.getElementById('modal-backdrop').classList.remove('open');
  },

  /* ══════════════════════════════════════
     HUB — Panel Principal
  ══════════════════════════════════════ */
  renderHub() {
    const provs = Proveedores.getAll();
    const homologados = provs.filter(p => p.estado === 'HOMOLOGADO').length;
    const ocs = Ordenes.getAll();
    const ocActivas = ocs.filter(o => ['BORRADOR', 'EMITIDA', 'EN_TRANSITO'].includes(o.estado));
    const itemsBajoPR = Items.checkReorden();
    const items = Items.getAll();
    const valorInv = items.reduce((s, i) => s + (i.stockActual || 0) * (i.costoPP || 0), 0);
    const alertasSST = Proveedores.getAlertasVencimiento().filter(a => a.status === 'vencido');
    const ultOCs = ocs.slice().sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion)).slice(0, 5);

    let alertHTML = '';
    if (alertasSST.length) {
      alertHTML += `<div class="alert-bar alert-danger"><i class="ph ph-shield-warning"></i> <strong>${alertasSST.length} documento(s) SST vencido(s)</strong> — Proveedores afectados están bloqueados para OC. <button class="btn btn-sm btn-danger" onclick="App.navigate('m4')" style="margin-left:auto">Ver SST</button></div>`;
    }
    if (itemsBajoPR.length) {
      alertHTML += `<div class="alert-bar alert-warning"><i class="ph ph-warning"></i> <strong>${itemsBajoPR.length} ítem(s) bajo punto de reorden</strong> — Se requiere reabastecimiento. <button class="btn btn-sm btn-warning" onclick="App.navigate('m2')" style="margin-left:auto">Ver Compras</button></div>`;
    }

    document.getElementById('view-hub').innerHTML = `
      ${alertHTML}
      <div class="stats-grid">
        <div class="stat-card">
          <div class="s-icon" style="background:var(--primary-soft);color:var(--primary)"><i class="ph ph-users"></i></div>
          <div class="s-val">${homologados}<span style="font-size:0.9rem;color:var(--text-2);font-weight:400">/${provs.length}</span></div>
          <div class="s-lbl">Proveedores Homologados</div>
        </div>
        <div class="stat-card">
          <div class="s-icon" style="background:var(--info-soft);color:var(--info)"><i class="ph ph-shopping-bag"></i></div>
          <div class="s-val">${ocActivas.length}</div>
          <div class="s-lbl">OC Activas</div>
          <div class="s-sub">${ocs.filter(o => o.estado === 'EN_TRANSITO').length} en tránsito</div>
        </div>
        <div class="stat-card">
          <div class="s-icon" style="background:${itemsBajoPR.length ? 'var(--danger-soft)' : 'var(--success-soft)'};color:${itemsBajoPR.length ? 'var(--danger)' : 'var(--success)'}"><i class="ph ph-warning-circle"></i></div>
          <div class="s-val">${itemsBajoPR.length}</div>
          <div class="s-lbl">Ítems Bajo PR</div>
        </div>
        <div class="stat-card">
          <div class="s-icon" style="background:var(--purple-soft);color:var(--purple)"><i class="ph ph-vault"></i></div>
          <div class="s-val" style="font-size:1.4rem">${fmtCOP(valorInv)}</div>
          <div class="s-lbl">Valor Inventario</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 300px;gap:1.25rem;">
        <div class="card">
          <div class="card-header">
            <h3><i class="ph ph-list-numbers"></i> Últimas Órdenes de Compra</h3>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>N°</th><th>Proveedor</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
              <tbody>
                ${ultOCs.length ? ultOCs.map(o => {
                  const p = Proveedores.getById(o.proveedorId);
                  const eBadge = { BORRADOR: 'badge-muted', EMITIDA: 'badge-primary', EN_TRANSITO: 'badge-info', RECIBIDA: 'badge-success', NOVEDAD: 'badge-warning', CANCELADA: 'badge-danger' };
                  return `<tr style="cursor:pointer" onclick="App.modalDetalleOC(${o.id})">
                    <td class="text-mono">${o.numero}</td>
                    <td>${p?.nombre || '—'}</td>
                    <td>${fmtFecha(o.fechaCreacion)}</td>
                    <td class="fw-700">${fmtCOP(o.total)}</td>
                    <td><span class="badge ${eBadge[o.estado] || 'badge-muted'}">${o.estado.replace('_', ' ')}</span></td>
                  </tr>`;
                }).join('') : '<tr><td colspan="5" class="text-center text-muted" style="padding:2rem">Sin órdenes registradas</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>

        <div class="card" style="display:flex;flex-direction:column;gap:0.6rem;">
          <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:0.5rem"><i class="ph ph-lightning"></i> Acciones Rápidas</h3>
          <button class="btn btn-primary" style="width:100%;justify-content:center" onclick="App.modalNuevaOC()"><i class="ph ph-plus-circle"></i> Nueva Orden de Compra</button>
          <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="App.modalNuevoProveedor()"><i class="ph ph-user-plus"></i> Nuevo Proveedor</button>
          <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="App.navigate('m3')"><i class="ph ph-package"></i> Registrar Recepción</button>
          <button class="btn btn-ghost" style="width:100%;justify-content:center" onclick="App.navigate('m5')"><i class="ph ph-chart-line-up"></i> Ver Reportes</button>
          <hr class="divider">
          <div style="font-size:0.75rem;color:var(--text-3)">
            <div>Método valorización: <strong style="color:var(--text-2)">${Config.get().metodoValorizacion}</strong></div>
            <div>Alerta vencimiento: <strong style="color:var(--text-2)">${Config.get().alertaVencimientoDias} días</strong></div>
          </div>
        </div>
      </div>
    `;
  },

  /* ══════════════════════════════════════
     M1 — PROVEEDORES
  ══════════════════════════════════════ */
  renderM1() {
    const provs = Proveedores.getAll();
    const total = provs.length;
    const homol = provs.filter(p => p.estado === 'HOMOLOGADO').length;
    const bloq = provs.filter(p => ['BLOQUEADO_SST', 'SUSPENDIDO'].includes(p.estado)).length;
    const pend = provs.filter(p => p.estado === 'PENDIENTE').length;
    const q = this.search.m1.toLowerCase();
    const filtered = q ? provs.filter(p => p.nombre.toLowerCase().includes(q) || p.nit.includes(q) || p.ciudad?.toLowerCase().includes(q)) : provs;

    document.getElementById('view-m1').innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card"><div class="s-icon" style="background:var(--primary-soft);color:var(--primary)"><i class="ph ph-users"></i></div><div class="s-val">${total}</div><div class="s-lbl">Total Proveedores</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--success-soft);color:var(--success)"><i class="ph ph-check-circle"></i></div><div class="s-val">${homol}</div><div class="s-lbl">Homologados</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--danger-soft);color:var(--danger)"><i class="ph ph-prohibit"></i></div><div class="s-val">${bloq}</div><div class="s-lbl">Bloqueados/Suspendidos</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--warning-soft);color:var(--warning)"><i class="ph ph-clock"></i></div><div class="s-val">${pend}</div><div class="s-lbl">Pendientes</div></div>
      </div>
      <div class="toolbar">
        <div class="search-bar"><i class="ph ph-magnifying-glass"></i><input placeholder="Buscar proveedor..." value="${this.search.m1}" oninput="App.search.m1=this.value;App.renderM1()"></div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="App.modalNuevoProveedor()"><i class="ph ph-plus-circle"></i> Nuevo Proveedor</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th style="width:30px"></th><th>Nombre</th><th>NIT</th><th>Ciudad</th><th>Estado</th><th>OTIF</th><th>Docs</th><th></th></tr></thead>
            <tbody>
              ${filtered.length ? filtered.map(p => {
                const estado = Proveedores.calcularEstado(p);
                const dotCls = estado === 'HOMOLOGADO' ? 'dot-green' : (estado === 'PENDIENTE' ? 'dot-yellow' : (estado === 'INACTIVO' ? 'dot-gray' : 'dot-red'));
                const otif = Proveedores.getOTIF(p);
                const docsOk = DOC_TYPES.filter(d => d.obligatorio).filter(d => {
                  const dc = p.documentos?.[d.key];
                  if (!dc?.vencimiento) return false;
                  return new Date(dc.vencimiento) >= new Date();
                }).length;
                const docsReq = DOC_TYPES.filter(d => d.obligatorio).length;
                return `<tr style="cursor:pointer" onclick="App.renderM1Detail(${p.id})">
                  <td><span class="dot ${dotCls}"></span></td>
                  <td class="fw-700">${p.nombre}</td>
                  <td class="text-mono text-sm">${p.nit}-${p.dv}</td>
                  <td>${p.ciudad || '—'}</td>
                  <td><span class="badge badge-${Proveedores.getEstadoColor(estado)}">${estado}</span></td>
                  <td>${otifBadge(otif)}</td>
                  <td><span class="text-sm ${docsOk < docsReq ? 'col-warning' : 'col-success'}">${docsOk}/${docsReq}</span></td>
                  <td><button class="btn btn-icon btn-ghost btn-sm" title="Ver detalle"><i class="ph ph-caret-right"></i></button></td>
                </tr>`;
              }).join('') : '<tr><td colspan="8" class="text-center text-muted" style="padding:2rem">No se encontraron proveedores</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderM1Detail(id) {
    const p = Proveedores.getById(id);
    if (!p) return;
    const estado = Proveedores.calcularEstado(p);
    const otif = Proveedores.getOTIF(p);
    const ocs = Ordenes.getAll().filter(o => o.proveedorId == id).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

    const docsHTML = DOC_TYPES.map(dt => {
      const doc = p.documentos?.[dt.key];
      const est = Proveedores.getDocEstado(doc, dt.maxMeses);
      let statusCls = '', statusIcon = '', statusLabel = '';
      if (est === 'missing') {
        statusCls = 'col-danger'; statusIcon = 'ph-x-circle'; statusLabel = 'Sin cargar';
      } else if (est.status === 'vencido') {
        statusCls = 'col-danger'; statusIcon = 'ph-x-circle'; statusLabel = est.label;
      } else if (est.status === 'proximo') {
        statusCls = 'col-warning'; statusIcon = 'ph-warning'; statusLabel = est.label;
      } else {
        statusCls = 'col-success'; statusIcon = 'ph-check-circle'; statusLabel = est.label;
      }
      return `<div class="doc-item">
        <div class="doc-icon ${statusCls}"><i class="ph ${dt.icon}"></i></div>
        <div class="doc-info">
          <div class="doc-name">${dt.label} ${!dt.obligatorio ? '<span class="text-xs text-muted">(opcional)</span>' : ''}</div>
          <div class="doc-date"><i class="ph ${statusIcon}" style="font-size:0.85rem"></i> <span class="${statusCls}">${statusLabel}</span></div>
        </div>
        <button class="btn btn-sm btn-ghost" onclick="event.stopPropagation();App.modalEditarDoc(${p.id},'${dt.key}')"><i class="ph ph-pencil"></i> Actualizar</button>
      </div>`;
    }).join('');

    const otifHTML = (p.otifHistorial || []).slice(0, 6).map(o => `
      <div style="display:flex;align-items:center;gap:0.75rem;padding:0.5rem 0;border-bottom:1px solid var(--border)">
        <span class="text-mono text-sm" style="width:70px">${o.periodo}</span>
        <div style="flex:1">
          <div class="otif-bar"><div class="otif-fill" style="width:${o.otif}%;background:${otifColor(o.otif)}"></div></div>
        </div>
        <span class="fw-700" style="color:${otifColor(o.otif)};width:50px;text-align:right">${o.otif.toFixed(1)}%</span>
      </div>
    `).join('') || '<div class="text-muted text-sm" style="padding:1rem 0">Sin historial OTIF</div>';

    document.getElementById('view-m1').innerHTML = `
      <button class="btn btn-ghost mb-3" onclick="App.renderM1()"><i class="ph ph-arrow-left"></i> Volver a lista</button>
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem">
        <div>
          <div class="section-title">${p.nombre}</div>
          <div class="text-mono text-muted">NIT ${p.nit}-${p.dv}</div>
        </div>
        <span class="badge badge-${Proveedores.getEstadoColor(estado)}" style="font-size:0.85rem;padding:0.35rem 0.8rem">${estado}</span>
        ${otif != null ? `<span style="margin-left:auto;font-size:0.85rem;color:var(--text-2)">OTIF: <strong style="color:${otifColor(otif)}">${otif.toFixed(1)}%</strong></span>` : ''}
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.25rem;margin-bottom:1.5rem">
        <div class="card card-sm">
          <h3 style="font-size:0.85rem;font-weight:700;margin-bottom:0.75rem"><i class="ph ph-identification-card"></i> Información General</h3>
          <div class="detail-panel">
            <div class="detail-row"><div class="detail-label">Contacto</div><div class="detail-value">${p.contacto || '—'}</div></div>
            <div class="detail-row"><div class="detail-label">Email</div><div class="detail-value">${p.email || '—'}</div></div>
            <div class="detail-row"><div class="detail-label">Teléfono</div><div class="detail-value">${p.telefono || '—'}</div></div>
            <div class="detail-row"><div class="detail-label">Ciudad</div><div class="detail-value">${p.ciudad || '—'}</div></div>
            <div class="detail-row"><div class="detail-label">Régimen</div><div class="detail-value">${p.regimen}</div></div>
            <div class="detail-row"><div class="detail-label">Categoría</div><div class="detail-value">${p.categoria}</div></div>
            <div class="detail-row"><div class="detail-label">Fecha Registro</div><div class="detail-value">${fmtFecha(p.fechaRegistro)}</div></div>
            <div class="detail-row"><div class="detail-label">Períodos Susp.</div><div class="detail-value">${p.periodosSuspension || 0}</div></div>
          </div>
        </div>
        <div class="card card-sm">
          <h3 style="font-size:0.85rem;font-weight:700;margin-bottom:0.75rem"><i class="ph ph-chart-bar"></i> Historial OTIF</h3>
          ${otifHTML}
        </div>
      </div>

      <div class="card mb-3">
        <div class="card-header"><h3><i class="ph ph-files"></i> Documentos de Homologación</h3></div>
        <div class="doc-grid">${docsHTML}</div>
      </div>

      <div class="card">
        <div class="card-header"><h3><i class="ph ph-list-numbers"></i> Órdenes de Compra</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>Fecha</th><th>Total</th><th>Estado</th></tr></thead>
            <tbody>
              ${ocs.length ? ocs.map(o => {
                const eBadge = { BORRADOR: 'badge-muted', EMITIDA: 'badge-primary', EN_TRANSITO: 'badge-info', RECIBIDA: 'badge-success', NOVEDAD: 'badge-warning', CANCELADA: 'badge-danger' };
                return `<tr style="cursor:pointer" onclick="App.modalDetalleOC(${o.id})"><td class="text-mono">${o.numero}</td><td>${fmtFecha(o.fechaCreacion)}</td><td class="fw-700">${fmtCOP(o.total)}</td><td><span class="badge ${eBadge[o.estado] || 'badge-muted'}">${o.estado.replace('_', ' ')}</span></td></tr>`;
              }).join('') : '<tr><td colspan="4" class="text-center text-muted" style="padding:1.5rem">Sin órdenes para este proveedor</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  /* ══════════════════════════════════════
     M2 — COMPRAS
  ══════════════════════════════════════ */
  renderM2() {
    const tab = this.tabs.m2;
    document.getElementById('view-m2').innerHTML = `
      <div class="tabs">
        <button class="tab-btn ${tab === 'oc' ? 'active' : ''}" onclick="App.tabs.m2='oc';App.renderM2()"><i class="ph ph-list-numbers"></i> Órdenes de Compra</button>
        <button class="tab-btn ${tab === 'items' ? 'active' : ''}" onclick="App.tabs.m2='items';App.renderM2()"><i class="ph ph-barcode"></i> Catálogo de Ítems</button>
      </div>
      <div id="m2-content"></div>
    `;
    if (tab === 'oc') this._renderM2OC();
    else this._renderM2Items();
  },

  _renderM2OC() {
    const ocs = Ordenes.getAll().sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));
    const q = this.search.m2oc.toLowerCase();
    const filtered = q ? ocs.filter(o => o.numero.toLowerCase().includes(q) || (Proveedores.getById(o.proveedorId)?.nombre || '').toLowerCase().includes(q)) : ocs;

    const activas = ocs.filter(o => ['BORRADOR', 'EMITIDA', 'EN_TRANSITO'].includes(o.estado)).length;
    const enTransito = ocs.filter(o => o.estado === 'EN_TRANSITO').length;
    const mesActual = new Date().getMonth();
    const recibMes = ocs.filter(o => o.estado === 'RECIBIDA' && new Date(o.fechaRecepcionReal).getMonth() === mesActual).length;
    const valorComp = ocs.filter(o => ['BORRADOR', 'EMITIDA', 'EN_TRANSITO'].includes(o.estado)).reduce((s, o) => s + (o.total || 0), 0);

    document.getElementById('m2-content').innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card"><div class="s-icon" style="background:var(--primary-soft);color:var(--primary)"><i class="ph ph-list-numbers"></i></div><div class="s-val">${activas}</div><div class="s-lbl">OC Activas</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--info-soft);color:var(--info)"><i class="ph ph-truck"></i></div><div class="s-val">${enTransito}</div><div class="s-lbl">En Tránsito</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--success-soft);color:var(--success)"><i class="ph ph-check-circle"></i></div><div class="s-val">${recibMes}</div><div class="s-lbl">Recibidas este Mes</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--purple-soft);color:var(--purple)"><i class="ph ph-currency-dollar"></i></div><div class="s-val" style="font-size:1.3rem">${fmtCOP(valorComp)}</div><div class="s-lbl">Valor Comprometido</div></div>
      </div>
      <div class="toolbar">
        <div class="search-bar"><i class="ph ph-magnifying-glass"></i><input placeholder="Buscar OC o proveedor..." value="${this.search.m2oc}" oninput="App.search.m2oc=this.value;App._renderM2OC()"></div>
        <div class="toolbar-right">
          <button class="btn btn-ghost" onclick="App.generarAutomaticasUI()"><i class="ph ph-robot"></i> Generar Automáticas</button>
          <button class="btn btn-primary" onclick="App.modalNuevaOC()"><i class="ph ph-plus-circle"></i> Nueva OC</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>N°</th><th>Tipo</th><th>Proveedor</th><th>Fecha</th><th>Entrega</th><th>Total</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              ${filtered.map(o => {
                const p = Proveedores.getById(o.proveedorId);
                const eBadge = { BORRADOR: 'badge-muted', EMITIDA: 'badge-primary', EN_TRANSITO: 'badge-info', RECIBIDA: 'badge-success', NOVEDAD: 'badge-warning', CANCELADA: 'badge-danger' };
                const tipoBadge = o.tipo === 'AUTOMATICA' ? '<span class="badge badge-purple">AUTO</span>' : '<span class="badge badge-muted">MANUAL</span>';
                return `<tr style="cursor:pointer" onclick="App.modalDetalleOC(${o.id})">
                  <td class="text-mono fw-700">${o.numero}</td>
                  <td>${tipoBadge}</td>
                  <td>${p?.nombre || '—'}</td>
                  <td>${fmtFecha(o.fechaCreacion)}</td>
                  <td>${fmtFecha(o.fechaEntregaComprometida)}</td>
                  <td class="fw-700">${fmtCOP(o.total)}</td>
                  <td><span class="badge ${eBadge[o.estado] || 'badge-muted'}">${o.estado.replace('_', ' ')}</span></td>
                  <td><button class="btn btn-icon btn-ghost btn-sm"><i class="ph ph-eye"></i></button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="8" class="text-center text-muted" style="padding:2rem">Sin órdenes de compra</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  _renderM2Items() {
    const items = Items.getAll();
    const q = this.search.m2items.toLowerCase();
    const filtered = q ? items.filter(i => i.sku.toLowerCase().includes(q) || i.nombre.toLowerCase().includes(q) || i.categoria.toLowerCase().includes(q)) : items;

    document.getElementById('m2-content').innerHTML = `
      <div class="toolbar">
        <div class="search-bar"><i class="ph ph-magnifying-glass"></i><input placeholder="Buscar ítem o SKU..." value="${this.search.m2items}" oninput="App.search.m2items=this.value;App._renderM2Items()"></div>
        <div class="toolbar-right">
          <button class="btn btn-primary" onclick="App.modalNuevoItem()"><i class="ph ph-plus-circle"></i> Nuevo Ítem</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap">
          <table>
            <thead><tr><th>SKU</th><th>Nombre</th><th>Cat.</th><th>Stock</th><th>PR</th><th>En Tráns.</th><th>Costo PP</th><th>Proveedor</th><th></th></tr></thead>
            <tbody>
              ${filtered.map(i => {
                const pr = Items.calcularPR(i);
                const isBajoPR = (i.stockActual + (i.enTransito || 0)) <= pr;
                const prov = i.proveedorPreferido ? Proveedores.getById(i.proveedorPreferido) : null;
                return `<tr style="${isBajoPR ? 'background:rgba(255,82,82,0.06)' : ''}">
                  <td class="text-mono fw-700">${i.sku}</td>
                  <td>${i.nombre}</td>
                  <td><span class="badge badge-muted">${i.categoria}</span></td>
                  <td class="${isBajoPR ? 'col-danger fw-700' : ''}">${i.stockActual} ${i.unidadMedida}</td>
                  <td class="text-muted">${pr}</td>
                  <td>${i.enTransito || 0}</td>
                  <td class="fw-700">${fmtCOP(i.costoPP)}</td>
                  <td class="text-sm">${prov?.nombre || '<span class="text-muted">—</span>'}</td>
                  <td><button class="btn btn-icon btn-ghost btn-sm" onclick="App.modalEditarItem(${i.id})" title="Editar"><i class="ph ph-pencil"></i></button></td>
                </tr>`;
              }).join('') || '<tr><td colspan="9" class="text-center text-muted" style="padding:2rem">Sin ítems registrados</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  generarAutomaticasUI() {
    const creadas = Ordenes.generarAutomaticas();
    if (creadas.length) { toast(`${creadas.length} OC generada(s) automáticamente`, 'success'); }
    else { toast('No hay ítems que requieran reorden automático', 'info'); }
    this.renderM2();
    this.updateBadges();
  },

  /* ══════════════════════════════════════
     M3 — ALMACÉN
  ══════════════════════════════════════ */
  renderM3() {
    const tab = this.tabs.m3;
    document.getElementById('view-m3').innerHTML = `
      <div class="tabs">
        <button class="tab-btn ${tab === 'recepcion' ? 'active' : ''}" onclick="App.tabs.m3='recepcion';App.renderM3()"><i class="ph ph-truck"></i> Recepción</button>
        <button class="tab-btn ${tab === 'inventario' ? 'active' : ''}" onclick="App.tabs.m3='inventario';App.renderM3()"><i class="ph ph-cube"></i> Inventario</button>
        <button class="tab-btn ${tab === 'entradas' ? 'active' : ''}" onclick="App.tabs.m3='entradas';App.renderM3()"><i class="ph ph-sign-in"></i> Entradas</button>
      </div>
      <div id="m3-content"></div>
    `;
    if (tab === 'recepcion') this._renderM3Recepcion();
    else if (tab === 'inventario') this._renderM3Inventario();
    else this._renderM3Entradas();
  },

  _renderM3Recepcion() {
    const pendientes = Ordenes.getAll().filter(o => ['EMITIDA', 'EN_TRANSITO'].includes(o.estado)).sort((a, b) => new Date(a.fechaEntregaComprometida || a.fechaCreacion) - new Date(b.fechaEntregaComprometida || b.fechaCreacion));

    document.getElementById('m3-content').innerHTML = `
      <div class="section-sub">Órdenes pendientes de recepción en almacén</div>
      ${pendientes.length ? `<div class="card"><div class="table-wrap"><table>
        <thead><tr><th>N° OC</th><th>Proveedor</th><th>Entrega Esperada</th><th>Ítems</th><th>Valor</th><th>Estado</th><th></th></tr></thead>
        <tbody>${pendientes.map(o => {
          const p = Proveedores.getById(o.proveedorId);
          const eBadge = o.estado === 'EN_TRANSITO' ? 'badge-info' : 'badge-primary';
          const diasE = diasHasta(o.fechaEntregaComprometida);
          const diasLabel = diasE != null ? (diasE < 0 ? `<span class="col-danger fw-700">${Math.abs(diasE)}d atrasada</span>` : diasE === 0 ? '<span class="col-warning fw-700">Hoy</span>' : `<span class="text-muted">${diasE}d</span>`) : '';
          return `<tr>
            <td class="text-mono fw-700">${o.numero}</td>
            <td>${p?.nombre || '—'}</td>
            <td>${fmtFecha(o.fechaEntregaComprometida)} ${diasLabel}</td>
            <td>${o.items?.length || 0} líneas</td>
            <td class="fw-700">${fmtCOP(o.total)}</td>
            <td><span class="badge ${eBadge}">${o.estado.replace('_', ' ')}</span></td>
            <td><button class="btn btn-sm btn-success" onclick="App.modalRecepcion(${o.id})"><i class="ph ph-package"></i> Recibir</button></td>
          </tr>`;
        }).join('')}</tbody></table></div></div>` : '<div class="empty-state"><i class="ph ph-truck"></i><p>No hay órdenes pendientes de recepción</p></div>'}
    `;
  },

  _renderM3Inventario() {
    const items = Items.getAll();
    const q = this.search.m3inv.toLowerCase();
    const filtered = q ? items.filter(i => i.sku.toLowerCase().includes(q) || i.nombre.toLowerCase().includes(q)) : items;
    const totalVal = items.reduce((s, i) => s + (i.stockActual * (i.costoPP || 0)), 0);

    document.getElementById('m3-content').innerHTML = `
      <div class="toolbar">
        <div class="search-bar"><i class="ph ph-magnifying-glass"></i><input placeholder="Buscar en inventario..." value="${this.search.m3inv}" oninput="App.search.m3inv=this.value;App._renderM3Inventario()"></div>
        <div class="toolbar-right"><span class="text-sm text-muted">Valor total: <strong class="col-primary" style="font-size:1.1rem">${fmtCOP(totalVal)}</strong></span></div>
      </div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>SKU</th><th>Nombre</th><th>Stock</th><th>Costo PP</th><th>Valor Total</th><th>Último Mov.</th><th>Estado</th></tr></thead>
          <tbody>${filtered.map(i => {
            const pr = Items.calcularPR(i);
            const bajo = i.stockActual <= pr;
            const valor = i.stockActual * (i.costoPP || 0);
            return `<tr style="${bajo ? 'background:rgba(255,82,82,0.05)' : ''}">
              <td class="text-mono fw-700">${i.sku}</td>
              <td>${i.nombre}</td>
              <td class="${bajo ? 'col-danger fw-700' : ''}">${i.stockActual} ${i.unidadMedida}</td>
              <td>${fmtCOP(i.costoPP)}</td>
              <td class="fw-700">${fmtCOP(valor)}</td>
              <td class="text-sm text-muted">${fmtFecha(i.fechaUltimoMovimiento)}</td>
              <td>${bajo ? '<span class="badge badge-danger">Bajo PR</span>' : '<span class="badge badge-success">OK</span>'}</td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">Sin ítems</td></tr>'}</tbody>
        </table></div>
      </div>
    `;
  },

  _renderM3Entradas() {
    const entradas = Entradas.getAll().sort((a, b) => new Date(b.fechaEntrada) - new Date(a.fechaEntrada));
    document.getElementById('m3-content').innerHTML = `
      <div class="card">
        <div class="card-header"><h3><i class="ph ph-sign-in"></i> Historial de Entradas</h3></div>
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Fecha</th><th>OC</th><th>Proveedor</th><th>Estado</th><th>Valor</th><th></th></tr></thead>
          <tbody>${entradas.map(e => {
            const oc = Ordenes.getById(e.ocId);
            const prov = Proveedores.getById(e.proveedorId);
            const valor = e.asientoContable?.total || 0;
            return `<tr>
              <td class="text-mono fw-700">#${e.id}</td>
              <td>${fmtFechaHora(e.fechaEntrada)}</td>
              <td class="text-mono">${oc?.numero || '—'}</td>
              <td>${prov?.nombre || '—'}</td>
              <td><span class="badge ${e.estado === 'OK' ? 'badge-success' : 'badge-warning'}">${e.estado}</span></td>
              <td class="fw-700">${fmtCOP(valor)}</td>
              <td><button class="btn btn-sm btn-ghost" onclick="App.modalAsiento(${e.id})"><i class="ph ph-book-open"></i> Asiento</button></td>
            </tr>`;
          }).join('') || '<tr><td colspan="7" class="text-center text-muted" style="padding:2rem">Sin entradas registradas</td></tr>'}</tbody>
        </table></div>
      </div>
    `;
  },

  /* ══════════════════════════════════════
     M4 — SST-COMPRAS
  ══════════════════════════════════════ */
  renderM4() {
    const alertas = Proveedores.getAlertasVencimiento();
    const vencidos = alertas.filter(a => a.status === 'vencido');
    const proximos = alertas.filter(a => a.status === 'proximo');
    const missing = alertas.filter(a => a.status === 'missing');
    const provsBloq = Proveedores.getAll().filter(p => p.estado === 'BLOQUEADO_SST').length;
    const sstLogs = AuditLog.getAll().filter(l => l.action === 'OC_BLOQUEADA' || l.action === 'SUSPENSION_AUTO' || l.entity === 'SST');

    document.getElementById('view-m4').innerHTML = `
      ${vencidos.length ? `<div class="alert-bar alert-danger"><i class="ph ph-shield-warning"></i> <strong>${vencidos.length} documento(s) SST vencido(s)</strong> — Los proveedores afectados tienen OC bloqueada automáticamente.</div>` : '<div class="alert-bar alert-success"><i class="ph ph-check-circle"></i> Todos los documentos SST están vigentes.</div>'}

      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card"><div class="s-icon" style="background:var(--success-soft);color:var(--success)"><i class="ph ph-check-circle"></i></div><div class="s-val">${alertas.length === 0 ? DOC_TYPES.filter(d=>d.obligatorio).length * Proveedores.getAll().length : '—'}</div><div class="s-lbl">Docs Vigentes</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--warning-soft);color:var(--warning)"><i class="ph ph-clock"></i></div><div class="s-val">${proximos.length}</div><div class="s-lbl">Por Vencer ≤30d</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--danger-soft);color:var(--danger)"><i class="ph ph-x-circle"></i></div><div class="s-val">${vencidos.length + missing.length}</div><div class="s-lbl">Vencidos / Faltantes</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--danger-soft);color:var(--danger)"><i class="ph ph-prohibit"></i></div><div class="s-val">${provsBloq}</div><div class="s-lbl">Proveedores Bloqueados</div></div>
      </div>

      <div class="card mb-3">
        <div class="card-header"><h3><i class="ph ph-warning"></i> Dashboard de Documentos SST</h3></div>
        <div class="table-wrap"><table>
          <thead><tr><th>Proveedor</th><th>Documento</th><th>Estado</th><th>Días</th><th></th></tr></thead>
          <tbody>${[...vencidos, ...missing, ...proximos].map(a => {
            const stCls = a.status === 'vencido' ? 'badge-danger' : a.status === 'missing' ? 'badge-danger' : 'badge-warning';
            const stLabel = a.status === 'vencido' ? 'VENCIDO' : a.status === 'missing' ? 'SIN CARGAR' : 'POR VENCER';
            return `<tr>
              <td class="fw-700" style="cursor:pointer" onclick="App.navigate('m1');App.renderM1Detail(${a.proveedorId})">${a.proveedor}</td>
              <td>${a.doc}</td>
              <td><span class="badge ${stCls}">${stLabel}</span></td>
              <td class="${a.diasRestantes < 0 ? 'col-danger fw-700' : 'col-warning'}">${a.diasRestantes === -999 ? '—' : a.diasRestantes + 'd'}</td>
              <td><button class="btn btn-sm btn-ghost" onclick="App.navigate('m1');App.renderM1Detail(${a.proveedorId})"><i class="ph ph-arrow-right"></i></button></td>
            </tr>`;
          }).join('') || '<tr><td colspan="5" class="text-center text-muted" style="padding:2rem">Sin alertas</td></tr>'}</tbody>
        </table></div>
      </div>

      ${sstLogs.length ? `<div class="card"><div class="card-header"><h3><i class="ph ph-list-bullets"></i> Log SST / Bloqueos</h3></div>
        ${sstLogs.slice(0, 15).map(l => `<div class="log-entry">
          <div class="log-icon" style="background:var(--danger-soft);color:var(--danger)"><i class="ph ph-shield-warning"></i></div>
          <div class="log-text"><span class="fw-700">${l.action}</span> — ${l.detail}<br><span class="text-xs text-muted">${l.entity} ${l.entityId}</span></div>
          <div class="log-time">${fmtFechaHora(l.ts)}</div>
        </div>`).join('')}
      </div>` : ''}
    `;
  },

  /* ══════════════════════════════════════
     M5 — REPORTES E INTELIGENCIA
  ══════════════════════════════════════ */
  renderM5() {
    const tab = this.tabs.m5;
    document.getElementById('view-m5').innerHTML = `
      <div class="tabs">
        <button class="tab-btn ${tab === 'otif' ? 'active' : ''}" onclick="App.tabs.m5='otif';App.renderM5()"><i class="ph ph-chart-bar"></i> OTIF Proveedores</button>
        <button class="tab-btn ${tab === 'inventario' ? 'active' : ''}" onclick="App.tabs.m5='inventario';App.renderM5()"><i class="ph ph-cube"></i> Inventario</button>
        <button class="tab-btn ${tab === 'auditoria' ? 'active' : ''}" onclick="App.tabs.m5='auditoria';App.renderM5()"><i class="ph ph-list-bullets"></i> Auditoría</button>
      </div>
      <div id="m5-content"></div>
    `;
    if (tab === 'otif') this._renderM5OTIF();
    else if (tab === 'inventario') this._renderM5Inventario();
    else this._renderM5Auditoria();
  },

  _renderM5OTIF() {
    const provs = Proveedores.getAll().filter(p => p.estado !== 'INACTIVO');
    const withOTIF = provs.map(p => ({ ...p, otifVal: Proveedores.getOTIF(p) })).sort((a, b) => (b.otifVal ?? -1) - (a.otifVal ?? -1));

    document.getElementById('m5-content').innerHTML = `
      <div class="section-sub">Evaluación de desempeño OTIF (On Time, In Full) por proveedor. Escala: ≥90% Estratégico · ≥75% Aceptable · &lt;75% Riesgo</div>
      <div class="toolbar"><div class="toolbar-right">
        <button class="btn btn-ghost" onclick="App.exportOTIF()"><i class="ph ph-download-simple"></i> Exportar CSV</button>
      </div></div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>#</th><th>Proveedor</th><th>OTIF %</th><th style="width:200px">Desempeño</th><th>A Tiempo</th><th>Completas</th><th>Clasificación</th></tr></thead>
          <tbody>${withOTIF.map((p, idx) => {
            const o = p.otifVal;
            const hist = p.otifHistorial?.[0];
            let clasif = 'Sin datos', clasifBadge = 'badge-muted';
            if (o != null) {
              if (o >= 90) { clasif = 'Estratégico'; clasifBadge = 'badge-success'; }
              else if (o >= 75) { clasif = 'Aceptable'; clasifBadge = 'badge-warning'; }
              else { clasif = 'En Riesgo'; clasifBadge = 'badge-danger'; }
            }
            return `<tr>
              <td class="text-muted fw-700">${idx + 1}</td>
              <td class="fw-700" style="cursor:pointer" onclick="App.navigate('m1');App.renderM1Detail(${p.id})">${p.nombre}</td>
              <td class="fw-700" style="color:${o != null ? otifColor(o) : 'var(--text-3)'}">${o != null ? o.toFixed(1) + '%' : '—'}</td>
              <td><div class="otif-bar"><div class="otif-fill" style="width:${o ?? 0}%;background:${o != null ? otifColor(o) : 'var(--text-3)'}"></div></div></td>
              <td>${hist ? hist.otifTime.toFixed(0) + '%' : '—'}</td>
              <td>${hist ? hist.otifFull.toFixed(0) + '%' : '—'}</td>
              <td><span class="badge ${clasifBadge}">${clasif}</span></td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    `;
  },

  _renderM5Inventario() {
    const items = Items.getAll();
    const cfg = Config.get();
    const totalVal = items.reduce((s, i) => s + i.stockActual * (i.costoPP || 0), 0);
    const bajoPR = Items.checkReorden().length;
    const obsoletos = Items.getObsoletos(cfg.diasObsolescencia);

    document.getElementById('m5-content').innerHTML = `
      <div class="stats-grid" style="grid-template-columns:repeat(4,1fr)">
        <div class="stat-card"><div class="s-icon" style="background:var(--purple-soft);color:var(--purple)"><i class="ph ph-vault"></i></div><div class="s-val" style="font-size:1.3rem">${fmtCOP(totalVal)}</div><div class="s-lbl">Valor Total</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--primary-soft);color:var(--primary)"><i class="ph ph-barcode"></i></div><div class="s-val">${items.length}</div><div class="s-lbl">Ítems Activos</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--danger-soft);color:var(--danger)"><i class="ph ph-warning"></i></div><div class="s-val">${bajoPR}</div><div class="s-lbl">Bajo Punto Reorden</div></div>
        <div class="stat-card"><div class="s-icon" style="background:var(--warning-soft);color:var(--warning)"><i class="ph ph-hourglass"></i></div><div class="s-val">${obsoletos.length}</div><div class="s-lbl">Obsoletos (>${cfg.diasObsolescencia}d)</div></div>
      </div>
      <div class="toolbar"><div class="toolbar-right">
        <button class="btn btn-ghost" onclick="App.exportInventario()"><i class="ph ph-download-simple"></i> Exportar CSV</button>
      </div></div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>SKU</th><th>Nombre</th><th>Stock</th><th>Valor</th><th>Días sin Mov.</th><th>Estado</th></tr></thead>
          <tbody>${items.map(i => {
            const diasSinMov = Math.floor((new Date() - new Date(i.fechaUltimoMovimiento || i.fechaCreacion)) / 86400000);
            const esObsoleto = diasSinMov > cfg.diasObsolescencia;
            const pr = Items.calcularPR(i);
            const bajoPR = i.stockActual <= pr;
            let stBadge = '<span class="badge badge-success">Normal</span>';
            if (esObsoleto) stBadge = '<span class="badge badge-warning">Obsoleto</span>';
            if (bajoPR) stBadge = '<span class="badge badge-danger">Bajo PR</span>';
            return `<tr style="${esObsoleto ? 'background:rgba(245,166,35,0.04)' : bajoPR ? 'background:rgba(255,82,82,0.04)' : ''}">
              <td class="text-mono fw-700">${i.sku}</td>
              <td>${i.nombre}</td>
              <td class="${bajoPR ? 'col-danger fw-700' : ''}">${i.stockActual} ${i.unidadMedida}</td>
              <td class="fw-700">${fmtCOP(i.stockActual * (i.costoPP || 0))}</td>
              <td class="${esObsoleto ? 'col-warning fw-700' : 'text-muted'}">${diasSinMov}d</td>
              <td>${stBadge}</td>
            </tr>`;
          }).join('')}</tbody>
        </table></div>
      </div>
    `;
  },

  _renderM5Auditoria() {
    const logs = AuditLog.getAll();
    const q = this.search.m5audit.toLowerCase();
    const filtered = q ? logs.filter(l => l.action.toLowerCase().includes(q) || l.detail.toLowerCase().includes(q) || l.entity.toLowerCase().includes(q) || l.userId.toLowerCase().includes(q)) : logs;

    document.getElementById('m5-content').innerHTML = `
      <div class="toolbar">
        <div class="search-bar"><i class="ph ph-magnifying-glass"></i><input placeholder="Buscar en auditoría..." value="${this.search.m5audit}" oninput="App.search.m5audit=this.value;App._renderM5Auditoria()"></div>
        <div class="toolbar-right">
          <button class="btn btn-ghost" onclick="App.exportAuditoria()"><i class="ph ph-download-simple"></i> Exportar CSV</button>
        </div>
      </div>
      <div class="card">
        <div class="table-wrap"><table>
          <thead><tr><th>Fecha/Hora</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>ID</th><th>Detalle</th></tr></thead>
          <tbody>${filtered.slice(0, 100).map(l => `<tr>
            <td class="text-mono text-xs">${fmtFechaHora(l.ts)}</td>
            <td class="text-sm fw-700">${l.userId}</td>
            <td><span class="badge badge-muted">${l.action}</span></td>
            <td class="text-sm">${l.entity}</td>
            <td class="text-mono text-xs">${l.entityId}</td>
            <td class="text-sm">${l.detail}</td>
          </tr>`).join('') || '<tr><td colspan="6" class="text-center text-muted" style="padding:2rem">Sin registros de auditoría</td></tr>'}</tbody>
        </table></div>
      </div>
    `;
  },

  /* ══════════════════════════════════════
     CONFIG
  ══════════════════════════════════════ */
  renderConfig() {
    const cfg = Config.get();
    document.getElementById('view-config').innerHTML = `
      <div style="max-width:600px">
        <div class="section-title"><i class="ph ph-gear"></i> Configuración del Sistema</div>
        <div class="section-sub">Parámetros globales para el módulo de Compras, Proveedores y Almacén.</div>

        <div class="card mb-3">
          <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:1rem">Parámetros de Negocio</h3>
          <div class="form-grid-2">
            <div class="form-group">
              <label>Método de Valorización</label>
              <select id="cfg-metodo">
                <option value="CPP" ${cfg.metodoValorizacion === 'CPP' ? 'selected' : ''}>Costo Promedio Ponderado (CPP)</option>
                <option value="PEPS" ${cfg.metodoValorizacion === 'PEPS' ? 'selected' : ''}>PEPS (Primeras en Entrar, Primeras en Salir)</option>
              </select>
              <div class="hint">NIIF para PYMES Sección 13. LIFO no permitido.</div>
            </div>
            <div class="form-group">
              <label>Días Alerta Vencimiento</label>
              <input type="number" id="cfg-alerta" value="${cfg.alertaVencimientoDias}" min="1" max="90">
              <div class="hint">Días antes del vencimiento para generar alerta.</div>
            </div>
            <div class="form-group">
              <label>Días Obsolescencia</label>
              <input type="number" id="cfg-obsol" value="${cfg.diasObsolescencia}" min="30" max="365">
              <div class="hint">Ítems sin movimiento mayor a estos días se marcan como obsoletos.</div>
            </div>
          </div>
          <div style="margin-top:1.25rem">
            <button class="btn btn-primary" onclick="App.guardarConfig()"><i class="ph ph-floppy-disk"></i> Guardar Configuración</button>
          </div>
        </div>

        <div class="card">
          <h3 style="font-size:0.9rem;font-weight:700;margin-bottom:0.5rem;color:var(--danger)"><i class="ph ph-warning"></i> Zona de Peligro</h3>
          <p class="text-sm text-muted mb-2">Restaurar los datos de demostración eliminará toda la información actual del módulo.</p>
          <button class="btn btn-danger" onclick="App.resetDemo()"><i class="ph ph-arrow-counter-clockwise"></i> Reiniciar Datos Demo</button>
        </div>
      </div>
    `;
  },

  guardarConfig() {
    Config.set({
      metodoValorizacion: document.getElementById('cfg-metodo').value,
      alertaVencimientoDias: parseInt(document.getElementById('cfg-alerta').value) || 30,
      diasObsolescencia: parseInt(document.getElementById('cfg-obsol').value) || 90,
    });
    toast('Configuración guardada correctamente', 'success');
    AuditLog.add('CONFIG', 'SISTEMA', '—', 'Configuración actualizada');
  },

  resetDemo() {
    if (confirm('¿Borrar todos los datos y cargar datos demo? Esta acción no se puede deshacer.')) {
      Object.values(DB.KEYS).forEach(k => localStorage.removeItem(k));
      cargarDatosDemo();
      this.navigate('hub');
      toast('Datos demo restaurados', 'success');
    }
  },

  /* ══════════════════════════════════════
     MODALES — PROVEEDORES
  ══════════════════════════════════════ */
  modalNuevoProveedor() {
    this.openModal(`
      <div class="modal-header"><h3><i class="ph ph-user-plus"></i> Nuevo Proveedor</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <form onsubmit="event.preventDefault();App.guardarProveedor()">
        <div class="form-grid-2">
          <div class="form-group"><label>Razón Social *</label><input id="prov-nombre" required placeholder="Nombre de la empresa"></div>
          <div class="form-group"><label>Régimen</label><select id="prov-regimen"><option value="ORDINARIO">Ordinario</option><option value="SIMPLIFICADO">Simplificado</option><option value="GRAN_CONTRIBUYENTE">Gran Contribuyente</option></select></div>
          <div class="form-group"><label>NIT *</label><input id="prov-nit" required placeholder="900123456" pattern="[0-9]+" title="Solo números"></div>
          <div class="form-group"><label>DV</label><input id="prov-dv" placeholder="1" maxlength="1" style="width:60px"></div>
          <div class="form-group"><label>Contacto</label><input id="prov-contacto" placeholder="Nombre del contacto"></div>
          <div class="form-group"><label>Teléfono</label><input id="prov-telefono" placeholder="300 123 4567"></div>
          <div class="form-group"><label>Email</label><input id="prov-email" type="email" placeholder="correo@empresa.co"></div>
          <div class="form-group"><label>Ciudad</label><input id="prov-ciudad" placeholder="Ciudad"></div>
          <div class="form-group"><label>Categoría</label><select id="prov-categoria"><option value="MATERIA_PRIMA">Materia Prima</option><option value="INSUMOS">Insumos</option><option value="HERRAJES">Herrajes</option><option value="QUIMICOS">Químicos</option><option value="EMPAQUES">Empaques</option><option value="SERVICIOS">Servicios</option><option value="GENERAL">General</option></select></div>
          <div class="form-group"><label>Dirección</label><input id="prov-direccion" placeholder="Dirección"></div>
        </div>
        <div class="form-group mt-2"><label>Notas</label><textarea id="prov-notas" rows="2" placeholder="Observaciones..."></textarea></div>
        <div class="alert-bar alert-info mt-2"><i class="ph ph-info"></i> Los documentos de homologación se cargan después del registro. El proveedor quedará en estado PENDIENTE hasta completar los documentos obligatorios.<br><span class="text-xs">En cumplimiento de la Ley 1581 de 2012, los datos personales serán tratados conforme a la política de privacidad de DIMALCCO SAS.</span></div>
        <div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary"><i class="ph ph-check"></i> Registrar Proveedor</button></div>
      </form>
    `, 'modal-lg');
  },

  guardarProveedor() {
    const nombre = document.getElementById('prov-nombre').value.trim();
    const nit = document.getElementById('prov-nit').value.trim();
    if (!nombre || !nit) { toast('Nombre y NIT son obligatorios', 'error'); return; }
    try {
      Proveedores.crear({
        nombre, nit,
        dv: document.getElementById('prov-dv').value.trim(),
        regimen: document.getElementById('prov-regimen').value,
        contacto: document.getElementById('prov-contacto').value.trim(),
        telefono: document.getElementById('prov-telefono').value.trim(),
        email: document.getElementById('prov-email').value.trim(),
        ciudad: document.getElementById('prov-ciudad').value.trim(),
        categoria: document.getElementById('prov-categoria').value,
        direccion: document.getElementById('prov-direccion').value.trim(),
        notas: document.getElementById('prov-notas').value.trim(),
      });
      this.closeModal();
      toast('Proveedor registrado exitosamente', 'success');
      if (this.currentView === 'm1') this.renderM1();
      else if (this.currentView === 'hub') this.renderHub();
      this.updateBadges();
    } catch (e) { toast(e.message, 'error'); }
  },

  modalEditarDoc(provId, docKey) {
    const p = Proveedores.getById(provId);
    const dt = DOC_TYPES.find(d => d.key === docKey);
    if (!p || !dt) return;
    const doc = p.documentos?.[docKey];
    const fechaActual = doc?.vencimiento || '';

    this.openModal(`
      <div class="modal-header"><h3><i class="ph ${dt.icon}"></i> ${dt.label}</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <p class="text-sm text-muted mb-2">Proveedor: <strong>${p.nombre}</strong></p>
      <div class="form-group">
        <label>Fecha de Vencimiento</label>
        <input type="date" id="doc-venc" value="${fechaActual}">
        <div class="hint">Máxima vigencia recomendada: ${dt.maxMeses} meses</div>
      </div>
      <div class="modal-footer"><button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button class="btn btn-primary" onclick="App.guardarDoc(${provId},'${docKey}')"><i class="ph ph-check"></i> Guardar</button></div>
    `, 'modal-sm');
  },

  guardarDoc(provId, docKey) {
    const venc = document.getElementById('doc-venc').value;
    if (!venc) { toast('Selecciona una fecha de vencimiento', 'error'); return; }
    Proveedores.actualizarDocumento(provId, docKey, { vencimiento: venc });
    this.closeModal();
    toast('Documento actualizado', 'success');
    if (this.currentView === 'm1') this.renderM1Detail(provId);
    this.updateBadges();
  },

  /* ══════════════════════════════════════
     MODALES — COMPRAS / OC
  ══════════════════════════════════════ */
  modalNuevaOC() {
    const provsHomol = Proveedores.getAll().filter(p => Proveedores.calcularEstado(p) === 'HOMOLOGADO');
    const items = Items.getAll();
    if (!provsHomol.length) { toast('No hay proveedores HOMOLOGADOS. Registre y homologue al menos uno.', 'error'); return; }

    this.openModal(`
      <div class="modal-header"><h3><i class="ph ph-shopping-bag"></i> Nueva Orden de Compra</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <form onsubmit="event.preventDefault();App.guardarOC()">
        <div class="form-grid-2">
          <div class="form-group">
            <label>Proveedor *</label>
            <select id="oc-prov" required>
              <option value="">Seleccionar proveedor...</option>
              ${provsHomol.map(p => `<option value="${p.id}">${p.nombre} (NIT ${p.nit})</option>`).join('')}
            </select>
          </div>
          <div class="form-group"><label>Fecha Entrega Comprometida *</label><input type="date" id="oc-entrega" required></div>
        </div>
        <hr class="divider">
        <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.75rem">Líneas de la Orden</h4>
        <div id="oc-lineas"></div>
        <button type="button" class="btn btn-sm btn-ghost mt-1" onclick="App.addLineaOC()"><i class="ph ph-plus"></i> Agregar Línea</button>
        <hr class="divider">
        <div style="display:flex;justify-content:flex-end;gap:1rem;align-items:center">
          <span class="text-muted">Total: </span><span id="oc-total" class="fw-700" style="font-size:1.3rem;color:var(--primary)">$0</span>
        </div>
        <div class="form-group mt-2"><label>Notas</label><textarea id="oc-notas" rows="2" placeholder="Observaciones..."></textarea></div>
        <div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary"><i class="ph ph-check"></i> Crear OC</button></div>
      </form>
    `, 'modal-lg');
    this.addLineaOC();
  },

  _ocLineaIdx: 0,
  addLineaOC() {
    const items = Items.getAll();
    const idx = this._ocLineaIdx++;
    const container = document.getElementById('oc-lineas');
    const row = document.createElement('div');
    row.className = 'form-row';
    row.id = `oc-line-${idx}`;
    row.innerHTML = `
      <div class="form-group" style="flex:3"><label>Ítem</label><select id="oc-item-${idx}" onchange="App.onLineaItemChange(${idx})">
        <option value="">Seleccionar...</option>
        ${items.map(i => `<option value="${i.id}" data-costo="${i.costoPP}">${i.sku} — ${i.nombre}</option>`).join('')}
      </select></div>
      <div class="form-group" style="flex:1"><label>Cantidad</label><input type="number" id="oc-cant-${idx}" min="1" value="1" oninput="App.calcTotalOC()"></div>
      <div class="form-group" style="flex:1"><label>Precio Unit.</label><input type="number" id="oc-precio-${idx}" min="0" value="0" oninput="App.calcTotalOC()"></div>
      <div class="form-group" style="flex:0 0 40px;justify-content:flex-end"><label>&nbsp;</label><button type="button" class="btn btn-icon btn-ghost btn-sm" onclick="document.getElementById('oc-line-${idx}').remove();App.calcTotalOC()"><i class="ph ph-trash" style="color:var(--danger)"></i></button></div>
    `;
    container.appendChild(row);
  },

  onLineaItemChange(idx) {
    const sel = document.getElementById(`oc-item-${idx}`);
    const opt = sel.options[sel.selectedIndex];
    const costo = opt?.dataset?.costo || 0;
    document.getElementById(`oc-precio-${idx}`).value = Math.round(costo);
    this.calcTotalOC();
  },

  calcTotalOC() {
    let total = 0;
    document.querySelectorAll('[id^="oc-line-"]').forEach(row => {
      const idx = row.id.split('-').pop();
      const cant = parseFloat(document.getElementById(`oc-cant-${idx}`)?.value) || 0;
      const precio = parseFloat(document.getElementById(`oc-precio-${idx}`)?.value) || 0;
      total += cant * precio;
    });
    const el = document.getElementById('oc-total');
    if (el) el.textContent = fmtCOP(total);
  },

  guardarOC() {
    const provId = document.getElementById('oc-prov').value;
    const entrega = document.getElementById('oc-entrega').value;
    if (!provId) { toast('Selecciona un proveedor', 'error'); return; }
    if (!entrega) { toast('Fecha de entrega es obligatoria', 'error'); return; }

    const items = [];
    document.querySelectorAll('[id^="oc-line-"]').forEach(row => {
      const idx = row.id.split('-').pop();
      const itemId = document.getElementById(`oc-item-${idx}`)?.value;
      const cantidad = parseFloat(document.getElementById(`oc-cant-${idx}`)?.value) || 0;
      const precio = parseFloat(document.getElementById(`oc-precio-${idx}`)?.value) || 0;
      if (itemId && cantidad > 0) {
        const item = Items.getById(itemId);
        items.push({ itemId: parseInt(itemId), sku: item?.sku || '', nombre: item?.nombre || '', cantidad, precio });
      }
    });

    if (!items.length) { toast('Agrega al menos una línea', 'error'); return; }

    try {
      const oc = Ordenes.crear({
        proveedorId: parseInt(provId),
        items,
        fechaEntrega: entrega,
        estado: 'EMITIDA',
        notas: document.getElementById('oc-notas').value.trim(),
      });
      this.closeModal();
      this._ocLineaIdx = 0;
      toast(`OC ${oc.numero} creada exitosamente`, 'success');
      if (this.currentView === 'm2') this.renderM2();
      else if (this.currentView === 'hub') this.renderHub();
      this.updateBadges();
    } catch (e) {
      toast(e.message, 'error');
    }
  },

  modalDetalleOC(ocId) {
    const o = Ordenes.getById(ocId);
    if (!o) return;
    const p = Proveedores.getById(o.proveedorId);
    const eBadge = { BORRADOR: 'badge-muted', EMITIDA: 'badge-primary', EN_TRANSITO: 'badge-info', RECIBIDA: 'badge-success', NOVEDAD: 'badge-warning', CANCELADA: 'badge-danger' };

    let accionesHTML = '';
    if (o.estado === 'BORRADOR') {
      accionesHTML = `<button class="btn btn-primary" onclick="App.cambiarEstadoOC(${o.id},'EMITIDA')"><i class="ph ph-paper-plane-right"></i> Emitir OC</button>`;
    } else if (o.estado === 'EMITIDA') {
      accionesHTML = `<button class="btn btn-info" style="background:var(--info);color:#0a1a2a" onclick="App.cambiarEstadoOC(${o.id},'EN_TRANSITO')"><i class="ph ph-truck"></i> Marcar En Tránsito</button>`;
    }
    if (['BORRADOR', 'EMITIDA'].includes(o.estado)) {
      accionesHTML += ` <button class="btn btn-danger btn-sm" onclick="if(confirm('¿Cancelar esta OC?')){App.cancelarOC(${o.id})}"><i class="ph ph-x-circle"></i> Cancelar</button>`;
    }

    this.openModal(`
      <div class="modal-header">
        <h3><i class="ph ph-list-numbers"></i> ${o.numero}</h3>
        <button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button>
      </div>
      <div style="display:flex;gap:1rem;align-items:center;margin-bottom:1.25rem">
        <span class="badge ${eBadge[o.estado]}" style="font-size:0.85rem;padding:0.3rem 0.7rem">${o.estado.replace('_', ' ')}</span>
        <span class="badge ${o.tipo === 'AUTOMATICA' ? 'badge-purple' : 'badge-muted'}">${o.tipo}</span>
        <span style="margin-left:auto;font-size:1.2rem;font-weight:800;color:var(--primary)">${fmtCOP(o.total)}</span>
      </div>
      <div class="detail-panel mb-2">
        <div class="detail-row"><div class="detail-label">Proveedor</div><div class="detail-value">${p?.nombre || '—'}</div></div>
        <div class="detail-row"><div class="detail-label">Fecha Creación</div><div class="detail-value">${fmtFechaHora(o.fechaCreacion)}</div></div>
        <div class="detail-row"><div class="detail-label">Entrega Comprometida</div><div class="detail-value">${fmtFecha(o.fechaEntregaComprometida)}</div></div>
        <div class="detail-row"><div class="detail-label">Recepción Real</div><div class="detail-value">${fmtFechaHora(o.fechaRecepcionReal) || '—'}</div></div>
        <div class="detail-row"><div class="detail-label">Usuario</div><div class="detail-value">${o.userId}</div></div>
        <div class="detail-row"><div class="detail-label">Notas</div><div class="detail-value">${o.notas || '—'}</div></div>
      </div>
      <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem">Líneas</h4>
      <div class="table-wrap mb-2"><table>
        <thead><tr><th>SKU</th><th>Ítem</th><th>Cantidad</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
        <tbody>${(o.items || []).map(li => `<tr>
          <td class="text-mono">${li.sku || '—'}</td>
          <td>${li.nombre || '—'}</td>
          <td>${li.cantidad}</td>
          <td>${fmtCOP(li.precio)}</td>
          <td class="fw-700">${fmtCOP(li.cantidad * li.precio)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      ${accionesHTML ? `<div class="modal-footer">${accionesHTML}</div>` : ''}
    `, 'modal-lg');
  },

  cambiarEstadoOC(id, nuevoEstado) {
    Ordenes.actualizar(id, { estado: nuevoEstado });
    this.closeModal();
    toast(`OC actualizada a ${nuevoEstado.replace('_', ' ')}`, 'success');
    if (this.currentView === 'm2') this.renderM2();
    else if (this.currentView === 'hub') this.renderHub();
    this.updateBadges();
  },

  cancelarOC(id) {
    Ordenes.cancelar(id, 'Cancelada por usuario');
    this.closeModal();
    toast('OC cancelada', 'warning');
    if (this.currentView === 'm2') this.renderM2();
    this.updateBadges();
  },

  /* ══════════════════════════════════════
     MODALES — ÍTEMS
  ══════════════════════════════════════ */
  modalNuevoItem() {
    const provs = Proveedores.getAll().filter(p => p.estado === 'HOMOLOGADO');
    this.openModal(`
      <div class="modal-header"><h3><i class="ph ph-barcode"></i> Nuevo Ítem</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <form onsubmit="event.preventDefault();App.guardarItem()">
        <div class="form-grid-3">
          <div class="form-group"><label>SKU *</label><input id="item-sku" required placeholder="MAD-001"></div>
          <div class="form-group" style="grid-column:span 2"><label>Nombre *</label><input id="item-nombre" required placeholder="Nombre del material"></div>
          <div class="form-group"><label>Categoría</label><select id="item-cat"><option value="MADERA">Madera</option><option value="HERRAJES">Herrajes</option><option value="PINTURA">Pintura</option><option value="QUIMICOS">Químicos</option><option value="EMPAQUES">Empaques</option><option value="OTROS">Otros</option></select></div>
          <div class="form-group"><label>Unidad Medida</label><select id="item-um"><option value="UND">UND</option><option value="GL">GL</option><option value="KG">KG</option><option value="MT">MT</option><option value="CJA">CJA</option><option value="RLL">RLL</option><option value="LT">LT</option></select></div>
          <div class="form-group"><label>Stock Inicial</label><input type="number" id="item-stock" min="0" value="0"></div>
          <div class="form-group"><label>Stock Seguridad</label><input type="number" id="item-seg" min="0" value="5"></div>
          <div class="form-group"><label>Lead Time (días)</label><input type="number" id="item-lead" min="1" value="7"></div>
          <div class="form-group"><label>Consumo Diario</label><input type="number" id="item-consumo" min="0" value="1" step="0.5"></div>
          <div class="form-group"><label>Costo Unitario</label><input type="number" id="item-costo" min="0" value="0"></div>
          <div class="form-group" style="grid-column:span 2"><label>Proveedor Preferido</label><select id="item-prov"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}</select></div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary"><i class="ph ph-check"></i> Crear Ítem</button></div>
      </form>
    `, 'modal-lg');
  },

  guardarItem() {
    const sku = document.getElementById('item-sku').value.trim();
    const nombre = document.getElementById('item-nombre').value.trim();
    if (!sku || !nombre) { toast('SKU y nombre son obligatorios', 'error'); return; }
    try {
      Items.crear({
        sku, nombre,
        categoria: document.getElementById('item-cat').value,
        unidadMedida: document.getElementById('item-um').value,
        stockActual: parseFloat(document.getElementById('item-stock').value) || 0,
        stockSeguridad: parseFloat(document.getElementById('item-seg').value) || 0,
        leadTimeDias: parseInt(document.getElementById('item-lead').value) || 7,
        consumoDiario: parseFloat(document.getElementById('item-consumo').value) || 0,
        costoPP: parseFloat(document.getElementById('item-costo').value) || 0,
        proveedorPreferido: document.getElementById('item-prov').value || null,
      });
      this.closeModal();
      toast('Ítem creado exitosamente', 'success');
      if (this.currentView === 'm2') this.renderM2();
    } catch (e) { toast(e.message, 'error'); }
  },

  modalEditarItem(id) {
    const item = Items.getById(id);
    if (!item) return;
    const provs = Proveedores.getAll().filter(p => p.estado === 'HOMOLOGADO');
    this.openModal(`
      <div class="modal-header"><h3><i class="ph ph-pencil"></i> Editar Ítem: ${item.sku}</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <form onsubmit="event.preventDefault();App.guardarEdicionItem(${id})">
        <div class="form-grid-3">
          <div class="form-group"><label>SKU</label><input value="${item.sku}" disabled></div>
          <div class="form-group" style="grid-column:span 2"><label>Nombre *</label><input id="eitem-nombre" required value="${item.nombre}"></div>
          <div class="form-group"><label>Stock Seguridad</label><input type="number" id="eitem-seg" min="0" value="${item.stockSeguridad}"></div>
          <div class="form-group"><label>Lead Time (días)</label><input type="number" id="eitem-lead" min="1" value="${item.leadTimeDias}"></div>
          <div class="form-group"><label>Consumo Diario</label><input type="number" id="eitem-consumo" min="0" value="${item.consumoDiario}" step="0.5"></div>
          <div class="form-group" style="grid-column:span 3"><label>Proveedor Preferido</label><select id="eitem-prov"><option value="">Sin asignar</option>${provs.map(p => `<option value="${p.id}" ${item.proveedorPreferido == p.id ? 'selected' : ''}>${p.nombre}</option>`).join('')}</select></div>
        </div>
        <div class="modal-footer"><button type="button" class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button type="submit" class="btn btn-primary"><i class="ph ph-check"></i> Guardar</button></div>
      </form>
    `);
  },

  guardarEdicionItem(id) {
    Items.actualizar(id, {
      nombre: document.getElementById('eitem-nombre').value.trim(),
      stockSeguridad: parseFloat(document.getElementById('eitem-seg').value) || 0,
      leadTimeDias: parseInt(document.getElementById('eitem-lead').value) || 7,
      consumoDiario: parseFloat(document.getElementById('eitem-consumo').value) || 0,
      proveedorPreferido: document.getElementById('eitem-prov').value || null,
    });
    this.closeModal();
    toast('Ítem actualizado', 'success');
    if (this.currentView === 'm2') this.renderM2();
  },

  /* ══════════════════════════════════════
     MODALES — RECEPCIÓN ALMACÉN
  ══════════════════════════════════════ */
  modalRecepcion(ocId) {
    const oc = Ordenes.getById(ocId);
    if (!oc) return;
    const p = Proveedores.getById(oc.proveedorId);

    const lineasHTML = (oc.items || []).map((li, idx) => `
      <div class="form-row" style="align-items:center">
        <div class="form-group" style="flex:2"><label>${idx === 0 ? 'Ítem' : '&nbsp;'}</label><input value="${li.sku} — ${li.nombre}" disabled></div>
        <div class="form-group" style="flex:1"><label>${idx === 0 ? 'Cant. OC' : '&nbsp;'}</label><input value="${li.cantidad}" disabled></div>
        <div class="form-group" style="flex:1"><label>${idx === 0 ? 'Cant. Recibida' : '&nbsp;'}</label><input type="number" id="rec-cant-${idx}" min="0" value="${li.cantidad}"></div>
        <div class="form-group" style="flex:1"><label>${idx === 0 ? 'Costo Unit.' : '&nbsp;'}</label><input type="number" id="rec-costo-${idx}" min="0" value="${li.precio}"></div>
      </div>
    `).join('');

    this.openModal(`
      <div class="modal-header"><h3><i class="ph ph-package"></i> Recepción — ${oc.numero}</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <p class="text-sm text-muted mb-2">Proveedor: <strong>${p?.nombre || '—'}</strong> · Fecha comprometida: <strong>${fmtFecha(oc.fechaEntregaComprometida)}</strong></p>
      <hr class="divider">
      <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.5rem">Validación Física</h4>
      ${lineasHTML}
      <hr class="divider">
      <h4 style="font-size:0.85rem;font-weight:700;margin-bottom:0.75rem">Validación Documental</h4>
      <div class="form-grid-3">
        <div class="form-group"><label><input type="checkbox" id="rec-remision" checked> Remisión OK</label></div>
        <div class="form-group"><label><input type="checkbox" id="rec-factura" checked> Factura DIAN OK</label></div>
        <div class="form-group"><label><input type="checkbox" id="rec-msds"> MSDS (si aplica)</label></div>
      </div>
      <div class="form-group mt-2"><label>Novedades / Observaciones</label><textarea id="rec-novedades" rows="3" placeholder="Describir novedades si las hay..."></textarea></div>
      <div class="alert-bar alert-info mt-1"><i class="ph ph-info"></i> Al guardar se actualizará el inventario en tiempo real y se generará el asiento contable de entrada (${Config.get().metodoValorizacion}).</div>
      <div class="modal-footer"><button class="btn btn-ghost" onclick="App.closeModal()">Cancelar</button><button class="btn btn-success" onclick="App.guardarRecepcion(${ocId})"><i class="ph ph-check-circle"></i> Confirmar Recepción</button></div>
    `, 'modal-lg');
  },

  guardarRecepcion(ocId) {
    const oc = Ordenes.getById(ocId);
    if (!oc) return;

    const items = (oc.items || []).map((li, idx) => ({
      itemId: li.itemId,
      cantidadRecibida: parseFloat(document.getElementById(`rec-cant-${idx}`).value) || 0,
      cantidadOC: li.cantidad,
      costo: parseFloat(document.getElementById(`rec-costo-${idx}`).value) || li.precio,
    }));

    const documentos = {
      remision: document.getElementById('rec-remision').checked,
      facturaDIAN: document.getElementById('rec-factura').checked,
      msdsOk: document.getElementById('rec-msds').checked,
    };

    try {
      const entrada = Entradas.crear({
        ocId, proveedorId: oc.proveedorId, items, documentos,
        novedades: document.getElementById('rec-novedades').value.trim(),
        userId: 'USUARIO',
      });
      this.closeModal();
      toast(`Entrada #${entrada.id} registrada — ${entrada.estado === 'NOVEDAD' ? 'Con novedades' : 'OK'}`, entrada.estado === 'NOVEDAD' ? 'warning' : 'success');
      if (this.currentView === 'm3') this.renderM3();
      else if (this.currentView === 'hub') this.renderHub();
      this.updateBadges();
    } catch (e) { toast(e.message, 'error'); }
  },

  modalAsiento(entradaId) {
    const e = Entradas.getById(entradaId);
    if (!e || !e.asientoContable) { toast('Sin asiento contable', 'info'); return; }
    const a = e.asientoContable;
    this.openModal(`
      <div class="modal-header"><h3><i class="ph ph-book-open"></i> Asiento Contable — Entrada #${e.id}</h3><button class="btn btn-icon btn-ghost" onclick="App.closeModal()"><i class="ph ph-x"></i></button></div>
      <div class="alert-bar alert-info"><i class="ph ph-info"></i> Asiento generado automáticamente según NIIF para PYMES Sección 13 — Método: ${Config.get().metodoValorizacion}</div>
      <p class="text-sm text-muted mb-2">${a.descripcion}</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Cuenta</th><th>Nombre</th><th>Débito</th><th>Crédito</th></tr></thead>
        <tbody>
          <tr><td class="text-mono">${a.debito.cuenta}</td><td>${a.debito.nombre}</td><td class="fw-700 col-success">${fmtCOP(a.debito.valor)}</td><td>—</td></tr>
          <tr><td class="text-mono">${a.credito.cuenta}</td><td>${a.credito.nombre}</td><td>—</td><td class="fw-700 col-danger">${fmtCOP(a.credito.valor)}</td></tr>
          <tr style="border-top:2px solid var(--border)"><td colspan="2" class="fw-700 text-right">Total</td><td class="fw-700">${fmtCOP(a.total)}</td><td class="fw-700">${fmtCOP(a.total)}</td></tr>
        </tbody>
      </table></div>
      <p class="text-xs text-muted mt-2">Fecha: ${fmtFechaHora(e.fechaEntrada)} · Usuario: ${e.userId} · Conciliación 100% con cuenta de inventarios (activo).</p>
    `, 'modal-lg');
  },

  /* ══════════════════════════════════════
     EXPORTS
  ══════════════════════════════════════ */
  exportOTIF() {
    const provs = Proveedores.getAll();
    const headers = ['Proveedor', 'NIT', 'Estado', 'OTIF %', 'A Tiempo %', 'Completas %', 'Clasificación'];
    const rows = provs.map(p => {
      const otif = Proveedores.getOTIF(p);
      const hist = p.otifHistorial?.[0];
      let clasif = 'Sin datos';
      if (otif != null) { clasif = otif >= 90 ? 'Estratégico' : otif >= 75 ? 'Aceptable' : 'En Riesgo'; }
      return [p.nombre, p.nit, p.estado, otif?.toFixed(1) ?? '—', hist?.otifTime?.toFixed(0) ?? '—', hist?.otifFull?.toFixed(0) ?? '—', clasif];
    });
    exportCSV(headers, rows, `OTIF_Proveedores_${new Date().toISOString().split('T')[0]}.csv`);
    toast('Reporte OTIF exportado', 'success');
  },

  exportInventario() {
    const items = Items.getAll();
    const cfg = Config.get();
    const headers = ['SKU', 'Nombre', 'Categoría', 'Stock', 'Unidad', 'Costo PP', 'Valor Total', 'Punto Reorden', 'Días sin Mov.', 'Estado'];
    const rows = items.map(i => {
      const diasSinMov = Math.floor((new Date() - new Date(i.fechaUltimoMovimiento || i.fechaCreacion)) / 86400000);
      const pr = Items.calcularPR(i);
      let estado = 'Normal';
      if (i.stockActual <= pr) estado = 'Bajo PR';
      else if (diasSinMov > cfg.diasObsolescencia) estado = 'Obsoleto';
      return [i.sku, i.nombre, i.categoria, i.stockActual, i.unidadMedida, i.costoPP, i.stockActual * (i.costoPP || 0), pr, diasSinMov, estado];
    });
    exportCSV(headers, rows, `Inventario_${new Date().toISOString().split('T')[0]}.csv`);
    toast('Inventario exportado', 'success');
  },

  exportAuditoria() {
    const logs = AuditLog.getAll();
    const headers = ['Fecha/Hora', 'Usuario', 'Acción', 'Entidad', 'ID', 'Detalle'];
    const rows = logs.map(l => [fmtFechaHora(l.ts), l.userId, l.action, l.entity, l.entityId, l.detail]);
    exportCSV(headers, rows, `Auditoria_${new Date().toISOString().split('T')[0]}.csv`);
    toast('Log de auditoría exportado', 'success');
  },
};

/* ── BOOT ── */
document.addEventListener('DOMContentLoaded', () => App.init());
