const MONTHS = [{ "key": 2, "label": "Marzo" }, { "key": 3, "label": "Abril" }, { "key": 4, "label": "Mayo" }, { "key": 5, "label": "Junio" }, { "key": 6, "label": "Julio" }, { "key": 7, "label": "Agosto" }, { "key": 8, "label": "Septiembre" }, { "key": 9, "label": "Octubre" }, { "key": 10, "label": "Noviembre" }, { "key": 11, "label": "Diciembre" }];

// Base mock data for testing
const BASE = {
    2: { // Marzo
        2: [{ id: 'b_1', text: 'Reunión de planificación Q2', resp: 'Juan', pri: 'ALTA', done: true, origin: 'base' }],
        5: [{ id: 'b_2', text: 'Revisión preliminar estados financieros', resp: 'Ana', pri: 'MEDIA', done: false, origin: 'base' }],
        15: [{ id: 'b_3', text: 'Cierre de ciclo mensual', resp: 'Sistema', pri: 'ALTA', done: false, origin: 'base' }],
        20: [{ id: 'b_4', text: 'Presentación junta directiva', resp: 'Gerencia', pri: 'ALTA', done: false, origin: 'base' }]
    },
    3: { // Abril
        10: [{ id: 'b_5', text: 'Envío impuestos nacionales', resp: 'Ana', pri: 'ALTA', done: false, origin: 'base' }],
        25: [{ id: 'b_6', text: 'Auditoría interna procesos', resp: 'Control', pri: 'MEDIA', done: false, origin: 'base' }]
    }
};

const STORAGE_KEY = 'agenda2026_dimalcco_offline_pro_v1_publicidad';

function norm(s) { return (s || '').toString().trim().toLowerCase(); }
function pct(done, total) { return total ? Math.round((done / total) * 100) : 0; }

function priClass(pri) {
    const v = norm(pri);
    if (v.includes('alta') || v === 'high') return 'pri-high';
    if (v.includes('baja') || v === 'low') return 'pri-low';
    return 'pri-medium';
}

function daysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }

function buildInitial() {
    const data = { month: 2, view: 'month', tasks: {} };
    for (const m of MONTHS) {
        const mi = m.key;
        data.tasks[mi] = {};
        const dim = daysInMonth(2026, mi);
        for (let d = 1; d <= dim; d++) data.tasks[mi][d] = [];
        const baseMonth = BASE[mi] || {};
        for (const dayStr in baseMonth) {
            const day = parseInt(dayStr);
            if (!data.tasks[mi][day]) continue;
            data.tasks[mi][day] = baseMonth[day].map(t => ({
                id: t.id,
                text: t.text,
                resp: t.resp,
                pri: t.pri,
                done: !!t.done,
                origin: t.origin || 'base'
            }));
        }
    }
    return data;
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return buildInitial();
        const parsed = JSON.parse(raw);
        if (!parsed.tasks) return buildInitial();
        return parsed;
    } catch (e) { return buildInitial(); }
}

let state = load();
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

const monthSelect = document.getElementById('monthSelect');
const viewEl = document.getElementById('view');
const searchEl = document.getElementById('search');
const filterRespEl = document.getElementById('filterResp');
const filterPriEl = document.getElementById('filterPri');
const filterStatusEl = document.getElementById('filterStatus');

function initMonthSelect() {
    monthSelect.innerHTML = '';
    for (const m of MONTHS) {
        const o = document.createElement('option');
        o.value = m.key; o.textContent = m.label;
        monthSelect.appendChild(o);
    }
    monthSelect.value = state.month;
    monthSelect.onchange = () => { state.month = parseInt(monthSelect.value); save(); render(); };
}

function refreshRespFilter() {
    const current = filterRespEl.value;
    filterRespEl.innerHTML = '<option value="">Responsable (todos)</option>';
    const set = new Set();
    for (const m of MONTHS) {
        const mi = m.key;
        const days = state.tasks[mi] || {};
        Object.values(days).forEach(arr => arr.forEach(t => { if (t.resp) set.add(t.resp); }));
    }
    Array.from(set).sort((a, b) => a.localeCompare(b)).forEach(r => {
        const o = document.createElement('option'); o.value = r; o.textContent = r; filterRespEl.appendChild(o);
    });
    filterRespEl.value = current;
}

