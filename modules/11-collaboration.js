// ==========================================================================
// COLABORACIÓN: VOTACIÓN Y COMENTARIOS
// ==========================================================================

function renderDetailCollabVoting(prop) {
    const votingBlock = document.getElementById('detail-collab-voting-block');
    if (!votingBlock) return;

    const votes = prop.votes || [];
    const myVoteObj = votes.find(v => (currentUserId && v.user_id == currentUserId) || (currentUserEmail && v.email === currentUserEmail));
    const myVote = myVoteObj ? myVoteObj.vote : null;

    const myVoteStatusEl = document.getElementById('detail-my-vote-status');
    if (myVoteStatusEl) {
        myVoteStatusEl.textContent = myVote === 'like' ? 'Tu voto: ❤️ Me encanta' :
                                    myVote === 'maybe' ? 'Tu voto: 🤔 Con dudas' :
                                    myVote === 'dislike' ? 'Tu voto: ❌ Descartado' : 'Tu voto: Ninguno';
    }

    // Marcar botón activo
    const votePills = votingBlock.querySelectorAll('.btn-vote-pill');
    votePills.forEach(pill => {
        const v = pill.getAttribute('data-vote');
        pill.classList.toggle('active', v === myVote);
        pill.onclick = (e) => {
            e.preventDefault();
            window.voteProperty(prop.id, v);
        };
    });

    // Resumen de votos de los miembros del espacio
    const summaryEl = document.getElementById('detail-votes-summary');
    if (summaryEl) {
        if (votes.length === 0) {
            summaryEl.innerHTML = '<span style="font-size: 0.78rem; color: var(--text-muted);"><i class="fa-solid fa-users"></i> Aún ningún miembro del espacio ha votado este piso.</span>';
        } else {
            summaryEl.innerHTML = votes.map(v => {
                const initial = (v.username || v.email || 'U').charAt(0).toUpperCase();
                const emoji = v.vote === 'like' ? '❤️' : (v.vote === 'maybe' ? '🤔' : '❌');
                const label = v.vote === 'like' ? 'Me encanta' : (v.vote === 'maybe' ? 'Dudas' : 'Descartar');
                const name = v.username || v.email.split('@')[0];
                return `
                    <div class="collab-member-vote-chip" title="${name}: ${label}">
                        <div class="ws-member-avatar" style="width: 20px; height: 20px; font-size: 0.65rem;">${initial}</div>
                        <span><strong>${name}:</strong> ${emoji} ${label}</span>
                    </div>
                `;
            }).join('');
        }
    }
}

window.voteProperty = async function(propId, voteType) {
    if (!token) return;
    try {
        const response = await fetch(`/api/propiedades/${propId}/votes`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ vote: voteType, score: 0 })
        });
        if (response.ok) {
            const data = await response.json();
            const prop = properties.find(p => p.id == propId);
            if (prop) {
                prop.votes = data.votes || [];
            }
            // Update cards in listings
            renderListings();
            // If detail modal is open for this property, refresh detail modal voting
            if (activeDetailProperty && activeDetailProperty.id == propId) {
                activeDetailProperty.votes = data.votes || [];
                renderDetailCollabVoting(activeDetailProperty);
            }
            const msg = voteType === 'like' ? '¡Voto "Me encanta" registrado! ❤️' :
                        voteType === 'maybe' ? 'Voto "Con dudas" registrado. 🤔' :
                        voteType === 'dislike' ? 'Voto "Descartar" registrado. ❌' :
                        'Voto eliminado.';
            showToast(msg, 'success');
        }
    } catch (err) {
        console.error('Error voting property:', err);
        showToast('Error al registrar el voto.', 'error');
    }
};

async function loadPropertyComments(propId) {
    try {
        const res = await fetch(`/api/propiedades/${propId}/comments`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            activeDetailComments = data.comments || [];
            renderPropertyCommentsList(activeDetailComments);
        }
    } catch (err) {
        console.error('Error fetching property comments:', err);
    }
}

