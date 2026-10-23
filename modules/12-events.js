// ==========================================================================
// CONTROLADORES DE EVENTOS PRINCIPALES
// ==========================================================================

function setupEventHandlers() {
    // --- 1. NAVEGACIÓN ENTRE SECCIONES ---
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const target = item.getAttribute('data-target');
            if (!target) return;

            // Actualizar clase activa en menú
            navItems.forEach(nav => nav.classList.remove('active'));
            
            // Si el click fue en un enlace "ver todos", activar su equivalente en sidebar
            const sidebarItem = document.querySelector(`.sidebar .nav-item[data-target="${target}"]`);
            if (sidebarItem) {
                sidebarItem.classList.add('active');
            } else {
                item.classList.add('active');
            }

            // Cambiar sección visible
            const sections = document.querySelectorAll('.content-section');
            sections.forEach(sec => sec.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            activeSection = target;

            // Ajustar el tamaño del mapa si volvemos al dashboard
            if (target === 'dashboard-section' && mapInstance) {
                setTimeout(() => {
                    mapInstance.invalidateSize();
                }, 100);
            }
        });
    });

    // --- 2. MODAL AÑADIR PROPIEDAD ---
    const btnAddProp = document.getElementById('btn-add-property');
    const propertyModal = document.getElementById('property-modal');
    const btnClosePropModal = document.getElementById('btn-close-property-modal');
    const btnCancelProp = document.getElementById('btn-cancel-property');
    const propertyForm = document.getElementById('property-form');

    if (btnAddProp) {
        btnAddProp.addEventListener('click', () => {
            // Resetear el formulario
            propertyForm.reset();
            document.getElementById('property-id').value = '';
            document.getElementById('modal-title').textContent = 'Añadir Nueva Propiedad';
            document.getElementById('modal-paste-area').value = '';
            document.getElementById('modal-url-input').value = '';
            
            // Mostrar tabs
            document.getElementById('extraction-tabs').style.display = 'flex';
            switchTab('manual-form-tab');
            updateFormPhotosPreview();

            // Abrir modal
            propertyModal.classList.add('active');
        });
    }

    const closeModal = () => {
        propertyModal.classList.remove('active');
    };

    if (btnClosePropModal) btnClosePropModal.addEventListener('click', closeModal);
    if (btnCancelProp) btnCancelProp.addEventListener('click', closeModal);

    const galleryModal = document.getElementById('gallery-modal');
    const detailModal = document.getElementById('property-detail-modal');
    const workspaceModal = document.getElementById('workspace-modal');
    const btnCloseGallery = document.getElementById('btn-close-gallery-modal');
    const btnCloseDetail = document.getElementById('btn-close-detail-modal');
    const btnCloseWorkspace = document.getElementById('btn-close-workspace-modal');
    const btnPrevGallery = document.getElementById('gallery-btn-prev');
    const btnNextGallery = document.getElementById('gallery-btn-next');
    const propPhotosInput = document.getElementById('prop-photos');

    if (btnCloseGallery) btnCloseGallery.addEventListener('click', closeGalleryModal);
    if (btnCloseDetail) btnCloseDetail.addEventListener('click', closePropertyDetailSheet);
    if (btnCloseWorkspace) btnCloseWorkspace.addEventListener('click', closeWorkspaceModal);
    if (btnPrevGallery) btnPrevGallery.addEventListener('click', () => navigateGallery(-1));
    if (btnNextGallery) btnNextGallery.addEventListener('click', () => navigateGallery(1));
    if (propPhotosInput) propPhotosInput.addEventListener('input', updateFormPhotosPreview);

    // --- FASE 5: MANEJADORES DE WORKSPACE (ESPACIOS COMPARTIDOS) ---
    const wsSelectorBtn = document.getElementById('workspace-selector-btn');
    const wsDropdownMenu = document.getElementById('workspace-dropdown-menu');
    const btnWsManage = document.getElementById('btn-ws-manage');
    const btnWsCreateOpen = document.getElementById('btn-ws-create-open');
    const btnWsJoinOpen = document.getElementById('btn-ws-join-open');
    const btnCopyInviteCode = document.getElementById('btn-copy-invite-code');
    const btnCopyInviteLink = document.getElementById('btn-copy-invite-link');
    const btnLeaveWorkspace = document.getElementById('btn-leave-workspace');
    const formCreateWorkspace = document.getElementById('form-create-workspace');
    const formJoinWorkspace = document.getElementById('form-join-workspace');

    if (wsSelectorBtn && wsDropdownMenu) {
        wsSelectorBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isShown = wsDropdownMenu.style.display !== 'none';
            wsDropdownMenu.style.display = isShown ? 'none' : 'block';
        });
    }

    if (btnWsManage) {
        btnWsManage.addEventListener('click', () => {
            if (wsDropdownMenu) wsDropdownMenu.style.display = 'none';
            openWorkspaceModal('ws-tab-active');
        });
    }

    if (btnWsCreateOpen) {
        btnWsCreateOpen.addEventListener('click', () => {
            if (wsDropdownMenu) wsDropdownMenu.style.display = 'none';
            openWorkspaceModal('ws-tab-create');
        });
    }

    if (btnWsJoinOpen) {
        btnWsJoinOpen.addEventListener('click', () => {
            if (wsDropdownMenu) wsDropdownMenu.style.display = 'none';
            openWorkspaceModal('ws-tab-join');
        });
    }

    const wsModalTabs = document.querySelectorAll('.ws-tab-btn');
    wsModalTabs.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchWorkspaceModalTab(targetTab);
        });
    });

    if (btnCopyInviteCode) {
        btnCopyInviteCode.addEventListener('click', () => {
            const currentWs = workspaces.find(w => w.id == activeWorkspaceId);
            if (currentWs && currentWs.invite_code) {
                navigator.clipboard.writeText(currentWs.invite_code).then(() => {
                    showToast(`Código ${currentWs.invite_code} copiado al portapapeles.`, 'success');
                }).catch(() => {
                    prompt('Copia este código de invitación:', currentWs.invite_code);
                });
            }
        });
    }

    if (btnCopyInviteLink) {
        btnCopyInviteLink.addEventListener('click', () => {
            const currentWs = workspaces.find(w => w.id == activeWorkspaceId);
            if (currentWs && currentWs.invite_code) {
                const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${currentWs.invite_code}`;
                navigator.clipboard.writeText(inviteUrl).then(() => {
                    showToast('Enlace de invitación copiado al portapapeles.', 'success');
                }).catch(() => {
                    prompt('Copia este enlace de invitación:', inviteUrl);
                });
            }
        });
    }

    if (btnLeaveWorkspace) {
        btnLeaveWorkspace.addEventListener('click', handleLeaveWorkspace);
    }

    if (formCreateWorkspace) {
        formCreateWorkspace.addEventListener('submit', handleCreateWorkspace);
    }

    if (formJoinWorkspace) {
        formJoinWorkspace.addEventListener('submit', handleJoinWorkspace);
    }

    // Cerrar modal al hacer click fuera del contenido
    window.addEventListener('click', (e) => {
        if (wsDropdownMenu && !e.target.closest('#workspace-selector-container')) {
            wsDropdownMenu.style.display = 'none';
        }
        if (e.target === propertyModal) {
            closeModal();
        }
        const expModal = document.getElementById('expenses-modal');
        if (e.target === expModal) {
            expModal.classList.remove('active');
        }
        if (e.target === galleryModal) {
            closeGalleryModal();
        }
        if (e.target === detailModal) {
            closePropertyDetailSheet();
        }
        if (e.target === workspaceModal) {
            closeWorkspaceModal();
        }
    });

    // Navegación con teclado para la galería y ficha detallada
    window.addEventListener('keydown', (e) => {
        if (galleryModal && galleryModal.classList.contains('active')) {
            if (e.key === 'Escape') {
                closeGalleryModal();
            } else if (e.key === 'ArrowLeft') {
                navigateGallery(-1);
            } else if (e.key === 'ArrowRight') {
                navigateGallery(1);
            }
        } else if (detailModal && detailModal.classList.contains('active')) {
            if (e.key === 'Escape') {
                closePropertyDetailSheet();
            }
        }
    });

    if (propertyForm) {
        propertyForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const id = document.getElementById('property-id').value;
            const propertyData = {
                title: document.getElementById('prop-title').value,
                price: parseFloat(document.getElementById('prop-price').value),
                m2: document.getElementById('prop-m2').value ? parseFloat(document.getElementById('prop-m2').value) : null,
                ccaa: document.getElementById('prop-ccaa').value,
                rooms: parseInt(document.getElementById('prop-rooms').value) || 0,
                baths: parseInt(document.getElementById('prop-baths').value) || 0,
                estate_type: document.getElementById('prop-estate-type').value,
                garage: document.getElementById('prop-garage').value,
                zone: document.getElementById('prop-zone').value,
                url: document.getElementById('prop-url').value,
                photos: document.getElementById('prop-photos').value,
                elevator: document.getElementById('prop-elevator').value,
                comments: document.getElementById('prop-comments').value,
                rating: parseInt(document.getElementById('prop-rating').value) || 0,
                latitude: document.getElementById('prop-latitude').value ? parseFloat(document.getElementById('prop-latitude').value) : null,
                longitude: document.getElementById('prop-longitude').value ? parseFloat(document.getElementById('prop-longitude').value) : null
            };

            let success = false;
            if (id) {
                // Modo Edición
                success = await updateProperty(id, propertyData);
            } else {
                // Modo Creación
                success = await addProperty(propertyData);
            }

            if (success) {
                closeModal();
                renderDashboard();
                renderListings();
            }
        });
    }

    // --- 3. MODALES DE PESTAÑAS (TABS) ---
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            switchTab(targetTab);
        });
    });

    // --- 4. EXTRACCIÓN/PARSING DENTRO DEL MODAL Y EN EL DASHBOARD ---
    const btnModalParse = document.getElementById('btn-modal-parse');
    const btnModalParseUrl = document.getElementById('btn-modal-parse-url');
    const modalUrlInput = document.getElementById('modal-url-input');
    const modalPasteArea = document.getElementById('modal-paste-area');
    
    if (btnModalParseUrl && modalUrlInput) {
        btnModalParseUrl.addEventListener('click', async () => {
            const urlInputVal = modalUrlInput.value.trim();
            const validUrl = getValidUrl(urlInputVal);
            if (!validUrl) {
                showToast('Por favor, introduce un enlace válido antes de analizar.', 'warning');
                return;
            }
            
            btnModalParseUrl.disabled = true;
            btnModalParseUrl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';
            
            try {
                const res = await fetch(`/api/analizar?url=${encodeURIComponent(validUrl)}`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (res.status === 401 || res.status === 403) {
                    logout();
                    return;
                }
                if (!res.ok) throw new Error(`El servidor respondió con código ${res.status}`);
                const result = await res.json();
                
                if (result.success === false) {
                    showToast(result.error || 'No se pudieron extraer los datos.', 'error');
                    if (result.source === 'idealista' || result.source === 'facebook' || result.source === 'fotocasa') {
                        switchTab('parser-tab');
                    }
                } else if (result.success) {
                    fillPropertyForm(result.data);
                    showToast('Datos y fotos extraídos del enlace correctamente.', 'success');
                    switchTab('manual-form-tab');
                    modalUrlInput.value = '';
                }
            } catch (err) {
                console.error(err);
                showToast('Error al conectar con el analizador de enlaces.', 'error');
            } finally {
                btnModalParseUrl.disabled = false;
                btnModalParseUrl.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Analizar Enlace';
            }
        });
    }

    if (btnModalParse) {
        btnModalParse.addEventListener('click', async () => {
            const text = modalPasteArea.value.trim();
            if (!text) {
                showToast('Por favor, pega algún texto antes de analizar.', 'warning');
                return;
            }

            // Redirect pure URLs to backend scraper
            const validUrl = getValidUrl(text);
            if (validUrl) {
                btnModalParse.disabled = true;
                btnModalParse.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analizando...';
                try {
                    const res = await fetch(`/api/analizar?url=${encodeURIComponent(validUrl)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.status === 401 || res.status === 403) {
                        logout();
                        return;
                    }
                    if (!res.ok) throw new Error(`El servidor respondió con código ${res.status}`);
                    const result = await res.json();
                    if (result.success === false) {
                        showToast(result.error || 'No se pudieron extraer los datos.', 'error');
                        if (result.source === 'idealista' || result.source === 'facebook' || result.source === 'fotocasa') {
                            switchTab('parser-tab');
                        }
                    } else if (result.success) {
                        fillPropertyForm(result.data);
                        showToast('Datos y fotos extraídos del enlace correctamente.', 'success');
                        switchTab('manual-form-tab');
                        modalPasteArea.value = '';
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al conectar con el analizador de enlaces.', 'error');
                } finally {
                    btnModalParse.disabled = false;
                    btnModalParse.innerHTML = '<i class="fa-solid fa-brain"></i> Extraer Datos del Texto';
                }
                return;
            }

            const data = parseListingText(text);
            if (data) {
                fillPropertyForm(data);
                showToast('Datos extraídos del texto pegado.', 'success');
                switchTab('manual-form-tab');
            } else {
                showToast('No se pudieron extraer datos consistentes.', 'warning');
            }
        });
    }

    const btnDashboardParse = document.getElementById('btn-parse-quick');
    const dashboardPasteArea = document.getElementById('quick-input');

    if (btnDashboardParse) {
        btnDashboardParse.addEventListener('click', async () => {
            const text = dashboardPasteArea.value.trim();
            if (!text) {
                showToast('Por favor, pega un enlace o texto antes de analizar.', 'warning');
                return;
            }

            const validUrl = getValidUrl(text);

            if (validUrl) {
                btnDashboardParse.disabled = true;
                btnDashboardParse.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
                
                try {
                    const res = await fetch(`/api/analizar?url=${encodeURIComponent(validUrl)}`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (res.status === 401 || res.status === 403) {
                        logout();
                        return;
                    }
                    if (!res.ok) throw new Error(`Error en el servidor: ${res.status}`);
                    const result = await res.json();
                    
                    if (result.success === false) {
                        showToast(result.error || 'No se pudieron extraer los datos del enlace.', 'error');
                        
                        // Si es Idealista, Facebook o Fotocasa, abrimos el modal pre-rellenando la URL para el bookmarklet
                        if (result.source === 'idealista' || result.source === 'facebook' || result.source === 'fotocasa') {
                            propertyForm.reset();
                            document.getElementById('property-id').value = '';
                            document.getElementById('modal-title').textContent = 'Añadir Nueva Propiedad';
                            document.getElementById('modal-paste-area').value = '';
                            document.getElementById('modal-url-input').value = validUrl;
                            document.getElementById('prop-url').value = validUrl;
                            
                            document.getElementById('extraction-tabs').style.display = 'flex';
                            switchTab('parser-tab');
                            propertyModal.classList.add('active');
                        }
                    } else if (result.success) {
                        propertyForm.reset();
                        document.getElementById('property-id').value = '';
                        document.getElementById('modal-title').textContent = 'Guardar Propiedad Detectada';
                        document.getElementById('modal-paste-area').value = '';
                        document.getElementById('modal-url-input').value = '';
                        
                        document.getElementById('extraction-tabs').style.display = 'none';
                        switchTab('manual-form-tab');

                        fillPropertyForm(result.data);
                        propertyModal.classList.add('active');
                        
                        showToast('Piso extraído y analizado de forma inteligente.', 'success');
                        dashboardPasteArea.value = '';
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al conectar con el analizador de enlaces.', 'error');
                } finally {
                    btnDashboardParse.disabled = false;
                    btnDashboardParse.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
                }
            } else {
                const data = parseListingText(text);
                if (data) {
                    propertyForm.reset();
                    document.getElementById('property-id').value = '';
                    document.getElementById('modal-title').textContent = 'Guardar Propiedad Detectada';
                    document.getElementById('modal-paste-area').value = '';
                    document.getElementById('modal-url-input').value = '';
                    
                    document.getElementById('extraction-tabs').style.display = 'none';
                    switchTab('manual-form-tab');

                    fillPropertyForm(data);
                    propertyModal.classList.add('active');
                    
                    dashboardPasteArea.value = '';
                } else {
                    showToast('No se detectaron campos válidos. Prueba a introducir los datos manualmente.', 'warning');
                }
            }
        });
    }

    // --- 5. FILTRADO Y BÚSQUEDA ---
    const filterSearch = document.getElementById('filter-search');
    const filterPriceMax = document.getElementById('filter-price-max');
    const filterSavingsMax = document.getElementById('filter-savings-max');
    const filterRooms = document.getElementById('filter-rooms');
    const filterGarage = document.getElementById('filter-garage');
    const filterStatus = document.getElementById('filter-status');
    const filterVote = document.getElementById('filter-vote');
    const sortBy = document.getElementById('sort-by');
    const btnVerifyAllLinks = document.getElementById('btn-verify-all-links');
    const btnToggleFiltersMobile = document.getElementById('btn-toggle-filters-mobile');
    const toolbarFilters = document.getElementById('toolbar-filters');

    if (btnToggleFiltersMobile && toolbarFilters) {
        btnToggleFiltersMobile.addEventListener('click', () => {
            const isActive = toolbarFilters.classList.toggle('active-mobile-panel');
            btnToggleFiltersMobile.classList.toggle('active', isActive);
        });
    }

    const filterTrigger = () => {
        currentPage = 1;
        updateMobileFilterBadge();
        renderListings();
    };

    if (filterSearch) filterSearch.addEventListener('input', filterTrigger);
    if (filterPriceMax) filterPriceMax.addEventListener('input', filterTrigger);
    if (filterSavingsMax) filterSavingsMax.addEventListener('input', filterTrigger);
    if (filterRooms) filterRooms.addEventListener('change', filterTrigger);
    if (filterGarage) filterGarage.addEventListener('change', filterTrigger);
    if (filterStatus) filterStatus.addEventListener('change', filterTrigger);
    if (filterVote) filterVote.addEventListener('change', filterTrigger);
    if (sortBy) sortBy.addEventListener('change', filterTrigger);

    if (btnVerifyAllLinks) {
        btnVerifyAllLinks.addEventListener('click', () => {
            verifyAllPropertiesLinks();
        });
    }

    const btnClearFilters = document.getElementById('btn-clear-filters');
    if (btnClearFilters) {
        btnClearFilters.addEventListener('click', () => {
            if (filterSearch) filterSearch.value = '';
            if (filterPriceMax) filterPriceMax.value = '';
            if (filterSavingsMax) filterSavingsMax.value = '';
            if (filterRooms) filterRooms.value = '';
            if (filterGarage) filterGarage.value = '';
            if (filterStatus) filterStatus.value = '';
            if (filterVote) filterVote.value = '';
            if (sortBy) sortBy.value = 'date-desc';
            filterTrigger();
            showToast('Filtros restablecidos.', 'success');
        });
    }

    // --- 6. CAMBIO DE VISTA (CUADRÍCULA / TABLA) ---
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewTable = document.getElementById('btn-view-table');
    const gridView = document.getElementById('listings-grid-view');
    const tableView = document.getElementById('listings-table-view');

    if (btnViewGrid && btnViewTable) {
        btnViewGrid.addEventListener('click', () => {
            btnViewGrid.classList.add('active');
            btnViewTable.classList.remove('active');
            gridView.classList.remove('hidden');
            tableView.classList.add('hidden');
            activeView = 'grid';
        });

        btnViewTable.addEventListener('click', () => {
            btnViewTable.classList.add('active');
            btnViewGrid.classList.remove('active');
            tableView.classList.remove('hidden');
            gridView.classList.add('hidden');
            activeView = 'table';
        });
    }

    // --- 6a. BOTONES DE PAGINACIÓN ---
    const btnPrevPage = document.getElementById('btn-prev-page');
    const btnNextPage = document.getElementById('btn-next-page');

    if (btnPrevPage && btnNextPage) {
        btnPrevPage.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderListings();
                const toolbar = document.querySelector('.toolbar');
                if (toolbar) {
                    toolbar.scrollIntoView({ behavior: 'smooth' });
                }
            }
        });

        btnNextPage.addEventListener('click', () => {
            currentPage++;
            renderListings();
            const toolbar = document.querySelector('.toolbar');
            if (toolbar) {
                toolbar.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    // --- 7. CONFIGURACIÓN DE GASTOS ---
    const settingsForm = document.getElementById('settings-form');
    const btnResetSettings = document.getElementById('btn-reset-settings');

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const ccaaRates = {};
            const rateInputs = document.querySelectorAll('.ccaa-tax-rate');
            rateInputs.forEach(input => {
                const ccaaName = input.getAttribute('data-ccaa');
                ccaaRates[ccaaName] = parseFloat(input.value) || 0;
            });

            const newSettings = {
                downpaymentPct: parseFloat(document.getElementById('setting-downpayment').value),
                notaryRegistryPct: parseFloat(document.getElementById('setting-notary-reg-pct').value),
                appraisalCost: parseFloat(document.getElementById('setting-appraisal').value),
                newBuildAjd: parseFloat(document.getElementById('setting-new-build-ajd').value),
                mortgageInterestRate: parseFloat(document.getElementById('setting-mortgage-rate').value),
                mortgageDurationYears: parseInt(document.getElementById('setting-mortgage-duration').value),
                ccaaRates
            };

            const success = await saveSettings(newSettings);
            if (success) {
                renderDashboard();
                renderListings();
            }
        });
    }

    if (btnResetSettings) {
        btnResetSettings.addEventListener('click', async () => {
            if (confirm('¿Seguro que deseas restablecer los ajustes a los valores iniciales por defecto en España?')) {
                // Mandar ajustes por defecto definidos en el servidor (el endpoint POST los creará o podemos cargarlos)
                const DEFAULT_CCAA_ITP = {
                    'Andalucía': 7.0, 'Aragón': 8.0, 'Asturias': 8.0, 'Baleares': 8.0, 'Canarias': 6.5,
                    'Cantabria': 9.0, 'Castilla-La Mancha': 9.0, 'Castilla y León': 8.0, 'Cataluña': 10.0,
                    'Comunidad Valenciana': 10.0, 'Extremadura': 8.0, 'Galicia': 9.0, 'Madrid': 6.0,
                    'Murcia': 8.0, 'Navarra': 6.0, 'País Vasco': 4.0, 'La Rioja': 7.0, 'Ceuta': 6.0, 'Melilla': 6.0
                };
                const defaults = {
                    downpaymentPct: 20,
                    notaryRegistryPct: 1.5,
                    appraisalCost: 400,
                    newBuildAjd: 1.0,
                    mortgageInterestRate: 3.0,
                    mortgageDurationYears: 30,
                    ccaaRates: DEFAULT_CCAA_ITP
                };

                const success = await saveSettings(defaults);
                if (success) {
                    renderSettingsForm();
                    renderDashboard();
                    renderListings();
                }
            }
        });
    }

    // --- 8. EXPENSES BREAKDOWN MODAL CLOSE ---
    const btnCloseExpensesModal = document.getElementById('btn-close-expenses-modal');
    if (btnCloseExpensesModal) {
        btnCloseExpensesModal.addEventListener('click', () => {
            document.getElementById('expenses-modal').classList.remove('active');
        });
    }

    // --- 8b. EXPORTACIÓN A EXCEL Y PDF (TOOLBAR) ---
    const btnExportExcel = document.getElementById('btn-export-excel');
    const btnExportPdfSummary = document.getElementById('btn-export-pdf-summary');

    if (btnExportExcel) {
        btnExportExcel.addEventListener('click', exportPropertiesToExcel);
    }
    if (btnExportPdfSummary) {
        btnExportPdfSummary.addEventListener('click', exportPortfolioSummaryPDF);
    }

    // --- 8c. CONTROLADORES DEL MAPA INTERACTIVO ---
    const btnMapRecenter = document.getElementById('btn-map-recenter');
    const btnMapFullscreen = document.getElementById('btn-map-fullscreen');
    const mapCardWrapper = document.getElementById('map-card-wrapper');

    if (btnMapRecenter) {
        btnMapRecenter.addEventListener('click', () => {
            recenterMap();
            showToast('Vista del mapa re-centrada.', 'info');
        });
    }

    if (btnMapFullscreen && mapCardWrapper) {
        btnMapFullscreen.addEventListener('click', () => {
            const isFull = mapCardWrapper.classList.toggle('map-fullscreen-mode');
            btnMapFullscreen.innerHTML = isFull ?
                '<i class="fa-solid fa-compress text-indigo"></i> <span class="hide-mobile">Reducir</span>' :
                '<i class="fa-solid fa-expand text-secondary"></i> <span class="hide-mobile">Ampliar</span>';
            if (mapInstance) {
                setTimeout(() => { mapInstance.invalidateSize(); }, 150);
            }
        });
    }

    // --- 8d. SERVICIOS CERCANOS EN MAPA PRINCIPAL (DASHBOARD POI) ---
    const dashboardPoiChips = document.querySelectorAll('#dashboard-poi-toolbar .poi-chip');
    dashboardPoiChips.forEach(chip => {
        chip.addEventListener('click', async () => {
            const poiType = chip.getAttribute('data-poi');

            if (activeDashboardPoiType === poiType) {
                // Desactivar
                activeDashboardPoiType = null;
                chip.classList.remove('active');
                if (dashboardPoiMarkersGroup) {
                    mapInstance.removeLayer(dashboardPoiMarkersGroup);
                    dashboardPoiMarkersGroup = null;
                }
                showToast('Capa de servicios ocultada.', 'info');
                return;
            }

            // Activar nuevo tipo de POI
            dashboardPoiChips.forEach(c => c.classList.remove('active'));
            chip.classList.add('active', 'loading');
            activeDashboardPoiType = poiType;

            const center = mapInstance.getCenter();
            showToast(`Buscando ${POI_CONFIGS[poiType].label.toLowerCase()} en el área visible...`, 'info');
            const pois = await fetchPOIsAround(poiType, center.lat, center.lng);
            chip.classList.remove('loading');

            if (dashboardPoiMarkersGroup) {
                mapInstance.removeLayer(dashboardPoiMarkersGroup);
                dashboardPoiMarkersGroup = null;
            }

            if (!pois || pois.length === 0) {
                showToast(`No se encontraron ${POI_CONFIGS[poiType].label.toLowerCase()} cercanos en esta zona.`, 'warning');
                return;
            }

            dashboardPoiMarkersGroup = L.featureGroup();
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
                    <div style="font-family:var(--font-body); font-size:0.825rem; min-width:180px;">
                        <strong><i class="fa-solid ${cfg.icon}"></i> ${p.name}</strong><br>
                        <span style="color:#64748b; font-size:0.75rem;">Servicio: ${cfg.label}</span><br>
                        <a href="https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lon}" target="_blank" style="color:#4f46e5; font-weight:600; font-size:0.75rem; display:inline-block; margin-top:4px;">
                            <i class="fa-solid fa-location-arrow"></i> Ver en Google Maps &rarr;
                        </a>
                    </div>
                `);
                dashboardPoiMarkersGroup.addLayer(poiMarker);
            });

            mapInstance.addLayer(dashboardPoiMarkersGroup);
            showToast(`📍 Se encontraron ${pois.length} ${cfg.label.toLowerCase()} en el mapa.`, 'success');
        });
    });

    // --- 9. IMPORTACIÓN / EXPORTACIÓN JSON ---
    const btnExport = document.getElementById('btn-export');
    const btnImportTrigger = document.getElementById('btn-import-trigger');
    const importFileInput = document.getElementById('import-file');

    if (btnExport) {
        btnExport.addEventListener('click', () => {
            const dataToExport = {
                properties,
                settings: appSettings,
                exportDate: new Date().toISOString()
            };

            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
            const downloadAnchor = document.createElement('a');
            downloadAnchor.setAttribute("href", dataStr);
            downloadAnchor.setAttribute("download", `HabiTrack_Backup_${new Date().toISOString().split('T')[0]}.json`);
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            showToast('JSON exportado correctamente.', 'success');
        });
    }

    if (btnImportTrigger && importFileInput) {
        btnImportTrigger.addEventListener('click', () => {
            importFileInput.click();
        });

        importFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const parsedData = JSON.parse(event.target.result);
                    
                    if (!parsedData.properties || !Array.isArray(parsedData.properties)) {
                        throw new Error('Formato JSON de propiedades inválido.');
                    }

                    if (confirm(`Se van a importar ${parsedData.properties.length} propiedades. Esto creará los registros en la base de datos SQLite. ¿Deseas continuar?`)) {
                        // Guardar configuración si existe en el JSON
                        if (parsedData.settings) {
                            await saveSettings(parsedData.settings);
                        }

                        // Subir cada propiedad al servidor
                        let successCount = 0;
                        for (const prop of parsedData.properties) {
                            // Limpiar ID anterior para insertar nuevo
                            const cleanProp = { ...prop };
                            delete cleanProp.id;
                            delete cleanProp.created_at;

                            const success = await addProperty(cleanProp);
                            if (success) successCount++;
                        }

                        showToast(`Importados ${successCount} de ${parsedData.properties.length} pisos.`, 'success');
                        
                        // Recargar todo
                        await fetchSettings();
                        await fetchProperties();
                        renderDashboard();
                        renderListings();
                        renderSettingsForm();
                    }
                } catch (err) {
                    console.error(err);
                    showToast('Error al parsear el archivo JSON. Verifica que sea un backup de HabiTrack.', 'error');
                }
                importFileInput.value = ''; // Resetear file input
            };
            reader.readAsText(file);
        });
    }

    // --- 10. SETUP BOOKMARKLET AND COPIER ---
    const bookmarkletCode = "javascript:(function(){" +
    "const url=window.location.href;" +
    "const data={url:url,title:document.title.split(' | ')[0]||'',price:null,m2:null,rooms:0,baths:0,garage:'no',elevator:'desconocido',zone:'',comments:'',photos:'',latitude:null,longitude:null};" +
    "function cleanPrice(str){if(!str)return null;const cleaned=str.replace(/[^\\d]/g,'');return cleaned?parseInt(cleaned,10):null;}" +
    "function cleanNum(str){if(!str)return null;const match=str.match(/\\d+/);return match?parseInt(match[0],10):null;}" +
    "let jsonLdData=null;" +
    "try{" +
    "const scripts=document.querySelectorAll('script[type=\"application/ld+json\"]');" +
    "for(const script of scripts){" +
    "try{" +
    "const parsed=JSON.parse(script.innerText);" +
    "const items=Array.isArray(parsed)?parsed:[parsed];" +
    "for(const item of items){" +
    "if(item['@type']==='Product'||item['@type']==='RealEstateAgent'||item['@type']==='SingleFamilyResidence'||item['@type']==='Offer'||item.price){" +
    "jsonLdData=item;break;" +
    "}" +
    "}" +
    "if(jsonLdData)break;" +
    "}catch(e){}" +
    "}" +
    "}catch(e){}" +
    "if(jsonLdData){" +
    "if(jsonLdData.name)data.title=jsonLdData.name;" +
    "if(jsonLdData.description)data.comments=jsonLdData.description;" +
    "if(jsonLdData.image)data.photos=Array.isArray(jsonLdData.image)?jsonLdData.image.join(', '):jsonLdData.image;" +
    "if(jsonLdData.offers){" +
    "const offers=Array.isArray(jsonLdData.offers)?jsonLdData.offers[0]:jsonLdData.offers;" +
    "if(offers.price)data.price=cleanPrice(String(offers.price));" +
    "}" +
    "}" +
    "if(url.includes('facebook.com/marketplace')){" +
    "let titleClean=document.title;" +
    "titleClean=titleClean.replace(/\\s*[|–-]\\s*Facebook.*$/i,'');" +
    "titleClean=titleClean.replace(/\\s*[|–-]\\s*Marketplace.*$/i,'');" +
    "data.title=titleClean.trim()||'Anuncio en Facebook';" +
    "const priceRegexes=[/€\\s*(\\d{1,3}(?:[.,]\\d{3})+)/,/(\\d{1,3}(?:[.,]\\d{3})+)\\s*€/,/€\\s*(\\d+)/,/(\\d+)\\s*€/];" +
    "let foundPrice=null;" +
    "const spans=document.querySelectorAll('span, div');" +
    "for(const el of spans){" +
    "if(el.children.length===0&&el.innerText){" +
    "const text=el.innerText.trim();" +
    "if((text.startsWith('€')||text.endsWith('€')||text.includes('€'))&&text.length<20){" +
    "for(const regex of priceRegexes){" +
    "const m=text.match(regex);" +
    "if(m){foundPrice=cleanPrice(m[0]);break;}" +
    "}" +
    "}" +
    "if(foundPrice)break;" +
    "}" +
    "}" +
    "if(foundPrice)data.price=foundPrice;" +
    "const allSpans=Array.from(document.querySelectorAll('span'));" +
    "const descHeader=allSpans.find(s=>s.innerText&&(s.innerText.toLowerCase()==='descripción'||s.innerText.toLowerCase()==='description'));" +
    "if(descHeader){" +
    "let parent=descHeader.parentElement;" +
    "for(let i=0;i<4;i++){" +
    "if(parent){" +
    "const descEl=parent.querySelector('div:nth-child(2), span:nth-child(2)');" +
    "if(descEl&&descEl.innerText.length>20){data.comments=descEl.innerText;break;}" +
    "}" +
    "parent=parent?parent.parentElement:null;" +
    "}" +
    "}" +
    "const imgs=Array.from(document.querySelectorAll('img'));" +
    "const photoUrls=[];" +
    "imgs.forEach(img=>{" +
    "const src=img.src;" +
    "if(src&&(src.includes('fbcdn')||src.includes('scontent'))&&!src.includes('/theme/')&&!src.includes('/rsrc.php')){" +
    "const width=img.naturalWidth||img.width||0;" +
    "const height=img.naturalHeight||img.height||0;" +
    "if(width>200||height>200||src.includes('p200x200')||src.includes('p480x480')||src.includes('scontent')){" +
    "if(!photoUrls.includes(src))photoUrls.push(src);" +
    "}" +
    "}" +
    "});" +
    "if(photoUrls.length>0)data.photos=photoUrls.slice(0,10).join(', ');" +
    "const locHeader=allSpans.find(s=>s.innerText&&(s.innerText.toLowerCase().includes('ubicación')||s.innerText.toLowerCase()==='mapa'));" +
    "if(locHeader){" +
    "let parent=locHeader.parentElement;" +
    "for(let i=0;i<3;i++){" +
    "if(parent){" +
    "const lines=parent.innerText.split('\\n');" +
    "if(lines.length>1){data.zone=lines[1];break;}" +
    "}" +
    "parent=parent?parent.parentElement:null;" +
    "}" +
    "}" +
    "}else if(url.includes('idealista.com')){" +
    "const h1=document.querySelector('.main-info__title-main');" +
    "if(h1)data.title=h1.innerText.trim();" +
    "const priceEl=document.querySelector('.info-data-price');" +
    "if(priceEl)data.price=cleanPrice(priceEl.innerText);" +
    "const infoFeatures=document.querySelectorAll('.info-features span');" +
    "infoFeatures.forEach(el=>{" +
    "const text=el.innerText.toLowerCase();" +
    "if(text.includes('m²'))data.m2=cleanNum(text);" +
    "if(text.includes('hab'))data.rooms=cleanNum(text);" +
    "if(text.includes('baño')||text.includes('wc'))data.baths=cleanNum(text);" +
    "if(text.includes('garaje')||text.includes('parking'))data.garage='si';" +
    "if(text.includes('ascensor'))data.elevator=text.includes('con ascensor')?'si':'no';" +
    "});" +
    "const images=document.querySelectorAll('.gallery-image img, #main-multimedia img');" +
    "const photoUrls=[];" +
    "images.forEach(img=>{" +
    "let src=img.src||img.getAttribute('data-lazy')||img.getAttribute('data-src');" +
    "if(src&&src.startsWith('http')&&!src.includes('logo'))photoUrls.push(src);" +
    "});" +
    "data.photos=photoUrls.join(', ');" +
    "const commentsEl=document.querySelector('.comment');" +
    "if(commentsEl)data.comments=commentsEl.innerText.trim();" +
    "const zoneEl=document.querySelector('#headerMap .map-label');" +
    "if(zoneEl)data.zone=zoneEl.innerText.trim();" +
    "}else if(url.includes('fotocasa.es')){" +
    "const h1=document.querySelector('.re-DetailHeader-title, h1');" +
    "if(h1)data.title=h1.innerText.trim();" +
    "const priceEl=document.querySelector('.re-DetailHeader-price');" +
    "if(priceEl)data.price=cleanPrice(priceEl.innerText);" +
    "const features=document.querySelectorAll('.re-DetailFeaturesList-feature');" +
    "features.forEach(feat=>{" +
    "const text=feat.innerText.toLowerCase();" +
    "if(text.includes('m²'))data.m2=cleanNum(text);" +
    "if(text.includes('hab'))data.rooms=cleanNum(text);" +
    "if(text.includes('bañ')||text.includes('aseo'))data.baths=cleanNum(text);" +
    "});" +
    "const commentsEl=document.querySelector('.re-DetailDescription-text');" +
    "if(commentsEl)data.comments=commentsEl.innerText.trim();" +
    "}else if(document.querySelector('#modulo-fichapropiedad, .fichapropiedad-tituloprincipal, [cargafoto]')||url.includes('/ficha/')){" +
    "const h1=document.querySelector('.fichapropiedad-tituloprincipal h1, #fichapropiedad-titulos h1, h1');" +
    "if(h1)data.title=h1.innerText.trim();" +
    "const priceEl=document.querySelector('.fichapropiedad-precio, .precio-ficha');" +
    "if(priceEl)data.price=cleanPrice(priceEl.innerText);" +
    "const listItems=document.querySelectorAll('.fichapropiedad-listadatos li, ul.listadatos li');" +
    "let zPart='',sPart='';" +
    "listItems.forEach(li=>{" +
    "const label=(li.querySelector('.caracteristica, b')?li.querySelector('.caracteristica, b').innerText:'').toLowerCase();" +
    "const val=(li.querySelector('.valor, span:last-child')?li.querySelector('.valor, span:last-child').innerText:li.innerText).trim();" +
    "if(label.includes('superficie')&&!data.m2)data.m2=cleanNum(val);" +
    "if((label.includes('habitacion')||label.includes('dormitorio'))&&!data.rooms)data.rooms=cleanNum(val);" +
    "if((label.includes('baño')||label.includes('aseo'))&&!data.baths)data.baths=cleanNum(val);" +
    "if(label.includes('zona / ciudad')||label.includes('zona'))zPart=val;" +
    "if(label.includes('calle'))sPart=val;" +
    "});" +
    "if(zPart||sPart)data.zone=[sPart,zPart].filter(Boolean).join(', ');" +
    "const calidades=document.querySelectorAll('.fichapropiedad-listacalidades li, .bloqueCalidadPropiedad');" +
    "calidades.forEach(c=>{" +
    "const t=c.innerText.toLowerCase();" +
    "if(t.includes('ascensor'))data.elevator='si';" +
    "if(t.includes('garaje')||t.includes('parking'))data.garage='si';" +
    "});" +
    "const descEl=document.querySelector('#fichapropiedad-bloquedescripcion, .fichapropiedad-descripcion');" +
    "if(descEl)data.comments=descEl.innerText.trim();" +
    "const cfElements=document.querySelectorAll('[cargafoto]');" +
    "const inmoPhotos=[];" +
    "const seenBase=new Set();" +
    "cfElements.forEach(el=>{" +
    "let cf=el.getAttribute('cargafoto');" +
    "if(cf){" +
    "let hd=cf.replace(/s\\.(jpg|jpeg|webp|png)(\\?.*)?$/i,'.$1$2').replace(/\\?n$/i,'');" +
    "if(!hd.startsWith('http')){if(hd.startsWith('//'))hd='https:'+hd;else hd=window.location.origin+hd;}" +
    "const fn=hd.split('/').pop().split('?')[0].toLowerCase();" +
    "if(!seenBase.has(fn)){seenBase.add(fn);inmoPhotos.push(hd);}" +
    "}" +
    "});" +
    "if(inmoPhotos.length>0)data.photos=inmoPhotos.slice(0,15).join(', ');" +
    "}" +
    "const textToScan=(data.title+' '+data.comments).toLowerCase();" +
    "if(!data.price){" +
    "const m=textToScan.match(/(\\d{1,3}(?:\\.\\d{3})+)\\s*(?:€|euros)/i);" +
    "if(m)data.price=parseFloat(m[1].replace(/\\./g,''));" +
    "}" +
    "if(!data.rooms){" +
    "const m=textToScan.match(/(\\d+)\\s*(?:hab|dormitorio|habitac)/i);" +
    "if(m)data.rooms=parseInt(m[1],10);" +
    "}" +
    "if(!data.baths){" +
    "const m=textToScan.match(/(\\d+)\\s*(?:baño|aseo|wc)/i);" +
    "if(m)data.baths=parseInt(m[1],10);" +
    "}" +
    "if(!data.m2){" +
    "const m=textToScan.match(/(\\d+)\\s*(?:m²|m2|metros\\s+cuadrados)/i);" +
    "if(m)data.m2=parseFloat(m[1]);" +
    "}" +
    "if(data.garage==='no'&&(textToScan.includes('garaje')||textToScan.includes('parking')||textToScan.includes('cochera')))data.garage='si';" +
    "if(data.elevator==='desconocido'){" +
    "if(textToScan.includes('con ascensor'))data.elevator='si';" +
    "else if(textToScan.includes('sin ascensor'))data.elevator='no';" +
    "}" +
    "const jsonStr=JSON.stringify(data,null,2);" +
    "const dummy=document.createElement('textarea');" +
    "document.body.appendChild(dummy);" +
    "dummy.value=jsonStr;" +
    "dummy.select();" +
    "let success=false;" +
    "try{success=document.execCommand('copy');}catch(err){}" +
    "document.body.removeChild(dummy);" +
    "if(success){" +
    "alert('¡Datos del piso copiados al portapapeles!\\n\\nVuelve a HabiTrack y pega (Ctrl+V) en el área de texto del Analizador Inteligente para autocompletar la propiedad.');" +
    "}else{" +
    "prompt('No se pudo copiar automáticamente. Copia este texto manualmente:',jsonStr);" +
    "}" +
    "})();";

    const bookmarkletBtn = document.getElementById('bookmarklet-btn');
    const btnCopyBookmarklet = document.getElementById('btn-copy-bookmarklet');
    const guideBookmarkletBtn = document.getElementById('guide-bookmarklet-btn');
    const btnGuideCopyBookmarklet = document.getElementById('btn-guide-copy-bookmarklet');
    const btnGuideViewCode = document.getElementById('btn-guide-view-code');
    const guideCodeBox = document.getElementById('guide-code-box');
    const guideCodeTextarea = document.getElementById('guide-code-textarea');
    
    if (bookmarkletBtn) bookmarkletBtn.href = bookmarkletCode;
    if (guideBookmarkletBtn) guideBookmarkletBtn.href = bookmarkletCode;
    if (guideCodeTextarea) guideCodeTextarea.value = bookmarkletCode;

    const copyHandler = () => {
        navigator.clipboard.writeText(bookmarkletCode).then(() => {
            showToast('Código Bookmarklet copiado al portapapeles con éxito.', 'success');
        }).catch(err => {
            console.error('Error al copiar:', err);
            showToast('No se pudo copiar el código automáticamente.', 'error');
        });
    };

    if (btnCopyBookmarklet) btnCopyBookmarklet.addEventListener('click', copyHandler);
    if (btnGuideCopyBookmarklet) btnGuideCopyBookmarklet.addEventListener('click', copyHandler);

    if (btnGuideViewCode && guideCodeBox) {
        btnGuideViewCode.addEventListener('click', () => {
            const isHidden = guideCodeBox.style.display === 'none';
            guideCodeBox.style.display = isHidden ? 'block' : 'none';
            btnGuideViewCode.innerHTML = isHidden ? 
                '<i class="fa-solid fa-code text-indigo"></i> Ocultar Código' : 
                '<i class="fa-solid fa-code text-secondary"></i> Ver Código Fuente';
        });
    }

    // --- MANEJADOR DEL SWITCH DE MODOS DE CAPTURA & EXTRACTOR ---
    const extractorSwitchBtns = document.querySelectorAll('.extractor-switch-btn');
    const extractorTabPanels = document.querySelectorAll('.extractor-tab-panel');

    extractorSwitchBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTabId = btn.getAttribute('data-tab');
            extractorSwitchBtns.forEach(b => b.classList.remove('active'));
            extractorTabPanels.forEach(panel => {
                panel.classList.remove('active');
                panel.style.display = 'none';
            });
            btn.classList.add('active');
            const activePanel = document.getElementById(targetTabId);
            if (activePanel) {
                activePanel.classList.add('active');
                activePanel.style.display = 'block';
            }
        });
    });

    // Toggle de dispositivo en Bookmarklet (Desktop vs Móvil)
    const guideToggleDesktop = document.getElementById('guide-toggle-desktop');
    const guideToggleMobile = document.getElementById('guide-toggle-mobile');
    const guideInstDesktop = document.getElementById('guide-instructions-desktop');
    const guideInstMobile = document.getElementById('guide-instructions-mobile');

    if (guideToggleDesktop && guideToggleMobile) {
        guideToggleDesktop.addEventListener('click', () => {
            guideToggleDesktop.style.background = 'var(--primary)';
            guideToggleDesktop.style.color = '#fff';
            guideToggleMobile.style.background = 'transparent';
            guideToggleMobile.style.color = 'var(--text-muted)';
            if (guideInstDesktop) guideInstDesktop.style.display = 'block';
            if (guideInstMobile) guideInstMobile.style.display = 'none';
        });

        guideToggleMobile.addEventListener('click', () => {
            guideToggleMobile.style.background = 'var(--emerald)';
            guideToggleMobile.style.color = '#fff';
            guideToggleDesktop.style.background = 'transparent';
            guideToggleDesktop.style.color = 'var(--text-muted)';
            if (guideInstDesktop) guideInstDesktop.style.display = 'none';
            if (guideInstMobile) guideInstMobile.style.display = 'block';
        });
    }

    // Copiar nombre de la carpeta de la extensión
    const btnCopyExtPath = document.getElementById('btn-copy-extension-path');
    if (btnCopyExtPath) {
        btnCopyExtPath.addEventListener('click', () => {
            const extFolderName = 'extension';
            navigator.clipboard.writeText(extFolderName).then(() => {
                showToast('Nombre de carpeta "extension" copiado al portapapeles.', 'success');
            }).catch(() => {
                showToast('No se pudo copiar automáticamente.', 'error');
            });
        });
    }

    // Abrir modal de Analizador desde la pestaña de Pegado Rápido
    const btnOpenAnalyzerGuide = document.getElementById('btn-open-analyzer-guide');
    if (btnOpenAnalyzerGuide) {
        btnOpenAnalyzerGuide.addEventListener('click', () => {
            const modal = document.getElementById('analyzer-modal');
            if (modal) {
                modal.classList.add('active');
                const input = document.getElementById('analyzer-input');
                if (input) input.focus();
            }
        });
    }
}

// Configurar manejadores para botones generados dinámicamente en las tarjetas/filas
function setupDynamicButtons() {
    // Botones de Ver Ficha Detallada
    const btnDetails = document.querySelectorAll('.btn-view-detail');
    btnDetails.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = parseInt(btn.getAttribute('data-id'), 10);
            openPropertyDetailSheet(id);
        });
    });

    // Botones de Ver Gastos
    const btnExpenses = document.querySelectorAll('.btn-view-expenses');
    btnExpenses.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const prop = properties.find(p => p.id === parseInt(id));
            if (prop) {
                showExpensesBreakdownModal(prop);
            }
        });
    });

    // Botones de Editar
    const btnEdit = document.querySelectorAll('.btn-edit-prop');
    btnEdit.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = btn.getAttribute('data-id');
            const prop = properties.find(p => p.id === parseInt(id));
            if (prop) {
                openEditModal(prop);
            }
        });
    });

    // Botones de Eliminar
    const btnDelete = document.querySelectorAll('.btn-delete-prop');
    btnDelete.forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const id = btn.getAttribute('data-id');
            const prop = properties.find(p => p.id === parseInt(id));
            if (prop) {
                if (confirm(`¿Estás seguro de que deseas eliminar la propiedad "${prop.title}"? Esta acción se guardará en SQLite.`)) {
                    const success = await deleteProperty(id);
                    if (success) {
                        renderDashboard();
                        renderListings();
                    }
                }
            }
        });
    });

    // FASE 5: Botones de Voto Rápido en Tarjetas
    const btnVotes = document.querySelectorAll('.card-vote-btn');
    btnVotes.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const id = parseInt(btn.getAttribute('data-id'), 10);
            const vote = btn.getAttribute('data-vote');
            window.voteProperty(id, vote);
        });
    });
}

// Configuración adicional para enlazar botones dinámicos en el dashboard
function setupRecentListingsButtons() {
    // Llamado desde renderRecentListings
    setupDynamicButtons();
}

async function handleCreateWorkspace(e) {
    e.preventDefault();
    const nameInput = document.getElementById('new-ws-name');
    const name = nameInput ? nameInput.value.trim() : '';
    if (!name) return;

    const btn = document.getElementById('btn-submit-create-ws');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Creando...';
    }

    try {
        const response = await fetch('/api/workspaces', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ name })
        });

        if (response.ok) {
            const data = await response.json();
            showToast(`¡Espacio "${name}" creado con éxito!`, 'success');
            if (nameInput) nameInput.value = '';
            await fetchWorkspaces();
            await window.switchWorkspace(data.workspace.id);
            openWorkspaceModal('ws-tab-active');
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al crear espacio.', 'error');
        }
    } catch (err) {
        console.error('Error creating workspace:', err);
        showToast('Error al conectar con el servidor.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-plus"></i> Crear Espacio Compartido';
        }
    }
}

async function handleJoinWorkspace(e) {
    e.preventDefault();
    const codeInput = document.getElementById('join-ws-code');
    const code = codeInput ? codeInput.value.trim().toUpperCase() : '';
    if (!code) return;

    const btn = document.getElementById('btn-submit-join-ws');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Uniéndome...';
    }

    try {
        const response = await fetch('/api/workspaces/join', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ invite_code: code })
        });

        if (response.ok) {
            const data = await response.json();
            showToast(data.message || '¡Te has unido al espacio compartido!', 'success');
            if (codeInput) codeInput.value = '';
            await fetchWorkspaces();
            await window.switchWorkspace(data.workspace.id);
            openWorkspaceModal('ws-tab-active');
        } else {
            const err = await response.json();
            showToast(err.error || 'Código de invitación inválido.', 'error');
        }
    } catch (err) {
        console.error('Error joining workspace:', err);
        showToast('Error al conectar con el servidor.', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-right-to-bracket"></i> Unirme al Espacio';
        }
    }
}

async function handleLeaveWorkspace() {
    if (activeWorkspaceId === 'all' || activeWorkspaceId === 'personal') return;
    const currentWs = workspaces.find(w => w.id == activeWorkspaceId);
    if (!currentWs) return;

    if (!confirm(`¿Estás seguro de que deseas salir del espacio "${currentWs.name}"?`)) return;

    try {
        const response = await fetch(`/api/workspaces/${currentWs.id}/leave`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            showToast(`Has abandonado "${currentWs.name}".`, 'info');
            closeWorkspaceModal();
            await fetchWorkspaces();
            await window.switchWorkspace('all');
        } else {
            const err = await response.json();
            showToast(err.error || 'Error al salir del espacio.', 'error');
        }
    } catch (err) {
        console.error('Error leaving workspace:', err);
        showToast('Error al conectar con el servidor.', 'error');
    }
}

// Helper para alternar entre pestañas en el modal de añadir
function switchTab(tabId) {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        if (btn.getAttribute('data-tab') === tabId || btn.id === 'tab-parser-btn' && tabId === 'parser-tab') {
            btn.classList.add('active');
        } else if (btn.getAttribute('data-tab') === 'manual-form-tab' && tabId === 'manual-form-tab') {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    tabContents.forEach(content => {
        if (content.id === tabId) {
            content.classList.add('active');
        } else {
            content.classList.remove('active');
        }
    });
}

// Llenar el formulario de propiedades con datos de extracción
function fillPropertyForm(data) {
    if (data.title) document.getElementById('prop-title').value = data.title;
    if (data.price) document.getElementById('prop-price').value = data.price;
    if (data.m2) document.getElementById('prop-m2').value = data.m2;
    if (data.rooms) document.getElementById('prop-rooms').value = data.rooms;
    if (data.baths) document.getElementById('prop-baths').value = data.baths;
    if (data.garage) document.getElementById('prop-garage').value = data.garage;
    if (data.elevator) document.getElementById('prop-elevator').value = data.elevator;
    if (data.estate_type) document.getElementById('prop-estate-type').value = data.estate_type;
    if (data.zone) document.getElementById('prop-zone').value = data.zone;
    if (data.url) document.getElementById('prop-url').value = data.url;
    if (data.comments) document.getElementById('prop-comments').value = data.comments;
    if (data.photos) document.getElementById('prop-photos').value = data.photos;
    if (data.ccaa) document.getElementById('prop-ccaa').value = data.ccaa;
    document.getElementById('prop-rating').value = data.rating || 0;
    document.getElementById('prop-latitude').value = data.latitude !== undefined && data.latitude !== null ? data.latitude : '';
    document.getElementById('prop-longitude').value = data.longitude !== undefined && data.longitude !== null ? data.longitude : '';
    updateFormPhotosPreview();
}

// Abrir modal en modo edición
function openEditModal(property) {
    const propertyModal = document.getElementById('property-modal');
    const propertyForm = document.getElementById('property-form');
    
    // Resetear form y rellenar con datos existentes
    propertyForm.reset();
    document.getElementById('property-id').value = property.id;
    document.getElementById('modal-title').textContent = 'Editar Propiedad';
    
    // Ocultar panel analizador inteligente en edición
    document.getElementById('extraction-tabs').style.display = 'none';
    switchTab('manual-form-tab');

    // Cargar campos
    document.getElementById('prop-title').value = property.title;
    document.getElementById('prop-price').value = property.price;
    document.getElementById('prop-m2').value = property.m2 || '';
    document.getElementById('prop-ccaa').value = property.ccaa;
    document.getElementById('prop-rooms').value = property.rooms;
    document.getElementById('prop-baths').value = property.baths;
    document.getElementById('prop-estate-type').value = property.estate_type;
    document.getElementById('prop-garage').value = property.garage;
    document.getElementById('prop-zone').value = property.zone || '';
    document.getElementById('prop-url').value = property.url || '';
    document.getElementById('prop-photos').value = property.photos || '';
    document.getElementById('prop-elevator').value = property.elevator;
    document.getElementById('prop-comments').value = property.comments || '';
    document.getElementById('prop-rating').value = property.rating || 0;
    document.getElementById('prop-latitude').value = property.latitude !== undefined && property.latitude !== null ? property.latitude : '';
    document.getElementById('prop-longitude').value = property.longitude !== undefined && property.longitude !== null ? property.longitude : '';

    updateFormPhotosPreview();
    propertyModal.classList.add('active');
}

function generateStarsHTML(rating) {
    const r = parseInt(rating) || 0;
    if (r <= 0) return '';
    let stars = '';
    for (let i = 1; i <= 5; i++) {
        if (i <= r) {
            stars += '<i class="fa-solid fa-star text-amber"></i>';
        } else {
            stars += '<i class="fa-regular fa-star text-muted-star"></i>';
        }
    }
    return `<div class="rating-badge" title="Valoración: ${r}/5"><span class="rating-stars">${stars}</span><span class="rating-score">${r}.0</span></div>`;
}

function getValidUrl(text) {
    const trimmed = text.trim();
    if (!trimmed) return null;
    
    // Check if it's already a full URL
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        return trimmed;
    }
    
    // Check if it starts with www. or is a domain-like string for our target portals
    if (trimmed.startsWith('www.') || /^(idealista\.com|fotocasa\.es)/i.test(trimmed)) {
        return 'https://' + trimmed;
    }
    
    // Check if it looks like a URL without a protocol (e.g. domain.tld/path)
    if (/^[^\s]+\.[a-zA-Z]{2,}\b[^\s]*$/.test(trimmed)) {
        return 'https://' + trimmed;
    }
    
    return null;
}