function getFilters() {
    return {
        q: norm(searchEl.value),
        resp: filterRespEl.value,
        pri: filterPriEl.value,
        status: filterStatusEl.value
    };
}

function passFilters(t, f) {
    if (f.q) {
        const ok = norm(t.text).includes(f.q) || norm(t.resp).includes(f.q);
        if (!ok) return false;
    }
    if (f.resp && norm(t.resp) !== norm(f.resp)) return false;
    if (f.pri) {
        const pc = priClass(t.pri);
        if (f.pri === 'high' && pc !== 'pri-high') return false;
        if (f.pri === 'medium' && pc !== 'pri-medium') return false;
        if (f.pri === 'low' && pc !== 'pri-low') return false;
    }
    if (f.status === 'done' && !t.done) return false;
    if (f.status === 'pending' && t.done) return false;
    return true;
}

function monthStats(mi) {
    const days = state.tasks[mi] || {};
    let total = 0, done = 0;
    Object.values(days).forEach(arr => arr.forEach(t => { total++; if (t.done) done++; }));
    return { total, done, p: pct(done, total) };
}

function renderProgress() {
    const ms = monthStats(state.month);
    document.getElementById('monthProg').style.width = ms.p + '%';
    const label = (MONTHS.find(x => x.key === state.month) || {}).label || 'Mes';
    document.getElementById('monthText').textContent = label + ' 2026 – Progreso: ' + ms.p + '% (' + ms.done + '/' + ms.total + ')';
}

function renderMonthView() {
    const mi = state.month;
    const dim = daysInMonth(2026, mi);

    viewEl.innerHTML = '';
    const cal = document.createElement('div'); cal.className = 'cal';
    const dows = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    dows.forEach(d => { const h = document.createElement('div'); h.className = 'dow'; h.textContent = d; cal.appendChild(h); });

    const first = new Date(2026, mi, 1).getDay();
    const offset = (first === 0 ? 6 : first - 1);
    for (let i = 0; i < offset; i++) { const e = document.createElement('div'); e.className = 'cell empty'; cal.appendChild(e); }

    const f = getFilters();
    const today = new Date();
    const today0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());

    for (let day = 1; day <= dim; day++) {
        const cell = document.createElement('div'); cell.className = 'cell';
        cell.ondragover = (e) => { e.preventDefault(); cell.classList.add('drag-over'); };
        cell.ondragleave = (e) => { cell.classList.remove('drag-over'); };
        cell.ondrop = (e) => {
            e.preventDefault();
            cell.classList.remove('drag-over');
            try {
                const data = JSON.parse(e.dataTransfer.getData('text/plain'));
                if (data.fromMonth === mi && data.fromDay === day) return;
                const taskIndex = state.tasks[data.fromMonth][data.fromDay].findIndex(x => x.id === data.id);
                if (taskIndex > -1) {
                    const task = state.tasks[data.fromMonth][data.fromDay].splice(taskIndex, 1)[0];
                    state.tasks[mi][day].push(task);
                    save(); renderProgress(); render();
                }
            } catch (err) { }
        };
        const head = document.createElement('div'); head.className = 'cellHeader';
        const dt = new Date(2026, mi, day);
        const dowFull = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'][(dt.getDay() + 6) % 7];
        const num = document.createElement('div'); num.className = 'dayNum';
        num.innerHTML = day + ' <small>(' + dowFull + ')</small>';

        const add = document.createElement('button'); add.className = 'addBtn'; add.innerHTML = '<i class="ph ph-plus"></i> Ingresar';
        add.onclick = () => {
            const text = prompt('Actividad:');
            if (!text) return;
            const resp = prompt('Responsable (opcional):') || '';
            const pri = prompt('Prioridad (ALTA/MEDIA/BAJA):', 'MEDIA') || 'MEDIA';
            const t = { id: 'm_' + Date.now() + '_' + Math.random().toString(16).slice(2), text: text.trim(), resp: resp.trim(), pri: pri.trim(), done: false, origin: 'manual' };
            state.tasks[mi][day].push(t);
            save(); refreshRespFilter(); render();
        };

        head.appendChild(num); head.appendChild(add);
        cell.appendChild(head);

        const arr = (state.tasks[mi] && state.tasks[mi][day]) ? state.tasks[mi][day] : [];
        arr.sort((a, b) => (a.done - b.done) || norm(a.text).localeCompare(norm(b.text)));

        arr.forEach(t => {
            if (!passFilters(t, f)) return;
            const due = new Date(2026, mi, day);
            const overdue = (!t.done && due < today0);

            const row = document.createElement('div');
            row.className = 'task ' + priClass(t.pri) + (t.done ? ' done' : '') + (overdue ? ' overdue' : '');

            row.draggable = true;
            row.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', JSON.stringify({ id: t.id, fromDay: day, fromMonth: mi }));
                e.dataTransfer.effectAllowed = 'move';
                setTimeout(() => row.classList.add('dragging'), 0);
            };
            row.ondragend = () => row.classList.remove('dragging');

            const header = document.createElement('div');
            header.className = 'task-header';

            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done;
            cb.onchange = () => { t.done = cb.checked; save(); renderProgress(); render(); };

            const txt = document.createElement('div'); txt.className = 'txt'; txt.textContent = t.text;

            header.appendChild(cb);
            header.appendChild(txt);

            const badges = document.createElement('div'); badges.className = 'badges';
            if (t.resp) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = t.resp; badges.appendChild(b); }
            if (t.pri) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = t.pri; badges.appendChild(b); }

            const actions = document.createElement('div'); actions.className = 'actions';
            const del = document.createElement('button'); del.className = 'icon'; del.innerHTML = '<i class="ph ph-trash"></i>';
            del.title = "Borrar";
            del.onclick = () => { state.tasks[mi][day] = state.tasks[mi][day].filter(x => x.id !== t.id); save(); render(); };

            const copyBtn = document.createElement('button'); copyBtn.className = 'icon copy-btn'; copyBtn.innerHTML = '<i class="ph ph-copy"></i>';
            copyBtn.title = "Copiar a otros días";
            copyBtn.onclick = (e) => { e.stopPropagation(); openCopyModal(t, mi, day); };

            actions.appendChild(badges);
            actions.appendChild(copyBtn);
            actions.appendChild(del);

            row.appendChild(header);
            row.appendChild(actions);

            cell.appendChild(row);
        });

        cal.appendChild(cell);
    }

    viewEl.appendChild(cal);
}