function renderPropertyCommentsList(comments) {
    const listEl = document.getElementById('detail-comments-list');
    if (!listEl) return;

    if (!comments || comments.length === 0) {
        listEl.innerHTML = `
            <div class="collab-empty-comments">
                <i class="fa-solid fa-message-dots" style="font-size: 1.5rem; color: #cbd5e1;"></i>
                <span>No hay notas de visita ni comentarios en este inmueble aún.</span>
            </div>
        `;
        return;
    }

    listEl.innerHTML = comments.map(c => {
        const initial = (c.author_name || c.author_email || 'U').charAt(0).toUpperCase();
        const dateStr = formatRelativeTime(c.created_at);
        const isMine = (currentUserId && c.user_id == currentUserId) || (currentUserEmail && c.author_email === currentUserEmail);
        const deleteBtn = isMine ? `
            <button type="button" class="collab-comment-delete" onclick="window.deletePropertyComment(${c.property_id}, ${c.id})" title="Eliminar esta nota">
                <i class="fa-solid fa-trash-can"></i>
            </button>
        ` : '';

        return `
            <div class="collab-comment-item">
                <div class="collab-comment-avatar">${initial}</div>
                <div class="collab-comment-bubble">
                    <div class="collab-comment-header">
                        <span class="collab-comment-author">${c.author_name || c.author_email.split('@')[0]}</span>
                        <div style="display: flex; align-items: center;">
                            <span class="collab-comment-time">${dateStr}</span>
                            ${deleteBtn}
                        </div>
                    </div>
                    <div class="collab-comment-body">${escapeHTML(c.comment)}</div>
                </div>
            </div>
        `;
    }).join('');
}

