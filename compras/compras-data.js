/* ═══════════════════════════════════════════════════════════════
   DIMALCCO SAS — compras-data.js  v1.0  |  09-Jul-2026
   Capa de datos: localStorage CRUD + reglas de negocio + datos demo
   ═══════════════════════════════════════════════════════════════ */

'use strict';

const DB = {
  KEYS: {
    proveedores: 'dim_compras_proveedores',
    items:       'dim_compras_items',
    ordenes:     'dim_compras_ordenes',
    entradas:    'dim_compras_entradas',
    config:      'dim_compras_config',
    auditLog:    'dim_compras_audit_log',
  },

  get(key) {
    try { return JSON.parse(localStorage.getItem(key)) || []; }
    catch { return []; }
  },
  getObj(key, def = {}) {
    try { return JSON.parse(localStorage.getItem(key)) || def; }
    catch { return def; }
  },
  set(key, val) { localStorage.setItem(key, JSON.stringify(val)); },

  nextId(arr, prefix = '') {
    const maxId = arr.reduce((m, x) => Math.max(m, parseInt(x.id) || 0), 0);
    return prefix ? `${prefix}${String(maxId + 1).padStart(4,'0')}` : (maxId + 1);
  },
};

/* ──────────────────────────────────────
   AUDIT LOG
────────────────────────────────────── */
const AuditLog = {
  add(action, entity, entityId, detail = '', userId = 'SISTEMA') {
    const logs = DB.get(DB.KEYS.auditLog);
    logs.unshift({
      id: Date.now(),
      ts: new Date().toISOString(),
      userId,
      action,
      entity,
      entityId: String(entityId),
      detail,
    });
    // Mantener máximo 500 registros
    DB.set(DB.KEYS.auditLog, logs.slice(0, 500));
  },
  getAll() { return DB.get(DB.KEYS.auditLog); },
};

/* ──────────────────────────────────────
   CONFIGURACIÓN
────────────────────────────────────── */
const Config = {
  defaults: {
    metodoValorizacion: 'CPP',      // CPP | PEPS
    alertaVencimientoDias: 30,
    otifPeriodos: 3,                // meses a evaluar para OTIF
    diasObsolescencia: 90,
    moneda: 'COP',
  },
  get()       { return { ...this.defaults, ...DB.getObj(DB.KEYS.config) }; },
  set(newCfg) { DB.set(DB.KEYS.config, { ...this.get(), ...newCfg }); },
};

/* ──────────────────────────────────────
   PROVEEDORES (M1)
────────────────────────────────────── */
const DOC_TYPES = [
  { key: 'rut',            label: 'RUT Actualizado',                       icon: 'ph-identification-card', maxMeses: 3,  obligatorio: true  },
  { key: 'camara',         label: 'Cámara de Comercio',                    icon: 'ph-buildings',           maxMeses: 3,  obligatorio: true  },
  { key: 'planillaSS',     label: 'Planilla Seguridad Social',             icon: 'ph-users',               maxMeses: 1,  obligatorio: true  },
  { key: 'certificadoARL', label: 'Certificado ARL',                       icon: 'ph-shield-check',        maxMeses: 12, obligatorio: true  },
  { key: 'polizaRC',       label: 'Póliza Responsabilidad Civil',          icon: 'ph-paper-plane',         maxMeses: 12, obligatorio: false },
  { key: 'fichasMSDS',     label: 'Fichas Técnicas / MSDS',               icon: 'ph-flask',               maxMeses: 24, obligatorio: false },
];

