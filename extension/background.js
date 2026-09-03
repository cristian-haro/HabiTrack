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
    if (request.action === 'SAVE_PROPERTY') {
        handleSaveProperty(request.propertyData)
            .then(res => sendResponse(res))
            .catch(err => sendResponse({ success: false, error: err.message }));
        return true; // Asynchronous response
    }

    if (request.action === 'CHECK_SERVER_STATUS') {
        checkServerStatus(request.serverUrl)
            .then(status => sendResponse(status))
            .catch(err => sendResponse({ online: false, error: err.message }));
        return true;
    }
});

async function getServerConfig() {
    let stored = await new Promise((resolve) => {
        chrome.storage.sync.get(['serverUrl', 'authToken'], resolve);
    });

    let serverUrl = (stored && stored.serverUrl ? stored.serverUrl : DEFAULT_SERVER_URL).replace(/\/$/, '');
    let authToken = (stored && stored.authToken) ? stored.authToken : '';

    // Si no hay token configurado, intentar auto-detectarlo de pestañas de HabiTrack abiertas
    if (!authToken) {
        try {
            const tabs = await chrome.tabs.query({});
            for (const tab of tabs) {
                if (tab.url && (tab.url.includes('localhost') || tab.url.includes('127.0.0.1') || tab.url.includes('habitrack'))) {
                    const results = await chrome.scripting.executeScript({
                        target: { tabId: tab.id },
                        func: () => localStorage.getItem('token') || ''
                    });
                    if (results && results[0] && results[0].result) {
                        authToken = results[0].result;
                        chrome.storage.sync.set({ authToken });
                        console.log('🔑 Token de sesión auto-sincronizado con HabiTrack.');
                        break;
                    }
                }
            }
        } catch (e) {
            // Ignorar errores de permisos en pestañas protegidas
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
    const { serverUrl, authToken } = await getServerConfig();

    if (!propertyData || !propertyData.title || !propertyData.price) {
        throw new Error('Faltan datos obligatorios de la propiedad (título o precio).');
    }

    const headers = {
        'Content-Type': 'application/json'
    };

    if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }

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

        const res = await fetch(`${serverUrl}/api/properties`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);

        const text = await res.text();
        let json;
        try {
            json = JSON.parse(text);
        } catch (parseErr) {
            if (res.status === 401 || res.status === 403) {
                throw new Error('Inicia sesión en HabiTrack primero para autorizar la extensión.');
            }
            throw new Error(`El servidor respondió con código ${res.status}: ${text.substring(0, 80)}`);
        }

        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                throw new Error('Inicia sesión en HabiTrack primero para autorizar la extensión.');
            }
            throw new Error(json.error || `Error del servidor HTTP ${res.status}`);
        }

        return { success: true, property: json.property || json, message: 'Propiedad guardada con éxito en HabiTrack' };
    } catch (err) {
        throw new Error(err.message || 'No se pudo conectar con el servidor de HabiTrack.');
    }
}
