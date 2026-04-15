/**
 * DIMALCCO CLOUD SYNC ENGINE (v1.0)
 * Autores: Antigravity AI
 * Propósito: Sincronización transparente de LocalStorage con GitHub Gists.
 */

const SYNC_CONFIG = {
    token: localStorage.getItem('dim_cloud_token') || '', // Se lee de localStorage por seguridad
    gistIdKey: 'dim_cloud_gist_id', 
    filename: 'dimalcco_erp_data.json',
    lastSyncKey: 'dim_last_sync_time'
};

/**
 * Guarda todo el LocalStorage en la nube (Gist Privado)
 */
async function pushToCloud() {
    console.log("☁️ Iniciando sincronización de subida...");
    try {
        const data = {};
        // Capturamos TODO el localStorage (como en tu botón de exportar)
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            // Ignoramos las llaves de configuración de la propia nube
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
        
        // Si es la primera vez, guardamos el ID del Gist creado
        if (!gistId) {
            localStorage.setItem(SYNC_CONFIG.gistIdKey, result.id);
            console.log("✅ Gist privado creado exitosamente.");
        }

        localStorage.setItem(SYNC_CONFIG.lastSyncKey, new Date().toISOString());
        console.log("✅ Datos subidos a la nube en segundos.");
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
    
    // Si no tenemos ID, intentamos buscarlo en la cuenta del usuario por el nombre del archivo
    if (!gistId) {
         console.warn("⚠️ No se encontró Gist ID local. Intentando rastear Gists existentes...");
         try {
            const listResp = await fetch("https://api.github.com/gists", {
                headers: { 'Authorization': `token ${SYNC_CONFIG.token}` }
            });
            const gists = await listResp.json();
            const found = gists.find(g => g.files[SYNC_CONFIG.filename]);
            if (found) {
                localStorage.setItem(SYNC_CONFIG.gistIdKey, found.id);
                return pullFromCloud(); // Re-intento con el ID encontrado
            } else {
                console.log("🆕 No hay datos previos en la nube, se requiere primer Push.");
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

        // Volcamos al LocalStorage (REEMPLAZO TOTAL)
        Object.keys(data).forEach(key => {
            localStorage.setItem(key, data[key]);
        });

        localStorage.setItem(SYNC_CONFIG.lastSyncKey, new Date().toISOString());
        console.log("✅ Datos locales actualizados desde la nube.");
        updateCloudIndicator('success');
        
        // Disparar recarga si estamos en la raíz (Dashboard)
        if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
            // alert("Datos sincronizados. La página se refrescará.");
            // location.reload();
        }
        
        return true;
    } catch (err) {
        console.error("❌ Fallo de sincronización (Pull):", err);
        updateCloudIndicator('error');
        return false;
    }
}

// Escuchador de mensajes desde los IFRAMES de los módulos
window.addEventListener('message', async (event) => {
    if (event.data === 'sync_cloud' || event.data.type === 'sync_cloud') {
        console.log("📥 Solicitud de sincronización recibida desde módulo.");
        await pushToCloud();
    }
});

/**
 * Función helper para llamar desde los módulos
 */
function requestSync() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage('sync_cloud', '*');
    } else {
        pushToCloud();
    }
}
window.requestSync = requestSync;

/**
 * Actualiza la UI de la nube en la barra lateral
 */
function updateCloudIndicator(status) {
    const indicator = document.getElementById('cloud-sync-status');
    if (!indicator) return;

    if (status === 'success') {
        indicator.style.color = '#10b981'; // Verde
        indicator.title = "Sincronizado con GitHub (" + new Date().toLocaleTimeString() + ")";
        indicator.innerHTML = '<i class="ph ph-cloud-check" style="font-size:24px"></i>';
    } else if (status === 'error') {
        indicator.style.color = '#ef4444'; // Rojo
        indicator.title = "Fallo de conexión con GitHub";
        indicator.innerHTML = '<i class="ph ph-cloud-slash" style="font-size:24px"></i>';
    } else {
        indicator.style.color = '#f59e0b'; // Ámbar
        indicator.title = "Sincronizando...";
        indicator.innerHTML = '<i class="ph ph-cloud-arrow-up" style="font-size:24px"></i>';
    }
}

// Iniciar Pull automático al cargar si hay un ID
window.addEventListener('load', () => {
    // Solo si el usuario ha iniciado sesión o tiene el token
    if (SYNC_CONFIG.token) {
        pullFromCloud();
    }
});

// Exponemos funciones globalmente
window.pushToCloud = pushToCloud;
window.pullFromCloud = pullFromCloud;