const Proveedores = {
  getAll()   { return DB.get(DB.KEYS.proveedores); },
  getById(id){ return this.getAll().find(p => p.id == id) || null; },

  calcularEstado(p) {
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const cfg = Config.get();
    const alerta = cfg.alertaVencimientoDias;

    let todosBien = true;
    let docSSTVencido = false;
    const sstKeys = ['planillaSS','certificadoARL'];

    for (const dt of DOC_TYPES) {
      if (!dt.obligatorio) continue;
      const doc = p.documentos?.[dt.key];
      if (!doc?.vencimiento) { todosBien = false; break; }
      const venc = new Date(doc.vencimiento); venc.setHours(0,0,0,0);
      if (venc < hoy) {
        todosBien = false;
        if (sstKeys.includes(dt.key)) docSSTVencido = true;
      }
    }

    if (p.periodosSuspension >= 2) return 'SUSPENDIDO';
    if (p.estadoForzado === 'INACTIVO') return 'INACTIVO';
    if (docSSTVencido) return 'BLOQUEADO_SST';
    if (!todosBien)    return 'PENDIENTE';
    return 'HOMOLOGADO';
  },

  getEstadoColor(estado) {
    const m = { HOMOLOGADO:'success', PENDIENTE:'warning', BLOQUEADO_SST:'danger', SUSPENDIDO:'danger', INACTIVO:'muted' };
    return m[estado] || 'muted';
  },

  getDocEstado(doc, maxMeses) {
    if (!doc?.vencimiento) return 'missing';
    const hoy = new Date(); hoy.setHours(0,0,0,0);
    const venc = new Date(doc.vencimiento); venc.setHours(0,0,0,0);
    const diasRestantes = Math.floor((venc - hoy) / 86400000);
    const alerta = Config.get().alertaVencimientoDias;
    if (diasRestantes < 0)      return { status:'vencido',  dias: diasRestantes, label: `Venció hace ${Math.abs(diasRestantes)}d` };
    if (diasRestantes <= alerta) return { status:'proximo',  dias: diasRestantes, label: `Vence en ${diasRestantes}d` };
    return { status:'vigente', dias: diasRestantes, label: `Vigente · ${diasRestantes}d` };
  },

  crear(data) {
    const arr = this.getAll();
    const p = {
      id: DB.nextId(arr),
      nit: data.nit, dv: data.dv,
      nombre: data.nombre,
      regimen: data.regimen || 'COMUN',
      contacto: data.contacto || '',
      telefono: data.telefono || '',
      email: data.email || '',
      direccion: data.direccion || '',
      ciudad: data.ciudad || '',
      categoria: data.categoria || 'GENERAL',
      documentos: data.documentos || {},
      periodosSuspension: 0,
      estadoForzado: null,
      fechaRegistro: new Date().toISOString(),
      otifHistorial: [],
      notas: data.notas || '',
    };
    p.estado = this.calcularEstado(p);
    arr.push(p);
    DB.set(DB.KEYS.proveedores, arr);
    AuditLog.add('CREAR', 'PROVEEDOR', p.id, `Proveedor ${p.nombre} registrado`);
    return p;
  },

  actualizar(id, data) {
    const arr = this.getAll();
    const idx = arr.findIndex(p => p.id == id);
    if (idx < 0) return null;
    arr[idx] = { ...arr[idx], ...data };
    arr[idx].estado = this.calcularEstado(arr[idx]);
    DB.set(DB.KEYS.proveedores, arr);
    AuditLog.add('EDITAR', 'PROVEEDOR', id, `Proveedor actualizado`);
    return arr[idx];
  },

  actualizarDocumento(id, docKey, docData) {
    const arr = this.getAll();
    const idx = arr.findIndex(p => p.id == id);
    if (idx < 0) return null;
    arr[idx].documentos = arr[idx].documentos || {};
    arr[idx].documentos[docKey] = { ...docData, fechaCarga: new Date().toISOString() };
    arr[idx].estado = this.calcularEstado(arr[idx]);
    DB.set(DB.KEYS.proveedores, arr);
    AuditLog.add('DOC_UPLOAD', 'PROVEEDOR', id, `Documento '${docKey}' actualizado`);
    return arr[idx];
  },

  registrarOTIF(proveedorId, periodo, otifTime, otifFull) {
    const arr = this.getAll();
    const idx = arr.findIndex(p => p.id == proveedorId);
    if (idx < 0) return;
    const otif = (otifTime + otifFull) / 2;
    arr[idx].otifHistorial = arr[idx].otifHistorial || [];
    arr[idx].otifHistorial.unshift({ periodo, otifTime, otifFull, otif, fecha: new Date().toISOString() });
    arr[idx].otifHistorial = arr[idx].otifHistorial.slice(0, 12);

    // Revisar suspensión automática
    const ultimos = arr[idx].otifHistorial.slice(0, 2);
    if (ultimos.length >= 2 && ultimos.every(o => o.otif < 75)) {
      arr[idx].periodosSuspension = (arr[idx].periodosSuspension || 0) + 1;
      if (arr[idx].periodosSuspension >= 2) {
        arr[idx].estado = 'SUSPENDIDO';
        AuditLog.add('SUSPENSION_AUTO', 'PROVEEDOR', proveedorId, `OTIF < 75% por 2 períodos consecutivos`);
      }
    }
    DB.set(DB.KEYS.proveedores, arr);
  },

  getOTIF(p) {
    if (!p.otifHistorial?.length) return null;
    return p.otifHistorial[0].otif;
  },

  getAlertasVencimiento() {
    const proveedores = this.getAll();
    const cfg = Config.get();
    const alertas = [];
    const hoy = new Date(); hoy.setHours(0,0,0,0);

    for (const p of proveedores) {
      if (p.estado === 'INACTIVO') continue;
      for (const dt of DOC_TYPES) {
        const doc = p.documentos?.[dt.key];
        if (!doc?.vencimiento) {
          if (dt.obligatorio) alertas.push({ proveedorId: p.id, proveedor: p.nombre, doc: dt.label, diasRestantes: -999, status: 'missing' });
          continue;
        }
        const venc = new Date(doc.vencimiento); venc.setHours(0,0,0,0);
        const dias = Math.floor((venc - hoy) / 86400000);
        if (dias <= cfg.alertaVencimientoDias) {
          alertas.push({ proveedorId: p.id, proveedor: p.nombre, doc: dt.label, diasRestantes: dias, status: dias < 0 ? 'vencido' : 'proximo' });
        }
      }
    }
    return alertas.sort((a,b) => a.diasRestantes - b.diasRestantes);
  },
};

