// ==========================================================================
// INTEGRACIÓN DE MAPA INTERACTIVO, CLUSTERING Y SERVICIOS CERCANOS (FASE 3)
// ==========================================================================

let markerClusterGroup = null;
let baseLayersControl = null;
let activeMapZone = null;
let activeDashboardPoiType = null;
let dashboardPoiMarkersGroup = null;

// --- CONFIGURACIÓN DE PUNTOS DE INTERÉS Y SERVICIOS CERCANOS ---
const OVERPASS_MIRRORS = [
    'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass-api.de/api/interpreter'
];

const POI_CONFIGS = {
    supermarket: {
        label: 'Supermercados',
        icon: 'fa-cart-shopping',
        pinClass: 'poi-pin-supermarket',
        radius: 2000,
        query: (lat, lng, radius) => `[out:json][timeout:15];(node["shop"="supermarket"](around:${radius},${lat},${lng});way["shop"="supermarket"](around:${radius},${lat},${lng}););out center 20;`
    },
    crossfit: {
        label: 'CrossFit / Gimnasio',
        icon: 'fa-dumbbell',
        pinClass: 'poi-pin-crossfit',
        radius: 2500,
        query: (lat, lng, radius) => `[out:json][timeout:15];(node["leisure"="fitness_centre"](around:${radius},${lat},${lng});way["leisure"="fitness_centre"](around:${radius},${lat},${lng});node["sport"="fitness"](around:${radius},${lat},${lng}););out center 20;`
    },
    fuel: {
        label: 'Gasolineras',
        icon: 'fa-gas-pump',
        pinClass: 'poi-pin-fuel',
        radius: 2500,
        query: (lat, lng, radius) => `[out:json][timeout:15];(node["amenity"="fuel"](around:${radius},${lat},${lng});way["amenity"="fuel"](around:${radius},${lat},${lng}););out center 20;`
    },
    transport: {
        label: 'Metro / Tren / Bus',
        icon: 'fa-train-subway',
        pinClass: 'poi-pin-transport',
        radius: 2000,
        query: (lat, lng, radius) => `[out:json][timeout:15];(node["railway"="station"](around:${radius},${lat},${lng});node["station"="subway"](around:${radius},${lat},${lng});node["railway"="subway_entrance"](around:${radius},${lat},${lng}););out center 20;`
    },
    pharmacy: {
        label: 'Farmacias',
        icon: 'fa-prescription-bottle-medical',
        pinClass: 'poi-pin-pharmacy',
        radius: 1500,
        query: (lat, lng, radius) => `[out:json][timeout:15];(node["amenity"="pharmacy"](around:${radius},${lat},${lng}););out center 20;`
    }
};

const poiCache = new Map();

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // metros
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return Math.round(R * c);
}

async function fetchPOIsAround(type, lat, lng) {
    const cfg = POI_CONFIGS[type];
    if (!cfg || !lat || !lng) return [];

    const cacheKey = `${type}_${Number(lat).toFixed(3)}_${Number(lng).toFixed(3)}`;
    if (poiCache.has(cacheKey)) {
        return poiCache.get(cacheKey);
    }

    const overpassQuery = cfg.query(lat, lng, cfg.radius);

    for (const endpoint of OVERPASS_MIRRORS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);

            const url = `${endpoint}?data=${encodeURIComponent(overpassQuery)}`;
            const res = await fetch(url, { signal: controller.signal });
            clearTimeout(timeoutId);

            if (!res.ok) continue;

            const text = await res.text();
            if (!text.startsWith('{')) continue;
            const data = JSON.parse(text);

            if (!data.elements || !Array.isArray(data.elements) || data.elements.length === 0) continue;

            const pois = data.elements.map(el => {
                const pLat = el.lat || (el.center && el.center.lat);
                const pLon = el.lon || (el.center && el.center.lon);
                if (!pLat || !pLon) return null;

                const tags = el.tags || {};
                let name = tags.name || tags.brand || tags.operator;
                if (!name) {
                    if (type === 'supermarket') name = 'Supermercado';
                    else if (type === 'crossfit') name = tags.sport ? `Gimnasio (${tags.sport})` : 'Gimnasio / Fitness';
                    else if (type === 'fuel') name = 'Gasolinera';
                    else if (type === 'transport') name = 'Estación / Parada';
                    else if (type === 'pharmacy') name = 'Farmacia';
                    else name = cfg.label;
                }

                const dist = calculateDistanceMeters(lat, lng, pLat, pLon);

                return {
                    id: el.id,
                    name,
                    brand: tags.brand || '',
                    type,
                    lat: pLat,
                    lon: pLon,
                    distance: dist
                };
            }).filter(Boolean);

            if (pois.length > 0) {
                // Ordenar de más cercano a más lejano
                pois.sort((a, b) => a.distance - b.distance);
                poiCache.set(cacheKey, pois);
                return pois;
            }
        } catch (err) {
            // Continuar con el siguiente mirror
        }
    }

    return [];
}

