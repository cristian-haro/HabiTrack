// ==========================================================================
// RENDERIZADO DE INTERFAZ DE USUARIO (DOM)
// ==========================================================================

function populateCcaaDropdowns() {
    const dropdown = document.getElementById('prop-ccaa');
    if (!dropdown) return;
    
    dropdown.innerHTML = '';
    
    // Comunidad autónoma sugerida según ITP medio
    CCAA_LIST.forEach(ccaa => {
        const option = document.createElement('option');
        option.value = ccaa;
        option.textContent = ccaa;
        // Seleccionar Madrid/Cataluña por defecto como ejemplo común
        if (ccaa === 'Madrid') option.selected = true;
        dropdown.appendChild(option);
    });
}

function renderDashboard() {
    const totalKpi = document.getElementById('kpi-total-properties');
    const priceKpi = document.getElementById('kpi-avg-price');
    const budgetKpi = document.getElementById('kpi-avg-budget');
    const expensesKpi = document.getElementById('kpi-avg-expenses');

    if (!totalKpi) return;

    const total = properties.length;
    totalKpi.textContent = total;

    if (total === 0) {
        priceKpi.textContent = "0 €";
        budgetKpi.textContent = "0 €";
        expensesKpi.textContent = "0 €";
        updateDonutChart(0, 0, 0);
        renderRecentListings([]);
        return;
    }

    let sumPrice = 0;
    let sumBudget = 0;
    let sumExpenses = 0;

    properties.forEach(p => {
        const calc = calculateExpenses(p.price, p.ccaa, p.estate_type);
        sumPrice += calc.price;
        sumBudget += calc.totalRequiredBudget;
        sumExpenses += calc.totalExpenses;
    });

    const avgPrice = sumPrice / total;
    const avgBudget = sumBudget / total;
    const avgExpenses = sumExpenses / total;

    priceKpi.textContent = formatCurrency(avgPrice);
    budgetKpi.textContent = formatCurrency(avgBudget);
    expensesKpi.textContent = formatCurrency(avgExpenses);

    // Actualizar Donut con los valores medios
    const percentDownpayment = (avgPrice * (parseFloat(appSettings.downpaymentPct) || 20) / 100) / avgBudget * 100;
    const percentTaxes = (avgExpenses - (parseFloat(appSettings.appraisalCost) || 400) - (avgPrice * (parseFloat(appSettings.notaryRegistryPct) || 1.5) / 100)) / avgBudget * 100;
    const percentOther = 100 - percentDownpayment - percentTaxes;

    updateDonutChart(percentDownpayment, percentTaxes, percentOther, (avgBudget / avgPrice * 100).toFixed(0) + '%');

    // Cargar tarjetas recientes (máximo 3)
    renderRecentListings(properties.slice(0, 3));

    // Renderizar Mapa Leaflet
    renderMap();
}

function updateDonutChart(downpaymentPct, taxesPct, otherPct, centerText = '32%') {
    const sliceDown = document.getElementById('chart-slice-downpayment');
    const sliceTaxes = document.getElementById('chart-slice-taxes');
    const sliceExpenses = document.getElementById('chart-slice-expenses');
    const label = document.getElementById('chart-total-percent');

    if (!sliceDown) return;

    label.textContent = centerText;

    // Calcular dasharray del SVG donut
    // El perímetro del círculo con r=15.915 es 100 exactos (2 * PI * r)
    // El orden en dasharray es: [longitud_segmento, longitud_hueco]
    
    // Tramo 1: Entrada
    const d1 = downpaymentPct;
    sliceDown.setAttribute('stroke-dasharray', `${d1} ${100 - d1}`);
    sliceDown.setAttribute('stroke-dashoffset', '25'); // Empezar arriba (90 deg)

    // Tramo 2: Impuestos
    const d2 = taxesPct;
    const offset2 = 25 - d1;
    sliceTaxes.setAttribute('stroke-dasharray', `${d2} ${100 - d2}`);
    sliceTaxes.setAttribute('stroke-dashoffset', offset2.toString());

    // Tramo 3: Gastos
    const d3 = otherPct;
    const offset3 = offset2 - d2;
    sliceExpenses.setAttribute('stroke-dasharray', `${d3} ${100 - d3}`);
    sliceExpenses.setAttribute('stroke-dashoffset', offset3.toString());
}

function renderRecentListings(recentProps) {
    const container = document.getElementById('recent-listings-container');
    if (!container) return;

    if (recentProps.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fa-solid fa-house-chimney-user"></i>
                <p>No tienes pisos guardados aún. Pega un enlace o introduce uno manualmente.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = '';
    recentProps.forEach(prop => {
        container.appendChild(createPropertyCardDOM(prop));
    });
}
