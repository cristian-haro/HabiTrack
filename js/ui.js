import { state, CCAA_LIST } from './state.js';
import { calculateExpenses, formatCurrency, formatNumber } from './calculator.js';

/**
 * Toast Notification System
 */
export function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.className = `toast toast-${type} show`;
    
    let icon = 'fa-info-circle';
    if (type === 'success') icon = 'fa-circle-check';
    if (type === 'error') icon = 'fa-triangle-exclamation';
    if (type === 'warning') icon = 'fa-circle-exclamation';

    toast.innerHTML = `<i class="fa-solid ${icon}"></i> <span>${escapeHtml(message)}</span>`;

    clearTimeout(toast.timeoutId);
    toast.timeoutId = setTimeout(() => {
        toast.className = 'toast hidden';
    }, 4000);
}

/**
 * Populates all CCAA <select> dropdowns dynamically
 */
export function populateCcaaDropdowns() {
    const selects = document.querySelectorAll('.ccaa-select');
    selects.forEach(sel => {
        const currentVal = sel.value;
        const hasAll = sel.querySelector('option[value="all"]');
        
        sel.innerHTML = hasAll ? '<option value="all">Todas las Comunidades</option>' : '<option value="">Selecciona Comunidad...</option>';
        
        CCAA_LIST.forEach(ccaa => {
            const opt = document.createElement('option');
            opt.value = ccaa;
            opt.textContent = ccaa;
            sel.appendChild(opt);
        });

        if (currentVal) sel.value = currentVal;
    });
}

/**
 * Renders the Main Dashboard Summary Statistics
 */
export function renderDashboard() {
    const countEl = document.getElementById('stat-total-properties');
    const avgPriceEl = document.getElementById('stat-avg-price');
    const avgM2El = document.getElementById('stat-avg-m2');
    const totalUpfrontEl = document.getElementById('stat-total-upfront');

    const props = state.properties || [];
    const count = props.length;

    if (countEl) countEl.textContent = count;

    if (count === 0) {
        if (avgPriceEl) avgPriceEl.textContent = '0 €';
        if (avgM2El) avgM2El.textContent = '0 €/m²';
        if (totalUpfrontEl) totalUpfrontEl.textContent = '0 €';
        return;
    }

    let totalPrice = 0;
    let totalM2Price = 0;
    let validM2Count = 0;
    let totalUpfront = 0;

    props.forEach(p => {
        const price = Number(p.price) || 0;
        totalPrice += price;

        if (p.m2 && Number(p.m2) > 0) {
            totalM2Price += price / Number(p.m2);
            validM2Count++;
        }

        const exp = calculateExpenses(p);
        totalUpfront += exp.totalUpfront;
    });

    if (avgPriceEl) avgPriceEl.textContent = formatCurrency(totalPrice / count);
    if (avgM2El) avgM2El.textContent = validM2Count > 0 ? `${formatNumber(Math.round(totalM2Price / validM2Count))} €/m²` : '--';
    if (totalUpfrontEl) totalUpfrontEl.textContent = formatCurrency(totalUpfront / count);
}

/**
 * Renders filtered and sorted property listings
 */
export function renderListings() {
    const gridEl = document.getElementById('properties-grid');
    const tableEl = document.getElementById('properties-table-body');
    const emptyStateEl = document.getElementById('empty-state');
    const countLabelEl = document.getElementById('results-count-label');

    if (!gridEl) return;

    let filtered = [...state.properties];

    // Filter by search query
    if (state.filters.search) {
        const q = state.filters.search.toLowerCase();
        filtered = filtered.filter(p =>
            (p.title && p.title.toLowerCase().includes(q)) ||
            (p.zone && p.zone.toLowerCase().includes(q)) ||
            (p.ccaa && p.ccaa.toLowerCase().includes(q)) ||
            (p.comments && p.comments.toLowerCase().includes(q))
        );
    }

    // Filter by CCAA
    if (state.filters.ccaa && state.filters.ccaa !== 'all') {
        filtered = filtered.filter(p => p.ccaa === state.filters.ccaa);
    }

    // Filter by Estate Type
    if (state.filters.estateType && state.filters.estateType !== 'all') {
        filtered = filtered.filter(p => p.estate_type === state.filters.estateType);
    }

    // Filter by Min/Max Price
    if (state.filters.minPrice) {
        filtered = filtered.filter(p => Number(p.price) >= Number(state.filters.minPrice));
    }
    if (state.filters.maxPrice) {
        filtered = filtered.filter(p => Number(p.price) <= Number(state.filters.maxPrice));
    }

    // Sort
    filtered.sort((a, b) => {
        if (state.filters.sortBy === 'price_asc') return (Number(a.price) || 0) - (Number(b.price) || 0);
        if (state.filters.sortBy === 'price_desc') return (Number(b.price) || 0) - (Number(a.price) || 0);
        if (state.filters.sortBy === 'm2_desc') return (Number(b.m2) || 0) - (Number(a.m2) || 0);
        if (state.filters.sortBy === 'rating_desc') return (Number(b.rating) || 0) - (Number(a.rating) || 0);
        return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    });

    if (countLabelEl) {
        countLabelEl.textContent = `${filtered.length} inmuebles encontrados`;
    }

    if (filtered.length === 0) {
        gridEl.innerHTML = '';
        if (tableEl) tableEl.innerHTML = '';
        if (emptyStateEl) emptyStateEl.classList.remove('hidden');
        return;
    }

    if (emptyStateEl) emptyStateEl.classList.add('hidden');

    // Render Grid View
    gridEl.innerHTML = filtered.map(prop => renderPropertyCardHtml(prop)).join('');

    // Render Table View
    if (tableEl) {
        tableEl.innerHTML = filtered.map(prop => renderPropertyRowHtml(prop)).join('');
    }
}