/* ──────────────────────────────────────
   ITEMS / SKU (M2 + M3)
────────────────────────────────────── */
const Items = {
  getAll()    { return DB.get(DB.KEYS.items); },
  getById(id) { return this.getAll().find(x => x.id == id) || null; },
  getBySKU(sku){ return this.getAll().find(x => x.sku === sku) || null; },

  calcularPR(item) {
    return Math.ceil((item.consumoDiario || 0) * (item.leadTimeDias || 0) + (item.stockSeguridad || 0));
  },

  checkReorden() {
    const items = this.getAll();
    const alertas = [];
    for (const item of items) {
      const pr = this.calcularPR(item);
      const disponible = (item.stockActual || 0) + (item.enTransito || 0);
      if (disponible <= pr) {
        alertas.push({ ...item, puntoReorden: pr, disponible, deficit: pr - disponible });
      }
    }
    return alertas;
  },

  crear(data) {
    const arr = this.getAll();
    // Validar SKU único
    if (arr.find(x => x.sku === data.sku)) throw new Error(`SKU '${data.sku}' ya existe`);
    const item = {
      id: DB.nextId(arr),
      sku: data.sku,
      nombre: data.nombre,
      descripcion: data.descripcion || '',
      categoria: data.categoria || '',
      unidadMedida: data.unidadMedida || 'UND',
      stockActual: Number(data.stockActual) || 0,
      stockSeguridad: Number(data.stockSeguridad) || 0,
      leadTimeDias: Number(data.leadTimeDias) || 7,
      consumoDiario: Number(data.consumoDiario) || 0,
      enTransito: 0,
      costoPP: Number(data.costoPP) || 0,
      capasPEPS: [],
      proveedorPreferido: data.proveedorPreferido || null,
      historialPrecios: [],
      fechaCreacion: new Date().toISOString(),
      fechaUltimoMovimiento: new Date().toISOString(),
      activo: true,
    };
    item.puntoReorden = this.calcularPR(item);
    arr.push(item);
    DB.set(DB.KEYS.items, arr);
    AuditLog.add('CREAR', 'ITEM', item.id, `Ítem ${item.sku} - ${item.nombre} creado`);
    return item;
  },

  actualizar(id, data) {
    const arr = this.getAll();
    const idx = arr.findIndex(x => x.id == id);
    if (idx < 0) return null;
    arr[idx] = { ...arr[idx], ...data };
    arr[idx].puntoReorden = this.calcularPR(arr[idx]);
    DB.set(DB.KEYS.items, arr);
    AuditLog.add('EDITAR', 'ITEM', id, `Ítem actualizado`);
    return arr[idx];
  },

  ajustarStock(id, cantidad, costo, metodo = null) {
    const cfg = Config.get();
    const met = metodo || cfg.metodoValorizacion;
    const arr = this.getAll();
    const idx = arr.findIndex(x => x.id == id);
    if (idx < 0) return null;

    const item = arr[idx];
    const cantAnterior = item.stockActual || 0;
    const costoAnterior = item.costoPP || 0;

    if (met === 'CPP') {
      // Costo Promedio Ponderado
      const totalValor = (cantAnterior * costoAnterior) + (cantidad * costo);
      const totalCant  = cantAnterior + cantidad;
      item.costoPP = totalCant > 0 ? totalValor / totalCant : costo;
    } else {
      // PEPS — agregar capa
      item.capasPEPS = item.capasPEPS || [];
      item.capasPEPS.push({ fecha: new Date().toISOString(), cantidad, costo });
      // Costo unitario PEPS = costo de la capa más antigua disponible (aprox)
      item.costoPP = item.capasPEPS[0]?.costo || costo;
    }

    item.stockActual = cantAnterior + cantidad;
    item.fechaUltimoMovimiento = new Date().toISOString();
    item.puntoReorden = this.calcularPR(item);

    // Historial de precios
    item.historialPrecios = item.historialPrecios || [];
    item.historialPrecios.unshift({ fecha: new Date().toISOString(), costo, cantidad });
    item.historialPrecios = item.historialPrecios.slice(0, 50);

    DB.set(DB.KEYS.items, arr);
    return arr[idx];
  },

  consumirStock(id, cantidad) {
    const arr = this.getAll();
    const idx = arr.findIndex(x => x.id == id);
    if (idx < 0) return null;
    arr[idx].stockActual = Math.max(0, (arr[idx].stockActual || 0) - cantidad);
    arr[idx].fechaUltimoMovimiento = new Date().toISOString();
    DB.set(DB.KEYS.items, arr);
    AuditLog.add('CONSUMO', 'ITEM', id, `Consumo de ${cantidad} ${arr[idx].unidadMedida}`);
    return arr[idx];
  },

  getObsoletos(dias) {
    const hoy = new Date();
    return this.getAll().filter(item => {
      const ult = new Date(item.fechaUltimoMovimiento || item.fechaCreacion);
      return Math.floor((hoy - ult) / 86400000) > (dias || Config.get().diasObsolescencia);
    });
  },
};

