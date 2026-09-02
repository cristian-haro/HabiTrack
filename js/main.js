import { state } from './state.js';
import { apiRequest } from './api.js';
import { checkSession, setupAuthHandlers, logout } from './auth.js';
import {
    showToast,
    populateCcaaDropdowns,
    renderDashboard,
    renderListings,
    renderExpensesModal
} from './ui.js';
import { initLeafletMap, updateMapMarkers } from './map.js';
import { calculateExpenses, formatCurrency } from './calculator.js';

/**
 * Application Bootstrap
 */
document.addEventListener('DOMContentLoaded', async () => {
    // Register PWA Service Worker
    if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
        navigator.serviceWorker.register('/sw.js').catch(err => {
            console.debug('Service Worker no registrado:', err);
        });
    }

    // Setup Auth and verify active session
    setupAuthHandlers(loadAppData);
    await checkSession(loadAppData);
});

/**
 * Loads all initial user data upon successful login
 */
async function loadAppData() {
    await fetchSettings();
    await fetchProperties();
    populateCcaaDropdowns();
    setupNavigation();
    setupPropertyModal();
    setupUrlAnalyzer();
    setupCalculatorSimulator();
    setupFiltersAndViews();

    renderDashboard();
    renderListings();
    renderSettingsForm();
}

/**
 * Fetch calculator settings
 */
async function fetchSettings() {
    const { ok, data } = await apiRequest('/api/ajustes');
    if (ok && data) {
        state.settings = { ...state.settings, ...data };
    }
}

/**
 * Fetch saved properties
 */
async function fetchProperties() {
    const { ok, data } = await apiRequest('/api/propiedades');
    if (ok && Array.isArray(data)) {
        state.properties = data;
        updateMapMarkers();
    }
}

/**
 * Navigation and Section Tab Switching
 */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.app-section');

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.dataset.target;
            if (!target) return;

            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');

            sections.forEach(s => {
                s.classList.toggle('hidden', s.id !== target);
            });

            state.activeSection = target;

            if (target === 'map-section') {
                setTimeout(() => initLeafletMap('map-view-container'), 100);
            }
        });
    });
}

/**
 * Setup Property Add / Edit Modal
 */
function setupPropertyModal() {
    const modal = document.getElementById('property-modal');
    const btnOpen = document.getElementById('btn-add-property');
    const btnClose = document.getElementById('btn-close-property-modal');
    const btnCancel = document.getElementById('btn-cancel-property');
    const form = document.getElementById('property-form');

    if (btnOpen) {
        btnOpen.addEventListener('click', () => {
            if (form) form.reset();
            const propIdInput = document.getElementById('prop-id');
            if (propIdInput) propIdInput.value = '';
            const modalTitle = document.getElementById('property-modal-title');
            if (modalTitle) modalTitle.textContent = 'Añadir Nueva Propiedad';
            if (modal) modal.classList.add('active');
        });
    }

    const closeModal = () => {
        if (modal) modal.classList.remove('active');
    };

    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const propId = document.getElementById('prop-id')?.value;
            const payload = {
                title: document.getElementById('prop-title')?.value.trim(),
                price: parseFloat(document.getElementById('prop-price')?.value) || 0,
                m2: parseFloat(document.getElementById('prop-m2')?.value) || null,
                ccaa: document.getElementById('prop-ccaa')?.value || 'Andalucía',
                rooms: parseInt(document.getElementById('prop-rooms')?.value, 10) || 0,
                baths: parseInt(document.getElementById('prop-baths')?.value, 10) || 0,
                estate_type: document.getElementById('prop-estate-type')?.value || 'secondhand',
                garage: document.getElementById('prop-garage')?.value || 'no',
                elevator: document.getElementById('prop-elevator')?.value || 'desconocido',
                zone: document.getElementById('prop-zone')?.value.trim() || null,
                url: document.getElementById('prop-url')?.value.trim() || null,
                photos: document.getElementById('prop-photos')?.value.trim() || null,
                comments: document.getElementById('prop-comments')?.value.trim() || null,
                rating: parseInt(document.getElementById('prop-rating')?.value, 10) || 0
            };

            const endpoint = propId ? `/api/propiedades/${propId}` : '/api/propiedades';
            const method = propId ? 'PUT' : 'POST';

            const { ok, data } = await apiRequest(endpoint, {
                method,
                body: JSON.stringify(payload)
            });

            if (ok) {
                showToast(propId ? 'Propiedad actualizada.' : 'Propiedad añadida.', 'success');
                closeModal();
                await fetchProperties();
                renderDashboard();
                renderListings();
            } else {
                showToast(data.error || 'Error al guardar la propiedad.', 'error');
            }
        });
    }

    // Modal Close on Expenses Modal
    const expensesModal = document.getElementById('expenses-modal');
    const btnCloseExpenses = document.getElementById('btn-close-expenses-modal');
    if (btnCloseExpenses && expensesModal) {
        btnCloseExpenses.addEventListener('click', () => {
            expensesModal.classList.remove('active');
        });
    }
}

/**
 * Setup URL Analyzer / Link Scraper
 */
