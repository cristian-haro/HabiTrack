declare const _exports: {
    calculatePurchaseExpenses: typeof calculatePurchaseExpenses;
};
export = _exports;
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
declare function calculatePurchaseExpenses({ price, ccaa, estateType, downpaymentPct, notaryRegistryPct, appraisalCost, mortgageInterestRate, mortgageDurationYears, customCcaaRates }: {
    price: number;
    ccaa: string;
    estateType?: 'secondhand' | 'new';
    downpaymentPct?: number;
    notaryRegistryPct?: number;
    appraisalCost?: number;
    mortgageInterestRate?: number;
    mortgageDurationYears?: number;
    customCcaaRates?: Object;
}): Object;
