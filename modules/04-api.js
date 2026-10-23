// ==========================================================================
// SERVICIOS API (CONEXIÓN BACKEND EXPRESS + SQLITE)
// ==========================================================================

async function fetchSettings() {
    try {
        const response = await fetch('/api/ajustes', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return;
        }
        if (response.ok) {
            appSettings = await response.json();
        } else {
            showToast('Error al cargar configuración. Usando valores locales.', 'error');
        }
    } catch (err) {
        console.error('Error fetching settings:', err);
        showToast('Error de conexión con el servidor backend.', 'error');
    }
}

async function saveSettings(newSettings) {
    try {
        const response = await fetch('/api/ajustes', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(newSettings)
        });
        if (response.status === 401 || response.status === 403) {
            logout();
            return false;
        }
        if (response.ok) {
            const data = await response.json();
            appSettings = data.config;
            showToast('Configuración guardada en base de datos.', 'success');
            return true;
        } else {
            showToast('No se pudo guardar la configuración.', 'error');
            return false;
        }
    } catch (err) {
        console.error('Error saving settings:', err);
        showToast('Error al conectar con el servidor para guardar.', 'error');
        return false;
    }
}