function renderMap() {
    const mapContainer = document.getElementById('interactive-map');
    if (!mapContainer) return;

    const propertiesWithCoords = properties.filter(p => p.latitude !== null && p.longitude !== null && !isNaN(p.latitude) && !isNaN(p.longitude));
    
    // Actualizar contador en cabecera
    const counterEl = document.getElementById('map-counter');
    if (counterEl) {
        counterEl.textContent = `${propertiesWithCoords.length} ubicadas`;
    }

    // Renderizar analítica y pastillas de zona
    renderMapZoneAnalytics(propertiesWithCoords);

    // Definición de Capas Base Cartográficas
    const streetsLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; CARTO Voyager'
    });

    const satelliteLayer = L.tileLayer('https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        maxZoom: 20,
        attribution: '&copy; Google Maps Satélite'
    });

    const darkLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        attribution: '&copy; CARTO Dark'
    });

    const baseMaps = {
        "🗺️ Calles / Urbano": streetsLayer,
        "🛰️ Satélite Híbrido": satelliteLayer,
        "🌙 Modo Noche": darkLayer
    };

    if (!mapInstance) {
        mapInstance = L.map('interactive-map', {
            center: [40.4167, -3.7037],
            zoom: 6,
            layers: [satelliteLayer]
        });
        baseLayersControl = L.control.layers(baseMaps, null, { position: 'topright' }).addTo(mapInstance);
    }

    // Limpiar marcadores y cluster existentes
    if (markerClusterGroup) {
        mapInstance.removeLayer(markerClusterGroup);
        markerClusterGroup = null;
    }
    mapMarkers.forEach(marker => mapInstance.removeLayer(marker));
    mapMarkers = [];

    if (propertiesWithCoords.length === 0) {
        mapInstance.setView([40.4167, -3.7037], 6);
        return;
    }

    // Crear grupo de clusters si la librería MarkerCluster está disponible
    const useCluster = typeof L.markerClusterGroup === 'function';
    if (useCluster) {
        markerClusterGroup = L.markerClusterGroup({
            showCoverageOnHover: false,
            maxClusterRadius: 45,
            spiderfyOnMaxZoom: true,
            animate: true,
            disableClusteringAtZoom: 17
        });
    }

    propertiesWithCoords.forEach(p => {
        const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
        const isSecondHand = p.estate_type === 'secondhand';
        const priceM2 = p.m2 && p.m2 > 0 ? `${formatCurrency(Math.round(p.price / p.m2))}/m²` : '';
        
        let photoHTML = '';
        if (p.photos) {
            const firstPhoto = p.photos.split(',')[0].trim();
            if (firstPhoto) {
                photoHTML = `<img src="${firstPhoto}" referrerpolicy="no-referrer" loading="lazy" style="width: 100%; height: 95px; object-fit: cover; border-radius: 6px; margin-bottom: 0.45rem; cursor: pointer;" title="Ver fotos a pantalla completa" onclick="openGalleryModal(${p.id})" alt="${p.title}">`;
            }
        }

        const popupContent = `
            <div class="map-popup-card">
                ${photoHTML}
                <div class="map-popup-title">${p.title}</div>
                <div class="map-popup-zone"><i class="fa-solid fa-location-dot text-indigo"></i> ${p.zone || 'Sin zona'} · <span style="color:#047857; font-weight: 600;">${isSecondHand ? '2ª Mano' : 'Obra Nueva'}</span></div>
                <div class="map-popup-price">${formatCurrency(p.price)} ${priceM2 ? `<small style="font-size:0.75rem; color:#64748b; font-weight:600;">(${priceM2})</small>` : ''}</div>
                <div class="map-popup-detail"><i class="fa-solid fa-calculator text-indigo"></i> Hipoteca: <strong>${formatCurrency(calc.mortgageMonthlyPayment)}/mes</strong></div>
                <div class="map-popup-detail"><i class="fa-solid fa-wallet text-amber"></i> Ahorro Firma: <strong>${formatCurrency(calc.totalRequiredBudget)}</strong></div>
                <div class="map-popup-actions">
                    <div class="map-popup-btn map-popup-btn-primary" onclick="openPropertyDetailSheet(${p.id})"><i class="fa-solid fa-id-card"></i> Ver Ficha</div>
                    <div class="map-popup-btn map-popup-btn-secondary" onclick="showExpensesBreakdownModalFromMap(${p.id})"><i class="fa-solid fa-calculator text-emerald"></i> Gastos</div>
                </div>
            </div>
        `;

        const pinIcon = L.divIcon({
            className: 'custom-map-marker',
            html: `<div class="map-marker-pin" data-prop-id="${p.id}"><i class="fa-solid fa-house"></i> <span>${formatCurrency(p.price)}</span></div>`,
            iconSize: [85, 30],
            iconAnchor: [42, 30],
            popupAnchor: [0, -32]
        });

        const marker = L.marker([p.latitude, p.longitude], { icon: pinIcon });
        marker.bindPopup(popupContent, { maxWidth: 280 });
        marker.propData = p;

        if (useCluster && markerClusterGroup) {
            markerClusterGroup.addLayer(marker);
        } else {
            marker.addTo(mapInstance);
        }
        mapMarkers.push(marker);
    });

    if (useCluster && markerClusterGroup) {
        mapInstance.addLayer(markerClusterGroup);
    }

    recenterMap();
}