/* ──────────────────────────────────────
   ÓRDENES DE COMPRA (M2)
────────────────────────────────────── */
const Ordenes = {
  getAll()    { return DB.get(DB.KEYS.ordenes); },
  getById(id) { return this.getAll().find(o => o.id == id) || null; },

  ESTADOS: ['BORRADOR','EMITIDA','EN_TRANSITO','RECIBIDA','NOVEDAD','CANCELADA'],

  // Genera número correlativo OC-YYYY-NNNN
  generarNumero() {
    const arr = this.getAll();
    const año = new Date().getFullYear();
    const delAño = arr.filter(o => o.numero?.startsWith(`OC-${año}`));
    const seq = (delAño.length + 1);
    return `OC-${año}-${String(seq).padStart(4,'0')}`;
  },

  validarProveedor(proveedorId) {
    const p = Proveedores.getById(proveedorId);
    if (!p) return { ok: false, msg: 'Proveedor no encontrado' };
    const estado = Proveedores.calcularEstado(p);
    if (estado !== 'HOMOLOGADO') {
      AuditLog.add('OC_BLOQUEADA', 'ORDEN', '—', `Intento de OC a proveedor ${p.nombre} en estado ${estado}`);
      return { ok: false, msg: `Proveedor "${p.nombre}" en estado ${estado}. No puede recibir OC.` };
    }
    return { ok: true, proveedor: p };
  },

  crear(data, tipo = 'MANUAL') {
    const validacion = this.validarProveedor(data.proveedorId);
    if (!validacion.ok) throw new Error(validacion.msg);

    const arr = this.getAll();
    const total = (data.items || []).reduce((s, it) => s + (it.cantidad * it.precio), 0);

    const orden = {
      id: DB.nextId(arr),
      numero: this.generarNumero(),
      tipo,
      proveedorId: data.proveedorId,
      items: data.items || [],
      fechaCreacion: new Date().toISOString(),
      fechaEntregaComprometida: data.fechaEntrega || null,
      fechaRecepcionReal: null,
      estado: data.estado || 'BORRADOR',
      total,
      notas: data.notas || '',
      novedades: [],
      userId: data.userId || 'USUARIO',
    };

    // Marcar items en tránsito
    for (const li of orden.items) {
      const itemArr = Items.getAll();
      const iIdx = itemArr.findIndex(x => x.id == li.itemId);
      if (iIdx >= 0) {
        itemArr[iIdx].enTransito = (itemArr[iIdx].enTransito || 0) + li.cantidad;
        DB.set(DB.KEYS.items, itemArr);
      }
    }

    arr.push(orden);
    DB.set(DB.KEYS.ordenes, arr);
    AuditLog.add('CREAR', 'ORDEN', orden.id, `OC ${orden.numero} creada — ${fmtCOP(total)} — Tipo: ${tipo}`);
    return orden;
  },

  actualizar(id, data) {
    const arr = this.getAll();
    const idx = arr.findIndex(o => o.id == id);
    if (idx < 0) return null;
    arr[idx] = { ...arr[idx], ...data };
    DB.set(DB.KEYS.ordenes, arr);
    AuditLog.add('EDITAR', 'ORDEN', id, `OC ${arr[idx].numero} actualizada — estado: ${arr[idx].estado}`);
    return arr[idx];
  },

  cancelar(id, motivo = '') {
    const arr = this.getAll();
    const idx = arr.findIndex(o => o.id == id);
    if (idx < 0) return null;
    const orden = arr[idx];
    // Revertir en tránsito
    for (const li of orden.items) {
      const itemArr = Items.getAll();
      const iIdx = itemArr.findIndex(x => x.id == li.itemId);
      if (iIdx >= 0) {
        itemArr[iIdx].enTransito = Math.max(0, (itemArr[iIdx].enTransito || 0) - li.cantidad);
        DB.set(DB.KEYS.items, itemArr);
      }
    }
    arr[idx].estado = 'CANCELADA';
    arr[idx].notasCancelacion = motivo;
    DB.set(DB.KEYS.ordenes, arr);
    AuditLog.add('CANCELAR', 'ORDEN', id, `OC ${arr[idx].numero} cancelada. Motivo: ${motivo}`);
    return arr[idx];
  },

  generarAutomaticas() {
    const alertas = Items.checkReorden();
    const creadas = [];
    for (const item of alertas) {
      if (!item.proveedorPreferido) continue;
      const val = Proveedores.calcularEstado(Proveedores.getById(item.proveedorPreferido));
      if (val !== 'HOMOLOGADO') continue;
      // Verificar que no haya OC activa para el mismo ítem
      const ocs = this.getAll();
      const activa = ocs.find(o =>
        ['BORRADOR','EMITIDA','EN_TRANSITO'].includes(o.estado) &&
        o.items?.some(li => li.itemId == item.id)
      );
      if (activa) continue;

      const cantPedido = Math.max(item.puntoReorden * 2, item.consumoDiario * (item.leadTimeDias * 2));
      try {
        const oc = this.crear({
          proveedorId: item.proveedorPreferido,
          items: [{ itemId: item.id, nombre: item.nombre, sku: item.sku, cantidad: Math.ceil(cantPedido), precio: item.costoPP || 0 }],
          estado: 'BORRADOR',
          notas: `Generada automáticamente por punto de reorden (Stock: ${item.stockActual}, PR: ${item.puntoReorden})`,
        }, 'AUTOMATICA');
        creadas.push(oc);
      } catch(e) { /* proveedor bloqueado */ }
    }
    return creadas;
  },
};