function setupUrlAnalyzer() {
    const analyzeBtn = document.getElementById('btn-analyze-url');
    const urlInput = document.getElementById('input-property-url');

    if (!analyzeBtn || !urlInput) return;

    analyzeBtn.addEventListener('click', async () => {
        const url = urlInput.value.trim();
        if (!url || !url.startsWith('http')) {
            showToast('Introduce una URL inmobiliaria válida.', 'error');
            return;
        }

        analyzeBtn.disabled = true;
        analyzeBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';

        const { ok, data } = await apiRequest(`/api/analizar?url=${encodeURIComponent(url)}`);

        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analizar Enlace';

        if (ok && data) {
            if (data.success && data.data) {
                showToast('¡Datos extraídos con éxito!', 'success');
                populateModalWithScrapedData(data.data);
            } else {
                showToast(data.error || 'No se pudieron extraer los datos automáticamente.', 'warning');
            }
        } else {
            showToast(data.error || 'Error en la petición de análisis.', 'error');
        }
    });
}

function populateModalWithScrapedData(data) {
    const modal = document.getElementById('property-modal');
    if (!modal) return;

    document.getElementById('prop-id').value = '';
    document.getElementById('prop-title').value = data.title || '';
    document.getElementById('prop-price').value = data.price || '';
    if (data.m2) document.getElementById('prop-m2').value = data.m2;
    if (data.rooms) document.getElementById('prop-rooms').value = data.rooms;
    if (data.baths) document.getElementById('prop-baths').value = data.baths;
    if (data.ccaa) document.getElementById('prop-ccaa').value = data.ccaa;
    if (data.zone) document.getElementById('prop-zone').value = data.zone;
    if (data.url) document.getElementById('prop-url').value = data.url;
    if (data.photos) document.getElementById('prop-photos').value = data.photos;
    if (data.comments) document.getElementById('prop-comments').value = data.comments;
    if (data.estate_type) document.getElementById('prop-estate-type').value = data.estate_type;
    if (data.garage) document.getElementById('prop-garage').value = data.garage;
    if (data.elevator) document.getElementById('prop-elevator').value = data.elevator;

    document.getElementById('property-modal-title').textContent = 'Propiedad Extraída de Enlace';
    modal.classList.add('active');
}

/**
 * Setup Event Delegation for dynamic cards (Delete, Edit, View Expenses)
 */
function setupFiltersAndViews() {
    const searchInput = document.getElementById('search-input');
    const filterCcaa = document.getElementById('filter-ccaa');
    const filterType = document.getElementById('filter-type');
    const sortBy = document.getElementById('sort-by');
    const btnGridView = document.getElementById('btn-view-grid');
    const btnTableView = document.getElementById('btn-view-table');

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            state.filters.search = e.target.value;
            renderListings();
        });
    }

    if (filterCcaa) {
        filterCcaa.addEventListener('change', (e) => {
            state.filters.ccaa = e.target.value;
            renderListings();
        });
    }

    if (filterType) {
        filterType.addEventListener('change', (e) => {
            state.filters.estateType = e.target.value;
            renderListings();
        });
    }

    if (sortBy) {
        sortBy.addEventListener('change', (e) => {
            state.filters.sortBy = e.target.value;
            renderListings();
        });
    }

    if (btnGridView && btnTableView) {
        btnGridView.addEventListener('click', () => {
            btnGridView.classList.add('active');
            btnTableView.classList.remove('active');
            document.getElementById('properties-grid')?.classList.remove('hidden');
            document.getElementById('properties-table-container')?.classList.add('hidden');
        });

        btnTableView.addEventListener('click', () => {
            btnTableView.classList.add('active');
            btnGridView.classList.remove('active');
            document.getElementById('properties-grid')?.classList.add('hidden');
            document.getElementById('properties-table-container')?.classList.remove('hidden');
        });
    }

    // Delegation on Grid and Table
    document.addEventListener('click', async (e) => {
        const viewExpensesBtn = e.target.closest('.btn-view-expenses');
        if (viewExpensesBtn) {
            const propId = Number(viewExpensesBtn.dataset.id);
            const prop = state.properties.find(p => Number(p.id) === propId);
            if (prop) renderExpensesModal(prop);
            return;
        }

        const editBtn = e.target.closest('.btn-edit-prop');
        if (editBtn) {
            const propId = Number(editBtn.dataset.id);
            const prop = state.properties.find(p => Number(p.id) === propId);
            if (prop) openEditModal(prop);
            return;
        }

        const deleteBtn = e.target.closest('.btn-delete-prop');
        if (deleteBtn) {
            const propId = Number(deleteBtn.dataset.id);
            if (confirm('¿Estás seguro de que deseas eliminar este inmueble?')) {
                const { ok } = await apiRequest(`/api/propiedades/${propId}`, { method: 'DELETE' });
                if (ok) {
                    showToast('Propiedad eliminada.', 'info');
                    await fetchProperties();
                    renderDashboard();
                    renderListings();
                }
            }
        }
    });
}

