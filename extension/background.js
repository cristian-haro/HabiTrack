// HabiTrack Chrome Extension - Background Service Worker (Manifest V3)

const DEFAULT_SERVER_URL = 'http://localhost:3007';

chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.sync.get(['serverUrl', 'authToken'], (result) => {
        if (!result.serverUrl) {
            chrome.storage.sync.set({ serverUrl: DEFAULT_SERVER_URL, authToken: '' });
        }
    });
    console.log('🚀 HabiTrack Extension instalada y lista.');
});

// Listener de mensajes desde Content Scripts y Popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (!request || !request.action) {
        return false;
    }

    if (request.action === 'SAVE_PROPERTY') {
        handleSaveProperty(request.propertyData)
            .then(res => sendResponse(res || { success: true }))
            .catch(err => sendResponse({ success: false, error: err.message || String(err) }));
        return true; // Asynchronous response
    }

    if (request.action === 'CHECK_SERVER_STATUS') {
        checkServerStatus(request.serverUrl)
            .then(status => sendResponse(status))
            .catch(err => sendResponse({ online: false, error: err.message || String(err) }));
        return true;
    }

    if (request.action === 'SYNC_AUTH_TOKEN') {
        const updateData = {};
        if (request.authToken) updateData.authToken = request.authToken;
        if (request.serverUrl) updateData.serverUrl = request.serverUrl;
        chrome.storage.sync.set(updateData, () => {
            console.log('🔑 Token y servidor sincronizados desde HabiTrack:', request.serverUrl);
            sendResponse({ success: true });
        });
        return true;
    }

    if (request.action === 'GET_OR_SYNC_AUTH') {
        getServerConfig()
            .then(cfg => sendResponse(cfg))
            .catch(err => sendResponse({ error: err.message }));
        return true;
    }

    return false;
});

// Comprobar si un token JWT ha caducado
function isTokenExpired(token) {
    if (!token || typeof token !== 'string') return true;
    try {
        const clean = token.replace(/^Bearer\s+/i, '').trim();
        const parts = clean.split('.');
        if (parts.length !== 3) return false;
        const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
        if (payload.exp && (payload.exp * 1000) < Date.now()) {
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

// Buscar token activo en cualquier pestaña abierta de HabiTrack
async function findTokenFromOpenTabs() {
    try {
        const tabs = await new Promise((resolve) => {
            chrome.tabs.query({}, (t) => {
                const err = chrome.runtime.lastError;
                resolve(t || []);
            });
        });

        for (const tab of tabs) {
            if (!tab.id || !tab.url) continue;
            const isLocal = tab.url.includes('localhost') || tab.url.includes('127.0.0.1');
            const isHabitrack = tab.url.includes('habitrack') || (tab.title && tab.title.toLowerCase().includes('habitrack'));

            if (isLocal || isHabitrack) {
                try {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => {
                            return {
                                token: localStorage.getItem('token') || '',
                                origin: window.location.origin
                            };
                        }
                    });
                    if (results && results[0] && results[0].result) {
                        const { token, origin } = results[0].result;
                        if (token && !isTokenExpired(token)) {
                            console.log('🔑 Token válido detectado en pestaña:', tab.url);
                            return { token, origin };
                        }
                    }
                } catch (scriptErr) {
                    // Ignorar errores en pestañas restringidas
                }
            }
        }
    } catch (e) {
        console.warn('Error al buscar pestañas de HabiTrack:', e);
    }
    return null;
}

async function getServerConfig() {
    let stored = await new Promise((resolve) => {
        chrome.storage.sync.get(['serverUrl', 'authToken'], (res) => {
            const err = chrome.runtime.lastError;
            resolve(res || {});
        });
    });

    let serverUrl = (stored && stored.serverUrl ? stored.serverUrl : DEFAULT_SERVER_URL).replace(/\/$/, '');
    let authToken = (stored && stored.authToken) ? stored.authToken : '';

    // Si no hay token guardado o el que hay está expirado, auto-detectar de pestañas de HabiTrack abiertas
    if (!authToken || isTokenExpired(authToken)) {
        const tabData = await findTokenFromOpenTabs();
        if (tabData && tabData.token) {
            authToken = tabData.token;
            if (tabData.origin && (tabData.origin.includes('localhost') || tabData.origin.includes('127.0.0.1') || tabData.origin.includes('habitrack'))) {
                serverUrl = tabData.origin;
            }
            chrome.storage.sync.set({ authToken, serverUrl });
            console.log('🔑 Token de sesión auto-sincronizado con HabiTrack.');
        } else if (authToken && isTokenExpired(authToken)) {
            authToken = '';
            chrome.storage.sync.set({ authToken: '' });
        }
    }

    return { serverUrl, authToken };
}

async function checkServerStatus(customUrl = null) {
    const config = await getServerConfig();
    const targetUrl = customUrl ? customUrl.replace(/\/$/, '') : config.serverUrl;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(`${targetUrl}/api/health`, { signal: controller.signal });
        clearTimeout(timeout);

        if (res.ok) {
            const data = await res.json().catch(() => ({ status: 'ok' }));
            return { online: true, url: targetUrl, data };
        }
        return { online: false, url: targetUrl, status: res.status };
    } catch (err) {
        return { online: false, url: targetUrl, error: err.message };
    }
}