/**
 * HTML Card Component for a property
 */
function renderPropertyCardHtml(prop) {
    const exp = calculateExpenses(prop);
    const photos = prop.photos ? prop.photos.split(',').map(s => s.trim()).filter(Boolean) : [];
    const mainPhoto = photos[0] || 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80';
    const pricePerM2 = prop.m2 && prop.m2 > 0 ? Math.round(prop.price / prop.m2) : null;

    return `
        <div class="property-card glass" data-id="${prop.id}">
            <div class="card-media">
                <img src="${escapeHtml(mainPhoto)}" alt="${escapeHtml(prop.title)}" referrerpolicy="no-referrer" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=600&q=80'">
                <div class="media-badges">
                    <span class="badge ${prop.estate_type === 'new' ? 'badge-amber' : 'badge-indigo'}">
                        ${prop.estate_type === 'new' ? '<i class=\"fa-solid fa-sparkles\"></i> Obra Nueva' : 'Segunda Mano'}
                    </span>
                    <span class="badge badge-dark"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(prop.ccaa)}</span>
                </div>
                ${photos.length > 1 ? `<span class="photo-count-badge"><i class="fa-solid fa-camera"></i> ${photos.length}</span>` : ''}
            </div>

            <div class="card-body">
                <div class="card-title-row">
                    <h3 class="property-title" title="${escapeHtml(prop.title)}">${escapeHtml(prop.title)}</h3>
                    <div class="property-rating">${renderStars(prop.rating || 0)}</div>
                </div>

                <div class="property-location">
                    <i class="fa-solid fa-map-pin"></i> ${escapeHtml(prop.zone || prop.ccaa)}
                </div>

                <div class="card-price-row">
                    <div class="main-price">${formatCurrency(prop.price)}</div>
                    ${pricePerM2 ? `<div class="m2-price">${formatNumber(pricePerM2)} €/m²</div>` : ''}
                </div>

                <div class="property-features-chips">
                    ${prop.rooms ? `<span><i class="fa-solid fa-bed"></i> ${prop.rooms} hab.</span>` : ''}
                    ${prop.baths ? `<span><i class="fa-solid fa-bath"></i> ${prop.baths} baños</span>` : ''}
                    ${prop.m2 ? `<span><i class="fa-solid fa-ruler-combined"></i> ${prop.m2} m²</span>` : ''}
                    ${prop.garage === 'si' ? `<span><i class="fa-solid fa-square-parking"></i> Garaje</span>` : ''}
                    ${prop.elevator === 'si' ? `<span><i class="fa-solid fa-elevator"></i> Ascensor</span>` : ''}
                </div>

                <!-- Financial Mini Breakdown Widget -->
                <div class="card-financial-box">
                    <div class="fin-item">
                        <span class="fin-label">Aportación Inicial (Entrada + Gastos):</span>
                        <span class="fin-value highlight-emerald">${formatCurrency(exp.totalUpfront)}</span>
                    </div>
                    <div class="fin-item">
                        <span class="fin-label">Cuota Hipoteca estimada (${exp.durationYears}a al ${exp.interestRate}%):</span>
                        <span class="fin-value">${formatCurrency(exp.monthlyQuota)}/mes</span>
                    </div>
                </div>

                <div class="card-actions">
                    <button class="btn btn-secondary btn-sm btn-view-expenses" data-id="${prop.id}">
                        <i class="fa-solid fa-calculator"></i> Ver Gastos
                    </button>
                    ${prop.url ? `
                        <a href="${escapeHtml(prop.url)}" target="_blank" rel="noopener noreferrer" class="btn btn-secondary btn-sm">
                            <i class="fa-solid fa-arrow-up-right-from-square"></i> Portal
                        </a>
                    ` : ''}
                    <div class="card-menu-btns">
                        <button class="btn-icon btn-edit-prop" data-id="${prop.id}" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                        <button class="btn-icon text-rose btn-delete-prop" data-id="${prop.id}" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * HTML Table Row Component
 */
function renderPropertyRowHtml(prop) {
    const exp = calculateExpenses(prop);
    return `
        <tr data-id="${prop.id}">
            <td><strong>${escapeHtml(prop.title)}</strong></td>
            <td>${escapeHtml(prop.zone || prop.ccaa)}</td>
            <td><span class="badge ${prop.estate_type === 'new' ? 'badge-amber' : 'badge-indigo'}">${prop.estate_type === 'new' ? 'Obra Nueva' : 'Segunda Mano'}</span></td>
            <td><strong class="text-indigo">${formatCurrency(prop.price)}</strong></td>
            <td>${prop.m2 ? `${prop.m2} m²` : '--'}</td>
            <td><span class="text-emerald font-bold">${formatCurrency(exp.totalUpfront)}</span></td>
            <td><strong>${formatCurrency(exp.monthlyQuota)}/mes</strong></td>
            <td>
                <div class="table-actions">
                    <button class="btn btn-secondary btn-xs btn-view-expenses" data-id="${prop.id}"><i class="fa-solid fa-calculator"></i></button>
                    <button class="btn btn-secondary btn-xs btn-edit-prop" data-id="${prop.id}"><i class="fa-solid fa-pen"></i></button>
                    <button class="btn btn-secondary btn-xs text-rose btn-delete-prop" data-id="${prop.id}"><i class="fa-solid fa-trash"></i></button>
                </div>
            </td>
        </tr>
    `;
}

/**
 * Render detailed expenses modal
 */
export function renderExpensesModal(prop) {
    const exp = calculateExpenses(prop);
    const contentEl = document.getElementById('expenses-modal-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
        <div class="expenses-detail-header mb-4">
            <h3 style="color: #4f46e5; margin-bottom: 4px;">${escapeHtml(prop.title)}</h3>
            <p style="color: #64748b; font-size: 14px;"><i class="fa-solid fa-location-dot"></i> ${escapeHtml(prop.ccaa)} · Precio Compra: <strong>${formatCurrency(exp.price)}</strong></p>
        </div>

        <div class="breakdown-grid">
            <div class="breakdown-section glass p-3 mb-3" style="border-radius: 10px;">
                <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #1e293b;">
                    <i class="fa-solid fa-receipt text-indigo"></i> 1. Impuestos y Gastos Obligatorios
                </h4>
                <div class="fin-row"><span>${exp.taxName}:</span><strong>${formatCurrency(exp.taxAmount)}</strong></div>
                <div class="fin-row"><span>Notaría y Registro (~${exp.notaryRegistryPct}%):</span><strong>${formatCurrency(exp.notaryRegistryAmount)}</strong></div>
                <div class="fin-row"><span>Tasación Bancaria:</span><strong>${formatCurrency(exp.appraisalCost)}</strong></div>
                <div class="fin-row total-row" style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px;">
                    <span>Total Gastos de Compra:</span><strong class="text-rose font-bold">${formatCurrency(exp.totalExpenses)}</strong>
                </div>
            </div>

            <div class="breakdown-section glass p-3 mb-3" style="border-radius: 10px;">
                <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #1e293b;">
                    <i class="fa-solid fa-wallet text-emerald"></i> 2. Capital y Aportación Inicial Requerida
                </h4>
                <div class="fin-row"><span>Entrada Inicial (${exp.downpaymentPct}%):</span><strong>${formatCurrency(exp.downpaymentAmount)}</strong></div>
                <div class="fin-row"><span>Total Gastos e Impuestos:</span><strong>${formatCurrency(exp.totalExpenses)}</strong></div>
                <div class="fin-row total-row" style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px; background: rgba(16, 185, 129, 0.08); padding: 8px; border-radius: 6px;">
                    <span><i class="fa-solid fa-money-bill-wave"></i> Total Ahorro Necesario al Contado:</span>
                    <strong class="text-emerald" style="font-size: 17px;">${formatCurrency(exp.totalUpfront)}</strong>
                </div>
            </div>

            <div class="breakdown-section glass p-3" style="border-radius: 10px;">
                <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 10px; color: #1e293b;">
                    <i class="fa-solid fa-building-columns text-indigo"></i> 3. Hipoteca Estimada
                </h4>
                <div class="fin-row"><span>Capital Financiado (80%):</span><strong>${formatCurrency(exp.mortgagePrincipal)}</strong></div>
                <div class="fin-row"><span>Interés Anual (TIN):</span><strong>${exp.interestRate}%</strong></div>
                <div class="fin-row"><span>Plazo de Amortización:</span><strong>${exp.durationYears} años</strong></div>
                <div class="fin-row total-row" style="border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 8px;">
                    <span>Cuota Mensual Estimada:</span><strong class="text-indigo" style="font-size: 17px;">${formatCurrency(exp.monthlyQuota)}/mes</strong>
                </div>
            </div>
        </div>
    `;

    const modal = document.getElementById('expenses-modal');
    if (modal) modal.classList.add('active');
}

function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
        html += `<i class="${i <= rating ? 'fa-solid' : 'fa-regular'} fa-star text-amber"></i>`;
    }
    return html;
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