/* ──────────────────────────────────────
   ENTRADAS DE ALMACÉN (M3)
────────────────────────────────────── */
const Entradas = {
  getAll()    { return DB.get(DB.KEYS.entradas); },
  getById(id) { return this.getAll().find(e => e.id == id) || null; },

  crear(data) {
    // data: { ocId, proveedorId, items:[{itemId, cantidadRecibida, cantidadOC, costo}],
    //         documentos:{remision, facturaDIAN, msdsOk}, novedades, userId }
    const cfg = Config.get();
    const arr = this.getAll();

    const hayNovedad = data.items.some(li => li.cantidadRecibida < li.cantidadOC);
    const estado = (data.novedades?.trim() || hayNovedad) ? 'NOVEDAD' : 'OK';

    const entrada = {
      id: DB.nextId(arr),
      ocId: data.ocId,
      proveedorId: data.proveedorId,
      items: data.items,
      fechaEntrada: new Date().toISOString(),
      userId: data.userId || 'USUARIO',
      documentos: data.documentos || {},
      estado,
      novedades: data.novedades || '',
      asientoContable: null,
    };

    // Actualizar inventario
    let totalCosto = 0;
    for (const li of entrada.items) {
      Items.ajustarStock(li.itemId, li.cantidadRecibida, li.costo, cfg.metodoValorizacion);
      totalCosto += li.cantidadRecibida * li.costo;
    }

    // Generar asiento contable
    entrada.asientoContable = {
      fecha: entrada.fechaEntrada,
      descripcion: `Entrada almacén #${DB.nextId(arr)} — OC ${data.ocId}`,
      debito:  { cuenta: '14350500', nombre: 'Inventario de Materias Primas', valor: totalCosto },
      credito: { cuenta: '22050500', nombre: 'Cuentas por Pagar Proveedores', valor: totalCosto },
      total: totalCosto,
    };

    // Actualizar OC estado
    if (data.ocId) {
      Ordenes.actualizar(data.ocId, {
        estado: estado === 'NOVEDAD' ? 'NOVEDAD' : 'RECIBIDA',
        fechaRecepcionReal: entrada.fechaEntrada,
      });
      // Limpiar en tránsito
      const oc = Ordenes.getById(data.ocId);
      if (oc) {
        for (const li of oc.items) {
          const itemArr = Items.getAll();
          const iIdx = itemArr.findIndex(x => x.id == li.itemId);
          if (iIdx >= 0) {
            itemArr[iIdx].enTransito = Math.max(0, (itemArr[iIdx].enTransito || 0) - li.cantidad);
            DB.set(DB.KEYS.items, itemArr);
          }
        }
      }
    }

    // OTIF
    if (data.ocId && data.proveedorId) {
      this._calcularOTIF(data.ocId, data.proveedorId, entrada);
    }

    arr.push(entrada);
    DB.set(DB.KEYS.entradas, arr);
    AuditLog.add('ENTRADA', 'ALMACEN', entrada.id, `Entrada #${entrada.id} — Estado: ${estado}`);
    return entrada;
  },

  _calcularOTIF(ocId, provId, entrada) {
    const oc = Ordenes.getById(ocId);
    if (!oc || !oc.fechaEntregaComprometida) return;

    const fechaCompro = new Date(oc.fechaEntregaComprometida);
    const fechaReal   = new Date(entrada.fechaEntrada);
    const aTiempo = fechaReal <= fechaCompro;

    const totalPedido   = oc.items.reduce((s,li) => s + li.cantidad, 0);
    const totalRecibido = entrada.items.reduce((s,li) => s + li.cantidadRecibida, 0);
    const completo = totalRecibido >= totalPedido;

    const periodo = `${fechaReal.getFullYear()}-${String(fechaReal.getMonth()+1).padStart(2,'0')}`;
    Proveedores.registrarOTIF(provId, periodo, aTiempo ? 100 : 0, completo ? 100 : (totalRecibido/totalPedido*100));
  },
};

