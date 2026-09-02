const { DEFAULT_CCAA_ITP, DEFAULT_NEW_BUILD_IVA, DEFAULT_NEW_BUILD_AJD } = require('../config/constants');

/**
 * Calculates all purchase expenses and mortgage quotas for a property in Spain.
 * 
 * @param {Object} params
 * @param {number} params.price Property purchase price in EUR
 * @param {string} params.ccaa Autonomous Community
 * @param {'secondhand' | 'new'} [params.estateType='secondhand'] Property type
 * @param {number} [params.downpaymentPct=20] Down payment percentage (e.g. 20%)
 * @param {number} [params.notaryRegistryPct=1.5] Estimated notary & registry expense percentage
 * @param {number} [params.appraisalCost=400] Bank appraisal cost
 * @param {number} [params.mortgageInterestRate=3.0] Annual nominal interest rate (TIN) in percentage
 * @param {number} [params.mortgageDurationYears=30] Mortgage duration in years
 * @param {Object} [params.customCcaaRates] Optional custom CCAA ITP rates override
 * @returns {Object} Detailed calculation results
 */
function calculatePurchaseExpenses({
    price,
    ccaa,
    estateType = 'secondhand',
    downpaymentPct = 20,
    notaryRegistryPct = 1.5,
    appraisalCost = 400,
    mortgageInterestRate = 3.0,
    mortgageDurationYears = 30,
    customCcaaRates = {}
}) {
    const numPrice = Number(price) || 0;
    const isNew = estateType === 'new';

    // 1. Tax calculation (ITP or IVA + AJD)
    let taxRate;
    let taxName;
    let taxAmount;

    if (isNew) {
        // Obra nueva: IVA (10% / 6.5% en Canarias) + AJD
        const ivaRate = ccaa === 'Canarias' ? 6.5 : DEFAULT_NEW_BUILD_IVA;
        const ajdRate = DEFAULT_NEW_BUILD_AJD;
        taxRate = ivaRate + ajdRate;
        taxName = `IVA (${ivaRate}%) + AJD (${ajdRate}%)`;
        taxAmount = (numPrice * taxRate) / 100;
    } else {
        // Segunda mano: ITP según Comunidad Autónoma
        const rates = { ...DEFAULT_CCAA_ITP, ...customCcaaRates };
        taxRate = rates[ccaa] !== undefined ? rates[ccaa] : 8.0;
        taxName = `ITP (${taxRate}%)`;
        taxAmount = (numPrice * taxRate) / 100;
    }

    // 2. Notary and Registry expenses (~1.5% default)
    const notaryRegistryAmount = (numPrice * (Number(notaryRegistryPct) || 1.5)) / 100;

    // 3. Total purchase expenses
    const totalExpenses = taxAmount + notaryRegistryAmount + (Number(appraisalCost) || 0);

    // 4. Downpayment & Mortgage principal
    const downpaymentAmount = (numPrice * (Number(downpaymentPct) || 20)) / 100;
    const mortgagePrincipal = Math.max(0, numPrice - downpaymentAmount);

    // 5. Total upfront cash needed (Aportación inicial + gastos)
    const totalUpfrontNeeded = downpaymentAmount + totalExpenses;

    // 6. Total cost of the property (Precio + Gastos)
    const totalCost = numPrice + totalExpenses;

    // 7. Mortgage monthly quota (French amortization formula)
    let monthlyQuota = 0;
    const totalMonths = (Number(mortgageDurationYears) || 30) * 12;
    const monthlyRate = ((Number(mortgageInterestRate) || 3.0) / 100) / 12;

    if (mortgagePrincipal > 0 && totalMonths > 0) {
        if (monthlyRate === 0) {
            monthlyQuota = mortgagePrincipal / totalMonths;
        } else {
            monthlyQuota = (mortgagePrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / 
                           (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }
    }

    const totalMortgageInterest = (monthlyQuota * totalMonths) - mortgagePrincipal;

    return {
        price: numPrice,
        ccaa,
        estateType,
        tax: {
            name: taxName,
            ratePct: taxRate,
            amount: Math.round(taxAmount * 100) / 100
        },
        notaryRegistryAmount: Math.round(notaryRegistryAmount * 100) / 100,
        appraisalCost: Number(appraisalCost) || 0,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        downpayment: {
            pct: Number(downpaymentPct) || 20,
            amount: Math.round(downpaymentAmount * 100) / 100
        },
        mortgage: {
            principal: Math.round(mortgagePrincipal * 100) / 100,
            interestRatePct: Number(mortgageInterestRate) || 3.0,
            durationYears: Number(mortgageDurationYears) || 30,
            monthlyQuota: Math.round(monthlyQuota * 100) / 100,
            totalInterest: Math.round(totalMortgageInterest * 100) / 100
        },
        totalUpfrontNeeded: Math.round(totalUpfrontNeeded * 100) / 100,
        totalCost: Math.round(totalCost * 100) / 100
    };
}

module.exports = {
    calculatePurchaseExpenses
};
