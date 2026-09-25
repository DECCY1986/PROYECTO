/**
 * DIMALCCO CLOUD SYNC ENGINE (v2.0)
 * Autores: Antigravity AI
 * Propósito: Sincronización transparente de LocalStorage con GitHub Gists y Relay de Turnos Móviles.
 */

const SYNC_CONFIG = {
    token: localStorage.getItem('dim_cloud_token') || '',
    gistIdKey: 'dim_cloud_gist_id', 
    filename: 'dimalcco_erp_data.json',
    lastSyncKey: 'dim_last_sync_time'
};

const SHIFT_RELAY_URL = 'https://ntfy.sh/dimalcco_shifts_2026_x77';

/**
 * Envía un turno registrado desde el celular a la nube pública de sincronización
 */
async function pushMobileShiftToCloud(shiftObj) {
    if (!shiftObj || !shiftObj.workerName) return false;
    try {
        console.log("☁️ Enviando turno a la nube pública...", shiftObj);
        const resp = await fetch(SHIFT_RELAY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(shiftObj)
        });
        return resp.ok;
    } catch (e) {
        console.warn("⚠️ Error en push de turno a la nube:", e);
        return false;
    }
}

/**
 * Consulta y descarga los turnos marcados por celulares desde la nube pública
 */
async function pullMobileShiftsFromCloud() {
    try {
        console.log("☁️ Consultando turnos móviles en la nube...");
        const resp = await fetch(`${SHIFT_RELAY_URL}/json?poll=1`);
        if (!resp.ok) return 0;
        const text = await resp.text();
        if (!text || !text.trim()) return 0;

        const lines = text.trim().split('\n');
        let newCount = 0;
        let records = [];
        try {
            records = JSON.parse(localStorage.getItem('shiftRecords')) || [];
        } catch(e) { records = []; }

        lines.forEach(line => {
            try {
                const eventData = JSON.parse(line);
                if (eventData.message) {
                    let shift = null;
                    try {
                        shift = JSON.parse(eventData.message);
                    } catch(e) {}
                    
                    if (shift && shift.workerName && shift.date) {
                        const exists = records.some(r => 
                            (shift.id && String(r.id) === String(shift.id)) || 
                            ((r.workerName || '').trim().toUpperCase() === (shift.workerName || '').trim().toUpperCase() && 
                             r.date === shift.date && 
                             r.opNumber === shift.opNumber && 
                             r.timeIn === shift.timeIn)
                        );
                        if (!exists) {
                            records.push(shift);
                            newCount++;
                        }
                    }
                }
            } catch(e) {}
        });

        if (newCount > 0) {
            localStorage.setItem('shiftRecords', JSON.stringify(records));
            console.log(`✅ ${newCount} nuevos turnos móviles descargados de la nube.`);
        }
        return newCount;
    } catch(err) {
        console.warn("⚠️ Fallo consultando turnos móviles de la nube:", err);
        return 0;
    }
}

/**
 * Guarda todo el LocalStorage en la nube (Gist Privado de GitHub)
 */
async function pushToCloud() {
    console.log("☁️ Iniciando sincronización de subida...");
    try {
        const data = {};
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key !== SYNC_CONFIG.gistIdKey && key !== SYNC_CONFIG.lastSyncKey) {
                data[key] = localStorage.getItem(key);
            }
        }

        const gistId = localStorage.getItem(SYNC_CONFIG.gistIdKey);
        const payload = {
            description: "DIMALCCO ERP DATABASE (Auto-Sync)",
            public: false,
            files: {
                [SYNC_CONFIG.filename]: {
                    content: JSON.stringify(data, null, 2)
                }
            }
        };

        const method = gistId ? 'PATCH' : 'POST';
        const url = gistId ? `https://api.github.com/gists/${gistId}` : `https://api.github.com/gists`;

        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `token ${SYNC_CONFIG.token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) throw new Error(`GitHub Error: ${response.statusText}`);

        const result = await response.json();
        
        if (!gistId) {
            localStorage.setItem(SYNC_CONFIG.gistIdKey, result.id);
            console.log("✅ Gist privado creado exitosamente.");
        }

        localStorage.setItem(SYNC_CONFIG.lastSyncKey, new Date().toISOString());
        console.log("✅ Datos subidos a la nube.");
        updateCloudIndicator('success');
        return true;
    } catch (err) {
        console.error("❌ Fallo de sincronización (Push):", err);
        updateCloudIndicator('error');
        return false;
    }
}

/**
 * Trae los datos de la nube y los vuelca al LocalStorage
 */
async function pullFromCloud() {
    console.log("☁️ Trayendo datos de la nube...");
    const gistId = localStorage.getItem(SYNC_CONFIG.gistIdKey);
    
    if (!gistId) {
         try {
            const listResp = await fetch("https://api.github.com/gists", {
                headers: { 'Authorization': `token ${SYNC_CONFIG.token}` }
            });
            const gists = await listResp.json();
            const found = gists.find(g => g.files[SYNC_CONFIG.filename]);
            if (found) {
                localStorage.setItem(SYNC_CONFIG.gistIdKey, found.id);
                return pullFromCloud();
            } else {
                return false;
            }
         } catch(e) { return false; }
    }

    try {
        const response = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: { 'Authorization': `token ${SYNC_CONFIG.token}` }
        });
        
        if (!response.ok) throw new Error("Gist no encontrado.");

        const result = await response.json();
        const content = result.files[SYNC_CONFIG.filename].content;
        const data = JSON.parse(content);

        Object.keys(data).forEach(key => {
            localStorage.setItem(key, data[key]);
        });

        localStorage.setItem(SYNC_CONFIG.lastSyncKey, new Date().toISOString());
        console.log("✅ Datos locales actualizados desde la nube.");
        updateCloudIndicator('success');
        return true;
    } catch (err) {
        console.error("❌ Fallo de sincronización (Pull):", err);
        updateCloudIndicator('error');
        return false;
    }
}

function updateCloudIndicator(status) {
    const indicator = document.getElementById('cloud-sync-status');
    if (!indicator) return;

    if (status === 'success') {
        indicator.style.color = '#10b981';
        indicator.title = "Sincronizado (" + new Date().toLocaleTimeString() + ")";
        indicator.innerHTML = '<i class="ph ph-cloud-check" style="font-size:24px"></i>';
    } else if (status === 'error') {
        indicator.style.color = '#ef4444';
        indicator.title = "Sin conexión a la nube";
        indicator.innerHTML = '<i class="ph ph-cloud-slash" style="font-size:24px"></i>';
    } else {
        indicator.style.color = '#f59e0b';
        indicator.title = "Sincronizando...";
        indicator.innerHTML = '<i class="ph ph-cloud-arrow-up" style="font-size:24px"></i>';
    }
}

window.pushToCloud = pushToCloud;
window.pullFromCloud = pullFromCloud;
window.pushMobileShiftToCloud = pushMobileShiftToCloud;
window.pullMobileShiftsFromCloud = pullMobileShiftsFromCloud;
