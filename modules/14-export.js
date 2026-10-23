// ==========================================================================
// EXPORTACIÓN A EXCEL Y GENERACIÓN DE INFORMES PDF
// ==========================================================================

function exportPropertiesToExcel() {
    const listToExport = applyFilters(properties);
    if (!listToExport || listToExport.length === 0) {
        showToast('No hay propiedades para exportar con los filtros actuales.', 'warning');
        return;
    }

    const headers = [
        "ID",
        "Título",
        "Zona / Ciudad",
        "Comunidad Autónoma",
        "Tipo de Inmueble",
        "Precio (€)",
        "Superficie (m²)",
        "Precio / m² (€)",
        "Habitaciones",
        "Baños",
        "Garaje",
        "Ascensor",
        "Puntuación (1-5)",
        "Entrada Aportada (€)",
        "Impuestos Estimados (€)",
        "Detalle Impuestos",
        "Notaría y Registro (€)",
        "Tasación Estimada (€)",
        "Presupuesto Total Firma (€)",
        "Importe Hipoteca Proyectada (€)",
        "Cuota Hipotecaria Mensual (€/mes)",
        "Tipo de Interés Hipoteca (%)",
        "Años Hipoteca",
        "Enlace Anuncio",
        "Notas y Observaciones",
        "Fecha de Registro"
    ];

    const rows = listToExport.map(p => {
        const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
        const isSecondHand = p.estate_type === 'secondhand';
        const priceM2 = p.m2 && p.m2 > 0 ? Math.round(p.price / p.m2) : '';

        return [
            p.id,
            `"${(p.title || '').replace(/"/g, '""')}"`,
            `"${(p.zone || '').replace(/"/g, '""')}"`,
            `"${(p.ccaa || '').replace(/"/g, '""')}"`,
            isSecondHand ? "Segunda Mano" : "Obra Nueva",
            p.price,
            p.m2 || '',
            priceM2,
            p.rooms || 0,
            p.baths || 0,
            p.garage === 'si' ? 'Sí' : (p.garage === 'opcional' ? 'Opcional' : 'No'),
            p.elevator === 'si' ? 'Sí' : (p.elevator === 'no' ? 'No' : 'Desconocido'),
            p.rating || 0,
            calc.downpayment,
            calc.taxes,
            `"${calc.taxDetail}"`,
            calc.notaryRegistry,
            calc.appraisal,
            calc.totalRequiredBudget,
            calc.mortgageAmount,
            calc.mortgageMonthlyPayment,
            calc.mortgageInterestRate,
            calc.mortgageDurationYears,
            `"${(p.url || '').replace(/"/g, '""')}"`,
            `"${(p.comments || '').replace(/"/g, '""')}"`,
            `"${p.created_at || ''}"`
        ].join(';');
    });

    const csvContent = "\uFEFF" + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HabiTrack_Inmuebles_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Se han exportado ${listToExport.length} propiedades a Excel / CSV.`, 'success');
}

function exportPortfolioSummaryPDF() {
    const listToExport = applyFilters(properties);
    if (!listToExport || listToExport.length === 0) {
        showToast('No hay propiedades para generar el informe comparativo.', 'warning');
        return;
    }

    let totalPrice = 0;
    let totalBudget = 0;
    listToExport.forEach(p => {
        const c = calculateExpenses(p.price, p.ccaa, p.estate_type);
        totalPrice += p.price;
        totalBudget += c.totalRequiredBudget;
    });
    const avgPrice = Math.round(totalPrice / listToExport.length);
    const avgBudget = Math.round(totalBudget / listToExport.length);

    const rowsHTML = listToExport.map((p, idx) => {
        const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
        const priceM2 = p.m2 && p.m2 > 0 ? `${formatCurrency(Math.round(p.price / p.m2))}/m²` : '--';
        return `
            <tr style="border-bottom: 1px solid #e2e8f0; font-size: 9pt;">
                <td style="padding: 8px 6px;"><strong>#${idx + 1}</strong></td>
                <td style="padding: 8px 6px;">
                    <div style="font-weight: 700; color: #1e293b;">${p.title}</div>
                    <div style="font-size: 8pt; color: #64748b;">${p.zone || 'Sin zona'} (${p.ccaa || 'España'})</div>
                </td>
                <td style="padding: 8px 6px; text-align: right; font-weight: 700; color: #0f172a;">${formatCurrency(p.price)}</td>
                <td style="padding: 8px 6px; text-align: center;">${p.m2 ? p.m2 + ' m²' : '--'}<br><small style="color:#64748b;">${priceM2}</small></td>
                <td style="padding: 8px 6px; text-align: center;">${p.rooms} hab · ${p.baths} bñ</td>
                <td style="padding: 8px 6px; text-align: right; color: #b45309; font-weight: 700;">${formatCurrency(calc.totalRequiredBudget)}</td>
                <td style="padding: 8px 6px; text-align: right; color: #4f46e5; font-weight: 700;">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</td>
                <td style="padding: 8px 6px; text-align: center; color: #d97706; font-weight: 700;">${p.rating ? p.rating + ' ★' : '--'}</td>
            </tr>
        `;
    }).join('');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Por favor habilita las ventanas emergentes para generar el informe PDF.', 'warning');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>HabiTrack - Informe Comparativo de Inmuebles</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px; margin: 0; background: #fff; }
                .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 20px; }
                .report-logo { font-size: 20pt; font-weight: 800; color: #4f46e5; display: flex; align-items: center; gap: 8px; }
                .report-meta { text-align: right; font-size: 8.5pt; color: #64748b; }
                .kpi-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
                .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
                .kpi-title { font-size: 7.5pt; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 4px; }
                .kpi-val { font-size: 13pt; font-weight: 800; color: #0f172a; }
                table { width: 100%; border-collapse: collapse; margin-top: 10px; }
                th { background: #f1f5f9; padding: 8px 6px; font-size: 8pt; text-transform: uppercase; color: #475569; border-bottom: 2px solid #cbd5e1; }
                @media print {
                    body { padding: 0; }
                    .no-print { display: none; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div class="report-logo">🏡 HabiTrack</div>
                <div class="report-meta">
                    <strong>Dossier Comparativo de Inmuebles</strong><br>
                    Generado el: ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </div>
            </div>

            <div class="kpi-row">
                <div class="kpi-card">
                    <div class="kpi-title">Pisos Incluidos</div>
                    <div class="kpi-val">${listToExport.length} inmuebles</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Precio Medio</div>
                    <div class="kpi-val">${formatCurrency(avgPrice)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Ahorro Requerido Medio</div>
                    <div class="kpi-val" style="color: #b45309;">${formatCurrency(avgBudget)}</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Volumen Total Analizado</div>
                    <div class="kpi-val" style="color: #4f46e5;">${formatCurrency(totalPrice)}</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="text-align: left; width: 30px;">#</th>
                        <th style="text-align: left;">Inmueble</th>
                        <th style="text-align: right;">Precio</th>
                        <th style="text-align: center;">Superficie</th>
                        <th style="text-align: center;">Distribución</th>
                        <th style="text-align: right;">Ahorro Firma</th>
                        <th style="text-align: right;">Hipoteca Est.</th>
                        <th style="text-align: center;">Valoración</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHTML}
                </tbody>
            </table>

            <div style="margin-top: 24px; padding: 12px; background: #f8fafc; border-radius: 8px; font-size: 8pt; color: #64748b; border: 1px dashed #cbd5e1;">
                <strong>Nota Metodológica:</strong> El cálculo de ahorro necesario incluye una entrada estimada del ${appSettings.downpaymentPct}% sobre el precio de compra más los impuestos autonómicos vigentes y costes de notaría, registro, gestoría (${appSettings.notaryRegistryPct}%) y tasación oficial. Las cuotas hipotecarias están calculadas a tipo fijo del ${appSettings.mortgageInterestRate}% a ${appSettings.mortgageDurationYears} años.
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}

function exportPropertyDetailPDF(propertyId) {
    const prop = properties.find(p => p.id == propertyId);
    if (!prop) {
        showToast('Propiedad no encontrada para generar informe.', 'error');
        return;
    }

    const calc = calculateExpenses(prop.price, prop.ccaa, prop.estate_type);
    const isSecondHand = prop.estate_type === 'secondhand';
    const photoList = prop.photos ? prop.photos.split(',').map(u => u.trim()).filter(Boolean) : [];
    const mainPhotoUrl = photoList.length > 0 ? photoList[0] : '';
    const priceM2 = prop.m2 && prop.m2 > 0 ? `${formatCurrency(Math.round(prop.price / prop.m2))}/m²` : '--';

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
        showToast('Por favor habilita las ventanas emergentes para generar el informe PDF.', 'warning');
        return;
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <title>HabiTrack - Ficha de Inmueble #${prop.id} - ${prop.title}</title>
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; padding: 24px 30px; margin: 0; background: #fff; line-height: 1.4; }
                .report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #4f46e5; padding-bottom: 12px; margin-bottom: 16px; }
                .report-logo { font-size: 20pt; font-weight: 800; color: #4f46e5; }
                .report-meta { text-align: right; font-size: 8.5pt; color: #64748b; }
                
                .property-hero { display: grid; grid-template-columns: ${mainPhotoUrl ? '280px 1fr' : '1fr'}; gap: 20px; margin-bottom: 18px; align-items: center; }
                .property-hero-img { width: 100%; height: 185px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
                
                .hero-info h1 { font-size: 16pt; margin: 0 0 6px 0; color: #0f172a; font-weight: 800; }
                .hero-badges { display: flex; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
                .badge { padding: 3px 8px; border-radius: 9999px; font-size: 8pt; font-weight: 700; }
                .badge-indigo { background: #eef2ff; color: #4f46e5; border: 1px solid #c7d2fe; }
                .badge-amber { background: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
                .hero-loc { font-size: 9pt; color: #475569; }

                .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 18px; }
                .kpi-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
                .kpi-card.highlight { background: #eef2ff; border-color: #c7d2fe; }
                .kpi-card.amber { background: #fffbeb; border-color: #fde68a; }
                .kpi-title { font-size: 7pt; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px; }
                .kpi-val { font-size: 13pt; font-weight: 800; color: #0f172a; }
                .kpi-sub { font-size: 7.5pt; color: #64748b; }

                .section-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
                .section-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px; background: #ffffff; }
                .section-title { font-size: 9.5pt; font-weight: 700; text-transform: uppercase; color: #334155; margin-bottom: 8px; border-bottom: 1px solid #f1f5f9; padding-bottom: 4px; }

                table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
                td { padding: 5px 0; border-bottom: 1px solid #f1f5f9; }
                td.val { text-align: right; font-weight: 700; }
                tr.total td { font-weight: 800; border-top: 2px solid #cbd5e1; border-bottom: none; font-size: 9.5pt; color: #4f46e5; padding-top: 6px; }

                .specs-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 8.5pt; }
                .spec-item { padding: 4px 6px; background: #f8fafc; border-radius: 4px; display: flex; justify-content: space-between; }
                .spec-label { color: #64748b; }
                .spec-val { font-weight: 700; color: #0f172a; }

                .comments-box { margin-top: 12px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; background: #f8fafc; font-size: 8.5pt; color: #334155; line-height: 1.5; }
                
                @media print {
                    body { padding: 0; }
                }
            </style>
        </head>
        <body>
            <div class="report-header">
                <div class="report-logo">🏡 HabiTrack</div>
                <div class="report-meta">
                    <strong>Informe de Ficha de Inmueble</strong><br>
                    Ref. #${prop.id} · Generado el ${new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
            </div>

            <div class="property-hero">
                ${mainPhotoUrl ? `<img src="${mainPhotoUrl}" class="property-hero-img" alt="${prop.title}">` : ''}
                <div class="hero-info">
                    <div class="hero-badges">
                        <span class="badge badge-indigo">${isSecondHand ? 'Segunda Mano' : 'Obra Nueva'}</span>
                        <span class="badge badge-amber">${prop.ccaa || 'España'}</span>
                        ${prop.rating ? `<span class="badge badge-amber">${prop.rating}.0 ★ Puntuación</span>` : ''}
                    </div>
                    <h1>${prop.title}</h1>
                    <div class="hero-loc">📍 <strong>Zona:</strong> ${prop.zone || 'No especificada'} &nbsp;|&nbsp; <strong>Superficie:</strong> ${prop.m2 ? prop.m2 + ' m² (' + priceM2 + ')' : 'No especificada'}</div>
                    ${prop.url ? `<div style="margin-top: 6px; font-size: 8pt; color: #4f46e5; word-break: break-all;">🔗 <strong>Enlace Anuncio:</strong> ${prop.url}</div>` : ''}
                </div>
            </div>

            <div class="kpi-grid">
                <div class="kpi-card">
                    <div class="kpi-title">Precio de Compra</div>
                    <div class="kpi-val">${formatCurrency(prop.price)}</div>
                    <div class="kpi-sub">${priceM2}</div>
                </div>
                <div class="kpi-card amber">
                    <div class="kpi-title">Ahorro Necesario Firma</div>
                    <div class="kpi-val" style="color: #b45309;">${formatCurrency(calc.totalRequiredBudget)}</div>
                    <div class="kpi-sub">Entrada (${calc.downpaymentPct}%) + Gastos</div>
                </div>
                <div class="kpi-card">
                    <div class="kpi-title">Gastos e Impuestos</div>
                    <div class="kpi-val" style="color: #047857;">${formatCurrency(calc.totalExpenses)}</div>
                    <div class="kpi-sub">${(calc.totalExpenses / calc.price * 100).toFixed(1)}% sobre precio</div>
                </div>
                <div class="kpi-card highlight">
                    <div class="kpi-title">Cuota Hipoteca Est.</div>
                    <div class="kpi-val" style="color: #4f46e5;">${formatCurrency(calc.mortgageMonthlyPayment)}/mes</div>
                    <div class="kpi-sub">Al ${calc.mortgageInterestRate}% a ${calc.mortgageDurationYears} años</div>
                </div>
            </div>

            <div class="section-grid">
                <div class="section-box">
                    <div class="section-title">📊 Desglose de Fondos para Firma</div>
                    <table>
                        <tbody>
                            <tr>
                                <td>Entrada Fondos Propios (${calc.downpaymentPct}%)</td>
                                <td class="val">${formatCurrency(calc.downpayment)}</td>
                            </tr>
                            <tr>
                                <td>Impuestos CCAA (${isSecondHand ? 'ITP' : 'IVA + AJD'})</td>
                                <td class="val" style="color: #047857;">${formatCurrency(calc.taxes)} <small>(${calc.taxDetail})</small></td>
                            </tr>
                            <tr>
                                <td>Notaría, Registro y Gestoría (${calc.notaryRegistryPct}%)</td>
                                <td class="val">${formatCurrency(calc.notaryRegistry)}</td>
                            </tr>
                            <tr>
                                <td>Tasación Inmobiliaria</td>
                                <td class="val">${formatCurrency(calc.appraisal)}</td>
                            </tr>
                            <tr class="total">
                                <td>PRESUPUESTO TOTAL PARA FIRMA</td>
                                <td class="val">${formatCurrency(calc.totalRequiredBudget)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div class="section-box">
                    <div class="section-title">🏠 Características Técnicas</div>
                    <div class="specs-grid">
                        <div class="spec-item"><span class="spec-label">Habitaciones:</span> <span class="spec-val">${prop.rooms > 0 ? prop.rooms : 'No espec.'}</span></div>
                        <div class="spec-item"><span class="spec-label">Baños:</span> <span class="spec-val">${prop.baths > 0 ? prop.baths : 'No espec.'}</span></div>
                        <div class="spec-item"><span class="spec-label">Superficie:</span> <span class="spec-val">${prop.m2 ? prop.m2 + ' m²' : 'No espec.'}</span></div>
                        <div class="spec-item"><span class="spec-label">Tipo:</span> <span class="spec-val">${isSecondHand ? 'Segunda Mano' : 'Obra Nueva'}</span></div>
                        <div class="spec-item"><span class="spec-label">Garaje:</span> <span class="spec-val">${prop.garage === 'si' ? 'Sí incluido' : (prop.garage === 'opcional' ? 'Opcional' : 'No')}</span></div>
                        <div class="spec-item"><span class="spec-label">Ascensor:</span> <span class="spec-val">${prop.elevator === 'si' ? 'Sí tiene' : (prop.elevator === 'no' ? 'No tiene' : 'No espec.')}</span></div>
                        <div class="spec-item"><span class="spec-label">Financiación (${100 - calc.downpaymentPct}%):</span> <span class="spec-val">${formatCurrency(calc.mortgageAmount)}</span></div>
                        <div class="spec-item"><span class="spec-label">Cuota Hipoteca:</span> <span class="spec-val" style="color: #4f46e5;">${formatCurrency(calc.mortgageMonthlyPayment)}/m</span></div>
                    </div>
                </div>
            </div>

            <div class="comments-box">
                <strong>📝 Notas y Observaciones Registradas:</strong><br>
                ${prop.comments ? prop.comments.replace(/\n/g, '<br>') : 'Sin observaciones adicionales registradas.'}
            </div>

            <script>
                window.onload = function() {
                    window.print();
                };
            </script>
        </body>
        </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
}