function openEditModal(prop) {
    const modal = document.getElementById('property-modal');
    if (!modal) return;

    document.getElementById('prop-id').value = prop.id;
    document.getElementById('prop-title').value = prop.title || '';
    document.getElementById('prop-price').value = prop.price || '';
    document.getElementById('prop-m2').value = prop.m2 || '';
    document.getElementById('prop-rooms').value = prop.rooms || 0;
    document.getElementById('prop-baths').value = prop.baths || 0;
    document.getElementById('prop-ccaa').value = prop.ccaa || 'Andalucía';
    document.getElementById('prop-zone').value = prop.zone || '';
    document.getElementById('prop-url').value = prop.url || '';
    document.getElementById('prop-photos').value = prop.photos || '';
    document.getElementById('prop-comments').value = prop.comments || '';
    document.getElementById('prop-estate-type').value = prop.estate_type || 'secondhand';
    document.getElementById('prop-garage').value = prop.garage || 'no';
    document.getElementById('prop-elevator').value = prop.elevator || 'desconocido';
    document.getElementById('prop-rating').value = prop.rating || 0;

    document.getElementById('property-modal-title').textContent = 'Editar Propiedad';
    modal.classList.add('active');
}

/**
 * Interactive Mortgage Simulator
 */
function setupCalculatorSimulator() {
    const simPrice = document.getElementById('sim-price');
    const simCcaa = document.getElementById('sim-ccaa');
    const simType = document.getElementById('sim-estate-type');
    const simDownpayment = document.getElementById('sim-downpayment');
    const simInterest = document.getElementById('sim-interest');
    const simYears = document.getElementById('sim-years');

    const updateCalc = () => {
        if (!simPrice) return;
        const fakeProp = {
            price: parseFloat(simPrice.value) || 0,
            ccaa: simCcaa ? simCcaa.value : 'Madrid',
            estate_type: simType ? simType.value : 'secondhand'
        };

        const customParams = {
            downpaymentPct: simDownpayment ? parseFloat(simDownpayment.value) : 20,
            mortgageInterestRate: simInterest ? parseFloat(simInterest.value) : 3.0,
            mortgageDurationYears: simYears ? parseInt(simYears.value, 10) : 30
        };

        const exp = calculateExpenses({ ...fakeProp, ...customParams });

        const outQuota = document.getElementById('sim-out-quota');
        const outUpfront = document.getElementById('sim-out-upfront');
        const outTax = document.getElementById('sim-out-tax');
        const outTotal = document.getElementById('sim-out-total');

        if (outQuota) outQuota.textContent = `${formatCurrency(exp.monthlyQuota)}/mes`;
        if (outUpfront) outUpfront.textContent = formatCurrency(exp.totalUpfront);
        if (outTax) outTax.textContent = formatCurrency(exp.taxAmount);
        if (outTotal) outTotal.textContent = formatCurrency(exp.totalCost);
    };

    [simPrice, simCcaa, simType, simDownpayment, simInterest, simYears].forEach(el => {
        if (el) el.addEventListener('input', updateCalc);
    });

    updateCalc();
}

/**
 * Renders calculator settings form
 */
function renderSettingsForm() {
    const s = state.settings || {};
    const setDown = document.getElementById('setting-downpayment');
    const setNotary = document.getElementById('setting-notary');
    const setAppraisal = document.getElementById('setting-appraisal');
    const setAjd = document.getElementById('setting-ajd');
    const setInterest = document.getElementById('setting-interest');
    const setYears = document.getElementById('setting-years');

    if (setDown && s.downpaymentPct !== undefined) setDown.value = s.downpaymentPct;
    if (setNotary && s.notaryRegistryPct !== undefined) setNotary.value = s.notaryRegistryPct;
    if (setAppraisal && s.appraisalCost !== undefined) setAppraisal.value = s.appraisalCost;
    if (setAjd && s.newBuildAjd !== undefined) setAjd.value = s.newBuildAjd;
    if (setInterest && s.mortgageInterestRate !== undefined) setInterest.value = s.mortgageInterestRate;
    if (setYears && s.mortgageDurationYears !== undefined) setYears.value = s.mortgageDurationYears;

    const settingsForm = document.getElementById('settings-form');
    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const newSettings = {
                downpaymentPct: parseFloat(setDown?.value) || 20,
                notaryRegistryPct: parseFloat(setNotary?.value) || 1.5,
                appraisalCost: parseFloat(setAppraisal?.value) || 400,
                newBuildAjd: parseFloat(setAjd?.value) || 1.0,
                mortgageInterestRate: parseFloat(setInterest?.value) || 3.0,
                mortgageDurationYears: parseInt(setYears?.value, 10) || 30,
                ccaaRates: state.settings.ccaaRates
            };

            const { ok } = await apiRequest('/api/ajustes', {
                method: 'POST',
                body: JSON.stringify(newSettings)
            });

            if (ok) {
                state.settings = newSettings;
                showToast('Ajustes guardados correctamente.', 'success');
                renderDashboard();
                renderListings();
            } else {
                showToast('Error al guardar ajustes.', 'error');
            }
        });
    }
}