function recenterMap(zoneFilter = null) {
    if (!mapInstance || mapMarkers.length === 0) return;

    let targetMarkers = mapMarkers;
    if (zoneFilter) {
        targetMarkers = mapMarkers.filter(m => m.propData && m.propData.zone && m.propData.zone.toLowerCase().trim() === zoneFilter.toLowerCase().trim());
        if (targetMarkers.length === 0) targetMarkers = mapMarkers;
    }

    const group = new L.featureGroup(targetMarkers);
    mapInstance.fitBounds(group.getBounds().pad(0.18), { maxZoom: 16, animate: true });
}

function renderMapZoneAnalytics(propertiesWithCoords) {
    const bar = document.getElementById('map-zones-analytics');
    if (!bar) return;

    if (propertiesWithCoords.length === 0) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        return;
    }

    // Agrupar por zona
    const zoneMap = {};
    propertiesWithCoords.forEach(p => {
        const zoneName = p.zone ? p.zone.trim() : 'Sin zona';
        if (!zoneMap[zoneName]) {
            zoneMap[zoneName] = { name: zoneName, count: 0, sumPrice: 0, sumM2: 0 };
        }
        zoneMap[zoneName].count++;
        zoneMap[zoneName].sumPrice += p.price;
        if (p.m2 && p.m2 > 0) {
            zoneMap[zoneName].sumM2 += p.m2;
        }
    });

    const zoneList = Object.values(zoneMap).sort((a, b) => b.count - a.count);

    bar.innerHTML = `
        <div class="zone-chip ${!activeMapZone ? 'active' : ''}" onclick="filterMapByZone(null)">
            <i class="fa-solid fa-globe"></i>
            <span>Todas (${propertiesWithCoords.length})</span>
        </div>
        ${zoneList.map(z => {
            const avgM2Price = z.sumM2 > 0 ? Math.round(z.sumPrice / z.sumM2) : null;
            const priceTag = avgM2Price ? `<span class="zone-price-sub">${formatCurrency(avgM2Price)}/m²</span>` : '';
            return `
                <div class="zone-chip ${activeMapZone === z.name ? 'active' : ''}" onclick="filterMapByZone('${z.name.replace(/'/g, "\\'")}')" title="${z.count} pisos en ${z.name}">
                    <i class="fa-solid fa-location-dot text-indigo"></i>
                    <span>${z.name} <strong>(${z.count})</strong></span>
                    ${priceTag}
                </div>
            `;
        }).join('')}
    `;

    bar.style.display = 'flex';
}

window.filterMapByZone = function(zoneName) {
    activeMapZone = zoneName;
    const propertiesWithCoords = properties.filter(p => p.latitude !== null && p.longitude !== null);
    renderMapZoneAnalytics(propertiesWithCoords);
    recenterMap(zoneName);
    if (zoneName) {
        showToast(`📍 Enfocando zona: ${zoneName}`, 'info');
    }
};

window.showExpensesBreakdownModalFromMap = function(id) {
    const prop = properties.find(p => p.id === id);
    if (prop) {
        showExpensesBreakdownModal(prop);
    }
};