/* ──────────────────────────────────────
   HELPERS DE FORMATO
────────────────────────────────────── */
function fmtCOP(n) {
  if (n == null || isNaN(n)) return '$0';
  return '$' + Math.round(n).toLocaleString('es-CO');
}

function fmtFecha(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('es-CO', { day:'2-digit', month:'short', year:'numeric' });
}

function fmtFechaHora(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleString('es-CO', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function diasHasta(iso) {
  if (!iso) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const venc = new Date(iso); venc.setHours(0,0,0,0);
  return Math.floor((venc - hoy) / 86400000);
}

function otifColor(v) {
  if (v >= 90) return 'var(--success)';
  if (v >= 75) return 'var(--warning)';
  return 'var(--danger)';
}

function otifBadge(v) {
  if (v == null) return '<span class="badge badge-muted">Sin datos</span>';
  if (v >= 90) return `<span class="badge badge-success">${v.toFixed(1)}%</span>`;
  if (v >= 75) return `<span class="badge badge-warning">${v.toFixed(1)}%</span>`;
  return `<span class="badge badge-danger">${v.toFixed(1)}%</span>`;
}

/* ──────────────────────────────────────
   DATOS DEMO
────────────────────────────────────── */
function cargarDatosDemo() {
  const hoy = new Date();
  const addMeses = (m) => { const d = new Date(hoy); d.setMonth(d.getMonth() + m); return d.toISOString().split('T')[0]; };
  const subMeses = (m) => { const d = new Date(hoy); d.setMonth(d.getMonth() - m); return d.toISOString().split('T')[0]; };
  const addDias  = (d) => { const dt = new Date(hoy); dt.setDate(dt.getDate() + d); return dt.toISOString().split('T')[0]; };

  // ── PROVEEDORES DEMO ──
  const proveedoresDemo = [
    {
      nit:'900123456', dv:'1', nombre:'Maderas del Norte SAS', regimen:'ORDINARIO',
      contacto:'Juan Restrepo', telefono:'3001234567', email:'compras@maderadelNorte.co',
      ciudad:'Medellín', categoria:'MATERIA_PRIMA',
      documentos:{
        rut:            { vencimiento: addMeses(2) },
        camara:         { vencimiento: addMeses(2) },
        planillaSS:     { vencimiento: addMeses(0) },
        certificadoARL: { vencimiento: addMeses(8) },
        polizaRC:       { vencimiento: addMeses(10) },
        fichasMSDS:     { vencimiento: addMeses(18) },
      },
      otifHistorial:[
        { periodo:'2026-06', otifTime:95, otifFull:100, otif:97.5, fecha: subMeses(1) + 'T00:00:00Z' },
        { periodo:'2026-05', otifTime:90, otifFull:95,  otif:92.5, fecha: subMeses(2) + 'T00:00:00Z' },
      ],
    },
    {
      nit:'800456789', dv:'3', nombre:'Herrajes PRO Ltda.', regimen:'ORDINARIO',
      contacto:'María Ospina', telefono:'3109876543', email:'ventas@herrajespro.com',
      ciudad:'Bogotá', categoria:'INSUMOS',
      documentos:{
        rut:            { vencimiento: addMeses(1) },
        camara:         { vencimiento: addMeses(1) },
        planillaSS:     { vencimiento: addDias(5) },
        certificadoARL: { vencimiento: addMeses(6) },
      },
      otifHistorial:[
        { periodo:'2026-06', otifTime:80, otifFull:85, otif:82.5, fecha: subMeses(1) + 'T00:00:00Z' },
      ],
    },
    {
      nit:'700234567', dv:'2', nombre:'Pinturas Master Colombia', regimen:'ORDINARIO',
      contacto:'Carlos Gómez', telefono:'3152345678', email:'info@pinturasMaster.co',
      ciudad:'Cali', categoria:'MATERIA_PRIMA',
      documentos:{
        rut:            { vencimiento: subMeses(1) },    // VENCIDO
        camara:         { vencimiento: addMeses(3) },
        planillaSS:     { vencimiento: addMeses(0) },
        certificadoARL: { vencimiento: subMeses(2) },    // VENCIDO SST
        fichasMSDS:     { vencimiento: addMeses(12) },
      },
      otifHistorial:[
        { periodo:'2026-06', otifTime:60, otifFull:70, otif:65, fecha: subMeses(1) + 'T00:00:00Z' },
        { periodo:'2026-05', otifTime:65, otifFull:68, otif:66.5, fecha: subMeses(2) + 'T00:00:00Z' },
      ],
    },
    {
      nit:'901234567', dv:'8', nombre:'Químicos Industriales del Valle', regimen:'ORDINARIO',
      contacto:'Andrés Silva', telefono:'3204567890', email:'ventas@quimicosValle.com',
      ciudad:'Palmira', categoria:'MATERIA_PRIMA',
      documentos:{
        rut:            { vencimiento: addMeses(3) },
        camara:         { vencimiento: addMeses(3) },
        planillaSS:     { vencimiento: addMeses(0) },
        certificadoARL: { vencimiento: addMeses(11) },
        polizaRC:       { vencimiento: addMeses(9) },
        fichasMSDS:     { vencimiento: addMeses(20) },
      },
      otifHistorial:[
        { periodo:'2026-06', otifTime:100, otifFull:100, otif:100, fecha: subMeses(1) + 'T00:00:00Z' },
      ],
    },
    {
      nit:'860012345', dv:'5', nombre:'Empaques & Logística SAS', regimen:'SIMPLIFICADO',
      contacto:'Laura Martínez', telefono:'3177654321', email:'lmartinez@empaques.co',
      ciudad:'Barranquilla', categoria:'EMPAQUES',
      documentos:{},  // Sin documentos — PENDIENTE
    },
  ];

  const pArr = [];
  for (const pd of proveedoresDemo) {
    const p = {
      id: DB.nextId(pArr) + pArr.length,
      ...pd,
      periodosSuspension: pd.nombre.includes('Pinturas') ? 2 : 0,
      estadoForzado: null,
      fechaRegistro: subMeses(6) + 'T00:00:00Z',
      notas: '',
    };
    p.estado = Proveedores.calcularEstado(p);
    pArr.push(p);
  }
  DB.set(DB.KEYS.proveedores, pArr);

  // ── ITEMS DEMO ──
  const itemsDemo = [
    { sku:'MAD-001', nombre:'Madera Pino Cepillada 2x4x8ft', categoria:'MADERA', unidadMedida:'UND', stockActual:45, stockSeguridad:20, leadTimeDias:5, consumoDiario:8, costoPP:32000, proveedorPreferido: pArr[0].id },
    { sku:'MAD-002', nombre:'Tablero MDF 15mm 1.22x2.44m',  categoria:'MADERA', unidadMedida:'UND', stockActual:12, stockSeguridad:8,  leadTimeDias:7, consumoDiario:3, costoPP:85000, proveedorPreferido: pArr[0].id },
    { sku:'HRJ-001', nombre:'Bisagra Piano 1.80m Acero',     categoria:'HERRAJES', unidadMedida:'UND', stockActual:200, stockSeguridad:50, leadTimeDias:3, consumoDiario:15, costoPP:18000, proveedorPreferido: pArr[1].id },
    { sku:'HRJ-002', nombre:'Tornillo MDF 4x40mm (caja 200)', categoria:'HERRAJES', unidadMedida:'CJA', stockActual:8, stockSeguridad:5, leadTimeDias:3, consumoDiario:2, costoPP:12000, proveedorPreferido: pArr[1].id },
    { sku:'PIN-001', nombre:'Laca Nitrocelulosa Brillo GL',  categoria:'PINTURA', unidadMedida:'GL', stockActual:6, stockSeguridad:10, leadTimeDias:4, consumoDiario:3, costoPP:95000, proveedorPreferido: pArr[2].id },
    { sku:'QUI-001', nombre:'Sellador Base Agua GL',         categoria:'QUIMICOS', unidadMedida:'GL', stockActual:25, stockSeguridad:8, leadTimeDias:5, consumoDiario:4, costoPP:78000, proveedorPreferido: pArr[3].id },
    { sku:'EMP-001', nombre:'Zunchos Plásticos 16mm (rollo)', categoria:'EMPAQUES', unidadMedida:'RLL', stockActual:3, stockSeguridad:4, leadTimeDias:2, consumoDiario:1, costoPP:45000, proveedorPreferido: null },
  ];
  const iArr = [];
  for (const id of itemsDemo) {
    const item = { id: DB.nextId(iArr) + iArr.length, ...id, enTransito:0, capasPEPS:[], historialPrecios:[], fechaCreacion: subMeses(3)+'T00:00:00Z', fechaUltimoMovimiento: subMeses(Math.floor(Math.random()*20)+1)+'T00:00:00Z', activo:true };
    item.puntoReorden = Items.calcularPR(item);
    iArr.push(item);
  }
  DB.set(DB.KEYS.items, iArr);

  // ── ÓRDENES DEMO ──
  const oArr = [];
  const ocDemos = [
    { numero:'OC-2026-0021', proveedorId:pArr[0].id, estado:'RECIBIDA', tipo:'MANUAL', total:1440000, fechaCreacion:subMeses(2)+'T10:00:00Z', fechaEntregaComprometida:subMeses(1)+'T00:00:00Z', fechaRecepcionReal:subMeses(1)+'T00:00:00Z', items:[{itemId:iArr[0].id,sku:'MAD-001',nombre:'Madera Pino',cantidad:45,precio:32000}], notas:'', novedades:[] },
    { numero:'OC-2026-0022', proveedorId:pArr[1].id, estado:'RECIBIDA', tipo:'MANUAL', total:360000,  fechaCreacion:subMeses(1)+'T09:00:00Z', fechaEntregaComprometida:addDias(-15)+'T00:00:00Z', fechaRecepcionReal:addDias(-14)+'T00:00:00Z', items:[{itemId:iArr[2].id,sku:'HRJ-001',nombre:'Bisagra Piano',cantidad:20,precio:18000}], notas:'', novedades:[] },
    { numero:'OC-2026-0023', proveedorId:pArr[3].id, estado:'EN_TRANSITO', tipo:'AUTOMATICA', total:1950000, fechaCreacion:addDias(-5)+'T08:00:00Z', fechaEntregaComprometida:addDias(2)+'T00:00:00Z', fechaRecepcionReal:null, items:[{itemId:iArr[5].id,sku:'QUI-001',nombre:'Sellador Base Agua',cantidad:25,precio:78000}], notas:'Generada automáticamente por punto de reorden', novedades:[] },
    { numero:'OC-2026-0024', proveedorId:pArr[0].id, estado:'EMITIDA',     tipo:'MANUAL', total:2550000, fechaCreacion:addDias(-2)+'T11:00:00Z', fechaEntregaComprometida:addDias(5)+'T00:00:00Z', fechaRecepcionReal:null, items:[{itemId:iArr[1].id,sku:'MAD-002',nombre:'Tablero MDF',cantidad:30,precio:85000}], notas:'', novedades:[] },
    { numero:'OC-2026-0025', proveedorId:pArr[0].id, estado:'BORRADOR',    tipo:'AUTOMATICA', total:512000, fechaCreacion:addDias(-1)+'T07:00:00Z', fechaEntregaComprometida:addDias(7)+'T00:00:00Z', fechaRecepcionReal:null, items:[{itemId:iArr[0].id,sku:'MAD-001',nombre:'Madera Pino',cantidad:16,precio:32000}], notas:'Generada automáticamente — Stock bajo punto de reorden', novedades:[] },
  ];
  for (const od of ocDemos) {
    oArr.push({ id: DB.nextId(oArr) + oArr.length, userId:'SISTEMA', ...od });
  }
  DB.set(DB.KEYS.ordenes, oArr);

  // ── ENTRADAS DEMO ──
  const eArr = [];
  eArr.push({
    id:1, ocId:oArr[0].id, proveedorId:pArr[0].id,
    items:[{ itemId:iArr[0].id, cantidadRecibida:45, cantidadOC:45, costo:32000 }],
    fechaEntrada: subMeses(1)+'T14:00:00Z',
    userId:'ALMACENISTA', estado:'OK', novedades:'',
    documentos:{ remision:'REM-2345', facturaDIAN:'FE-678901', msdsOk:false },
    asientoContable:{ descripcion:'Entrada madera pino', debito:{cuenta:'14350500',nombre:'Inventario MP',valor:1440000}, credito:{cuenta:'22050500',nombre:'CxP Proveedores',valor:1440000}, total:1440000 },
  });
  eArr.push({
    id:2, ocId:oArr[1].id, proveedorId:pArr[1].id,
    items:[{ itemId:iArr[2].id, cantidadRecibida:18, cantidadOC:20, costo:18000 }],
    fechaEntrada: addDias(-14)+'T11:30:00Z',
    userId:'ALMACENISTA', estado:'NOVEDAD', novedades:'Faltaron 2 unidades. Se generó reclamo al proveedor.',
    documentos:{ remision:'REM-9012', facturaDIAN:'FE-234567', msdsOk:false },
    asientoContable:{ descripcion:'Entrada bisagras (parcial)', debito:{cuenta:'14350500',nombre:'Inventario MP',valor:324000}, credito:{cuenta:'22050500',nombre:'CxP Proveedores',valor:324000}, total:324000 },
  });
  DB.set(DB.KEYS.entradas, eArr);

  AuditLog.add('SISTEMA', 'DEMO', 'ALL', 'Datos demo cargados exitosamente');
}

function initDatos() {
  const provs = DB.get(DB.KEYS.proveedores);
  if (!provs.length) cargarDatosDemo();
}