window.deletePropertyComment = async function(propId, commentId) {
    if (!confirm('¿Seguro que deseas eliminar esta nota de visita?')) return;
    try {
        const res = await fetch(`/api/propiedades/${propId}/comments/${commentId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            showToast('Nota eliminada.', 'success');
            await loadPropertyComments(propId);
            const prop = properties.find(p => p.id == propId);
            if (prop && prop.comments_count > 0) prop.comments_count--;
            renderListings();
        }
    } catch (err) {
        console.error('Error deleting comment:', err);
    }
};

function formatRelativeTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        const now = new Date();
        const diffSecs = Math.floor((now - date) / 1000);
        if (diffSecs < 60) return 'hace un momento';
        if (diffSecs < 3600) return `hace ${Math.floor(diffSecs / 60)} min`;
        if (diffSecs < 86400) return `hace ${Math.floor(diffSecs / 3600)} h`;
        return date.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    } catch (e) {
        return dateString;
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}

function renderDetailGalleryView(photoList) {
    const mainPhoto = document.getElementById('detail-main-photo');
    const thumbsRow = document.getElementById('detail-thumbnails-row');
    const prevBtn = document.getElementById('detail-btn-prev-photo');
    const nextBtn = document.getElementById('detail-btn-next-photo');
    const fullScreenBtn = document.getElementById('detail-btn-fullscreen');

    if (photoList.length === 0) {
        if (mainPhoto) mainPhoto.src = 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80';
        if (thumbsRow) thumbsRow.style.display = 'none';
        if (prevBtn) prevBtn.style.display = 'none';
        if (nextBtn) nextBtn.style.display = 'none';
        return;
    }

    if (mainPhoto) {
        mainPhoto.src = photoList[activeDetailPhotoIdx] || photoList[0];
    }

    if (prevBtn && nextBtn) {
        prevBtn.style.display = photoList.length > 1 ? 'flex' : 'none';
        nextBtn.style.display = photoList.length > 1 ? 'flex' : 'none';

        prevBtn.onclick = (e) => {
            e.stopPropagation();
            activeDetailPhotoIdx = (activeDetailPhotoIdx - 1 + photoList.length) % photoList.length;
            renderDetailGalleryView(photoList);
        };

        nextBtn.onclick = (e) => {
            e.stopPropagation();
            activeDetailPhotoIdx = (activeDetailPhotoIdx + 1) % photoList.length;
            renderDetailGalleryView(photoList);
        };
    }

    if (fullScreenBtn) {
        fullScreenBtn.onclick = (e) => {
            e.stopPropagation();
            if (activeDetailProperty) {
                openGalleryModal(activeDetailProperty.id, activeDetailPhotoIdx);
            }
        };
    }

    const mainWrap = document.getElementById('detail-main-photo-wrap');
    if (mainWrap) {
        mainWrap.onclick = (e) => {
            if (e.target.closest('.card-carousel-btn') || e.target.closest('.detail-fullscreen-btn')) return;
            if (activeDetailProperty) {
                openGalleryModal(activeDetailProperty.id, activeDetailPhotoIdx);
            }
        };
    }

    if (thumbsRow) {
        thumbsRow.style.display = photoList.length > 1 ? 'flex' : 'none';
        thumbsRow.innerHTML = photoList.map((photo, i) => `
            <img src="${photo}" 
                 class="detail-thumb-item ${i === activeDetailPhotoIdx ? 'active' : ''}" 
                 data-idx="${i}" 
                 referrerpolicy="no-referrer"
                 alt="Foto ${i + 1}"
                 onclick="window.setDetailPhotoIdx(${i})">
        `).join('');
    }
}

window.setDetailPhotoIdx = function(idx) {
    if (!activeDetailProperty) return;
    const photoList = activeDetailProperty.photos ? activeDetailProperty.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    if (idx >= 0 && idx < photoList.length) {
        activeDetailPhotoIdx = idx;
        renderDetailGalleryView(photoList);
    }
};

let activeDetailPoiType = null;
let detailPoiMarkersGroup = null;

function initDetailMiniMap(prop) {
    const mapEl = document.getElementById('detail-minimap');
    if (!mapEl || !prop.latitude || !prop.longitude) return;

    if (detailMiniMapInstance) {
        detailMiniMapInstance.remove();
        detailMiniMapInstance = null;
    }

    detailMiniMapInstance = L.map('detail-minimap', {
        center: [prop.latitude, prop.longitude],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
    });

    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
    }).addTo(detailMiniMapInstance);

    const pinIcon = L.divIcon({
        className: 'custom-map-marker',
        html: `<div class="map-marker-pin"><i class="fa-solid fa-house"></i> <span>${formatCurrency(prop.price)}</span></div>`,
        iconSize: [85, 30],
        iconAnchor: [42, 30]
    });

    const extLink = document.getElementById('detail-map-ext-link');
    if (extLink) {
        extLink.href = `https://www.google.com/maps/search/?api=1&query=${prop.latitude},${prop.longitude}`;
    }

    const propMarker = L.marker([prop.latitude, prop.longitude], { icon: pinIcon }).addTo(detailMiniMapInstance);

    // Reset POI Toolbar in Detail Modal
    activeDetailPoiType = null;
    const detailPoiChips = document.querySelectorAll('#detail-poi-toolbar .poi-chip');
    const resultsContainer = document.getElementById('detail-poi-results-container');
    if (resultsContainer) {
        resultsContainer.style.display = 'none';
        resultsContainer.innerHTML = '';
    }

    detailPoiChips.forEach(chip => {
        chip.classList.remove('active', 'loading');
        chip.onclick = async (e) => {
            e.stopPropagation();
            const poiType = chip.getAttribute('data-poi');
            
            if (activeDetailPoiType === poiType) {
                // Desactivar
                activeDetailPoiType = null;
                chip.classList.remove('active');
                if (detailPoiMarkersGroup) {
                    detailMiniMapInstance.removeLayer(detailPoiMarkersGroup);
                    detailPoiMarkersGroup = null;
                }
                if (resultsContainer) {
                    resultsContainer.style.display = 'none';
                    resultsContainer.innerHTML = '';
                }
                detailMiniMapInstance.setView([prop.latitude, prop.longitude], 15);
                return;
            }

            // Activar nuevo tipo de POI
            detailPoiChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active', 'loading');
            activeDetailPoiType = poiType;

            if (resultsContainer) {
                resultsContainer.style.display = 'block';
                resultsContainer.innerHTML = `<div style="color:#64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Buscando ${POI_CONFIGS[poiType].label.toLowerCase()} cercanos...</div>`;
            }

            const pois = await fetchPOIsAround(poiType, prop.latitude, prop.longitude);
            chip.classList.remove('loading');

            if (detailPoiMarkersGroup) {
                detailMiniMapInstance.removeLayer(detailPoiMarkersGroup);
                detailPoiMarkersGroup = null;
            }

            if (!pois || pois.length === 0) {
                if (resultsContainer) {
                    const gmapsSearchUrl = `https://www.google.com/maps/search/${encodeURIComponent(POI_CONFIGS[poiType].label)}/@${prop.latitude},${prop.longitude},15z`;
                    resultsContainer.innerHTML = `
                        <div style="color:#64748b; font-size:0.75rem;">
                            No se encontraron ${POI_CONFIGS[poiType].label.toLowerCase()} en OpenStreetMap en un radio de 1.5-2km.
                            <a href="${gmapsSearchUrl}" target="_blank" style="color:#4f46e5; font-weight:700; text-decoration:underline; margin-left:4px;">
                                <i class="fa-solid fa-arrow-up-right-from-square"></i> Buscar en Google Maps
                            </a>
                        </div>
                    `;
                }
                return;
            }

            detailPoiMarkersGroup = L.featureGroup();
            const cfg = POI_CONFIGS[poiType];

            pois.forEach(p => {
                const poiIcon = L.divIcon({
                    className: 'custom-map-marker',
                    html: `<div class="poi-marker-pin ${cfg.pinClass}"><i class="fa-solid ${cfg.icon}"></i> <span>${p.name.substring(0, 18)}</span></div>`,
                    iconSize: [80, 24],
                    iconAnchor: [40, 24]
                });

                const poiMarker = L.marker([p.lat, p.lon], { icon: poiIcon });
                poiMarker.bindPopup(`
                    <div style="font-family:var(--font-body); font-size:0.8rem;">
                        <strong>${p.name}</strong><br>
                        <span style="color:#64748b;"><i class="fa-solid fa-location-arrow"></i> A ${p.distance} metros</span><br>
                        <a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" style="color:#4f46e5; font-weight:600; font-size:0.75rem;">Cómo llegar &rarr;</a>
                    </div>
                `);
                detailPoiMarkersGroup.addLayer(poiMarker);
            });

            detailPoiMarkersGroup.addLayer(propMarker);
            detailMiniMapInstance.addLayer(detailPoiMarkersGroup);
            detailMiniMapInstance.fitBounds(detailPoiMarkersGroup.getBounds().pad(0.2));

            // Renderizar lista previa en el panel
            if (resultsContainer) {
                resultsContainer.innerHTML = `
                    <div style="font-weight:700; margin-bottom:0.35rem; color:#1e293b; display:flex; justify-content:space-between;">
                        <span><i class="fa-solid ${cfg.icon}"></i> ${cfg.label} más cercanos (${pois.length}):</span>
                        <a href="https://www.google.com/maps/search/${encodeURIComponent(cfg.label)}/@${prop.latitude},${prop.longitude},15z" target="_blank" style="color:#4f46e5; font-size:0.7rem;">Ver en Google Maps &rarr;</a>
                    </div>
                    ${pois.slice(0, 5).map(p => `
                        <div class="poi-item-row">
                            <span class="poi-item-title"><i class="fa-solid fa-location-dot" style="color:#64748b; font-size:0.65rem;"></i> ${p.name}</span>
                            <span class="poi-item-dist">${p.distance < 1000 ? p.distance + ' m' : (p.distance / 1000).toFixed(1) + ' km'}</span>
                        </div>
                    `).join('')}
                `;
            }
        };
    });
}



function renderListings() {
    const gridViewContainer = document.getElementById('listings-grid-view');
    const tableBody = document.getElementById('comparison-table-body');

    if (!gridViewContainer || !tableBody) return;

    // Aplicar filtros
    const filteredProperties = applyFilters(properties);

    // Calcular páginas totales y reajustar currentPage si es necesario
    const totalPages = Math.ceil(filteredProperties.length / pageSize) || 1;
    if (currentPage > totalPages) {
        currentPage = totalPages;
    }
    if (currentPage < 1) {
        currentPage = 1;
    }

    // Actualizar botones e indicador de página en el DOM
    const prevBtn = document.getElementById('btn-prev-page');
    const nextBtn = document.getElementById('btn-next-page');
    const indicator = document.getElementById('page-indicator');

    if (prevBtn && nextBtn && indicator) {
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage === totalPages;
        indicator.innerHTML = `<span>Página <strong class="page-num">${currentPage}</strong> de <strong class="page-num">${totalPages}</strong></span>`;
    }

    if (filteredProperties.length === 0) {
        const emptyHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-filter-circle-xmark"></i>
                <p>Ninguna propiedad coincide con los filtros aplicados.</p>
            </div>
        `;
        gridViewContainer.innerHTML = emptyHTML;
        tableBody.innerHTML = `<tr><td colspan="13" class="text-center">No hay viviendas que cumplan con los filtros.</td></tr>`;
        return;
    }

    // Slicing para paginación
    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const paginatedProperties = filteredProperties.slice(start, end);

    // Renderizar vista cuadrícula
    gridViewContainer.innerHTML = '';
    paginatedProperties.forEach(prop => {
        gridViewContainer.appendChild(createPropertyCardDOM(prop));
    });

    // Renderizar vista tabla
    tableBody.innerHTML = '';
    paginatedProperties.forEach(prop => {
        const tr = document.createElement('tr');
        const calc = calculateExpenses(prop.price, prop.ccaa, prop.estate_type);
        
        let photoHTML = `<div class="table-prop-img bg-indigo flex-center"><i class="fa-solid fa-house text-muted" style="font-size: 1.2rem;"></i></div>`;
        if (prop.photos) {
            const firstPhoto = prop.photos.split(',')[0].trim();
            if (firstPhoto) {
                photoHTML = `<img src="${firstPhoto}" class="table-prop-img" alt="${prop.title}" title="Ver fotos a pantalla completa" style="cursor: pointer;" onclick="openGalleryModal(${prop.id})" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'table-prop-img bg-indigo flex-center\\'><i class=\\'fa-solid fa-house text-muted\\' style=\\'font-size: 1.2rem;\\'></i></div>';">`;
            }
        }

        const garageIcon = prop.garage === 'si' ? '<i class="fa-solid fa-circle-check text-emerald" title="Sí"></i>' : 
                         prop.garage === 'opcional' ? '<i class="fa-solid fa-circle-question text-amber" title="Opcional"></i>' : 
                         '<i class="fa-solid fa-circle-xmark text-rose" title="No"></i>';
        const elevatorIcon = prop.elevator === 'si' ? '<i class="fa-solid fa-circle-check text-emerald" title="Sí"></i>' :
                           prop.elevator === 'no' ? '<i class="fa-solid fa-circle-xmark text-rose" title="No"></i>' : 
                           '<span class="text-muted">--</span>';

        const mapLink = (prop.latitude && prop.longitude) ? 
            `<a href="https://www.google.com/maps/search/?api=1&query=${prop.latitude},${prop.longitude}" target="_blank" class="btn-map" title="Ver en Google Maps"><i class="fa-solid fa-map-location-dot"></i> Mapa</a>` : 
            '<span class="text-muted">--</span>';

        const statusBadge = prop.status === 'inactive' ? 
            `<span class="badge badge-status-inactive" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" title="Dado de baja en el portal"><i class="fa-solid fa-circle-xmark"></i> Inactivo</span>` : 
            (prop.status === 'active' ? 
                `<span class="badge badge-status-active" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" title="Anuncio comprobado y activo"><i class="fa-solid fa-circle-check"></i> Activo</span>` : 
                `<span class="badge badge-status-unknown" style="font-size: 0.7rem; padding: 0.2rem 0.5rem;" title="Pendiente de verificación">--</span>`);

        tr.innerHTML = `
            <td>
                <div class="table-prop-cell">
                    ${photoHTML}
                    <div class="table-prop-info">
                        <span class="table-prop-name" style="cursor: pointer;" onclick="openPropertyDetailSheet(${prop.id})">${prop.title}</span>
                        ${prop.url ? `<a href="${prop.url}" target="_blank" class="table-prop-url">Ver anuncio <i class="fa-solid fa-external-link"></i></a>` : '<span class="table-prop-url">Sin enlace</span>'}
                    </div>
                </div>
            </td>
            <td class="text-center">${statusBadge}</td>
            <td>${prop.zone || 'Desconocida'}</td>
            <td class="text-right font-heading" style="font-weight: 600;">${formatCurrency(prop.price)}</td>
            <td class="text-center">${prop.rooms}</td>
            <td class="text-center">${prop.baths}</td>
            <td class="text-right">${prop.m2 ? prop.m2 + ' m²' : '--'}</td>
            <td class="text-center">${garageIcon}</td>
            <td class="text-center">${elevatorIcon}</td>
            <td class="text-center">${prop.rating ? generateStarsHTML(prop.rating) : '<span class="text-muted">--</span>'}</td>
            <td class="text-center">${mapLink}</td>
            <td class="text-right font-heading" style="color: var(--amber); font-weight: 700;">${formatCurrency(calc.totalRequiredBudget)}</td>
            <td class="text-right font-heading" style="color: var(--primary); font-weight: 700;">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</td>
            <td>
                <div class="flex-center" style="gap: 0.4rem;">
                    <button class="btn btn-secondary btn-xs btn-view-detail" data-id="${prop.id}" title="Ver Ficha"><i class="fa-solid fa-id-card text-indigo"></i></button>
                    <button class="btn btn-secondary btn-xs btn-view-expenses" data-id="${prop.id}" title="Gastos"><i class="fa-solid fa-calculator"></i></button>
                    <button class="btn btn-primary btn-xs btn-edit-prop" data-id="${prop.id}" title="Editar"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-danger btn-xs btn-delete-prop" data-id="${prop.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        `;
        tableBody.appendChild(tr);
    });

    // Añadir manejadores a botones de eventos en cards y tabla dinámicos
    setupDynamicButtons();
}

