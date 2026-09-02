import { state } from './state.js';
import { formatCurrency } from './calculator.js';

/**
 * Initializes and manages Leaflet interactive map with custom glassmorphic markers
 */
export function initLeafletMap(containerId = 'map-view-container') {
    const el = document.getElementById(containerId);
    if (!el || typeof L === 'undefined') return;

    if (state.mapInstance) {
        state.mapInstance.invalidateSize();
        return;
    }

    // Default center in Spain (Madrid)
    state.mapInstance = L.map(containerId, {
        zoomControl: true,
        scrollWheelZoom: false
    }).setView([40.4168, -3.7038], 6);

    // Dark sleek CartoDB tile layer
    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a>',
        maxZoom: 19
    }).addTo(state.mapInstance);

    updateMapMarkers();
}

/**
 * Renders markers for all properties with coordinates on the map
 */
export function updateMapMarkers() {
    if (!state.mapInstance || typeof L === 'undefined') return;

    // Clear existing markers
    if (state.mapMarkers && state.mapMarkers.length > 0) {
        state.mapMarkers.forEach(m => state.mapInstance.removeLayer(m));
        state.mapMarkers = [];
    }

    const bounds = [];

    state.properties.forEach(prop => {
        if (prop.latitude && prop.longitude) {
            const lat = parseFloat(prop.latitude);
            const lng = parseFloat(prop.longitude);

            if (!isNaN(lat) && !isNaN(lng)) {
                const marker = L.marker([lat, lng])
                    .addTo(state.mapInstance)
                    .bindPopup(`
                        <div style="font-family: sans-serif; font-size: 13px; line-height: 1.4; color: #1e293b;">
                            <strong style="color: #4f46e5; font-size: 14px;">${escapeHtml(prop.title)}</strong><br>
                            <span style="font-weight: 700; color: #059669; font-size: 15px;">${formatCurrency(prop.price)}</span>
                            ${prop.m2 ? ` · <span>${prop.m2} m²</span>` : ''}
                            ${prop.rooms ? ` · <span>${prop.rooms} hab.</span>` : ''}<br>
                            <span style="color: #64748b;">${escapeHtml(prop.zone || prop.ccaa)}</span>
                        </div>
                    `);

                state.mapMarkers.push(marker);
                bounds.push([lat, lng]);
            }
        }
    });

    if (bounds.length > 0) {
        state.mapInstance.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
}

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, m => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[m]);
}
