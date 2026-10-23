// ==========================================================================
// FICHA DETALLADA DE INMUEBLE (DETAIL SHEET)
// ==========================================================================
let detailMiniMapInstance = null;
let activeDetailProperty = null;
let activeDetailPhotoIdx = 0;

window.openGalleryModal = openGalleryModal;
window.closeGalleryModal = closeGalleryModal;
window.openPropertyDetailSheet = openPropertyDetailSheet;
window.closePropertyDetailSheet = closePropertyDetailSheet;

function openPropertyDetailSheet(propertyId, initialPhotoIdx = 0) {
    const prop = properties.find(p => p.id == propertyId);
    if (!prop) return;

    activeDetailProperty = prop;
    activeDetailPhotoIdx = initialPhotoIdx;

    const modal = document.getElementById('property-detail-modal');
    if (!modal) return;

    const calc = calculateExpenses(prop.price, prop.ccaa, prop.estate_type);
    const photoList = prop.photos ? prop.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    const isSecondHand = prop.estate_type !== 'new';

    // Headers & Badges
    document.getElementById('detail-title').textContent = prop.title;
    document.getElementById('detail-zone-text').textContent = prop.zone || 'Zona no especificada';
    document.getElementById('detail-ccaa-text').textContent = prop.ccaa || 'España';

    const typeBadge = document.getElementById('detail-type-badge');
    if (typeBadge) {
        typeBadge.textContent = isSecondHand ? 'Segunda Mano' : 'Obra Nueva';
    }

    const ratingBadge = document.getElementById('detail-rating-badge');
    const ratingVal = document.getElementById('detail-rating-val');
    if (ratingBadge && ratingVal) {
        if (prop.rating > 0) {
            ratingBadge.style.display = 'inline-flex';
            ratingVal.textContent = prop.rating + '.0';
        } else {
            ratingBadge.style.display = 'none';
        }
    }

    // Media gallery in detail sheet
    renderDetailGalleryView(photoList);

    // Financial KPIs
    document.getElementById('detail-kpi-price').textContent = formatCurrency(prop.price);
    document.getElementById('detail-price-badge').textContent = formatCurrency(prop.price);
    const priceM2El = document.getElementById('detail-kpi-m2-price');
    if (priceM2El) {
        priceM2El.textContent = prop.m2 && prop.m2 > 0 ? `${formatCurrency(Math.round(prop.price / prop.m2))}/m²` : '-- €/m²';
    }

    document.getElementById('detail-kpi-budget').textContent = formatCurrency(calc.totalRequiredBudget);
    document.getElementById('detail-kpi-budget-sub').textContent = `Entrada (${calc.downpaymentPct}%) + Gastos CCAA`;

    document.getElementById('detail-kpi-mortgage').textContent = `${formatCurrency(calc.mortgageMonthlyPayment)}/mes`;
    document.getElementById('detail-kpi-mortgage-sub').textContent = `Al ${calc.mortgageInterestRate}% a ${calc.mortgageDurationYears} años`;

    document.getElementById('detail-kpi-taxes').textContent = formatCurrency(calc.taxes);
    document.getElementById('detail-kpi-taxes-sub').textContent = `${isSecondHand ? 'ITP' : 'IVA + AJD'} (${calc.taxDetail})`;

    // Technical Specs
    document.getElementById('detail-spec-rooms').textContent = prop.rooms > 0 ? `${prop.rooms} habitaciones` : 'No especificado';
    document.getElementById('detail-spec-baths').textContent = prop.baths > 0 ? `${prop.baths} baños` : 'No especificado';
    document.getElementById('detail-spec-m2').textContent = prop.m2 ? `${prop.m2} m² construidos` : 'No especificado';
    document.getElementById('detail-spec-estate-type').textContent = isSecondHand ? 'Segunda Mano' : 'Obra Nueva';
    document.getElementById('detail-spec-garage').textContent = prop.garage === 'si' ? 'Sí incluido' : (prop.garage === 'opcional' ? 'Opcional' : 'No tiene');
    document.getElementById('detail-spec-elevator').textContent = prop.elevator === 'si' ? 'Sí tiene' : (prop.elevator === 'no' ? 'No tiene' : 'No especificado');

    // FASE 5: Renderizar Votación y Cargar Muro de Comentarios
    renderDetailCollabVoting(prop);
    loadPropertyComments(prop.id);

    // Mini Map
    const mapSection = document.getElementById('detail-map-section');
    if (prop.latitude && prop.longitude) {
        if (mapSection) mapSection.style.display = 'block';
        setTimeout(() => {
            initDetailMiniMap(prop);
        }, 150);
    } else {
        if (mapSection) mapSection.style.display = 'none';
    }

    // Actions & Buttons
    const btnOpenUrl = document.getElementById('btn-open-url-detail');
    if (btnOpenUrl) {
        if (prop.url) {
            btnOpenUrl.href = prop.url;
            btnOpenUrl.style.display = 'inline-flex';
        } else {
            btnOpenUrl.style.display = 'none';
        }
    }

    const btnEdit = document.getElementById('btn-edit-from-detail');
    if (btnEdit) {
        btnEdit.onclick = () => {
            closePropertyDetailSheet();
            openEditModal(prop);
        };
    }

    const btnExpenses = document.getElementById('btn-expenses-from-detail');
    if (btnExpenses) {
        btnExpenses.onclick = () => {
            showExpensesBreakdownModal(prop);
        };
    }

    const btnPdf = document.getElementById('btn-pdf-detail');
    if (btnPdf) {
        btnPdf.onclick = () => {
            exportPropertyDetailPDF(prop.id);
        };
    }

    // Configurar formulario de nuevo comentario
    const commentForm = document.getElementById('form-add-comment');
    if (commentForm) {
        commentForm.onsubmit = async (e) => {
            e.preventDefault();
            const input = document.getElementById('detail-new-comment-input');
            const commentVal = input ? input.value.trim() : '';
            if (!commentVal) return;

            const submitBtn = document.getElementById('btn-submit-comment');
            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Publicando...';
            }

            try {
                const res = await fetch(`/api/propiedades/${prop.id}/comments`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ comment: commentVal })
                });

                if (res.ok) {
                    if (input) input.value = '';
                    showToast('Nota de visita publicada con éxito.', 'success');
                    await loadPropertyComments(prop.id);
                    prop.comments_count = (prop.comments_count || 0) + 1;
                    renderListings();
                } else {
                    const data = await res.json();
                    showToast(data.error || 'Error al publicar comentario.', 'error');
                }
            } catch (err) {
                console.error('Error submitting comment:', err);
                showToast('Error de conexión al publicar nota.', 'error');
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Publicar Nota';
                }
            }
        };
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closePropertyDetailSheet() {
    const modal = document.getElementById('property-detail-modal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
    activeDetailProperty = null;
}