// --- DETECTOR GLOBAL DE PEGADO DE BOOKMARKLET (Ctrl+V / Cmd+V) ---
window.addEventListener('paste', (e) => {
    const activeElement = document.activeElement;
    // Si el usuario ya está escribiendo en el área de pegado manual, dejamos que actúe por defecto
    if (activeElement && activeElement.id === 'modal-paste-area') {
        return;
    }

    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    try {
        const cleanText = pastedText.trim();
        if (cleanText.startsWith('{') && cleanText.endsWith('}')) {
            const parsed = JSON.parse(cleanText);
            if (parsed.url && (parsed.price !== undefined || parsed.m2 !== undefined)) {
                e.preventDefault();
                
                const data = parseListingText(cleanText);
                if (data) {
                    // Resetear y preparar modal
                    const propertyForm = document.getElementById('property-form');
                    const propertyModal = document.getElementById('property-modal');
                    if (propertyForm && propertyModal) {
                        propertyForm.reset();
                        document.getElementById('property-id').value = '';
                        document.getElementById('modal-title').textContent = 'Guardar Propiedad Detectada';
                        document.getElementById('modal-paste-area').value = '';
                        document.getElementById('modal-url-input').value = '';
                        
                        fillPropertyForm(data);
                        
                        // Ocultar pestañas de extracción e ir al formulario
                        document.getElementById('extraction-tabs').style.display = 'none';
                        switchTab('manual-form-tab');
                        
                        // Abrir modal
                        propertyModal.classList.add('active');
                        showToast('¡Datos del anuncio importados automáticamente!', 'success');
                    }
                }
            }
        }
    } catch (err) {
        // Ignorar errores de análisis y dejar comportamiento nativo para textos ordinarios
    }
});

// --- INTERACTIVIDAD DEL SELECTOR DE DISPOSITIVOS EN EL BOOKMARKLET ---
document.addEventListener('DOMContentLoaded', () => {
    const toggleDesktopBtn = document.getElementById('toggle-desktop');
    const toggleMobileBtn = document.getElementById('toggle-mobile');
    const desktopInstructions = document.getElementById('instructions-desktop');
    const mobileInstructions = document.getElementById('instructions-mobile');

    if (toggleDesktopBtn && toggleMobileBtn && desktopInstructions && mobileInstructions) {
        toggleDesktopBtn.addEventListener('click', () => {
            toggleDesktopBtn.style.background = 'var(--primary)';
            toggleDesktopBtn.style.color = '#fff';
            toggleMobileBtn.style.background = 'transparent';
            toggleMobileBtn.style.color = 'var(--text-muted)';
            desktopInstructions.style.display = 'block';
            mobileInstructions.style.display = 'none';
        });
        
        toggleMobileBtn.addEventListener('click', () => {
            toggleMobileBtn.style.background = 'var(--primary)';
            toggleMobileBtn.style.color = '#fff';
            toggleDesktopBtn.style.background = 'transparent';
            toggleDesktopBtn.style.color = 'var(--text-muted)';
            desktopInstructions.style.display = 'none';
            mobileInstructions.style.display = 'block';
        });
    }

    const guideToggleDesktopBtn = document.getElementById('guide-toggle-desktop');
    const guideToggleMobileBtn = document.getElementById('guide-toggle-mobile');
    const guideDesktopInstructions = document.getElementById('guide-instructions-desktop');
    const guideMobileInstructions = document.getElementById('guide-instructions-mobile');

    if (guideToggleDesktopBtn && guideToggleMobileBtn && guideDesktopInstructions && guideMobileInstructions) {
        guideToggleDesktopBtn.addEventListener('click', () => {
            guideToggleDesktopBtn.style.background = 'var(--primary)';
            guideToggleDesktopBtn.style.color = '#fff';
            guideToggleMobileBtn.style.background = 'transparent';
            guideToggleMobileBtn.style.color = 'var(--text-muted)';
            guideDesktopInstructions.style.display = 'block';
            guideMobileInstructions.style.display = 'none';
        });
        
        guideToggleMobileBtn.addEventListener('click', () => {
            guideToggleMobileBtn.style.background = 'var(--primary)';
            guideToggleMobileBtn.style.color = '#fff';
            guideToggleDesktopBtn.style.background = 'transparent';
            guideToggleDesktopBtn.style.color = 'var(--text-muted)';
            guideDesktopInstructions.style.display = 'none';
            guideMobileInstructions.style.display = 'block';
        });
    }
});