function renderTodayView() {
    viewEl.innerHTML = '';
    const now = new Date();
    const mi = now.getMonth();
    const day = now.getDate();

    const box = document.createElement('div'); box.className = 'todayBox';
    const monthObj = MONTHS.find(x => x.key === mi);
    const lbl = monthObj ? monthObj.label : null;
    box.innerHTML = '<h3><i class="ph-fill ph-check-circle" style="color:var(--ok)"></i> Mi Día</h3><div class="hint">Hoy: ' + now.toLocaleDateString() + (lbl ? (' · Mes agenda: ' + lbl) : ' · (Fuera de Mar–Dic 2026)') + '</div>';

    if (!state.tasks[mi] || !state.tasks[mi][day]) {
        const p = document.createElement('div'); p.className = 'hint';
        p.textContent = 'No hay tareas para hoy en la agenda.';
        box.appendChild(p);
        viewEl.appendChild(box);
        return;
    }

    const arr = state.tasks[mi][day];
    if (arr.length === 0) {
        const p = document.createElement('div'); p.className = 'hint';
        p.textContent = 'No hay tareas para hoy ✅';
        box.appendChild(p);
    }

    arr.sort((a, b) => (a.done - b.done));
    arr.forEach(t => {
        const row = document.createElement('div');
        row.className = 'task ' + priClass(t.pri) + (t.done ? ' done' : '');

        const header = document.createElement('div');
        header.className = 'task-header';

        const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = !!t.done;
        cb.onchange = () => { t.done = cb.checked; save(); renderTodayView(); renderProgress(); };
        const txt = document.createElement('div'); txt.className = 'txt'; txt.textContent = t.text;

        header.appendChild(cb);
        header.appendChild(txt);

        const actions = document.createElement('div'); actions.className = 'actions';
        const badges = document.createElement('div'); badges.className = 'badges';
        if (t.resp) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = t.resp; badges.appendChild(b); }
        if (t.pri) { const b = document.createElement('span'); b.className = 'badge'; b.textContent = t.pri; badges.appendChild(b); }

        actions.appendChild(badges);

        row.appendChild(header);
        row.appendChild(actions);
        box.appendChild(row);
    });

    viewEl.appendChild(box);
}