function applyFilters(propsList) {
    const searchVal = document.getElementById('filter-search')?.value.toLowerCase() || '';
    const priceMaxVal = parseFloat(document.getElementById('filter-price-max')?.value);
    const savingsMaxVal = parseFloat(document.getElementById('filter-savings-max')?.value);
    const roomsVal = document.getElementById('filter-rooms')?.value || '';
    const garageVal = document.getElementById('filter-garage')?.value || '';
    const statusVal = document.getElementById('filter-status')?.value || '';
    const sortBy = document.getElementById('sort-by')?.value || 'date-desc';

    let result = [...propsList];

    // Búsqueda por texto (zona, título, comentarios)
    if (searchVal) {
        result = result.filter(p => 
            p.title.toLowerCase().includes(searchVal) || 
            (p.zone && p.zone.toLowerCase().includes(searchVal)) ||
            (p.comments && p.comments.toLowerCase().includes(searchVal))
        );
    }

    // Estado del enlace
    if (statusVal === 'active') {
        result = result.filter(p => p.status !== 'inactive');
    } else if (statusVal === 'inactive') {
        result = result.filter(p => p.status === 'inactive');
    }

    // Precio máximo
    if (!isNaN(priceMaxVal)) {
        result = result.filter(p => p.price <= priceMaxVal);
    }

    // Habitaciones
    if (roomsVal) {
        const roomsMin = parseInt(roomsVal);
        result = result.filter(p => p.rooms >= roomsMin);
    }

    // Garaje
    if (garageVal === 'si') {
        result = result.filter(p => p.garage === 'si');
    }

    // Ahorro máximo
    if (!isNaN(savingsMaxVal)) {
        result = result.filter(p => {
            const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
            return calc.totalRequiredBudget <= savingsMaxVal;
        });
    }

    // FASE 5: Voto del grupo / colaboración
    const voteVal = document.getElementById('filter-vote')?.value || '';
    if (voteVal === 'voted') {
        result = result.filter(p => p.votes && p.votes.length > 0);
    } else if (voteVal) {
        result = result.filter(p => p.votes && p.votes.some(v => v.vote === voteVal));
    }

    // Ordenaciones
    result.sort((a, b) => {
        if (sortBy === 'date-desc') {
            return new Date(b.created_at || 0) - new Date(a.created_at || 0);
        } else if (sortBy === 'price-asc') {
            return a.price - b.price;
        } else if (sortBy === 'price-desc') {
            return b.price - a.price;
        } else if (sortBy === 'budget-asc') {
            const budgetA = calculateExpenses(a.price, a.ccaa, a.estate_type).totalRequiredBudget;
            const budgetB = calculateExpenses(b.price, b.ccaa, b.estate_type).totalRequiredBudget;
            return budgetA - budgetB;
        } else if (sortBy === 'm2-desc') {
            return (b.m2 || 0) - (a.m2 || 0);
        } else if (sortBy === 'rating-desc') {
            return (b.rating || 0) - (a.rating || 0);
        }
        return 0;
    });

    return result;
}

