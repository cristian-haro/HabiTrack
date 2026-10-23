// ==========================================================================
// FOTOGRAFÍAS, CARRUSEL EN TARJETA Y VISOR LIGHTBOX
// ==========================================================================
let activeGalleryProperty = null;
let activeGalleryIndex = 0;

function createPropertyCardDOM(prop) {
    const card = document.createElement('div');
    card.className = 'property-card';
    card.dataset.id = prop.id;
    card.dataset.currentPhotoIdx = '0';

    const calc = calculateExpenses(prop.price, prop.ccaa, prop.estate_type);
    
    // FASE 5: Votos y comentarios colaborativos
    const votes = prop.votes || [];
    const likeCount = votes.filter(v => v.vote === 'like').length;
    const maybeCount = votes.filter(v => v.vote === 'maybe').length;
    const dislikeCount = votes.filter(v => v.vote === 'dislike').length;
    const myVoteObj = votes.find(v => (currentUserId && v.user_id == currentUserId) || (currentUserEmail && v.email === currentUserEmail));
    const myVote = myVoteObj ? myVoteObj.vote : null;
    const commentsCount = prop.comments_count || 0;

    // Obtener lista completa de fotos
    const photoList = prop.photos ? prop.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    
    let imageHTML = `
        <div class="no-img-placeholder">
            <i class="fa-solid fa-house-chimney"></i>
            <span>Sin fotos</span>
        </div>
    `;
    let carouselControlsHTML = '';
    let dotsHTML = '';

    if (photoList.length > 0) {
        imageHTML = `<img src="${photoList[0]}" class="property-img" alt="${prop.title}" referrerpolicy="no-referrer" loading="lazy" onerror="this.onerror=null;this.parentElement.innerHTML='<div class=\\'no-img-placeholder\\'><i class=\\'fa-solid fa-house-chimney\\'></i><span>Sin fotos</span></div>';">`;
        
        if (photoList.length > 1) {
            carouselControlsHTML = `
                <button type="button" class="card-carousel-btn card-carousel-prev" title="Foto anterior">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>
                <button type="button" class="card-carousel-btn card-carousel-next" title="Foto siguiente">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
                <span class="photo-count-badge">
                    <i class="fa-solid fa-camera"></i> <span class="photo-current-idx">1</span>/${photoList.length}
                </span>
            `;
            dotsHTML = `<div class="carousel-dots">${photoList.slice(0, 5).map((_, i) => `<span class="carousel-dot ${i === 0 ? 'active' : ''}"></span>`).join('')}</div>`;
        }
    }

    const badgeTypeStr = prop.estate_type === 'new' ? 'Obra Nueva' : 'Segunda Mano';
    
    const garageLabel = prop.garage === 'si' ? 'Garaje' : (prop.garage === 'opcional' ? 'Garaje opc.' : 'Sin garaje');
    const garageIcon = prop.garage === 'si' ? 'fa-car text-indigo' : (prop.garage === 'opcional' ? 'fa-car text-amber' : 'fa-car text-muted');

    const elevatorLabel = prop.elevator === 'si' ? 'Ascensor' : (prop.elevator === 'no' ? 'Sin ascensor' : 'Ascensor desc.');
    const elevatorIcon = prop.elevator === 'si' ? 'fa-elevator text-indigo' : (prop.elevator === 'no' ? 'fa-elevator text-rose' : 'fa-elevator text-muted');

    const priceM2Str = (prop.m2 && prop.m2 > 0) ? `${formatCurrency(Math.round(prop.price / prop.m2))}/m²` : '';

    const statusBadge = prop.status === 'inactive' ? 
        '<span class="badge badge-status-inactive" title="Anuncio dado de baja en el portal"><i class="fa-solid fa-circle-xmark"></i> Inactivo</span>' : 
        (prop.status === 'active' ? '<span class="badge badge-status-active" title="Anuncio activo y publicado"><i class="fa-solid fa-circle-check"></i> Activo</span>' : '');

    const mapButton = (prop.latitude && prop.longitude) ? 
        `<a href="https://www.google.com/maps/search/?api=1&query=${prop.latitude},${prop.longitude}" target="_blank" class="card-action-btn-sm" title="Ver en Google Maps"><i class="fa-solid fa-map-location-dot text-indigo"></i> <span>Mapa</span></a>` : '';

    card.innerHTML = `
        <div class="card-img-container" title="${photoList.length > 0 ? 'Ver galería de fotos a pantalla completa' : ''}">
            ${imageHTML}
            ${carouselControlsHTML}
            ${dotsHTML}
            <div class="card-badges">
                <span class="badge badge-price">${formatCurrency(prop.price)}</span>
                ${statusBadge}
                <span class="badge badge-type">${badgeTypeStr}</span>
            </div>
        </div>
        <div class="card-content">
            <div class="card-title-row">
                <div class="card-title-main">
                    <h4 title="${prop.title}" style="cursor: pointer;" onclick="openPropertyDetailSheet(${prop.id})">${prop.title}</h4>
                </div>
                <div class="card-sub-row">
                    <span class="card-zone"><i class="fa-solid fa-location-dot text-indigo"></i> ${prop.zone || 'Zona no especificada'}</span>
                    ${prop.rating ? generateStarsHTML(prop.rating) : ''}
                </div>
            </div>
            
            <div class="card-specs-grid">
                <div class="card-spec-item" title="Habitaciones">
                    <i class="fa-solid fa-bed"></i>
                    <span><strong>${prop.rooms}</strong> habs</span>
                </div>
                <div class="card-spec-item" title="Baños">
                    <i class="fa-solid fa-bath"></i>
                    <span><strong>${prop.baths}</strong> baños</span>
                </div>
                <div class="card-spec-item" title="Superficie construida ${priceM2Str ? '(' + priceM2Str + ')' : ''}">
                    <i class="fa-solid fa-ruler-combined"></i>
                    <span><strong>${prop.m2 ? prop.m2 + ' m²' : '--'}</strong></span>
                </div>
                <div class="card-spec-item" title="Ascensor">
                    <i class="fa-solid ${elevatorIcon}"></i>
                    <span>${elevatorLabel}</span>
                </div>
                <div class="card-spec-item" title="Garaje">
                    <i class="fa-solid ${garageIcon}"></i>
                    <span>${garageLabel}</span>
                </div>
            </div>

            <div class="card-financial-grid">
                <div class="card-kpi-pill kpi-savings">
                    <div class="kpi-pill-header">
                        <i class="fa-solid fa-wallet text-amber"></i>
                        <span>Ahorro Firma</span>
                    </div>
                    <strong>${formatCurrency(calc.totalRequiredBudget)}</strong>
                    <small>Entrada (${calc.downpaymentPct}%) + CCAA</small>
                </div>
                <div class="card-kpi-pill kpi-mortgage">
                    <div class="kpi-pill-header">
                        <i class="fa-solid fa-calculator text-indigo"></i>
                        <span>Hipoteca Est.</span>
                    </div>
                    <strong>${formatCurrency(calc.mortgageMonthlyPayment)}<small>/mes</small></strong>
                    <small>Al ${calc.mortgageInterestRate}% a ${calc.mortgageDurationYears}a</small>
                </div>
            </div>

            <!-- FASE 5: Votación rápida y comentarios colaborativos -->
            <div class="card-collab-row">
                <div class="card-vote-pill-group">
                    <button type="button" class="card-vote-btn ${myVote === 'like' ? 'active' : ''}" data-vote="like" data-id="${prop.id}" title="Votar: Me encanta ❤️">
                        ❤️ ${likeCount > 0 ? `<strong class="card-vote-count">${likeCount}</strong>` : ''}
                    </button>
                    <button type="button" class="card-vote-btn ${myVote === 'maybe' ? 'active' : ''}" data-vote="maybe" data-id="${prop.id}" title="Votar: Con dudas 🤔">
                        🤔 ${maybeCount > 0 ? `<strong class="card-vote-count">${maybeCount}</strong>` : ''}
                    </button>
                    <button type="button" class="card-vote-btn ${myVote === 'dislike' ? 'active' : ''}" data-vote="dislike" data-id="${prop.id}" title="Votar: Descartar ❌">
                        ❌ ${dislikeCount > 0 ? `<strong class="card-vote-count">${dislikeCount}</strong>` : ''}
                    </button>
                </div>
                <div class="card-comments-counter" onclick="openPropertyDetailSheet(${prop.id})" title="Ver ${commentsCount} notas y comentarios">
                    <i class="fa-regular fa-comment-dots text-indigo"></i>
                    <span>${commentsCount}</span>
                </div>
            </div>

            <div class="card-actions-container">
                <div class="card-actions-primary">
                    <button type="button" class="btn btn-indigo btn-sm btn-view-detail" data-id="${prop.id}" title="Ver Ficha Completa">
                        <i class="fa-solid fa-id-card"></i> Ver Ficha
                    </button>
                    <button type="button" class="btn btn-secondary btn-sm btn-view-expenses" data-id="${prop.id}" title="Desglose Detallado de Gastos">
                        <i class="fa-solid fa-calculator text-emerald"></i> Ver Gastos
                    </button>
                </div>
                <div class="card-actions-secondary">
                    ${prop.url ? `<a href="${prop.url}" target="_blank" class="card-action-btn-sm" title="Abrir Anuncio Original"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>Anuncio</span></a>` : ''}
                    ${mapButton}
                    <button type="button" class="card-action-btn-sm btn-edit-prop" data-id="${prop.id}" title="Editar Propiedad"><i class="fa-solid fa-pen text-indigo"></i> <span>Editar</span></button>
                    <button type="button" class="card-action-btn-sm card-btn-delete btn-delete-prop" data-id="${prop.id}" title="Eliminar Propiedad"><i class="fa-solid fa-trash text-rose"></i> <span>Eliminar</span></button>
                </div>
            </div>
        </div>
    `;

    // Eventos del carrusel en tarjeta y apertura de galería
    const imgContainer = card.querySelector('.card-img-container');
    if (imgContainer && photoList.length > 0) {
        imgContainer.addEventListener('click', (e) => {
            if (e.target.closest('.card-carousel-btn') || e.target.closest('.card-badges')) return;
            const currentIdx = parseInt(card.dataset.currentPhotoIdx || '0', 10);
            openGalleryModal(prop.id, currentIdx);
        });

        const prevBtn = card.querySelector('.card-carousel-prev');
        const nextBtn = card.querySelector('.card-carousel-next');

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateCardPhoto(card, prop, false);
            });
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                navigateCardPhoto(card, prop, true);
            });
        }
    }

    return card;
}