function exportCSV(allMonths) {
    const rows = [['Mes', 'Fecha', 'Día', 'Actividad', 'Estado', 'Responsable', 'Prioridad', 'Origen']];
    const list = allMonths ? MONTHS.map(m => m.key) : [state.month];

    for (const mi of list) {
        const mLabel = (MONTHS.find(x => x.key === mi) || {}).label || '';
        const dim = daysInMonth(2026, mi);
        for (let d = 1; d <= dim; d++) {
            const dt = new Date(2026, mi, d);
            const dowFull = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][dt.getDay()];
            const arr = (state.tasks[mi] && state.tasks[mi][d]) ? state.tasks[mi][d] : [];
            arr.forEach(t => {
                rows.push([
                    mLabel,
                    '2026-' + String(mi + 1).padStart(2, '0') + '-' + String(d).padStart(2, '0'),
                    dowFull,
                    t.text,
                    t.done ? 'HECHO' : 'PENDIENTE',
                    t.resp || '',
                    t.pri || '',
                    t.origin || ''
                ]);
            });
        }
    }

    const csv = rows.map(r => r.map(x => {
        const s = (x ?? '').toString();
        if (s.includes(',') || s.includes('"') || s.includes('\n')) return '"' + s.replaceAll('"', '""') + '"';
        return s;
    }).join(',')).join('\n');

    // AGREGAMOS EL BOM \uFEFF PARA QUE EXCEL RECONOZCA LOS CARACTERES ESPECIALES
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = allMonths ? 'Agenda_2026_DIMALCCO_PUBLICIDAD_TODO.csv' : ('Agenda_2026_PUBLICIDAD_' + ((MONTHS.find(x => x.key === state.month) || {}).label || 'Mes') + '.csv');
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function resetAll() {
    if (!confirm('¿Reiniciar todo? Se borrarán marcas de realizado y tareas manuales.')) return;
    localStorage.removeItem(STORAGE_KEY);
    state = buildInitial();
    save();
    initMonthSelect();
    refreshRespFilter();
    render();
}

