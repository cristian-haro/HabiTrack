import { state } from './state.js';

/**
 * Universal Fetch Wrapper for HabiTrack API
 */
export async function apiRequest(endpoint, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };

    if (state.token) {
        headers['Authorization'] = `Bearer ${state.token}`;
    }

    try {
        const response = await fetch(endpoint, {
            ...options,
            headers
        });

        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token');
            localStorage.removeItem('username');
            state.token = '';
            state.username = '';
            window.location.reload();
            return { ok: false, status: response.status, data: { error: 'Sesión caducada.' } };
        }

        let data = {};
        const text = await response.text();
        if (text) {
            try {
                data = JSON.parse(text);
            } catch {
                data = { message: text };
            }
        }

        return {
            ok: response.ok,
            status: response.status,
            data
        };
    } catch (err) {
        console.error(`API Error [${endpoint}]:`, err);
        return {
            ok: false,
            status: 0,
            data: { error: 'Error de conexión con el servidor. Verifica tu conexión.' }
        };
    }
}