function navigateCardPhoto(cardEl, prop, isNext) {
    const photoList = prop.photos ? prop.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    if (photoList.length <= 1) return;

    let currentIdx = parseInt(cardEl.dataset.currentPhotoIdx || '0', 10);
    if (isNext) {
        currentIdx = (currentIdx + 1) % photoList.length;
    } else {
        currentIdx = (currentIdx - 1 + photoList.length) % photoList.length;
    }
    cardEl.dataset.currentPhotoIdx = currentIdx;

    const imgEl = cardEl.querySelector('.property-img');
    if (imgEl) {
        imgEl.style.opacity = '0.6';
        imgEl.src = photoList[currentIdx];
        imgEl.onload = () => { imgEl.style.opacity = '1'; };
    }

    const badgeIdx = cardEl.querySelector('.photo-current-idx');
    if (badgeIdx) badgeIdx.textContent = currentIdx + 1;

    const dots = cardEl.querySelectorAll('.carousel-dot');
    dots.forEach((dot, i) => {
        dot.classList.toggle('active', i === (currentIdx % Math.min(dots.length, 5)));
    });
}

function openGalleryModal(propertyId, initialIndex = 0) {
    const prop = properties.find(p => p.id === propertyId);
    if (!prop) return;

    const photoList = prop.photos ? prop.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    if (photoList.length === 0) return;

    activeGalleryProperty = prop;
    activeGalleryIndex = Math.max(0, Math.min(initialIndex, photoList.length - 1));

    const modal = document.getElementById('gallery-modal');
    const titleEl = document.getElementById('gallery-modal-title');
    if (titleEl) titleEl.textContent = prop.title;

    renderGalleryCurrentView();

    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function closeGalleryModal() {
    const modal = document.getElementById('gallery-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    activeGalleryProperty = null;
}

function renderGalleryCurrentView() {
    if (!activeGalleryProperty) return;
    const photoList = activeGalleryProperty.photos ? activeGalleryProperty.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    if (photoList.length === 0) return;

    const mainImg = document.getElementById('gallery-main-img');
    const counterEl = document.getElementById('gallery-counter');
    const thumbsContainer = document.getElementById('gallery-thumbnails-container');

    if (mainImg) {
        mainImg.style.opacity = '0.4';
        mainImg.src = photoList[activeGalleryIndex];
        mainImg.onload = () => { mainImg.style.opacity = '1'; };
    }

    if (counterEl) {
        counterEl.textContent = `Foto ${activeGalleryIndex + 1} de ${photoList.length}`;
    }

    if (thumbsContainer) {
        thumbsContainer.innerHTML = photoList.map((photo, i) => `
            <img src="${photo}" 
                 class="gallery-thumb-item ${i === activeGalleryIndex ? 'active' : ''}" 
                 data-idx="${i}" 
                 referrerpolicy="no-referrer"
                 alt="Miniatura ${i + 1}"
                 onclick="window.setGalleryPhotoIndex(${i})">
        `).join('');

        const activeThumb = thumbsContainer.querySelector('.gallery-thumb-item.active');
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
}

window.setGalleryPhotoIndex = function(idx) {
    if (!activeGalleryProperty) return;
    const photoList = activeGalleryProperty.photos ? activeGalleryProperty.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    if (idx >= 0 && idx < photoList.length) {
        activeGalleryIndex = idx;
        renderGalleryCurrentView();
    }
};

function navigateGallery(delta) {
    if (!activeGalleryProperty) return;
    const photoList = activeGalleryProperty.photos ? activeGalleryProperty.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    if (photoList.length <= 1) return;

    activeGalleryIndex = (activeGalleryIndex + delta + photoList.length) % photoList.length;
    renderGalleryCurrentView();
}

function updateFormPhotosPreview() {
    const input = document.getElementById('prop-photos');
    const container = document.getElementById('prop-photos-preview');
    if (!input || !container) return;

    const val = input.value.trim();
    if (!val) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    const photoList = val.split(',').map(u => u.trim()).filter(Boolean);
    if (photoList.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.style.display = 'flex';
    container.innerHTML = photoList.map((photo, i) => `
        <div class="form-photo-preview-item" title="Foto ${i + 1}">
            <img src="${photo}" alt="Foto ${i + 1}" referrerpolicy="no-referrer" onerror="this.parentElement.style.display='none'">
        </div>
    `).join('');
}
