import { state } from './state.js';

/**
 * Calculates complete taxes and mortgage figures for a given property
 */
export function calculateExpenses(property) {
    const price = Number(property.price) || 0;
    const isNew = property.estate_type === 'new';
    const settings = state.settings || {};

    // 1. Tax calculation
    let taxRate = 0;
    let taxName = '';

    if (isNew) {
        const ivaRate = property.ccaa === 'Canarias' ? 6.5 : 10.0;
        const ajdRate = Number(settings.newBuildAjd) || 1.0;
        taxRate = ivaRate + ajdRate;
        taxName = `IVA (${ivaRate}%) + AJD (${ajdRate}%)`;
    } else {
        const rates = settings.ccaaRates || {};
        taxRate = rates[property.ccaa] !== undefined ? Number(rates[property.ccaa]) : 8.0;
        taxName = `ITP (${taxRate}%)`;
    }

    const taxAmount = (price * taxRate) / 100;
    const notaryRegistryPct = Number(settings.notaryRegistryPct) || 1.5;
    const notaryRegistryAmount = (price * notaryRegistryPct) / 100;
    const appraisalCost = Number(settings.appraisalCost) || 400;

    const totalExpenses = taxAmount + notaryRegistryAmount + appraisalCost;
    const downpaymentPct = Number(settings.downpaymentPct) || 20;
    const downpaymentAmount = (price * downpaymentPct) / 100;
    const mortgagePrincipal = Math.max(0, price - downpaymentAmount);
    const totalUpfront = downpaymentAmount + totalExpenses;
    const totalCost = price + totalExpenses;

    // Mortgage Monthly Quota (French Amortization)
    const interestRate = Number(settings.mortgageInterestRate) || 3.0;
    const durationYears = Number(settings.mortgageDurationYears) || 30;
    const totalMonths = durationYears * 12;
    const monthlyRate = (interestRate / 100) / 12;

    let monthlyQuota = 0;
    if (mortgagePrincipal > 0 && totalMonths > 0) {
        if (monthlyRate === 0) {
            monthlyQuota = mortgagePrincipal / totalMonths;
        } else {
            monthlyQuota = (mortgagePrincipal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) /
                           (Math.pow(1 + monthlyRate, totalMonths) - 1);
        }
    }

    return {
        price,
        isNew,
        taxName,
        taxRate,
        taxAmount: Math.round(taxAmount),
        notaryRegistryPct,
        notaryRegistryAmount: Math.round(notaryRegistryAmount),
        appraisalCost,
        totalExpenses: Math.round(totalExpenses),
        downpaymentPct,
        downpaymentAmount: Math.round(downpaymentAmount),
        mortgagePrincipal: Math.round(mortgagePrincipal),
        totalUpfront: Math.round(totalUpfront),
        totalCost: Math.round(totalCost),
        interestRate,
        durationYears,
        monthlyQuota: Math.round(monthlyQuota)
    };
}

export function formatCurrency(val) {
    if (val === null || val === undefined || isNaN(val)) return '0 €';
    return new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: 0
    }).format(val);
}

export function formatNumber(val) {
    if (val === null || val === undefined || isNaN(val)) return '0';
    return new Intl.NumberFormat('es-ES').format(val);
}
