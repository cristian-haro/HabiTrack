// ==========================================================================
// CÁLCULOS DE COMPRAVENTA (ESPAÑA)
// ==========================================================================

function calculateExpenses(price, ccaa, estateType) {
    const p = parseFloat(price) || 0;
    
    // 1. Entrada (Ahorro inicial)
    const downpaymentRate = parseFloat(appSettings.downpaymentPct) || 20;
    const downpayment = p * (downpaymentRate / 100);
    
    // 2. Impuestos (Taxes)
    let taxes = 0;
    let taxDetail = "";
    
    if (estateType === 'new') {
        // Obra Nueva: 10% IVA + AJD
        const iva = p * 0.10;
        const ajdRate = parseFloat(appSettings.newBuildAjd) || 1.0;
        const ajd = p * (ajdRate / 100);
        taxes = iva + ajd;
        taxDetail = `IVA (10%): ${formatCurrency(iva)} + AJD (${ajdRate}%): ${formatCurrency(ajd)}`;
    } else {
        // Segunda Mano: ITP de la CCAA
        const itpRate = parseFloat(appSettings.ccaaRates[ccaa]) || 8.0;
        taxes = p * (itpRate / 100);
        taxDetail = `ITP (${itpRate}% de la CCAA)`;
    }

    // 3. Notaría, Registro y Gestoría (aproximación porcentual)
    const notaryRegistryPct = parseFloat(appSettings.notaryRegistryPct) || 1.5;
    const notaryRegistry = p * (notaryRegistryPct / 100);

    // 4. Tasación (Coste fijo)
    const appraisal = parseFloat(appSettings.appraisalCost) || 400;

    // Totales
    const totalExpenses = taxes + notaryRegistry + appraisal;
    const totalRequiredBudget = downpayment + totalExpenses;
    const mortgageAmount = p - downpayment;

    // 5. Hipoteca Mensual Estimada
    const mortgageInterestRate = parseFloat(appSettings.mortgageInterestRate) || 3.0;
    const mortgageDurationYears = parseInt(appSettings.mortgageDurationYears) || 30;
    
    let mortgageMonthlyPayment = 0;
    if (mortgageAmount > 0) {
        const r = mortgageInterestRate / 12 / 100;
        const n = mortgageDurationYears * 12;
        if (r > 0) {
            mortgageMonthlyPayment = mortgageAmount * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
        } else {
            mortgageMonthlyPayment = mortgageAmount / n;
        }
    }

    return {
        price: p,
        downpayment,
        downpaymentPct: downpaymentRate,
        taxes,
        taxDetail,
        notaryRegistry,
        notaryRegistryPct,
        appraisal,
        totalExpenses,
        totalRequiredBudget,
        mortgageAmount,
        mortgageMonthlyPayment,
        mortgageInterestRate,
        mortgageDurationYears
    };
}