async function handleSaveProperty(propertyData) {
    let { serverUrl, authToken } = await getServerConfig();

    if (!propertyData || !propertyData.title || !propertyData.price) {
        throw new Error('Faltan datos obligatorios de la propiedad (título o precio).');
    }

    // Si todavía no tenemos token, intentar una búsqueda activa en pestañas antes de fallar
    if (!authToken || isTokenExpired(authToken)) {
        const tabData = await findTokenFromOpenTabs();
        if (tabData && tabData.token) {
            authToken = tabData.token;
            if (tabData.origin) serverUrl = tabData.origin;
            chrome.storage.sync.set({ authToken, serverUrl });
        }
    }

    if (!authToken) {
        throw new Error('Sesión no detectada. Abre tu pestaña de HabiTrack (ej: http://localhost:3007) con sesión iniciada y vuelve a pulsar Guardar.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken.replace(/^Bearer\s+/i, '')}`
    };

    const payload = {
        title: propertyData.title,
        price: parseFloat(propertyData.price) || 0,
        m2: propertyData.m2 ? parseFloat(propertyData.m2) : null,
        rooms: propertyData.rooms ? parseInt(propertyData.rooms, 10) : 0,
        baths: propertyData.baths ? parseInt(propertyData.baths, 10) : 0,
        garage: propertyData.garage || 'no',
        elevator: propertyData.elevator || 'desconocido',
        estate_type: propertyData.estate_type || 'secondhand',
        ccaa: propertyData.ccaa || 'España',
        zone: propertyData.zone || '',
        url: propertyData.url || '',
        photos: propertyData.photos || '',
        comments: propertyData.comments || '',
        rating: parseInt(propertyData.rating, 10) || 0,
        latitude: propertyData.latitude ? parseFloat(propertyData.latitude) : null,
        longitude: propertyData.longitude ? parseFloat(propertyData.longitude) : null
    };

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 7000);

        let res = await fetch(`${serverUrl}/api/propiedades`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });

        // Fallback a /api/properties o /propiedades si 404
        if (res.status === 404) {
            res = await fetch(`${serverUrl}/api/properties`, {
                method: 'POST',
                headers,
                body: JSON.stringify(payload),
                signal: controller.signal
            });
        }
        clearTimeout(timeout);

        // Si el token falló (401 o 403), intentar recuperar token fresco de una pestaña abierta y reintentar 1 vez
        if (res.status === 401 || res.status === 403) {
            console.warn('⚠️ Token 401/403 rechazado. Buscando sesión activa en pestañas abiertas...');
            const fresh = await findTokenFromOpenTabs();
            if (fresh && fresh.token && fresh.token !== authToken) {
                authToken = fresh.token;
                chrome.storage.sync.set({ authToken });
                headers['Authorization'] = `Bearer ${authToken.replace(/^Bearer\s+/i, '')}`;

                const retryController = new AbortController();
                const retryTimeout = setTimeout(() => retryController.abort(), 7000);
                const retryRes = await fetch(`${serverUrl}/api/propiedades`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify(payload),
                    signal: retryController.signal
                });
                clearTimeout(retryTimeout);

                if (retryRes.ok) {
                    const retryJson = await retryRes.json().catch(() => ({}));
                    return { success: true, property: retryJson.property || retryJson, message: 'Propiedad guardada con éxito en HabiTrack' };
                }
            }
            throw new Error('Sesión de HabiTrack caducada. Abre tu pestaña de HabiTrack (http://localhost:3007), refresca la sesión e inténtalo de nuevo.');
        }

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (parseErr) {
            throw new Error(`El servidor respondió con código ${res.status}: ${text.substring(0, 80)}`);
        }

        if (!res.ok) {
            throw new Error(json.error || `Error del servidor HTTP ${res.status}`);
        }

        return { success: true, property: json.property || json, message: 'Propiedad guardada con éxito en HabiTrack' };
    } catch (err) {
        throw new Error(err.message || 'No se pudo conectar con el servidor de HabiTrack.');
    }
}