function updateMobileFilterBadge() {
    const searchVal = document.getElementById('filter-search')?.value.trim() || '';
    const priceMaxVal = document.getElementById('filter-price-max')?.value.trim() || '';
    const savingsMaxVal = document.getElementById('filter-savings-max')?.value.trim() || '';
    const roomsVal = document.getElementById('filter-rooms')?.value || '';
    const garageVal = document.getElementById('filter-garage')?.value || '';
    const statusVal = document.getElementById('filter-status')?.value || '';

    let count = 0;
    if (searchVal) count++;
    if (priceMaxVal) count++;
    if (savingsMaxVal) count++;
    if (roomsVal) count++;
    if (garageVal) count++;
    if (statusVal) count++;

    const badge = document.getElementById('mobile-filter-badge');
    if (badge) {
        if (count > 0) {
            badge.textContent = count;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }
}

function renderSettingsForm() {
    const downpaymentInput = document.getElementById('setting-downpayment');
    const notaryRegInput = document.getElementById('setting-notary-reg-pct');
    const appraisalInput = document.getElementById('setting-appraisal');
    const newBuildAjdInput = document.getElementById('setting-new-build-ajd');
    const mortgageRateInput = document.getElementById('setting-mortgage-rate');
    const mortgageDurationInput = document.getElementById('setting-mortgage-duration');
    const ccaaContainer = document.getElementById('ccaa-rates-container');

    if (!downpaymentInput || !ccaaContainer) return;

    downpaymentInput.value = appSettings.downpaymentPct;
    notaryRegInput.value = appSettings.notaryRegistryPct;
    appraisalInput.value = appSettings.appraisalCost;
    newBuildAjdInput.value = appSettings.newBuildAjd;
    if (mortgageRateInput) mortgageRateInput.value = appSettings.mortgageInterestRate || 3.0;
    if (mortgageDurationInput) mortgageDurationInput.value = appSettings.mortgageDurationYears || 30;

    // Crear entradas para ITP de cada CCAA
    ccaaContainer.innerHTML = '';
    CCAA_LIST.forEach(ccaa => {
        const rate = appSettings.ccaaRates[ccaa] || 8.0;
        
        const rateItem = document.createElement('div');
        rateItem.className = 'ccaa-rate-item';
        rateItem.innerHTML = `
            <label>${ccaa}</label>
            <div class="input-with-suffix" style="display:inline-flex; width: 85px;">
                <input type="number" step="0.1" min="0" max="20" class="ccaa-tax-rate" data-ccaa="${ccaa}" value="${rate}">
                <span style="right: 0.5rem; font-size: 0.75rem;">%</span>
            </div>
        `;
        ccaaContainer.appendChild(rateItem);
    });
}

// Mostrar desglose detallado de gastos en el modal
function showExpensesBreakdownModal(property) {
    const modal = document.getElementById('expenses-modal');
    const content = document.getElementById('expenses-modal-content');

    if (!modal || !content) return;

    const calc = calculateExpenses(property.price, property.ccaa, property.estate_type);
    
    // Porcentajes relativos para la barra apilada
    const downPct = (calc.downpayment / calc.totalRequiredBudget * 100).toFixed(1);
    const taxPct = (calc.taxes / calc.totalRequiredBudget * 100).toFixed(1);
    const otherPct = (100 - parseFloat(downPct) - parseFloat(taxPct)).toFixed(1);

    const isSecondHand = property.estate_type === 'secondhand';

    content.innerHTML = `
        <div class="expenses-summary">
            <h4>Total Ahorro Requerido (Firma)</h4>
            <div class="expenses-summary-value">${formatCurrency(calc.totalRequiredBudget)}</div>
            <p class="subtitle" style="margin-top: 0.25rem;">Para adquirir un inmueble de <strong>${formatCurrency(property.price)}</strong></p>
        </div>

        <div class="progress-stacked" title="Entrada: ${downPct}%, Impuestos: ${taxPct}%, Gastos: ${otherPct}%">
            <div class="progress-segment" style="width: ${downPct}%; background-color: var(--primary);" title="Entrada"></div>
            <div class="progress-segment" style="width: ${taxPct}%; background-color: var(--emerald);" title="Impuestos"></div>
            <div class="progress-segment" style="width: ${otherPct}%; background-color: var(--amber);" title="Otros gastos"></div>
        </div>

        <table class="expenses-details-table">
            <tbody>
                <tr>
                    <td><strong>Entrada (${calc.downpaymentPct}%)</strong><br><small>Aportación fondos propios</small></td>
                    <td class="val text-right" style="color: var(--text-main);">${formatCurrency(calc.downpayment)}</td>
                </tr>
                <tr>
                    <td><strong>Impuestos (${isSecondHand ? 'ITP' : 'IVA + AJD'})</strong><br><small>${calc.taxDetail}</small></td>
                    <td class="val text-right" style="color: var(--emerald);">${formatCurrency(calc.taxes)}</td>
                </tr>
                <tr>
                    <td><strong>Notaría, Registro y Gestoría</strong><br><small>Estimación global (${calc.notaryRegistryPct}%)</small></td>
                    <td class="val text-right" style="color: var(--amber);">${formatCurrency(calc.notaryRegistry)}</td>
                </tr>
                <tr>
                    <td><strong>Tasación de la Vivienda</strong><br><small>Gastos de valoración requerida</small></td>
                    <td class="val text-right" style="color: var(--amber);">${formatCurrency(calc.appraisal)}</td>
                </tr>
                <tr style="border-top: 2px solid var(--border-color); font-weight: 800;">
                    <td>PRESUPUESTO PARA FIRMA</td>
                    <td class="val text-right" style="font-size: 1.1rem; color: var(--primary);">${formatCurrency(calc.totalRequiredBudget)}</td>
                </tr>
                <tr style="border-top: 1px dashed var(--border-color); color: var(--text-muted); font-size: 0.8rem;">
                    <td>Financiación Bancaria Proyectada (${100 - calc.downpaymentPct}%)</td>
                    <td class="val text-right">${formatCurrency(calc.mortgageAmount)}</td>
                </tr>
                <tr style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 600;">
                    <td>Cuota Hipoteca Mensual Est.<br><small>Al ${calc.mortgageInterestRate}% a ${calc.mortgageDurationYears} años</small></td>
                    <td class="val text-right" style="color: var(--primary);">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</td>
                </tr>
            </tbody>
        </table>

        <div class="advice-card">
            <i class="fa-solid fa-circle-info"></i>
            <div>
                <strong>Consejo Habitacional:</strong> Para este piso de ${formatCurrency(property.price)} en la comunidad de ${property.ccaa}, debes tener disponibles unos <strong>${formatCurrency(calc.totalRequiredBudget)}</strong> líquidos en cuenta bancaria. Los impuestos y gastos administrativos son aproximadamente el <strong>${(calc.totalExpenses / calc.price * 100).toFixed(1)}%</strong> sobre el precio de compra.
            </div>
        </div>
    `;

    modal.classList.add('active');
}