/* ── COPY MODAL ── */
function openCopyModal(task, srcMonth, srcDay) {
    // Remove existing modal if any
    const existing = document.getElementById('copyModal');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'copyModal';
    overlay.className = 'modal-overlay';

    const box = document.createElement('div');
    box.className = 'modal-box';

    // Header
    const hdr = document.createElement('div'); hdr.className = 'modal-header';
    hdr.innerHTML = '<span><i class="ph ph-copy"></i> Copiar actividad a otros días</span>';
    const closeBtn = document.createElement('button'); closeBtn.className = 'modal-close'; closeBtn.innerHTML = '<i class="ph ph-x"></i>';
    closeBtn.onclick = () => overlay.remove();
    hdr.appendChild(closeBtn);
    box.appendChild(hdr);

    // Task preview
    const preview = document.createElement('div'); preview.className = 'modal-preview';
    preview.innerHTML = '<strong>' + task.text + '</strong><br><span>' + (task.resp || '—') + ' · ' + (task.pri || 'MEDIA') + '</span>';
    box.appendChild(preview);

    // Month selector
    const monthRow = document.createElement('div'); monthRow.className = 'modal-row';
    const mLabel = document.createElement('label'); mLabel.textContent = 'Mes destino:';
    const mSel = document.createElement('select'); mSel.className = 'modal-select';
    MONTHS.forEach(m => {
        const o = document.createElement('option');
        o.value = m.key; o.textContent = m.label;
        if (m.key === srcMonth) o.selected = true;
        mSel.appendChild(o);
    });
    monthRow.appendChild(mLabel); monthRow.appendChild(mSel);
    box.appendChild(monthRow);

    // Day grid
    const gridWrap = document.createElement('div'); gridWrap.className = 'modal-days-wrap';
    const gridLabel = document.createElement('div'); gridLabel.className = 'modal-days-label';
    gridLabel.textContent = 'Selecciona los días:';
    gridWrap.appendChild(gridLabel);

    const grid = document.createElement('div'); grid.className = 'modal-days-grid';
    gridWrap.appendChild(grid);
    box.appendChild(gridWrap);

    function buildGrid(mi) {
        grid.innerHTML = '';
        const dim = daysInMonth(2026, mi);
        for (let d = 1; d <= dim; d++) {
            const isSrc = (mi === srcMonth && d === srcDay);
            const lbl = document.createElement('label');
            lbl.className = 'day-chip' + (isSrc ? ' is-src' : '');
            lbl.title = isSrc ? 'Día origen' : '';
            const cb = document.createElement('input'); cb.type = 'checkbox'; cb.value = d;
            cb.disabled = isSrc;
            lbl.appendChild(cb);
            lbl.appendChild(document.createTextNode(d));
            grid.appendChild(lbl);
        }
    }
    buildGrid(srcMonth);
    mSel.onchange = () => buildGrid(parseInt(mSel.value));

    // Quick selectors
    const quickRow = document.createElement('div'); quickRow.className = 'modal-quick';
    function makeQuick(label, fn) {
        const b = document.createElement('button'); b.className = 'ghost quick-btn'; b.textContent = label;
        b.onclick = () => {
            const mi = parseInt(mSel.value);
            grid.querySelectorAll('input[type=checkbox]:not(:disabled)').forEach(cb => { cb.checked = fn(parseInt(cb.value), mi); });
        };
        quickRow.appendChild(b);
    }
    makeQuick('Todos', () => true);
    makeQuick('Ninguno', () => false);
    makeQuick('Lunes', (d, mi) => new Date(2026, mi, d).getDay() === 1);
    makeQuick('Lunes–Vie', (d, mi) => [1, 2, 3, 4, 5].includes(new Date(2026, mi, d).getDay()));
    makeQuick('Misma fecha', (d) => d === srcDay);
    box.appendChild(quickRow);

    // Footer buttons
    const footer = document.createElement('div'); footer.className = 'modal-footer';
    const cancelBtn = document.createElement('button'); cancelBtn.className = 'ghost'; cancelBtn.textContent = 'Cancelar';
    cancelBtn.onclick = () => overlay.remove();
    const confirmBtn = document.createElement('button'); confirmBtn.className = 'primary'; confirmBtn.innerHTML = '<i class="ph ph-copy"></i> Copiar';
    confirmBtn.onclick = () => {
        const mi = parseInt(mSel.value);
        const selected = Array.from(grid.querySelectorAll('input[type=checkbox]:checked')).map(cb => parseInt(cb.value));
        if (selected.length === 0) { alert('Selecciona al menos un día.'); return; }
        let count = 0;
        selected.forEach(d => {
            if (!state.tasks[mi]) state.tasks[mi] = {};
            if (!state.tasks[mi][d]) state.tasks[mi][d] = [];
            // Avoid exact duplicate
            const alreadyExists = state.tasks[mi][d].some(x => x.text === task.text && x.resp === task.resp);
            if (!alreadyExists) {
                state.tasks[mi][d].push({
                    id: 'cp_' + Date.now() + '_' + Math.random().toString(16).slice(2),
                    text: task.text,
                    resp: task.resp,
                    pri: task.pri,
                    done: false,
                    origin: 'manual'
                });
                count++;
            }
        });
        save(); refreshRespFilter();
        // Switch to target month if different
        if (mi !== state.month) { state.month = mi; monthSelect.value = mi; }
        render();
        overlay.remove();
        // Toast
        showToast('✅ Copiado en ' + count + ' día(s) de ' + (MONTHS.find(x => x.key === mi) || {}).label);
    };
    footer.appendChild(cancelBtn); footer.appendChild(confirmBtn);
    box.appendChild(footer);

    overlay.appendChild(box);
    overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    document.body.appendChild(overlay);
}

function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast'; t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('toast-in'), 10);
    setTimeout(() => { t.classList.remove('toast-in'); setTimeout(() => t.remove(), 300); }, 3000);
}

function render() {
    refreshRespFilter();
    renderProgress();
    if (state.view === 'today') renderTodayView();
    else renderMonthView();
}

document.addEventListener('DOMContentLoaded', () => {
    initMonthSelect();
    refreshRespFilter();

    document.getElementById('viewMonthBtn').onclick = () => { state.view = 'month'; save(); render(); };
    document.getElementById('viewTodayBtn').onclick = () => { state.view = 'today'; save(); render(); };
    document.getElementById('exportMonthBtn').onclick = () => exportCSV(false);
    document.getElementById('exportAllBtn').onclick = () => exportCSV(true);
    document.getElementById('resetBtn').onclick = resetAll;

    searchEl.oninput = render;
    filterRespEl.onchange = render;
    filterPriEl.onchange = render;
    filterStatusEl.onchange = render;

    render();
});
