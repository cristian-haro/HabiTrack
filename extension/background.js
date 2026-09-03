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
    return new Promise((resolve) => {
        chrome.storage.sync.get(['serverUrl', 'authToken'], (items) => {
            resolve({
                serverUrl: (items.serverUrl || DEFAULT_SERVER_URL).replace(/\/$/, ''),
                authToken: items.authToken || ''
            });
        });
    });
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
            const data = await res.json();
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
        m2: parseFloat(propertyData.m2) || null,
        rooms: parseInt(propertyData.rooms, 10) || 0,
        baths: parseInt(propertyData.baths, 10) || 0,
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
        const timeout = setTimeout(() => controller.abort(), 6000);

        const res = await fetch(`${serverUrl}/api/properties`, {
            method: 'POST',
            headers,
            body: JSON.stringify(payload),
            signal: controller.signal
        });
        clearTimeout(timeout);

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json.error || `Error del servidor HTTP ${res.status}`);
        }

        return { success: true, property: json.property || json, message: 'Propiedad guardada con éxito en HabiTrack' };
    } catch (err) {
        throw new Error(err.message || 'No se pudo conectar con el servidor de HabiTrack.');
    }
}
