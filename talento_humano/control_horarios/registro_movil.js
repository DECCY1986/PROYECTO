document.addEventListener('DOMContentLoaded', () => {
    // 1. Base de datos fija de trabajadores de DIMALCCO
    const FIXED_QUINCENA = {
        "WILLIAM DIAZ VARGAS": 4000000,
        "OSCAR MIGUEL CANTOR ZAMUDIO": 3000000,
        "MAURICIO MEDINA OLVIDARES": 2000000,
        "DIEGO JAVIER QUINTERO DUEÑAS": 1705000,
        "DECCY BAYONA": 1550000,
        "JORGE RODRIGUEZ FERNANDEZ": 1400000,
        "WILLIAM ENRIQUE LOPEZ SORA": 1400000,
        "JUAN CARLOS MARTINEZ SANDOVAL": 1353000,
        "JULIO AGUDELO": 1350000,
        "ORLANDO MORALES SANDOVAL": 1350000,
        "YESICCA PAOLA CANTOR SUAREZ": 1300000,
        "RODRIGO ALEXANDER RODRIGUEZ CENTENO": 1294150,
        "MARIA CAMILA DIAZ CANTOR": 1200000,
        "JULIO ARMANDO RODRIGUEZ": 1188000,
        "JHONNY RAFAEL CASTRELLON RODRIGUEZ": 1182500,
        "CAMILO DURAN": 1210000,
        "JULIO PIERNAGORDA": 1000000,
        "DIEGO VELANDIA": 1265000,
        "JORGE GILBERTO RODRIGUEZ AGUILERA": 1350000,
        "HENRY GONZALES": 1320000,
        "JOSE MANUEL FORERO": 1210000
    };

    // DOM Elements
    const liveTimeEl = document.getElementById('liveTime');
    const liveDateEl = document.getElementById('liveDate');
    const workerSelect = document.getElementById('workerName');
    const locationSelect = document.getElementById('location');
    const projectNameInput = document.getElementById('projectName');
    const opNumberInput = document.getElementById('opNumber');
    const mobileForm = document.getElementById('mobileForm');
    const qrBanner = document.getElementById('qrBanner');
    const qrBannerDetails = document.getElementById('qrBannerDetails');
    const gpsInfoEl = document.getElementById('gpsInfo');
    const successOverlay = document.getElementById('successOverlay');
    const successMessage = document.getElementById('successMessage');
    const btnCloseSuccess = document.getElementById('btnCloseSuccess');
    const btnToggleCamera = document.getElementById('btnToggleCamera');
    const qrReaderContainer = document.getElementById('qr-reader-container');

    let userGpsCoords = null;
    let html5QrScanner = null;

    // 2. Reloj en Vivo
    function updateClock() {
        const now = new Date();
        liveTimeEl.textContent = now.toLocaleTimeString('es-CO', { hour12: true });
        liveDateEl.textContent = now.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // 3. Cargar Lista de Trabajadores
    function populateWorkers() {
        const workers = Object.keys(FIXED_QUINCENA).sort();
        workerSelect.innerHTML = '<option value="">Seleccione su nombre...</option>' + 
            workers.map(w => `<option value="${w}">${w}</option>`).join('');
    }
    populateWorkers();

    // 4. Capturar Geolocalización GPS
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                userGpsCoords = `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;
                gpsInfoEl.innerHTML = `<i class="ph-fill ph-map-pin" style="color:#10b981;"></i> GPS Verificado: ${userGpsCoords}`;
            },
            (err) => {
                gpsInfoEl.innerHTML = `<i class="ph ph-warning-circle" style="color:#f59e0b;"></i> GPS no disponible (Marcación estándar)`;
            },
            { enableHighAccuracy: true, timeout: 6000 }
        );
    }

    // 5. Lectura de Parámetros URL provenientes del Código QR
    function readUrlParams() {
        const params = new URLSearchParams(window.location.search);
        const urlOp = params.get('op');
        const urlProyecto = params.get('proyecto');
        const urlUbicacion = params.get('ubicacion');
        const urlTrabajador = params.get('trabajador');

        let autofilled = false;

        if (urlOp) {
            opNumberInput.value = urlOp.toUpperCase();
            autofilled = true;
        }
        if (urlProyecto) {
            projectNameInput.value = decodeURIComponent(urlProyecto);
            autofilled = true;
        }
        if (urlUbicacion) {
            locationSelect.value = urlUbicacion.toLowerCase();
            autofilled = true;
        }
        if (urlTrabajador) {
            const cleanTrabajador = decodeURIComponent(urlTrabajador).toUpperCase();
            for (let i = 0; i < workerSelect.options.length; i++) {
                if (workerSelect.options[i].value.toUpperCase() === cleanTrabajador) {
                    workerSelect.selectedIndex = i;
                    break;
                }
            }
            autofilled = true;
        }

        if (autofilled) {
            qrBanner.style.display = 'flex';
            qrBannerDetails.textContent = `OP #${opNumberInput.value || 'N/A'} | ${projectNameInput.value || 'N/A'}`;
        }
    }
    readUrlParams();

    // 6. Cámara Escáner QR Integrado
    if (btnToggleCamera && typeof Html5Qrcode !== 'undefined') {
        btnToggleCamera.addEventListener('click', () => {
            if (qrReaderContainer.style.display === 'block') {
                stopScanner();
            } else {
                startScanner();
            }
        });
    }

    function startScanner() {
        qrReaderContainer.style.display = 'block';
        btnToggleCamera.innerHTML = '<i class="ph ph-x-circle"></i> Cerrar Cámara Escáner';
        btnToggleCamera.style.background = '#fef2f2';
        btnToggleCamera.style.borderColor = '#ef4444';

        html5QrScanner = new Html5Qrcode("qr-reader");
        html5QrScanner.start(
            { facingMode: "environment" },
            { fps: 10, qrbox: { width: 250, height: 250 } },
            (decodedText) => {
                console.log("QR Escaneado:", decodedText);
                parseScannedData(decodedText);
                stopScanner();
            },
            (error) => {
                // Ignore silent frame parse failures
            }
        ).catch(err => {
            alert("No se pudo acceder a la cámara. Por favor autoriza los permisos de cámara en tu navegador.");
            stopScanner();
        });
    }

    function stopScanner() {
        if (html5QrScanner) {
            html5QrScanner.stop().then(() => {
                html5QrScanner.clear();
                html5QrScanner = null;
            }).catch(e => console.error(e));
        }
        qrReaderContainer.style.display = 'none';
        btnToggleCamera.innerHTML = '<i class="ph ph-camera"></i> Escanear Código QR de OP o Carnet';
        btnToggleCamera.style.background = '#f1f5f9';
        btnToggleCamera.style.borderColor = '#4f46e5';
    }

    function parseScannedData(text) {
        // Soporta URLs de QR o texto crudo ej: OP-1042|Planta Principal|planta
        try {
            if (text.includes('?')) {
                const url = new URL(text);
                const params = new URLSearchParams(url.search);
                if (params.get('op')) opNumberInput.value = params.get('op');
                if (params.get('proyecto')) projectNameInput.value = decodeURIComponent(params.get('proyecto'));
                if (params.get('ubicacion')) locationSelect.value = params.get('ubicacion');
                if (params.get('trabajador')) workerSelect.value = decodeURIComponent(params.get('trabajador'));
            } else if (text.includes('|')) {
                const parts = text.split('|');
                if (parts[0]) opNumberInput.value = parts[0].trim();
                if (parts[1]) projectNameInput.value = parts[1].trim();
                if (parts[2]) locationSelect.value = parts[2].trim().toLowerCase();
            } else {
                opNumberInput.value = text.trim();
            }

            qrBanner.style.display = 'flex';
            qrBannerDetails.textContent = `OP #${opNumberInput.value} | ${projectNameInput.value || 'Planta/Obra'}`;
        } catch (e) {
            opNumberInput.value = text.trim();
        }
    }

    // 7. Envio del Formulario y Registro de Asistencia
    mobileForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const workerName = workerSelect.value.trim();
        const location = locationSelect.value;
        const projectName = projectNameInput.value.trim();
        const opNumber = opNumberInput.value.trim();
        const actionType = document.querySelector('input[name="actionType"]:checked').value;
        const notes = document.getElementById('notes').value.trim();

        if (!workerName || !projectName || !opNumber) {
            alert("Por favor completa todos los campos requeridos.");
            return;
        }

        const now = new Date();
        const currentDateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
        const currentHours = String(now.getHours()).padStart(2, '0');
        const currentMinutes = String(now.getMinutes()).padStart(2, '0');
        const currentTimeStr = `${currentHours}:${currentMinutes}`;

        // Cargar registros de LocalStorage
        let records = JSON.parse(localStorage.getItem('shiftRecords')) || [];

        // Buscar si existe un registro activo del trabajador para la fecha de hoy
        let existingRecordIndex = records.findIndex(r => 
            r.workerName === workerName && 
            r.date === currentDateStr && 
            r.opNumber === opNumber
        );

        if (existingRecordIndex === -1) {
            // Buscar cualquier registro del mismo trabajador hoy sin hora de salida
            existingRecordIndex = records.findIndex(r => 
                r.workerName === workerName && 
                r.date === currentDateStr && 
                !r.timeOut
            );
        }

        if (actionType === 'ENTRADA') {
            if (existingRecordIndex !== -1 && records[existingRecordIndex].timeIn && !records[existingRecordIndex].timeOut) {
                // Ya tenía una entrada sin salida -> Actualizamos o notificamos
                records[existingRecordIndex].timeIn = currentTimeStr;
                records[existingRecordIndex].opNumber = opNumber;
                records[existingRecordIndex].projectName = projectName;
                records[existingRecordIndex].location = location;
            } else {
                // Nuevo registro de entrada
                const newRecord = {
                    id: Date.now().toString(),
                    workerName: workerName,
                    date: currentDateStr,
                    location: location,
                    projectName: projectName,
                    opNumber: opNumber,
                    recordType: 'normal',
                    timeIn: currentTimeStr,
                    timeOut: '',
                    isHalfDay: false,
                    isAbsent: false,
                    travelHours: 0,
                    notes: notes ? `[GPS: ${userGpsCoords || 'N/A'}] ${notes}` : `[Marcación Móvil GPS: ${userGpsCoords || 'N/A'}]`,
                    createdViaMobile: true
                };
                records.push(newRecord);
            }
        } else if (actionType === 'SALIDA') {
            if (existingRecordIndex !== -1) {
                // Cierre de turno
                records[existingRecordIndex].timeOut = currentTimeStr;
                if (notes) {
                    records[existingRecordIndex].notes += ` | Salida: ${notes}`;
                }
            } else {
                // Registro directo de salida sin entrada previa (crea turno con entrada estimada o vacía)
                const newRecord = {
                    id: Date.now().toString(),
                    workerName: workerName,
                    date: currentDateStr,
                    location: location,
                    projectName: projectName,
                    opNumber: opNumber,
                    recordType: 'normal',
                    timeIn: '07:00', // Marcación por defecto
                    timeOut: currentTimeStr,
                    isHalfDay: false,
                    isAbsent: false,
                    travelHours: 0,
                    notes: `[Marcado Móvil Salida Directa GPS: ${userGpsCoords || 'N/A'}] ${notes}`,
                    createdViaMobile: true
                };
                records.push(newRecord);
            }
        }

        // Re-calcular totalHours para los registros actualizados
        records.forEach(r => {
            if (r.timeIn && r.timeOut) {
                const [h1, m1] = r.timeIn.split(':').map(Number);
                const [h2, m2] = r.timeOut.split(':').map(Number);
                const diffMin = (h2 * 60 + m2) - (h1 * 60 + m1);
                r.totalHours = diffMin > 0 ? (diffMin / 60).toFixed(2) : 0;
            }
        });

        // Guardar en LocalStorage
        localStorage.setItem('shiftRecords', JSON.stringify(records));

        // Activar sincronización en la nube si cloud_sync.js está activo
        if (typeof pushToCloud === 'function') {
            try {
                await pushToCloud();
            } catch (err) {
                console.warn("Sincronización en segundo plano completada localmente.");
            }
        }

        // Configurar botones de WhatsApp y Copiar Código
        const btnShareWhatsapp = document.getElementById('btnShareWhatsapp');
        const btnCopyShiftCode = document.getElementById('btnCopyShiftCode');

        if (btnShareWhatsapp) {
            const textMsg = `*DIMALCCO CONTROL DE HORARIOS*\n📌 *Trabajador:* ${workerName}\n⏰ *Marca:* ${actionLabel} (${currentTimeStr})\n🛠️ *OP:* #${opNumber}\n🏢 *Ubicación:* ${projectName} (${location.toUpperCase()})\n📅 *Fecha:* ${currentDateStr}`;
            btnShareWhatsapp.href = `https://api.whatsapp.com/send?text=${encodeURIComponent(textMsg)}`;
            btnShareWhatsapp.style.display = 'flex';
        }

        if (btnCopyShiftCode) {
            const shiftJson = JSON.stringify({
                workerName, date: currentDateStr, timeIn: actionType === 'ENTRADA' ? currentTimeStr : '07:00', timeOut: actionType === 'SALIDA' ? currentTimeStr : '', opNumber, projectName, location
            });
            btnCopyShiftCode.onclick = () => {
                navigator.clipboard.writeText(shiftJson);
                alert("Código de turno copiado al portapapeles. Puedes pegarlo en el sistema administrativo en el botón 'Sincronizar Turnos Móviles'.");
            };
            btnCopyShiftCode.style.display = 'flex';
        }

        // Mostrar confirmación modal
        const actionLabelStr = actionType === 'ENTRADA' ? 'ENTRADA 🟢' : 'SALIDA 🔴';
        successMessage.innerHTML = `
            <strong>${workerName}</strong><br>
            Se registró tu <strong>${actionLabelStr}</strong> a las <strong>${currentTimeStr}</strong>.<br>
            <span style="font-size: 0.82rem; color: #64748b; margin-top:6px; display:inline-block;">
                OP #${opNumber} (${projectName})
            </span>
        `;
        successOverlay.style.display = 'flex';
    });

    btnCloseSuccess.addEventListener('click', () => {
        successOverlay.style.display = 'none';
        // Reset form inputs except worker name
        opNumberInput.value = '';
        document.getElementById('notes').value = '';
    });
});
