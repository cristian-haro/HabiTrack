// HabiTrack Chrome Extension - Popup Logic

document.addEventListener('DOMContentLoaded', async () => {
    let currentDetectedProperty = null;

    // Elements
    const stateLoading = document.getElementById('state-loading');
    const stateFound = document.getElementById('state-found');
    const stateEmpty = document.getElementById('state-empty');
    const viewCapture = document.getElementById('view-capture');
    const viewSettings = document.getElementById('view-settings');
    const serverStatusPill = document.getElementById('server-status-pill');
    const serverStatusText = document.getElementById('server-status-text');

    const btnToggleSettings = document.getElementById('btn-toggle-settings');
    const btnCloseSettings = document.getElementById('btn-close-settings');
    const btnSaveProperty = document.getElementById('btn-save-property');
    const btnOpenHabitrack = document.getElementById('btn-open-habitrack');
    const btnTestConn = document.getElementById('btn-test-conn');
    const settingsForm = document.getElementById('settings-form');
    const inputServerUrl = document.getElementById('input-server-url');
    const inputAuthToken = document.getElementById('input-auth-token');

    // 1. Cargar Configuración Inicial
    const config = await getStoredConfig();
    inputServerUrl.value = config.serverUrl;
    inputAuthToken.value = config.authToken;

    // Comprobar estado del servidor
    checkConnection(config.serverUrl);

    // 2. Detectar Inmueble en la Pestaña Activa
    detectActiveTabProperty();

    // 3. Handlers de Navegación & Configuración
    btnToggleSettings.addEventListener('click', () => {
        viewCapture.style.display = 'none';
        viewSettings.style.display = 'block';
    });

    btnCloseSettings.addEventListener('click', () => {
        viewSettings.style.display = 'none';
        viewCapture.style.display = 'block';
    });

    settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const serverUrl = inputServerUrl.value.trim().replace(/\/$/, '');
        const authToken = inputAuthToken.value.trim();

        chrome.storage.sync.set({ serverUrl, authToken }, () => {
            showToast('Ajustes guardados correctamente.');
            checkConnection(serverUrl);
            viewSettings.style.display = 'none';
            viewCapture.style.display = 'block';
        });
    });

    btnTestConn.addEventListener('click', async () => {
        btnTestConn.textContent = 'Probando...';
        btnTestConn.disabled = true;

        const testUrl = inputServerUrl.value.trim().replace(/\/$/, '');
        chrome.runtime.sendMessage({ action: 'CHECK_SERVER_STATUS', serverUrl: testUrl }, (res) => {
            btnTestConn.textContent = 'Probar Conexión';
            btnTestConn.disabled = false;

            if (res && res.online) {
                showToast('✅ Conexión con HabiTrack establecida.');
            } else {
                showToast('❌ Servidor no responde en esa URL.', 'error');
            }
        });
    });

    if (btnOpenHabitrack) {
        btnOpenHabitrack.addEventListener('click', async () => {
            const { serverUrl } = await getStoredConfig();
            chrome.tabs.create({ url: serverUrl });
        });
    }

    // 4. Guardar Propiedad
    if (btnSaveProperty) {
        btnSaveProperty.addEventListener('click', () => {
            if (!currentDetectedProperty) return;

            btnSaveProperty.disabled = true;
            btnSaveProperty.textContent = 'Guardando en HabiTrack...';

            chrome.runtime.sendMessage({ action: 'SAVE_PROPERTY', propertyData: currentDetectedProperty }, (res) => {
                btnSaveProperty.disabled = false;

                if (chrome.runtime.lastError) {
                    btnSaveProperty.textContent = '⚠️ Error de Extensión';
                    btnSaveProperty.style.background = '#e11d48';
                    showToast('Error: ' + chrome.runtime.lastError.message, 'error');
                    return;
                }

                if (res && res.success) {
                    btnSaveProperty.textContent = '✅ ¡Guardado con Éxito!';
                    btnSaveProperty.style.background = '#059669';
                    showToast('Piso añadido a tu cartera de HabiTrack.');

                    setTimeout(() => {
                        btnSaveProperty.textContent = '💾 Volver a Guardar';
                        btnSaveProperty.style.background = '#4f46e5';
                    }, 2500);
                } else {
                    btnSaveProperty.textContent = '⚠️ Error al Guardar';
                    btnSaveProperty.style.background = '#e11d48';
                    showToast(res ? res.error : 'Error desconocido al guardar.', 'error');

                    setTimeout(() => {
                        btnSaveProperty.textContent = '💾 Guardar Inmueble en HabiTrack';
                        btnSaveProperty.style.background = '#4f46e5';
                    }, 3000);
                }
            });
        });
    }

    // Funciones Auxiliares
    async function getStoredConfig() {
        return new Promise((resolve) => {
            chrome.storage.sync.get(['serverUrl', 'authToken'], (items) => {
                resolve({
                    serverUrl: items.serverUrl || 'http://localhost:3007',
                    authToken: items.authToken || ''
                });
            });
        });
    }

    function checkConnection(url) {
        serverStatusPill.className = 'status-indicator status-checking';
        serverStatusText.textContent = 'Verificando...';

        chrome.runtime.sendMessage({ action: 'CHECK_SERVER_STATUS', serverUrl: url }, (res) => {
            if (res && res.online) {
                serverStatusPill.className = 'status-indicator status-online';
                serverStatusText.textContent = 'Conectado';
            } else {
                serverStatusPill.className = 'status-indicator status-offline';
                serverStatusText.textContent = 'Desconectado';
            }
        });
    }

    function detectActiveTabProperty() {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs || tabs.length === 0) {
                showEmptyState();
                return;
            }

            const activeTab = tabs[0];
            const isSupported = activeTab.url && (
                activeTab.url.includes('idealista.com') ||
                activeTab.url.includes('fotocasa.es') ||
                activeTab.url.includes('habitaclia.com') ||
                activeTab.url.includes('yaencontre.com') ||
                activeTab.url.includes('pisos.com') ||
                activeTab.url.includes('facebook.com/marketplace')
            );

            if (!isSupported) {
                showEmptyState();
                return;
            }

            chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CURRENT_PROPERTY' }, (response) => {
                if (chrome.runtime.lastError || !response || !response.data || !response.data.price) {
                    // Si la pestaña estaba abierta antes de recargar la extensión, inyectar dinámicamente
                    try {
                        chrome.scripting.executeScript({
                            target: { tabId: activeTab.id },
                            files: ['content.js']
                        }, () => {
                            setTimeout(() => {
                                chrome.tabs.sendMessage(activeTab.id, { action: 'GET_CURRENT_PROPERTY' }, (retryRes) => {
                                    if (retryRes && retryRes.data && retryRes.data.price) {
                                        renderPropertyPreview(retryRes.data);
                                    } else {
                                        showEmptyState();
                                    }
                                });
                            }, 300);
                        });
                    } catch (e) {
                        showEmptyState();
                    }
                    return;
                }

                renderPropertyPreview(response.data);
            });
        });
    }

    function showEmptyState() {
        stateLoading.style.display = 'none';
        stateFound.style.display = 'none';
        stateEmpty.style.display = 'block';
    }

    function renderPropertyPreview(data) {
        currentDetectedProperty = data;

        stateLoading.style.display = 'none';
        stateEmpty.style.display = 'none';
        stateFound.style.display = 'block';

        // Set Text and Values
        document.getElementById('prop-title').textContent = data.title;
        document.getElementById('prop-zone').textContent = `📍 ${data.zone || 'Zona no especificada'} (${data.ccaa || 'España'})`;
        document.getElementById('prop-price').textContent = `${data.price.toLocaleString('es-ES')} €`;

        const priceM2 = data.m2 && data.m2 > 0 ? `${Math.round(data.price / data.m2).toLocaleString('es-ES')} €/m²` : '';
        document.getElementById('prop-price-m2').textContent = priceM2;

        document.getElementById('prop-spec-m2').textContent = data.m2 ? `📐 ${data.m2} m²` : '📐 -- m²';
        document.getElementById('prop-spec-rooms').textContent = data.rooms ? `🛏️ ${data.rooms} hab` : '🛏️ -- hab';
        document.getElementById('prop-spec-baths').textContent = data.baths ? `🚿 ${data.baths} bñ` : '🚿 -- bñ';
        document.getElementById('prop-spec-garage').textContent = data.garage === 'si' ? '🚗 Garaje Sí' : '🚗 Garaje No';
        document.getElementById('prop-estate-type').textContent = data.estate_type === 'new' ? 'Obra Nueva' : 'Segunda Mano';

        // Image
        const imgEl = document.getElementById('prop-img');
        if (data.photos) {
            const firstPhoto = data.photos.split(',')[0].trim();
            imgEl.src = firstPhoto;
            imgEl.style.display = 'block';
        } else {
            imgEl.style.display = 'none';
        }

        // Quick Financial Calculations (20% Downpayment + ~10% Taxes & Expenses)
        const downpayment = Math.round(data.price * 0.20);
        const approxTaxesExpenses = Math.round(data.price * 0.10);
        const totalBudget = downpayment + approxTaxesExpenses;

        const mortgageAmount = data.price * 0.80;
        const monthlyRate = 0.03 / 12;
        const numPayments = 30 * 12;
        const monthlyPayment = Math.round((mortgageAmount * (monthlyRate * Math.pow(1 + monthlyRate, numPayments))) / (Math.pow(1 + monthlyRate, numPayments) - 1));

        document.getElementById('fin-total-budget').textContent = `${totalBudget.toLocaleString('es-ES')} €`;
        document.getElementById('fin-mortgage-payment').textContent = `~${monthlyPayment.toLocaleString('es-ES')} €/mes`;
    }

    function showToast(message) {
        const toast = document.getElementById('popup-toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = 'popup-toast show';

        setTimeout(() => {
            toast.className = 'popup-toast';
        }, 3000);
    }
});
