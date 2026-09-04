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

// Workspace API
export const workspacesAPI = {
    list: () => apiRequest('/api/workspaces'),
    create: (name) => apiRequest('/api/workspaces', { method: 'POST', body: JSON.stringify({ name }) }),
    join: (invite_code) => apiRequest('/api/workspaces/join', { method: 'POST', body: JSON.stringify({ invite_code }) }),
    getDetails: (id) => apiRequest(`/api/workspaces/${id}`),
    leave: (id) => apiRequest(`/api/workspaces/${id}/leave`, { method: 'DELETE' })
};

// Collaboration API (Votes & Comments)
export const collaborationAPI = {
    vote: (propertyId, vote, score = 0) => apiRequest(`/api/propiedades/${propertyId}/votes`, {
        method: 'POST',
        body: JSON.stringify({ vote, score })
    }),
    getVotes: (propertyId) => apiRequest(`/api/propiedades/${propertyId}/votes`),
    addComment: (propertyId, comment) => apiRequest(`/api/propiedades/${propertyId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ comment })
    }),
    getComments: (propertyId) => apiRequest(`/api/propiedades/${propertyId}/comments`),
    deleteComment: (propertyId, commentId) => apiRequest(`/api/propiedades/${propertyId}/comments/${commentId}`, {
        method: 'DELETE'
    })
};
